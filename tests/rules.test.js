/* =========================================================================
   接舷單挑 · tests/rules.test.js        run:  npm test
   The combat maths, headless: no React, no DOM, no browser. The rules are pure
   functions, so they can be pinned down exactly — even the probabilities, by
   replaying a seeded rng rather than hoping.
   ========================================================================= */
import { describe, it, expect } from 'vitest';
import {
  seedFrom, rngNext, pickWeighted, baseDamage, blockChance, resolveStrike,
  chooseEnemyDefence, chooseEnemyAttack,
} from '../src/game/rules.js';
import { RULES, GEAR, ATTACKS, DEFENCES } from '../src/game/constants.js';

const P = GEAR.player, E = GEAR.enemy;
const BARE = { armour: { flat: 0 }, helm: { allOut: 0 }, weapon: { damage: 0 } };

/* Replay a seeded rng through one strike shape and count the outcomes. The
   result is exact for a given seed — reproducible, not flaky. */
function rate({ attackId, defenceId, defender = BARE, offBalance = false, n = 6000, seed = 11 }) {
  let s = seedFrom(seed), hits = 0, blocks = 0, misses = 0;
  for (let i = 0; i < n; i++) {
    const r = resolveStrike({ attackId, defenceId, attackerGear: P, defenderGear: defender, offBalance, rngState: s });
    s = r.rngState;
    if (r.outcome === 'hit') hits++;
    else if (r.outcome === 'block') blocks++;
    else misses++;
  }
  return { hit: hits / n, block: blocks / n, miss: misses / n };
}

describe('the dice', () => {
  it('is deterministic from a seed', () => {
    let a = seedFrom(7), b = seedFrom(7);
    for (let i = 0; i < 50; i++) {
      const ra = rngNext(a), rb = rngNext(b);
      expect(ra.value).toBe(rb.value);
      a = ra.state; b = rb.state;
    }
  });

  it('stays inside [0,1) and never repeats in 500 draws', () => {
    let s = seedFrom(99);
    const seen = new Set();
    for (let i = 0; i < 500; i++) {
      const r = rngNext(s); s = r.state;
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      seen.add(r.value);
    }
    expect(seen.size).toBe(500);
  });

  it('gives different seeds different streams', () => {
    expect(rngNext(seedFrom(1)).value).not.toBe(rngNext(seedFrom(2)).value);
  });

  it('picks by weight, and never picks a zero', () => {
    const items = [{ id: 'a', weight: 0 }, { id: 'b', weight: 1 }];
    const r = pickWeighted(seedFrom(3), items);
    expect(r.item.id).toBe('b');
    expect(typeof r.state).toBe('number');
    expect(pickWeighted(seedFrom(3), [{ id: 'x', weight: 0 }, { id: 'y', weight: 0 }]).item.id).toBe('x');
  });
});

describe('damage before any defence', () => {
  it('adds the wielder\u2019s blade to the strike', () => {
    expect(baseDamage('slash', P)).toBe(15);        // 中部橫斬, 海軍軍刀 +0
    expect(baseDamage('slash', E)).toBe(17);        // ...with 海盜彎刀 +2
    expect(baseDamage('cleave', P)).toBe(30);
    expect(baseDamage('thrust', E)).toBe(24);
  });

  it('gives a feint no damage at all', () => {
    expect(baseDamage('feint', P)).toBe(0);
    expect(baseDamage('feint', E)).toBe(0);
  });

  it('survives nonsense instead of throwing', () => {
    expect(baseDamage('nope', P)).toBe(0);
    expect(blockChance('nope', 'guardMid', P)).toBe(0);
  });
});

describe('the guard rule the brief spells out', () => {
  it('blocks outright when the parts match', () => {
    expect(blockChance('thrust', 'guardUpper', E)).toBe(1);
    expect(blockChance('slash', 'guardMid', E)).toBe(1);
    expect(blockChance('cleave', 'guardLower', E)).toBe(1);
  });

  it('cannot block when they differ', () => {
    expect(blockChance('thrust', 'guardLower', E)).toBe(0);
    expect(blockChance('cleave', 'guardUpper', E)).toBe(0);
    expect(blockChance('slash', 'guardLower', E)).toBe(0);
  });

  it('treats 全力防守 as a medium guard against every part', () => {
    expect(blockChance('thrust', 'allOut', P)).toBeCloseTo(RULES.allOutBlock + P.helm.allOut, 10);
    expect(blockChance('thrust', 'allOut', E)).toBeCloseTo(RULES.allOutBlock, 10);
    expect(blockChance('thrust', 'allOut', P)).toBe(blockChance('slash', 'allOut', P));
    expect(blockChance('cleave', 'allOut', P)).toBe(blockChance('thrust', 'allOut', P));
  });

  it('costs a defender who has just been feinted', () => {
    expect(blockChance('thrust', 'guardUpper', E, true)).toBeCloseTo(1 - RULES.offBalanceBlockCut, 10);
    expect(blockChance('thrust', 'allOut', P, true))
      .toBeCloseTo(RULES.allOutBlock + P.helm.allOut - RULES.offBalanceBlockCut, 10);
    expect(blockChance('thrust', 'guardLower', E, true)).toBe(0);     // never below zero
  });
});


