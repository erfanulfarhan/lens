import { detectPlatform, shortcutList } from '../shortcuts.js'

/**
 * The shortcut reference.
 *
 * Keys are rendered for the platform the app is actually running on, and the
 * capture shortcut comes from what main.ts successfully registered, since the
 * preferred combination can be taken by another app.
 */
export function Shortcuts({ askAccelerator }: { askAccelerator?: string }) {
  const platform = detectPlatform()
  const shortcuts = shortcutList(platform, askAccelerator || undefined)
  const global = shortcuts.filter((s) => s.scope === 'global')
  const panel = shortcuts.filter((s) => s.scope === 'panel')

  const Row = ({ keys, action }: { keys: string; action: string }) => (
    <li className="flex items-baseline gap-3 py-1">
      <kbd className="shrink-0 rounded border border-line bg-raise px-1.5 py-0.5 font-[family-name:var(--font-read)] text-[10.5px] text-paper">
        {keys}
      </kbd>
      <span className="text-[11.5px] leading-snug text-muted">{action}</span>
    </li>
  )

  return (
    <section>
      <h3 className="readout mb-1.5 text-muted/70">Shortcuts</h3>

      <div className="rounded-lg border border-line bg-panel p-2.5">
        <p className="readout mb-1 text-muted/60">Anywhere</p>
        <ul className="mb-2.5">
          {global.map((s) => (
            <Row key={s.keys} keys={s.keys} action={s.action} />
          ))}
        </ul>

        <p className="readout mb-1 text-muted/60">In the panel</p>
        <ul>
          {panel.map((s) => (
            <Row key={s.keys + s.action} keys={s.keys} action={s.action} />
          ))}
        </ul>
      </div>
    </section>
  )
}
