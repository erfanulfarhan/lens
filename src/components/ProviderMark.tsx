/**
 * A mark per provider, so the list is scannable before it is read.
 *
 * All drawn here as inline SVG rather than pulled from a CDN or bundled as
 * image files: the renderer runs under a strict content policy with no network
 * access for assets, and a mark that inherits currentColor can go brass when a
 * provider is in use without shipping a second copy of every file.
 *
 * They share one 24 box, one stroke weight and one optical size so the column
 * reads as a set rather than five logos borrowed at five different weights.
 * These are simplified marks for identification, not brand assets.
 */
export function ProviderMark({ id, size = 15 }: { id: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (id) {
    // Your own machine: a processor, because that is literally where it runs.
    case 'ollama':
      return (
        <svg {...common}>
          <rect x="7.5" y="7.5" width="9" height="9" rx="1.6" />
          <path d="M10.5 4.5v3M13.5 4.5v3M10.5 16.5v3M13.5 16.5v3M4.5 10.5h3M4.5 13.5h3M16.5 10.5h3M16.5 13.5h3" />
        </svg>
      );

    // Claude: the radial burst, rays of unequal length.
    case 'anthropic':
      return (
        <svg {...common} strokeWidth={1.7}>
          <path d="M12 3.2v6M12 14.8v6M3.2 12h6M14.8 12h6M6.2 6.2l3.4 3.4M14.4 14.4l3.4 3.4M17.8 6.2l-3.4 3.4M9.6 14.4l-3.4 3.4" />
        </svg>
      );

    // Gemini: the four pointed spark, filled rather than outlined.
    case 'gemini':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M12 2.6l1.9 6.1a3.4 3.4 0 0 0 2.2 2.2l6.1 1.9-6.1 1.9a3.4 3.4 0 0 0-2.2 2.2L12 22.4l-1.9-6.1a3.4 3.4 0 0 0-2.2-2.2L1.8 12l6.1-1.9a3.4 3.4 0 0 0 2.2-2.2z" />
        </svg>
      );

    // OpenAI: the six fold geometry with the hollow centre. Three crossed
    // lenses were closer to the real knot but collapsed into an atom at 15px,
    // which is the only size that matters here.
    case 'openai':
      return (
        <svg {...common}>
          <path d="M12 3.1l7.7 4.45v8.9L12 20.9l-7.7-4.45v-8.9z" />
          <circle cx="12" cy="12" r="2.7" />
        </svg>
      );

    // Groq: a bolt for the speed they sell, not their wordmark.
    case 'groq':
      return (
        <svg {...common} strokeWidth={1.7}>
          <path d="M13.5 2.8L5.4 13.4h5.3l-.7 7.8 8.2-10.6h-5.4z" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" />
        </svg>
      );
  }
}
