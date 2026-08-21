import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * A screenshot presented as a window floating on the page.
 *
 * The premium feel in a product shot comes from depth, not decoration: a deep
 * layered shadow, a hairline rim catching light on the top edge, and enough
 * space around it to read as an object rather than a pasted rectangle.
 *
 * Deliberately no macOS traffic lights. The Lens panel is frameless and carries
 * its own controls on the right, so drawing Apple's on the left would show a
 * window chrome the app does not have. The framing is presentation; the pixels
 * inside stay exactly as captured.
 */
export function Shot({ src, alt, width, height, priority = false, caption }) {
    return (_jsxs("figure", { className: "relative m-0", children: [_jsx("div", { "aria-hidden": "true", 
                // inset-0, not a negative inset. A negative inset pushed the bloom
                // 32px past the wrapper, and once the wrapper itself was 94vw that
                // overflowed the viewport and gave the page a horizontal scrollbar on
                // phones. The blur already spreads past these bounds on its own.
                className: "pointer-events-none absolute inset-0 -z-10 rounded-[2.5rem] opacity-70 blur-3xl", style: {
                    background: 'radial-gradient(60% 60% at 50% 0%, rgba(200,150,79,0.16), transparent 70%), radial-gradient(50% 50% at 70% 100%, rgba(127,168,139,0.10), transparent 70%)',
                } }), _jsxs("div", { className: "overflow-hidden rounded-[14px]", style: {
                    // Three stacked shadows: contact, mid-lift, and the long soft fall
                    // that puts it above the page. One shadow always looks pasted on.
                    boxShadow: [
                        '0 1px 2px rgba(0,0,0,0.5)',
                        '0 10px 22px -8px rgba(0,0,0,0.55)',
                        '0 44px 90px -30px rgba(0,0,0,0.92)',
                    ].join(', '),
                    // A hairline rim, brighter along the top edge where light would land.
                    border: '1px solid rgba(255,255,255,0.09)',
                    background: 'var(--panel)',
                }, children: [_jsx("div", { "aria-hidden": "true", className: "pointer-events-none absolute inset-0 rounded-[14px]", style: { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)' } }), _jsx("img", { src: src, alt: alt, width: width, height: height, loading: priority ? 'eager' : 'lazy', decoding: priority ? 'sync' : 'async', 
                        // The browser's native image drag would otherwise swallow the gesture
                        // before the carousel ever sees it, leaving the shots unflickable.
                        draggable: false, className: "block w-full select-none" })] }), caption && (_jsx("figcaption", { className: "mt-4 text-[13px] leading-relaxed text-[var(--faint)]", children: caption }))] }));
}
