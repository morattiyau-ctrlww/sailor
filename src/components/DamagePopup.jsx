/* =========================================================================
   接舷單挑 · components/DamagePopup.jsx
   The number that tells you what just happened, thrown off the fighter who
   took it: gold for a hit, pale for a block, grey for a whiff. Keyed by the
   exchange id so every blow gets exactly one, and it floats away by itself.
   ========================================================================= */
import { AnimatePresence, motion } from 'framer-motion';

const STYLE = {
  hit: { color: 'text-rose-100', ring: 'border-rose-400/70', bg: 'bg-rose-950/75' },
  block: { color: 'text-sky-100', ring: 'border-sky-300/70', bg: 'bg-sky-950/75' },
  miss: { color: 'text-stone-200', ring: 'border-stone-300/50', bg: 'bg-stone-900/65' },
};

export default function DamagePopup({ fx, className = '' }) {
  const s = STYLE[fx?.outcome] || STYLE.hit;
  const big = fx?.outcome === 'hit' && fx.damage >= 20;

  return (
    <div className={`pointer-events-none absolute z-30 w-[150px] ${className}`}>
      <AnimatePresence>
        {fx && (
          <motion.div
            key={fx.id}
            initial={{ opacity: 0, y: 14, scale: 0.6 }}
            animate={{ opacity: 1, y: -58, scale: big ? 1.22 : 1 }}
            exit={{ opacity: 0, y: -84 }}
            transition={{ duration: 0.95, ease: [0.16, 0.9, 0.3, 1] }}
            className={`mx-auto w-fit rounded-md border ${s.ring} ${s.bg} px-2.5 py-1 text-center backdrop-blur-sm`}
          >
            <div className={`text-shadow-hard text-[15px] font-black leading-none ${s.color}`}>
              {fx.outcome === 'miss' ? '落空' : fx.outcome === 'block' ? '格擋' : `−${fx.damage}`}
            </div>
            <div className="mt-0.5 whitespace-nowrap text-[9.5px] leading-none tracking-wider text-parch-200/90">
              {fx.attackName}
              {fx.outcome === 'block' ? ' 被擋下' : fx.outcome === 'miss' ? ' 揮空了' : ''}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
