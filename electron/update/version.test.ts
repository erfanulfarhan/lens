import { describe, expect, it } from 'vitest'
import { assetFor, compareVersions, isNewer, parseRelease, parseVersion } from './version.js'

describe('parseVersion', () => {
  it('accepts a bare or v-prefixed version', () => {
    expect(parseVersion('1.2.3')).toMatchObject({ major: 1, minor: 2, patch: 3, pre: [] })
    expect(parseVersion('v0.1.1')).toMatchObject({ major: 0, minor: 1, patch: 1 })
  })

  it('splits prerelease identifiers, keeping numbers numeric', () => {
    expect(parseVersion('1.0.0-beta.2')?.pre).toEqual(['beta', 2])
  })

  it('rejects nonsense', () => {
    expect(parseVersion('not-a-version')).toBeNull()
    expect(parseVersion('1.2')).toBeNull()
  })
})

describe('compareVersions', () => {
  it('orders by major, minor then patch', () => {
    expect(compareVersions('1.0.0', '0.9.9')).toBeGreaterThan(0)
    expect(compareVersions('0.1.2', '0.1.10')).toBeLessThan(0)
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0)
  })

  // A prerelease must never look newer than the final of the same version, or
  // users on a stable build would be offered a beta as an upgrade.
  it('ranks a release above its own prerelease', () => {
    expect(compareVersions('1.0.0', '1.0.0-beta.1')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0-beta.1', '1.0.0')).toBeLessThan(0)
  })

  it('orders prereleases against each other', () => {
    expect(compareVersions('1.0.0-beta.2', '1.0.0-beta.1')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0)
  })
})

describe('isNewer', () => {
  it('is true only for a genuinely newer version', () => {
    expect(isNewer('0.1.2', '0.1.1')).toBe(true)
    expect(isNewer('0.1.1', '0.1.1')).toBe(false)
    expect(isNewer('0.1.0', '0.1.1')).toBe(false)
  })
})

describe('parseRelease', () => {
  const base = {
    tag_name: 'v0.2.0',
    name: 'Lens 0.2.0',
    body: 'Fixed things.',
    html_url: 'https://github.com/x/y/releases/tag/v0.2.0',
    published_at: '2026-08-19T00:00:00Z',
    assets: [
      { name: 'Lens-0.2.0-arm64.dmg', browser_download_url: 'https://d/arm64.dmg', size: 10 },
      { name: 'Lens-0.2.0.dmg', browser_download_url: 'https://d/x64.dmg', size: 11 },
      { name: 'Lens-Setup-0.2.0.exe', browser_download_url: 'https://d/win.exe', size: 12 },
    ],
  }

  it('reads a published release', () => {
    const r = parseRelease(base)
    expect(r).toMatchObject({ version: '0.2.0', name: 'Lens 0.2.0' })
    expect(r?.assets).toHaveLength(3)
  })

  it('ignores drafts and prereleases', () => {
    expect(parseRelease({ ...base, draft: true })).toBeNull()
    expect(parseRelease({ ...base, prerelease: true })).toBeNull()
  })

  it('rejects a release with an unusable tag', () => {
    expect(parseRelease({ ...base, tag_name: 'nightly' })).toBeNull()
    expect(parseRelease(null)).toBeNull()
  })

  it('drops assets missing a name or url', () => {
    const r = parseRelease({ ...base, assets: [{ name: 'x.dmg' }, ...base.assets] })
    expect(r?.assets).toHaveLength(3)
  })
})

describe('assetFor', () => {
  const release = parseRelease({
    tag_name: 'v0.2.0',
    assets: [
      { name: 'Lens-0.2.0-arm64.dmg', browser_download_url: 'https://d/arm64.dmg', size: 1 },
      { name: 'Lens-0.2.0.dmg', browser_download_url: 'https://d/x64.dmg', size: 1 },
      { name: 'Lens-Setup-0.2.0.exe', browser_download_url: 'https://d/win.exe', size: 1 },
    ],
  })!

  it('picks the Apple Silicon build on arm64', () => {
    expect(assetFor(release, 'darwin', 'arm64')?.name).toContain('arm64')
  })

  // Handing an Intel Mac the arm64 build would install something that cannot run.
  it('picks the Intel build on x64', () => {
    expect(assetFor(release, 'darwin', 'x64')?.name).toBe('Lens-0.2.0.dmg')
  })

  it('picks the installer on Windows', () => {
    expect(assetFor(release, 'win32', 'x64')?.name).toBe('Lens-Setup-0.2.0.exe')
  })

  it('returns null when nothing matches', () => {
    const empty = parseRelease({ tag_name: 'v1.0.0', assets: [] })!
    expect(assetFor(empty, 'darwin', 'arm64')).toBeNull()
  })
})

describe('assetFor on Linux', () => {
  const release = parseRelease({
    tag_name: 'v0.1.3',
    assets: [
      { name: 'Lens-0.1.3.AppImage', browser_download_url: 'https://d/x64.AppImage', size: 1 },
      { name: 'Lens-0.1.3-arm64.AppImage', browser_download_url: 'https://d/arm64.AppImage', size: 1 },
      { name: 'lens_0.1.3_amd64.deb', browser_download_url: 'https://d/amd64.deb', size: 1 },
      { name: 'lens-0.1.3.x86_64.rpm', browser_download_url: 'https://d/x86.rpm', size: 1 },
    ],
  })!

  // AppImage is the only Linux format an in-app update can apply without a
  // package manager and root.
  it('prefers the AppImage over deb or rpm', () => {
    expect(assetFor(release, 'linux', 'x64')?.name).toBe('Lens-0.1.3.AppImage')
  })

  it('picks the arm64 AppImage on arm64', () => {
    expect(assetFor(release, 'linux', 'arm64')?.name).toContain('arm64')
  })

  it('does not hand an x64 machine the arm64 build', () => {
    expect(assetFor(release, 'linux', 'x64')?.name).not.toContain('arm64')
  })

  it('returns null when no AppImage is published', () => {
    const only = parseRelease({
      tag_name: 'v1.0.0',
      assets: [{ name: 'lens_1.0.0_amd64.deb', browser_download_url: 'https://d/a.deb', size: 1 }],
    })!
    expect(assetFor(only, 'linux', 'x64')).toBeNull()
  })
})
