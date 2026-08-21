import { RELEASES, REPO } from '../content';

/**
 * Real download links, resolved from the live release rather than hardcoded.
 *
 * Asset filenames carry the version (`Lens-0.1.3-arm64.dmg`), so a hardcoded URL
 * breaks silently on the next release and hands visitors a 404. The GitHub API
 * sends `Access-Control-Allow-Origin: *`, so the browser can read it directly.
 *
 * Unauthenticated calls are limited to 60/hour per IP, so the answer is cached
 * for six hours and every failure falls back to the releases page, which always
 * works.
 */

export interface Build {
  os: 'mac' | 'windows' | 'linux';
  /** Which mark to draw. The three Linux builds are different distributions and
   *  deserve their own, rather than sharing one penguin between them. */
  icon: 'mac' | 'windows' | 'linux' | 'debian' | 'fedora';
  label: string;
  detail: string;
  url: string;
  sizeMb: number | null;
}

interface Asset {
  name: string;
  browser_download_url: string;
  size: number;
}

const CACHE_KEY = 'lens.releases.v1';
const CACHE_MS = 6 * 60 * 60 * 1000;

/** Matched most-specific first: `-arm64.dmg` must win over a bare `.dmg`. */
const RULES: Array<{ os: Build['os']; icon: Build['icon']; label: string; detail: string; test: (n: string) => boolean }> = [
  { os: 'mac', icon: 'mac', label: 'macOS', detail: 'Apple Silicon', test: (n) => /arm64\.dmg$/i.test(n) },
  { os: 'mac', icon: 'mac', label: 'macOS', detail: 'Intel', test: (n) => /\.dmg$/i.test(n) },
  { os: 'windows', icon: 'windows', label: 'Windows', detail: 'Installer', test: (n) => /\.exe$/i.test(n) },
  { os: 'linux', icon: 'linux', label: 'Linux', detail: 'AppImage', test: (n) => /\.AppImage$/i.test(n) && !/arm64/i.test(n) },
  { os: 'linux', icon: 'debian', label: 'Debian, Ubuntu', detail: '.deb', test: (n) => /amd64\.deb$/i.test(n) },
  { os: 'linux', icon: 'fedora', label: 'Fedora, RHEL', detail: '.rpm', test: (n) => /x86_64\.rpm$/i.test(n) },
];

export async function fetchBuilds(): Promise<{ builds: Build[]; version: string | null }> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as { at: number; builds: Build[]; version: string };
      if (Date.now() - parsed.at < CACHE_MS) return { builds: parsed.builds, version: parsed.version };
    }
  } catch {
    /* an unreadable cache is not an error */
  }

  try {
    const slug = REPO.split('github.com/')[1];
    const r = await fetch(`https://api.github.com/repos/${slug}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!r.ok) return { builds: [], version: null };
    const json = (await r.json()) as { tag_name: string; assets: Asset[] };

    const used = new Set<string>();
    const builds: Build[] = [];
    for (const rule of RULES) {
      const hit = json.assets.find((a) => !used.has(a.name) && rule.test(a.name));
      if (!hit) continue;
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
    } catch {
      /* storage blocked or full */
    }
    return { builds, version: json.tag_name };
  } catch {
    return { builds: [], version: null };
  }
}

export const FALLBACK = RELEASES;
