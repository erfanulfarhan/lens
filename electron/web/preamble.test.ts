import { describe, expect, it } from 'vitest'
import { webContext } from './index.js'

describe('web context preamble', () => {
  it('tells the model it has web access, so it stops denying it', async () => {
    // A local model's default belief is "I am offline"; the preamble corrects it.
    const stub = {
      engine: 'duckduckgo' as const,
    }
    // Use a fake fetch so the test stays offline and deterministic.
    const original = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response(
        '<a class="result__a" href="/l/?uddg=https%3A%2F%2Fexample.com">Example</a>' +
          '<a class="result__snippet" href="#">A snippet.</a>',
        { status: 200, headers: { 'content-type': 'text/html' } }
      )) as typeof fetch

    try {
      const { text, sources } = await webContext('anything', stub, new AbortController().signal)
      expect(sources.length).toBeGreaterThan(0)
      expect(text).toContain('ENABLED')
      expect(text).toMatch(/never claim you cannot access/i)
      expect(text).toContain('Example')
    } finally {
      globalThis.fetch = original
    }
  })
})
