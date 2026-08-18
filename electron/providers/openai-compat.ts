import type { AskContext, AskResult, Provider } from './types.js'
import { assembleUserContent } from './prompt.js'
import { PROBE_PNG_BASE64, PROBE_PROMPT, probePassed } from './vision-probe.js'

/**
 * Dev harness provider. Groq and Ollama both speak the OpenAI chat dialect, so
 * one adapter covers both and keeps testing free.
 *
 * This path has NO prompt caching and no fast mode; those are Anthropic-only.
 * The cached-prefix behaviour is covered by tests against a mocked Anthropic
 * client instead, so it stays verified even when you develop against Groq.
 */
export class OpenAICompatProvider implements Provider {
  readonly name: string
  readonly supportsCaching = false
  readonly supportsVision: boolean
  readonly maxImageWidth: number
  readonly candidateModels: string[]

  constructor(
    private opts: {
      baseUrl: string
      model: string
      apiKey?: string
      vision?: boolean
      maxImageWidth?: number
      /**
       * Groq reasoning models emit <think> blocks inline. "hidden" strips them
       * server-side so the panel streams the answer instead of the monologue.
       */
      reasoningFormat?: 'hidden' | 'parsed' | 'raw'
      /**
       * Gemini 3.x thinks by default and it is brutal for latency: measured
       * 13.8s at "low" and a 50s timeout at default, against 1.5s at "none".
       * A glanceable screen answer does not need deliberation.
       */
      reasoningEffort?: 'none' | 'low' | 'medium' | 'high'
      /** Ranked shortlist. Empty means enumerate the endpoint instead. */
      candidateModels?: string[]
    }
  ) {
    this.name = `openai-compat:${opts.model}`
    this.supportsVision = opts.vision ?? true
    this.maxImageWidth = opts.maxImageWidth ?? 900
    this.candidateModels = opts.candidateModels ?? []
  }

  /**
   * A model earns a place in the picker by naming the colour of an image it was
   * just shown. Filtering on model names instead let non-multimodal and
   * unavailable models into the list.
   */
  async probeVision(model: string, timeoutMs = 15000): Promise<boolean> {
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), timeoutMs)

    try {
      const res = await fetch(`${this.opts.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: abort.signal,
        headers: {
          'content-type': 'application/json',
          ...(this.opts.apiKey ? { authorization: `Bearer ${this.opts.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          max_tokens: 16,
          ...(this.opts.reasoningEffort ? { reasoning_effort: this.opts.reasoningEffort } : {}),
          ...(this.opts.reasoningFormat ? { reasoning_format: this.opts.reasoningFormat } : {}),
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: PROBE_PROMPT },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/png;base64,${PROBE_PNG_BASE64}` },
                },
              ],
            },
          ],
        }),
      })

      if (!res.ok) return false
      const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
      return probePassed(body.choices?.[0]?.message?.content ?? '')
    } finally {
      clearTimeout(timer)
    }
  }

  async listModels(): Promise<string[]> {
    const res = await fetch(`${this.opts.baseUrl}/models`, {
      headers: this.opts.apiKey ? { authorization: `Bearer ${this.opts.apiKey}` } : {},
    })
    if (!res.ok) return [this.opts.model]

    const body = (await res.json()) as { data?: Array<{ id: string }> }
    // Strip the families that cannot answer a screenshot question: embeddings,
    // speech, image and video generation, and the long-running research modes.
    const unusable = /embedding|tts|imagen|veo|lyria|audio|live|aqa|nano-banana|deep-research/
    return (body.data ?? [])
      .map((m) => m.id.replace(/^models\//, ''))
      .filter((id) => !unusable.test(id))
      .sort()
  }

  get model(): string {
    return this.opts.model
  }

  async ask(
    ctx: AskContext,
    onDelta: (text: string) => void,
    signal: AbortSignal
  ): Promise<AskResult> {
    const systemText = ctx.system.map((b) => b.text).join('\n\n')

    const content = assembleUserContent(ctx).map((block) =>
      block.type === 'image'
        ? {
            type: 'image_url' as const,
            image_url: {
              url: `data:${block.source.media_type};base64,${block.source.data}`,
            },
          }
        : { type: 'text' as const, text: block.text }
    )

    const body = JSON.stringify({
        model: this.opts.model,
        max_tokens: 4096,
        stream: true,
        ...(this.opts.reasoningFormat
          ? { reasoning_format: this.opts.reasoningFormat }
          : {}),
        ...(this.opts.reasoningEffort
          ? { reasoning_effort: this.opts.reasoningEffort }
          : {}),
        messages: [
          { role: 'system', content: systemText },
          ...ctx.history.map((t) => ({ role: t.role, content: t.text })),
          { role: 'user', content: this.supportsVision ? content : systemOnlyText(content) },
        ],
    })

    const stream = await this.post(body, signal)

    let text = ''
    let finish: string | null = null

    for await (const chunk of readSSE(stream)) {
      if (chunk === '[DONE]') break
      const delta = JSON.parse(chunk).choices?.[0]
      const piece = delta?.delta?.content
      if (piece) {
        text += piece
        onDelta(piece)
      }
      if (delta?.finish_reason) finish = delta.finish_reason
    }

    return {
      text,
      stopReason: finish,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      servedBy: this.name,
    }
  }
  /**
   * Free tiers meter tokens per minute and reject bursts with a 429 that names
   * how long to wait. Honouring it turns a dead panel into a short pause.
   */
  private async post(
    body: string,
    signal: AbortSignal,
    attempt = 0
  ): Promise<ReadableStream<Uint8Array>> {
    const res = await fetch(`${this.opts.baseUrl}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        ...(this.opts.apiKey ? { authorization: `Bearer ${this.opts.apiKey}` } : {}),
      },
      body,
    })

    if (res.ok && res.body) return res.body

    const text = await res.text()

    if (res.status === 429 && attempt < MAX_RETRIES) {
      await sleep(retryDelayMs(res, text, attempt), signal)
      return this.post(body, signal, attempt + 1)
    }

    throw new Error(`${this.name} returned ${res.status}: ${text}`)
  }
}

const MAX_RETRIES = 2

/** Prefers the server's own advice, falling back to exponential backoff. */
export function retryDelayMs(res: { headers: Headers }, body: string, attempt: number): number {
  const header = res.headers.get('retry-after')
  if (header) {
    const seconds = Number(header)
    if (Number.isFinite(seconds)) return Math.ceil(seconds * 1000) + 250
  }

  // Groq puts the wait inside the error message rather than a header.
  const stated = body.match(/try again in ([0-9.]+)s/)
  if (stated) return Math.ceil(Number(stated[1]) * 1000) + 250

  return 2 ** attempt * 1000
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

/** Drops image blocks for text-only models rather than failing the request. */
function systemOnlyText(
  content: Array<{ type: string; text?: string }>
): string {
  return content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n\n')
}

async function* readSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let idx: number
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)
      if (line.startsWith('data:')) yield line.slice(5).trim()
    }
  }
}
