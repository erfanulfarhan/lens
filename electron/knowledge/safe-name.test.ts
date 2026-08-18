import { describe, expect, it } from 'vitest'
import { safeKnowledgeName } from './safe-name.js'

describe('safeKnowledgeName', () => {
  it('accepts a normal supported filename', () => {
    expect(safeKnowledgeName('resume.pdf')).toBe('resume.pdf')
    expect(safeKnowledgeName('about-me.md')).toBe('about-me.md')
  })

  it('strips any path so a delete cannot escape the folder', () => {
    expect(safeKnowledgeName('../../secrets.md')).toBe('secrets.md')
    expect(safeKnowledgeName('/etc/passwd.md')).toBe('passwd.md')
  })

  it('rejects traversal-only and hidden names', () => {
    expect(safeKnowledgeName('..')).toBeNull()
    expect(safeKnowledgeName('.')).toBeNull()
    expect(safeKnowledgeName('.DS_Store')).toBeNull()
  })

  it('rejects unsupported file types', () => {
    expect(safeKnowledgeName('malware.sh')).toBeNull()
    expect(safeKnowledgeName('notes.exe')).toBeNull()
  })

  it('rejects empty input', () => {
    expect(safeKnowledgeName('   ')).toBeNull()
  })
})
