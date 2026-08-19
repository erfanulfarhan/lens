import { useEffect, useState } from 'react'
import type { UpdateInfo } from '../lens.js'

/**
 * Offers an update rather than performing one.
 *
 * Nothing is downloaded until the user says so, and dismissing it means dismissed
 * for that version: an update prompt that reappears every launch trains people to
 * ignore it. The panel is an overlay someone may be mid-task in, so this stays a
 * single quiet strip rather than a modal.
 */
export function UpdateBanner({
  info, onDownload, onNotes, onDismiss,
}: {
  info: UpdateInfo
  onDownload(): void
  onNotes(): void
  onDismiss(): void
}) {
  const [expanded, setExpanded] = useState(false)
  const [progress, setProgress] = useState<{ percent: number; phase: string; message?: string } | null>(null)

  useEffect(() => window.lens.onUpdateProgress(setProgress), [])

  if (info.state !== 'available' || !info.release) return null
  const busy = progress !== null && progress.phase !== 'error' && progress.phase !== 'done'

  const size = info.asset ? `${Math.round(info.asset.size / 1e6)}MB` : null

  return (
    <section className="border-b border-sage/25 bg-sage/[0.08] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-sage" />
        <p className="min-w-0 flex-1 text-[12px] leading-snug text-paper">
          Version <span className="font-[family-name:var(--font-read)]">{info.release.version}</span> is
          available. You have {info.currentVersion}.
        </p>
        <button
          onClick={onDismiss}
          title="Not now"
          className="shrink-0 rounded px-1 text-[13px] leading-none text-muted transition hover:text-paper"
        >
          ×
        </button>
      </div>

      {expanded && info.release.notes && (
        <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-panel p-2 text-[11px] leading-relaxed text-muted">
          {info.release.notes}
        </pre>
      )}

      {progress && (
        <div className="mt-2">
          <div className="h-1 overflow-hidden rounded-full bg-raise">
            <div
              className="h-full rounded-full bg-sage transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="readout mt-1.5 text-muted">
            {progress.phase === 'downloading' && `downloading ${progress.percent}%`}
            {progress.phase === 'installing' && 'installing'}
            {progress.phase === 'done' && (progress.message ?? 'done')}
            {progress.phase === 'error' && (progress.message ?? 'failed')}
          </p>
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        <button
          onClick={onDownload}
          disabled={busy}
          className="rounded-lg bg-sage px-2.5 py-1 text-[11.5px] font-semibold text-ink transition hover:bg-sage/90 disabled:bg-raise disabled:text-muted"
        >
          {busy ? 'Working…' : `Update now${size ? ` (${size})` : ''}`}
        </button>
        {busy && (
          <button
            onClick={() => void window.lens.cancelUpdateDownload()}
            className="rounded-lg px-2 py-1 text-[11.5px] text-muted transition hover:text-paper"
          >
            Cancel
          </button>
        )}
        {info.release.notes && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg px-2 py-1 text-[11.5px] text-muted transition hover:text-paper"
          >
            {expanded ? 'Hide changes' : "What's new"}
          </button>
        )}
        <button
          onClick={onNotes}
          className="ml-auto rounded-lg px-2 py-1 text-[11px] text-muted transition hover:text-paper"
        >
          Open release page
        </button>
      </div>
    </section>
  )
}
