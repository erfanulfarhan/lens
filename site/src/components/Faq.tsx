import { useState } from 'react';
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

  return (
    <ul className="mt-14 list-none p-0">
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={item.q} className="border-t border-[var(--line)] last:border-b">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-start justify-between gap-8 py-6 text-left transition-colors duration-200 hover:text-[var(--brass-lit)]"
            >
              <span className="display text-[1.4rem] leading-tight font-bold sm:text-[1.75rem]">
                {item.q}
              </span>
              <span
                aria-hidden="true"
                className="mt-2 shrink-0 transition-transform duration-400"
                style={{
                  transform: isOpen ? 'rotate(45deg)' : 'none',
                  transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                  <path d="M8.5 1v15M1 8.5h15" stroke="var(--brass)" strokeWidth="1.4" />
                </svg>
              </span>
            </button>
            <div
              className="grid transition-all duration-500"
              style={{
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                opacity: isOpen ? 1 : 0,
                transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
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
