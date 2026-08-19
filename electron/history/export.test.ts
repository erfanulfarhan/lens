import { describe, expect, it } from 'vitest'
import { exportFileName, exportSession, toJson, toMarkdown, toPlainText } from './export.js'
import type { ChatSession } from './sessions.js'

const session: ChatSession = {
  id: 'a', title: 'Why data science?',
  createdAt: Date.UTC(2026, 7, 19, 10, 0), updatedAt: Date.UTC(2026, 7, 19, 11, 0),
  messages: [
    { role: 'user', text: 'Why data science?', ts: 1 },
    { role: 'assistant', text: 'Because it measures things.', ts: 2 },
    { role: 'user', text: 'Read this', ts: 3 },
    { role: 'assistant', text: 'It says hello.', ts: 4, sawScreen: true },
  ],
}

describe('toMarkdown', () => {
  it('renders questions as headings and answers as prose', () => {
    const md = toMarkdown(session, '0.1.2')
    expect(md).toContain('# Why data science?')
    expect(md).toContain('## Why data science?')
    expect(md).toContain('Because it measures things.')
    expect(md).toContain('Lens 0.1.2')
  })

  // An answer can refer to something never written in the question, so the
  // export has to say a screenshot was involved or it reads as a non sequitur.
  it('notes when an answer used the screen', () => {
    expect(toMarkdown(session)).toContain('screenshot attached')
  })

  it('leaves no run of blank lines', () => {
    expect(toMarkdown(session)).not.toMatch(/\n{3,}/)
  })
})

describe('toPlainText', () => {
  it('labels each speaker', () => {
    const txt = toPlainText(session)
    expect(txt).toContain('You: Why data science?')
    expect(txt).toContain('Lens: Because it measures things.')
  })
})

describe('toJson', () => {
  it('round-trips the session', () => {
    expect(JSON.parse(toJson(session))).toEqual(session)
  })
})

describe('exportFileName', () => {
  it('uses the title and the date', () => {
    expect(exportFileName(session, 'md')).toBe('Why data science 2026-08-19.md')
  })

  // Windows rejects these outright, and a chat title is free text.
  it('strips characters that are illegal in a filename', () => {
    const nasty = { ...session, title: 'a/b\\c:d*e?f"g<h>i|j' }
    expect(exportFileName(nasty, 'txt')).not.toMatch(/[\\/:*?"<>|]/)
  })

  it('trims trailing dots, which Windows also rejects', () => {
    expect(exportFileName({ ...session, title: 'notes...' }, 'md')).toContain('notes ')
    expect(exportFileName({ ...session, title: 'notes...' }, 'md')).not.toContain('notes...')
  })

  it('falls back when a title reduces to nothing', () => {
    expect(exportFileName({ ...session, title: '///' }, 'md')).toMatch(/^chat /)
  })

  it('keeps long titles to a sensible length', () => {
    const long = { ...session, title: 'x'.repeat(200) }
    expect(exportFileName(long, 'md').length).toBeLessThan(80)
  })
})

describe('exportSession', () => {
  it('returns content and a matching extension for each format', () => {
    for (const f of ['md', 'txt', 'json'] as const) {
      const out = exportSession(session, f)
      expect(out.fileName.endsWith(`.${f}`)).toBe(true)
      expect(out.content.length).toBeGreaterThan(0)
    }
  })
})
