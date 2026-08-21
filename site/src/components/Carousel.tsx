import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export interface Slide {
  src: string;
  alt: string;
  title: string;
  body: string;
}

const ADVANCE_MS = 6200;
/** How far a drag must travel, or how fast it must be flicked, to change slide. */
const DISTANCE = 90;
const VELOCITY = 420;

/**
 * The screenshot carousel.
 *
 * The frame is drawn once and never moves; only the picture inside it changes.
 * The first version gave each slide its own Shot, which meant each slide also
 * brought its own height: these captures run from a 4.3:1 strip to a 2:1 panel,
 * so the frame lurched by hundreds of pixels on every change and shoved the
 * caption down the page. Fixing the aspect ratio here and containing each image
 * inside it costs some empty background on the narrower shots and buys a frame
 * that behaves like a window rather than a concertina.
 *
 * It advances on its own so a first visit sees more than one screen without
 * being touched, and stops the moment someone takes hold of it. Draggable on a
 * phone, arrow keys and dots on a desktop.
 */
export function Carousel({ slides }: { slides: readonly Slide[] }) {
  const [index, setIndex] = useState(0);
  // Which way the next slide should come from, so a wrap from last to first
  // still travels forwards instead of snapping backwards across the frame.
  const [direction, setDirection] = useState(1);
  const [held, setHeld] = useState(false);
  const reduce = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);

  const go = (delta: number) => {
    setDirection(delta);
    setIndex((i) => (i + delta + slides.length) % slides.length);
  };

  useEffect(() => {
    if (held || reduce) return;
    const t = window.setTimeout(() => go(1), ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [index, held, reduce]);

  // Only while the carousel has focus, so arrow keys still scroll the page
  // everywhere else.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else return;
      e.preventDefault();
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [slides.length]);

  const slide = slides[index];

  return (
    <div
      className="mt-12"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
    >
      {/* Ambient bloom, sitting behind the glass rather than on it. */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-[2.5rem] opacity-70 blur-3xl"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 0%, rgba(200,150,79,0.16), transparent 70%), radial-gradient(50% 50% at 70% 100%, rgba(127,168,139,0.10), transparent 70%)',
          }}
        />

        <div
          ref={frame}
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label="Screenshots of Lens"
          className="relative overflow-hidden rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          style={{
            // 3:1 sits between the strips and the panel shot, so nothing is
            // shrunk far and nothing is cropped at all.
            aspectRatio: '3 / 1',
            background: 'var(--panel)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: [
              '0 1px 2px rgba(0,0,0,0.5)',
              '0 10px 22px -8px rgba(0,0,0,0.55)',
              '0 44px 90px -30px rgba(0,0,0,0.92)',
            ].join(', '),
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-[14px]"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)' }}
          />

          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={slide.src}
              custom={direction}
              drag={reduce ? false : 'x'}
              dragElastic={0.16}
              dragConstraints={{ left: 0, right: 0 }}
              dragMomentum={false}
              onDragStart={() => setHeld(true)}
              onDragEnd={(_, info) => {
                const throwX = info.offset.x + info.velocity.x * 0.12;
                if (throwX < -DISTANCE || info.velocity.x < -VELOCITY) go(1);
                else if (throwX > DISTANCE || info.velocity.x > VELOCITY) go(-1);
              }}
              initial={{ opacity: 0, x: direction * 64 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -64 }}
              transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
              className="absolute inset-0 flex cursor-grab items-center justify-center active:cursor-grabbing"
            >
              <img
                src={slide.src}
                alt={slide.alt}
                loading="lazy"
                decoding="async"
                // The browser's native image drag would otherwise swallow the
                // gesture before the carousel ever sees it.
                draggable={false}
                className="max-h-full max-w-full object-contain select-none"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* The caption is part of the control row, not floating under the image,
          so the height never jumps as captions of different lengths swap in. */}
      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-h-[3.4rem] max-w-[46ch]">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <p className="text-[14px] font-semibold text-[var(--paper)]">{slide.title}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--faint)]">
                {slide.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => {
                setDirection(i > index ? 1 : -1);
                setIndex(i);
              }}
              aria-label={`Show screenshot ${i + 1} of ${slides.length}: ${s.title}`}
              aria-current={i === index}
              className="group grid h-8 place-items-center px-1"
            >
              {/* The active dot stretches into a bar. layout so Motion tweens
                  the width change rather than snapping it. */}
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="block h-[6px] rounded-full"
                style={{
                  width: i === index ? 26 : 6,
                  background:
                    i === index
                      ? 'var(--accent-lit)'
                      : 'color-mix(in srgb, var(--paper) 26%, transparent)',
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
