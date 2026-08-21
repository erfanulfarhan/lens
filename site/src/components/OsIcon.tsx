/**
 * Drawn marks, not emoji.
 *
 * One consistent 1.6 stroke and a shared 24 box, so the three sit together as a
 * set rather than three borrowed logos at three optical weights.
 */
export type IconName = 'mac' | 'windows' | 'linux' | 'debian' | 'fedora';

export function OsIcon({ os, size = 22 }: { os: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': true as const,
  };

  if (os === 'mac') {
    return (
      <svg {...common}>
        <path
          d="M16.3 12.6c0-2 1.6-3 1.7-3.05-.9-1.35-2.35-1.5-2.85-1.53-1.3-.1-2.4.72-3.02.72-.63 0-1.62-.7-2.66-.68-1.37.02-2.63.8-3.33 2.03-1.42 2.47-.36 6.13 1.02 8.14.68.98 1.49 2.03 2.55 1.99 1.02-.04 1.41-.66 2.65-.66 1.23 0 1.58.66 2.66.64 1.1-.02 1.8-1 2.47-1.98.78-1.13 1.1-2.22 1.12-2.28-.02-.01-2.15-.83-2.17-3.3Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M14.4 6.3c.54-.66.9-1.57.8-2.48-.78.03-1.73.52-2.29 1.18-.5.58-.93 1.51-.81 2.4.87.07 1.76-.44 2.3-1.1Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (os === 'windows') {
    return (
      <svg {...common}>
        <rect x="3.5" y="4" width="7.6" height="7.2" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
        <rect x="12.9" y="4" width="7.6" height="7.2" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
        <rect x="3.5" y="12.8" width="7.6" height="7.2" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
        <rect x="12.9" y="12.8" width="7.6" height="7.2" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }

  if (os === 'debian') {
    // The swirl, read as an open spiral rather than the filled brand logo.
    return (
      <svg {...common}>
        <path
          d="M15.6 8.2a4.6 4.6 0 1 0 .6 6.9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3.4 3" />
      </svg>
    );
  }

  if (os === 'fedora') {
    // The infinity-f: a circle with the stem hooking out of it.
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M9.2 12h4.1m0 0V9.4a2 2 0 0 1 2-2h1.1m-3.1 4.6v5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M12 2.8c-2.1 0-3 1.7-3 3.4 0 1.2.2 2-.3 3-.6 1.2-2.1 2.6-2.1 4.6 0 .8.3 1.3.8 1.6-.3.9.1 1.7 1 2.2 1.3.7 3.3.9 3.6.9s2.3-.2 3.6-.9c.9-.5 1.3-1.3 1-2.2.5-.3.8-.8.8-1.6 0-2-1.5-3.4-2.1-4.6-.5-1-.3-1.8-.3-3 0-1.7-.9-3.4-3-3.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10.4 7.4h.01M13.6 7.4h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
