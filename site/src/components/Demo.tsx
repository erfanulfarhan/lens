import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Aperture } from './Aperture';
import { SCENES, THINKING_WORDS } from '../lib/demo-script';
import { finalFrame, frameAt, sceneDuration, type Frame } from '../lib/demo-clock';

/** 25 updates a second: fast enough for streaming text, cheap enough to ignore. */
const TICK_MS = 40;

function Chrome() {
  return (
    <div
      className="flex items-center gap-2.5 border-b px-3.5 py-2.5"
      style={{ borderColor: 'var(--line)' }}
    >
      <span className="flex flex-col gap-[3px]" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-[1.5px] w-[13px]" style={{ background: 'var(--faint)' }} />
        ))}
      </span>
      <Aperture size={15} animate={false} id="ap-demo" />
      <span className="mono text-[11px] tracking-[0.14em] text-[var(--paper)]">LENS</span>
      <span
        className="h-[6px] w-[6px] rounded-full"
        style={{ background: 'var(--sage)', boxShadow: '0 0 8px var(--sage)' }}
        aria-hidden
      />
      <span
        className="mono ml-1.5 flex-1 truncate rounded-md px-2.5 py-1 text-[11px] text-[var(--muted)]"
        style={{ border: '1px solid var(--line)' }}
      >
        gemma3:12b
      </span>
      <span className="hidden gap-3 text-[11px] text-[var(--faint)] sm:flex">
        <span>Listen</span>
        <span>Web</span>
      </span>
      <span className="flex items-center gap-2.5 text-[var(--faint)]" aria-hidden>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2.6v3M12 18.4v3M2.6 12h3M18.4 12h3M5.4 5.4l2.1 2.1M16.5 16.5l2.1 2.1M18.6 5.4l-2.1 2.1M7.5 16.5l-2.1 2.1" />
        </svg>
        <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
          <path d="M5 12h14" />
        </svg>
        <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </span>
    </div>
  );
}

