import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { OsIcon } from './OsIcon';
import { GRID, TILE } from '../lib/hero-motion';
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
    // The second argument fires only if the background check finds a newer
    // release than the cached one it already handed us.
    fetchBuilds(({ builds: b }) => alive && setBuilds(b)).then(
      ({ builds: b }) => alive && setBuilds(b),
    );
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
      <motion.div
        initial="hidden"
        animate="show"
        variants={GRID}
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
      >
        {shown.map((b) => (
          <motion.a
            key={b.url}
            href={b.url}
            variants={TILE}
            // Hover and press live here rather than in the .lift class: a CSS
            // transition on transform fights an animation that sets transform
            // every frame, and the entrance was the casualty.
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="group flex min-h-[58px] items-center gap-3 rounded-xl border border-[var(--line)] px-4 py-3 transition-colors duration-150 hover:border-[var(--brass-dim)]"
            style={{ background: 'var(--panel)' }}
          >
            <span
              className="shrink-0 transition-colors duration-150"
              style={{ color: 'var(--brass)' }}
            >
              <OsIcon os={b.icon} size={20} />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[13.5px] font-semibold text-[var(--paper)]">
                {b.label}
              </span>
              <span className="truncate text-[11.5px] text-[var(--faint)]">
                {b.detail}
                {b.sizeMb ? ` · ${b.sizeMb}MB` : ''}
              </span>
            </span>
          </motion.a>
        ))}
      </motion.div>

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
