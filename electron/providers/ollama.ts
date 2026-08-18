import type { AskContext, AskResult, Provider } from './types.js'
import { assembleUserContent } from './prompt.js'
import { PROBE_PNG_BASE64, PROBE_PROMPT, probePassed } from './vision-probe.js'

/**
 * Native Ollama provider (/api/chat). Preferred over the OpenAI-compat path for
 * local use because it can disable the model's "thinking" pass (`think: false`)
 * and pass images inline, both of which matter for fast interview answers.
 */
export class OllamaProvider implements Provider {
  readonly name: string
  readonly supportsCaching = false
  readonly supportsVision = true
  readonly maxImageWidth: number
  readonly candidateModels: string[] = []

  constructor(
    private opts: {
      baseUrl: string // no /v1 suffix
      model: string
      maxImageWidth?: number
      /** Force thinking on/off. Undefined = decide per model (reasoning models on). */
      think?: boolean
      /** Upper bound on answer length; interview answers are short. */
      numPredict?: number
    }
  ) {
    this.name = `ollama:${opts.model}`
    this.maxImageWidth = opts.maxImageWidth ?? 1100
  }

  get model(): string {
    return this.opts.model
  }

  /** Reasoning models accept `think`; others 400 on it. Decide by family. */
  private wantsThink(model: string): boolean {
    if (this.opts.think !== undefined) return this.opts.think
    return /qwen3-vl|qwen3|deepseek-r1|reason|think/i.test(model)
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.opts.baseUrl}/api/tags`)
    if (!res.ok) return [this.opts.model]
    const body = (await res.json()) as { models?: Array<{ name: string }> }
    return (body.models ?? [])
      .map((m) => m.name)
      .filter((n) => !/embed/i.test(n)) // embedding models can't chat
      .sort()
  }

  async probeVision(model: string, timeoutMs = 20000): Promise<boolean> {
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), timeoutMs)
    try {
      const text = await this.chat(
        model,
        [{ role: 'user', content: PROBE_PROMPT, images: [PROBE_PNG_BASE64] }],
        () => {},
        abort.signal,
        16
      )
      return probePassed(text)
    } catch {
      return false
    } finally {
      clearTimeout(timer)
    }
  }

  async ask(
    ctx: AskContext,
    onDelta: (text: string) => void,
    signal: AbortSignal,
    onThinking?: () => void
  ): Promise<AskResult> {
    const system = ctx.system.map((b) => b.text).join('\n\n')

    // Split the assembled user content into text and the (optional) image, which
    // Ollama takes as a separate `images` array rather than inline blocks.
    const parts = assembleUserContent(ctx)
    const text = parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('\n\n')
    const images = parts
      .filter((p) => p.type === 'image')
      .map((p) => (p as { source: { data: string } }).source.data)

    const messages = [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...ctx.history.map((t) => ({ role: t.role, content: t.text })),
      { role: 'user', content: text, images },
    ]

    let answer = await this.chat(this.opts.model, messages, onDelta, signal, this.opts.numPredict, onThinking)

    // A reasoning model can spend its entire token budget thinking and return an
    // empty answer. Silence is the worst possible output, so retry once with
    // reasoning off, which always answers directly.
    if (!answer.trim()) {
      answer = await this.chat(
        this.opts.model, messages, onDelta, signal, this.opts.numPredict, onThinking, false
      )
    }

    return {
      text: answer,
      stopReason: 'stop',
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      servedBy: this.name,
    }
  }

  private async chat(
    model: string,
    messages: unknown[],
    onDelta: (text: string) => void,
    signal: AbortSignal,
    numPredict?: number,
    onThinking?: () => void,
    forceThink?: boolean
  ): Promise<string> {
    const think = forceThink ?? this.wantsThink(model)
    const payload = (withThink: boolean) =>
      JSON.stringify({
        model,
        stream: true,
        ...(withThink ? { think: true } : {}),
        options: numPredict ? { num_predict: numPredict } : {},
        messages,
      })

    let res = await fetch(`${this.opts.baseUrl}/api/chat`, {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json' },
      body: payload(think),
    })

    // Some models reject `think`; retry once without it rather than fail.
    if (res.status === 400 && think) {
      const msg = await res.text()
      if (/does not support thinking/i.test(msg)) {
        res = await fetch(`${this.opts.baseUrl}/api/chat`, {
          method: 'POST',
          signal,
          headers: { 'content-type': 'application/json' },
          body: payload(false),
        })
      }
    }

    if (!res.ok || !res.body) throw new Error(`${this.name} returned ${res.status}: ${await res.text()}`)

    let full = ''
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let nl: number
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        if (!line) continue
        const chunk = JSON.parse(line) as {
          message?: { content?: string; thinking?: string }
          done?: boolean
        }
        // A reasoning model streams `thinking` before `content`. Surface a
        // progress signal during reasoning, but only stream the real answer.
        if (chunk.message?.thinking && !chunk.message.content) onThinking?.()
        const piece = chunk.message?.content
        if (piece) {
          full += piece
          onDelta(piece)
        }
      }
    }

    // The final line may arrive without a trailing newline; without this the
    // last chunk (which can carry answer text) is silently discarded.
    const tail = buffer.trim()
    if (tail) {
      try {
        const chunk = JSON.parse(tail) as { message?: { content?: string } }
        const piece = chunk.message?.content
        if (piece) {
          full += piece
          onDelta(piece)
        }
      } catch {
        // Truncated JSON at the very end: nothing recoverable.
      }
    }

    return full
  }
}
