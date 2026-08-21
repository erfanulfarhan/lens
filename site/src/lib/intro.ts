import { animate, createTimeline, onScroll, stagger } from 'animejs';
import { splitWords } from './motion';

/** Elements the timeline drives, in the order they arrive. */
const STAGES = [
  '[data-intro-beam]',
  '[data-intro-ask]',
  '[data-intro-lede]',
  '[data-intro-cta] a',
] as const;

/**
 * The first three seconds of a visit.
 *
 * The page used to fade the whole hero column in as one block, which is honest
 * but says nothing. Staging it instead lets the page explain itself in the
 * order a person reads: the claim lands word by word, the prism draws the
 * spectrum that the rest of the page is coloured by, then the question, the
 * explanation and the buttons.
 *
 * Everything starts hidden through CSS keyed on `data-intro="pending"` on the
 * root, so there is no flash of unstyled content. `finish()` clears that
 * attribute, and it is called from a fallback timer as well as on completion,
 * so a thrown animation can never leave the page blank.
 */
export function playIntro(root: HTMLElement): () => void {
  const finish = () => {
    root.dataset.intro = 'done';
  };

  // Reduced motion, or no hero on the page: serve the finished state at once.
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heading = root.querySelector<HTMLElement>('[data-intro-head]');
  if (reduce || !heading) {
    finish();
    return () => {};
  }

  // A late fallback: if anything below throws, the page still resolves.
  const guard = window.setTimeout(finish, 2600);

  const words = splitWords(heading);
  const tl = createTimeline({ defaults: { ease: 'out(3)' } });

  tl.add(words, {
    opacity: [0, 1],
    y: [26, 0],
    filter: ['blur(9px)', 'blur(0px)'],
    duration: 760,
    delay: stagger(38),
  });

  // The prism row draws rather than fades: white light in, spectrum out is the
  // one idea the whole page is built on, so it earns its own beat.
  tl.add(
    '[data-intro-beam] > *',
    { opacity: [0, 1], scaleX: [0, 1], duration: 620, delay: stagger(90) },
    '-=420',
  );

  for (const [i, selector] of STAGES.slice(1).entries()) {
    const targets = root.querySelectorAll(selector);
    if (!targets.length) continue;
    tl.add(
      targets,
      {
        opacity: [0, 1],
        y: [14, 0],
        scale: selector.includes('cta') ? [0.965, 1] : 1,
        duration: 560,
        delay: stagger(selector.includes('cta') ? 55 : 0),
      },
      i === 0 ? '-=340' : '-=380',
    );
  }

  tl.then(() => {
    window.clearTimeout(guard);
    finish();
  });

  // The screenshot is below the buttons and rides its own curve, so it is not
  // held back by the chain above it.
  animate('[data-intro-shot]', {
    opacity: [0, 1],
    y: [44, 0],
    scale: [0.985, 1],
    duration: 900,
    delay: 900,
    ease: 'out(3)',
  });

  return () => {
    window.clearTimeout(guard);
    tl.revert();
    finish();
  };
}

/**
 * Reveals a section as it comes up the viewport.
 *
 * Applied to headings and blocks below the fold. `onScroll` with `once` so a
 * block that has arrived stays arrived; re-animating on the way back up makes
 * a page feel restless when someone is only scrolling to find something.
 */
export function revealOnScroll(root: HTMLElement): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const groups = root.querySelectorAll<HTMLElement>('[data-reveal]');
  for (const group of groups) {
    const items = group.hasAttribute('data-reveal-children')
      ? Array.from(group.children)
      : [group];
    animate(items, {
      opacity: [0, 1],
      y: [22, 0],
      duration: 700,
      delay: stagger(70),
      ease: 'out(3)',
      // Starts when the block's top passes 88% down the viewport: late enough
      // that the movement is seen, early enough that it is over before read.
      autoplay: onScroll({ target: group, enter: 'top 88%', sync: false }),
    });
  }
}
