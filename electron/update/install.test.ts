import { describe, expect, it } from 'vitest'
import { canSelfInstall } from './install.js'

describe('canSelfInstall', () => {
  // Windows NSIS can replace a closed app unsigned; macOS needs a Developer ID,
  // so claiming a silent update there would fail at the final step.
  it('is true only on Windows', () => {
    expect(canSelfInstall('win32')).toBe(true)
    expect(canSelfInstall('darwin')).toBe(false)
    expect(canSelfInstall('linux')).toBe(false)
  })
})
