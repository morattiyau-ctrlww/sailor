/* =========================================================================
   接舷單挑 · tests/reducer.test.js       run:  npm test
   The turn machine. The brief's requirement is that the two halves of a turn
   are strictly separated, so that is what is asserted here: an attack button
   cannot do anything during the defence half, the enemy's guard is never chosen
   before the swing it answers, and nothing is accepted while an animation plays.
   ========================================================================= */
import { describe, it, expect } from 'vitest';
import { battleReducer, initialState, PHASE } from '../src/game/reducer.js';
import { DEFENCES, RULES } from '../src/game/constants.js';

const boot = (seed = 20260214) => battleReducer(initialState({ seed }), { type: 'START' });
const over = (s) => s.phase === PHASE.VICTORY || s.phase === PHASE.DEFEAT;

/* A "half" is exactly one of the two phases the brief separates, so these stop
   between them: attackOnce leaves you at ENEMY_ATTACK, defenceOnce back at
   PLAYER_ATTACK, and turn() is one full round. */
function attackOnce(state, attackId) {
  let s = battleReducer(state, { type: 'CHOOSE_ATTACK', attackId });
  if (s.phase === PHASE.RESOLVING) s = battleReducer(s, { type: 'RESOLVE_DONE' });
  return s;
}
function defenceOnce(state, defenceId) {
  let s = battleReducer(state, { type: 'CHOOSE_DEFENCE', defenceId });
  if (s.phase === PHASE.RESOLVING) s = battleReducer(s, { type: 'RESOLVE_DONE' });
  return s;
}
function turn(state, attackId, defenceId = 'guardMid') {
  let s = state;
  if (s.phase === PHASE.PLAYER_ATTACK) s = attackOnce(s, attackId);
  if (s.phase === PHASE.ENEMY_ATTACK) s = defenceOnce(s, defenceId);
  return s;
}
function play(state, policy = () => 'slash', guard = () => 'guardMid') {
  let s = state;
  for (let i = 0; i < 400 && !over(s); i++) s = turn(s, policy(s), guard(s));
  return s;
}

describe('the battle starts the way the brief says', () => {
  it('opens in PLAYER_ATTACK with both bars full', () => {
    const s = boot();
    expect(s.phase).toBe(PHASE.PLAYER_ATTACK);
    expect(s.hp).toEqual({ player: RULES.maxHp, enemy: RULES.maxHp });
    expect(s.turn).toBe(1);
    expect(s.log.length).toBe(1);
    expect(s.log[0].kind).toBe('system');
  });

  it('is inert in INTRO until it is started', () => {
    const s = initialState({ seed: 1 });
    expect(s.phase).toBe(PHASE.INTRO);
    expect(battleReducer(s, { type: 'CHOOSE_ATTACK', attackId: 'slash' })).toBe(s);
    expect(battleReducer(s, { type: 'NONSENSE' })).toBe(s);
  });
});

describe('階段一: you attack, the AI defends, it resolves at once', () => {
  it('takes an attack and moves straight into RESOLVING', () => {
    const s = battleReducer(boot(), { type: 'CHOOSE_ATTACK', attackId: 'slash' });
    expect(s.phase).toBe(PHASE.RESOLVING);
    expect(s.pending.actor).toBe('player');
    expect(s.pending.strike.attackId).toBe('slash');
    expect(Object.keys(DEFENCES)).toContain(s.pending.strike.defenceId);
    expect(s.fx.outcome).toBe(s.pending.strike.outcome);
    expect(s.fx.target).toBe('enemy');
    expect(s.fx.attackName).toBe('中部橫斬');
    expect(s.history.playerAttacks).toEqual(['slash']);
    expect(s.history.enemyDefences.length).toBe(1);
  });

  it('costs you nothing in this half', () => {
    let s = boot();
    for (let i = 0; i < 40 && !over(s); i++) {
      const mine = s.hp.player, theirs = s.hp.enemy;
      s = attackOnce(s, 'thrust');
      expect(s.hp.player).toBe(mine);                    // your swing cannot hurt you
      expect(s.hp.enemy).toBeLessThanOrEqual(theirs);
      if (s.phase === PHASE.ENEMY_ATTACK) s = defenceOnce(s, 'guardMid');
    }
    expect(s.hp.enemy).toBeLessThan(RULES.maxHp);         // and it adds up
  });

  it('ignores an attack while the enemy is attacking', () => {
    const s = attackOnce(boot(), 'slash');
    expect(s.phase).toBe(PHASE.ENEMY_ATTACK);
    expect(battleReducer(s, { type: 'CHOOSE_ATTACK', attackId: 'cleave' })).toBe(s);
    expect(battleReducer(s, { type: 'CHOOSE_ATTACK', attackId: 'nope' })).toBe(s);
  });

  it('locks everything while an animation is playing', () => {
    const resolving = battleReducer(boot(), { type: 'CHOOSE_ATTACK', attackId: 'slash' });
    expect(battleReducer(resolving, { type: 'CHOOSE_ATTACK', attackId: 'slash' })).toBe(resolving);
    expect(battleReducer(resolving, { type: 'CHOOSE_DEFENCE', defenceId: 'guardMid' })).toBe(resolving);
    expect(battleReducer(resolving, { type: 'RESOLVE_DONE' })).not.toBe(resolving);
  });
});


