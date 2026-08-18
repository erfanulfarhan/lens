import type { SystemBlock } from '../providers/types.js'

/**
 * The seam that keeps retrieval a drop-in change. FullInjectSource puts every
 * file in the cached prefix; a future RetrievalSource would select chunks per
 * request. Nothing downstream needs to know which one is in use.
 */
export interface KnowledgeSource {
  readonly name: string
  /**
   * Blocks for the system prefix. Full-injection ignores the query; retrieval
   * uses it to select only relevant excerpts. Passing it keeps both behind one
   * interface.
   */
  build(query?: string): Promise<SystemBlock[]>
  /** Fires when the underlying material changes and the prefix must be rebuilt. */
  onChange(cb: () => void): void
  dispose(): void
}
