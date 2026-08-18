import { useEffect, useMemo, useState } from 'react'
import type { SessionMeta } from '../lens.js'

/** Groups chats the way people actually recall them: by recency, not by date. */
function bucket(ts: number): string {
  const days = (Date.now() - ts) / 86_400_000
  if (days < 1) return 'Today'
  if (days < 2) return 'Yesterday'
  if (days < 7) return 'This week'
  return 'Earlier'
}

interface Props {
  sessions: SessionMeta[]
  activeId: string | null
  onOpen(id: string): void
  onNew(): void
  onDelete(id: string): void
  onRename(id: string, title: string): void
}

export function Sidebar({ sessions, activeId, onOpen, onNew, onDelete, onRename }: Props) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? sessions.filter((s) => s.title.toLowerCase().includes(q)) : sessions
  }, [sessions, query])

  const groups = useMemo(() => {
    const map = new Map<string, SessionMeta[]>()
    for (const s of filtered) {
      const key = bucket(s.updatedAt)
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return [...map.entries()]
  }, [filtered])

  useEffect(() => {
    if (editing) setDraft(sessions.find((s) => s.id === editing)?.title ?? '')
  }, [editing, sessions])

  function commitRename(id: string) {
    const next = draft.trim()
    if (next) onRename(id, next)
    setEditing(null)
  }

  return (
    <aside className="flex w-[232px] shrink-0 flex-col border-r border-line bg-ink/60">
      <div className="no-drag px-3 pt-3 pb-2">
        <button
          onClick={onNew}
          className="mb-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-brass/35 bg-brass/10 py-1.5 text-[12px] font-medium text-brass transition hover:bg-brass/20"
        >
          <span className="text-[14px] leading-none">+</span> New chat
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          className="w-full rounded-md border border-line bg-panel px-2.5 py-1.5 text-[12px] text-paper outline-none placeholder:text-muted/60 focus:border-brass/40"
        />
      </div>

      <div className="no-drag flex-1 overflow-y-auto px-2 pb-2">
        {sessions.length === 0 && (
          <p className="px-2 py-3 text-[11px] leading-relaxed text-muted">
            Your chats will appear here. Ask something to start the first one.
          </p>
        )}

        {sessions.length > 0 && filtered.length === 0 && (
          <p className="px-2 py-3 text-[11px] text-muted">No chats match “{query}”.</p>
        )}

        {groups.map(([label, items]) => (
          <section key={label} className="mb-2">
            <h2 className="readout px-2 py-1.5 text-muted/70">{label}</h2>
            <ul>
              {items.map((s) => {
                const active = s.id === activeId
                return (
                  <li key={s.id} className="group relative">
                    {editing === s.id ? (
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => commitRename(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(s.id)
                          if (e.key === 'Escape') setEditing(null)
                        }}
                        className="w-full rounded-md border border-brass/40 bg-panel px-2 py-1.5 text-[12px] outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => onOpen(s.id)}
                        onDoubleClick={() => setEditing(s.id)}
                        title={`${s.title} — double-click to rename`}
                        className={
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 pr-7 text-left text-[12px] transition ' +
                          (active
                            ? 'bg-raise text-paper'
                            : 'text-muted hover:bg-raise/60 hover:text-paper')
                        }
                      >
                        <span
                          aria-hidden
                          className={
                            'h-3.5 w-[2px] shrink-0 rounded-full ' +
                            (active ? 'bg-brass' : 'bg-transparent')
                          }
                        />
                        <span className="truncate">{s.title}</span>
                      </button>
                    )}

                    <button
                      onClick={() => onDelete(s.id)}
                      title="Delete chat"
                      className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded px-1 text-[13px] leading-none text-muted transition hover:text-red-400 group-hover:block"
                    >
                      ×
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  )
}