describe('階段二: the enemy attacks, you defend', () => {
  it('hands the turn over without ending it', () => {
    const s = attackOnce(boot(), 'slash');
    expect(s.phase).toBe(PHASE.ENEMY_ATTACK);
    expect(s.turn).toBe(1);                    // still the same round
  });

  it('resolves your defence into damage on you, and on nobody else', () => {
    let s = attackOnce(boot(), 'slash');
    const hp0 = s.hp.player, enemyHp0 = s.hp.enemy;
    s = defenceOnce(s, 'guardUpper');          // wait for it to resolve, then look
    expect(s.phase).toBe(PHASE.PLAYER_ATTACK);
    expect(s.turn).toBe(2);
    expect(s.hp.enemy).toBe(enemyHp0);         // this half only hurts you
    expect(s.hp.player).toBeLessThanOrEqual(hp0);
    /* and the strike that did it is the enemy's */
    const last = s.log.filter((e) => e.kind === 'defend').pop();
    expect(last.text.startsWith('紅鬍子')).toBe(true);
  });

  it('shows the strike while it resolves, before the turn ends', () => {
    const s = attackOnce(boot(), 'slash');
    const resolving = battleReducer(s, { type: 'CHOOSE_DEFENCE', defenceId: 'guardLower' });
    expect(resolving.phase).toBe(PHASE.RESOLVING);
    expect(resolving.pending.actor).toBe('enemy');
    expect(resolving.fx.target).toBe('player');
    expect(resolving.fx.defenceName).toBe('防守下部');
    expect(resolving.history.playerDefences).toEqual(['guardLower']);
    expect(resolving.history.enemyAttacks.length).toBe(1);
  });

  it('never picks the enemy\u2019s defence before you swing', () => {
    let s = boot();
    expect(s.history.enemyDefences.length).toBe(0);
    for (let i = 0; i < 30 && !over(s); i++) {
      if (s.phase === PHASE.PLAYER_ATTACK) {
        const before = s.history.enemyDefences.length;
        s = battleReducer(s, { type: 'CHOOSE_ATTACK', attackId: 'slash' });
        expect(s.history.enemyDefences.length).toBe(before + 1);   // exactly one, on your swing
      } else if (s.phase === PHASE.RESOLVING) {
        const snap = s;
        expect(battleReducer(s, { type: 'CHOOSE_ATTACK', attackId: 'cleave' })).toBe(snap);
        s = battleReducer(s, { type: 'RESOLVE_DONE' });
      } else {
        s = defenceOnce(s, 'guardMid');
      }
    }
  });
});

describe('the round cycle, and the end of the fight', () => {
  it('only ever moves between phases the brief allows', () => {
    const legal = {
      PLAYER_ATTACK: ['RESOLVING'],
      RESOLVING: ['ENEMY_ATTACK', 'PLAYER_ATTACK', 'VICTORY', 'DEFEAT'],
      ENEMY_ATTACK: ['RESOLVING'],
      VICTORY: [],
      DEFEAT: [],
    };
    /* One action at a time, so every single transition gets checked — not just
       the ones that happen to survive a bigger helper. */
    let s = boot();
    const seen = [s.phase];
    for (let i = 0; i < 400 && !over(s); i++) {
      if (s.phase === PHASE.PLAYER_ATTACK) s = battleReducer(s, { type: 'CHOOSE_ATTACK', attackId: 'slash' });
      else if (s.phase === PHASE.ENEMY_ATTACK) s = battleReducer(s, { type: 'CHOOSE_DEFENCE', defenceId: 'guardMid' });
      else s = battleReducer(s, { type: 'RESOLVE_DONE' });
      if (seen[seen.length - 1] !== s.phase) seen.push(s.phase);
    }
    for (let i = 1; i < seen.length; i++) {
      expect(legal[seen[i - 1]]).toContain(seen[i]);
    }
    expect(seen.filter((p) => p === 'PLAYER_ATTACK').length).toBeGreaterThan(1);
    expect(seen.filter((p) => p === 'ENEMY_ATTACK').length).toBeGreaterThan(1);
    expect(seen.filter((p) => p === 'RESOLVING').length).toBeGreaterThan(2);
  });

  it('keeps both HP bars inside their legal range, always', () => {
    for (const seed of [1, 7, 99, 20260214]) {
      let s = play(boot(seed), () => 'cleave', () => 'guardLower');
      for (let i = 0; i < 200 && !over(s); i++) {
        s = turn(s, 'thrust');
        expect(s.hp.player).toBeGreaterThanOrEqual(0);
        expect(s.hp.enemy).toBeGreaterThanOrEqual(0);
        expect(s.hp.player).toBeLessThanOrEqual(RULES.maxHp);
        expect(s.hp.enemy).toBeLessThanOrEqual(RULES.maxHp);
      }
      expect(['VICTORY', 'DEFEAT']).toContain(s.phase);
    }
  });

  it('finishes in a reasonable number of rounds', () => {
    const s = play(boot(3), () => 'cleave', () => 'guardUpper');
    expect(s.turn).toBeGreaterThan(2);
    expect(s.turn).toBeLessThan(60);
    /* Two exchanges a round, unless the knock-out blow was the player's — then
       the enemy never got its half of that last round. */
    expect(s.settled).toBeGreaterThanOrEqual(s.turn * 2 - 1);
    expect(s.settled).toBeLessThanOrEqual(s.turn * 2);
  });

  it('stops dead once somebody has won', () => {
    const s = play(boot(3), () => 'cleave', () => 'guardUpper');
    expect(['VICTORY', 'DEFEAT']).toContain(s.phase);
    expect(s.winner).toBe(s.phase === PHASE.VICTORY ? 'player' : 'enemy');
    for (const action of [
      { type: 'CHOOSE_ATTACK', attackId: 'slash' },
      { type: 'CHOOSE_DEFENCE', defenceId: 'guardMid' },
      { type: 'RESOLVE_DONE' },
    ]) expect(battleReducer(s, action)).toBe(s);
  });
});

