import { describe, expect, it } from 'vitest'
import { checkForUpdate } from './checker.js'

const live = process.env.LENS_LIVE === '1' ? describe : describe.skip

live('against the real GitHub release', () => {
  it('sees 0.1.1 as an update from 0.1.0', async () => {
    const log = (m: string) => process.stderr.write(`  ${m}\n`)
    const s = await checkForUpdate('0.1.0', 'darwin', 'arm64')
    log(`state=${s.state} latest=${s.release?.version} asset=${s.asset?.name}`)
    expect(s.state).toBe('available')
    expect(s.asset?.name).toMatch(/arm64\.dmg$/)
  }, 30000)

  it('reports current when already on the latest', async () => {
    const s = await checkForUpdate('99.0.0', 'win32', 'x64')
    expect(s.state).toBe('current')
  }, 30000)

  it('picks the .exe on Windows', async () => {
    const s = await checkForUpdate('0.1.0', 'win32', 'x64')
    expect(s.asset?.name).toMatch(/\.exe$/)
  }, 30000)
})
