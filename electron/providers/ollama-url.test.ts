import { describe, expect, it } from 'vitest'
import { ollamaBaseUrl } from './ollama-url.js'

describe('ollamaBaseUrl', () => {
  it('defaults to localhost', () => {
    expect(ollamaBaseUrl()).toBe('http://localhost:11434/v1')
    expect(ollamaBaseUrl('  ')).toBe('http://localhost:11434/v1')
  })

  it('accepts a bare LAN address', () => {
    expect(ollamaBaseUrl('192.168.1.42')).toBe('http://192.168.1.42:11434/v1')
  })

  it('accepts host:port', () => {
    expect(ollamaBaseUrl('192.168.1.42:11434')).toBe('http://192.168.1.42:11434/v1')
  })

  it('keeps an explicit scheme and a non-default port', () => {
    expect(ollamaBaseUrl('http://pc.local:9999')).toBe('http://pc.local:9999/v1')
  })

  it('does not double the /v1 suffix', () => {
    expect(ollamaBaseUrl('http://192.168.1.42:11434/v1')).toBe('http://192.168.1.42:11434/v1')
  })

  it('tolerates trailing slashes', () => {
    expect(ollamaBaseUrl('http://192.168.1.42:11434/')).toBe('http://192.168.1.42:11434/v1')
  })
})
