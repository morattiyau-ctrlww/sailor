/* =========================================================================
   接舷單挑 · components/Pirate.jsx
   The duellist. One SVG, two palettes, and a pose that is pure framer-motion:
   the arm is the argument, the torso is the commitment, the legs keep him on
   the deck. `zone` lights up the part in play, so 上部／中部／下部 are never
   just words on a button.
   ========================================================================= */
import { motion } from 'framer-motion';

const SKINS = {
  royal: {
    coat: '#2b4360', coatDark: '#1b2c42', trim: '#d9a441', sash: '#c9b177',
    hat: '#1d2b3d', hatBand: '#d9a441', face: '#e6bf95', shirt: '#f0e6cf',
    metal: '#d8dde2', blade: '#eef4f8', boot: '#231607', accent: '#7fc4e8',
  },
  corsair: {
    coat: '#5a2118', coatDark: '#3a130d', trim: '#2c1c14', sash: '#2c1c14',
    hat: '#2c1c14', hatBand: '#8a2f24', face: '#d9a877', shirt: '#d8cbb0',
    metal: '#c9a86a', blade: '#e8e0cf', boot: '#1d1209', accent: '#e07a5f',
  },
};

const ZONES = { upper: { y: 34, w: 30 }, mid: { y: 74, w: 34 }, lower: { y: 112, w: 32 } };

const POSE = {
  idle: { arm: 0, torso: 0, root: 0, legSwing: 0 },
  ready: { arm: -22, torso: -4, root: -2, legSwing: 0 },
  windUp: { arm: -78, torso: -10, root: -4, legSwing: -6 },
  strike: { arm: 62, torso: 12, root: 3, legSwing: 14 },
  guard: { arm: -46, torso: -8, root: -3, legSwing: 4 },
  allOut: { arm: -30, torso: -14, root: -6, legSwing: 0 },
  hurt: { arm: 26, torso: -18, root: -8, legSwing: -10 },
  down: { arm: 40, torso: -30, root: -16, legSwing: -20 },
  charge: { arm: -58, torso: -6, root: -3, legSwing: -4 },
};

export default function Pirate({
  palette = 'royal', facing = 1, pose = 'idle', zone = null, zoneTone = 'danger',
  className = '', glow = 0,
}) {
  const c = SKINS[palette] || SKINS.royal;
  const p = POSE[pose] || POSE.idle;
  const ring = zone ? ZONES[zone] : null;
  return (
    <motion.svg
      viewBox="0 0 120 170"
      className={className}
      style={{ transform: `scaleX(${facing})`, transformOrigin: '50% 100%' }}
      aria-hidden="true"
      animate={{ y: p.root, rotate: p.torso * 0.25 }}
      transition={{ type: 'spring', stiffness: 180, damping: 18 }}
    >
      <defs>
        <linearGradient id={`coat-${palette}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.coat} />
          <stop offset="100%" stopColor={c.coatDark} />
        </linearGradient>
      </defs>

      {/* the part that is in play */}
      {ring && (
        <motion.g
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0.55, 1, 0.55], scale: 1 }}
          transition={{ duration: 1.15, repeat: Infinity }}
          style={{ transformOrigin: `60px ${ring.y + 12}px` }}
        >
          <ellipse
            cx="60" cy={ring.y + 12} rx={ring.w} ry="13"
            fill="none"
            stroke={zoneTone === 'guard' ? '#7fd4ff' : '#ff6b4a'}
            strokeWidth="2.4"
            strokeDasharray="7 5"
          />
        </motion.g>
      )}

      {/* legs and boots */}
      <rect x="44" y="118" width="13" height="34" rx="4" fill={c.coatDark} />
      <motion.g animate={{ rotate: p.legSwing }} style={{ transformOrigin: '70px 120px' }}>
        <rect x="63" y="118" width="14" height="34" rx="4" fill={c.coat} />
      </motion.g>
      <path d="M40 152 h20 q4 0 4 5 v5 h-26 q-4 0 -4 -5 z" fill={c.boot} />
      <path d="M62 152 h20 q4 0 4 5 v5 h-26 q-4 0 -4 -5 z" fill={c.boot} />

      {/* coat, sash, buttons */}
      <path d="M42 62 q18 -8 36 0 l6 44 q-24 8 -48 0 z" fill={`url(#coat-${palette})`}
        stroke={c.trim} strokeWidth="1.2" />
      <path d="M48 104 h24 l-3 16 h-18 z" fill={c.shirt} opacity="0.9" />
      <rect x="42" y="96" width="36" height="9" rx="3" fill={c.sash} />
      <circle cx="60" cy="100" r="3.4" fill={c.trim} />
      <g fill={c.trim}>
        <circle cx="52" cy="72" r="1.8" /><circle cx="52" cy="82" r="1.8" />
        <circle cx="68" cy="72" r="1.8" /><circle cx="68" cy="82" r="1.8" />
      </g>

      {/* head, hat, eyepatch */}
      <path d="M50 40 q10 -6 20 0 l2 16 q-12 6 -24 0 z" fill={c.face} />
      <path d="M50 44 q10 -3 20 0 l0 -6 q-10 -4 -20 0 z" fill="#00000022" />
      <path d="M44 38 q16 -14 32 0 q-16 -6 -32 0 z" fill={c.hat} />
      <path d="M42 39 q18 -8 36 0 q-18 6 -36 0 z" fill={c.hat} />
      <rect x="45" y="36" width="30" height="4" rx="2" fill={c.hatBand} />
      {palette === 'corsair' && <path d="M58 42 l12 -2 l1 5 l-12 2 z" fill="#1a1108" />}

      {/* the sword arm: the whole argument of the animation */}
      <motion.g
        animate={{ rotate: p.arm }}
        transition={{ type: 'spring', stiffness: 200, damping: 17 }}
        style={{ transformOrigin: '80px 66px' }}
      >
        <rect x="76" y="64" width="11" height="30" rx="5" fill={c.coat} />
        <circle cx="81" cy="94" r="5" fill={c.face} />
        <rect x="78" y="94" width="6" height="7" rx="2" fill={c.metal} />
        <rect x="74" y="100" width="14" height="3.4" rx="1.6" fill={c.trim} />
        <motion.path d="M81 103 l0 44 l3.4 -4 l0 -40 z" fill={c.blade}
          animate={glow ? { opacity: [0.9, 1, 0.9] } : {}} />
      </motion.g>

      {/* off hand */}
      <motion.g animate={{ rotate: -p.arm * 0.35 }} style={{ transformOrigin: '40px 66px' }}>
        <rect x="33" y="64" width="10" height="28" rx="5" fill={c.coatDark} />
        <circle cx="38" cy="92" r="4.6" fill={c.face} />
      </motion.g>

      {glow > 0 && (
        <motion.circle
          cx="60" cy="86" r="54" fill="none" stroke={c.accent} strokeWidth="1.6"
          animate={{ opacity: [0.1, 0.5, 0.1], scale: [0.94, 1.04, 0.94] }}
          transition={{ duration: 1.1, repeat: Infinity }}
          style={{ transformOrigin: '60px 86px' }}
        />
      )}
    </motion.svg>
  );
}