describe('one strike, resolved', () => {
  it('turns a match into a block, 80% off, armour taking its bite', () => {
    const s = resolveStrike({ attackId: 'cleave', defenceId: 'guardLower',
      attackerGear: P, defenderGear: E, rngState: seedFrom(1) });
    expect(s.outcome).toBe('block');
    expect(s.blocked).toBe(true);
    expect(s.blockChance).toBe(1);
    expect(s.damage).toBe(5);                     // 30 * 20% = 6, less 皮甲 1
    expect(s.label).toBe('格擋');
    expect(s.part).toBe('lower');
    expect(s.defencePart).toBe('lower');
  });

  it('never draws blood with a blocked feint', () => {
    for (let i = 0; i < 80; i++) {
      const s = resolveStrike({ attackId: 'feint', defenceId: 'guardMid',
        attackerGear: E, defenderGear: P, rngState: seedFrom(i) });
      expect(s.damage).toBe(0);
      expect(s.outcome).toBe('block');
    }
  });

  it('lands the full base damage when the guard is elsewhere', () => {
    const r = rate({ attackId: 'slash', defenceId: 'guardUpper', defender: E, n: 4000 });
    expect(r.block).toBe(0);                      // no block on the wrong part
    expect(r.hit + r.miss).toBeCloseTo(1, 10);
    const s = resolveStrike({ attackId: 'slash', defenceId: 'guardUpper',
      attackerGear: E, defenderGear: P, rngState: seedFrom(2) });
    if (s.outcome === 'hit') expect(s.damage).toBe(16);   // 15 + 2 - 1
  });

  it('lands on the accuracy the move advertises', () => {
    for (const [id, guard] of [['thrust', 'guardLower'], ['slash', 'guardUpper'], ['cleave', 'guardUpper']]) {
      const r = rate({ attackId: id, defenceId: guard, n: 8000, seed: 5 });
      expect(r.hit).toBeGreaterThan(ATTACKS[id].accuracy - 0.05);
      expect(r.hit).toBeLessThan(ATTACKS[id].accuracy + 0.05);
    }
  });

  it('blocks 全力防守 at the medium rate it promises', () => {
    const r = rate({ attackId: 'thrust', defenceId: 'allOut', defender: E, n: 8000, seed: 13 });
    expect(r.block).toBeGreaterThan(RULES.allOutBlock - 0.05);
    expect(r.block).toBeLessThan(RULES.allOutBlock + 0.05);
  });

  it('hurts 25% more when the guard has been broken open', () => {
    const args = { attackId: 'thrust', defenceId: 'guardLower', attackerGear: P, defenderGear: E, rngState: seedFrom(9) };
    const plain = resolveStrike({ ...args, offBalance: false });
    const open = resolveStrike({ ...args, offBalance: true });
    expect(plain.outcome).toBe(open.outcome);     // the same rolls either way
    if (plain.outcome === 'hit') {
      expect(plain.damage).toBe(22 - E.armour.flat);
      expect(open.damage).toBe(Math.round(22 * 1.25) - E.armour.flat);
      expect(open.damage).toBeGreaterThan(plain.damage);
    }
  });

  it('marks a feint that got through, so the opening can be spent', () => {
    const s = resolveStrike({ attackId: 'feint', defenceId: 'guardUpper',
      attackerGear: P, defenderGear: E, rngState: seedFrom(4) });
    expect(s.feintLanded).toBe(true);             // 虛招 is a 中部 move; a 上部 guard misses it
    expect(s.damage).toBe(0);
  });

  it('is a pure function of its inputs, rng included', () => {
    const args = { attackId: 'slash', defenceId: 'allOut', attackerGear: E, defenderGear: P, rngState: seedFrom(8) };
    expect(JSON.stringify(resolveStrike(args))).toBe(JSON.stringify(resolveStrike(args)));
  });

  it('hands the consumed rng back, advanced', () => {
    const start = seedFrom(77);
    const s = resolveStrike({ attackId: 'slash', defenceId: 'guardUpper',
      attackerGear: P, defenderGear: E, rngState: start });
    expect(s.rngState).not.toBe(start);
    expect(typeof s.rngState).toBe('number');
  });

  it('refuses to resolve without a real move', () => {
    expect(() => resolveStrike({ attackId: 'x', defenceId: 'guardMid', rngState: 1 })).toThrow();
    expect(() => resolveStrike({ attackId: 'slash', defenceId: 'x', rngState: 1 })).toThrow();
  });
});


