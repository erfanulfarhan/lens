import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const [open, setOpen] = useState(0);
    return (_jsx("ul", { className: "mt-14 list-none p-0", children: FAQ.map((item, i) => {
            const isOpen = open === i;
            return (_jsxs("li", { className: "border-t border-[var(--line)] last:border-b", children: [_jsxs("button", { onClick: () => setOpen(isOpen ? null : i), "aria-expanded": isOpen, className: "flex w-full cursor-pointer items-start justify-between gap-8 py-6 text-left transition-colors duration-150 hover:text-[var(--brass-lit)]", children: [_jsx("span", { className: "display text-[1.4rem] leading-tight font-bold sm:text-[1.75rem]", children: item.q }), _jsx("span", { "aria-hidden": "true", className: "mt-2 shrink-0", style: {
                                    transform: isOpen ? 'rotate(45deg)' : 'none',
                                    transition: 'transform 180ms var(--ease-out)',
                                }, children: _jsx("svg", { width: "17", height: "17", viewBox: "0 0 17 17", fill: "none", children: _jsx("path", { d: "M8.5 1v15M1 8.5h15", stroke: "var(--brass)", strokeWidth: "1.4" }) }) })] }), _jsx("div", { className: "grid", style: {
                            gridTemplateRows: isOpen ? '1fr' : '0fr',
                            opacity: isOpen ? 1 : 0,
                            transition: 'grid-template-rows 220ms var(--ease-out), opacity 220ms var(--ease-out)',
                        }, children: _jsx("div", { className: "overflow-hidden", children: _jsx("p", { className: "measure pb-7 text-[15px] leading-[1.7] text-[var(--muted)]", children: item.a }) }) })] }, item.q));
        }) }));
}
