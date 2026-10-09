/* =========================================================================
   接舷單挑 · components/StartScreen.jsx
   The title card, and the one place a real click is *required*: browsers refuse
   to start an audio context without a gesture, so pressing 登船開戰 both starts
   the fight and unlocks the sound. The rules are on the card because a duel
   with two alternating phases deserves to explain itself.
   ========================================================================= */
import { motion } from 'framer-motion';
import Ship from './Ship.jsx';
import { ATTACKS, DEFENCES, RULES } from '../game/constants.js';

const RULE_LINES = [
  ['階段一', '你進攻 · 敵人防守', '選好攻擊部位，紅鬍子同時決定要守哪裡。'],
  ['階段二', '敵人進攻 · 你防守', '他會先蓄勢待發，你得猜他要砍哪個部位。'],
  ['判定', '部位相同＝格擋', `擋中減傷 ${Math.round(RULES.blockReduction * 100)}%；沒擋中就是實打實的一刀。`],
];

export default function StartScreen({ onBegin, busy = false }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-wood-950/88 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 22, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 150, damping: 18 }}
        className="wood w-full max-w-[720px] p-5 sm:p-7"
      >
        <div className="relative flex items-end justify-center gap-2">
          <Ship palette="royal" facing={1} className="h-16 w-32 opacity-95 sm:h-20 sm:w-40" />
          <div className="text-center">
            <div className="text-[10px] tracking-[0.5em] text-gold">A · D · 1 6 0 2</div>
            <h1 className="text-shadow-hard text-[38px] font-black leading-none tracking-[0.14em] text-parchment sm:text-[52px]">
              接舷單挑
            </h1>
            <div className="mt-1 text-[11px] tracking-[0.34em] text-parch-300">CLOSE QUARTERS</div>
          </div>
          <Ship palette="corsair" facing={-1} className="h-16 w-32 opacity-95 sm:h-20 sm:w-40" />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {RULE_LINES.map(([tag, head, body]) => (
            <div key={tag} className="rounded-md border border-brass/60 bg-wood-950/55 p-2.5">
              <div className="text-[10px] tracking-[0.25em] text-gold">{tag}</div>
              <div className="text-[13px] font-bold text-parchment">{head}</div>
              <div className="mt-1 text-[11px] leading-snug text-parch-300/95">{body}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="parchment rounded-lg p-3">
            <div className="text-[11px] font-bold tracking-[0.2em] text-amber-900">四種攻擊</div>
            <ul className="mt-1 space-y-0.5 text-[11px] text-[#5a431f]">
              {Object.values(ATTACKS).map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span className="font-semibold">{a.name}</span>
                  <span className="tabular-nums opacity-80">
                    {a.damage ? `${a.damage} 傷` : '無傷'} · {Math.round(a.accuracy * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="parchment rounded-lg p-3">
            <div className="text-[11px] font-bold tracking-[0.2em] text-amber-900">四種防守</div>
            <ul className="mt-1 space-y-0.5 text-[11px] text-[#5a431f]">
              {Object.values(DEFENCES).map((d) => (
                <li key={d.id} className="flex justify-between gap-2">
                  <span className="font-semibold">{d.name}</span>
                  <span className="tabular-nums opacity-80">
                    {d.allOut ? `${Math.round(RULES.allOutBlock * 100)}% 全擋` : '擋中必格擋'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={onBegin}
          disabled={busy}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="brass-plate mt-5 w-full rounded-lg px-4 py-3 text-[17px] font-black tracking-[0.3em] shadow-lg"
        >
          {busy ? '正在揚帆…' : '⚔ 登船開戰'}
        </motion.button>
        <p className="mt-2 text-center text-[10px] leading-relaxed text-parch-300/80">
          點下這一顆鈕才會開口：瀏覽器不允許在沒有互動的情況下播放聲音。<br />
          音效來自 Tone.js 即時合成與 CDN 取樣；取樣失敗時自動退回合成，一定有聲音。
        </p>
      </motion.div>
    </motion.div>
  );
}
