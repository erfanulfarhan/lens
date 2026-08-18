/** ~4 chars per token is the working estimate used throughout Lens. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4)

export interface Chunk {
  /** File the chunk came from, kept so answers can be grounded by source. */
  source: string
  text: string
  tokens: number
}

/**
 * Splits a document into overlapping windows on paragraph boundaries. Overlap
 * keeps a fact that straddles a boundary retrievable from either side, which
 * matters for a resume bullet or a scripted answer that runs a few lines.
 */
export function chunkText(source: string, text: string, targetTokens = 350, overlapTokens = 60): Chunk[] {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const chunks: Chunk[] = []
  let buf: string[] = []
  let bufTokens = 0

  const flush = () => {
    if (!buf.length) return
    const joined = buf.join('\n\n')
    chunks.push({ source, text: joined, tokens: estimateTokens(joined) })
  }

  for (const para of paragraphs) {
    const t = estimateTokens(para)

    // A single oversized paragraph is hard-split so it can never exceed budget.
    if (t > targetTokens) {
      flush()
      buf = []
      bufTokens = 0
      const words = para.split(/\s+/)
      let piece: string[] = []
      let pieceTokens = 0
      for (const w of words) {
        piece.push(w)
        pieceTokens += estimateTokens(w + ' ')
        if (pieceTokens >= targetTokens) {
          chunks.push({ source, text: piece.join(' '), tokens: pieceTokens })
          piece = []
          pieceTokens = 0
        }
      }
      if (piece.length) chunks.push({ source, text: piece.join(' '), tokens: pieceTokens })
      continue
    }

    if (bufTokens + t > targetTokens) {
      flush()
      // Carry the tail of the previous window forward as overlap.
      const carry: string[] = []
      let carryTokens = 0
      for (let i = buf.length - 1; i >= 0 && carryTokens < overlapTokens; i--) {
        carry.unshift(buf[i])
        carryTokens += estimateTokens(buf[i])
      }
      buf = carry
      bufTokens = carryTokens
    }

    buf.push(para)
    bufTokens += t
  }
  flush()
  return chunks
}

/** Cosine similarity between two equal-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0
}

/** Greedily picks the highest-scoring chunks that fit under a token budget. */
export function selectWithinBudget(
  scored: Array<{ chunk: Chunk; score: number }>,
  budgetTokens: number
): Chunk[] {
  const picked: Chunk[] = []
  let used = 0
  for (const { chunk } of [...scored].sort((a, b) => b.score - a.score)) {
    if (used + chunk.tokens > budgetTokens) continue
    picked.push(chunk)
    used += chunk.tokens
  }
  return picked
}
