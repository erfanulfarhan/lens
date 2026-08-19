import { createWriteStream } from 'node:fs'
import { mkdir, rm, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

export interface DownloadProgress {
  received: number
  total: number
  percent: number
}

/** Reduces a URL to a safe filename inside the download directory. */
export function fileNameFor(url: string): string | null {
  let path: string
  try {
    path = new URL(url).pathname
  } catch {
    return null
  }
  // basename strips any traversal; the extension list is the allowlist.
  const name = basename(decodeURIComponent(path))
  if (!name || !/\.(dmg|exe|AppImage|zip)$/i.test(name)) return null
  return name
}

/** Percentage that never divides by zero or exceeds 100. */
export function percentOf(received: number, total: number): number {
  if (!total || total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((received / total) * 100)))
}

/**
 * Downloads an installer to disk, reporting progress.
 *
 * Kept separate from the install step because the two fail for different reasons
 * and the user needs to know which: a download can fail on the network, while
 * installing can fail on permissions or a signature check.
 */
export async function downloadInstaller(
  url: string,
  targetDir: string,
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal
): Promise<string> {
  const name = fileNameFor(url)
  if (!name) throw new Error('That download link does not look like an installer.')

  await mkdir(targetDir, { recursive: true })
  const target = join(targetDir, name)

  // Remove a partial file from an earlier attempt so a resumed download cannot
  // append to it and produce a corrupt installer.
  await rm(target, { force: true }).catch(() => {})

  const res = await fetch(url, { signal, redirect: 'follow' })
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`)

  const total = Number(res.headers.get('content-length') ?? 0)
  let received = 0

  const source = Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0])
  source.on('data', (chunk: Buffer) => {
    received += chunk.length
    onProgress({ received, total, percent: percentOf(received, total) })
  })

  await pipeline(source, createWriteStream(target))

  // A truncated file would install as a broken app, so verify the size when the
  // server told us what to expect.
  if (total > 0) {
    const written = (await stat(target)).size
    if (written !== total) {
      await rm(target, { force: true }).catch(() => {})
      throw new Error('The download finished incomplete. Try again.')
    }
  }

  return target
}
