import { RELEASES, TARGETS } from '../content';

/**
 * Leads with the visitor's own platform.
 *
 * Six build targets is genuinely useful and genuinely a wall of text. Detecting
 * the obvious one and keeping the rest one click away turns a table into a
 * decision the visitor does not have to make.
 */
function detect(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/Macintosh|Mac OS X/i.test(ua)) {
    // Apple Silicon does not announce itself in the UA string; the renderer is
    // the usual tell. Guessing wrong is cheap here because both files are listed.
    const arm = /Apple/i.test(navigator.platform) && navigator.maxTouchPoints > 0;
    return arm ? 'macOS, Apple Silicon' : 'macOS';
  }
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Linux|X11/i.test(ua)) return 'Linux';
  return null;
}

export function Download({ compact = false }: { compact?: boolean }) {
  const platform = detect();
  const label = platform ? `Download for ${platform}` : 'Download Lens';

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-4' : 'flex flex-col gap-5'}>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={RELEASES}
          className="group relative inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-[14px] font-medium transition-transform duration-300 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, var(--brass-lit), var(--brass) 55%, var(--brass-dim))',
            color: '#17130c',
            boxShadow: '0 14px 40px -14px rgba(200,150,79,0.6)',
          }}
        >
          {label}
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M7.5 1v9m0 0L4 6.5m3.5 3.5L11 6.5M1.5 13h12" stroke="#17130c" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </a>
        <a
          href={`${RELEASES}`}
          className="rounded-full border border-[var(--line)] px-6 py-3.5 text-[14px] text-[var(--muted)] transition-colors duration-300 hover:border-[var(--brass-dim)] hover:text-[var(--paper)]"
        >
          All platforms
        </a>
      </div>

      {!compact && (
        <p className="text-[13px] leading-relaxed text-[var(--faint)]">
          Free, no account.{' '}
          {TARGETS.length} builds: macOS, Windows, AppImage, deb and rpm. Not code-signed yet, so
          your machine will ask once.
        </p>
      )}
    </div>
  );
}
