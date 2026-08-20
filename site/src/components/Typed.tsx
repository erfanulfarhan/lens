import { useEffect, useState } from 'react';
import { finishedCycle, startTyping, step } from '../lib/typing';

/** Typing is slower than erasing, because reading takes longer than forgetting. */
const TYPE_MS = 58;
const ERASE_MS = 26;
const HOLD_TICKS = 26;

/**
 * Types real questions people ask Lens, one character at a time.
 *
 * The hero shows the product being used rather than describing it, and the
 * treatment matches the app's own thinking indicator: mono, with a caret. Both
 * are the same idea, so the page and the product feel like one thing.
 */
export function Typed({ lines }: { lines: string[] }) {
  const [index, setIndex] = useState(0);
  const [state, setState] = useState(startTyping);

  useEffect(() => {
    const delay = state.phase === 'erasing' ? ERASE_MS : TYPE_MS;
    const id = setTimeout(() => {
      setState((prev) => {
        const next = step(prev, lines[index], HOLD_TICKS);
        if (finishedCycle(next)) setIndex((i) => (i + 1) % lines.length);
        return next;
      });
    }, delay);
    return () => clearTimeout(id);
  }, [state, index, lines]);

  return (
    <span className="typed">
      {state.text}
      {/* Decorative: the questions are also listed in the copy below. */}
      <span className="typed-caret" aria-hidden />
    </span>
  );
}
