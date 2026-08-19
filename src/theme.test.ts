import { describe, expect, it } from 'vitest'
import { applyTheme, readStoredTheme, resolveTheme } from './theme.js'

describe('resolveTheme', () => {
  it('follows the system when asked to', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('ignores the system when a theme is chosen explicitly', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

describe('readStoredTheme', () => {
  it('reads a stored choice', () => {
    expect(readStoredTheme(() => 'light')).toBe('light')
    expect(readStoredTheme(() => 'system')).toBe('system')
  })

  // Dark is the sensible default for an overlay that floats over other windows.
  it('falls back to dark for anything unexpected', () => {
    expect(readStoredTheme(() => null)).toBe('dark')
    expect(readStoredTheme(() => 'chartreuse')).toBe('dark')
  })
})

describe('applyTheme', () => {
  it('sets the attribute the stylesheet keys off', () => {
    const seen: Record<string, string> = {}
    applyTheme({ setAttribute: (k, v) => { seen[k] = v } }, 'light')
    expect(seen['data-theme']).toBe('light')
  })
})
