import { describe, expect, it } from 'vitest'
import { checkForUpdate } from './checker.js'

const release = (over: Record<string, unknown> = {}) => ({
  tag_name: 'v0.2.0',
  name: 'Lens 0.2.0',
  body: '## Fixed\n\n- A thing\n- Another thing\n',
  html_url: 'https://github.com/erfanulfarhan/lens/releases/tag/v0.2.0',
  assets: [
    { name: 'Lens-0.2.0-arm64.dmg', browser_download_url: 'https://d/arm64.dmg', size: 5 },
    { name: 'Lens-Setup-0.2.0.exe', browser_download_url: 'https://d/win.exe', size: 6 },
  ],
  ...over,
})

const fakeFetch = (body: unknown, ok = true, status = 200) =>
  (async () => ({ ok, status, json: async () => body })) as unknown as typeof fetch

describe('checkForUpdate', () => {
  it('reports an available update with the right installer', async () => {
    const s = await checkForUpdate('0.1.1', 'darwin', 'arm64', fakeFetch(release()))
    expect(s.state).toBe('available')
    expect(s.release?.version).toBe('0.2.0')
    expect(s.asset?.name).toContain('arm64')
  })

  it('says current when the running version matches or is ahead', async () => {
    expect((await checkForUpdate('0.2.0', 'darwin', 'arm64', fakeFetch(release()))).state).toBe('current')
    expect((await checkForUpdate('0.3.0', 'darwin', 'arm64', fakeFetch(release()))).state).toBe('current')
  })

  it('ignores a prerelease', async () => {
    const s = await checkForUpdate('0.1.1', 'win32', 'x64', fakeFetch(release({ prerelease: true })))
    expect(s.state).toBe('current')
  })

  // Being offline is normal and must not present as a fault in the app.
  it('reports an error without throwing when the network fails', async () => {
    const boom = (async () => { throw new Error('offline') }) as unknown as typeof fetch
    const s = await checkForUpdate('0.1.1', 'darwin', 'arm64', boom)
    expect(s.state).toBe('error')
    expect(s.message).toBe('offline')
  })

  it('reports an error on a bad response', async () => {
    const s = await checkForUpdate('0.1.1', 'darwin', 'arm64', fakeFetch({}, false, 403))
    expect(s.state).toBe('error')
    expect(s.message).toContain('403')
  })

  it('trims the notes to something a prompt can show', async () => {
    const long = release({ body: Array.from({ length: 40 }, (_, i) => `- line ${i}`).join('\n') })
    const s = await checkForUpdate('0.1.1', 'win32', 'x64', fakeFetch(long))
    expect(s.release!.notes.split('\n').length).toBeLessThanOrEqual(8)
    expect(s.release!.notes.length).toBeLessThanOrEqual(700)
  })

  it('drops markdown headings from the notes', async () => {
    const s = await checkForUpdate('0.1.1', 'win32', 'x64', fakeFetch(release()))
    expect(s.release!.notes).not.toContain('## Fixed')
    expect(s.release!.notes).toContain('A thing')
  })
})
