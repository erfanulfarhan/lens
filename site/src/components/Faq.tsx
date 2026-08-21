import { useEffect, useState } from 'react';
import { FAQ } from '../content';

/**
 * A disclosure list, not an accordion of cards.
 *
 * The first answer is open on load: the honest answer about screen sharing is
 * the one a visitor most needs and is least likely to click for, so it is not
 * hidden behind an interaction.
 */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  // Structured data for the questions, built from the same array the page
  // renders. Written from here rather than pasted into index.html so the two
  // cannot drift: a hand-kept copy would still be answering last month's
  // questions the first time someone edited this list.
  useEffect(() => {
    const tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    });
    document.head.appendChild(tag);
    return () => tag.remove();
  }, []);

  return (
    <ul className="mt-14 list-none p-0">
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={item.q} className="border-t border-[var(--line)] last:border-b">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-start justify-between gap-8 py-6 text-left transition-colors duration-150 hover:text-[var(--brass-lit)]"
            >
              <span className="display text-[1.4rem] leading-tight font-bold sm:text-[1.75rem]">
                {item.q}
              </span>
              <span
                aria-hidden="true"
                className="mt-2 shrink-0"
                style={{
                  transform: isOpen ? 'rotate(45deg)' : 'none',
                  transition: 'transform 180ms var(--ease-out)',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                  <path d="M8.5 1v15M1 8.5h15" stroke="var(--brass)" strokeWidth="1.4" />
                </svg>
              </span>
            </button>
            {/* Transitions, not keyframes: a disclosure is toggled rapidly and must
                retarget from its current state mid-motion rather than restart.
                220ms sits inside the 150-250ms budget for this family; the old
                500ms felt sluggish. Properties are named rather than `all`,
                which would animate unintended ones off the GPU.
                grid-template-rows is a layout property and knowingly so: it is
                the accessible way to animate to an unknown content height. */}
            <div
              className="grid"
              style={{
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                opacity: isOpen ? 1 : 0,
                transition:
                  'grid-template-rows 220ms var(--ease-out), opacity 220ms var(--ease-out)',
              }}
            >
              <div className="overflow-hidden">
                <p className="measure pb-7 text-[15px] leading-[1.7] text-[var(--muted)]">
                  {item.a}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
