import { describe, expect, it } from 'vitest'
import { detectPlatform, formatAccelerator, shortcutList } from './shortcuts.js'

describe('detectPlatform', () => {
  it('recognises macOS, Windows and Linux', () => {
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('mac')
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('windows')
    expect(detectPlatform('Mozilla/5.0 (X11; Linux x86_64)')).toBe('linux')
  })
})

describe('formatAccelerator', () => {
  it('uses command glyphs on macOS', () => {
    expect(formatAccelerator('CommandOrControl+Shift+Space', 'mac')).toBe('⌘⇧Space')
  })

  // Windows users were shown ⌘, a key their keyboard does not have.
  it('spells out modifiers on Windows', () => {
    expect(formatAccelerator('CommandOrControl+Shift+Space', 'windows')).toBe('Ctrl+Shift+Space')
  })

  it('maps Escape and Enter per platform', () => {
    expect(formatAccelerator('Escape', 'mac')).toBe('Esc')
    expect(formatAccelerator('Enter', 'windows')).toBe('Enter')
    expect(formatAccelerator('Enter', 'mac')).toBe('↵')
  })

  it('passes unknown keys through unchanged', () => {
    expect(formatAccelerator('CommandOrControl+J', 'windows')).toBe('Ctrl+J')
  })
})

describe('shortcutList', () => {
  it('reflects the accelerator actually registered', () => {
    const list = shortcutList('windows', 'CommandOrControl+Shift+J')
    expect(list[0].keys).toBe('Ctrl+Shift+J')
  })

  it('joins modifiers the platform way, with no stray separators', () => {
    const mac = shortcutList('mac').find((s) => s.action.startsWith('New line'))!
    expect(mac.keys).toBe('⇧↵')
    const win = shortcutList('windows').find((s) => s.action.startsWith('New line'))!
    expect(win.keys).toBe('Shift+Enter')
  })

  it('gives every entry an action and a scope', () => {
    for (const s of shortcutList('mac')) {
      expect(s.action.length).toBeGreaterThan(0)
      expect(['global', 'panel']).toContain(s.scope)
    }
  })
})
