/* =========================================================================
   接舷單挑 · game/reducer.js
   The turn machine the brief asks for, as one pure function.

       PLAYER_ATTACK ──(你選攻擊，AI 選防守，立刻結算)──▶ RESOLVING
                                                            │
                                    (動畫與音效播完，切換階段) ▼
       ENEMY_ATTACK ◀─────────────────────────────────────────┐
            │  (你選防守，AI 選攻擊，立刻結算)                 │
            ▼                                                 │
        RESOLVING ──(播完)──▶ 回合結束，更新雙方 HP，回 PLAYER_ATTACK

   Nothing in here talks to React or to the DOM. Every action returns a new
   state, every draw comes out of the seeded rng carried in the state, and an
   illegal action (the wrong button in the wrong phase) is simply ignored —
   which is what makes the two phases enforceable rather than decorative.
   ========================================================================= */
import { RULES, PART_LABEL, ATTACKS, DEFENCES, GEAR } from './constants.js';
import {
  resolveStrike, chooseEnemyDefence, chooseEnemyAttack, seedFrom, gearOf, attackOf, defenceOf,
} from './rules.js';

export const PHASE = {
  INTRO: 'INTRO',
  PLAYER_ATTACK: 'PLAYER_ATTACK',
  RESOLVING: 'RESOLVING',
  ENEMY_ATTACK: 'ENEMY_ATTACK',
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT',
};

export function initialState({ seed = 20260214, maxHp = RULES.maxHp } = {}) {
  return {
    phase: PHASE.INTRO,
    turn: 1,
    seed,
    rng: seedFrom(seed),
    maxHp,
    hp: { player: maxHp, enemy: maxHp },
    pending: null,            // the strike the scene is playing right now
    fx: null,                 // the same thing, flattened for the animations
    offBalance: { player: false, enemy: false },
    history: { playerAttacks: [], playerDefences: [], enemyAttacks: [], enemyDefences: [] },
    log: [],
    settled: 0,               // resolved exchanges
    tally: { hits: 0, blocks: 0, misses: 0, dealt: 0, taken: 0 },
    winner: null,
  };
}

/* Log lines are data, not strings: the UI decides how to colour them, and the
   id is derived from the log itself so a state stays reproducible. */
function say(state, kind, text, extra) {
  const entry = { id: state.log.length + 1, turn: state.turn, kind, text, ...extra };
  return { ...state, log: [...state.log, entry] };
}

/* ---- the sentence a strike deserves ------------------------------------- */
function describe(state, actor, strike) {
  const me = actor === 'player';
  const who = me ? '你' : '紅鬍子';
  const other = me ? '紅鬍子' : '你';
  const head = `${who} 使出【${strike.attack.name}】，${other} ${strike.defence.name}`;
  if (strike.outcome === 'block') return `${head} ── 鏘！格擋，僅受 ${strike.damage} 點傷害`;
  if (strike.outcome === 'miss') return `${head} ── 落空！${who} 撲了個空`;
  return `${head} ── 命中，造成 ${strike.damage} 點傷害`;
}


/* ---- resolution, shared by both halves of the turn ---------------------- */
/* Damage in, bookkeeping recorded, phase moved on to RESOLVING — the one place
   HP changes, so there is a single line to check when the bars disagree. */
function settle(state, actor, strike, rngState) {
  const me = actor === 'player';
  const target = me ? 'enemy' : 'player';
  const hp = { ...state.hp };
  hp[target] = Math.max(0, hp[target] - strike.damage);

  /* 虛招：門戶大開。The opening is spent as soon as any blow lands. */
  const offBalance = { ...state.offBalance };
  let note = null;
  if (strike.feintLanded) {
    offBalance[target] = true;
    note = `虛招得手：${me ? '紅鬍子' : '你'} 門戶大開，下回合格擋 -20%、挨打 +25%`;
  } else if (offBalance[target]) {
    offBalance[target] = false;
  }

  const tally = { ...state.tally };
  if (strike.outcome === 'hit') {
    tally.hits += 1;
    if (me) tally.dealt += strike.damage; else tally.taken += strike.damage;
  } else if (strike.outcome === 'block') tally.blocks += 1;
  else tally.misses += 1;

  /* The defender's choice is what the AI reads back next turn; the attacker's
     own choice was recorded by the action that started this exchange. */
  const history = me
    ? { ...state.history, enemyDefences: [...state.history.enemyDefences, strike.defenceId] }
    : {
      ...state.history,
      enemyAttacks: [...state.history.enemyAttacks, strike.attackId],
      playerDefences: [...state.history.playerDefences, strike.defenceId],
    };

  let next = {
    ...state,
    rng: rngState,
    hp,
    offBalance,
    tally,
    history,
    settled: state.settled + 1,
    pending: { actor, strike },
    fx: {
      id: state.settled + 1,
      actor,
      target,
      outcome: strike.outcome,
      damage: strike.damage,
      part: strike.part,
      defencePart: strike.defencePart,
      attackName: strike.attack.name,
      defenceName: strike.defence.name,
      feint: !!strike.attack.feint,
    },
    phase: PHASE.RESOLVING,
  };
  next = say(next, me ? 'attack' : 'defend', describe(state, actor, strike));
  if (note) next = say(next, 'feint', note);
  return next;
}


