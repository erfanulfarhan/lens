import { RELEASES, REPO } from '../content';
const CACHE_KEY = 'lens.releases.v1';
const CACHE_MS = 6 * 60 * 60 * 1000;
/** Matched most-specific first: `-arm64.dmg` must win over a bare `.dmg`. */
const RULES = [
    { os: 'mac', icon: 'mac', label: 'macOS', detail: 'Apple Silicon', test: (n) => /arm64\.dmg$/i.test(n) },
    { os: 'mac', icon: 'mac', label: 'macOS', detail: 'Intel', test: (n) => /\.dmg$/i.test(n) },
    { os: 'windows', icon: 'windows', label: 'Windows', detail: 'Installer', test: (n) => /\.exe$/i.test(n) },
    { os: 'linux', icon: 'linux', label: 'Linux', detail: 'AppImage', test: (n) => /\.AppImage$/i.test(n) && !/arm64/i.test(n) },
    { os: 'linux', icon: 'debian', label: 'Debian, Ubuntu', detail: '.deb', test: (n) => /amd64\.deb$/i.test(n) },
    { os: 'linux', icon: 'fedora', label: 'Fedora, RHEL', detail: '.rpm', test: (n) => /x86_64\.rpm$/i.test(n) },
];
export async function fetchBuilds() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.at < CACHE_MS)
                return { builds: parsed.builds, version: parsed.version };
        }
    }
    catch {
        /* an unreadable cache is not an error */
    }
    try {
        const slug = REPO.split('github.com/')[1];
        const r = await fetch(`https://api.github.com/repos/${slug}/releases/latest`, {
            headers: { Accept: 'application/vnd.github+json' },
        });
        if (!r.ok)
            return { builds: [], version: null };
        const json = (await r.json());
        const used = new Set();
        const builds = [];
        for (const rule of RULES) {
            const hit = json.assets.find((a) => !used.has(a.name) && rule.test(a.name));
            if (!hit)
                continue;
            used.add(hit.name);
            builds.push({
                os: rule.os,
                icon: rule.icon,
                label: rule.label,
                detail: rule.detail,
                url: hit.browser_download_url,
                sizeMb: Math.round(hit.size / 1048576),
            });
        }
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), builds, version: json.tag_name }));
        }
        catch {
            /* storage blocked or full */
        }
        return { builds, version: json.tag_name };
    }
    catch {
        return { builds: [], version: null };
    }
}
export const FALLBACK = RELEASES;
