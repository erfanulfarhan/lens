import { describe, expect, it } from 'vitest'
import { AudioSupervisor } from './supervisor.js'

describe('AudioSupervisor availability', () => {
  // The helper ships in the bundle on every platform but is a macOS binary, so a
  // file-exists check alone would advertise listening on Windows and Linux.
  it('is unavailable off macOS even when the file is present', () => {
    const realFile = new URL(import.meta.url).pathname
    expect(new AudioSupervisor(realFile, 'win32').available).toBe(false)
    expect(new AudioSupervisor(realFile, 'linux').available).toBe(false)
    expect(new AudioSupervisor(realFile, 'darwin').available).toBe(true)
  })

  it('is unavailable on macOS when the helper is missing', () => {
    expect(new AudioSupervisor('/nope/lens-audio', 'darwin').available).toBe(false)
  })

  it('does not start when unavailable', () => {
    const s = new AudioSupervisor('/nope/lens-audio', 'linux')
    s.start()
    expect(s.running).toBe(false)
  })
})
