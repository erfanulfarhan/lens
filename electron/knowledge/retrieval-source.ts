import { watch, type FSWatcher } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { SystemBlock } from '../providers/types.js'
import { OPERATING_RULES } from '../providers/prompt.js'
import type { KnowledgeSource } from './source.js'
import { extractText, isSupported } from './extract.js'
import { chunkText, cosineSimilarity, selectWithinBudget, type Chunk } from './chunk.js'
import type { Embedder } from './embedder.js'

interface EmbeddedChunk {
  chunk: Chunk
  vector: number[]
}

/**
 * Indexes the whole knowledge folder into embedded chunks once, then selects
 * only the chunks relevant to each question at ask time. This is what makes the
 * assistant work with far more material than fits in the context window: a
 * question about one topic never drags in nine unrelated PDFs.
 */
export class RetrievalSource implements KnowledgeSource {
  readonly name = 'retrieval'
  private index: EmbeddedChunk[] = []
  private watcher?: FSWatcher
  private listeners: Array<() => void> = []
  private debounce?: NodeJS.Timeout
  private building?: Promise<void>

  constructor(
    private dir: string,
    private embedder: Embedder,
    private budgetTokens = 3000
  ) {}

  /** Reads and embeds every file. Called on start and whenever files change. */
  async reindex(): Promise<void> {
    const names = (await readdir(this.dir).catch(() => [] as string[]))
      .filter((n) => !n.startsWith('.') && isSupported(n))
      .sort()

    const chunks: Chunk[] = []
    for (const name of names) {
      const path = join(this.dir, name)
      if (!(await stat(path)).isFile().valueOf()) continue
      try {
        const text = await extractText(path)
        if (text) chunks.push(...chunkText(name, text))
      } catch {
        // One unreadable file must not sink the whole index.
      }
    }

    if (chunks.length === 0) {
      this.index = []
      return
    }

    const vectors = await this.embedder.embed(chunks.map((c) => c.text))
    this.index = chunks.map((chunk, i) => ({ chunk, vector: vectors[i] }))
  }

  /** Number of indexed chunks, for status display. */
  get size(): number {
    return this.index.length
  }

  /** build() with no query returns just the rules: retrieval needs the question. */
  async build(query?: string): Promise<SystemBlock[]> {
    if (this.building) await this.building

    const blocks: SystemBlock[] = [{ text: OPERATING_RULES, cacheBreakpoint: this.index.length === 0 }]
    if (this.index.length === 0 || !query?.trim()) return blocks

    let picked: Chunk[]
    try {
      const [q] = await this.embedder.embed([query])
      const scored = this.index.map((e) => ({ chunk: e.chunk, score: cosineSimilarity(q, e.vector) }))
      picked = selectWithinBudget(scored, this.budgetTokens)
    } catch {
      // Embedding the query failed (server blip): fall back to the rules only
      // rather than dumping the whole unranked index and overflowing.
      return blocks
    }

    if (picked.length === 0) return blocks

    const body = picked
      .map((c) => `<excerpt source="${c.source}">\n${c.text}\n</excerpt>`)
      .join('\n\n')

    blocks.push({
      text: `The most relevant background material for this question:\n\n${body}`,
      cacheBreakpoint: true,
    })
    return blocks
  }

  onChange(cb: () => void): void {
    this.listeners.push(cb)
    if (this.watcher) return
    try {
      this.watcher = watch(this.dir, { recursive: true }, () => {
        clearTimeout(this.debounce)
        this.debounce = setTimeout(() => {
          this.building = this.reindex().finally(() => this.listeners.forEach((l) => l()))
        }, 400)
      })
    } catch {
      // Folder may not exist yet.
    }
  }

  dispose(): void {
    clearTimeout(this.debounce)
    this.watcher?.close()
    this.listeners = []
  }
}
