import { describe, expect, it } from 'vitest'
import { COMMANDS, commandQuery, matchCommands, moveSelection, resolveCommand } from './commands.js'

describe('commandQuery', () => {
  it('reads the partial command after a leading slash', () => {
    expect(commandQuery('/')).toBe('')
    expect(commandQuery('/exp')).toBe('exp')
    expect(commandQuery('/EXPORT')).toBe('export')
  })

  // A slash mid-sentence is ordinary text: a URL or a fraction must not open a menu.
  it('ignores a slash that is not leading', () => {
    expect(commandQuery('what is https://x/y')).toBeNull()
    expect(commandQuery('2/3 of the time')).toBeNull()
    expect(commandQuery('/export the thing')).toBeNull()
    expect(commandQuery('hello')).toBeNull()
  })
})

describe('matchCommands', () => {
  it('lists everything for a bare slash', () => {
    expect(matchCommands('')).toHaveLength(COMMANDS.length)
  })

  it('ranks a prefix match above a substring one', () => {
    const names = matchCommands('s').map((c) => c.name)
    expect(names[0]).toBe('screen')
    expect(names).toContain('summarise')
  })

  it('puts an exact match first', () => {
    expect(matchCommands('new')[0].name).toBe('new')
  })

  it('accepts aliases, including American spelling', () => {
    expect(matchCommands('summarize')[0].name).toBe('summarise')
    expect(matchCommands('files')[0].name).toBe('docs')
  })

  it('falls back to searching the description', () => {
    expect(matchCommands('translate').map((c) => c.name)).toContain('translate')
    expect(matchCommands('zzzz')).toHaveLength(0)
  })
})

describe('resolveCommand', () => {
  it('resolves a complete command or an alias', () => {
    expect(resolveCommand('/export')?.id).toBe('export')
    expect(resolveCommand('/n')?.id).toBe('new')
  })

  it('returns nothing for a partial or unknown command', () => {
    expect(resolveCommand('/exp')).toBeNull()
    expect(resolveCommand('/nope')).toBeNull()
    expect(resolveCommand('hello')).toBeNull()
  })
})

describe('moveSelection', () => {
  it('wraps at both ends so the keyboard never dead-ends', () => {
    expect(moveSelection(0, -1, 3)).toBe(2)
    expect(moveSelection(2, 1, 3)).toBe(0)
    expect(moveSelection(0, 1, 3)).toBe(1)
  })

  it('is safe with an empty list', () => {
    expect(moveSelection(0, 1, 0)).toBe(0)
  })
})

describe('the command set itself', () => {
  it('has unique names and aliases', () => {
    const all = COMMANDS.flatMap((c) => [c.name, ...(c.aliases ?? [])])
    expect(new Set(all).size).toBe(all.length)
  })

  it('gives every screen command a prompt to send', () => {
    for (const c of COMMANDS.filter((c) => c.needsScreen)) {
      expect(c.prompt, `${c.name} needs a prompt`).toBeTruthy()
    }
  })
})
