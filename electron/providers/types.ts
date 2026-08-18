/** A chunk of the stable, cacheable prefix (operating rules, persona, knowledge). */
export interface SystemBlock {
  /** Stable across requests; only changes when the underlying file changes. */
  text: string
  /** Marks the end of a cacheable prefix segment. */
  cacheBreakpoint?: boolean
}

export interface Screenshot {
  mediaType: 'image/png' | 'image/jpeg'
  base64: string
}

export interface Turn {
  role: 'user' | 'assistant'
  text: string
}

/**
 * Everything volatile lives here and is rendered AFTER the last cache
 * breakpoint. Putting a screenshot ahead of a breakpoint silently destroys
 * the cache on every request, so `assembleUserContent` is the only place
 * allowed to position it.
 */
export interface AskContext {
  system: SystemBlock[]
  history: Turn[]
  screenshot?: Screenshot
  transcript?: string
  question: string
}

export interface AskResult {
  text: string
  stopReason: string | null
  usage: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
  }
  /** Provider that actually served the request, for the debug HUD. */
  servedBy: string
}

export interface Provider {
  readonly name: string
  readonly supportsCaching: boolean
  readonly supportsVision: boolean
  /**
   * Width to downscale screenshots to before sending. Provider-specific
   * because free tiers meter tokens per minute and a retina screenshot is
   * mostly wasted detail anyway.
   */
  readonly maxImageWidth: number
  /** Model ids this credential can actually reach. */
  listModels?(): Promise<string[]>
  /**
   * Ranked best-first shortlist worth offering. Empty means "ask the endpoint",
   * which is right for Ollama where the installed set is the shortlist.
   */
  readonly candidateModels: string[]
  /** Sends a known image and checks the answer. Proves usability, not naming. */
  probeVision?(model: string): Promise<boolean>
  ask(
    ctx: AskContext,
    onDelta: (text: string) => void,
    signal: AbortSignal,
    /** Called repeatedly while a reasoning model is thinking, before the answer. */
    onThinking?: () => void
  ): Promise<AskResult>
}
