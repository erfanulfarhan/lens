import { useEffect, useState } from 'react'
import type { StatusInfo } from '../lens.js'
import { Shortcuts } from './Shortcuts.js'
import { Providers } from './Providers.js'

/**
 * Shows the running version and lets the user check on demand. The automatic
 * check happens shortly after launch; this is for when someone wants to know now.
 */
function UpdateRow() {
  const [info, setInfo] = useState<import('../lens.js').UpdateInfo | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void window.lens.updateStatus().then(setInfo).catch(() => {})
    return window.lens.onUpdate(setInfo)
  }, [])

  const label = () => {
    if (busy || info?.state === 'checking') return 'Checking…'
    if (info?.state === 'available') return `Update to ${info.release?.version}`
    if (info?.state === 'error') return 'Check again'
    return 'Check for updates'
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-2.5">
      <p className="font-[family-name:var(--font-read)] text-[11px] text-paper">
        Lens {info?.currentVersion ?? ''}
      </p>
      <p className="mt-0.5 text-[11px] text-muted">
        {info?.state === 'available'
          ? `Version ${info.release?.version} is available.`
          : info?.state === 'error'
            ? 'Could not reach GitHub. You may be offline.'
            : info?.state === 'current'
              ? 'This is the latest version.'
              : 'Checks automatically shortly after launch.'}
      </p>

      <div className="mt-2 flex gap-1.5">
        <button
          onClick={async () => {
            setBusy(true)
            try { setInfo(await window.lens.checkUpdate()) } finally { setBusy(false) }
          }}
          disabled={busy}
          className="rounded-lg border border-line bg-raise px-2.5 py-1 text-[11.5px] text-paper transition hover:bg-white/10 disabled:text-muted"
        >
          {label()}
        </button>
        {info?.state === 'available' && (
          <button
            onClick={() => void window.lens.downloadUpdate()}
            className="rounded-lg bg-sage px-2.5 py-1 text-[11.5px] font-semibold text-ink"
          >
            Download
          </button>
        )}
      </div>
    </div>
  )
}

/** A destructive action always names what it removes and cannot fire on one click. */
function DangerButton({ label, confirmLabel, onConfirm }: {
  label: string
  confirmLabel: string
  onConfirm(): void
}) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])

  return (
    <button
      onClick={() => (armed ? (onConfirm(), setArmed(false)) : setArmed(true))}
      className={
        'w-full rounded-lg border px-2.5 py-1.5 text-left text-[12px] transition ' +
        (armed
          ? 'border-red-500/50 bg-red-500/15 text-red-300'
          : 'border-line bg-raise text-muted hover:border-red-500/30 hover:text-paper')
      }
    >
      {armed ? confirmLabel : label}
    </button>
  )
}

interface Props {
  status: StatusInfo | null
  ollamaUrl: string
  hasKey: Record<string, boolean>
  theme: 'dark' | 'light' | 'system'
  onSetTheme(t: 'dark' | 'light' | 'system'): void
  onSaveOllamaUrl(url: string): void
  onSetKey(id: string, key: string): Promise<void>
  onSetProvider(id: string): Promise<void>
  files: string[]
  onClose(): void
  onClearMemory(): void
  onClearHistory(): void
  onClearKnowledge(): void
  onRemoveFile(name: string): void
  onOpenKnowledge(): void
  onSaveAboutMe(text: string): void
}

