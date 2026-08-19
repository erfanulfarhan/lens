export type ThemeChoice = 'dark' | 'light' | 'system'

/**
 * Lens was dark only, which suits an overlay at night and fights a bright screen
 * in daylight. The choice is stored; "system" follows the operating system so it
 * changes with it rather than needing to be set twice a day.
 */
export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): 'dark' | 'light' {
  if (choice === 'system') return systemPrefersDark ? 'dark' : 'light'
  return choice
}

export function readStoredTheme(get: (k: string) => string | null): ThemeChoice {
  const raw = get('lens-theme')
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'dark'
}

/** Applied as an attribute so the stylesheet owns the palette, not JavaScript. */
export function applyTheme(root: { setAttribute(k: string, v: string): void }, theme: 'dark' | 'light'): void {
  root.setAttribute('data-theme', theme)
}
