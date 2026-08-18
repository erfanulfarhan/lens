/** Turns text into vectors via an Ollama embedding model, batched. */
export interface Embedder {
  readonly available: boolean
  embed(texts: string[]): Promise<number[][]>
}

export class OllamaEmbedder implements Embedder {
  available = true

  constructor(
    private baseUrl: string,
    private model = 'nomic-embed-text'
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    // /api/embed takes an array and returns embeddings in the same order.
    const res = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: texts }),
    })
    if (!res.ok) throw new Error(`embed failed: ${res.status} ${await res.text()}`)
    const body = (await res.json()) as { embeddings: number[][] }
    return body.embeddings
  }
}
