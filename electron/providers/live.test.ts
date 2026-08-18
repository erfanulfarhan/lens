import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createProvider } from './index.js'
import type { AskContext } from './types.js'

/**
 * Hits the real provider. Skipped unless LENS_LIVE=1 so the normal suite stays
 * offline and fast.
 */
const live = process.env.LENS_LIVE === '1' ? describe : describe.skip

function env(): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = { ...process.env }
  for (const line of readFileSync(new URL('../../.env', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
    if (m) out[m[1]] = m[2]
  }
  return out
}

live('live provider', () => {
  it('reads an image and answers from the knowledge prefix', async () => {
    const provider = createProvider(env())
    const png = readFileSync(process.env.LENS_TEST_IMAGE!).toString('base64')

    const ctx: AskContext = {
      system: [
        { text: 'Answer in as few words as possible.' },
        {
          text: 'Background about the user: their name is Farhan and their favourite framework is React.',
          cacheBreakpoint: true,
        },
      ],
      history: [],
      screenshot: { mediaType: 'image/png', base64: png },
      question:
        'Two things, each on its own line: 1) what colour is the square in the image, 2) what is my favourite framework?',
    }

    // stderr rather than console.log: vitest intercepts console output.
    const log = (m: string) => process.stderr.write(`  ${m}\n`)
    const t0 = Date.now()

    let streamed = ''
    let first = 0
    const result = await provider.ask(
      ctx,
      (d) => {
        if (!first) {
          first = Date.now() - t0
          log(`first delta after ${first}ms`)
        }
        streamed += d
      },
      new AbortController().signal
    )

    log(`provider : ${result.servedBy}`)
    log(`total    : ${Date.now() - t0}ms`)
    log(`answer   : ${result.text.replace(/\n/g, ' | ')}`)
    log(`streamed : ${streamed.length} chars`)

    expect(result.text.toLowerCase()).toContain('red')      // vision works
    expect(result.text.toLowerCase()).toContain('react')    // knowledge prefix works
    expect(streamed.length).toBeGreaterThan(0)              // streaming works
  }, 60000)
})
