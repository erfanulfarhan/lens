import type { DoneInfo } from '../lens.js'

/**
 * The signature element: an instrument readout under each answer. It states
 * where the answer actually ran, how long it took, and how much of the user's
 * own knowledge it drew on — the facts that matter when you host the model
 * yourself, and the ones a cloud product cannot honestly show you.
 */
/** Seconds with one decimal below ten, whole seconds above, minutes beyond that. */
function formatDuration(ms: number): string {
  const s = ms / 1000
  if (s < 10) return `${s.toFixed(1)}s`
  if (s < 60) return `${Math.round(s)}s`
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

export function Readout({ info, docs }: { info: DoneInfo; docs: number }) {
  const local = info.servedBy.startsWith('ollama:')

  const cells = [
    // The reasoning cost leads, because it is the part of the wait the user felt.
    ...(info.thinking
      ? [{ label: `thought for ${formatDuration(info.thinking.ms)}`, accent: false }]
      : []),
    ...(info.thinking && info.thinking.tokens > 0
      ? [{ label: `${info.thinking.tokens} thinking tokens`, accent: false }]
      : []),
    { label: local ? 'local' : 'cloud', accent: local },
    { label: info.sawScreen ? 'saw screen' : 'no screen' },
    ...(docs > 0 ? [{ label: `${docs} docs` }] : []),
    ...(info.cacheReadTokens > 0 ? [{ label: `${info.cacheReadTokens} cached` }] : []),
  ]

  return (
    <div className="mt-2 flex items-center gap-2 border-t border-line/70 pt-1.5">
      {cells.map((c, i) => (
        <span key={c.label} className="flex items-center gap-2">
          {i > 0 && <span className="text-line">·</span>}
          <span className={'readout ' + (c.accent ? 'text-sage' : 'text-muted/70')}>
            {c.label}
          </span>
        </span>
      ))}
    </div>
  )
}
