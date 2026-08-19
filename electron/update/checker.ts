import { assetFor, isNewer, parseRelease, type Release, type ReleaseAsset } from './version.js'

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'current' | 'error'
  currentVersion: string
  release?: { version: string; name: string; notes: string; pageUrl: string }
  asset?: ReleaseAsset
  message?: string
  /** When the check last completed, so the UI can say how fresh this is. */
  checkedAt?: number
}

const API = 'https://api.github.com/repos/erfanulfarhan/lens/releases/latest'

/**
 * Asks GitHub whether a newer release exists.
 *
 * Reads the Releases API rather than embedding an update framework: the app is
 * not signed with a paid certificate, and an unsigned build cannot install an
 * update itself on macOS. Telling the user and handing them the right installer
 * is honest about that, and needs no server of its own.
 */
export async function checkForUpdate(
  currentVersion: string,
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
  fetchImpl: typeof fetch = fetch
): Promise<UpdateStatus> {
  try {
    const res = await fetchImpl(API, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'Lens' },
    })
    if (!res.ok) {
      return { state: 'error', currentVersion, message: `GitHub returned ${res.status}` }
    }

    const release = parseRelease(await res.json())
    if (!release) {
      return { state: 'current', currentVersion, checkedAt: Date.now() }
    }
    if (!isNewer(release.version, currentVersion)) {
      return { state: 'current', currentVersion, checkedAt: Date.now() }
    }

    return {
      state: 'available',
      currentVersion,
      checkedAt: Date.now(),
      release: summarise(release),
      asset: assetFor(release, platform, arch) ?? undefined,
    }
  } catch (err) {
    // Offline is the common case here, and it must not look like a failure of
    // the app itself.
    return { state: 'error', currentVersion, message: (err as Error).message }
  }
}

/** Release notes are markdown and can be long; keep the prompt readable. */
function summarise(release: Release): NonNullable<UpdateStatus['release']> {
  const notes = release.notes
    .split('\n')
    .filter((l) => l.trim() && !/^#{1,6}\s/.test(l))
    .slice(0, 8)
    .join('\n')
    .slice(0, 700)

  return { version: release.version, name: release.name, notes, pageUrl: release.pageUrl }
}
