export interface AudioTurnOptions {
  /** They must have been speaking at least this long for a turn to count. */
  minSpeechMs: number
  /** Silence after that speech which marks the end of their turn. */
  silenceMs: number
}

export const AUDIO_DEFAULTS: AudioTurnOptions = {
  minSpeechMs: 1500,
  silenceMs: 600,
}

export type Speaker = 'them' | 'you'

/**
 * Detects the moment the other party finishes a turn.
 *
 * Because mic and system audio arrive as two separate streams, we know who is
 * speaking without any diarization: system audio is them, mic is you. While you
 * are talking the trigger stays suppressed, since you speaking is not a cue to
 * interrupt you.
 */
export class AudioTurnTrigger {
  private speechStartedAt: number | null = null
  private lastSpeechAt: number | null = null
  private youSpeakingUntil = 0

  constructor(private opts: AudioTurnOptions = AUDIO_DEFAULTS) {}

  /** Voice activity sample from either stream. */
  onVoiceActivity(speaker: Speaker, active: boolean, now: number): void {
    if (speaker === 'you') {
      // Hold suppression briefly past the last mic activity so a pause
      // mid-sentence does not open a window for the assistant to butt in.
      if (active) this.youSpeakingUntil = now + this.opts.silenceMs
      return
    }

    if (active) {
      this.speechStartedAt ??= now
      this.lastSpeechAt = now
    }
  }

  /** Call on a timer. Returns true exactly once per completed turn. */
  poll(now: number): boolean {
    if (this.speechStartedAt === null || this.lastSpeechAt === null) return false
    if (now < this.youSpeakingUntil) return false

    const spokeLongEnough = this.lastSpeechAt - this.speechStartedAt >= this.opts.minSpeechMs
    const wentQuiet = now - this.lastSpeechAt >= this.opts.silenceMs

    if (spokeLongEnough && wentQuiet) {
      this.reset()
      return true
    }
    // Too short to be a real turn, and already quiet: discard it.
    if (!spokeLongEnough && wentQuiet) this.reset()
    return false
  }

  reset(): void {
    this.speechStartedAt = null
    this.lastSpeechAt = null
  }
}
