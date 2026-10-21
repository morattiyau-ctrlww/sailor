/* =========================================================================
   接舷單挑 · components/BattleLog.jsx
   The ship's log: a parchment roll that keeps every swing, block and feint,
   auto-scrolled to the newest line and colour-coded by kind — plus the running
   tally at the foot, so the numbers behind the fight are visible.
   ========================================================================= */
import { useEffect, useRef } from 'react';

const TONE = {
  system: { dot: 'bg-parch-400', text: 'text-amber-900/95', weight: 'font-semibold' },
  turn: { dot: 'bg-amber-600', text: 'text-amber-900', weight: 'font-semibold' },
  attack: { dot: 'bg-blood', text: 'text-[#7c2a1c]', weight: '' },
  defend: { dot: 'bg-sea-600', text: 'text-[#1b4a63]', weight: '' },
  feint: { dot: 'bg-purple-700', text: 'text-purple-900', weight: 'italic' },
  victory: { dot: 'bg-amber-500', text: 'text-amber-900', weight: 'font-bold' },
  defeat: { dot: 'bg-stone-700', text: 'text-stone-800', weight: 'font-bold' },
};

export default function BattleLog({ log, tally, settled, className = '' }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [log.length]);

  return (
    <section className={`parchment flex min-h-0 flex-col rounded-sm ${className}`}>
      <header className="flex items-center justify-between border-b-2 border-double border-brass/70 px-3 py-1.5">
        <h2 className="text-[12px] font-bold tracking-[0.3em] text-wood-dark">航海日誌</h2>
        <span className="text-[10px] tabular-nums tracking-wider text-amber-800/80">交鋒 {settled} 次</span>
      </header>

      <ol className="log-scroll min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2 text-[11.5px] leading-snug">
        {log.map((e) => {
          const tone = TONE[e.kind] || TONE.system;
          return (
            <li key={e.id} className="animate-rise flex gap-2">
              <span className={`mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
              <span className={`${tone.text} ${tone.weight}`}>
                {e.kind === 'turn' ? <b className="mr-1 opacity-70">◆</b> : null}
                {e.text}
              </span>
            </li>
          );
        })}
        <li ref={endRef} />
      </ol>

      <footer className="grid grid-cols-5 border-t-2 border-double border-brass/70 px-2 py-1.5 text-center text-[10px] text-amber-900/90">
        {[
          ['命中', tally.hits], ['格擋', tally.blocks], ['落空', tally.misses],
          ['你造成', tally.dealt], ['你承受', tally.taken],
        ].map(([label, value]) => (
          <div key={label}>
            <div className="font-bold tabular-nums tracking-wider">{value}</div>
            <div className="text-[9px] tracking-widest opacity-70">{label}</div>
          </div>
        ))}
      </footer>
    </section>
  );
}
