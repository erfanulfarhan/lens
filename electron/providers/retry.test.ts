import { describe, expect, it } from 'vitest'
import { retryDelayMs } from './openai-compat.js'

const withHeaders = (h: Record<string, string>) => ({ headers: new Headers(h) })

describe('retryDelayMs', () => {
  it('honours a Retry-After header', () => {
    expect(retryDelayMs(withHeaders({ 'retry-after': '3' }), '', 0)).toBe(3250)
  })

  // Groq states the wait in the error body rather than a header.
  it('reads the wait out of the error body when there is no header', () => {
    const body = '{"error":{"message":"Rate limit reached. Please try again in 1.005s."}}'
    expect(retryDelayMs(withHeaders({}), body, 0)).toBe(1255)
  })

  it('falls back to exponential backoff', () => {
    expect(retryDelayMs(withHeaders({}), 'no advice', 0)).toBe(1000)
    expect(retryDelayMs(withHeaders({}), 'no advice', 1)).toBe(2000)
  })
})
