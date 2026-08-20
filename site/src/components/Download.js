import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { OsIcon } from './OsIcon';
import { fetchBuilds, FALLBACK } from '../lib/releases';
/**
 * Every platform, one treatment.
 *
 * An earlier version promoted the detected platform to a filled brass button and
 * left the rest outlined. That invented a hierarchy the product does not have —
 * these are six equal builds of the same app — and on any given machine the
 * highlight looked arbitrary. Detection now only affects order, which helps
 * without claiming one download matters more.
 */
function detectOs() {
    if (typeof navigator === 'undefined')
        return null;
    const ua = navigator.userAgent;
    if (/Macintosh|Mac OS X/i.test(ua))
        return 'mac';
    if (/Windows/i.test(ua))
        return 'windows';
    if (/Linux|X11/i.test(ua))
        return 'linux';
    return null;
}
export function Download({ compact = false }) {
    const [builds, setBuilds] = useState(null);
    const mine = detectOs();
    useEffect(() => {
        let alive = true;
        fetchBuilds().then(({ builds: b }) => alive && setBuilds(b));
        return () => {
            alive = false;
        };
    }, []);
    const ordered = builds
        ? [...builds].sort((a, b) => Number(b.os === mine) - Number(a.os === mine))
        : null;
    if (!ordered || ordered.length === 0) {
        return (_jsx("a", { href: FALLBACK, className: "pressable inline-flex items-center gap-2.5 rounded-xl border border-[var(--line)] px-6 py-3.5 text-[14px] text-[var(--paper)] hover:border-[var(--brass-dim)]", style: { background: 'var(--panel)' }, children: "Download Lens" }));
    }
    const shown = compact ? ordered.slice(0, 3) : ordered;
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsx("div", { className: "flex flex-wrap gap-2.5", children: shown.map((b) => (_jsxs("a", { href: b.url, className: "pressable group flex items-center gap-3 rounded-xl border border-[var(--line)] px-5 py-3 transition-colors duration-150 hover:border-[var(--brass-dim)]", style: { background: 'var(--panel)' }, children: [_jsx("span", { className: "shrink-0 transition-colors duration-150", style: { color: 'var(--brass)' }, children: _jsx(OsIcon, { os: b.os, size: 20 }) }), _jsxs("span", { className: "flex flex-col leading-tight", children: [_jsx("span", { className: "text-[13.5px] font-semibold text-[var(--paper)]", children: b.label }), _jsxs("span", { className: "text-[11.5px] text-[var(--faint)]", children: [b.detail, b.sizeMb ? ` · ${b.sizeMb}MB` : ''] })] })] }, b.url))) }), !compact && (_jsxs("p", { className: "text-[13px] leading-relaxed text-[var(--faint)]", children: ["Free, no account.", ' ', _jsx("a", { href: FALLBACK, className: "underline decoration-[var(--line)] hover:text-[var(--paper)]", children: "All builds and checksums" }), ". Not code-signed yet, so your machine will ask once."] }))] }));
}
