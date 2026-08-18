import { describe, expect, it } from 'vitest'
import { recommendModels, usableMemoryGb, type SystemSpec } from './recommend.js'

const spec = (p: Partial<SystemSpec>): SystemSpec => ({
  ramGb: 16, vramGb: 0, unifiedMemory: false, ...p,
})

describe('usableMemoryGb', () => {
  it('uses VRAM when there is a real GPU', () => {
    expect(usableMemoryGb(spec({ vramGb: 12, ramGb: 16 }))).toBe(12)
  })

  it('budgets a share of unified memory on Apple Silicon', () => {
    // 16GB Mac: the OS and apps need room, so not all of it is available.
    expect(usableMemoryGb(spec({ ramGb: 16, unifiedMemory: true }))).toBeCloseTo(10.4)
  })

  it('reserves headroom on a PC with integrated graphics', () => {
    expect(usableMemoryGb(spec({ ramGb: 16 }))).toBeCloseTo(8.4)
  })
})

describe('recommendModels', () => {
  it('recommends a 12B-class model for a 12GB GPU', () => {
    const r = recommendModels(spec({ vramGb: 12, gpuName: 'RTX 3060' }))
    expect(r.best?.tag).toBe('gemma3:12b')
    expect(r.reason).toContain('RTX 3060')
  })

  it('recommends a large model for a 24GB GPU', () => {
    expect(recommendModels(spec({ vramGb: 24 })).best?.tag).toBe('qwen2.5vl:32b')
  })

  it('recommends a small model for a 6GB GPU', () => {
    const r = recommendModels(spec({ vramGb: 6 }))
    expect(r.best?.needsGb).toBeLessThanOrEqual(6)
    expect(r.best?.vision).toBe(true)
  })

  it('handles a 16GB Apple Silicon Mac', () => {
    const r = recommendModels(spec({ ramGb: 16, unifiedMemory: true }))
    expect(r.best?.tag).toBe('gemma3:12b')
    expect(r.reason).toContain('unified memory')
  })

  it('tells a weak machine to use an API key instead', () => {
    const r = recommendModels(spec({ ramGb: 4 }))
    expect(r.best).toBeNull()
    expect(r.reason).toContain('API key')
  })

  it('offers alternatives ordered strongest first', () => {
    const r = recommendModels(spec({ vramGb: 12 }))
    expect(r.alternatives.length).toBeGreaterThan(0)
    const sizes = r.alternatives.map((m) => m.needsGb)
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes)
  })
})
