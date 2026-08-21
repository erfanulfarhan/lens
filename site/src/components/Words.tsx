import { Fragment } from 'react';
import { motion } from 'motion/react';
import { WORD } from '../lib/hero-motion';

/**
 * A phrase whose words arrive one after another.
 *
 * Split here in the markup rather than by rewriting the heading's DOM in an
 * effect. Doing it after mount meant re-laying out the largest type on the page
 * at exactly the moment the animation started, which is where the stutter at
 * the top of the page came from.
 *
 * The separator is a real space, not a non-breaking one, so the headline still
 * wraps where it should on a narrow screen.
 */
export function Words({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <motion.span variants={WORD} className="inline-block">
            {word}
          </motion.span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </>
  );
}
