import { webSearch as ddgSearch, fetchPageText } from './search.js'
import { googleSearch } from './google.js'
import type { SearchResult } from './html-text.js'

export type { SearchResult } from './html-text.js'
export { fetchPageText }

export interface WebConfig {
  engine: 'google' | 'duckduckgo'
  googleApiKey?: string
  googleCseId?: string
}

export function webConfigFromEnv(env: NodeJS.ProcessEnv): WebConfig {
  const hasGoogle = Boolean(env.GOOGLE_API_KEY && env.GOOGLE_CSE_ID)
  return {
    engine: (env.LENS_SEARCH_ENGINE as 'google') ?? (hasGoogle ? 'google' : 'duckduckgo'),
    googleApiKey: env.GOOGLE_API_KEY,
    googleCseId: env.GOOGLE_CSE_ID,
  }
}

/** Searches with the configured engine, falling back to DuckDuckGo on failure. */
export async function search(
  query: string,
  cfg: WebConfig,
  signal: AbortSignal,
  limit = 5
): Promise<SearchResult[]> {
  if (cfg.engine === 'google' && cfg.googleApiKey && cfg.googleCseId) {
    try {
      return await googleSearch(query, cfg.googleApiKey, cfg.googleCseId, signal, limit)
    } catch {
      // Quota hit or key problem: fall back rather than fail the whole answer.
      return ddgSearch(query, signal, limit)
    }
  }
  return ddgSearch(query, signal, limit)
}

/**
 * Builds a compact web-context string: the top results' snippets, plus the text
 * of the single best page for depth. Kept small so it never blows the budget.
 */
export async function webContext(
  query: string,
  cfg: WebConfig,
  signal: AbortSignal,
  opts: { results?: number; pageChars?: number; fetchPage?: boolean } = {}
): Promise<{ text: string; sources: SearchResult[] }> {
  const results = await search(query, cfg, signal, opts.results ?? 3)
  if (results.length === 0) return { text: '', sources: [] }

  // Snippets only by default. Fetching the top page added several seconds of
  // network time AND thousands of prefill tokens, which pushed answers past 30s
  // on a local model. Snippets carry most of the value at a fraction of the cost.
  const lines = results.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\n${r.url}`)

  let deep = ''
  if (opts.fetchPage) {
    try {
      const page = await fetchPageText(results[0].url, signal, opts.pageChars ?? 1500)
      if (page) deep = `\n\nFrom the top result (${results[0].url}):\n${page}`
    } catch {
      // A failed page fetch just means we rely on snippets.
    }
  }

  // The model has no way to know the app searched for it, and a local model's
  // prior is "I am offline", so it will deny having web access unless told
  // plainly. State the capability, then give the results.
  const preamble =
    'Web search is ENABLED for this conversation. This app performs live internet ' +
    'searches on your behalf and the current results are below. You DO have access ' +
    'to live web information through these results — never claim you cannot access ' +
    'the internet. Cite the numbered sources when you use them.'

  return {
    text: `${preamble}\n\nWeb search results for "${query}":\n\n${lines.join('\n\n')}${deep}`,
    sources: results,
  }
}
