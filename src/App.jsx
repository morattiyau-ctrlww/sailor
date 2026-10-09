/* =========================================================================
   接舷單挑 · App.jsx
   The screen: the scene behind, the panels on top, and a ribbon in the middle
   that shows which half of the turn you are in. Every button here is wired to
   one of the five actions the machine accepts, and to nothing else.
   ========================================================================= */
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import BattleScene from './components/BattleScene.jsx';
import UIPanel from './components/UIPanel.jsx';
import ActionBar from './components/ActionBar.jsx';
import BattleLog from './components/BattleLog.jsx';
import StartScreen from './components/StartScreen.jsx';
import ResultOverlay from './components/ResultOverlay.jsx';
import SoundToggle from './components/SoundToggle.jsx';
import { useBattle } from './hooks/useBattle.js';
import { PHASE, isOver } from './game/reducer.js';
import { SOUND_NAMES } from './audio/manifest.js';

/* ---- the two halves of a turn, shown as two steps ------------------------ */
function PhaseRibbon({ state }) {
  const batting = state.phase === PHASE.PLAYER_ATTACK;
  const defending = state.phase === PHASE.ENEMY_ATTACK;
  return (
    <div className="wood pointer-events-auto hidden items-center gap-1 px-3 py-1.5 md:flex">
      <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${batting ? 'brass-plate animate-pulse-gold' : 'text-parch-300/70'}`}>
        ① 你進攻
      </span>
      <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${defending ? 'bg-blood text-parchment' : 'text-parch-300/70'}`}>
        ② 敵人進攻
      </span>
      <span className="ml-2 text-[10px] tracking-[0.2em] text-parch-200/85">
        {state.phase === PHASE.RESOLVING ? '結算中' : `第 ${state.turn} 回合`}
      </span>
    </div>
  );
}

export default function App() {
  const { state, audio, begin, restart, chooseAttack, chooseDefence, toggleMute } = useBattle();
  const [hoverPart, setHoverPart] = useState(null);
  const [busy, setBusy] = useState(false);

  const onBegin = useCallback(async () => {
    setBusy(true);
    await begin();
    setBusy(false);
  }, [begin]);

  /* R restarts, once the fight is over — the same as the brass button. */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'r' || e.key === 'R') && isOver(state)) restart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, restart]);

  const finished = isOver(state);
  const takingOne = state.phase === PHASE.RESOLVING && state.fx?.target === 'player' && state.fx?.outcome === 'hit';

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-wood-950">
      <BattleScene state={state} hoverPart={hoverPart} />

      {/* ---------------- top: the two fighters ---------------- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 sm:gap-4 sm:p-3">
        <UIPanel side="player" state={state} hit={takingOne} />
        <PhaseRibbon state={state} />
        <UIPanel side="enemy" state={state} charging={state.phase === PHASE.ENEMY_ATTACK} hit={state.phase === PHASE.RESOLVING && state.fx?.target === 'enemy'} />
      </div>

      {/* ---------------- the sound switch ---------------- */}
      <div className="absolute bottom-[calc(30vh+1.5rem)] right-3 z-30 hidden lg:block">
        <SoundToggle
          muted={audio.muted}
          ready={audio.ready}
          samples={audio.samples}
          total={SOUND_NAMES.length}
          onToggle={toggleMute}
        />
      </div>

      {/* ---------------- bottom: the log and the plates ---------------- */}
      <div className="absolute inset-x-0 bottom-0 z-20 grid gap-2 p-2 sm:gap-3 sm:p-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <BattleLog
          log={state.log}
          tally={state.tally}
          settled={state.settled}
          className="h-[16vh] min-h-[104px] lg:h-[30vh]"
        />
        <ActionBar
          state={state}
          onAttack={chooseAttack}
          onDefence={chooseDefence}
          onHoverPart={setHoverPart}
        />
      </div>

      {/* ---------------- overlays ---------------- */}
      <AnimatePresence>
        {state.phase === PHASE.INTRO && <StartScreen key="start" busy={busy} onBegin={onBegin} />}
        {finished && <ResultOverlay key="over" state={state} onRestart={restart} />}
      </AnimatePresence>

      <footer className="pointer-events-none absolute bottom-0.5 left-2 z-30 hidden text-[9px] text-parch-300/40 sm:block">
        React · Vite · Tailwind · Framer Motion · Tone.js ｜ 取樣失敗時自動以合成音取代
      </footer>
    </div>
  );
}
