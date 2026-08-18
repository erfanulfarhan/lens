import { describe, it, expect } from 'vitest'
import { RetrievalSource } from './retrieval-source.js'
import { OllamaEmbedder } from './embedder.js'
import { createProvider } from '../providers/index.js'
import type { AskContext } from '../providers/types.js'

const live = process.env.LENS_LIVE === '1' ? describe : describe.skip

live('end to end: retrieval + grounded answer', () => {
  it('answers an interview question from the docs, coherently', async () => {
    const log = (m: string) => process.stderr.write(`\n  ${m}`)
    const base = process.env.LENS_OLLAMA_URL!
    const embedder = new OllamaEmbedder(base.replace(/\/v1$/, ''), 'nomic-embed-text')
    const r = new RetrievalSource(process.env.LENS_KNOWLEDGE_DIR!, embedder, 8000)
    await r.reindex()

    const question = 'The interviewer asks: why do you want to study at APU? Give me a strong answer in my own words.'
    const system = await r.build(question)

    const provider = createProvider({ ...process.env, LENS_PROVIDER: 'ollama' } as NodeJS.ProcessEnv)
    // Attach an unrelated screenshot (a red square) to prove the model answers the
    // doc question and does NOT just describe the screen.
    const redSquare =
      'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAZElEQVR4nO3PAQ3AIAADQZTgX9S8DA1kWR6S+1RAb7yXN+oDXwOoA6gDqAOoA6gDqAOo2wY8c/46AAAAAAAAAAAAAAAAAAAAAAAAAAAAAIDzAKcFUAdQB1AHUAdQB1AHUHc9YAGLjT5ZadpnEgAAAABJRU5ErkJggg=='
    const ctx: AskContext = {
      system,
      history: [],
      question,
      screenshot: { mediaType: 'image/png', base64: redSquare },
    }

    const t0 = Date.now()
    let streamed = ''
    let firstAt = 0
    const result = await provider.ask(
      ctx,
      (d) => {
        if (!firstAt) firstAt = Date.now() - t0
        streamed += d
      },
      new AbortController().signal
    )

    log(`first word in ${firstAt}ms, full answer in ${Date.now() - t0}ms`)
    log(`ANSWER: ${result.text.slice(0, 400).replace(/\n/g, ' ')}`)

    expect(result.text.length).toBeGreaterThan(40)
    // Must not leak reasoning tags into the visible answer.
    expect(result.text).not.toContain('<think>')
    // Must not have just described the red square.
    expect(result.text.toLowerCase()).not.toMatch(/\bred\b|\bsquare\b/)
    expect(streamed.length).toBeGreaterThan(0)
  }, 120000)
})
