/* =========================================================================
   接舷單挑 · tests/audio.test.js
   The audio layer, checked without a browser.

   The interesting question is not "is there a sound file" but "can the game
   ever ask for a sound that does not exist". So this drives hundreds of real
   battles through the reducer, collects every cue the hook would play, and
   insists that each one is a name the manifest knows — with either a recording
   or a synth recipe behind it.
   ========================================================================= */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SAMPLES, SOUND_NAMES, CREDITS } from '../src/audio/manifest.js';
import {
  attackCue, defenceCue, startCue, newTurnCue, chargeCue, impactCues, endingCues,
} from '../src/audio/cues.js';
import { battleReducer, initialState, isOver, PHASE, attackList, defenceList } from '../src/game/reducer.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

/* The recipe names, read straight out of the synth module. sfx.js imports
   Tone.js, which has no business in a Node test, so its *names* are verified
   statically while its behaviour is verified in the browser check. */
function recipeNames() {
  const src = readFileSync(here('../src/audio/sfx.js'), 'utf8');
  const start = src.indexOf('const RECIPES = {');
  const block = src.slice(start, src.indexOf('\n};', start));
  return [...block.matchAll(/^\s{2}([a-z]+):\s*\(\)/gm)].map((m) => m[1]);
}

/* Every sound the game actually asks for, by playing it out. */
function cuesFromRealBattles(seeds = 220) {
  const heard = new Set([startCue(), chargeCue(), newTurnCue(), 'click']);
  for (let seed = 1; seed <= seeds; seed++) {
    let s = battleReducer(initialState({ seed }), { type: 'START' });
    let guard = 0;
    while (!isOver(s) && guard++ < 400) {
      if (s.phase === PHASE.PLAYER_ATTACK) {
        const attacks = attackList();
        heard.add(attackCue());
        s = battleReducer(s, { type: 'CHOOSE_ATTACK', attackId: attacks[guard % attacks.length].id });
      } else if (s.phase === PHASE.ENEMY_ATTACK) {
        const defences = defenceList();
        heard.add(defenceCue());
        s = battleReducer(s, { type: 'CHOOSE_DEFENCE', defenceId: defences[guard % defences.length].id });
      } else if (s.phase === PHASE.RESOLVING) {
        impactCues(s.fx).forEach((c) => heard.add(c));
        s = battleReducer(s, { type: 'RESOLVE_DONE' });
      } else {
        break;                                   // INTRO, or an ending
      }
      endingCues(s.phase).forEach((c) => heard.add(c));
    }
    expect(isOver(s)).toBe(true);                // the loop must actually finish
  }
  return heard;
}


describe('the sounds the game asks for', () => {
  const heard = cuesFromRealBattles();
  const recipes = recipeNames();

  it('every cue from a real battle is a known sound name', () => {
    const unknown = [...heard].filter((c) => !SOUND_NAMES.includes(c));
    expect(unknown).toEqual([]);
  });

  it('the battles between them exercise the whole vocabulary', () => {
    /* If this fails, a sound in the manifest is dead code — either wire it up
       or take it out. */
    expect(SOUND_NAMES.filter((n) => !heard.has(n))).toEqual([]);
    ['block', 'miss', 'hit', 'hurt', 'victory', 'defeat'].forEach((n) => expect(heard.has(n), n).toBe(true));
  });

  it('a defeat is heard as well as a victory, and nobody dies silently', () => {
    expect(endingCues(PHASE.VICTORY)).toEqual(['death', 'victory']);
    expect(endingCues(PHASE.DEFEAT)).toEqual(['death', 'defeat']);
    expect(endingCues(PHASE.PLAYER_ATTACK)).toEqual([]);
  });

  it('the contact sounds depend only on what actually happened', () => {
    expect(impactCues(null)).toEqual([]);
    expect(impactCues({ outcome: 'block', target: 'player' })).toEqual(['block']);
    expect(impactCues({ outcome: 'miss', target: 'player' })).toEqual(['miss']);
    /* your own hit is a hit; taking one is a hit and a grunt */
    expect(impactCues({ outcome: 'hit', target: 'enemy' })).toEqual(['hit']);
    expect(impactCues({ outcome: 'hit', target: 'player' })).toEqual(['hit', 'hurt']);
  });

  it('will not ask for a name it cannot make', () => {
    for (const cue of heard) {
      const hasSample = (SAMPLES[cue] || []).length > 0;
      const hasRecipe = recipes.includes(cue);
      expect(hasSample || hasRecipe, `${cue} has neither a sample nor a recipe`).toBe(true);
    }
  });
});

describe('the manifest', () => {
  const recipes = recipeNames();

  it('names every sound exactly once, in lower case', () => {
    expect(new Set(SOUND_NAMES).size).toBe(SOUND_NAMES.length);
    expect(SOUND_NAMES.every((n) => /^[a-z]+$/.test(n))).toBe(true);
  });

  it('only lists recordings for sounds that are actually in the game', () => {
    /* SAMPLES is deliberately sparse: only the events that found a recording
       worth having appear in it, and everything else is synthesised. */
    for (const key of Object.keys(SAMPLES)) expect(SOUND_NAMES).toContain(key);
    for (const [name, urls] of Object.entries(SAMPLES)) {
      if (urls.length) expect(SOUND_NAMES).toContain(name);
    }
  });

  it('has a synth recipe for every name, so a failed download is not silence', () => {
    for (const name of SOUND_NAMES) expect(recipes, `${name} has no recipe`).toContain(name);
    expect(recipes.length).toBe(SOUND_NAMES.length);
  });

  it('only ever points at https recordings we can decode', () => {
    for (const [name, urls] of Object.entries(SAMPLES)) {
      for (const url of urls) {
        expect(url.startsWith('https://'), `${name} -> ${url}`).toBe(true);
        expect(() => new URL(url)).not.toThrow();
        expect(/\.(mp3|wav|ogg)(\?|$)/i.test(decodeURIComponent(url)), `${name} -> ${url}`).toBe(true);
      }
    }
  });

  it('keeps the fallbacks in order, first choice first, with no repeats', () => {
    for (const [name, urls] of Object.entries(SAMPLES)) {
      expect(new Set(urls).size, `${name} repeats a URL`).toBe(urls.length);
    }
  });

  it('says where the noise comes from', () => {
    const text = CREDITS.map((c) => `${c.what} ${c.from}`).join(' ');
    expect(text).toMatch(/Tone\.js/);
    expect(text).toMatch(/Phaser/);
  });
});
