import { rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkForUpdate } from './checker.js'
import { downloadInstaller } from './download.js'

const live = process.env.LENS_LIVE === '1' ? describe : describe.skip

live('downloading the real installer', () => {
  it('fetches the published asset and reports progress', async () => {
    const log = (m: string) => process.stderr.write(`  ${m}\n`)
    const status = await checkForUpdate('0.1.0', 'darwin', 'arm64')
    expect(status.asset).toBeTruthy()
    log(`asset: ${status.asset!.name} (${Math.round(status.asset!.size / 1e6)}MB)`)

    const dir = join(tmpdir(), 'lens-update-test')
    const seen: number[] = []
    const file = await downloadInstaller(status.asset!.url, dir, (p) => {
      if (!seen.length || p.percent >= seen.at(-1)! + 25) seen.push(p.percent)
    })

    const size = (await stat(file)).size
    log(`downloaded to ${file}`)
    log(`size ${size} bytes, expected ${status.asset!.size}`)
    log(`progress steps: ${seen.join(', ')}`)

    expect(size).toBe(status.asset!.size)
    expect(seen.length).toBeGreaterThan(1)
    await rm(dir, { recursive: true, force: true })
  }, 300000)
})
