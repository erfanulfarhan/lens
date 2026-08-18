/**
 * Decides whether a question is actually about what is on screen.
 *
 * This is deliberately CONSERVATIVE. An earlier version matched bare pronouns
 * ("this", "that", "here", "see", "read", "code"), which appear constantly in
 * ordinary questions — "what should I say about that weakness" attached a
 * screenshot and the vision model described the desktop instead of answering.
 * Default to no screen; require an explicit reference to the screen or to
 * looking at something.
 */

/** Phrases that unambiguously point at the screen. */
const EXPLICIT = [
  'on my screen', 'on the screen', 'on screen', 'my screen', 'the screen',
  'what am i looking at', 'in front of me', 'this screenshot', 'the screenshot',
  'this window', 'this page', 'this tab', 'this image', 'this picture',
  'this error', 'this code', 'this text', 'this message', 'this document',
  'this diagram', 'this chart', 'this table', 'this graph', 'this form',
  'what is this', "what's this", 'whats this', 'what does this say',
  'read this', 'read it', 'explain this', 'summarize this', 'summarise this',
  'translate this', 'fix this', 'debug this', 'what does this mean',
  'look at this', 'see this', 'describe this',
]

/** Verbs of looking, which only count when paired with a screen-ish noun. */
const LOOK_VERBS = /\b(read|look at|see|check|describe|analyz|analys|summariz|summaris|translate)\b/
const SCREEN_NOUNS = /\b(screen|screenshot|window|tab|page|image|picture|photo|diagram|chart|graph|table|error|stack ?trace|terminal|console|editor)\b/

export function questionNeedsScreen(question: string): boolean {
  const q = question.toLowerCase().trim()
  if (!q) return false

  if (EXPLICIT.some((phrase) => q.includes(phrase))) return true

  // "check the terminal", "analyse the chart": a looking verb AND a screen noun.
  return LOOK_VERBS.test(q) && SCREEN_NOUNS.test(q)
}