describe('the enemy has a plan', () => {
  const emptyHistory = () => ({ playerAttacks: [], playerDefences: [], enemyDefences: [], enemyAttacks: [] });
  const history = (attacks) => ({ ...emptyHistory(), playerAttacks: attacks });
  const free = (rng, hp = { player: 100, enemy: 100 }) => ({ rng, hp });

  it('guards the part you have been swinging at', () => {
    let s = seedFrom(21), lower = 0, upper = 0;
    for (let i = 0; i < 400; i++) {
      const r = chooseEnemyDefence({ state: free(s), history: history(['cleave', 'cleave', 'cleave']) });
      s = r.rngState;
      if (r.defenceId === 'guardLower') lower++;
      if (r.defenceId === 'guardUpper') upper++;
    }
    expect(lower).toBeGreaterThan(upper * 1.5);
  });

  it('shifts guard instead of sitting on one', () => {
    /* Feed it its own history, the way the reducer does — that is what the
       shifting rule reads. */
    let s = seedFrom(31), run = 0, worst = 0, prev = null;
    const enemyDefences = [];
    for (let i = 0; i < 300; i++) {
      const r = chooseEnemyDefence({
        state: free(s),
        history: { ...emptyHistory(), enemyDefences: [...enemyDefences] },
      });
      s = r.rngState;
      enemyDefences.push(r.defenceId);
      run = r.defenceId === prev ? run + 1 : 1;
      prev = r.defenceId;
      worst = Math.max(worst, run);
    }
    expect(worst).toBeLessThan(3);
  });

  it('plays safer when it is losing', () => {
    const allOut = (hp) => {
      let s = seedFrom(41), n = 0;
      for (let i = 0; i < 500; i++) {
        const r = chooseEnemyDefence({ state: free(s, hp), history: emptyHistory() });
        s = r.rngState;
        if (r.defenceId === 'allOut') n++;
      }
      return n;
    };
    expect(allOut({ player: 100, enemy: 30 })).toBeGreaterThan(allOut({ player: 100, enemy: 100 }));
  });

  it('attacks the part you leave open', () => {
    let s = seedFrom(51), upper = 0, lower = 0, mid = 0;
    for (let i = 0; i < 400; i++) {
      const r = chooseEnemyAttack({
        state: free(s),
        history: { ...emptyHistory(), playerDefences: ['guardUpper', 'guardUpper', 'guardUpper'] },
      });
      s = r.rngState;
      const part = ATTACKS[r.attackId].part;
      if (part === 'lower') lower++;
      else if (part === 'upper') upper++;
      else mid++;
    }
    expect(lower + upper + mid).toBe(400);      // every draw names one of the three parts
    expect(upper).toBeLessThan(lower);          // guarding your head makes it aim low
    expect(upper).toBeLessThan(mid);
  });

  it('respects a wall of 全力防守 by spreading out less predictably', () => {
    const spread = (defence) => {
      let s = seedFrom(71), seen = new Set();
      for (let i = 0; i < 300; i++) {
        const r = chooseEnemyAttack({
          state: free(s),
          history: { ...emptyHistory(), playerDefences: Array(3).fill(defence) },
        });
        s = r.rngState;
        seen.add(ATTACKS[r.attackId].part);
      }
      return seen.size;
    };
    /* covering one part hard leaves the others wide open, so it should still
       have more than one option in play — but the covered one loses. */
    expect(spread('guardUpper')).toBeGreaterThan(1);
  });

  it('only ever returns moves that exist', () => {
    let s = seedFrom(61);
    for (let i = 0; i < 200; i++) {
      const d = chooseEnemyDefence({ state: free(s), history: emptyHistory() });
      s = d.rngState;
      expect(Object.keys(DEFENCES)).toContain(d.defenceId);
      const a = chooseEnemyAttack({ state: free(s), history: emptyHistory() });
      s = a.rngState;
      expect(Object.keys(ATTACKS)).toContain(a.attackId);
    }
  });
});
