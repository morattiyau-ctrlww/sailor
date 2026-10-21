/* =========================================================================
   接舷單挑 · components/ResultOverlay.jsx
   The verdict, on a brass plaque: who is still standing, what the fight cost,
   and one way back in.
   ========================================================================= */
import { motion } from 'framer-motion';
import Pirate from './Pirate.jsx';
import { PHASE } from '../game/reducer.js';

export default function ResultOverlay({ state, onRestart }) {
  const won = state.phase === PHASE.VICTORY;
  const { tally, turn, settled } = state;
  const rows = [
    ['回合數', turn],
    ['交鋒次數', settled],
    ['命中 / 格擋 / 落空', `${tally.hits} / ${tally.blocks} / ${tally.misses}`],
    ['你造成的傷害', tally.dealt],
    ['你承受的傷害', tally.taken],
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 grid place-items-center bg-wood-950/80 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 26, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 17 }}
        className="wood w-full max-w-[520px] p-5 text-center"
      >
        <div className="mx-auto h-24 w-20">
          <Pirate
            palette={won ? 'royal' : 'corsair'}
            pose={won ? 'ready' : 'down'}
            className="h-full w-full"
            glow={won ? 1 : 0}
          />
        </div>
        <h2
          className={`text-shadow-hard mt-1 border-b-4 border-double border-brass pb-2 text-[40px] font-black tracking-[0.2em] ${
            won ? 'text-brass-light' : 'text-blood-bright'
          }`}
        >
          {won ? '勝利' : '戰敗'}
        </h2>
        <p className="mt-1 text-[12px] tracking-[0.3em] text-parch-200">
          {won ? '紅鬍子倒在甲板上，海鴉號降下旗來。' : '你被拖上桅杆，海圖換了主人。'}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-sm border-2 border-brass/60 bg-wood-dark/70 px-3 py-2.5 text-left text-[12px] shadow-[inset_0_0_18px_rgba(0,0,0,0.5)]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-2">
              <dt className="tracking-wider text-parch-300/90">{k}</dt>
              <dd className="font-bold tabular-nums tracking-wider text-parchment">{v}</dd>
            </div>
          ))}
        </dl>

        <motion.button
          type="button"
          onClick={onRestart}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="brass-plate mt-4 w-full rounded-sm px-4 py-3 text-[16px] font-black tracking-[0.28em]"
        >
          <span className="emoji-aged">⚔</span> 再來一場
        </motion.button>
        <p className="mt-2 text-[10px] tracking-widest text-parch-300/75">或按 R 鍵重開</p>
      </motion.div>
    </motion.div>
  );
}
