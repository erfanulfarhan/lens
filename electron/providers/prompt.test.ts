import { describe, expect, it } from 'vitest'
import { AnthropicProvider } from './anthropic.js'
import { assembleUserContent } from './prompt.js'
import type { AskContext } from './types.js'

const ctx: AskContext = {
  system: [
    { text: 'rules' },
    { text: 'knowledge about the user', cacheBreakpoint: true },
  ],
  history: [{ role: 'user', text: 'earlier' }],
  screenshot: { mediaType: 'image/png', base64: 'AAAA' },
  transcript: 'they asked something',
  question: 'what now?',
}

describe('volatile tail', () => {
  it('leads with the question and puts the image last', () => {
    const blocks = assembleUserContent(ctx)
    expect(blocks[0]).toMatchObject({ type: 'text' })
    expect((blocks[0] as { text: string }).text).toContain('QUESTION:')
    // The image must be the final block so the model answers, not describes.
    expect(blocks.at(-1)?.type).toBe('image')
  })

  it('still leads with the question when there is no transcript', () => {
    const blocks = assembleUserContent({ ...ctx, transcript: '  ' })
    expect((blocks[0] as { text: string }).text).toContain('QUESTION:')
    expect(blocks.at(-1)?.type).toBe('image')
  })
})

describe('cache breakpoint placement', () => {
  const provider = new AnthropicProvider({ apiKey: 'test-key' })
  const params = provider.buildParams(ctx, true)

  it('puts breakpoints only on stable system blocks', () => {
    expect(params.system.at(-1)).toHaveProperty('cache_control')
    expect(params.system[0]).not.toHaveProperty('cache_control')
  })

  // The screenshot is the highest-entropy content in the request. If it ever
  // lands ahead of a breakpoint the whole cached prefix is rewritten every
  // single call, which is expensive and completely silent.
  it('never marks the screenshot as cacheable', () => {
    const last = params.messages.at(-1)!
    const blocks = last.content as Array<Record<string, unknown>>
    const image = blocks.find((b) => b.type === 'image')

    expect(image).toBeDefined()
    expect(image).not.toHaveProperty('cache_control')
    expect(blocks.some((b) => 'cache_control' in b)) .toBe(false)
  })

  it('sends fast mode and refusal fallbacks together', () => {
    expect(params.speed).toBe('fast')
    expect(params.betas).toContain('fast-mode-2026-02-01')
    expect(params.betas).toContain('server-side-fallback-2026-07-01')
    expect(params.fallbacks).toBe('default')
  })

  it('drops speed but keeps fallbacks when fast mode is off', () => {
    const slow = provider.buildParams(ctx, false)
    expect(slow).not.toHaveProperty('speed')
    expect(slow.betas).not.toContain('fast-mode-2026-02-01')
  })
})
