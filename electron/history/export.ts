import type { ChatMessage, ChatSession } from './sessions.js'

/** A chat is trapped in the app otherwise; markdown pastes anywhere. */
export function toMarkdown(session: ChatSession, appVersion = ''): string {
  const when = new Date(session.createdAt).toLocaleString()
  const lines: string[] = [
    `# ${session.title}`,
    '',
    `*${when}${appVersion ? ` · Lens ${appVersion}` : ''}*`,
    '',
  ]

  for (const m of session.messages) {
    if (m.role === 'user') {
      lines.push(`## ${m.text.trim()}`, '')
    } else {
      lines.push(m.text.trim(), '')
      // Recording whether the screen was read explains an answer that refers to
      // something not written in the question.
      if (m.sawScreen) lines.push('*Answered with a screenshot attached.*', '')
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

/** Plain text, for pasting somewhere that does not render markdown. */
export function toPlainText(session: ChatSession): string {
  const lines: string[] = [session.title, '='.repeat(session.title.length), '']
  for (const m of session.messages) {
    lines.push(`${m.role === 'user' ? 'You' : 'Lens'}: ${m.text.trim()}`, '')
  }
  return lines.join('\n').trimEnd() + '\n'
}

/** The whole conversation as data, for anyone who wants to process it. */
export function toJson(session: ChatSession): string {
  return JSON.stringify(session, null, 2)
}

/**
 * A filename that is safe on every platform.
 *
 * Windows rejects \\ / : * ? " < > | and trailing dots, and a chat title is
 * free text, so it cannot be used unfiltered.
 */
export function exportFileName(session: ChatSession, ext: string): string {
  const safe = session.title
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.+$/, '')
    .slice(0, 60)
  const date = new Date(session.updatedAt).toISOString().slice(0, 10)
  return `${safe || 'chat'} ${date}.${ext}`
}

export function exportSession(
  session: ChatSession,
  format: 'md' | 'txt' | 'json',
  appVersion = ''
): { content: string; fileName: string } {
  const content =
    format === 'md' ? toMarkdown(session, appVersion)
    : format === 'txt' ? toPlainText(session)
    : toJson(session)
  return { content, fileName: exportFileName(session, format) }
}

export type { ChatMessage, ChatSession }
