/* =========================================================================
   接舷單挑 · game/rules.js
   The whole fight, as pure functions: no React, no DOM, no audio, no clock.
   Every random draw is threaded back through the state as a number, so a battle
   is reproducible from its seed and every rule below can be tested in Node.
   ========================================================================= */
import {
  ATTACKS, DEFENCES, GEAR, RULES, ATTACK_ORDER, DEFENCE_ORDER, PART_ORDER,
} from './constants.js';

/* ---- the dice ------------------------------------------------------------ */
/* mulberry32, in the pure style: give it the state, get a value *and* the next
   state. Nothing here mutates anything. */
export function seedFrom(n) {
  return (Math.imul(n >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0;
}
export function rngNext(state) {
  const s = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), s | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const v = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value: v, state: s >>> 0 };
}
/* Draw a value in [0,1) and hand back the new state. */
export function draw(state) {
  return rngNext(state);
}
/* Weighted pick; ties broken by order, zero weights never chosen unless
   everything is zero. */
export function pickWeighted(state, items, weightOf = (x) => x.weight ?? 1) {
  const total = items.reduce((sum, x) => sum + Math.max(0, weightOf(x)), 0);
  const r = draw(state);
  if (total <= 0) return { item: items[0], state: r.state, roll: r.value };
  let want = r.value * total;
  for (const item of items) {
    want -= Math.max(0, weightOf(item));
    if (want <= 0) return { item, state: r.state, roll: r.value };
  }
  return { item: items[items.length - 1], state: r.state, roll: r.value };
}

/* ---- guards on the numbers ---------------------------------------------- */
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function attackOf(id) {
  return ATTACKS[id] || null;
}
export function defenceOf(id) {
  return DEFENCES[id] || null;
}
export function gearOf(side) {
  return GEAR[side] || GEAR.player;
}

/* Base damage of a strike, before any defence: the attack, plus the wielder's
   blade. A feint carries no damage at all — not even the blade's, which is the
   whole point of it: it is a lie told with the shoulders. */
export function baseDamage(attackId, gear) {
  const a = attackOf(attackId);
  if (!a) return 0;
  if (a.feint) return 0;
  return Math.max(0, a.damage + (gear?.weapon?.damage || 0));
}

/* 格擋率 ------------------------------------------------------------------ */
/* A defence aimed at the exact part opens a sure guard (the rule the brief
   spells out); 全力防守 covers everything at a medium rate, which is what its
   own description promises. A defender who just ate a feint is off balance and
   guards worse. */
export function blockChance(attackId, defenceId, defenderGear, offBalance = false) {
  const a = attackOf(attackId), d = defenceOf(defenceId);
  if (!a || !d) return 0;
  const sure = a.part === d.part;                       // 攻擊部位 == 防守部位
  let chance = d.allOut ? RULES.allOutBlock + (defenderGear?.helm?.allOut || 0) : (sure ? 1 : 0);
  if (offBalance) chance -= RULES.offBalanceBlockCut;
  return clamp(chance, 0, 1);
}


/* 判定：一格一擊的完整結算 ------------------------------------------------ */
/* Order matters, and it is exactly the brief's: the part comparison decides
   between a block and a clean strike first; only a clean strike gets the
   accuracy roll; then the defender's armour takes its bite. Returns a plain
   object, so the reducer, the UI and the tests all read the same shape. */
export function resolveStrike({ attackId, defenceId, attackerGear, defenderGear, offBalance = false, rngState }) {
  const attack = attackOf(attackId);
  const defence = defenceOf(defenceId);
  if (!attack || !defence) throw new Error('resolveStrike needs a real attack and defence');

  const chance = blockChance(attackId, defenceId, defenderGear, offBalance);
  let s = rngState;
  let roll = 0;
  const step = () => { const r = draw(s); s = r.state; roll = r.value; return r.value; };

  const blocked = step() < chance;
  let outcome = blocked ? 'block' : 'hit';
  let damage = 0;
  const armourOf = (g) => g?.armour?.flat || 0;

  if (blocked) {
    damage = attack.feint ? 0 : Math.max(RULES.minDamage,
      Math.round(baseDamage(attackId, attackerGear) * (1 - RULES.blockReduction)) - armourOf(defenderGear));
  } else if (step() < attack.accuracy) {
    const raw = baseDamage(attackId, attackerGear) * (offBalance ? 1 + RULES.offBalanceDamageUp : 1);
    damage = raw <= 0 ? 0 : Math.max(RULES.minDamage, Math.round(raw) - armourOf(defenderGear));
  } else {
    outcome = 'miss';
  }

  /* 虛招的意義：騙到人，對方下一擊的門就開了。 */
  const feintLanded = !!attack.feint && !blocked;
  return {
    attackId, defenceId, attack, defence,
    blocked, outcome, damage, roll, blockChance: chance, feintLanded,
    label: outcome === 'block' ? '格擋' : outcome === 'miss' ? '落空' : '命中',
    part: attack.part,
    defencePart: defence.part,
    /* the strike consumes its own randomness, and hands back where it got to */
    rngState: s,
  };
}

/* 敵人 AI ----------------------------------------------------------------- */
/* It is genuinely trying: it reads your habits — which part you favour, and how
   you have been defending — and hedges against them, with a little noise so it
   is not a spreadsheet. Pure and seeded, so a capture can replay it exactly. */
export function chooseEnemyDefence({ state, history }) {
  const weight = { upper: 1, mid: 1, lower: 1 };
  for (const id of history.playerAttacks.slice(-6)) {
    const a = attackOf(id);
    if (a) weight[a.part] += 1.15;
  }
  /* Losing makes it cautious, and it leans on the all-out guard. */
  const hp = state.hp || {};
  const losing = (hp.enemy ?? 100) < (hp.player ?? 100) - 15;
  const options = DEFENCE_ORDER.map((id) => ({
    id,
    weight: DEFENCES[id].allOut ? (losing ? 1.5 : 0.75) : weight[DEFENCES[id].part],
  }));
  /* A fighter who has just guarded the same way twice shifts: the repeat comes
     off the table rather than merely being discouraged. */
  const last = history.enemyDefences;
  const twice = last.length >= 2 && last[last.length - 1] === last[last.length - 2]
    ? last[last.length - 1] : null;
  const pool = twice ? options.filter((o) => o.id !== twice) : options;
  const { item, state: rngState } = pickWeighted(state.rng, pool.length ? pool : options);
  return { defenceId: item.id, rngState };
}

export function chooseEnemyAttack({ state, history }) {
  /* It aims where you are *not* covering: the parts you have been guarding
     become less attractive, and a wall of 全力防守 dampens everything a little. */
  const exposure = { upper: 1, mid: 1, lower: 1 };
  for (const id of history.playerDefences.slice(-6)) {
    const d = defenceOf(id);
    if (d && d.part) exposure[d.part] *= 0.55;
    if (d && d.allOut) for (const p of PART_ORDER) exposure[p] *= 0.8;
  }
  const hurt = (state.hp?.player ?? 100) < 40;                 // finish the job
  const options = ATTACK_ORDER.map((id) => {
    const a = ATTACKS[id];
    if (a.feint) return { id, weight: hurt ? 0.15 : 0.55 };    // feints shine early
    let w = exposure[a.part] * (id === 'cleave' ? 0.85 : 1);   // the huge swing is risky for it too
    if (hurt && a.damage >= 22) w *= 1.4;
    return { id, weight: w };
  });
  const { item, state: rngState } = pickWeighted(state.rng, options);
  return { attackId: item.id, rngState };
}
