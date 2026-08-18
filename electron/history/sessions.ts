import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  ts: number
  /** True when the answer was produced with a screenshot attached. */
  sawScreen?: boolean
}

export interface ChatSession {
  id: string
  /** Derived from the first user message; editable later. */
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}

/** Greetings and acknowledgements make useless chat names. */
const TRIVIAL = /^(hi|hey|hello|yo|sup|thanks|thank you|ok|okay|cool|nice|test|testing|yes|no)[\s!.?]*$/i

export function isTrivialTitle(text: string): boolean {
  return TRIVIAL.test(text.trim())
}

/** A short, human title from the first thing the user asked. */
export function titleFrom(text: string, max = 48): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return 'New chat'
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`
}

/**
 * Persistent chat history: many named sessions, each a list of messages, stored
 * as one JSON file. Separate from the learning memory store — this is what the
 * user browses and reopens in the sidebar.
 */
export class SessionStore {
  private sessions: ChatSession[] = []
  private activeId: string | null = null

  constructor(private path: string) {}

  async load(): Promise<void> {
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as ChatSession[]
      this.sessions = Array.isArray(parsed) ? parsed : []
    } catch {
      this.sessions = []
    }
    // Deliberately no active session after loading: each launch begins a new
    // chat, and the previous ones stay in the sidebar. Resuming the newest one
    // instead appended every future message to a single ever-growing chat, which
    // made the history look empty.
    this.activeId = null
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true })
    // Newest first, so the sidebar needs no sorting.
    this.sessions.sort((a, b) => b.updatedAt - a.updatedAt)
    await writeFile(this.path, JSON.stringify(this.sessions, null, 2), 'utf8')
  }

  /** Sidebar list: metadata only, no message bodies. */
  list(): Array<Pick<ChatSession, 'id' | 'title' | 'createdAt' | 'updatedAt'> & { count: number }> {
    return [...this.sessions]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        count: s.messages.length,
      }))
  }

  get active(): ChatSession | null {
    return this.sessions.find((s) => s.id === this.activeId) ?? null
  }

  async newSession(): Promise<ChatSession> {
    const now = Date.now()
    const session: ChatSession = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      title: 'New chat',
      createdAt: now,
      updatedAt: now,
      messages: [],
    }
    this.sessions.unshift(session)
    this.activeId = session.id
    await this.persist()
    return session
  }

  async open(id: string): Promise<ChatSession | null> {
    const found = this.sessions.find((s) => s.id === id)
    if (found) this.activeId = id
    return found ?? null
  }

  /** Appends to the active session, creating one if needed. */
  async append(message: ChatMessage): Promise<void> {
    let session = this.active
    if (!session) session = await this.newSession()

    session.messages.push(message)
    session.updatedAt = message.ts

    // Name the chat from the first user message that actually says something, so
    // a chat that opens with "hi" gets named by the real question that follows.
    if (message.role === 'user') {
      const unnamed = session.title === 'New chat'
      const trivial = isTrivialTitle(session.title)
      if (unnamed || (trivial && !isTrivialTitle(message.text))) {
        session.title = titleFrom(message.text)
      }
    }
    await this.persist()
  }

  async remove(id: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.id !== id)
    if (this.activeId === id) this.activeId = this.sessions[0]?.id ?? null
    await this.persist()
  }

  async rename(id: string, title: string): Promise<void> {
    const s = this.sessions.find((x) => x.id === id)
    if (!s) return
    s.title = titleFrom(title)
    await this.persist()
  }

  async clearAll(): Promise<void> {
    this.sessions = []
    this.activeId = null
    await this.persist()
  }

  /** Case-insensitive search across titles and message text. */
  search(query: string): ReturnType<SessionStore['list']> {
    const q = query.trim().toLowerCase()
    if (!q) return this.list()
    return this.list().filter((meta) => {
      if (meta.title.toLowerCase().includes(q)) return true
      const full = this.sessions.find((s) => s.id === meta.id)
      return full?.messages.some((m) => m.text.toLowerCase().includes(q)) ?? false
    })
  }
}
