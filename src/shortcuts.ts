/**
 * Keyboard shortcuts, written for the platform the user is actually on.
 *
 * The app hardcoded macOS glyphs, so Windows users were told to press ⌘, a key
 * their keyboard does not have. Electron's accelerator string is the single
 * source of truth; this renders it per platform.
 */
export type Platform = 'mac' | 'windows' | 'linux'

export function detectPlatform(ua: string = navigator.userAgent): Platform {
  if (/Mac|iPhone|iPad/i.test(ua)) return 'mac'
  if (/Win/i.test(ua)) return 'windows'
  return 'linux'
}

const MAC_KEYS: Record<string, string> = {
  CommandOrControl: '⌘', Command: '⌘', Control: '⌃', Alt: '⌥', Option: '⌥',
  Shift: '⇧', Space: 'Space', Escape: 'Esc', Enter: '↵', Backspace: '⌫',
}

const PC_KEYS: Record<string, string> = {
  CommandOrControl: 'Ctrl', Command: 'Win', Control: 'Ctrl', Alt: 'Alt', Option: 'Alt',
  Shift: 'Shift', Space: 'Space', Escape: 'Esc', Enter: 'Enter', Backspace: 'Backspace',
}

/** Turns "CommandOrControl+Shift+Space" into "⌘⇧Space" or "Ctrl+Shift+Space". */
export function formatAccelerator(accelerator: string, platform: Platform): string {
  const map = platform === 'mac' ? MAC_KEYS : PC_KEYS
  const parts = accelerator.split('+').map((p) => map[p] ?? p)
  // macOS writes modifiers as a glyph run with no separator; Windows and Linux
  // spell them out and join with plus signs.
  return platform === 'mac' ? parts.join('') : parts.join('+')
}

export interface Shortcut {
  keys: string
  action: string
  /** Where it works: globally, or only when the panel has focus. */
  scope: 'global' | 'panel'
}

/** The full list, for the shortcuts section. `askAccelerator` comes from main,
 *  because the registered key can differ if the preferred one was taken. */
export function shortcutList(platform: Platform, askAccelerator = 'CommandOrControl+Shift+Space'): Shortcut[] {
  const f = (a: string) => formatAccelerator(a, platform)
  return [
    { keys: f(askAccelerator), action: 'Capture the screen, then say what to do with it', scope: 'global' },
    { keys: f('CommandOrControl+Shift+H'), action: 'Show or hide the panel', scope: 'global' },
    { keys: f('Escape'), action: 'Hide the panel', scope: 'panel' },
    { keys: f('Enter'), action: 'Send your message', scope: 'panel' },
    { keys: f('Shift+Enter'), action: 'New line instead of sending', scope: 'panel' },
  ]
}
