import type { AskContext } from './types.js'

export const OPERATING_RULES = `You are Lens, an assistant running on the user's Mac.

The user asks a QUESTION. A screenshot of their screen may be attached as
reference. Your job is to ANSWER THE QUESTION, not to describe the screenshot.

Rules:
- Answer the user's question directly. Lead with the answer.
- The screenshot is context only. Use it ONLY if the question is about what is on
  screen (e.g. "what does this error mean", "read this"). Otherwise ignore it and
  do NOT describe it.
- Never narrate what you see on screen unless explicitly asked to. Do not begin
  with "The screen shows", "I see", "The image displays" or similar. If a
  screenshot is attached but the question is not about it, pretend it is absent.
- Be brief. Short sentences or bullets. No preamble, no restating the question.
- Ground answers in the user's own background when relevant. It is provided below.
- If you do not know, say so. Do not invent specifics about the user.`

/**
 * Renders the volatile tail of the request: transcript, screenshot, question.
 * ORDER MATTERS. This content changes on every single request, so it must sit
 * after every cache breakpoint or the cached prefix is invalidated each time.
 */
export function assembleUserContent(ctx: AskContext): Array<
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
> {
  const blocks: ReturnType<typeof assembleUserContent> = []

  // The question leads. A vision model answers whatever comes first, so putting
  // the screenshot ahead of the question makes it describe the screen instead of
  // answering. Question first, image labelled as optional reference, last.
  blocks.push({ type: 'text', text: `QUESTION: ${ctx.question}` })

  if (ctx.transcript?.trim()) {
    blocks.push({
      type: 'text',
      text: `Recent audio transcript (context):\n${ctx.transcript.trim()}`,
    })
  }

  if (ctx.screenshot) {
    blocks.push({
      type: 'text',
      text: 'A screenshot of the screen is attached below for reference. Use it only if the question is about the screen.',
    })
    blocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: ctx.screenshot.mediaType,
        data: ctx.screenshot.base64,
      },
    })
  }

  return blocks
}
