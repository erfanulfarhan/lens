/** Decodes the handful of HTML entities that show up in search results. */
export function decodeEntities(s: string): string {
  const named: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ', '#x27': "'",
  }
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z0-9#]+);/gi, (m, e) => named[e.toLowerCase()] ?? m)
}

/** Strips tags, scripts and styles from HTML and collapses whitespace to text. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim()
}

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

/** Parses DuckDuckGo's HTML results page into structured results. */
export function parseDuckDuckGo(html: string, limit = 5): SearchResult[] {
  const results: SearchResult[] = []
  // Each result anchor carries the title and its href; the snippet follows.
  const linkRe = /result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  const snippetRe = /result__snippet"[^>]*>([\s\S]*?)<\/a>/g

  const links = [...html.matchAll(linkRe)]
  const snippets = [...html.matchAll(snippetRe)]

  for (let i = 0; i < Math.min(links.length, limit); i++) {
    let url = decodeEntities(links[i][1])
    // DDG wraps hrefs as /l/?uddg=<encoded real url>; unwrap when present.
    const wrapped = url.match(/[?&]uddg=([^&]+)/)
    if (wrapped) url = decodeURIComponent(wrapped[1])
    results.push({
      title: htmlToText(links[i][2]),
      url,
      snippet: snippets[i] ? htmlToText(snippets[i][1]) : '',
    })
  }
  return results
}
