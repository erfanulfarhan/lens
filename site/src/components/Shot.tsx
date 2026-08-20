interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** The hero shot loads eagerly; the rest wait. */
  priority?: boolean;
  caption?: React.ReactNode;
}

/**
 * A screenshot presented as a window floating on the page.
 *
 * The premium feel in a product shot comes from depth, not decoration: a deep
 * layered shadow, a hairline rim catching light on the top edge, and enough
 * space around it to read as an object rather than a pasted rectangle.
 *
 * Deliberately no macOS traffic lights. The Lens panel is frameless and carries
 * its own controls on the right, so drawing Apple's on the left would show a
 * window chrome the app does not have. The framing is presentation; the pixels
 * inside stay exactly as captured.
 */
export function Shot({ src, alt, width, height, priority = false, caption }: Props) {
  return (
    <figure className="relative m-0">
      {/* Ambient brass bloom, sitting behind the glass rather than on it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-8 -inset-y-6 -z-10 rounded-[2.5rem] opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, rgba(200,150,79,0.16), transparent 70%), radial-gradient(50% 50% at 70% 100%, rgba(127,168,139,0.10), transparent 70%)',
        }}
      />

      <div
        className="overflow-hidden rounded-[14px]"
        style={{
          // Three stacked shadows: contact, mid-lift, and the long soft fall
          // that puts it above the page. One shadow always looks pasted on.
          boxShadow: [
            '0 1px 2px rgba(0,0,0,0.5)',
            '0 10px 22px -8px rgba(0,0,0,0.55)',
            '0 44px 90px -30px rgba(0,0,0,0.92)',
          ].join(', '),
          // A hairline rim, brighter along the top edge where light would land.
          border: '1px solid rgba(255,255,255,0.09)',
          background: 'var(--panel)',
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[14px]"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)' }}
        />
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          className="block w-full"
        />
      </div>

      {caption && (
        <figcaption className="mt-4 text-[13px] leading-relaxed text-[var(--faint)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
