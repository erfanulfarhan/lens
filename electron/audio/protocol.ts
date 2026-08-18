/** Events the Swift helper writes, one JSON object per line on stdout. */
export type AudioEvent =
  | { type: 'ready'; sampleRate: number }
  | { type: 'voice'; source: 'system' | 'mic'; active: boolean }
  | { type: 'transcript'; source: 'system' | 'mic'; text: string; isFinal: boolean }
  | { type: 'error'; message: string }
  | { type: 'stopped' }

/**
 * Parses newline-delimited JSON from a byte stream, keeping any partial line for
 * the next chunk. A stream can split a line anywhere, so the leftover must be
 * carried across calls or events are silently lost.
 */
export class LineParser {
  private buffer = ''

  push(chunk: string): AudioEvent[] {
    this.buffer += chunk
    const events: AudioEvent[] = []

    let nl: number
    while ((nl = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, nl).trim()
      this.buffer = this.buffer.slice(nl + 1)
      if (!line) continue
      try {
        events.push(JSON.parse(line) as AudioEvent)
      } catch {
        // The helper only writes JSON; a malformed line means a truncated write.
      }
    }
    return events
  }
}

/**
 * Assembles transcript fragments into a readable, speaker-attributed log.
 *
 * Because the microphone and system audio are captured separately, attribution
 * is free: system audio is the other people, the mic is the user. No diarisation
 * model is involved, which is what makes this fast and reliable.
 */
export interface TranscriptLine {
  speaker: 'them' | 'you'
  text: string
  final: boolean
}

export class TranscriptLog {
  private lines: TranscriptLine[] = []
  /** The in-progress line per source, replaced as recognition refines it. */
  private pending: Partial<Record<'them' | 'you', string>> = {}

  apply(event: AudioEvent): void {
    if (event.type !== 'transcript') return
    const speaker = event.source === 'system' ? 'them' : 'you'

    if (event.isFinal) {
      const text = event.text.trim()
      if (text) this.lines.push({ speaker, text, final: true })
      delete this.pending[speaker]
    } else {
      this.pending[speaker] = event.text
    }
  }

  /** Settled lines plus whatever is currently being said. */
  current(): TranscriptLine[] {
    const live: TranscriptLine[] = []
    for (const speaker of ['them', 'you'] as const) {
      const text = this.pending[speaker]?.trim()
      if (text) live.push({ speaker, text, final: false })
    }
    return [...this.lines, ...live]
  }

  /** The recent conversation as plain text, for sending to the model. */
  recentText(maxChars = 1200): string {
    const rendered = this.current()
      .map((l) => `${l.speaker === 'them' ? 'Them' : 'You'}: ${l.text}`)
      .join('\n')
    return rendered.length <= maxChars ? rendered : rendered.slice(-maxChars)
  }

  /** The last thing the other party said, which is usually the question. */
  lastFromThem(): string {
    for (let i = this.lines.length - 1; i >= 0; i--) {
      if (this.lines[i].speaker === 'them') return this.lines[i].text
    }
    return this.pending.them?.trim() ?? ''
  }

  clear(): void {
    this.lines = []
    this.pending = {}
  }

  get size(): number {
    return this.lines.length
  }
}
