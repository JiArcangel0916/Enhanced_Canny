/* =====================================================
   Microorganism SVG Background Component
   Static microscopic organisms blended into the theme
   ===================================================== */
export default function MicroBg({ className = '' }) {
  return (
    <svg
      className={`micro-bg ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        {/* Teal glow gradient */}
        <radialGradient id="gT" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#0d9488" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0"/>
        </radialGradient>
        {/* Amber glow */}
        <radialGradient id="gA" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#f59e0b" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
        </radialGradient>
        {/* Sky glow */}
        <radialGradient id="gS" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0"/>
        </radialGradient>
        {/* Stroke styles */}
        <style>{`
          .mo { fill: none; stroke-linecap: round; stroke-linejoin: round; }
          .mo-t  { stroke: #0d9488; }
          .mo-t2 { stroke: #14b8a6; }
          .mo-a  { stroke: #f59e0b; }
          .mo-s  { stroke: #38bdf8; }
          .mo-v  { stroke: #818cf8; }
          .mo-g  { stroke: #34d399; }

          @keyframes floatA {
            0%,100% { transform: translateY(0px) rotate(0deg); }
            50%      { transform: translateY(-12px) rotate(4deg); }
          }
          @keyframes floatB {
            0%,100% { transform: translateY(0px) rotate(0deg); }
            50%      { transform: translateY(8px) rotate(-3deg); }
          }
          @keyframes floatC {
            0%,100% { transform: translateY(0px) rotate(0deg); }
            50%      { transform: translateY(-6px) rotate(6deg); }
          }
          @keyframes floatD {
            0%,100% { transform: rotate(0deg); }
            100%     { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%,100% { opacity: var(--op); }
            50%      { opacity: calc(var(--op) * 0.5); }
          }
          .fa { animation: floatA 9s ease-in-out infinite; }
          .fb { animation: floatB 13s ease-in-out infinite; }
          .fc { animation: floatC 11s ease-in-out infinite; }
          .fd { animation: floatD 30s linear infinite; }
          .fe { animation: floatA 15s ease-in-out infinite reverse; }
          .ff { animation: floatB 8s ease-in-out infinite; }
        `}</style>
      </defs>

      {/* ── BG GLOW BLOBS ─────────────────────── */}
      <ellipse cx="200"  cy="180" rx="260" ry="200" fill="url(#gT)" opacity="0.6"/>
      <ellipse cx="1280" cy="750" rx="300" ry="220" fill="url(#gA)" opacity="0.5"/>
      <ellipse cx="900"  cy="120" rx="200" ry="150" fill="url(#gS)" opacity="0.4"/>
      <ellipse cx="400"  cy="750" rx="180" ry="140" fill="url(#gT)" opacity="0.3"/>

      {/* ─── ORGANISM 1: Diatom (top-left) — radial symmetry ─── */}
      <g transform="translate(130, 140)" className="fa" style={{'--op':1}}>
        <circle cx="0" cy="0" r="52" className="mo mo-t" strokeWidth="1.2" opacity="0.35"/>
        <circle cx="0" cy="0" r="36" className="mo mo-t" strokeWidth="0.8" opacity="0.25"/>
        <circle cx="0" cy="0" r="18" className="mo mo-t2" strokeWidth="0.6" opacity="0.3"/>
        {[0,45,90,135,180,225,270,315].map((a,i) => (
          <line key={i}
            x1={Math.cos(a*Math.PI/180)*20} y1={Math.sin(a*Math.PI/180)*20}
            x2={Math.cos(a*Math.PI/180)*50} y2={Math.sin(a*Math.PI/180)*50}
            className="mo mo-t" strokeWidth="0.8" opacity="0.28"
          />
        ))}
        {[22.5,67.5,112.5,157.5,202.5,247.5,292.5,337.5].map((a,i) => (
          <line key={i}
            x1={Math.cos(a*Math.PI/180)*30} y1={Math.sin(a*Math.PI/180)*30}
            x2={Math.cos(a*Math.PI/180)*52} y2={Math.sin(a*Math.PI/180)*52}
            className="mo mo-t2" strokeWidth="0.5" opacity="0.2"
          />
        ))}
        <circle cx="0" cy="0" r="4" className="mo mo-t2" strokeWidth="1" opacity="0.4"/>
      </g>

      {/* ─── ORGANISM 2: Paramecium (top-right) ─── */}
      <g transform="translate(1340, 90)" className="fb">
        <ellipse cx="0" cy="0" rx="30" ry="60" className="mo mo-s" strokeWidth="1" opacity="0.3" transform="rotate(-20)"/>
        <ellipse cx="0" cy="0" rx="20" ry="44" className="mo mo-s" strokeWidth="0.6" opacity="0.2" transform="rotate(-20)"/>
        {[-4,-2,0,2,4].map((dx,i) => (
          <g key={i} transform={`rotate(-20)`}>
            <line x1={dx*6} y1="-60" x2={dx*6-2} y2="-78" className="mo mo-s" strokeWidth="0.6" opacity="0.25"/>
            <line x1={dx*6} y1="60"  x2={dx*6+2}  y2="78"  className="mo mo-s" strokeWidth="0.6" opacity="0.25"/>
          </g>
        ))}
        <circle cx="-5" cy="-18" r="8" className="mo mo-s" strokeWidth="0.6" opacity="0.25" transform="rotate(-20)"/>
      </g>

      {/* ─── ORGANISM 3: Amoeba (left-mid) ─── */}
      <g transform="translate(60, 480)" className="fc">
        <path d="M0,-70 C30,-60 55,-30 60,10 C65,50 40,75 0,80 C-40,85 -68,55 -65,10 C-62,-35 -30,-80 0,-70 Z"
          className="mo mo-g" strokeWidth="1" opacity="0.22"/>
        <path d="M0,-48 C20,-40 36,-20 38,10 C40,38 24,50 0,52 C-24,54 -40,36 -38,10 C-36,-22 -20,-56 0,-48 Z"
          className="mo mo-g" strokeWidth="0.7" opacity="0.16"/>
        {/* pseudopods */}
        <path d="M0,-70 C-5,-90 10,-105 5,-88" className="mo mo-g" strokeWidth="0.8" opacity="0.2"/>
        <path d="M60,10 C80,5 90,22 72,18" className="mo mo-g" strokeWidth="0.8" opacity="0.2"/>
        <path d="M-65,10 C-85,20 -90,0 -72,5" className="mo mo-g" strokeWidth="0.8" opacity="0.2"/>
        <circle cx="8" cy="-10" r="10" className="mo mo-g" strokeWidth="0.7" opacity="0.18"/>
      </g>

      {/* ─── ORGANISM 4: Rod bacteria (top-center) ─── */}
      <g transform="translate(680, 55)" className="fe">
        <rect x="-12" y="-30" width="24" height="60" rx="12"
          className="mo mo-a" strokeWidth="1" opacity="0.22"/>
        <rect x="-8"  y="-20" width="16" height="40" rx="8"
          className="mo mo-a" strokeWidth="0.6" opacity="0.14"/>
        {/* flagella */}
        <path d="M0,30 C8,45 -5,55 2,68 C9,80 -4,90 3,102" className="mo mo-a" strokeWidth="0.7" opacity="0.2"/>
      </g>

      {/* ─── ORGANISM 5: Diatom chain (bottom-right) ─── */}
      <g transform="translate(1300, 640)" className="fb">
        {[0,70,140].map((dx,i) => (
          <g key={i} transform={`translate(${dx},0)`}>
            <rect x="-22" y="-22" width="44" height="44" rx="4"
              className="mo mo-v" strokeWidth="0.9" opacity="0.22"/>
            <rect x="-14" y="-14" width="28" height="28" rx="3"
              className="mo mo-v" strokeWidth="0.6" opacity="0.15"/>
            {[[-22,0],[22,0],[0,-22],[0,22]].map(([cx2,cy2],j) => (
              <circle key={j} cx={cx2} cy={cy2} r="3"
                className="mo mo-v" strokeWidth="0.5" opacity="0.2"/>
            ))}
          </g>
        ))}
        <line x1="22" y1="0" x2="48" y2="0" className="mo mo-v" strokeWidth="0.6" opacity="0.18"/>
        <line x1="92" y1="0" x2="118" y2="0" className="mo mo-v" strokeWidth="0.6" opacity="0.18"/>
      </g>

      {/* ─── ORGANISM 6: Spiral helix bacteria (bottom-left) ─── */}
      <g transform="translate(200, 760)" className="fa">
        <path d="M-60,0 C-50,-25 -30,-35 -10,-20 C10,-5 30,-15 50,0 C70,15 50,35 30,25 C10,15 -10,25 -30,15 C-50,5 -70,20 -60,0Z"
          className="mo mo-t2" strokeWidth="0.9" opacity="0.25"/>
        <circle cx="-60" cy="0" r="5" className="mo mo-t2" strokeWidth="0.8" opacity="0.3"/>
        <path d="M50,0 C55,-5 60,-2 58,4" className="mo mo-t2" strokeWidth="0.8" opacity="0.25"/>
      </g>

      {/* ─── ORGANISM 7: Large elegant diatom (right-mid) ─── */}
      <g transform="translate(1400, 400)" className="fc">
        <circle cx="0" cy="0" r="80" className="mo mo-t" strokeWidth="0.8" opacity="0.14"/>
        <circle cx="0" cy="0" r="60" className="mo mo-t" strokeWidth="0.7" opacity="0.12"/>
        <circle cx="0" cy="0" r="40" className="mo mo-t2" strokeWidth="0.6" opacity="0.14"/>
        <circle cx="0" cy="0" r="20" className="mo mo-t2" strokeWidth="0.5" opacity="0.16"/>
        {[0,30,60,90,120,150,180,210,240,270,300,330].map((a,i) => (
          <line key={i}
            x1={Math.cos(a*Math.PI/180)*22} y1={Math.sin(a*Math.PI/180)*22}
            x2={Math.cos(a*Math.PI/180)*78} y2={Math.sin(a*Math.PI/180)*78}
            className="mo mo-t" strokeWidth="0.5" opacity="0.14"
          />
        ))}
      </g>

      {/* ─── ORGANISM 8: Cluster of cocci (center-left) ─── */}
      <g transform="translate(350, 350)" className="ff">
        {[[0,0,14],[18,10,10],[32,0,12],[10,24,11],[26,20,9],[-10,18,10]].map(([cx2,cy2,r2],i) => (
          <circle key={i} cx={cx2} cy={cy2} r={r2}
            className="mo mo-s" strokeWidth="0.7" opacity="0.18"/>
        ))}
      </g>

      {/* ─── ORGANISM 9: Flagellated cell (top-right-mid) ─── */}
      <g transform="translate(1050, 200)" className="fa">
        <ellipse cx="0" cy="0" rx="22" ry="30" className="mo mo-a" strokeWidth="0.9" opacity="0.22"/>
        <path d="M0,-30 C5,-50 -8,-70 4,-88 C16,-106 5,-120 10,-140"
          className="mo mo-a" strokeWidth="0.7" opacity="0.2"/>
        <path d="M0,-30 C-6,-50 8,-65 -3,-80 C-14,-95 -6,-108 -10,-125"
          className="mo mo-a" strokeWidth="0.6" opacity="0.15"/>
        <circle cx="0" cy="0" r="8" className="mo mo-a" strokeWidth="0.6" opacity="0.2"/>
      </g>

      {/* ─── ORGANISM 10: Euglena (bottom-center) ─── */}
      <g transform="translate(700, 830)" className="fb">
        <path d="M0,-50 C28,-40 36,-10 30,20 C24,50 8,60 0,58 C-8,60 -24,50 -30,20 C-36,-10 -28,-40 0,-50 Z"
          className="mo mo-g" strokeWidth="0.9" opacity="0.2"/>
        <path d="M0,58 C4,80 -2,100 6,120 C14,140 5,155 10,170"
          className="mo mo-g" strokeWidth="0.7" opacity="0.18"/>
        <circle cx="0" cy="0" r="10" className="mo mo-g" strokeWidth="0.6" opacity="0.2"/>
        <circle cx="-5" cy="-25" r="5" className="mo mo-t2" strokeWidth="0.6" opacity="0.25"/>
      </g>

      {/* ─── ORGANISM 11: Small scattered cocci (scattered) ─── */}
      {[[480,300,8],[560,420,6],[820,500,9],[920,650,7],[1100,500,8],[1200,300,6],[300,600,7],[150,320,9]].map(([cx2,cy2,r2],i) => (
        <circle key={i} cx={cx2} cy={cy2} r={r2}
          className={`mo ${['mo-t','mo-s','mo-g','mo-a','mo-v','mo-t2'][i%6]}`}
          strokeWidth="0.6" opacity={0.12 + (i%3)*0.04}/>
      ))}

      {/* ─── ORGANISM 12: Volvox colony (mid-center) ─── */}
      <g transform="translate(760, 460)" className="fe">
        <circle cx="0" cy="0" r="55" className="mo mo-v" strokeWidth="0.7" opacity="0.12"/>
        {[0,40,80,120,160,200,240,280,320].map((a,i) => (
          <circle key={i}
            cx={Math.cos(a*Math.PI/180)*42} cy={Math.sin(a*Math.PI/180)*42} r="7"
            className="mo mo-v" strokeWidth="0.6" opacity="0.15"/>
        ))}
        <circle cx="0" cy="0" r="8" className="mo mo-v" strokeWidth="0.5" opacity="0.18"/>
      </g>
    </svg>
  );
}
