import { describe, expect, it } from 'vitest'
import { formatElapsed, nextWord, THINKING_WORDS, WRITING_WORDS } from './thinkingWords.js'

describe('nextWord', () => {
  it('never repeats the current word', () => {
    // Deterministic random that always picks the first option.
    for (const current of THINKING_WORDS) {
      expect(nextWord(THINKING_WORDS, current, () => 0)).not.toBe(current)
    }
  })

  it('picks from the list when there is no current word', () => {
    expect(THINKING_WORDS).toContain(nextWord(THINKING_WORDS, null, () => 0.5))
  })

  it('handles single-item and empty lists', () => {
    expect(nextWord(['Only'], 'Only')).toBe('Only')
    expect(nextWord([], null)).toBe('')
  })

  it('stays within bounds at the top of the random range', () => {
    // Math.random() can return values very close to 1.
    expect(WRITING_WORDS).toContain(nextWord(WRITING_WORDS, null, () => 0.999999))
  })
})

describe('formatElapsed', () => {
  it('shows seconds under a minute', () => {
    expect(formatElapsed(0)).toBe('0s')
    expect(formatElapsed(7400)).toBe('7s')
  })

  it('shows minutes and seconds beyond a minute', () => {
    expect(formatElapsed(65_000)).toBe('1m 5s')
  })
})
