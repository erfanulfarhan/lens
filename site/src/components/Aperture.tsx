interface Props {
  size?: number;
  /** Animate the opening. False renders the open state statically. */
  animate?: boolean;
  /** Unique per instance: SVG ids are document-global. */
  id?: string;
}

const BLADES = 6;
const R = 74;

/** Hexagonal opening, flat-topped, inscribed at radius `r`. */
function hexPoints(r: number): string {
  return Array.from({ length: BLADES }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${(100 + r * Math.cos(a)).toFixed(2)},${(100 + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

/**
 * The mark, performing its own meaning.
 *
 * Lens is drawn as an aperture rather than an eye: an eye watches you, an
 * aperture is something you open to let light in. So the page's one authored
 * moment is the iris opening and sage light spilling through from behind — the
 * brand's own claim, that the light arrives from your side of the machine.
 *
 * Built as a ring with a growing polygonal hole, not as blades sliding apart.
 * The first attempt animated six pie-slice blades outward from the centre, which
 * is not how an iris works: retracting wedges just overlap into a disc with a
 * gap in it. Masking the hole out of the metal is both simpler and the shape the
 * eye actually recognises.
 */
export function Aperture({ size = 132, animate = true, id = 'ap' }: Props) {
  const brass = `${id}-brass`;
  const light = `${id}-light`;
  const mask = `${id}-mask`;

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <linearGradient id={brass} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="var(--amber-lit-fixed)" />
          <stop offset="0.45" stopColor="var(--amber-fixed)" />
          <stop offset="1" stopColor="#6d5029" />
        </linearGradient>
        <radialGradient id={light} cx="0.4" cy="0.36" r="0.78">
          <stop offset="0" stopColor="#dcefe2" />
          <stop offset="0.32" stopColor="var(--jade-fixed)" />
          <stop offset="1" stopColor="#1d3326" />
        </radialGradient>

        {/* White shows the metal, black cuts the opening. The hole grows, so the
            metal appears to retract without any blade having to move. */}
        <mask id={mask}>
          <circle cx="100" cy="100" r={R} fill="#fff" />
          <polygon
            points={hexPoints(R)}
            fill="#000"
            className={animate ? 'iris-open' : undefined}
            style={{
              transformOrigin: '100px 100px',
              transform: animate ? undefined : 'rotate(0deg) scale(0.5)',
            }}
          />
        </mask>
      </defs>

      {/* Light from your own machine, revealed as the hole grows. */}
      <circle cx="100" cy="100" r={R} fill={`url(#${light})`} />

      {/* The metal. */}
      <circle cx="100" cy="100" r={R} fill={`url(#${brass})`} mask={`url(#${mask})`} />

      {/* Blade seams: six hairlines that make it read as a mechanism rather than
          a washer. They rotate with the opening. */}
      <g
        className={animate ? 'iris-seams' : undefined}
        style={{ transformOrigin: '100px 100px' }}
        mask={`url(#${mask})`}
      >
        {Array.from({ length: BLADES }, (_, i) => {
          const a = (Math.PI / 180) * (60 * i - 30);
          return (
            <line
              key={i}
              x1={100}
              y1={100}
              x2={100 + R * Math.cos(a)}
              y2={100 + R * Math.sin(a)}
              stroke="#0f1116"
              strokeWidth="1.1"
              opacity="0.55"
            />
          );
        })}
      </g>

      {/* Barrel. */}
      <circle cx="100" cy="100" r={R} fill="none" stroke="var(--line)" strokeWidth="8" />
      <circle cx="100" cy="100" r={R + 4.5} fill="none" stroke={`url(#${brass})`} strokeWidth="1.6" />
      <circle cx="100" cy="100" r={R + 13} fill="none" stroke="var(--line)" strokeWidth="1" />
    </svg>
  );
}
