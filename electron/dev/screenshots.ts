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

  const shot = async (name: string) => {
    const image = await panel.capturePage()
    await writeFile(join(outDir, `${name}.png`), image.toPNG())
    console.log(`[shots] ${name}.png`)
  }

  /** Drives the interface the way a user would, by clicking its buttons. */
  const click = async (selector: string) => {
    await panel.webContents.executeJavaScript(
      `document.querySelector(${JSON.stringify(selector)})?.click()`
    )
    await wait(700)
  }

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
  await shot('03-history')
  await click('button[title="Chat history"]')

  await click('button[title="Settings"]')
  await shot('04-settings')

  console.log('[shots] done')
}
