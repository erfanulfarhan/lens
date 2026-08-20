import { useEffect, useState } from 'react';
import { OsIcon } from './OsIcon';
import { fetchBuilds, FALLBACK, type Build } from '../lib/releases';

/**
 * Every platform, one treatment.
 *
 * An earlier version promoted the detected platform to a filled brass button and
 * left the rest outlined. That invented a hierarchy the product does not have —
 * these are six equal builds of the same app — and on any given machine the
 * highlight looked arbitrary. Detection now only affects order, which helps
 * without claiming one download matters more.
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

  const ordered = builds
    ? [...builds].sort((a, b) => Number(b.os === mine) - Number(a.os === mine))
    : null;

  if (!ordered || ordered.length === 0) {
    return (
      <a
        href={FALLBACK}
        className="pressable inline-flex items-center gap-2.5 rounded-xl border border-[var(--line)] px-6 py-3.5 text-[14px] text-[var(--paper)] hover:border-[var(--brass-dim)]"
        style={{ background: 'var(--panel)' }}
      >
        Download Lens
      </a>
    );
  }

  const shown = compact ? ordered.slice(0, 3) : ordered;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2.5">
        {shown.map((b) => (
          <a
            key={b.url}
            href={b.url}
            className="pressable group flex items-center gap-3 rounded-xl border border-[var(--line)] px-5 py-3 transition-colors duration-150 hover:border-[var(--brass-dim)]"
            style={{ background: 'var(--panel)' }}
          >
            <span
              className="shrink-0 transition-colors duration-150"
              style={{ color: 'var(--brass)' }}
            >
              <OsIcon os={b.os} size={20} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[13.5px] font-semibold text-[var(--paper)]">{b.label}</span>
              <span className="text-[11.5px] text-[var(--faint)]">
                {b.detail}
                {b.sizeMb ? ` · ${b.sizeMb}MB` : ''}
              </span>
            </span>
          </a>
        ))}
      </div>

      {!compact && (
        <p className="text-[13px] leading-relaxed text-[var(--faint)]">
          Free, no account.{' '}
          <a href={FALLBACK} className="underline decoration-[var(--line)] hover:text-[var(--paper)]">
            All builds and checksums
          </a>
          . Not code-signed yet, so your machine will ask once.
        </p>
      )}
    </div>
  );
}
