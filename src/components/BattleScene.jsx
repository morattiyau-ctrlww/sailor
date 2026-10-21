/* =========================================================================
   接舷單挑 · components/BattleScene.jsx
   The stage: a dusk sea, two ships laid alongside, and two men on the decks who
   actually move when the machine says so.

   Everything visual here is a *reaction* to state.fx — the scene never decides
   anything. The lunge, the spark, the flinch and the shake are all keyed off
   the exchange id, so one blow is one animation and a slow-motion replay of the
   same frame is impossible.
   ========================================================================= */
import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Ship from './Ship.jsx';
import Pirate from './Pirate.jsx';
import DamagePopup from './DamagePopup.jsx';
import { PHASE } from '../game/reducer.js';

/* ---- what each fighter is doing right now -------------------------------- */
function poseFor(side, state) {
  const fx = state.fx;
  const terminal = state.phase === PHASE.VICTORY || state.phase === PHASE.DEFEAT;
  if (terminal) return state.winner === side ? 'ready' : 'down';
  if (state.phase === PHASE.RESOLVING && fx) {
    if (fx.actor === side) return 'strike';
    if (fx.target === side) {
      if (fx.outcome === 'block') return 'guard';
      if (fx.outcome === 'miss') return 'idle';
      return 'hurt';
    }
  }
  if (side === 'enemy') return state.phase === PHASE.ENEMY_ATTACK ? 'charge' : 'guard';
  return state.phase === PHASE.ENEMY_ATTACK ? 'ready' : 'ready';
}

/* The zone in play: what you are aiming at, or what is being defended. */
function zoneFor(side, state, hoverPart) {
  const fx = state.fx;
  if (state.phase === PHASE.RESOLVING && fx) {
    if (fx.target === side) return { part: fx.part, tone: 'danger' };
    if (fx.actor === side) return { part: fx.defencePart || null, tone: 'guard' };
    return null;
  }
  const choosing = state.phase === PHASE.PLAYER_ATTACK;
  if (choosing && side === 'enemy' && hoverPart) return { part: hoverPart, tone: 'danger' };
  if (state.phase === PHASE.ENEMY_ATTACK && side === 'player' && hoverPart) {
    return { part: hoverPart, tone: 'guard' };
  }
  return null;
}

/* ---- the sea, drawn once ------------------------------------------------ */
function Sea() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%] overflow-hidden">
      <div className="sea-glass absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-b from-[#0b1f31]/70 to-[#07131f]" />
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
          className={`absolute inset-x-0 ${i === 0 ? 'animate-wave-slow' : 'animate-wave'}`}
          style={{
            bottom: `${6 + i * 15}%`,
            height: `${16 + i * 4}%`,
            width: '200%',
            opacity: 0.16 + i * 0.18,
            animationDirection: i === 1 ? 'reverse' : 'normal',
            animationDuration: `${9 - i * 2.2}s`,
          }}
        >
          <path
            d="M0 34 q75 -22 150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 v30 H0 z"
            fill={i === 0 ? '#2a6683' : '#1b4763'}
          />
        </svg>
      ))}
      {/* the sun's road on the water */}
      <div className="absolute left-1/2 top-0 h-full w-[30%] -translate-x-1/2 bg-gradient-to-b from-amber-200/35 via-amber-200/12 to-transparent blur-sm" />
    </div>
  );
}

