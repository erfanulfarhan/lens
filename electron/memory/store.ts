import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Embedder } from '../knowledge/embedder.js'
import { cosineSimilarity } from '../knowledge/chunk.js'

export interface Exchange {
  ts: number
  question: string
  answer: string
  /** Optional user correction attached later, e.g. "no, say X instead". */
  note?: string
}

interface RememberedExchange extends Exchange {
  vector?: number[]
}

/**
 * Cross-session memory. Every Q&A is appended to a JSONL file so it survives
 * restarts, and past exchanges relevant to a new question are recalled by
 * embedding similarity. This is what lets the assistant "learn from each prompt"
 * rather than starting blank every launch.
 */
export class MemoryStore {
  private items: RememberedExchange[] = []

  constructor(
    private path: string,
    private embedder: Embedder,
    private recallBudgetTokens = 1200
  ) {}

  /** Loads history from disk and embeds it for recall. */
  async load(): Promise<void> {
    let raw: string
    try {
      raw = await readFile(this.path, 'utf8')
    } catch {
      this.items = []
      return
    }

    const parsed: RememberedExchange[] = []
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue
      try {
        parsed.push(JSON.parse(line))
      } catch {
        // Skip a corrupt line rather than losing the whole history.
      }
    }
    // Drop any previously-stored screen narration, then rewrite the file so the
    // poison is gone for good rather than filtered forever.
    const clean = parsed.filter((i) => !looksLikeScreenDescription(i.answer))
    if (clean.length !== parsed.length) {
      await writeFile(this.path, clean.map((i) => JSON.stringify(i)).join('\n') + '\n', 'utf8')
    }
    this.items = clean

    // Embed anything missing a vector (e.g. written before embeddings existed).
    const missing = this.items.filter((i) => !i.vector)
    if (missing.length && this.embedder.available) {
      try {
        const vectors = await this.embedder.embed(missing.map((m) => m.question))
        missing.forEach((m, i) => (m.vector = vectors[i]))
      } catch {
        // Recall just degrades to recency if embedding is unavailable.
      }
    }
  }

  /**
   * The most recent exchanges, for short-term conversational continuity.
   *
   * Screen-description answers are excluded. Replaying them as conversation
   * taught the model to describe the screen for every later message — even
   * "hi" — because the visible pattern in its history was screen narration.
   */
  recent(n: number): Exchange[] {
    return this.items
      .filter((i) => !looksLikeScreenDescription(i.answer))
      .slice(-n)
      .map(({ ts, question, answer, note }) => ({ ts, question, answer, note }))
  }

  /**
   * Persists a new exchange and indexes it for future recall.
   * Screen descriptions are dropped at the door: storing them is what created a
   * feedback loop where the model learned to narrate the screen for everything.
   */
  async add(question: string, answer: string): Promise<void> {
    if (looksLikeScreenDescription(answer)) return
    const item: RememberedExchange = { ts: Date.now(), question, answer }
    try {
      const [vec] = await this.embedder.embed([question])
      item.vector = vec
    } catch {
      // Store without a vector; load() will backfill next start.
    }

    this.items.push(item)
    await mkdir(dirname(this.path), { recursive: true })
    await appendFile(this.path, JSON.stringify(item) + '\n', 'utf8')
  }

  /**
   * Past exchanges most relevant to the current question, as a context block.
   * Excludes the last few (those already supplied verbatim as recent history)
   * so recall surfaces genuinely older, topical material.
   */
  async recall(question: string, excludeRecent = 4): Promise<string> {
    const pool = this.items.slice(0, Math.max(0, this.items.length - excludeRecent))
    // Same exclusion as recent(): recalling a screen description by similarity
    // re-poisons the context just as replaying it does.
    const scorable = pool.filter((i) => i.vector && !looksLikeScreenDescription(i.answer))
    if (scorable.length === 0) return ''

    let queryVec: number[]
    try {
      ;[queryVec] = await this.embedder.embed([question])
    } catch {
      return ''
    }

    const ranked = scorable
      .map((i) => ({ item: i, score: cosineSimilarity(queryVec, i.vector!) }))
      .sort((a, b) => b.score - a.score)
      .filter((r) => r.score > 0.5) // only genuinely related past turns

    const picked: string[] = []
    let used = 0
    for (const { item } of ranked) {
      const entry = `Q: ${item.question}\nA: ${item.answer}${item.note ? `\nCorrection: ${item.note}` : ''}`
      const tokens = Math.ceil(entry.length / 4)
      if (used + tokens > this.recallBudgetTokens) continue
      picked.push(entry)
      used += tokens
    }

    return picked.length
      ? `Relevant things from earlier sessions (reuse what fits, the user liked these):\n\n${picked.join('\n\n')}`
      : ''
  }

  /** Wipes all learned history, on disk and in memory. */
  async clear(): Promise<void> {
    this.items = []
    await mkdir(dirname(this.path), { recursive: true })
    await writeFile(this.path, '', 'utf8')
  }

  get size(): number {
    return this.items.length
  }
}


/** Heuristic for an answer that merely narrates the screen. */
export function looksLikeScreenDescription(answer: string): boolean {
  return /\b(the screen shows|screenshot shows|the screenshot|i can see|the image shows|you are viewing|you're viewing|you are on|click the .* button)\b/i.test(
    answer
  )
}
