import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryStore, looksLikeScreenDescription } from './store.js'
import type { Embedder } from '../knowledge/embedder.js'

// Deterministic fake: embeds on shared words so similarity is predictable.
const fakeEmbedder: Embedder = {
  available: true,
  async embed(texts) {
    const vocab = ['react', 'python', 'apu', 'traffic', 'weakness']
    return texts.map((t) => vocab.map((w) => (t.toLowerCase().includes(w) ? 1 : 0)))
  },
}

let path: string
beforeEach(async () => {
  path = join(await mkdtemp(join(tmpdir(), 'lens-mem-')), 'history.jsonl')
})

describe('MemoryStore', () => {
  it('persists exchanges to disk and reloads them', async () => {
    const a = new MemoryStore(path, fakeEmbedder)
    await a.add('Tell me about APU', 'It is a university.')
    expect((await readFile(path, 'utf8')).trim().split('\n')).toHaveLength(1)

    const b = new MemoryStore(path, fakeEmbedder)
    await b.load()
    expect(b.size).toBe(1)
    expect(b.recent(5)[0].question).toBe('Tell me about APU')
  })

  it('recalls a topically related past exchange', async () => {
    const m = new MemoryStore(path, fakeEmbedder)
    // Add enough that the target is outside the excluded-recent window.
    await m.add('What are my python skills?', 'Strong in python.')
    for (let i = 0; i < 5; i++) await m.add(`filler ${i}`, 'x')

    const recalled = await m.recall('Tell me about my python experience')
    expect(recalled).toContain('Strong in python')
  })

  it('returns nothing when no past turn is related', async () => {
    const m = new MemoryStore(path, fakeEmbedder)
    await m.add('APU traffic question', 'answer')
    for (let i = 0; i < 5; i++) await m.add(`filler ${i}`, 'x')
    expect(await m.recall('unrelated weakness topic')).not.toContain('APU traffic')
  })
})


describe('screen-description filtering', () => {
  it('recognises answers that just narrate the screen', () => {
    expect(looksLikeScreenDescription('The screenshot shows a file named x.md')).toBe(true)
    expect(looksLikeScreenDescription('Click the "Next Question" button to proceed.')).toBe(true)
    expect(looksLikeScreenDescription('You are viewing APU admissions')).toBe(true)
  })

  it('leaves real answers alone', () => {
    expect(looksLikeScreenDescription('I want to study at APU because of its data science programme.')).toBe(false)
  })

  // Replaying screen narration as history made the model answer "hi" with a
  // screen description, so those turns must never be fed back.
  it('excludes poisoned turns from recent()', async () => {
    const m = new MemoryStore(path, fakeEmbedder)
    await m.add('what is on my screen', 'The screenshot shows a file named persona.md')
    await m.add('why data science', 'Because I want to solve traffic problems.')
    const recent = m.recent(10)
    expect(recent).toHaveLength(1)
    expect(recent[0].answer).toContain('traffic')
  })
})

describe('clear', () => {
  it('wipes history from memory and disk', async () => {
    const m = new MemoryStore(path, fakeEmbedder)
    await m.add('q1', 'a1')
    await m.add('q2', 'a2')
    expect(m.size).toBe(2)

    await m.clear()
    expect(m.size).toBe(0)

    const reloaded = new MemoryStore(path, fakeEmbedder)
    await reloaded.load()
    expect(reloaded.size).toBe(0)
  })
})


describe('feedback-loop prevention', () => {
  it('never stores a screen-description answer', async () => {
    const m = new MemoryStore(path, fakeEmbedder)
    await m.add('what is on my screen', 'The screenshot shows a file named x.md')
    expect(m.size).toBe(0)
  })

  it('excludes screen descriptions from recall, not just replay', async () => {
    const m = new MemoryStore(path, fakeEmbedder)
    // Force a poisoned entry in as if written by an older version.
    await m.add('about python', 'You are viewing a python file')  // dropped by add()
    await m.add('about python skills', 'Strong in python and pandas.')
    for (let i = 0; i < 5; i++) await m.add(`filler ${i}`, 'x')

    const recalled = await m.recall('tell me about python')
    expect(recalled).not.toContain('You are viewing')
    expect(recalled).toContain('pandas')
  })

  it('prunes poisoned entries already on disk when loading', async () => {
    // Write a history file directly, mixing good and poisoned entries.
    const { writeFile } = await import('node:fs/promises')
    const rows = [
      { ts: 1, question: 'q1', answer: 'Click the "Next" button to proceed.' },
      { ts: 2, question: 'q2', answer: 'A genuine answer about data science.' },
      { ts: 3, question: 'q3', answer: 'The screenshot shows your desktop.' },
    ]
    await writeFile(path, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8')

    const m = new MemoryStore(path, fakeEmbedder)
    await m.load()
    expect(m.size).toBe(1)
    expect(m.recent(5)[0].answer).toContain('data science')
  })
})

describe('answer ratings', () => {
  it('records a rating against the matching exchange', async () => {
    const m = new MemoryStore(path, fakeEmbedder)
    await m.add('about python', 'Strong in python.')
    expect(await m.rate('Strong in python.', 'good')).toBe(true)
    expect(m.recent(5)[0].rating).toBe('good')
  })

  it('reports when there is nothing to rate', async () => {
    const m = new MemoryStore(path, fakeEmbedder)
    expect(await m.rate('never said this', 'bad')).toBe(false)
  })

  it('clears a rating when passed null', async () => {
    const m = new MemoryStore(path, fakeEmbedder)
    await m.add('q', 'an answer')
    await m.rate('an answer', 'bad')
    await m.rate('an answer', null)
    expect(m.recent(5)[0].rating).toBeUndefined()
  })

  it('survives a reload', async () => {
    const a = new MemoryStore(path, fakeEmbedder)
    await a.add('q', 'an answer')
    await a.rate('an answer', 'good')

    const b = new MemoryStore(path, fakeEmbedder)
    await b.load()
    expect(b.recent(5)[0].rating).toBe('good')
  })

  // Collecting a rating and then ignoring it would be theatre; a rejected answer
  // must actually stop being offered back to the model.
  it('never recalls an answer the user rejected', async () => {
    const m = new MemoryStore(path, fakeEmbedder)
    await m.add('my python skills', 'Weak and wrong about python.')
    await m.rate('Weak and wrong about python.', 'bad')
    for (let i = 0; i < 5; i++) await m.add(`filler ${i}`, 'x')

    expect(await m.recall('tell me about python')).not.toContain('Weak and wrong')
  })

  it('tells the model which answers were approved', async () => {
    const m = new MemoryStore(path, fakeEmbedder)
    await m.add('my python skills', 'Strong in python and pandas.')
    await m.rate('Strong in python and pandas.', 'good')
    for (let i = 0; i < 5; i++) await m.add(`filler ${i}`, 'x')

    const recalled = await m.recall('tell me about python')
    expect(recalled).toContain('pandas')
    expect(recalled).toContain('marked this answer good')
  })
})
