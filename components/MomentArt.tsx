"use client";

/**
 * Procedural black-and-white artwork for each moment — posterized,
 * woodcut-flavored SVG scenes. In production these frames are generated
 * by Gemini from the user's fragments, or replaced by uploaded photos.
 */
export default function MomentArt({
  id,
  className = "",
  style,
}: {
  id: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      style={style}
      role="img"
      aria-label={`Artwork for ${id}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="400" height="300" fill="#050505" />
      {id === "yard" && (
        <g>
          {/* brick wall */}
          {Array.from({ length: 7 }, (_, r) => (
            <line key={r} x1="0" y1={20 + r * 26} x2="400" y2={20 + r * 26} stroke="#fff" strokeWidth="1.5" opacity="0.3" />
          ))}
          {Array.from({ length: 21 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={((i * 67) % 380) + 10}
              y1={20 + (i % 7) * 26}
              x2={((i * 67) % 380) + 10}
              y2={46 + (i % 7) * 26}
              stroke="#fff"
              strokeWidth="1.5"
              opacity="0.3"
            />
          ))}
          {/* chalk goal */}
          <rect x="120" y="60" width="160" height="140" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="10 6" />
          {/* dustbins */}
          <rect x="38" y="160" width="34" height="46" fill="#fff" />
          <rect x="330" y="160" width="34" height="46" fill="#fff" />
          {/* ground + flat ball */}
          <line x1="0" y1="230" x2="400" y2="230" stroke="#fff" strokeWidth="5" />
          <ellipse cx="200" cy="222" rx="34" ry="24" fill="#fff" />
          <path d="M168 222 q32 14 64 0" stroke="#050505" strokeWidth="3" fill="none" />
          <ellipse cx="200" cy="216" rx="9" ry="6" fill="#050505" />
        </g>
      )}
      {id === "fiveam" && (
        <g>
          {/* floodlight cone */}
          <polygon points="330,0 400,0 400,60 210,260" fill="#fff" opacity="0.14" />
          {/* rain */}
          {Array.from({ length: 26 }, (_, i) => (
            <line
              key={i}
              x1={(i * 31) % 420}
              y1={(i * 53) % 140}
              x2={((i * 31) % 420) - 22}
              y2={((i * 53) % 140) + 60}
              stroke="#fff"
              strokeWidth="2"
              opacity="0.55"
            />
          ))}
          {/* pitch */}
          <line x1="0" y1="252" x2="400" y2="252" stroke="#fff" strokeWidth="4" />
          {/* lone runner */}
          <circle cx="196" cy="176" r="13" fill="#fff" />
          <path d="M196 190 L188 226 L172 250 M196 190 L206 224 L220 248 M196 196 L176 210 M196 196 L218 204" stroke="#fff" strokeWidth="8" strokeLinecap="round" fill="none" />
        </g>
      )}
      {id === "sound" && (
        <g>
          {/* the crack */}
          <polyline points="230,0 186,96 248,122 158,232 196,240 150,300" fill="none" stroke="#fff" strokeWidth="14" strokeLinejoin="miter" />
          {/* debris */}
          {Array.from({ length: 12 }, (_, i) => (
            <circle key={i} cx={(i * 97) % 380 + 10} cy={(i * 71) % 280 + 10} r={2 + (i % 3)} fill="#fff" opacity="0.7" />
          ))}
          {/* 61' */}
          <text x="308" y="272" fill="#fff" fontSize="44" fontFamily="monospace" fontWeight="bold">
            61&apos;
          </text>
        </g>
      )}
      {id === "quiet" && (
        <g>
          {/* hallway to a vanishing point */}
          <line x1="0" y1="0" x2="290" y2="150" stroke="#fff" strokeWidth="3" />
          <line x1="0" y1="300" x2="290" y2="150" stroke="#fff" strokeWidth="3" />
          <line x1="400" y1="40" x2="290" y2="150" stroke="#fff" strokeWidth="2" opacity="0.5" />
          <line x1="400" y1="260" x2="290" y2="150" stroke="#fff" strokeWidth="2" opacity="0.5" />
          {/* doors */}
          {[0, 1, 2, 3].map((i) => {
            const t = i / 4;
            const x = 30 + t * 200;
            const h = 170 - t * 110;
            const y = 150 - h / 2;
            return <rect key={i} x={x} y={y} width={h / 4} height={h} fill="none" stroke="#fff" strokeWidth="2.5" opacity={0.85 - t * 0.4} />;
          })}
          {/* small figure, far away */}
          <circle cx="272" cy="140" r="4.5" fill="#fff" />
          <line x1="272" y1="144" x2="272" y2="160" stroke="#fff" strokeWidth="4" />
        </g>
      )}
      {id === "back" && (
        <g>
          {/* rising light */}
          <circle cx="200" cy="150" r="74" fill="#fff" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={200 + Math.cos(a) * 92}
                y1={150 + Math.sin(a) * 92}
                x2={200 + Math.cos(a) * 120}
                y2={150 + Math.sin(a) * 120}
                stroke="#fff"
                strokeWidth="6"
              />
            );
          })}
          {/* the crowd, standing */}
          {Array.from({ length: 48 }, (_, i) => (
            <circle key={i} cx={12 + (i % 16) * 25} cy={238 + Math.floor(i / 16) * 22 - (i % 3) * 4} r="7" fill="#fff" />
          ))}
        </g>
      )}
      {id === "onemore" && (
        <g>
          {/* dusk sun on the horizon */}
          <circle cx="205" cy="205" r="72" fill="#fff" />
          <rect x="0" y="205" width="400" height="95" fill="#050505" />
          <line x1="0" y1="205" x2="400" y2="205" stroke="#fff" strokeWidth="5" />
          {/* goal */}
          <path d="M40 205 V96 H150 V205" fill="none" stroke="#fff" strokeWidth="6" />
          {/* boots on the line */}
          <path d="M250 196 q10 -14 22 -6 q16 4 20 12 z" fill="#fff" />
          <path d="M290 196 q10 -14 22 -6 q16 4 20 12 z" fill="#fff" />
          {/* long shadows */}
          <line x1="252" y1="207" x2="180" y2="262" stroke="#fff" strokeWidth="3" opacity="0.5" />
          <line x1="294" y1="207" x2="230" y2="268" stroke="#fff" strokeWidth="3" opacity="0.5" />
        </g>
      )}
    </svg>
  );
}
