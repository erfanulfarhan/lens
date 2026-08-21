import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractText } from './extract.js'

/**
 * Builds a small valid PDF containing known lines.
 *
 * Written by hand rather than committed as a fixture so the expected text lives
 * beside the assertion, and so the test carries no binary blob whose contents
 * nobody can read in a diff.
 */
function buildPdf(pages: string[][]): Buffer {
  const stream = (lines: string[]) =>
    Buffer.from(
      ['BT', '/F1 14 Tf', '72 720 Td', '18 TL']
        .concat(lines.flatMap((l, i) => (i < lines.length - 1 ? [`(${l}) Tj`, 'T*'] : [`(${l}) Tj`])))
        .concat(['ET'])
        .join('\n'),
    )

  const kids = pages.map((_, i) => `${4 + pages.length + i} 0 R`).join(' ')
  const objs: Buffer[] = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
    Buffer.from(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`),
    Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),
  ]
  // Content streams first, then the page objects that point at them.
  const contentStart = 4
  for (const lines of pages) {
    const s = stream(lines)
    objs.push(Buffer.concat([Buffer.from(`<< /Length ${s.length} >>\nstream\n`), s, Buffer.from('\nendstream')]))
  }
  for (let i = 0; i < pages.length; i++) {
    objs.push(
      Buffer.from(
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' +
          `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentStart + i} 0 R >>`,
      ),
    )
  }

  const parts: Buffer[] = [Buffer.from('%PDF-1.4\n')]
  const offsets: number[] = []
  let at = parts[0].length
  objs.forEach((o, i) => {
    offsets.push(at)
    const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), o, Buffer.from('\nendobj\n')])
    parts.push(b)
    at += b.length
  })
  const xref = at
  parts.push(
    Buffer.from(
      `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` +
        offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('') +
        `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
    ),
  )
  return Buffer.concat(parts)
}

describe('extractText', () => {
  // The reason this test exists: PDF reading moved off pdf-parse and onto pdfjs
  // to drop 45MB of the installer, and a silent regression here would mean
  // documents load as empty and answers quietly stop using them.
  it('reads text out of a multi page PDF', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'lens-extract-'))
    const path = join(dir, 'sample.pdf')
    await writeFile(path, buildPdf([['First line', 'Digits 12345'], ['Second page body']]))

    const text = await extractText(path)
    expect(text).toContain('First line')
    expect(text).toContain('Digits 12345')
    expect(text).toContain('Second page body')
    // Pages joined, not concatenated into one run-on line.
    expect(text.split('\n').filter((l) => l.trim()).length).toBe(3)
  }, 30_000)

  it('reads plain text and markdown unchanged', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'lens-extract-'))
    const path = join(dir, 'notes.md')
    await writeFile(path, '  # Heading\nbody  ')
    expect(await extractText(path)).toBe('# Heading\nbody')
  })
})
