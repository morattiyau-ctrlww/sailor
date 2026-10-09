/* =========================================================================
   接舷單挑 · audio/cues.js
   Which sound each game event asks for, as plain functions.

   This is deliberately *not* inside sfx.js: keeping the mapping pure means a
   test can drive thousands of simulated battles in Node and prove that every
   event the machine can produce maps to a sound that the manifest actually
   knows how to make. The audio layer then has no vocabulary of its own to get
   wrong — it just plays what it is told.
   ========================================================================= */
import { PHASE } from '../game/reducer.js';

/* Picking a move happens before anything is decided, so the blade is already
   moving in the air while the machine works out what it hit. */
export function attackCue() { return 'swing'; }
export function defenceCue() { return 'click'; }
export function startCue() { return 'foghorn'; }     // the ship's horn as you board
export function newTurnCue() { return 'turn'; }      // the ship's bell, one per round
export function chargeCue() { return 'charge'; }     // the enemy winds up

/* The moment of contact: exactly what a listener needs to know what happened.
   Note that this is called while the machine is in RESOLVING — the phase has
   not moved on yet — so the ending is a separate question (below). */
export function impactCues(fx) {
  if (!fx) return [];
  if (fx.outcome === 'block') return ['block'];
  if (fx.outcome === 'miss') return ['miss'];
  return fx.target === 'player' ? ['hit', 'hurt'] : ['hit'];
}

/* By the time the phase reaches an ending the exchange has already been played
   out and fx has been cleared, so the terminal cues are keyed off the phase:
   whoever fell gets the grunt, then the fanfare or the dirge. */
export function endingCues(phase) {
  if (phase === PHASE.VICTORY) return ['death', 'victory'];
  if (phase === PHASE.DEFEAT) return ['death', 'defeat'];
  return [];
}

/* Everything a finished exchange can ask for, in playing order. */
export function exchangeCues(fx, phase) {
  return [...impactCues(fx), ...endingCues(phase)];
}
