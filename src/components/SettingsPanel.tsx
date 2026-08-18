import { useEffect, useState } from 'react'
import type { StatusInfo } from '../lens.js'

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
  status, files, onClose, onClearMemory, onClearHistory, onClearKnowledge, onRemoveFile,
  onOpenKnowledge, onSaveAboutMe,
}: Props) {
  const [aboutMe, setAboutMe] = useState('')
  const [saved, setSaved] = useState(false)

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
