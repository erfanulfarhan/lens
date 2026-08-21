import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'

/** File types worth loading as interview knowledge. */
export const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.markdown', '.json', '.csv', '.pdf', '.docx']

export function isSupported(name: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(extname(name).toLowerCase())
}

/**
 * Returns plain text for any supported file. PDFs and Word docs are the common
 * shape for a resume or a job description, so they are extracted rather than
 * rejected. An empty string means the file had no extractable text (e.g. a
 * scanned PDF), which the caller reports rather than injecting silence.
 */
export async function extractText(path: string): Promise<string> {
  const ext = extname(path).toLowerCase()

  if (ext === '.pdf') {
    // pdfjs directly rather than through pdf-parse. pdf-parse depends on
    // @napi-rs/canvas at a pinned version, which is 24MB of prebuilt native
    // binaries for every platform and exists only to rasterise pages. This
    // reads text and never renders, so the canvas is dead weight; for pdfjs the
    // same package is optional, which lets the bundle leave it out.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    // The loading task owns teardown, not the document proxy.
    const task = pdfjs.getDocument({
      data: new Uint8Array(await readFile(path)),
      useSystemFonts: true,
    })
    const doc = await task.promise

    const pages: string[] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const content = await (await doc.getPage(n)).getTextContent()
      const lines: string[] = []
      let line = ''
      for (const item of content.items) {
        // Text items carry str; the marked-content items in between do not.
        if ('str' in item) {
          line += item.str
          if (item.hasEOL) {
            lines.push(line)
            line = ''
          }
        }
      }
      if (line) lines.push(line)
      pages.push(lines.join('\n'))
    }
    await task.destroy()
    return pages.join('\n').trim()
  }

  if (ext === '.docx') {
    const mammoth = await import('mammoth')
    const { value } = await mammoth.extractRawText({ path })
    return value.trim()
  }

  return (await readFile(path, 'utf8')).trim()
}
