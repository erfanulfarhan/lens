import { describe, expect, it } from 'vitest'
import { LineParser, TranscriptLog, type AudioEvent } from './protocol.js'

describe('LineParser', () => {
  it('parses whole lines', () => {
    const p = new LineParser()
    const events = p.push('{"type":"ready","sampleRate":16000}\n')
    expect(events).toEqual([{ type: 'ready', sampleRate: 16000 }])
  })

  it('carries a split line across chunks', () => {
    const p = new LineParser()
    expect(p.push('{"type":"voice","source":"sys')).toEqual([])
    expect(p.push('tem","active":true}\n')).toEqual([
      { type: 'voice', source: 'system', active: true },
    ])
  })

  it('handles several lines in one chunk and skips malformed ones', () => {
    const p = new LineParser()
    const events = p.push('{"type":"stopped"}\nnot json\n{"type":"ready","sampleRate":8000}\n')
    expect(events.map((e) => e.type)).toEqual(['stopped', 'ready'])
  })
})

describe('TranscriptLog', () => {
  const t = (source: 'system' | 'mic', text: string, isFinal: boolean): AudioEvent => ({
    type: 'transcript', source, text, isFinal,
  })

  it('attributes system audio to them and mic to you', () => {
    const log = new TranscriptLog()
    log.apply(t('system', 'Tell me about yourself', true))
    log.apply(t('mic', 'Sure, I am a data science student', true))
    expect(log.current()).toEqual([
      { speaker: 'them', text: 'Tell me about yourself', final: true },
      { speaker: 'you', text: 'Sure, I am a data science student', final: true },
    ])
  })

  it('replaces a partial line as recognition refines it', () => {
    const log = new TranscriptLog()
    log.apply(t('system', 'Tell me', false))
    log.apply(t('system', 'Tell me about', false))
    expect(log.current()).toEqual([{ speaker: 'them', text: 'Tell me about', final: false }])

    log.apply(t('system', 'Tell me about yourself', true))
    expect(log.current()).toEqual([
      { speaker: 'them', text: 'Tell me about yourself', final: true },
    ])
  })

  it('finds the last thing the other party said', () => {
    const log = new TranscriptLog()
    log.apply(t('system', 'First question', true))
    log.apply(t('mic', 'my answer', true))
    log.apply(t('system', 'Second question', true))
    expect(log.lastFromThem()).toBe('Second question')
  })

  it('falls back to a partial line when nothing is final yet', () => {
    const log = new TranscriptLog()
    log.apply(t('system', 'What is your greatest', false))
    expect(log.lastFromThem()).toBe('What is your greatest')
  })

  it('renders recent text with speaker labels, trimmed to a budget', () => {
    const log = new TranscriptLog()
    log.apply(t('system', 'A'.repeat(50), true))
    log.apply(t('mic', 'B'.repeat(50), true))
    const text = log.recentText(40)
    expect(text.length).toBeLessThanOrEqual(40)
    expect(log.recentText()).toContain('Them: ')
    expect(log.recentText()).toContain('You: ')
  })

  it('ignores empty final fragments and clears cleanly', () => {
    const log = new TranscriptLog()
    log.apply(t('system', '   ', true))
    expect(log.size).toBe(0)
    log.apply(t('system', 'real', true))
    log.clear()
    expect(log.current()).toEqual([])
  })
})
