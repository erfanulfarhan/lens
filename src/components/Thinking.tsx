import { useEffect, useRef, useState } from 'react'
import { formatElapsed, nextWord, THINKING_WORDS, WRITING_WORDS } from './thinkingWords.js'
import { Logo } from './Logo.js'

const ROTATE_MS = 2400

/**
 * Progress while the model works.
 *
 * A local reasoning model can take ten seconds or more before its first word, so
 * this has to do two jobs: prove something is happening, and make the wait
 * legible. The rotating word keeps it alive, the elapsed counter is honest about
 * how long it has been, and the phase distinction matters because reasoning is
 * genuinely the slow part.
 */
export function Thinking({ reasoning }: { reasoning: boolean }) {
  const words = reasoning ? THINKING_WORDS : WRITING_WORDS
  const [word, setWord] = useState(() => nextWord(words, null))
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(Date.now())

  // Rotate the word. Re-keyed on phase so switching to "writing" swaps the set.
  useEffect(() => {
    setWord((current) => nextWord(words, current))
    const id = setInterval(() => setWord((current) => nextWord(words, current)), ROTATE_MS)
    return () => clearInterval(id)
  }, [words])

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startedAt.current), 500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-2.5">
      {/* The mark itself is the indicator: the aperture works while it thinks. */}
      <Logo size={17} active />

      {/* The word fades in on each change, so rotation reads as deliberate. */}
      <span key={word} className="text-[12.5px] text-paper/85" style={{ animation: 'lens-fade 320ms ease-out' }}>
        {word}
        <span className="text-muted">…</span>
      </span>

      {elapsed > 2500 && <span className="readout text-muted/70">{formatElapsed(elapsed)}</span>}

      {/* One stable message for screen readers instead of the rotation. */}
      <span role="status" aria-live="polite" className="sr-only">
        {reasoning ? 'Reasoning about your question' : 'Writing the answer'}
      </span>
    </div>
  )
}
