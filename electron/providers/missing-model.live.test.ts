import { describe, expect, it } from 'vitest'
import { OllamaProvider } from './ollama.js'

const live = process.env.LENS_LIVE === '1' ? describe : describe.skip

live('a missing model', () => {
  it('names the server and lists what is installed, not a bare 404', async () => {
    const p = new OllamaProvider({
      baseUrl: process.env.LENS_OLLAMA_URL!,
      model: 'does-not-exist:1b',
    })
    await expect(
      p.ask({ system: [], history: [], question: 'hi' }, () => {}, new AbortController().signal)
    ).rejects.toThrow(/is not installed on the Ollama server at/)

    const err = await p
      .ask({ system: [], history: [], question: 'hi' }, () => {}, new AbortController().signal)
      .catch((e: Error) => e.message)
    process.stderr.write(`\n  ${err}\n`)
    expect(err).toContain('Models on that server')
    expect(err).toContain('gemma3:12b')
  }, 60000)
})
