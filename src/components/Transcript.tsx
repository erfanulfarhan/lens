import { useEffect, useRef } from 'react'
import type { TranscriptLine } from '../lens.js'

/**
 * The live transcript of what is being said around you.
 *
 * Attribution is exact rather than guessed: the microphone is you and system
 * audio is everyone else, so no speaker-identification model is involved. A line
 * still being recognised is shown dimmed, which is honest about what is settled.
 */
export function Transcript({
  lines, autoAnswer, onToggleAutoAnswer, onAnswerLast, onClear,
}: {
  lines: TranscriptLine[]
  autoAnswer: boolean
  onToggleAutoAnswer(): void
  onAnswerLast(): void
  onClear(): void
}) {
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [lines])

  const lastFromThem = [...lines].reverse().find((l) => l.speaker === 'them')

  return (
    <section className="flex max-h-44 flex-col border-b border-line bg-ink/50">
      <header className="flex items-center gap-2 px-3 pt-2">
        <span className="readout text-sage">Listening</span>
        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-sage" />
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onToggleAutoAnswer}
            title="Answer automatically when they stop speaking"
            className={
              'rounded-full px-2 py-0.5 text-[10px] transition ' +
              (autoAnswer ? 'bg-brass/20 text-brass' : 'text-muted hover:bg-raise hover:text-paper')
            }
          >
            {autoAnswer ? 'Auto' : 'Auto off'}
          </button>
          <button
            onClick={onClear}
            title="Clear the transcript"
            className="rounded px-1.5 py-0.5 text-[10px] text-muted transition hover:text-paper"
          >
            Clear
          </button>
        </div>
      </header>

      <div ref={scroller} className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {lines.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-muted">
            Nothing heard yet. Audio from calls and your microphone will appear here.
          </p>
        ) : (
          lines.map((l, i) => (
            <p
              key={`${i}-${l.speaker}`}
              className={'text-[11.5px] leading-snug ' + (l.final ? '' : 'opacity-55')}
            >
              <span
                className={
                  'readout mr-1.5 ' + (l.speaker === 'them' ? 'text-sage' : 'text-brass')
                }
              >
                {l.speaker === 'them' ? 'them' : 'you'}
              </span>
              <span className="text-paper/90">{l.text}</span>
            </p>
          ))
        )}
      </div>

      {lastFromThem && !autoAnswer && (
        <button
          onClick={onAnswerLast}
          className="mx-3 mb-2 truncate rounded-lg border border-brass/35 bg-brass/10 px-2.5 py-1.5 text-left text-[11.5px] text-brass transition hover:bg-brass/20"
          title={lastFromThem.text}
        >
          Answer: “{lastFromThem.text.slice(0, 46)}
          {lastFromThem.text.length > 46 ? '…' : ''}”
        </button>
      )}
    </section>
  )
}
