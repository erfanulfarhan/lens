/**
 * Semver comparison, limited to what a release check needs.
 *
 * Written rather than pulled in because the only question being asked is
 * "is the published release newer than what is running", and a prerelease must
 * never look newer than the final of the same version.
 */
export interface Parsed {
  major: number
  minor: number
  patch: number
  /** Prerelease identifiers, e.g. ['beta', 2] for 1.2.0-beta.2. */
  pre: Array<string | number>
}

export function parseVersion(raw: string): Parsed | null {
  const cleaned = raw.trim().replace(/^v/i, '')
  const m = cleaned.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/)
  if (!m) return null
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    pre: m[4] ? m[4].split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p)) : [],
  }
}

/** Negative if a < b, positive if a > b, zero if equal. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  if (!pa || !pb) return 0

  for (const key of ['major', 'minor', 'patch'] as const) {
    if (pa[key] !== pb[key]) return pa[key] - pb[key]
  }

  // 1.0.0 is newer than 1.0.0-beta: having no prerelease wins.
  if (pa.pre.length === 0 && pb.pre.length > 0) return 1
  if (pa.pre.length > 0 && pb.pre.length === 0) return -1

  for (let i = 0; i < Math.max(pa.pre.length, pb.pre.length); i++) {
    const x = pa.pre[i]
    const y = pb.pre[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (x === y) continue
    // Numeric identifiers rank below alphanumeric ones.
    if (typeof x === 'number' && typeof y === 'number') return x - y
    if (typeof x === 'number') return -1
    if (typeof y === 'number') return 1
    return x < y ? -1 : 1
  }
  return 0
}

export function isNewer(candidate: string, current: string): boolean {
  return compareVersions(candidate, current) > 0
}

export interface ReleaseAsset {
  name: string
  url: string
  size: number
}

export interface Release {
  version: string
  name: string
  notes: string
  pageUrl: string
  publishedAt: string
  assets: ReleaseAsset[]
}

/** Shape of the GitHub Releases API response, narrowed to what is used. */
interface GithubRelease {
  tag_name?: string
  name?: string
  body?: string
  html_url?: string
  published_at?: string
  draft?: boolean
  prerelease?: boolean
  assets?: Array<{ name?: string; browser_download_url?: string; size?: number }>
}

export function parseRelease(json: unknown): Release | null {
  const r = json as GithubRelease
  if (!r || typeof r !== 'object') return null
  // Drafts are not published, and prereleases are opt-in only.
  if (r.draft || r.prerelease) return null
  const version = (r.tag_name ?? '').replace(/^v/i, '')
  if (!parseVersion(version)) return null

  return {
    version,
    name: r.name ?? `Version ${version}`,
    notes: r.body ?? '',
    pageUrl: r.html_url ?? '',
    publishedAt: r.published_at ?? '',
    assets: (r.assets ?? [])
      .filter((a) => a.name && a.browser_download_url)
      .map((a) => ({ name: a.name!, url: a.browser_download_url!, size: a.size ?? 0 })),
  }
}

/** Picks the installer matching this platform and architecture. */
export function assetFor(
  release: Release,
  platform: NodeJS.Platform,
  arch: string
): ReleaseAsset | null {
  const assets = release.assets
  if (platform === 'win32') {
    // Two installers ship for Windows now, and find() would otherwise pick
    // whichever the release happened to list first. Prefer the web stub: it is
    // about a megabyte and fetches the rest while it runs, so an update is a
    // small download either way. Fall back to the full installer.
    const exes = assets.filter((a) => a.name.endsWith('.exe'))
    return exes.find((a) => /web[-. ]?setup/i.test(a.name)) ?? exes[0] ?? null
  }
  if (platform === 'darwin') {
    const dmgs = assets.filter((a) => a.name.endsWith('.dmg'))
    // Apple Silicon builds are marked arm64; anything else is the Intel build.
    const wanted = arch === 'arm64'
      ? dmgs.find((a) => /arm64/i.test(a.name))
      : dmgs.find((a) => !/arm64/i.test(a.name))
    return wanted ?? dmgs[0] ?? null
  }
  // AppImage on Linux: it is the only format that runs on any distribution and
  // needs no package manager, so it is what an in-app update can actually apply.
  // Architecture matters as much as on macOS, since an x64 build will not run on
  // an arm64 machine.
  const images = assets.filter((a) => a.name.endsWith('.AppImage'))
  const wanted = arch === 'arm64'
    ? images.find((a) => /arm64|aarch64/i.test(a.name))
    : images.find((a) => !/arm64|aarch64/i.test(a.name))
  return wanted ?? images[0] ?? null
}
