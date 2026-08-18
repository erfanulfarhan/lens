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
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: new Uint8Array(await readFile(path)) })
    const { text } = await parser.getText()
    // pdf-parse v2 inserts a "-- N of M --" separator between pages; drop it.
    return text.replace(/^-- \d+ of \d+ --$/gm, '').trim()
  }

  if (ext === '.docx') {
    const mammoth = await import('mammoth')
    const { value } = await mammoth.extractRawText({ path })
    return value.trim()
  }

  return (await readFile(path, 'utf8')).trim()
}
