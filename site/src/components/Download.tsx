import { useEffect, useState } from 'react';
import { OsIcon } from './OsIcon';
import { fetchBuilds, FALLBACK, type Build } from '../lib/releases';

/**
 * Direct downloads, one per platform.
 *
 * Sending everyone to the releases page made them read nine filenames and guess
 * which was theirs. The visitor's own platform leads; the others stay visible
 * because people download for a machine they are not sitting at.
 */
function detectOs(): Build['os'] | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/Macintosh|Mac OS X/i.test(ua)) return 'mac';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Linux|X11/i.test(ua)) return 'linux';
  return null;
}

export function Download({ compact = false }: { compact?: boolean }) {
  const [builds, setBuilds] = useState<Build[] | null>(null);
  const mine = detectOs();

  useEffect(() => {
    let alive = true;
    fetchBuilds().then(({ builds: b }) => alive && setBuilds(b));
    return () => {
      alive = false;
    };
  }, []);

  // Ordered so the visitor's platform is first.
  const ordered = builds
    ? [...builds].sort((a, b) => Number(b.os === mine) - Number(a.os === mine))
    : null;
  const primary = ordered?.[0];
  const rest = ordered?.slice(1) ?? [];

  // Until the release resolves, and if it never does, the releases page always works.
  if (!primary) {
    return (
      <a
        href={FALLBACK}
        className="pressable inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-[14px] font-medium"
        style={{
          background: 'linear-gradient(135deg, var(--brass-lit), var(--brass) 55%, var(--brass-dim))',
          color: '#17130c',
          boxShadow: '0 14px 40px -14px rgba(200,150,79,0.6)',
        }}
      >
        Download Lens
      </a>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <a
          href={primary.url}
          className="pressable inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-[14px] font-semibold"
          style={{
            background: 'linear-gradient(135deg, var(--brass-lit), var(--brass) 55%, var(--brass-dim))',
            color: '#17130c',
            boxShadow: '0 14px 40px -14px rgba(200,150,79,0.6)',
          }}
        >
          <OsIcon os={primary.os} size={19} />
          <span>
            Download for {primary.label}
            <span className="ml-1.5 font-normal opacity-70">
              {primary.detail}
              {primary.sizeMb ? ` · ${primary.sizeMb}MB` : ''}
            </span>
          </span>
        </a>

        {!compact &&
          rest.slice(0, 2).map((b) => (
            <a
              key={b.url}
              href={b.url}
              title={`${b.label} — ${b.detail}`}
              className="pressable inline-flex items-center gap-2.5 rounded-full border border-[var(--line)] px-5 py-3.5 text-[13.5px] text-[var(--muted)] hover:border-[var(--brass-dim)] hover:text-[var(--paper)]"
            >
              <OsIcon os={b.os} size={18} />
              {b.label}
            </a>
          ))}
      </div>

      {!compact && rest.length > 2 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-[var(--faint)]">
          <span>Also:</span>
          {rest.slice(2).map((b) => (
            <a key={b.url} href={b.url} className="underline decoration-[var(--line)] hover:text-[var(--paper)]">
              {b.label} {b.detail}
            </a>
          ))}
          <a href={FALLBACK} className="underline decoration-[var(--line)] hover:text-[var(--paper)]">
            All builds
          </a>
        </div>
      )}

      {!compact && (
        <p className="text-[13px] leading-relaxed text-[var(--faint)]">
          Free, no account. Not code-signed yet, so your machine will ask once.
        </p>
      )}
    </div>
  );
}
