import { useRef, type FormEvent, type KeyboardEvent } from 'react'

interface Props {
  value: string
  busy: boolean
  /** When a capture is waiting, the prompt asks for an instruction about it. */
  screenAttached?: boolean
  fileCount: number
  onChange(v: string): void
  onSubmit(): void
  onAttach(): void
}

export function Composer({ value, busy, screenAttached, fileCount, onChange, onSubmit, onAttach }: Props) {
  const box = useRef<HTMLTextAreaElement>(null)

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!value.trim() || busy) return
    onSubmit()
  }

  // Enter sends, Shift+Enter makes a new line: the convention people expect.
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form onSubmit={submit} className="no-drag border-t border-line bg-panel/80 px-3 py-2.5">
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={onAttach}
          title="Add documents it should know"
          className="relative shrink-0 rounded-lg border border-line bg-raise px-2 py-2 text-[13px] leading-none text-muted transition hover:border-brass/40 hover:text-brass"
        >
          <span aria-hidden>&#128206;</span>
          {fileCount > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-brass px-1 text-[9px] font-semibold text-ink">
              {fileCount}
            </span>
          )}
        </button>

        <textarea
          ref={box}
          rows={1}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`
          }}
          onKeyDown={onKeyDown}
          placeholder={screenAttached ? 'Tell me what to do with the screen' : 'Ask anything'}
          className="max-h-[120px] min-h-[34px] flex-1 resize-none rounded-lg border border-line bg-raise px-3 py-2 text-[13px] leading-snug text-paper outline-none placeholder:text-muted/60 focus:border-brass/40"
        />

        <button
          type="submit"
          disabled={!value.trim() || busy}
          className="shrink-0 rounded-lg bg-brass px-3 py-2 text-[12px] font-semibold text-ink transition hover:bg-brass/90 disabled:bg-raise disabled:text-muted"
        >
          {busy ? '…' : 'Ask'}
        </button>
      </div>
    </form>
  )
}
