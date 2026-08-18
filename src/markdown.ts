/**
 * A deliberately small markdown parser for model output.
 *
 * Models answer in markdown, and rendering it as plain text left raw `**` and
 * `*` on screen. This produces a token tree that the view turns into React
 * elements, so no HTML is ever injected from model output.
 */
export type Inline =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string }

export type Block =
  | { type: 'paragraph'; content: Inline[] }
  | { type: 'heading'; level: number; content: Inline[] }
  | { type: 'bullet'; items: Inline[][] }
  | { type: 'numbered'; items: Inline[][] }
  | { type: 'codeblock'; value: string; lang?: string }

/** Splits a line into bold, italic, inline code and plain runs. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  // Order matters: code first so `**` inside backticks stays literal.
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', value: text.slice(last, m.index) })
    const token = m[0]
    if (token.startsWith('`')) out.push({ type: 'code', value: token.slice(1, -1) })
    else if (token.startsWith('**') || token.startsWith('__'))
      out.push({ type: 'bold', value: token.slice(2, -2) })
    else out.push({ type: 'italic', value: token.slice(1, -1) })
    last = pattern.lastIndex
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) })
  return out.length ? out : [{ type: 'text', value: text }]
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push({ type: 'paragraph', content: parseInline(paragraph.join(' ')) })
    paragraph = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Fenced code: taken verbatim, since its contents are not markdown.
    const fence = line.match(/^```(\w+)?\s*$/)
    if (fence) {
      flushParagraph()
      const body: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++])
      blocks.push({ type: 'codeblock', value: body.join('\n'), lang: fence[1] })
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      flushParagraph()
      blocks.push({ type: 'heading', level: heading[1].length, content: parseInline(heading[2]) })
      continue
    }

    // Bullets: -, *, or • with optional leading indentation.
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    if (bullet) {
      flushParagraph()
      const items: Inline[][] = [parseInline(bullet[1])]
      while (i + 1 < lines.length) {
        const next = lines[i + 1].match(/^\s*[-*•]\s+(.*)$/)
        if (!next) break
        items.push(parseInline(next[1]))
        i++
      }
      blocks.push({ type: 'bullet', items })
      continue
    }

    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (numbered) {
      flushParagraph()
      const items: Inline[][] = [parseInline(numbered[1])]
      while (i + 1 < lines.length) {
        const next = lines[i + 1].match(/^\s*\d+[.)]\s+(.*)$/)
        if (!next) break
        items.push(parseInline(next[1]))
        i++
      }
      blocks.push({ type: 'numbered', items })
      continue
    }

    paragraph.push(line.trim())
  }

  flushParagraph()
  return blocks
}
