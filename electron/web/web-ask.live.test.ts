import { describe, it, expect } from 'vitest'
import { webConfigFromEnv, webContext } from './index.js'
import { createProvider } from '../providers/index.js'
import type { AskContext } from '../providers/types.js'

const live = process.env.LENS_LIVE === '1' ? describe : describe.skip

live('ask with web context (the Web toggle path)', () => {
  it('adds web results and still answers', async () => {
    const log = (m: string) => process.stderr.write(`\n  ${m}`)
    const question = 'What is Ritsumeikan APU known for?'
    const cfg = webConfigFromEnv(process.env)
    log(`engine: ${cfg.engine}`)

    const t0 = Date.now()
    const { text, sources } = await webContext(question, cfg, new AbortController().signal)
    log(`web context: ${Math.round(text.length / 4)} tokens, ${sources.length} sources, ${Date.now() - t0}ms`)
    expect(sources.length).toBeGreaterThan(0)

    const provider = createProvider({ ...process.env, LENS_PROVIDER: 'ollama' } as NodeJS.ProcessEnv)
    const ctx: AskContext = {
      system: [{ text: 'Answer briefly using the web results provided.' }, { text }],
      history: [],
      question,
    }
    const t1 = Date.now()
    const result = await provider.ask(ctx, () => {}, new AbortController().signal)
    log(`answer in ${Date.now() - t1}ms: ${result.text.slice(0, 180).replace(/\n/g, ' ')}`)
    expect(result.text.length).toBeGreaterThan(30)
  }, 90000)
})
