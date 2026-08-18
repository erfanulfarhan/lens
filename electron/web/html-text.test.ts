import { describe, expect, it } from 'vitest'
import { decodeEntities, htmlToText, parseDuckDuckGo } from './html-text.js'

describe('decodeEntities', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('a &amp; b &#39;c&#39; &quot;d&quot;')).toBe('a & b \'c\' "d"')
  })
})

describe('htmlToText', () => {
  it('strips tags, scripts and styles', () => {
    const html = '<div>Hello <script>evil()</script><b>world</b><style>x{}</style></div>'
    expect(htmlToText(html)).toBe('Hello world')
  })
})

describe('parseDuckDuckGo', () => {
  it('extracts title, unwrapped url and snippet', () => {
    const html = `
      <a class="result__a" href="/l/?uddg=https%3A%2F%2Fexample.com%2Fx">Example &amp; Co</a>
      <a class="result__snippet" href="#">A <b>great</b> result.</a>`
    const [r] = parseDuckDuckGo(html, 5)
    expect(r.title).toBe('Example & Co')
    expect(r.url).toBe('https://example.com/x')
    expect(r.snippet).toBe('A great result.')
  })

  it('respects the limit', () => {
    const one = '<a class="result__a" href="/l/?uddg=https%3A%2F%2Fa.com">A</a>'
    expect(parseDuckDuckGo(one.repeat(10), 3)).toHaveLength(3)
  })
})
