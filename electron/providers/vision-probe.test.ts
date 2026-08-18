import { describe, expect, it } from 'vitest'
import { probePassed, verifyVisionModels } from './vision-probe.js'

describe('probePassed', () => {
  it('accepts the right colour in any casing or sentence', () => {
    expect(probePassed('Red')).toBe(true)
    expect(probePassed('The square is red.')).toBe(true)
  })

  it('rejects a wrong or empty answer', () => {
    expect(probePassed('blue')).toBe(false)
    expect(probePassed('')).toBe(false)
  })
})

describe('verifyVisionModels', () => {
  it('keeps only passing models, in candidate order', async () => {
    const result = await verifyVisionModels(
      ['good-a', 'bad', 'good-b'],
      async (m) => m.startsWith('good')
    )
    expect(result).toEqual(['good-a', 'good-b'])
  })

  it('drops models whose probe throws', async () => {
    const result = await verifyVisionModels(['ok', 'explodes'], async (m) => {
      if (m === 'explodes') throw new Error('503')
      return true
    })
    expect(result).toEqual(['ok'])
  })

  it('probes every candidate exactly once', async () => {
    const seen: string[] = []
    await verifyVisionModels(['a', 'b', 'c', 'd', 'e'], async (m) => {
      seen.push(m)
      return true
    }, 2)
    expect(seen.sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('returns nothing when everything fails', async () => {
    expect(await verifyVisionModels(['a', 'b'], async () => false)).toEqual([])
  })
})
