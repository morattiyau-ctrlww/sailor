/* =========================================================================
   接舷單挑 · components/Ship.jsx
   A 17th-century square-rigger, drawn once and mirrored for the enemy. Two
   masts, patched sails, a bowsprit, gun ports and a flag that moves.
   ========================================================================= */

const PALETTES = {
  royal: { hull: '#5a3a1e', hullDark: '#3d2612', deck: '#8a6234', sail: '#efe3c6', sailShade: '#cdb98f', trim: '#d9a441', flag: '#3f6f9e', pennant: '#d9a441' },
  corsair: { hull: '#4a2419', hullDark: '#2e150e', deck: '#7a4b2c', sail: '#ded0b4', sailShade: '#b39a72', trim: '#8a2f24', flag: '#8a2f24', pennant: '#2c1c14' },
};

export default function Ship({ palette = 'royal', facing = 1, className = '' }) {
  const p = PALETTES[palette] || PALETTES.royal;
  return (
    <svg
      viewBox="0 0 340 230"
      className={className}
      style={{ transform: `scaleX(${facing})` }}
      aria-hidden="true"
    >
      {/* ---- rigging, behind everything ---- */}
      <g stroke={p.hullDark} strokeWidth="1.1" opacity="0.75">
        <line x1="118" y1="52" x2="118" y2="176" />
        <line x1="216" y1="34" x2="216" y2="176" />
        <line x1="60" y1="150" x2="118" y2="52" />
        <line x1="118" y1="52" x2="216" y2="34" />
        <line x1="216" y1="34" x2="292" y2="140" />
        <line x1="118" y1="96" x2="216" y2="86" />
      </g>

      {/* ---- sails ---- */}
      <g>
        <path d="M84 62 h68 q6 34 -2 66 h-64 q-8 -32 -2 -66 z" fill={p.sail} stroke={p.sailShade} strokeWidth="1.4" />
        <path d="M84 62 h68 q4 12 4 22 h-76 q0 -10 4 -22 z" fill="#fff6e2" opacity="0.55" />
        <path d="M92 138 h52 q-6 26 -26 30 q-20 -4 -26 -30 z" fill={p.sailShade} stroke={p.sailShade} strokeWidth="1.2" />
        <path d="M186 44 h60 q6 30 -2 58 h-56 q-8 -28 -2 -58 z" fill={p.sail} stroke={p.sailShade} strokeWidth="1.4" />
        <path d="M186 44 h60 q4 10 4 18 h-68 q0 -8 4 -18 z" fill="#fff6e2" opacity="0.5" />
        {/* patches, so she has been in a fight before */}
        <path d="M104 86 l14 8 l-4 12 l-12 -6 z" fill={p.sailShade} opacity="0.7" />
        <path d="M206 74 l12 6 l-2 10 l-12 -4 z" fill={p.sailShade} opacity="0.55" />
      </g>

      {/* ---- masts and yards ---- */}
      <g fill={p.hullDark}>
        <rect x="115" y="48" width="6" height="128" rx="2" />
        <rect x="213" y="30" width="6" height="146" rx="2" />
        <rect x="78" y="58" width="80" height="4" rx="2" />
        <rect x="180" y="40" width="72" height="4" rx="2" />
        <rect x="88" y="126" width="60" height="3.5" rx="2" />
      </g>

      {/* ---- flag + pennant ---- */}
      <g className="animate-flag" style={{ transformOrigin: '216px 30px' }}>
        <path d={`M216 18 q26 -12 44 2 q-22 6 -44 14 z`} fill={p.flag} stroke={p.hullDark} strokeWidth="0.8" />
      </g>
      <path d="M118 40 l30 5 l-30 5 z" fill={p.pennant} opacity="0.9" />

      {/* ---- hull ---- */}
      <path
        d="M34 176 q-14 -22 -2 -34 h280 q12 18 -4 34 q-14 30 -46 38 h-176 q-38 -8 -52 -38 z"
        fill={p.hull}
        stroke={p.hullDark}
        strokeWidth="2"
      />
      <path d="M32 142 h286 q6 10 2 18 h-292 q-2 -10 4 -18 z" fill={p.deck} />
      <path d="M32 156 h288 q-4 8 -10 12 h-268 q-6 -4 -10 -12 z" fill={p.trim} opacity="0.85" />
      {/* gun ports */}
      <g fill="#1a0f08">
        <circle cx="70" cy="180" r="6" />
        <circle cx="104" cy="184" r="6" />
        <circle cx="230" cy="184" r="6" />
        <circle cx="264" cy="180" r="6" />
      </g>
      {/* bowsprit */}
      <path d="M18 140 l40 -8 l2 6 l-40 10 z" fill={p.hullDark} />
      {/* stern castle */}
      <path d="M266 142 h48 q10 -20 -4 -30 h-44 z" fill={p.hullDark} />
      <path d="M270 116 h40 q4 6 2 10 h-44 z" fill={p.deck} opacity="0.85" />
      {/* waterline */}
      <path d="M44 208 q140 12 276 0 q-14 12 -34 16 h-208 q-22 -4 -34 -16 z" fill="#12405a" opacity="0.55" />
    </svg>
  );
}
