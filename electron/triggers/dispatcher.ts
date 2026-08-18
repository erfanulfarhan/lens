export type TriggerSource = 'hotkey' | 'text' | 'voice' | 'audio-turn' | 'screen-change'

/** Manual beats conversation beats screen, so the weaker signal never cancels the stronger. */
const PRIORITY: Record<TriggerSource, number> = {
  hotkey: 3,
  voice: 3,
  text: 3,
  'audio-turn': 2,
  'screen-change': 1,
}

export interface DispatcherOptions {
  /** Minimum gap between two automatic answers. */
  cooldownMs: number
}

export const DISPATCHER_DEFAULTS: DispatcherOptions = { cooldownMs: 6000 }

export interface DispatchDecision {
  run: boolean
  reason: 'ok' | 'cooldown' | 'busy-lower-priority'
  /** Set when an in-flight request should be cancelled to make way. */
  cancelInFlight: boolean
}

/**
 * The one place that decides whether a trigger becomes an API call. Ambient
 * mode is the noisiest design we could have picked, so every suppression rule
 * lives here where it can be tested without hardware.
 */
export class Dispatcher {
  private lastRunAt = -Infinity
  private inFlight: TriggerSource | null = null

  constructor(private opts: DispatcherOptions = DISPATCHER_DEFAULTS) {}

  request(source: TriggerSource, now: number): DispatchDecision {
    if (this.inFlight) {
      if (PRIORITY[source] > PRIORITY[this.inFlight]) {
        return { run: true, reason: 'ok', cancelInFlight: true }
      }
      return { run: false, reason: 'busy-lower-priority', cancelInFlight: false }
    }

    // Explicit human actions (hotkey, typing, speaking) ignore the cooldown.
    const manual = source === 'hotkey' || source === 'text' || source === 'voice'
    if (!manual && now - this.lastRunAt < this.opts.cooldownMs) {
      return { run: false, reason: 'cooldown', cancelInFlight: false }
    }

    return { run: true, reason: 'ok', cancelInFlight: false }
  }

  started(source: TriggerSource, now: number): void {
    this.inFlight = source
    this.lastRunAt = now
  }

  finished(): void {
    this.inFlight = null
  }

  get busy(): boolean {
    return this.inFlight !== null
  }
}
