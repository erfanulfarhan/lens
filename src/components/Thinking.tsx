import { useEffect, useRef, useState } from 'react'
import { formatElapsed, nextWord, THINKING_WORDS, WRITING_WORDS } from './thinkingWords.js'
import { advanceTyping, initialTypeState, readyForNextWord } from './typewriter.js'
import { Logo } from './Logo.js'

/**
 * One tick drives one character. Typing is slower than erasing because reading is
 * slower than forgetting, and a word that vanishes quickly feels deliberate
 * rather than glitchy.
 */
const TYPE_MS = 55
const ERASE_MS = 28

/**
 * Progress while the model works.
 *
 * A local reasoning model can take ten seconds or more before its first word, so
 * this has to do two jobs: prove something is happening, and make the wait
 * legible. The rotating word keeps it alive, the elapsed counter is honest about
 * how long it has been, and the phase distinction matters because reasoning is
 * genuinely the slow part.
 */
export function Thinking({ reasoning, tokens = 0 }: { reasoning: boolean; tokens?: number }) {
  const words = reasoning ? THINKING_WORDS : WRITING_WORDS
  const [word, setWord] = useState(() => nextWord(words, null))
  const [typed, setTyped] = useState(initialTypeState)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(Date.now())

  // Swap the word set when the phase changes, and start typing the new one.
  useEffect(() => {
    setWord((current) => nextWord(words, current))
    setTyped(initialTypeState())
  }, [words])

  // One character per tick. The interval is re-armed each step so typing and
  // erasing can run at different speeds.
  useEffect(() => {
    const delay = typed.phase === 'erasing' ? ERASE_MS : TYPE_MS
    const id = setTimeout(() => {
      setTyped((prev) => {
        const next = advanceTyping(prev, word)
        // A finished cycle picks the next word, so the line never repeats itself.
        if (readyForNextWord(next)) setWord((current) => nextWord(words, current))
        return next
      })
    }, delay)
    return () => clearTimeout(id)
  }, [typed, word, words])

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startedAt.current), 500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-2.5">
      {/* The mark itself is the indicator: the aperture works while it thinks. */}
      <Logo size={17} active />

      {/* Typed a character at a time, with a caret, so it reads as live thought. */}
      <span className="text-[12.5px] text-paper/85">
        {typed.text}
        <span className="type-caret" aria-hidden />
      </span>

      {/* Elapsed, and the reasoning spent so far: a long wait should show that
          something is accumulating, not just that time is passing. */}
      {elapsed > 2500 && (
        <span className="readout text-muted/70">
          {formatElapsed(elapsed)}
          {tokens > 0 && ` · ${tokens} tokens`}
        </span>
      )}

      {/* One stable message for screen readers instead of the rotation. */}
      {/* The typing is decorative; screen readers get one stable message. */}
      <span role="status" aria-live="polite" className="sr-only">
        {reasoning ? 'Reasoning about your question' : 'Writing the answer'}
      </span>
    </div>
  )
}
