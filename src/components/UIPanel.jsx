/* =========================================================================
   接舷單挑 · components/UIPanel.jsx
   One fighter's corner: portrait, name and ship, the kit he is actually
   carrying (with the numbers it actually contributes), and a health bar with a
   ghost behind it, so you can see what the last blow cost.
   ========================================================================= */
import { motion } from 'framer-motion';
import Pirate from './Pirate.jsx';
import { gearOf } from '../game/rules.js';
import { hpPercent } from '../game/reducer.js';

function GearRow({ icon, item, value }) {
  return (
    <div className="flex items-baseline gap-1.5 text-[11px] leading-tight">
      <span className="emoji-aged w-4 shrink-0 text-center opacity-90">{icon}</span>
      <span className="truncate font-semibold tracking-wide text-parch-100">{item.name}</span>
      {value ? (
        <span className="ml-auto shrink-0 text-[10px] tabular-nums tracking-wider text-brass-light/95">{value}</span>
      ) : null}
    </div>
  );
}

export default function UIPanel({ side, state, charging = false, hit = false }) {
  const me = side === 'player';
  const gear = gearOf(side);
  const pct = hpPercent(state, side);
  const hp = state.hp[side];
  const low = pct <= 30;
  const offBalance = state.offBalance[side];

  return (
    <motion.div
      animate={hit ? { x: [0, me ? -10 : 10, 0], rotate: [0, me ? -0.8 : 0.8, 0] } : {}}
      transition={{ duration: 0.4 }}
      className={`wood pointer-events-auto w-full max-w-[340px] p-2.5 ${charging ? 'animate-pulse-gold' : ''}`}
    >
      <div className="flex gap-2 sm:gap-2.5">
        {/* portrait */}
        <div className="relative h-[52px] w-[42px] shrink-0 overflow-hidden rounded-sm border-2 border-wood-dark bg-sea-900/70 shadow-[inset_0_0_12px_rgba(0,0,0,0.7)] outline outline-1 outline-brass/60 outline-offset-[-3px] sm:h-[68px] sm:w-[54px]">
          <Pirate
            palette={me ? 'royal' : 'corsair'}
            facing={me ? 1 : -1}
            pose={charging ? 'charge' : 'idle'}
            className="absolute inset-x-0 bottom-[-14px] h-[72px] w-full sm:h-[92px]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`truncate text-[13px] font-bold tracking-widest ${me ? 'text-royal' : 'text-corsair'}`}>
              {gear.title}
            </span>
            {offBalance && (
              <span className="shrink-0 rounded-sm border border-amber-500/60 bg-amber-500/25 px-1 text-[9px] font-bold tracking-wider text-amber-200">門戶大開</span>
            )}
          </div>
          <div className="text-[10px] tracking-[0.3em] text-parch-300/80">「{gear.ship}」</div>

          {/* health */}
          <div className="relative mt-1.5 h-[16px] w-full overflow-hidden rounded-sm hp-track">
            <div className="hp-ghost absolute inset-y-0 left-0" style={{ width: `${pct}%` }} />
            <motion.div
              className={`absolute inset-y-0 left-0 hp-fill ${me ? 'hp-fill-good' : ''}`}
              animate={{ width: `${pct}%` }}
              initial={false}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.3, 1] }}
            />
            <div className="hp-ticks pointer-events-none absolute inset-0 opacity-40" />
            <div className="absolute inset-0 flex items-center justify-between px-1.5">
              <span className="text-[9px] font-bold tracking-[0.2em] text-parchment/90">
                {me ? '船長' : '海盜'}
              </span>
              <span className={`text-[10px] font-bold tabular-nums tracking-wider ${low ? 'text-red-200' : 'text-parchment'}`}>
                {hp} / {state.maxHp}
              </span>
            </div>
          </div>

          {/* the kit, and what it is worth */}
          <div className="mt-1.5 space-y-0.5 text-parch-200/95">
            <GearRow icon="⚔" item={gear.weapon} value={gear.weapon.damage ? `+${gear.weapon.damage} 傷` : '±0'} />
            <GearRow icon="🛡" item={gear.armour} value={`−${gear.armour.flat} 傷`} />
            <GearRow icon="🎩" item={gear.helm} value={gear.helm.allOut ? `全力 +${Math.round(gear.helm.allOut * 100)}%` : '±0%'} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
