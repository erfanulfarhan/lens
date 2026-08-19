import { describe, expect, it } from 'vitest'
import { advanceTyping, initialTypeState, readyForNextWord } from './typewriter.js'

/** Runs the machine until a predicate holds, guarding against a runaway loop. */
function run(target: string, steps: number, hold = 2) {
  let s = initialTypeState()
  const seen: string[] = []
  for (let i = 0; i < steps; i++) {
    s = advanceTyping(s, target, hold)
    seen.push(s.text)
  }
  return { state: s, seen }
}

describe('advanceTyping', () => {
  it('types one character at a time', () => {
    const { seen } = run('abc', 3)
    expect(seen).toEqual(['a', 'ab', 'abc'])
  })

  it('holds a finished word before erasing it', () => {
    const { state } = run('ab', 3, 2)
    expect(state.phase).toBe('holding')
    expect(state.text).toBe('ab')
  })

  it('erases one character at a time after holding', () => {
    let s = initialTypeState()
    // type 'ab', reach holding, exhaust the hold, then erase.
    for (let i = 0; i < 6; i++) s = advanceTyping(s, 'ab', 1)
    expect(s.phase).toBe('erasing')
    expect(s.text.length).toBeLessThan(2)
  })

  it('completes a full cycle and asks for the next word', () => {
    let s = initialTypeState()
    for (let i = 0; i < 40; i++) {
      s = advanceTyping(s, 'hi', 1)
      if (readyForNextWord(s)) break
    }
    expect(readyForNextWord(s)).toBe(true)
    expect(s.text).toBe('')
  })

  // If the word changes mid-type, appending would splice two words together.
  it('never mixes characters from a changed target', () => {
    let s = initialTypeState()
    s = advanceTyping(s, 'Spinning')   // 'S'
    s = advanceTyping(s, 'Spinning')   // 'Sp'
    s = advanceTyping(s, 'Marinating') // target changed
    expect('Marinating'.startsWith(s.text)).toBe(true)
  })
})

describe('readyForNextWord', () => {
  it('is false while there is text on screen', () => {
    expect(readyForNextWord({ text: 'ab', phase: 'typing', hold: 0 })).toBe(false)
    expect(readyForNextWord({ text: 'ab', phase: 'holding', hold: 3 })).toBe(false)
    expect(readyForNextWord({ text: 'a', phase: 'erasing', hold: 0 })).toBe(false)
  })

  it('is true only at the empty start of a typing phase', () => {
    expect(readyForNextWord({ text: '', phase: 'typing', hold: 0 })).toBe(true)
  })
})
