/* =========================================================================
   接舷單挑 · components/ActionBar.jsx
   The rule the brief cares about most, made structural: in 你的回合 only attack
   plates exist, in 敵人的回合 only defence plates exist, and while a blow is
   being resolved nothing is clickable at all. The three phases render three
   different sets — not one set with things greyed out.
   ========================================================================= */
import { motion, AnimatePresence } from 'framer-motion';
import { attackList, defenceList, PHASE } from '../game/reducer.js';
import { PART_LABEL, RULES } from '../game/constants.js';

const PART_ICON = { upper: '⬆', mid: '◆', lower: '⬇' };

function Plate({ kind, title, part, tag, note, onClick, disabled }) {
  const attack = kind === 'attack';
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-kind={kind}
      data-move={title}
      whileTap={disabled ? {} : { scale: 0.97 }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={`plank ${attack ? 'plank-attack' : 'plank-defence'} w-full px-3 py-2`}
      aria-label={title}
    >
      <div className="flex items-center gap-2">
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] ${attack ? 'bg-gold/25 text-gold-bright' : 'bg-sky-300/20 text-sky-100'}`}>
          {PART_ICON[part] || '✹'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold leading-tight">{title}</span>
          <span className="block truncate text-[10.5px] leading-tight opacity-80">
            {part ? `${PART_LABEL[part]} · ` : ''}{tag}
          </span>
        </span>
      </div>
      {note ? <div className="mt-1 truncate text-[10px] italic opacity-65">{note}</div> : null}
    </motion.button>
  );
}

export default function ActionBar({ state, onAttack, onDefence, onHoverPart }) {
  const locked = state.phase === PHASE.RESOLVING;
  const attackPhase = state.phase === PHASE.PLAYER_ATTACK;
  const defendPhase = state.phase === PHASE.ENEMY_ATTACK;

  const header = attackPhase
    ? { title: '你的回合', sub: '選擇攻擊部位', tone: 'text-gold-bright' }
    : defendPhase
      ? { title: '敵人正在蓄勢待發！', sub: '選擇防守部位', tone: 'text-blood-bright animate-pulse' }
      : { title: '刀鋒交錯', sub: '結算中，按鍵已鎖定', tone: 'text-parch-300' };

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className={`wood flex items-center justify-between px-3 py-1.5 ${locked ? '' : 'animate-pulse-gold'}`}>
        <div>
          <div className={`text-[14px] font-bold leading-tight ${header.tone}`}>{header.title}</div>
          <div className="text-[10px] tracking-[0.16em] text-parch-200/85">{header.sub}</div>
        </div>
        <div className="brass-plate rounded px-2 py-1 text-[11px] font-bold tabular-nums">
          第 {state.turn} 回合
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {attackPhase && attackList().map((a) => (
            <motion.div key={a.id} layout onMouseEnter={() => onHoverPart?.(a.part)} onMouseLeave={() => onHoverPart?.(null)}>
              <Plate
                kind="attack"
                title={a.name}
                part={a.part}
                tag={`${a.damage ? `${a.damage} 傷` : '無傷'} · 命中 ${Math.round(a.accuracy * 100)}%`}
                note={a.note}
                disabled={locked}
                onClick={() => onAttack(a.id)}
              />
            </motion.div>
          ))}

          {defendPhase && defenceList().map((d) => (
            <motion.div key={d.id} layout onMouseEnter={() => onHoverPart?.(d.part)} onMouseLeave={() => onHoverPart?.(null)}>
              <Plate
                kind="defence"
                title={d.name}
                part={d.part}
                tag={d.allOut ? `擋中 ${Math.round(RULES.allOutBlock * 100)}% · 全部位` : '擋中＝減傷 80%'}
                note={d.allOut ? '擋不住就是全額挨刀' : (d.part ? PART_LABEL[d.part] : '全部位')}
                disabled={locked}
                onClick={() => onDefence(d.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {locked && (
          <motion.div
            key="locked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-2 grid place-items-center rounded border border-gold/40 bg-wood-950/70 px-3 py-4 text-center sm:col-span-4"
          >
            <div className="text-[13px] font-bold text-gold-bright">⚔ 刀光劍影，按鍵已鎖定 ⚔</div>
            <div className="mt-0.5 text-[10.5px] text-parch-300/80">
              {state.pending?.actor === 'player' ? '你的攻勢正在落下' : '敵人的刀正朝你招呼過來'}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
