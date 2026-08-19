/**
 * Slash commands for the composer.
 *
 * Every capability used to be a button in the title bar, which does not scale in
 * a 480px overlay and hides features behind hunting. A command is discoverable by
 * typing, and a new feature becomes a list entry rather than more chrome.
 */
export type CommandId =
  | 'screen' | 'summarise' | 'translate' | 'explain' | 'reply'
  | 'export' | 'clear' | 'new' | 'model' | 'settings' | 'docs' | 'web'

export interface Command {
  id: CommandId
  /** Typed after the slash. */
  name: string
  hint: string
  /** Alternative spellings, including the ones people reach for first. */
  aliases?: string[]
  /** Commands that send a question rather than operate the app. */
  prompt?: string
  /** True when it needs the screen captured first. */
  needsScreen?: boolean
}

export const COMMANDS: Command[] = [
  { id: 'screen', name: 'screen', hint: 'Capture the screen and ask about it', needsScreen: true,
    prompt: 'What is on my screen, and what should I do about it?' },
  { id: 'explain', name: 'explain', hint: 'Explain what is on screen', needsScreen: true,
    prompt: 'Explain what is on my screen, simply.' },
  { id: 'summarise', name: 'summarise', aliases: ['summarize', 'sum'], hint: 'Summarise the screen', needsScreen: true,
    prompt: 'Summarise what is on my screen in a few bullet points.' },
  { id: 'translate', name: 'translate', hint: 'Translate what is on screen', needsScreen: true,
    prompt: 'Translate the text on my screen into English.' },
  { id: 'reply', name: 'reply', hint: 'Draft a reply to what is on screen', needsScreen: true,
    prompt: 'Draft a reply to the message on my screen, in my own voice.' },
  { id: 'export', name: 'export', hint: 'Save this chat as a file' },
  { id: 'new', name: 'new', aliases: ['n'], hint: 'Start a new chat' },
  { id: 'clear', name: 'clear', hint: 'Clear the current conversation' },
  { id: 'model', name: 'model', hint: 'Switch model' },
  { id: 'docs', name: 'docs', aliases: ['files', 'add'], hint: 'Add documents' },
  { id: 'web', name: 'web', hint: 'Turn web search on or off' },
  { id: 'settings', name: 'settings', aliases: ['prefs'], hint: 'Open settings' },
]

/** The partial command being typed, or null when the input is not a command. */
export function commandQuery(input: string): string | null {
  // Only a leading slash counts, so a URL or a fraction mid-sentence is untouched.
  const m = input.match(/^\/([a-z]*)$/i)
  return m ? m[1].toLowerCase() : null
}

/**
 * Commands matching what has been typed, best first.
 *
 * A prefix match ranks above a substring one so typing "s" offers "screen"
 * rather than something that merely contains an s.
 */
export function matchCommands(query: string, commands: Command[] = COMMANDS): Command[] {
  const q = query.toLowerCase()
  if (!q) return commands

  const score = (c: Command): number => {
    const names = [c.name, ...(c.aliases ?? [])]
    if (names.some((n) => n === q)) return 0
    if (names.some((n) => n.startsWith(q))) return 1
    if (names.some((n) => n.includes(q))) return 2
    if (c.hint.toLowerCase().includes(q)) return 3
    return -1
  }

  return commands
    .map((c) => ({ c, s: score(c) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s || a.c.name.localeCompare(b.c.name))
    .map((x) => x.c)
}

/** Resolves a fully typed command, e.g. "/export". */
export function resolveCommand(input: string, commands: Command[] = COMMANDS): Command | null {
  const q = commandQuery(input)
  if (q === null) return null
  return commands.find((c) => c.name === q || c.aliases?.includes(q)) ?? null
}

/** Moves the highlighted row, wrapping at both ends. */
export function moveSelection(current: number, delta: number, length: number): number {
  if (length === 0) return 0
  return (current + delta + length) % length
}
