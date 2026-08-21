import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Shot } from './Shot';

export interface Slide {
  src: string;
  alt: string;
  width: number;
  height: number;
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
 * Three shots stacked in one frame rather than three stacked down the page.
 * The page is long enough already, and a person deciding whether to download
 * something wants to flick through what it looks like, not scroll past it.
 *
 * It advances on its own so a first visit shows more than one screen without
 * being touched, and stops the moment someone takes hold of it: an autoplay
 * that fights the pointer is worse than no autoplay. Draggable on a phone,
 * arrow keys and dots on a desktop.
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
      <div
        ref={frame}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Screenshots of Lens"
        className="relative overflow-hidden rounded-[16px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        {/* mode="popLayout" so the outgoing shot leaves the layout at once and
            the incoming one is not pushed a frame down the page as it enters. */}
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
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
            initial={{ opacity: 0, x: direction * 64, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction * -64, scale: 0.985, position: 'absolute' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
            className="inset-0 cursor-grab active:cursor-grabbing"
          >
            <Shot src={slide.src} alt={slide.alt} width={slide.width} height={slide.height} />
          </motion.div>
        </AnimatePresence>
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
                    i === index ? 'var(--accent-lit)' : 'color-mix(in srgb, var(--paper) 26%, transparent)',
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
