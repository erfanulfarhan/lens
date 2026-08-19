import { useEffect, useRef } from 'react'
import type { Command } from '../commands.js'

/**
 * The list that appears when the composer starts with a slash.
 *
 * Sits above the input rather than below it, because the composer is already at
 * the bottom of the panel and a menu below would fall off screen.
 */
export function CommandMenu({
  commands, selected, onPick, onHover,
}: {
  commands: Command[]
  selected: number
  onPick(c: Command): void
  onHover(i: number): void
}) {
  const listRef = useRef<HTMLUListElement>(null)

  // Keep the keyboard selection in view when arrowing past the visible rows.
  useEffect(() => {
    listRef.current?.children[selected]?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  if (commands.length === 0) return null

  return (
    <div className="mx-3 mb-1 overflow-hidden rounded-xl border border-line bg-panel shadow-2xl">
      <ul ref={listRef} className="max-h-56 overflow-y-auto py-1">
        {commands.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              onMouseEnter={() => onHover(i)}
              // mousedown, not click: the composer would lose focus first.
              onMouseDown={(e) => { e.preventDefault(); onPick(c) }}
              className={
                'flex w-full items-baseline gap-2.5 px-3 py-1.5 text-left transition ' +
                (i === selected ? 'bg-raise' : 'hover:bg-raise/60')
              }
            >
              <span
                className={
                  'font-[family-name:var(--font-read)] text-[11.5px] ' +
                  (i === selected ? 'text-brass' : 'text-muted')
                }
              >
                /{c.name}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted">{c.hint}</span>
              {c.needsScreen && <span className="readout shrink-0 text-sage/70">screen</span>}
            </button>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-3 py-1.5 text-[10px] text-muted/70">
        ↑↓ to choose · Enter to run · Esc to dismiss
      </p>
    </div>
  )
}
