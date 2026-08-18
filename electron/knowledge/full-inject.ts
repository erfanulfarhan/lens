import { watch, type FSWatcher } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { SystemBlock } from '../providers/types.js'
import { OPERATING_RULES } from '../providers/prompt.js'
import type { KnowledgeSource } from './source.js'
import { extractText, isSupported } from './extract.js'

/**
 * Injects the whole knowledge folder into the cached prefix. Viable because
 * Opus 5 has a 1M context window, and cheaper and more accurate than retrieval
 * until the folder gets genuinely large.
 */
export class FullInjectSource implements KnowledgeSource {
  readonly name = 'full-inject'
  private watcher?: FSWatcher
  private listeners: Array<() => void> = []
  private debounce?: NodeJS.Timeout

  constructor(private dir: string) {}

  async build(_query?: string): Promise<SystemBlock[]> {
    const files = await this.collect()
    const blocks: SystemBlock[] = [{ text: OPERATING_RULES }]

    if (files.length === 0) {
      // No breakpoint here: a prefix under ~1024 tokens will not cache anyway,
      // and marking it would just burn one of the four available breakpoints.
      blocks[0].cacheBreakpoint = true
      return blocks
    }

    const body = files
      .map((f) => `<document name="${f.name}">\n${f.content}\n</document>`)
      .join('\n\n')

    blocks.push({
      text: `The following is background material about the user.\n\n${body}`,
      cacheBreakpoint: true,
    })
    return blocks
  }

  /** persona.md is read first so the most important context leads the prefix. */
  private async collect(): Promise<Array<{ name: string; content: string }>> {
    let names: string[]
    try {
      names = await readdir(this.dir)
    } catch {
      return []
    }

    const usable = names
      .filter((n) => !n.startsWith('.') && isSupported(n))
      .sort((a, b) => {
        if (a === 'persona.md') return -1
        if (b === 'persona.md') return 1
        return a.localeCompare(b)
      })

    const out: Array<{ name: string; content: string }> = []
    for (const name of usable) {
      const path = join(this.dir, name)
      if (!(await stat(path)).isFile()) continue
      try {
        const content = await extractText(path)
        if (content) out.push({ name, content })
      } catch {
        // A single unreadable file must not blank the whole knowledge base.
      }
    }
    return out
  }

  onChange(cb: () => void): void {
    this.listeners.push(cb)
    if (this.watcher) return

    try {
      this.watcher = watch(this.dir, { recursive: true }, () => {
        // Editors write in bursts; one rebuild per burst, not one per write.
        clearTimeout(this.debounce)
        this.debounce = setTimeout(() => this.listeners.forEach((l) => l()), 300)
      })
    } catch {
      // Folder may not exist yet. It gets created on first run.
    }
  }

  dispose(): void {
    clearTimeout(this.debounce)
    this.watcher?.close()
    this.listeners = []
  }
}
