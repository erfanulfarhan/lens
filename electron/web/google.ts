import type { SearchResult } from './html-text.js'

/**
 * Google Programmable Search via the Custom Search JSON API. Google blocks
 * scraping of its results page, so the official API is the only reliable way to
 * "use Google". Free tier is 100 queries/day. Needs an API key and a
 * Programmable Search Engine (CSE) id, both free to create.
 */
export async function googleSearch(
  query: string,
  apiKey: string,
  cseId: string,
  signal: AbortSignal,
  limit = 5
): Promise<SearchResult[]> {
  const url =
    `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}` +
    `&q=${encodeURIComponent(query)}&num=${Math.min(limit, 10)}`

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`google search failed: ${res.status} ${await res.text()}`)

  const body = (await res.json()) as {
    items?: Array<{ title: string; link: string; snippet?: string }>
  }
  return (body.items ?? []).slice(0, limit).map((it) => ({
    title: it.title,
    url: it.link,
    snippet: it.snippet ?? '',
  }))
}
