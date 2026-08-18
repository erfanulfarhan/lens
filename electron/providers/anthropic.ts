import Anthropic from '@anthropic-ai/sdk'
import type { AskContext, AskResult, Provider } from './types.js'
import { assembleUserContent } from './prompt.js'

const MODEL = 'claude-opus-5'

/** Fast mode runs the same model at up to 2.5x output tokens/sec. Opus 5 / 4.8 only. */
const FAST_MODE_BETA = 'fast-mode-2026-02-01'
/** Opus 5 can return stop_reason "refusal" on HTTP 200; this routes those to a fallback. */
const FALLBACK_BETA = 'server-side-fallback-2026-07-01'

/**
 * Answers are read at a glance, so a low cap is deliberate here rather than
 * cost-shaving. Streaming means we are not fighting HTTP timeouts either way.
 */
const MAX_TOKENS = 4096

export class AnthropicProvider implements Provider {
  readonly name = 'anthropic:claude-opus-5'
  readonly supportsCaching = true
  readonly supportsVision = true
  readonly maxImageWidth = 1400
  readonly candidateModels = [MODEL]

  private client: Anthropic
  private fastMode: boolean

  constructor(opts: { apiKey?: string; fastMode?: boolean } = {}) {
    // Zero-arg construction is intentional when no key is passed: the SDK also
    // resolves `ant auth login` profiles, so an unset ANTHROPIC_API_KEY does
    // not mean there are no credentials.
    this.client = opts.apiKey ? new Anthropic({ apiKey: opts.apiKey }) : new Anthropic()
    this.fastMode = opts.fastMode ?? true
  }

  async ask(
    ctx: AskContext,
    onDelta: (text: string) => void,
    signal: AbortSignal
  ): Promise<AskResult> {
    const params = this.buildParams(ctx, this.fastMode)

    try {
      return await this.run(params, onDelta, signal)
    } catch (err) {
      // Fast mode has its own rate limit, separate from standard Opus. Falling
      // back to standard speed invalidates the prompt cache, so only do it on 429.
      if (this.fastMode && err instanceof Anthropic.RateLimitError) {
        return await this.run(this.buildParams(ctx, false), onDelta, signal)
      }
      throw err
    }
  }

  /** Public so the cache-breakpoint invariant can be asserted directly. */
  buildParams(ctx: AskContext, fast: boolean) {
    const betas = [FALLBACK_BETA, ...(fast ? [FAST_MODE_BETA] : [])]

    // Render order is tools -> system -> messages, and any byte change in the
    // prefix invalidates everything after it. The breakpoint goes on the LAST
    // stable block; the screenshot and transcript land in messages, after it.
    const system = ctx.system.map((block) => ({
      type: 'text' as const,
      text: block.text,
      ...(block.cacheBreakpoint ? { cache_control: { type: 'ephemeral' as const } } : {}),
    }))

    const messages = [
      ...ctx.history.map((t) => ({ role: t.role, content: t.text })),
      { role: 'user' as const, content: assembleUserContent(ctx) },
    ]

    return {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      betas,
      fallbacks: 'default',
      // Effort is the real latency dial. Do NOT disable thinking on Opus 5:
      // with thinking off it can write tool calls into visible text instead.
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      ...(fast ? { speed: 'fast' } : {}),
      system,
      messages,
    }
  }

  private async run(
    params: ReturnType<AnthropicProvider['buildParams']>,
    onDelta: (text: string) => void,
    signal: AbortSignal
  ): Promise<AskResult> {
    // Cast at the SDK boundary: `speed`, `fallbacks` and `output_config` ship
    // ahead of some published type definitions.
    const stream = this.client.beta.messages.stream(params as never, { signal })

    stream.on('text', onDelta)
    const message = await stream.finalMessage()

    // stop_details is only populated when stop_reason is "refusal"; guard first.
    if (message.stop_reason === 'refusal') {
      throw new Error(
        `Request was declined by safety classifiers (${
          (message as { stop_details?: { category?: string } }).stop_details?.category ?? 'unknown'
        }).`
      )
    }

    const usage = message.usage as unknown as {
      input_tokens: number
      output_tokens: number
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    }

    return {
      text: message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join(''),
      stopReason: message.stop_reason,
      usage: {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
      },
      servedBy: this.name,
    }
  }
}
