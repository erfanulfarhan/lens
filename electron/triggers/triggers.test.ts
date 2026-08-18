import { describe, expect, it } from 'vitest'
import { AudioTurnTrigger } from './audio-turn.js'
import { Dispatcher } from './dispatcher.js'
import { ScreenChangeTrigger } from './screen-change.js'

/**
 * 9x8 BGRA frame of deterministic noise. Distinct seeds land ~21 bits apart on
 * a 64-bit dhash; a smooth gradient only moves ~3 bits when shifted, which is
 * below any sane threshold and makes for a fixture that tests nothing.
 */
function frame(seed: number): Uint8Array {
  const px = new Uint8Array(9 * 8 * 4)
  let s = (seed * 2654435761) % 4294967296
  for (let i = 0; i < 9 * 8; i++) {
    s = (s * 1103515245 + 12345) % 2147483648
    const v = s % 256
    px[i * 4] = v
    px[i * 4 + 1] = v
    px[i * 4 + 2] = v
    px[i * 4 + 3] = 255
  }
  return px
}

describe('ScreenChangeTrigger', () => {
  it('does not fire on the very first frame', () => {
    expect(new ScreenChangeTrigger().feed(frame(1), 0)).toBe(false)
  })

  it('stays quiet while the screen is still', () => {
    const t = new ScreenChangeTrigger()
    t.feed(frame(1), 0)
    expect(t.feed(frame(1), 1000)).toBe(false)
    expect(t.feed(frame(1), 2000)).toBe(false)
  })

  it('waits for the screen to settle before firing', () => {
    const t = new ScreenChangeTrigger()
    t.feed(frame(1), 0)
    expect(t.feed(frame(2), 1000)).toBe(false)   // changed, now settling
    expect(t.feed(frame(2), 1400)).toBe(false)   // not stable long enough
    expect(t.feed(frame(2), 1900)).toBe(true)    // settled
  })

  it('does not fire while content keeps moving', () => {
    const t = new ScreenChangeTrigger()
    t.feed(frame(1), 0)
    for (let i = 2; i <= 7; i++) {
      expect(t.feed(frame(i), i * 1000)).toBe(false)
    }
  })
})

describe('AudioTurnTrigger', () => {
  it('fires once after they speak then go quiet', () => {
    const t = new AudioTurnTrigger()
    t.onVoiceActivity('them', true, 0)
    t.onVoiceActivity('them', true, 2000)
    expect(t.poll(2300)).toBe(false)
    expect(t.poll(2700)).toBe(true)
    expect(t.poll(3000)).toBe(false)
  })

  it('ignores speech too short to be a real turn', () => {
    const t = new AudioTurnTrigger()
    t.onVoiceActivity('them', true, 0)
    t.onVoiceActivity('them', true, 400)
    expect(t.poll(1200)).toBe(false)
  })

  it('stays suppressed while you are talking', () => {
    const t = new AudioTurnTrigger()
    t.onVoiceActivity('them', true, 0)
    t.onVoiceActivity('them', true, 2000)
    t.onVoiceActivity('you', true, 2400)
    expect(t.poll(2700)).toBe(false)
  })
})

describe('Dispatcher', () => {
  it('suppresses automatic triggers inside the cooldown', () => {
    const d = new Dispatcher({ cooldownMs: 6000 })
    d.started('screen-change', 0)
    d.finished()
    expect(d.request('screen-change', 3000).reason).toBe('cooldown')
    expect(d.request('screen-change', 7000).run).toBe(true)
  })

  it('lets the hotkey bypass the cooldown', () => {
    const d = new Dispatcher({ cooldownMs: 6000 })
    d.started('screen-change', 0)
    d.finished()
    expect(d.request('hotkey', 100).run).toBe(true)
  })

  it('cancels a weaker request in flight for a stronger one', () => {
    const d = new Dispatcher()
    d.started('screen-change', 0)
    expect(d.request('hotkey', 100)).toMatchObject({ run: true, cancelInFlight: true })
  })

  it('refuses a weaker trigger while busy', () => {
    const d = new Dispatcher()
    d.started('hotkey', 0)
    expect(d.request('screen-change', 100).run).toBe(false)
  })
})
