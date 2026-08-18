/**
 * Words shown while the model works. They rotate so a long wait feels alive
 * rather than stuck. Chosen to fit an instrument you own — a few are wry, none
 * pretend the machine is a person.
 */
export const THINKING_WORDS = [
  'Spinning', 'Smooshing', 'Noodling', 'Percolating', 'Marinating',
  'Simmering', 'Whirring', 'Cogitating', 'Ruminating', 'Pondering',
  'Mulling', 'Puzzling', 'Untangling', 'Finagling', 'Wrangling',
  'Churning', 'Brewing', 'Kneading', 'Tinkering', 'Fiddling',
  'Rummaging', 'Sifting', 'Scheming', 'Conjuring', 'Divining',
  'Deliberating', 'Contemplating', 'Crunching', 'Buffering thoughts',
  'Consulting the coils', 'Warming up', 'Whittling', 'Doodling',
  'Grokking', 'Musing', 'Wibbling', 'Thonking', 'Cranking',
]

/** Words for the brief final phase, once text is actually streaming. */
export const WRITING_WORDS = [
  'Writing', 'Scribbling', 'Drafting', 'Typing', 'Composing', 'Jotting',
]

/**
 * Picks a word different from the current one, so a rotation never appears to
 * stall by repeating itself.
 */
export function nextWord(words: readonly string[], current: string | null, random = Math.random): string {
  if (words.length === 0) return ''
  if (words.length === 1) return words[0]

  const options = current ? words.filter((w) => w !== current) : words
  return options[Math.floor(random() * options.length)] ?? options[0]
}

/** Human-friendly elapsed time; seconds are enough at this scale. */
export function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}
