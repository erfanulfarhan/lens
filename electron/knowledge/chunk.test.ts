import { describe, expect, it } from 'vitest'
import { chunkText, cosineSimilarity, estimateTokens, selectWithinBudget } from './chunk.js'

describe('chunkText', () => {
  it('keeps small docs as one chunk', () => {
    const chunks = chunkText('a.md', 'one paragraph only.')
    expect(chunks).toHaveLength(1)
    expect(chunks[0].source).toBe('a.md')
  })

  it('splits long docs into multiple chunks', () => {
    const para = Array.from({ length: 40 }, (_, i) => `Paragraph number ${i} with several words in it.`).join('\n\n')
    const chunks = chunkText('big.md', para, 100, 20)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((c) => c.tokens <= 130)).toBe(true)
  })

  it('hard-splits a single oversized paragraph', () => {
    const huge = 'word '.repeat(2000)
    const chunks = chunkText('huge.md', huge, 200)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((c) => c.tokens <= 240)).toBe(true)
  })
})

describe('cosineSimilarity', () => {
  it('is 1 for identical direction and 0 for orthogonal', () => {
    expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })
})

describe('selectWithinBudget', () => {
  const mk = (tokens: number, text: string) => ({ source: 's', text, tokens })

  it('takes the highest scores first and respects the budget', () => {
    const picked = selectWithinBudget(
      [
        { chunk: mk(100, 'low'), score: 0.1 },
        { chunk: mk(100, 'high'), score: 0.9 },
        { chunk: mk(100, 'mid'), score: 0.5 },
      ],
      200
    )
    expect(picked.map((c) => c.text)).toEqual(['high', 'mid'])
  })

  it('skips a chunk too big to fit but keeps trying smaller ones', () => {
    const picked = selectWithinBudget(
      [
        { chunk: mk(500, 'toobig'), score: 0.9 },
        { chunk: mk(50, 'fits'), score: 0.5 },
      ],
      100
    )
    expect(picked.map((c) => c.text)).toEqual(['fits'])
  })
})

describe('estimateTokens', () => {
  it('scales with length', () => {
    expect(estimateTokens('four')).toBe(1)
    expect(estimateTokens('a'.repeat(400))).toBe(100)
  })
})
