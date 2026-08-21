import { useEffect, useState } from 'react'
import { ProviderMark } from './ProviderMark'

interface ProviderInfo {
  id: string
  label: string
  keysUrl: string
  /** What the key looks like, so a wrong paste is obvious before saving. */
  hint: string
}

/** Local hosting first: it is the free option and the reason this app exists. */
const PROVIDERS: ProviderInfo[] = [
  { id: 'ollama', label: 'Your own machine', keysUrl: '', hint: 'No key needed' },
  { id: 'anthropic', label: 'Claude', keysUrl: 'https://console.anthropic.com/settings/keys', hint: 'sk-ant-…' },
  { id: 'gemini', label: 'Gemini', keysUrl: 'https://aistudio.google.com/apikey', hint: 'AIza… (free tier)' },
  { id: 'openai', label: 'OpenAI', keysUrl: 'https://platform.openai.com/api-keys', hint: 'sk-…' },
  { id: 'groq', label: 'Groq', keysUrl: 'https://console.groq.com/keys', hint: 'gsk_… (free tier)' },
]

/**
 * Provider and API key management.
 *
 * Keys were previously only enterable during first-run onboarding, so anyone who
 * skipped it had no way to add one. Keys are encrypted by the OS keychain and the
 * app never sends them back to the interface: it only reports which providers
 * have one stored.
 */
export function Providers({
  activeProvider, hasKey, onSetKey, onSetProvider, onOpenExternal,
}: {
  activeProvider: string
  hasKey: Record<string, boolean>
  onSetKey(id: string, key: string): Promise<void>
  onSetProvider(id: string): Promise<void>
  onOpenExternal(url: string): void
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => setDraft(''), [editing])

  async function save(id: string) {
    setBusy(true)
    try {
      await onSetKey(id, draft.trim())
      setEditing(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h3 className="readout mb-1.5 text-muted/70">Where answers come from</h3>
      <p className="mb-2 text-[11px] leading-relaxed text-muted">
        Keys are encrypted on this device and never leave it, except to the provider
        you choose.
      </p>

      <ul className="space-y-1.5">
        {PROVIDERS.map((p) => {
          const active = activeProvider === p.id
          const stored = Boolean(hasKey[p.id])
          const usable = p.id === 'ollama' || stored

          return (
            <li
              key={p.id}
              className={
                'rounded-lg border p-2.5 transition ' +
                (active ? 'border-brass/45 bg-brass/[0.07]' : 'border-line bg-panel')
              }
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={
                    'size-1.5 shrink-0 rounded-full ' +
                    (active ? 'bg-brass' : usable ? 'bg-sage/60' : 'bg-muted/40')
                  }
                />
                <span
                  className={
                    'shrink-0 ' +
                    (active ? 'text-brass' : usable ? 'text-paper/70' : 'text-muted/60')
                  }
                >
                  <ProviderMark id={p.id} />
                </span>
                <span className="text-[12.5px] font-medium text-paper">{p.label}</span>

                {p.id === 'ollama' && (
                  <span className="readout text-sage">free</span>
                )}
                {stored && p.id !== 'ollama' && (
                  <span className="readout text-sage">key saved</span>
                )}

                <div className="ml-auto flex items-center gap-1.5">
                  {!active && usable && (
                    <button
                      onClick={() => void onSetProvider(p.id)}
                      className="rounded-md bg-raise px-2 py-0.5 text-[11px] text-paper hover:bg-white/10"
                    >
                      Use
                    </button>
                  )}
                  {active && <span className="readout text-brass">in use</span>}
                  {p.id !== 'ollama' && (
                    <button
                      onClick={() => setEditing(editing === p.id ? null : p.id)}
                      className="rounded-md px-1.5 py-0.5 text-[11px] text-muted hover:text-paper"
                    >
                      {stored ? 'Change' : 'Add key'}
                    </button>
                  )}
                </div>
              </div>

              {editing === p.id && (
                <div className="mt-2">
                  <div className="flex gap-1.5">
                    <input
                      type="password"
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void save(p.id)}
                      placeholder={p.hint}
                      spellCheck={false}
                      className="min-w-0 flex-1 rounded-md border border-line bg-raise px-2 py-1.5 font-[family-name:var(--font-read)] text-[11px] text-paper outline-none placeholder:text-muted/50 focus:border-brass/40"
                    />
                    <button
                      onClick={() => void save(p.id)}
                      disabled={busy || !draft.trim()}
                      className="shrink-0 rounded-md bg-brass px-2.5 py-1.5 text-[11px] font-semibold text-ink disabled:bg-raise disabled:text-muted"
                    >
                      Save
                    </button>
                  </div>

                  <div className="mt-1.5 flex items-center gap-3">
                    {p.keysUrl && (
                      <button
                        onClick={() => onOpenExternal(p.keysUrl)}
                        className="text-[10.5px] text-brass hover:underline"
                      >
                        Get a key
                      </button>
                    )}
                    {stored && (
                      <button
                        onClick={async () => { await onSetKey(p.id, ''); setEditing(null) }}
                        className="text-[10.5px] text-muted hover:text-red-400"
                      >
                        Remove saved key
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
