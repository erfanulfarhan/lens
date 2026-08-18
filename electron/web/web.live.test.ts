import { describe, it, expect } from 'vitest'
import { search, webContext } from './index.js'

const live = process.env.LENS_LIVE === '1' ? describe : describe.skip

live('web search', () => {
  it('returns real results and a context block', async () => {
    const log = (m: string) => process.stderr.write(`  ${m}\n`)
    const cfg = { engine: 'duckduckgo' as const }
    const results = await search('Ritsumeikan APU sustainability tourism', cfg, new AbortController().signal, 4)
    log(`got ${results.length} results; first: ${results[0]?.title?.slice(0, 60)}`)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].url).toMatch(/^https?:\/\//)

    const { text } = await webContext('APU tuition fees', cfg, new AbortController().signal)
    log(`context length: ${text.length} chars`)
    expect(text).toContain('Web search results')
  }, 40000)
})
