/**
 * Original, hand-built illustrations for the Chhath festive slides (no external images).
 * Scene: sun rising over a river with sugarcane and a bamboo soop holding diyas and fruit.
 * Folk border: a simple repeating leaf-and-dot pattern in the spirit of Bihar's Madhubani art.
 */
const RAYS = Array.from({ length: 18 }, (_, i) => i * 20);

export const ChhathScene = ({ className = '', style }) => (
  <svg
    viewBox="0 0 400 340"
    preserveAspectRatio="xMidYMid slice"
    className={className}
    style={style}
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="chh-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7C1D12" />
        <stop offset="0.55" stopColor="#D9561A" />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>
      <linearGradient id="chh-river" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F59E0B" />
        <stop offset="1" stopColor="#B45309" />
      </linearGradient>
      <radialGradient id="chh-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#FEF3C7" stopOpacity="0.95" />
        <stop offset="1" stopColor="#FDE68A" stopOpacity="0" />
      </radialGradient>
    </defs>

    <rect width="400" height="340" fill="url(#chh-sky)" />

    {/* sun + rays */}
    <circle cx="215" cy="190" r="120" fill="url(#chh-glow)" />
    <g transform="translate(215 190)" stroke="#FDE68A" strokeWidth="3" strokeLinecap="round" opacity="0.7">
      {RAYS.map((a) => (
        <line key={a} x1="0" y1="-84" x2="0" y2={a % 40 === 0 ? -118 : -104} transform={`rotate(${a})`} />
      ))}
    </g>
    <circle cx="215" cy="190" r="68" fill="#FDE68A" />
    <circle cx="215" cy="190" r="52" fill="#FEF3C7" />

    {/* river */}
    <rect y="214" width="400" height="126" fill="url(#chh-river)" />
    <g fill="none" stroke="#FEF3C7" strokeLinecap="round" opacity="0.55">
      <path d="M150 228 q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0" strokeWidth="3" />
      <path d="M130 244 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0" strokeWidth="2.5" />
      <path d="M170 260 q10 -5 20 0 t20 0 t20 0 t20 0" strokeWidth="2" />
    </g>
    <path d="M215 216 v100" stroke="#FDE68A" strokeWidth="26" strokeLinecap="round" opacity="0.18" />

    {/* sugarcane, left and right */}
    {[[34, 0.0], [58, 0.5], [356, 0.2], [378, 0.7]].map(([x, o], i) => (
      <g key={i} transform={`translate(${x} ${40 + o * 30})`} stroke="#4A1208" strokeLinecap="round">
        <line x1="0" y1="0" x2="0" y2="290" strokeWidth="7" />
        {[40, 90, 140, 190, 240].map((y) => <line key={y} x1="-5" y1={y} x2="5" y2={y} strokeWidth="2.5" stroke="#7C1D12" />)}
        <path d="M0 6 q-26 -18 -42 -2 M0 6 q22 -22 40 -10" fill="none" strokeWidth="3" stroke="#3F6B34" />
      </g>
    ))}

    {/* bamboo soop (winnowing tray) with diyas and fruit */}
    <g transform="translate(215 282)">
      <ellipse cx="0" cy="22" rx="92" ry="10" fill="#3A1E0F" opacity="0.35" />
      <path d="M-92 0 h184 q-6 34 -92 34 t-92 -34z" fill="#8B5A2B" />
      <path d="M-92 0 h184" stroke="#C99A5B" strokeWidth="4" strokeLinecap="round" />
      <g stroke="#6B3A1E" strokeWidth="1.6" opacity="0.7" fill="none">
        <path d="M-70 8 q70 22 140 0" /><path d="M-52 18 q52 18 104 0" />
        <path d="M-40 4 l16 28 M-12 6 l6 28 M16 6 l-4 28 M44 4 l-14 28" />
      </g>
      {/* fruit */}
      <circle cx="-52" cy="-9" r="14" fill="#F97316" /><circle cx="-26" cy="-13" r="13" fill="#FBBF24" />
      <circle cx="30" cy="-12" r="13" fill="#F97316" /><circle cx="56" cy="-8" r="14" fill="#FBBF24" />
      <path d="M-10 -2 q10 -30 20 0z" fill="#B45309" />
      {/* diyas */}
      {[-74, 0, 74].map((x) => (
        <g key={x} transform={`translate(${x} -14)`}>
          <path d="M-11 0 h22 q-2 11 -11 11 t-11 -11z" fill="#C2410C" />
          <path d="M0 -4 q-7 -9 0 -20 q7 11 0 20z" fill="#FDE047" />
          <path d="M0 -6 q-3 -6 0 -12 q3 6 0 12z" fill="#F97316" />
        </g>
      ))}
    </g>
  </svg>
);

/** Thin repeating folk border; place with `absolute bottom-0 left-0 right-0`. */
export const FolkBorder = ({ className = '', color = '#FDE68A' }) => (
  <svg className={className} width="100%" height="14" aria-hidden="true" focusable="false">
    <defs>
      <pattern id="folk-pat" width="28" height="14" patternUnits="userSpaceOnUse">
        <path d="M2 7 q6 -8 12 0 q-6 8 -12 0z" fill={color} />
        <path d="M14 7 l5 -4 v8z" fill={color} opacity="0.8" />
        <circle cx="24" cy="7" r="2" fill={color} />
      </pattern>
    </defs>
    <rect width="100%" height="14" fill="url(#folk-pat)" />
  </svg>
);
