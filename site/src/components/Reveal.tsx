import { motion } from 'motion/react';

type Tag = 'div' | 'h2' | 'h3' | 'p' | 'ol' | 'dl';

/**
 * Reveals its contents as they come up the viewport.
 *
 * Deliberately declarative rather than a script that finds elements and sets
 * styles on them. The earlier version hid these blocks with CSS and relied on a
 * scroll callback to reveal them, so when the callback did not fire the page
 * kept the space and lost the words: every section came out as a tall gap. Here
 * the hidden state only ever exists as a Motion prop on an element Motion is
 * already driving, so there is no state left behind if anything goes wrong.
 *
 * `once` because re-animating on the way back up makes a page feel restless
 * when someone is only scrolling to find something they already read.
 */
export function Reveal({
  tag = 'div',
  className,
  children,
  delay = 0,
}: {
  tag?: Tag;
  className?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  const M = motion[tag];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      // A slightly inset bottom edge so the movement starts just before the
      // block is fully on screen rather than after it has been read.
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </M>
  );
}