/* ---- the sky ------------------------------------------------------------ */
function Sky() {
  const clouds = useMemo(() => [
    { top: '12%', scale: 1, dur: 74, delay: 0 },
    { top: '26%', scale: 0.6, dur: 96, delay: 8 },
    { top: '6%', scale: 1.35, dur: 120, delay: 20 },
  ], []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1730] via-[#1b4363] to-[#8a6234]" />
      <div className="absolute left-1/2 top-[46%] h-28 w-28 -translate-x-1/2 rounded-full bg-amber-100/90 blur-[3px] sm:h-44 sm:w-44" />
      <div className="absolute left-1/2 top-[40%] h-48 w-48 -translate-x-1/2 rounded-full bg-amber-300/30 blur-3xl sm:h-72 sm:w-72" />
      <div className="absolute inset-x-0 top-[54%] h-[16%] bg-gradient-to-b from-amber-200/22 to-transparent" />
      {clouds.map((c, i) => (
        <motion.div
          key={i}
          className="absolute h-10 w-64 rounded-full bg-[#e8d9c0]/10 blur-xl"
          style={{ top: c.top, scale: c.scale }}
          initial={{ x: '-30vw' }}
          animate={{ x: '130vw' }}
          transition={{ duration: c.dur, repeat: Infinity, ease: 'linear', delay: c.delay }}
        />
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-[2px] w-[2px] rounded-full bg-amber-100/70"
          style={{ left: `${(i * 37) % 100}%`, top: `${8 + ((i * 53) % 34)}%` }}
          animate={{ opacity: [0.15, 0.9, 0.15] }}
          transition={{ duration: 2.4 + (i % 5) * 0.6, repeat: Infinity, delay: i * 0.27 }}
        />
      ))}
    </div>
  );
}


/* ---- one side of the fight: a ship, fixed in place ---------------------- */
function Fighter({ side, state }) {
  const isPlayer = side === 'player';
  const fx = state.fx;
  const mid = state.phase === PHASE.RESOLVING && fx;
  const took = mid && fx.target === side;

  return (
    /* The hull is 130% of the viewport wide on a phone, so the two ships still
       overlap bow-to-bow instead of shrinking into toys; on a wide screen it is
       sized as a plain fraction of the stage. */
    <div
      className={`absolute bottom-[2%] w-[130%] lg:w-[44%] ${
        isPlayer ? 'left-[-80%] lg:left-[-1%]' : 'right-[-80%] lg:right-[-1%]'
      }`}
      style={{ aspectRatio: '340 / 230' }}
    >
      {/* the hull: fixed, never animated */}
      <Ship
        palette={isPlayer ? 'royal' : 'corsair'}
        facing={isPlayer ? 1 : -1}
        className="block h-full w-full drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)]"
      />

      {/* a slack rope, so the two hulls read as lashed together */}
      {isPlayer && (
        <div className="rope pointer-events-none absolute bottom-[30%] left-[82%] h-[3px] w-[42%] rotate-[-3deg] opacity-75" />
      )}

      {/* the number, thrown off the man who took the blow */}
      <DamagePopup
        fx={took ? fx : null}
        className={isPlayer ? 'right-0 bottom-[62%]' : 'bottom-[62%] left-[6%]'}
      />
    </div>
  );
}

