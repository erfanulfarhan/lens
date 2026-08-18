import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { MemoryStore } from './store.js'
import { OllamaEmbedder } from '../knowledge/embedder.js'

const live = process.env.LENS_LIVE === '1' ? describe : describe.skip

live('memory with real embeddings', () => {
  it('recalls a related past exchange across a reload', async () => {
    const log = (m: string) => process.stderr.write(`  ${m}\n`)
    const path = join(await mkdtemp(join(tmpdir(), 'lens-mem-')), 'h.jsonl')
    const emb = new OllamaEmbedder(process.env.LENS_OLLAMA_URL!.replace(/\/v1$/, ''), 'nomic-embed-text')

    const a = new MemoryStore(path, emb)
    await a.add('What are my weaknesses for the interview?', 'I can be a perfectionist and over-prepare.')
    for (let i = 0; i < 5; i++) await a.add(`unrelated ${i}`, 'x')

    // Reload from disk (simulates a restart) and recall.
    const b = new MemoryStore(path, emb)
    await b.load()
    const recalled = await b.recall('Tell me about my weakness answer')
    log(`recalled: ${recalled.slice(0, 100)}`)
    expect(recalled.toLowerCase()).toContain('perfectionist')
  }, 60000)
})