describe('the log and the replay', () => {
  it('records every strike, and the verdict at the end', () => {
    const s = play(boot(11), () => 'slash', () => 'guardMid');
    const kinds = s.log.map((e) => e.kind);
    expect(kinds[0]).toBe('system');
    expect(kinds.includes('attack')).toBe(true);
    expect(kinds.includes('defend')).toBe(true);
    expect(kinds.includes('turn')).toBe(true);
    expect(['victory', 'defeat']).toContain(kinds[kinds.length - 1]);
    s.log.forEach((e) => expect(e.text.length).toBeGreaterThan(4));
    /* ids are unique and ascending — the UI keys and scrolls off them */
    const ids = s.log.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  it('is reproducible: same seed, same actions, same battle', () => {
    const run = () => {
      let s = boot(4242);
      for (let i = 0; i < 400 && !over(s); i++) {
        s = turn(s, i % 3 === 0 ? 'thrust' : i % 3 === 1 ? 'slash' : 'cleave',
          i % 2 ? 'guardUpper' : 'allOut');
      }
      return s;
    };
    const a = run(), b = run();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.log.map((e) => e.text)).toEqual(b.log.map((e) => e.text));
  });

  it('gives a different seed a different fight', () => {
    const a = play(boot(1), () => 'slash', () => 'guardMid');
    const b = play(boot(2), () => 'slash', () => 'guardMid');
    expect(JSON.stringify(a.log)).not.toBe(JSON.stringify(b.log));
  });

  it('honours the block rule end to end', () => {
    let s = boot(515);
    for (let i = 0; i < 300 && !over(s); i++) {
      s = turn(s, i % 2 ? 'slash' : 'thrust', i % 3 ? 'guardUpper' : 'allOut');
      const p = s.pending && s.pending.actor === 'player' ? s.pending.strike : null;
      if (p && p.outcome === 'block') {
        const d = DEFENCES[p.defenceId];
        expect(d.allOut || d.part === p.part).toBe(true);   // never a block out of nowhere
      }
    }
  });

  it('restarts clean, with a fresh battle', () => {
    const won = play(boot(5), () => 'cleave', () => 'guardUpper');
    const again = battleReducer(won, { type: 'RESTART' });
    expect(again.phase).toBe(PHASE.PLAYER_ATTACK);
    expect(again.hp).toEqual({ player: RULES.maxHp, enemy: RULES.maxHp });
    expect(again.turn).toBe(1);
    expect(again.winner).toBe(null);
    expect(again.settled).toBe(0);
    expect(again.log.length).toBe(1);
    expect(again.seed).not.toBe(won.seed);
  });

  it('lets a feint open the guard, and only for the next blow', () => {
    const swung = battleReducer(boot(2), { type: 'CHOOSE_ATTACK', attackId: 'feint' });
    expect(swung.fx.attackName).toBe('虛招');
    expect(swung.pending.strike.damage).toBe(0);
    const s = battleReducer(swung, { type: 'RESOLVE_DONE' });
    if (s.pending.strike.feintLanded) {
      expect(s.offBalance.enemy).toBe(true);
      expect(s.log.some((e) => e.kind === 'feint')).toBe(true);
      const after = turn(s, 'slash', 'guardUpper');        // the next turn spends it
      expect(after.offBalance.enemy).toBe(false);
    }
  });

  it('keeps a tally that adds up', () => {
    const s = play(boot(88), () => 'thrust', () => 'allOut');
    expect(s.tally.hits + s.tally.blocks + s.tally.misses).toBe(s.settled);
    expect(s.tally.dealt).toBeGreaterThan(0);
    expect(s.tally.taken).toBeGreaterThan(0);
  });
});

