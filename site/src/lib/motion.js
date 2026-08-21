/**
 * Whether to animate at all.
 *
 * Checked once per call rather than cached, so a visitor who changes the setting
 * mid-session is respected on the next sequence.
 */
export function prefersReducedMotion() {
    return (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)') !== null &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
/** Splits a heading into word spans so they can be staggered without losing wraps. */
export function splitWords(el) {
    if (el.dataset.split === 'done') {
        return Array.from(el.querySelectorAll('[data-word]'));
    }
    const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent ?? '';
            // Keep the spaces: rebuilding without them collapses the line.
            const parts = text.split(/(\s+)/).filter((p) => p !== '');
            return parts.map((part) => {
                if (/^\s+$/.test(part))
                    return document.createTextNode(part);
                const span = document.createElement('span');
                span.textContent = part;
                span.dataset.word = '';
                // inline-block so a transform applies; the parent keeps wrapping.
                span.style.display = 'inline-block';
                span.style.willChange = 'transform, opacity';
                return span;
            });
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const children = Array.from(node.childNodes).flatMap(walk);
            node.textContent = '';
            children.forEach((c) => node.appendChild(c));
            return [node];
        }
        return [node];
    };
    const rebuilt = Array.from(el.childNodes).flatMap(walk);
    el.textContent = '';
    rebuilt.forEach((n) => el.appendChild(n));
    el.dataset.split = 'done';
    return Array.from(el.querySelectorAll('[data-word]'));
}
