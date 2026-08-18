/**
 * Difference hash over a 9x8 grayscale grid, yielding 64 bits.
 * Chosen over a pixel diff because it ignores compression noise and small
 * cursor movement, which would otherwise fire the screen trigger constantly.
 */
export function dhash(bgra: Uint8Array, width = 9, height = 8): bigint {
  let hash = 0n
  let bit = 0n

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const left = luma(bgra, (y * width + x) * 4)
      const right = luma(bgra, (y * width + x + 1) * 4)
      if (left > right) hash |= 1n << bit
      bit++
    }
  }
  return hash
}

function luma(bgra: Uint8Array, i: number): number {
  // Electron nativeImage bitmaps are BGRA on macOS.
  return 0.114 * bgra[i] + 0.587 * bgra[i + 1] + 0.299 * bgra[i + 2]
}

export function hammingDistance(a: bigint, b: bigint): number {
  let diff = a ^ b
  let count = 0
  while (diff) {
    count += Number(diff & 1n)
    diff >>= 1n
  }
  return count
}