/* ---- the two men, standing on the line between the hulls ---------------- */
function Sailor({ side, state, hoverPart }) {
  const isPlayer = side === 'player';
  const pose = poseFor(side, state);
  const zone = zoneFor(side, state, hoverPart);
  const fx = state.fx;
  const mid = state.phase === PHASE.RESOLVING && fx;
  const struck = mid && fx.actor === side;

  /* The hulls never move. Only the men do: each one stands on the deck line
     between the two ships, and steps toward his opponent when he strikes. */
  const toward = isPlayer ? 1 : -1;
  const step = struck
    ? (fx.attackName === '下部力劈' ? 14 : fx.attackName === '虛招' ? 4 : 10)
    : 0;

  return (
    <motion.div
      className={`absolute bottom-[calc(2%+35%*0.44)] w-[10%] max-w-[120px] ${
        isPlayer ? 'left-[42%]' : 'right-[42%]'
      }`}
      animate={{ x: `${toward * step}%`, y: struck ? -5 : 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 15 }}
    >
      {/* the deck plank under his feet, so he stands on something */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-18%] bottom-[-6px] h-[10px] rounded-[2px] border border-[#2a1a0e] bg-[repeating-linear-gradient(90deg,#5d4037_0px,#4e3119_3px,#654020_6px,#3e2723_9px,#5d4037_12px)] shadow-[0_4px_8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,214,150,0.25)]"
      />
      <Pirate
        palette={isPlayer ? 'royal' : 'corsair'}
        facing={isPlayer ? 1 : -1}
        pose={pose}
        zone={zone?.part || null}
        zoneTone={zone?.tone || 'danger'}
        glow={!isPlayer && state.phase === PHASE.ENEMY_ATTACK ? 1 : 0}
        className="relative block h-auto w-full"
      />
    </motion.div>
  );
}

/* ---- steel meeting steel ------------------------------------------------ */
function Sparks({ fx }) {
  if (!fx || fx.outcome !== 'block') return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-[52%] z-20 -translate-x-1/2">
      <motion.div key={fx.id} className="relative">
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <motion.span
              key={i}
              className="absolute h-[5px] w-[5px] rounded-full bg-amber-200 shadow-[0_0_10px_3px_rgba(255,220,140,0.85)]"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: Math.cos(a) * 78, y: Math.sin(a) * 54, opacity: 0, scale: 0.3 }}
              transition={{ duration: 0.5 + (i % 3) * 0.09, ease: 'easeOut' }}
            />
          );
        })}
        <motion.span
          className="absolute -left-7 -top-7 h-14 w-14 rounded-full bg-white/70 blur-[7px]"
          initial={{ opacity: 0.95, scale: 0.4 }}
          animate={{ opacity: 0, scale: 1.8 }}
          transition={{ duration: 0.34 }}
        />
      </motion.div>
    </div>
  );
}

/* ---- the arc of a swing ------------------------------------------------- */
function SlashArc({ fx }) {
  if (!fx || fx.outcome === 'block' || fx.actor !== 'player') return null;
  const heavy = fx.attackName === '下部力劈';
  const feint = fx.attackName === '虛招';
  return (
    <motion.svg
      key={fx.id}
      viewBox="0 0 200 200"
      className="pointer-events-none absolute left-1/2 top-[6%] z-20 h-[62%] w-[52%] -translate-x-1/2"
    >
      <motion.path
        d={heavy ? 'M18 24 q54 132 168 150' : feint ? 'M34 60 q52 44 132 44' : 'M22 34 q62 116 160 138'}
        fill="none"
        stroke={feint ? '#c9b177' : heavy ? '#ffd166' : '#eaf6ff'}
        strokeWidth={heavy ? 13 : 8}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0.95 }}
        animate={{ pathLength: 1, opacity: 0 }}
        transition={{ duration: feint ? 0.42 : 0.36, ease: 'easeOut' }}
        style={{ filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.8))' }}
      />
    </motion.svg>
  );
}

/* ============================== the stage ================================= */
export default function BattleScene({ state, hoverPart = null }) {
  const fx = state.fx;

  /* The stage itself stays still — the ships are lashed together and do not
     rock. The only motion is the men and the sparks. */

  const playerHit = fx && state.phase === PHASE.RESOLVING && fx.target === 'player' && fx.outcome === 'hit';

  return (
    <div className="absolute inset-0 overflow-hidden">
      <Sky />
      {/* The stage band leaves room for the HUD at the foot of the screen, so
          the hulls are never buried behind the log. A phone spends more of its
          height on buttons, so the band gives up more there. */}
      <div className="absolute inset-x-0 top-0 bottom-[44vh] lg:bottom-[31vh]">
        <Sea />
        <Fighter side="player" state={state} />
        <Fighter side="enemy" state={state} />
        <Sailor side="player" state={state} hoverPart={hoverPart} />
        <Sailor side="enemy" state={state} hoverPart={hoverPart} />
        <SlashArc fx={fx} />
        <Sparks fx={fx} />
      </div>

      {/* taking one hurts */}
      <AnimatePresence>
        {playerHit && (
          <motion.div
            key={fx.id}
            className="pointer-events-none absolute inset-0 z-10"
            style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(200,30,30,0.34), transparent 70%)' }}
            initial={{ opacity: 0.95 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      <div className="vignette pointer-events-none absolute inset-0" />
    </div>
  );
}

