import { useState } from 'react'

/**
 * Was this answer any good?
 *
 * Not a metric: a rejected answer is excluded from what Lens recalls later, and
 * an approved one is preferred. Shown quietly, appearing on hover, because most
 * answers will never be rated and the controls should not compete with the text.
 */
export function Feedback({ answer }: { answer: string }) {
  const [rating, setRating] = useState<'good' | 'bad' | null>(null)

  async function set(next: 'good' | 'bad') {
    // Pressing the same button again clears it, which is how a toggle should behave.
    const value = rating === next ? null : next
    setRating(value)
    await window.lens.rateAnswer(answer, value)
  }

  const style = (kind: 'good' | 'bad') =>
    'rounded px-1 text-[11px] leading-none transition ' +
    (rating === kind
      ? kind === 'good' ? 'text-sage' : 'text-red-400'
      : 'text-muted/50 opacity-0 group-hover:opacity-100 hover:text-paper focus-visible:opacity-100')

  return (
    <span className="ml-auto flex shrink-0 items-center gap-0.5">
      {rating === 'good' && <span className="readout mr-1 text-sage/70">kept</span>}
      {rating === 'bad' && <span className="readout mr-1 text-red-400/70">ignored</span>}
      <button onClick={() => void set('good')} title="Good answer, reuse it" className={style('good')}>
        &#128077;
      </button>
      <button onClick={() => void set('bad')} title="Bad answer, do not reuse it" className={style('bad')}>
        &#128078;
      </button>
    </span>
  )
}
