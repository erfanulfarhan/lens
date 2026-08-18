import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BrowserWindow } from 'electron'

/**
 * Captures the app's own window for documentation.
 *
 * `capturePage` photographs the window's own contents, so it needs no Screen
 * Recording permission and never catches anything else on the desktop. Only
 * runs when LENS_SHOTS names an output directory.
 */
export async function captureScreenshots(panel: BrowserWindow, outDir: string): Promise<void> {
  await mkdir(outDir, { recursive: true })

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

  // Opening the history sidebar resizes the window, so the size is re-asserted
  // before every capture rather than only once at the start.
  const big = (width: number, height: number) => {
    panel.setSize(width, height, false)
    panel.center()
  }

  // Heights are chosen per view so the content fills the frame: a tall window
  // around a short answer leaves dead space that reads as an unfinished app.
  const shot = async (name: string, width = 1120, height = 660) => {
    big(width, height)
    await wait(500)
    const image = await panel.capturePage()
    await writeFile(join(outDir, `${name}.png`), image.toPNG())
    const size = image.getSize()
    console.log(`[shots] ${name}.png ${size.width}x${size.height}`)
  }

  /** Drives the interface the way a user would, by clicking its buttons. */
  const click = async (selector: string) => {
    await panel.webContents.executeJavaScript(
      `document.querySelector(${JSON.stringify(selector)})?.click()`
    )
    await wait(700)
  }

  // A bigger window means genuinely more pixels, which survives the recompression
  // social sites apply. The default panel is small because it is an overlay.
  big(1120, 660)
  panel.show()
  await wait(2500)

  await shot('01-empty')

  // A real question, answered by the real model: a staged screenshot would
  // misrepresent what the app does.
  await panel.webContents.executeJavaScript(
    `window.lens.ask("What should I check before publishing an open source project?")`
  )
  // Long enough for a local model to finish, including its thinking phase.
  await wait(22000)
  await shot('02-answer')

  await click('button[title="Chat history"]')
  await wait(900)
  await shot('03-history', 1360, 720)  // wider and taller: it holds the sidebar too
  await click('button[title="Chat history"]')

  await click('button[title="Settings"]')
  await shot('04-settings', 900, 900)  // settings is a tall list

  console.log('[shots] done')
}
