import { dhash, hammingDistance } from './dhash.js'

export interface ScreenChangeOptions {
  /** Bits of a 64-bit hash that must differ before it counts as a new screen. */
  threshold: number
  /** The screen must then hold still this long, so scrolling does not fire. */
  stabilityMs: number
}

export const SCREEN_DEFAULTS: ScreenChangeOptions = {
  threshold: 12,
  stabilityMs: 800,
}

/**
 * Fires once per settled screen change. The two-phase design (moved, then
 * stopped moving) is what separates "a new problem appeared" from "the user is
 * scrolling through a document".
 */
export class ScreenChangeTrigger {
  private lastFiredHash: bigint | null = null
  private pending: { hash: bigint; since: number } | null = null

  constructor(private opts: ScreenChangeOptions = SCREEN_DEFAULTS) {}

  /** Feed a downscaled 9x8 BGRA frame. Returns true when a change settles. */
  feed(bgra: Uint8Array, now: number): boolean {
    const hash = dhash(bgra)

    if (this.lastFiredHash === null) {
      this.lastFiredHash = hash
      return false
    }

    const movedFromBaseline =
      hammingDistance(hash, this.lastFiredHash) >= this.opts.threshold

    if (!movedFromBaseline) {
      this.pending = null
      return false
    }

    // Still settling: restart the clock whenever the frame keeps changing.
    if (!this.pending || hammingDistance(hash, this.pending.hash) > 2) {
      this.pending = { hash, since: now }
      return false
    }

    if (now - this.pending.since >= this.opts.stabilityMs) {
      this.lastFiredHash = hash
      this.pending = null
      return true
    }
    return false
  }

  reset(): void {
    this.lastFiredHash = null
    this.pending = null
  }
}
