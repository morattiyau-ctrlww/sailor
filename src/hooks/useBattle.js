/* =========================================================================
   接舷單挑 · hooks/useBattle.js
   The bridge between the pure machine and the screen.

   The reducer decides everything; this hook only does the three things a
   reducer cannot: wait for the animation, play the sound at the right tenth of
   a second, and hold the audio context (which browsers refuse to start without
   a real click, so the very first gesture — pressing 登船開戰 — starts it).
   ========================================================================= */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { battleReducer, initialState, PHASE } from '../game/reducer.js';
import { TIMING } from '../game/constants.js';
import * as sfx from '../audio/sfx.js';
import {
  attackCue, defenceCue, startCue, newTurnCue, chargeCue, exchangeCues, endingCues,
} from '../audio/cues.js';

export function useBattle(seed = 20260214) {
  const [state, dispatch] = useReducer(battleReducer, null, () => initialState({ seed }));
  const [audio, setAudio] = useState({ ready: false, muted: false, samples: 0, status: null });
  const sounded = useRef(0);          // the last fx we made a noise for

  /* ---- 開始：這是唯一需要使用者手勢的地方 ------------------------------- */
  const begin = useCallback(async () => {
    const status = await sfx.start();
    setAudio({ ready: sfx.isReady(), muted: sfx.isMuted(), samples: status?.loaded?.length ?? 0, status });
    dispatch({ type: 'START' });
  }, []);
  const restart = useCallback(() => {
    sfx.play('click');
    dispatch({ type: 'RESTART' });
  }, []);

  const chooseAttack = useCallback((attackId) => {
    sfx.play(attackCue());             // the blade is already moving
    dispatch({ type: 'CHOOSE_ATTACK', attackId });
  }, []);
  const chooseDefence = useCallback((defenceId) => {
    sfx.play(defenceCue());
    dispatch({ type: 'CHOOSE_DEFENCE', defenceId });
  }, []);

  const toggleMute = useCallback(() => {
    const muted = sfx.setMuted(!sfx.isMuted());
    setAudio((a) => ({ ...a, muted }));
    if (!muted) sfx.play(defenceCue());
  }, []);

  /* ---- 動畫/音效播完才換階段 -------------------------------------------- */
  useEffect(() => {
    if (state.phase !== PHASE.RESOLVING) return undefined;
    const id = setTimeout(() => dispatch({ type: 'RESOLVE_DONE' }), TIMING.resolve);
    return () => clearTimeout(id);
  }, [state.phase, state.settled]);

  /* ---- 命中的那一刻：先破風，再鏗鏘／悶響／風聲 ------------------------- */
  useEffect(() => {
    const fx = state.fx;
    if (!fx || sounded.current === fx.id) return undefined;   // StrictMode-safe
    sounded.current = fx.id;
    const id = setTimeout(() => {
      exchangeCues(fx, PHASE.RESOLVING).forEach((name) => sfx.play(name));
    }, TIMING.impact);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.fx?.id]);

  /* ---- 敵人蓄勢待發 ----------------------------------------------------- */
  useEffect(() => {
    if (state.phase !== PHASE.ENEMY_ATTACK) return undefined;
    sfx.play(chargeCue());
    return undefined;
  }, [state.phase, state.turn]);

  /* ---- 新的回合：一聲船鐘 ------------------------------------------------- */
  useEffect(() => {
    if (state.phase !== PHASE.PLAYER_ATTACK || state.turn === 1) return undefined;
    sfx.play(newTurnCue());
    return undefined;
  }, [state.turn, state.phase]);

  /* ---- 收場 ------------------------------------------------------------- */
  useEffect(() => {
    const ending = endingCues(state.phase);
    if (ending.length) {
      /* the fanfare is the last thing you hear, so the sea goes quiet first */
      sfx.stopAmbience();
      ending.forEach((name) => sfx.play(name));
    }
    if (state.phase === PHASE.PLAYER_ATTACK && state.turn === 1) {
      sfx.startAmbience();
      sfx.play(startCue());
    }
  }, [state.phase, state.turn]);

  return { state, audio, begin, restart, chooseAttack, chooseDefence, toggleMute };
}