/* ---- the machine itself -------------------------------------------------- */
export function battleReducer(state, action) {
  switch (action.type) {
    case 'START':
    case 'RESTART': {
      const seed = action.seed ?? (state.seed + 7919);
      const fresh = initialState({ seed, maxHp: state.maxHp });
      return say({ ...fresh, phase: PHASE.PLAYER_ATTACK }, 'system',
        `接舷！${GEAR.player.ship} 對上 ${GEAR.enemy.ship}，第一回合由你出手。`);
    }

    /* 階段一：你進攻。敵人 AI 在同一瞬間決定防守，然後立刻結算。 */
    case 'CHOOSE_ATTACK': {
      if (state.phase !== PHASE.PLAYER_ATTACK) return state;      // wrong half of the turn
      const attack = attackOf(action.attackId);
      if (!attack) return state;
      const { defenceId, rngState } = chooseEnemyDefence({ state, history: state.history });
      const strike = resolveStrike({
        attackId: attack.id,
        defenceId,
        attackerGear: gearOf('player'),
        defenderGear: gearOf('enemy'),
        offBalance: state.offBalance.enemy,
        rngState,
      });
      const history = {
        ...state.history,
        playerAttacks: [...state.history.playerAttacks, attack.id],
      };
      return settle({ ...state, history }, 'player', strike, strike.rngState);
    }

    /* 階段二：敵人進攻。你選防守，AI 同時決定攻擊部位，然後結算。 */
    case 'CHOOSE_DEFENCE': {
      if (state.phase !== PHASE.ENEMY_ATTACK) return state;
      const defence = defenceOf(action.defenceId);
      if (!defence) return state;
      const { attackId, rngState } = chooseEnemyAttack({ state, history: state.history });
      const strike = resolveStrike({
        attackId,
        defenceId: defence.id,
        attackerGear: gearOf('enemy'),
        defenderGear: gearOf('player'),
        offBalance: state.offBalance.player,
        rngState,
      });
      return settle(state, 'enemy', strike, strike.rngState);
    }

    /* 動畫與音效播完。這裡才是回合真正結束的地方。 */
    case 'RESOLVE_DONE': {
      if (state.phase !== PHASE.RESOLVING) return state;
      if (state.hp.enemy <= 0) {
        return say({ ...state, phase: PHASE.VICTORY, winner: 'player', fx: null }, 'victory',
          `勝利！紅鬍子 倒在甲板上，${GEAR.player.ship} 拿下這一場。`);
      }
      if (state.hp.player <= 0) {
        return say({ ...state, phase: PHASE.DEFEAT, winner: 'enemy', fx: null }, 'defeat',
          '你被擊倒了……海鴉號的船員把你綁上桅杆。');
      }
      if (state.pending && state.pending.actor === 'player') {
        return say({ ...state, phase: PHASE.ENEMY_ATTACK, fx: null }, 'turn',
          `第 ${state.turn} 回合 · 換紅鬍子出手，選擇你的防守部位。`);
      }
      const nextTurn = state.turn + 1;
      return say({ ...state, phase: PHASE.PLAYER_ATTACK, fx: null, turn: nextTurn }, 'turn',
        `第 ${nextTurn} 回合 · 你的回合，選擇攻擊部位。`);
    }

    default:
      return state;
  }
}

/* ---- little pure helpers the UI leans on -------------------------------- */
export const partLabel = (p) => (p ? PART_LABEL[p] : '全部位');
export const isLocked = (s) => s.phase === PHASE.RESOLVING;
export const canChooseAttack = (s) => s.phase === PHASE.PLAYER_ATTACK;
export const canChooseDefence = (s) => s.phase === PHASE.ENEMY_ATTACK;
export const isOver = (s) => s.phase === PHASE.VICTORY || s.phase === PHASE.DEFEAT;
export const hpPercent = (s, side) => Math.max(0, Math.min(100, (s.hp[side] / s.maxHp) * 100));
export const attackList = () => Object.values(ATTACKS);
export const defenceList = () => Object.values(DEFENCES);
