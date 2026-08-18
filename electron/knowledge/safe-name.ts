import { basename } from 'node:path'
import { isSupported } from './extract.js'

/**
 * Reduces a filename coming from the renderer to a plain basename inside the
 * knowledge folder. Without this, a crafted name like "../../.ssh/id_rsa" would
 * let a delete escape the folder it is meant to be confined to.
 * Returns null when the name is unusable.
 */
export function safeKnowledgeName(name: string): string | null {
  const base = basename(name.trim())
  if (!base || base === '.' || base === '..') return null
  if (base.startsWith('.')) return null
  if (!isSupported(base)) return null
  return base
}
