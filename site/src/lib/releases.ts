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
  // Two Windows rows, and which of them appear depends on what the release
  // actually carries. The stub is matched first so that on a release holding
  // both, each row describes the right file rather than the label being a guess.
  {
    os: 'windows',
    icon: 'windows',
    label: 'Windows',
    detail: 'Web installer',
    test: (n) => /web[-. ]?setup.*\.exe$/i.test(n),
  },
  {
    os: 'windows',
    icon: 'windows',
    label: 'Windows',
    detail: 'Full installer',
    test: (n) => /\.exe$/i.test(n),
  },
  { os: 'linux', icon: 'linux', label: 'Linux', detail: 'AppImage', test: (n) => /\.AppImage$/i.test(n) && !/arm64/i.test(n) },
  { os: 'linux', icon: 'debian', label: 'Debian, Ubuntu', detail: '.deb', test: (n) => /amd64\.deb$/i.test(n) },
  { os: 'linux', icon: 'fedora', label: 'Fedora, RHEL', detail: '.rpm', test: (n) => /x86_64\.rpm$/i.test(n) },
];

type Result = { builds: Build[]; version: string | null };

/** Maps one release's assets onto the six download slots. */
function mapAssets(assets: Asset[]): Build[] {
  const used = new Set<string>();
  const builds: Build[] = [];
  for (const rule of RULES) {
    const hit = assets.find((a) => !used.has(a.name) && rule.test(a.name));
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
  return builds;
}

/**
 * The newest release that people can actually download.
 *
 * Deliberately the release list rather than /releases/latest. A release exists
 * from the moment it is created, but its installers are attached minutes later
 * when the build finishes, and for that whole window /releases/latest returns a
 * version with no assets. This page used to take that at face value, match none
 * of its six rules, and collapse to a single bare link to the releases page,
 * which is what it did during 0.1.5. Walking down the list instead means the
 * previous version's downloads stay up until the new ones are ready.
 *
 * The version reported is the release the buttons actually point at, so the page
 * never claims a version it is not serving.
 */
async function load(): Promise<Result> {
  try {
    const slug = REPO.split('github.com/')[1];
    const r = await fetch(`https://api.github.com/repos/${slug}/releases?per_page=10`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!r.ok) return { builds: [], version: null };
    const list = (await r.json()) as Array<{
      tag_name: string;
      draft: boolean;
      prerelease: boolean;
      assets: Asset[];
    }>;

    for (const rel of list) {
      if (rel.draft || rel.prerelease) continue;
      const builds = mapAssets(rel.assets ?? []);
      if (!builds.length) continue;

      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ at: Date.now(), builds, version: rel.tag_name }),
        );
      } catch {
        /* storage blocked or full */
      }
      return { builds, version: rel.tag_name };
    }
    return { builds: [], version: null };
  } catch {
    return { builds: [], version: null };
  }
}

/**
 * The six downloads for the current release.
 *
 * Cached for six hours so the buttons appear immediately and the page does not
 * spend one of GitHub's sixty anonymous requests an hour on every visit. The
 * cache is served first and then revalidated in the background: without that, a
 * visitor who came by in the six hours before a release keeps being handed the
 * previous version's installers, which is exactly the wrong moment to be stale.
 *
 * `onFresh` fires only when the network disagrees with what was served.
 */
export async function fetchBuilds(onFresh?: (r: Result) => void): Promise<Result> {
  let cached: (Result & { at: number }) | null = null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Result & { at: number };
      if (Date.now() - parsed.at < CACHE_MS) cached = parsed;
    }
  } catch {
    /* an unreadable cache is not an error */
  }

  if (!cached) return load();

  void load().then((fresh) => {
    if (fresh.version && fresh.version !== cached!.version) onFresh?.(fresh);
  });
  return { builds: cached.builds, version: cached.version };
}

export const FALLBACK = RELEASES;
