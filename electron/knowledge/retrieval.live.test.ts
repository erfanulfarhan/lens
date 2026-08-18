import { describe, it } from 'vitest'
import { RetrievalSource } from './retrieval-source.js'
import { OllamaEmbedder } from './embedder.js'

const live = process.env.LENS_LIVE === '1' ? describe : describe.skip

live('retrieval over the real knowledge folder', () => {
  it('indexes and returns only relevant, budget-bounded excerpts', async () => {
    const log = (m: string) => process.stderr.write(`  ${m}\n`)
    const base = process.env.LENS_OLLAMA_URL ?? 'http://192.168.0.248:11434'
    const embedder = new OllamaEmbedder(base.replace(/\/v1$/, ''), 'nomic-embed-text')
    const dir = process.env.LENS_KNOWLEDGE_DIR!

    const r = new RetrievalSource(dir, embedder, 8000)
    const t0 = Date.now()
    await r.reindex()
    log(`indexed ${r.size} chunks in ${Date.now() - t0}ms`)

    for (const q of ['Why do you want to study at APU?', 'What are my strengths and weaknesses?']) {
      const t1 = Date.now()
      const blocks = await r.build(q)
      const body = blocks.map((b) => b.text).join('\n')
      const tokens = Math.round(body.length / 4)
      const sources = [...new Set([...body.matchAll(/source="([^"]+)"/g)].map((m) => m[1]))]
      log(`Q: ${q}`)
      log(`   ${tokens} tokens (budget 8000), ${Date.now() - t1}ms, from: ${sources.join(', ')}`)
    }
  }, 120000)
})