export function SettingsPanel({
  status, files, ollamaUrl, hasKey, theme, onSetTheme, onSaveOllamaUrl, onSetKey, onSetProvider, onClose,
  onClearMemory, onClearHistory, onClearKnowledge, onRemoveFile, onOpenKnowledge,
  onSaveAboutMe,
}: Props) {
  const [aboutMe, setAboutMe] = useState('')
  const [saved, setSaved] = useState(false)
  const [url, setUrl] = useState(ollamaUrl)
  const [urlSaved, setUrlSaved] = useState(false)

  useEffect(() => {
    void window.lens.getAboutMe().then(setAboutMe).catch(() => setAboutMe(''))
  }, [])

  function save() {
    onSaveAboutMe(aboutMe)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="no-drag absolute inset-0 z-20 flex flex-col bg-ink">
      <header className="drag flex items-center justify-between border-b border-line px-3 py-2.5">
        <h2 className="readout text-brass">Settings</h2>
        <button
          onClick={onClose}
          className="no-drag rounded px-1.5 text-[15px] leading-none text-muted hover:text-paper"
        >
          ×
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        <Providers
          activeProvider={status?.providerId ?? 'ollama'}
          hasKey={hasKey}
          onSetKey={onSetKey}
          onSetProvider={onSetProvider}
          onOpenExternal={(url) => void window.lens.openExternal(url)}
        />

        <section>
          <h3 className="readout mb-1.5 text-muted/70">Running on</h3>
          <div className="rounded-lg border border-line bg-panel p-2.5">
            <p className="font-[family-name:var(--font-read)] text-[11px] text-paper">
              {status?.model ?? 'not connected'}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              {status?.provider.startsWith('ollama')
                ? 'Your own machine. Nothing is sent to a company.'
                : 'A cloud provider, using your API key.'}
            </p>
          </div>
        </section>

        <Shortcuts askAccelerator={status?.askShortcut} />

        <section>
          <h3 className="readout mb-1.5 text-muted/70">Model server</h3>
          <p className="mb-2 text-[11px] leading-relaxed text-muted">
            Where Ollama runs. Point this at another computer to use its graphics card
            while Lens stays on this one.
          </p>
          <div className="flex gap-1.5">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:11434"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-line bg-raise px-2.5 py-1.5 font-[family-name:var(--font-read)] text-[11px] text-paper outline-none placeholder:text-muted/50 focus:border-brass/40"
            />
            <button
              onClick={() => {
                onSaveOllamaUrl(url.trim())
                setUrlSaved(true)
                setTimeout(() => setUrlSaved(false), 1800)
              }}
              className="shrink-0 rounded-lg bg-raise px-2.5 py-1.5 text-[11.5px] text-paper hover:bg-white/10"
            >
              {urlSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </section>

        <section>
          <h3 className="readout mb-1.5 text-muted/70">About you</h3>
          <p className="mb-2 text-[11px] leading-relaxed text-muted">
            Anything written here is used in every answer, so it can speak as you.
          </p>
          <textarea
            value={aboutMe}
            onChange={(e) => setAboutMe(e.target.value)}
            rows={7}
            placeholder={"I'm a data science student in Dhaka.\nI care about traffic and public health.\nAnswer briefly and in my own voice."}
            className="w-full resize-none rounded-lg border border-line bg-raise px-2.5 py-2 text-[12px] leading-relaxed text-paper outline-none placeholder:text-muted/50 focus:border-brass/40"
          />
          <button
            onClick={save}
            className="mt-2 rounded-lg bg-brass px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:bg-brass/90"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </section>

        <section>
          <h3 className="readout mb-1.5 text-muted/70">Documents · {files.length}</h3>
          {files.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-muted">
              Nothing loaded. Add files with the clip in the composer.
            </p>
          ) : (
            <ul className="mb-2 max-h-32 space-y-0.5 overflow-y-auto rounded-lg border border-line bg-panel p-1.5">
              {files.map((f) => (
                <li key={f} className="group flex items-center gap-1.5 rounded px-1 py-1 hover:bg-raise">
                  <span
                    className="min-w-0 flex-1 truncate font-[family-name:var(--font-read)] text-[10.5px] text-muted"
                    title={f}
                  >
                    {f}
                  </span>
                  <button
                    onClick={() => onRemoveFile(f)}
                    title={`Remove ${f}`}
                    aria-label={`Remove ${f}`}
                    className="shrink-0 rounded px-1 text-[13px] leading-none text-muted opacity-0 transition hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={onOpenKnowledge}
            className="w-full rounded-lg border border-line bg-raise px-2.5 py-1.5 text-left text-[12px] text-muted transition hover:border-brass/40 hover:text-paper"
          >
            Open documents folder
          </button>
        </section>

        <section>
          <h3 className="readout mb-1.5 text-muted/70">Appearance</h3>
          <p className="mb-2 text-[11px] leading-relaxed text-muted">
            Dark suits an overlay at night; light reads better on a bright screen.
          </p>
          <div className="flex gap-1">
            {(['dark', 'light', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => onSetTheme(t)}
                className={
                  'flex-1 rounded-lg border px-2 py-1.5 text-[11.5px] capitalize transition ' +
                  (theme === t
                    ? 'border-brass/45 bg-brass/10 text-brass'
                    : 'border-line bg-raise text-muted hover:text-paper')
                }
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="readout mb-1.5 text-muted/70">Version</h3>
          <UpdateRow />
        </section>

        <section>
          <h3 className="readout mb-1.5 text-muted/70">Start fresh</h3>
          <p className="mb-2 text-[11px] leading-relaxed text-muted">
            Finished with a topic? Clear what it has learned and load new material.
          </p>
          <div className="space-y-1.5">
            <DangerButton
              label="Clear what it learned about me"
              confirmLabel="Clear learned memory — click again"
              onConfirm={onClearMemory}
            />
            <DangerButton
              label="Delete all chats"
              confirmLabel="Delete every chat — click again"
              onConfirm={onClearHistory}
            />
            <DangerButton
              label="Remove all documents"
              confirmLabel="Remove all documents — click again"
              onConfirm={onClearKnowledge}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
