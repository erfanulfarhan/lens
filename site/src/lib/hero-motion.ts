import type { Variants } from 'motion/react';

/** A long, soft deceleration. Movement should arrive, not stop. */
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The hero entrance.
 *
 * Only opacity and transform. An earlier version blurred each word as it
 * arrived, which reads beautifully in a spec and terribly in a browser: a
 * per-word filter on display type at this size repaints a large area every
 * frame, so the headline stalled and then caught up in a jump. Both properties
 * used here are composited, so the sequence costs the main thread nothing.
 */
export const COLUMN: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.085, delayChildren: 0.06 } },
};

/** The headline staggers its own words, nested inside the column's chain. */
export const HEAD: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

export const WORD: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export const RISE: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** The download grid, staggering the six builds. */
export const GRID: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

export const TILE: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: EASE } },
};
