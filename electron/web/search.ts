import { parseDuckDuckGo, htmlToText, type SearchResult } from './html-text.js'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

/** Keyless web search via DuckDuckGo's HTML endpoint. */
export async function webSearch(query: string, signal: AbortSignal, limit = 5): Promise<SearchResult[]> {
  // DuckDuckGo returns a 202 bot-challenge to a bare GET from a non-browser
  // client; a POST with browser-like headers gets the real results page.
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    signal,
    headers: {
      'user-agent': UA,
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'text/html',
      'accept-language': 'en-US,en;q=0.9',
    },
    body: `q=${encodeURIComponent(query)}`,
  })
  if (!res.ok) throw new Error(`search failed: ${res.status}`)
  return parseDuckDuckGo(await res.text(), limit)
}

/** Fetches a page and returns its readable text, truncated to a char budget. */
export async function fetchPageText(url: string, signal: AbortSignal, maxChars = 4000): Promise<string> {
  const res = await fetch(url, { signal, headers: { 'user-agent': UA } })
  if (!res.ok) return ''
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('text/html') && !ct.includes('text/plain')) return ''
  return htmlToText(await res.text()).slice(0, maxChars)
}
