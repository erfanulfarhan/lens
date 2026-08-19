import { describe, expect, it } from 'vitest'
import { OllamaProvider } from './ollama.js'
import type { AskContext } from './types.js'

const live = process.env.LENS_LIVE === '1' ? describe : describe.skip

live('reasoning cost reporting', () => {
  it('measures how long the model thought and what it spent', async () => {
    const log = (m: string) => process.stderr.write(`  ${m}\n`)
    const p = new OllamaProvider({
      baseUrl: process.env.LENS_OLLAMA_URL!,
      model: process.env.LENS_OLLAMA_MODEL!,
      numPredict: 2048,
    })

    const ctx: AskContext = {
      system: [{ text: 'Answer in two sentences.' }],
      history: [],
      question: 'Why is measuring something better than guessing at it?',
    }

    const progress: number[] = []
    const t0 = Date.now()
    const res = await p.ask(ctx, () => {}, new AbortController().signal, (tokens) => {
      if (!progress.length || tokens >= progress.at(-1)! + 40) progress.push(tokens)
    })

    log(`total ${Date.now() - t0}ms`)
    log(`thinking: ${res.thinking ? `${res.thinking.ms}ms, ${res.thinking.tokens} tokens` : 'none reported'}`)
    log(`live token updates: ${progress.slice(0, 8).join(', ')}${progress.length > 8 ? ' …' : ''}`)
    log(`answer tokens: ${res.usage.outputTokens}`)

    expect(res.text.length).toBeGreaterThan(20)
    // A reasoning model must report a measured duration, not a guess.
    expect(res.thinking?.ms).toBeGreaterThan(0)
    expect(res.thinking?.tokens).toBeGreaterThan(0)
    expect(progress.length).toBeGreaterThan(1)
  }, 600000)
})

live('a model that does not reason', () => {
  it('reports no thinking rather than describing warm-up as thought', async () => {
    const log = (m: string) => process.stderr.write(`  ${m}\n`)
    const p = new OllamaProvider({ baseUrl: process.env.LENS_OLLAMA_URL!, model: 'gemma3:12b' })
    const ctx: AskContext = { system: [], history: [], question: 'Say hello in three words.' }
    const res = await p.ask(ctx, () => {}, new AbortController().signal)
    log(`gemma3 thinking: ${res.thinking ? JSON.stringify(res.thinking) : 'none (correct)'}`)
    expect(res.thinking).toBeUndefined()
    expect(res.text.length).toBeGreaterThan(0)
  }, 600000)
})
