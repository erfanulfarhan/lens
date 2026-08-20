import { describe, expect, it } from 'vitest'
import { isUniformBitmap } from './blank-frame.js'

/** BGRA/RGBA pixels, which is what NativeImage.toBitmap() produces. */
const px = (pixels: Array<[number, number, number]>): Uint8Array =>
  new Uint8Array(pixels.flatMap(([r, g, b]) => [r, g, b, 255]))

describe('isUniformBitmap', () => {
  it('flags the all-black frame macOS returns when it refuses a capture', () => {
    // The exact shape of the bug: correctly sized, not empty, entirely black.
    const black = px(Array.from({ length: 64 }, () => [0, 0, 0] as [number, number, number]))
    expect(isUniformBitmap(black)).toBe(true)
  })

  it('flags a uniform frame of any colour, not just black', () => {
    const grey = px(Array.from({ length: 32 }, () => [18, 18, 18] as [number, number, number]))
    expect(isUniformBitmap(grey)).toBe(true)
  })

  it('passes a real screenshot, which always varies somewhere', () => {
    const real = px([
      [12, 14, 20],
      [12, 14, 20],
      [200, 150, 79],
      [12, 14, 20],
    ])
    expect(isUniformBitmap(real)).toBe(false)
  })

  it('detects variation in the final pixel, not just the first few', () => {
    const pixels: Array<[number, number, number]> = Array.from({ length: 63 }, () => [0, 0, 0])
    pixels.push([1, 0, 0])
    expect(isUniformBitmap(px(pixels))).toBe(false)
  })

  it('ignores the alpha channel, which is opaque in every capture', () => {
    const varyingAlpha = new Uint8Array([0, 0, 0, 255, 0, 0, 0, 12, 0, 0, 0, 200])
    expect(isUniformBitmap(varyingAlpha)).toBe(true)
  })

  it('treats a degenerate buffer as uniform rather than throwing', () => {
    expect(isUniformBitmap(new Uint8Array([]))).toBe(true)
    expect(isUniformBitmap(new Uint8Array([1, 2, 3, 4]))).toBe(true)
  })
})
