/* =========================================================================
   接舷單挑 · components/SoundToggle.jsx
   A brass button in the corner, and — because a claim about sound should be
   checkable — a one-line readout of where the noise is coming from: how many
   recordings arrived from the CDN, and what fell back to the synth.
   ========================================================================= */
import { motion } from 'framer-motion';

export default function SoundToggle({ muted, ready, samples, total, onToggle }) {
  const label = !ready ? '靜音（未啟動）' : muted ? '已靜音' : '聲音開啟';
  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <motion.button
        type="button"
        onClick={onToggle}
        whileTap={{ scale: 0.94 }}
        aria-pressed={!muted}
        aria-label="切換聲音"
        className={`brass-plate flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[11px] font-bold tracking-widest ${
          muted || !ready ? 'opacity-80' : ''
        }`}
      >
        <span aria-hidden="true" className="emoji-aged">{!ready ? '♪' : muted ? '🔇' : '🔊'}</span>
        <span>{label}</span>
      </motion.button>
      {ready && (
        <span className="rounded-sm border border-brass/60 bg-wood-dark/80 px-1.5 py-1 text-[9.5px] tabular-nums tracking-wider text-parch-300/90">
          取樣 {samples}/{total}
          {samples < total ? ' · 其餘合成' : ''}
        </span>
      )}
    </div>
  );
}
