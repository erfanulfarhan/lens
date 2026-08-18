import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsStore, type Cipher } from './store.js'

// Reversible stand-in for the OS keychain, so encryption behaviour is testable.
const fakeCipher: Cipher = {
  available: true,
  encrypt: (p) => Buffer.from(p).toString('base64'),
  decrypt: (c) => Buffer.from(c, 'base64').toString('utf8'),
}

let path: string
beforeEach(async () => {
  path = join(await mkdtemp(join(tmpdir(), 'lens-set-')), 'settings.json')
})

const store = () => new SettingsStore(path, fakeCipher, '/tmp/knowledge')

describe('SettingsStore', () => {
  it('starts from defaults when there is no file', async () => {
    const s = store()
    await s.load()
    expect(s.redacted().provider).toBe('ollama')
    expect(s.redacted().knowledgeDir).toBe('/tmp/knowledge')
  })

  it('round-trips an API key through encryption', async () => {
    const s = store()
    await s.load()
    await s.setApiKey('anthropic', 'sk-ant-secret')
    expect(s.apiKey('anthropic')).toBe('sk-ant-secret')
  })

  it('never writes an API key in plaintext', async () => {
    const s = store()
    await s.load()
    await s.setApiKey('openai', 'sk-plaintext-value')
    const onDisk = await readFile(path, 'utf8')
    expect(onDisk).not.toContain('sk-plaintext-value')
    expect(onDisk).toContain('encryptedKeys')
  })

  it('redacted settings expose only which keys exist', async () => {
    const s = store()
    await s.load()
    await s.setApiKey('gemini', 'gem-key')
    const r = s.redacted()
    expect(r.hasKey.gemini).toBe(true)
    expect(JSON.stringify(r)).not.toContain('gem-key')
    expect(r).not.toHaveProperty('encryptedKeys')
  })

  it('removes a key when set to empty', async () => {
    const s = store()
    await s.load()
    await s.setApiKey('groq', 'k')
    await s.setApiKey('groq', '')
    expect(s.apiKey('groq')).toBeUndefined()
    expect(s.redacted().hasKey.groq).toBeUndefined()
  })

  it('persists settings and models across a reload', async () => {
    const a = store()
    await a.load()
    await a.update({ provider: 'gemini', webEnabled: true })
    await a.setModel('gemini', 'gemini-3.7-flash')

    const b = store()
    await b.load()
    expect(b.redacted().provider).toBe('gemini')
    expect(b.redacted().webEnabled).toBe(true)
    expect(b.redacted().models.gemini).toBe('gemini-3.7-flash')
  })
})

describe('redacted output shape', () => {
  // The interface reads `hasKey` to decide what to show; the keys themselves must
  // never cross that boundary.
  it('reports which providers have a key without exposing any', async () => {
    const s = store()
    await s.load()
    await s.setApiKey('anthropic', 'sk-ant-secret-value')
    await s.setApiKey('groq', 'gsk_another_secret')

    const r = s.redacted()
    expect(r.hasKey).toEqual({ anthropic: true, groq: true })
    expect(JSON.stringify(r)).not.toContain('secret')
    expect(r.ollamaUrl).toBe('http://localhost:11434')
  })
})