function Answer({ scene, frame }: { scene: typeof SCENES[number]; frame: Frame }) {
  // Words are handed out across the bullets in order, so a bullet only appears
  // once its first word has arrived and the box never reflows backwards.
  let budget = frame.words;
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {scene.answer.map((bullet) => {
        const all = `${bullet.lead} ${bullet.rest}`.split(/\s+/);
        const take = Math.max(0, Math.min(all.length, budget));
        budget -= all.length;
        if (take === 0) return null;
        const leadWords = bullet.lead.split(/\s+/).length;
        return (
          <motion.li
            key={bullet.lead}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-2.5 text-[13px] leading-[1.6] sm:text-[14px]"
          >
            <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full" style={{ background: 'var(--brass)' }} />
            <span>
              <span className="font-semibold text-[var(--paper)]">
                {all.slice(0, Math.min(take, leadWords)).join(' ')}
              </span>
              {take > leadWords && (
                <span className="text-[var(--muted)]"> {all.slice(leadWords, take).join(' ')}</span>
              )}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}

/**
 * A looping recreation of a real exchange.
 *
 * This replaced a carousel of screenshots. The captures ran from a 4.3:1 strip
 * to a 2:1 panel, so any frame that held all of them either changed size on
 * every slide or wasted half its area on empty background, and a still image of
 * a chat cannot show the one thing worth showing: that the answer arrives, on
 * this machine, in about a second. Drawn in the page rather than filmed, so it
 * stays sharp at any size and costs no video bytes.
 */
export function Demo() {
  const [scene, setScene] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState(false);
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);

  // Only run while it is on screen. A demo animating in a tab nobody is
  // looking at is just a battery cost.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!live || reduce) return;
    const id = window.setInterval(() => setElapsed((t) => t + TICK_MS), TICK_MS);
    return () => window.clearInterval(id);
  }, [live, reduce, scene]);

  const current = SCENES[scene];
  const frame = reduce ? finalFrame(current) : frameAt(current, elapsed);

  useEffect(() => {
    if (reduce) return;
    if (elapsed >= sceneDuration(current)) {
      setScene((s) => (s + 1) % SCENES.length);
      setElapsed(0);
    }
  }, [elapsed, current, reduce]);

  const show = (i: number) => {
    setScene(i);
    setElapsed(0);
  };

  const word = THINKING_WORDS[(scene * 5 + Math.floor(elapsed / 420)) % THINKING_WORDS.length];

  return (
    <div ref={box} className="mt-10">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-[2.5rem] opacity-70 blur-3xl"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 0%, rgba(200,150,79,0.18), transparent 70%), radial-gradient(50% 50% at 70% 100%, rgba(127,168,139,0.12), transparent 70%)',
          }}
        />
        <div
          className="overflow-hidden rounded-[14px]"
          style={{
            background: 'var(--panel)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: [
              '0 1px 2px rgba(0,0,0,0.5)',
              '0 10px 22px -8px rgba(0,0,0,0.55)',
              '0 44px 90px -30px rgba(0,0,0,0.92)',
            ].join(', '),
          }}
        >
          <Chrome />

          {/* Fixed height. The whole point of replacing the carousel was that
              the frame stops changing size, so the content cannot set it. */}
          <div className="flex h-[236px] flex-col justify-between px-3.5 py-3.5 sm:h-[222px]">
            <div className="flex min-h-0 flex-1 flex-col gap-3.5">
              <AnimatePresence>
                {frame.sent && (
                  <motion.div
                    key={`q-${scene}`}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="self-end rounded-xl px-3.5 py-2 text-[13px] sm:text-[14px]"
                    style={{ background: 'var(--panel-2, rgba(255,255,255,0.05))' }}
                  >
                    {current.question}
                  </motion.div>
                )}
              </AnimatePresence>

              {frame.thinking && (
                <div className="flex items-center gap-2 text-[13px] text-[var(--faint)]">
                  <motion.span
                    className="inline-block h-[5px] w-[5px] rounded-full"
                    style={{ background: 'var(--accent)' }}
                    animate={{ opacity: [0.25, 1, 0.25] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="mono">{word}…</span>
                </div>
              )}

              {frame.words > 0 && <Answer scene={current} frame={frame} />}
            </div>

            <div className="flex items-center justify-between gap-3">
              {/* The composer, with the question typing itself into it. */}
              <div
                className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2"
                style={{ border: '1px solid var(--line)' }}
              >
                <span className="shrink-0 text-[var(--faint)]" aria-hidden>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M20.4 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.6 1.6 0 0 1-2.3-2.3l7.8-7.8" />
                  </svg>
                </span>
                <span className="truncate text-[13px] text-[var(--paper)]">
                  {frame.typed || (
                    <span className="text-[var(--faint)]">
                      {frame.sent ? 'Ask anything' : ''}
                    </span>
                  )}
                  {!frame.sent && !reduce && <span className="typed-caret" />}
                </span>
              </div>
              <AnimatePresence>
                {frame.done && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mono shrink-0 text-[10px] tracking-[0.12em]"
                    style={{ color: 'var(--sage)' }}
                  >
                    {current.badge}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-[13px] text-[var(--faint)]">
          A recreation of three real exchanges, drawn in this page rather than filmed.
        </p>
        <div className="flex shrink-0 items-center gap-2.5">
          {SCENES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => show(i)}
              aria-current={i === scene}
              className="group flex items-center gap-2 text-[12px] text-[var(--faint)] transition-colors hover:text-[var(--paper)]"
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="block h-[6px] rounded-full"
                style={{
                  width: i === scene ? 22 : 6,
                  background:
                    i === scene ? 'var(--accent-lit)' : 'color-mix(in srgb, var(--paper) 26%, transparent)',
                }}
              />
              <span className={i === scene ? 'text-[var(--paper)]' : undefined}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
