import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { SessionStore, isTrivialTitle, titleFrom } from './sessions.js'

let path: string
beforeEach(async () => {
  path = join(await mkdtemp(join(tmpdir(), 'lens-hist-')), 'sessions.json')
})

const msg = (role: 'user' | 'assistant', text: string, ts = Date.now()) => ({ role, text, ts })

describe('titleFrom', () => {
  it('uses the text and truncates long ones', () => {
    expect(titleFrom('Why data science?')).toBe('Why data science?')
    expect(titleFrom('a'.repeat(80)).length).toBeLessThanOrEqual(48)
    expect(titleFrom('   ')).toBe('New chat')
  })
})

describe('SessionStore', () => {
  it('creates a session and names it from the first question', async () => {
    const s = new SessionStore(path)
    await s.load()
    await s.append(msg('user', 'What are my strengths?'))
    expect(s.active?.title).toBe('What are my strengths?')
  })

  it('persists sessions across a reload, reachable by reopening', async () => {
    const a = new SessionStore(path)
    await a.load()
    await a.append(msg('user', 'first question'))
    await a.append(msg('assistant', 'an answer'))
    const id = a.active!.id

    const b = new SessionStore(path)
    await b.load()
    expect(b.list()).toHaveLength(1)
    expect(b.list()[0].count).toBe(2)

    // A launch starts fresh, so the old chat is opened explicitly.
    const reopened = await b.open(id)
    expect(reopened?.messages[1].text).toBe('an answer')
  })

  it('keeps separate sessions and lists newest first', async () => {
    const s = new SessionStore(path)
    await s.load()
    await s.append(msg('user', 'older chat', 1000))
    await s.newSession()
    await s.append(msg('user', 'newer chat', 2000))

    const list = s.list()
    expect(list).toHaveLength(2)
    expect(list[0].title).toBe('newer chat')
  })

  it('reopens a previous session', async () => {
    const s = new SessionStore(path)
    await s.load()
    await s.append(msg('user', 'chat one', 1000))
    const firstId = s.active!.id
    await s.newSession()
    await s.append(msg('user', 'chat two', 2000))

    const reopened = await s.open(firstId)
    expect(reopened?.title).toBe('chat one')
    expect(s.active?.id).toBe(firstId)
  })

  it('deletes a session and picks another as active', async () => {
    const s = new SessionStore(path)
    await s.load()
    await s.append(msg('user', 'keep me', 1000))
    await s.newSession()
    await s.append(msg('user', 'delete me', 2000))
    const doomed = s.active!.id

    await s.remove(doomed)
    expect(s.list()).toHaveLength(1)
    expect(s.active?.title).toBe('keep me')
  })

  it('renames a session', async () => {
    const s = new SessionStore(path)
    await s.load()
    await s.append(msg('user', 'original'))
    await s.rename(s.active!.id, 'Interview prep')
    expect(s.list()[0].title).toBe('Interview prep')
  })

  it('searches titles and message bodies', async () => {
    const s = new SessionStore(path)
    await s.load()
    await s.append(msg('user', 'about python', 1000))
    await s.append(msg('assistant', 'you know pandas well', 1001))
    await s.newSession()
    await s.append(msg('user', 'about japan', 2000))

    expect(s.search('python').map((x) => x.title)).toEqual(['about python'])
    expect(s.search('pandas').map((x) => x.title)).toEqual(['about python'])
    expect(s.search('about')).toHaveLength(2)
    expect(s.search('')).toHaveLength(2)
  })

  it('clears every session', async () => {
    const s = new SessionStore(path)
    await s.load()
    await s.append(msg('user', 'x'))
    await s.clearAll()
    expect(s.list()).toHaveLength(0)
    expect(s.active).toBeNull()
  })
})


describe('a launch starts a new chat', () => {
  // Resuming the newest session on load appended every later message to one
  // ever-growing chat, so the sidebar appeared to have no history.
  it('does not resume the previous session after reload', async () => {
    const a = new SessionStore(path)
    await a.load()
    await a.append(msg('user', 'first chat question'))
    expect(a.list()).toHaveLength(1)

    const b = new SessionStore(path)
    await b.load()
    expect(b.active).toBeNull()

    await b.append(msg('user', 'second chat question'))
    expect(b.list()).toHaveLength(2)
  })
})

describe('chat titles', () => {
  it('recognises trivial openers', () => {
    expect(isTrivialTitle('hi')).toBe(true)
    expect(isTrivialTitle('Thanks!')).toBe(true)
    expect(isTrivialTitle('why data science')).toBe(false)
  })

  it('renames a chat that opened with a greeting', async () => {
    const s = new SessionStore(path)
    await s.load()
    await s.append(msg('user', 'hi'))
    expect(s.active?.title).toBe('hi')

    await s.append(msg('assistant', 'Hi!'))
    await s.append(msg('user', 'what are my strengths for the interview'))
    expect(s.active?.title).toBe('what are my strengths for the interview')
  })

  it('keeps a real title once set', async () => {
    const s = new SessionStore(path)
    await s.load()
    await s.append(msg('user', 'explain retrieval augmented generation'))
    await s.append(msg('user', 'and again'))
    expect(s.active?.title).toBe('explain retrieval augmented generation')
  })
})
