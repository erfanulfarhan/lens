/**
 * The Lens mark: a six-bladed aperture. An aperture is a thing you own and
 * adjust, which is the whole premise here — deliberately not an eye, since a
 * tool that reads your screen should not present itself as one watching you.
 *
 * When `active`, the blades rotate and the opening dilates. An iris opening is
 * what an aperture actually does, so the animation is the mark behaving rather
 * than decoration bolted on.
 */
export function Logo({ size = 18, active = false }: { size?: number; active?: boolean }) {
  const seams = Array.from({ length: 6 }, (_, i) => -90 + 60 * i)
  const r = 118 // opening radius in the 512 viewBox
  const hex = seams
    .map((deg) => {
      const a = (deg * Math.PI) / 180
      return `${(256 + r * Math.cos(a)).toFixed(1)} ${(256 + r * Math.sin(a)).toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role="img"
      aria-label="Lens"
      className={active ? 'lens-mark-active' : undefined}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="lensBrass" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#EBC689" />
          <stop offset="0.42" stopColor="#C8964F" />
          <stop offset="1" stopColor="#7E5E30" />
        </linearGradient>
        <radialGradient id="lensCore" cx="0.42" cy="0.38" r="0.8">
          <stop offset="0" stopColor="#9FC4AB" />
          <stop offset="0.6" stopColor="#5F8A6D" />
          <stop offset="1" stopColor="#24382C" />
        </radialGradient>
      </defs>

      {/* The opening dilates; grouped so the transform scales about the centre. */}
      <g className="lens-iris" style={{ transformOrigin: '256px 256px' }}>
        <polygon points={hex} fill="url(#lensCore)" />
        <polygon points={hex} fill="none" stroke="#F0D5A4" strokeWidth="10" strokeOpacity="0.35" />
      </g>

      {/* Blades rotate as one plate assembly. */}
      <g className="lens-blades" style={{ transformOrigin: '256px 256px' }}>
        <circle cx="256" cy="256" r="170" fill="none" stroke="url(#lensBrass)" strokeWidth="64" />
        <g stroke="#14161C" strokeWidth="14" strokeLinecap="round" strokeOpacity="0.9">
          {seams.map((deg) => {
            const a = (deg * Math.PI) / 180
            return (
              <line
                key={deg}
                x1={(256 + 114 * Math.cos(a)).toFixed(1)}
                y1={(256 + 114 * Math.sin(a)).toFixed(1)}
                x2={(256 + 210 * Math.cos(a)).toFixed(1)}
                y2={(256 + 210 * Math.sin(a)).toFixed(1)}
              />
            )
          })}
        </g>
      </g>
    </svg>
  )
}
