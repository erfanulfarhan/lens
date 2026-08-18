import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

/**
 * Turns a raw window capture into an image fit for social media.
 *
 * Two problems with posting the raw file: the window has rounded corners over a
 * transparent background, which sites composite onto white so it reads as a
 * stray white square around the panel; and a small image gets upscaled and
 * recompressed into mush. This flattens the transparency onto a backdrop, adds
 * breathing room, and outputs at a size that survives recompression.
 */
const SHOTS = 'docs/screenshots'
const OUT = 'docs/social'
const BACKDROP = { r: 12, g: 14, b: 19, alpha: 1 }

async function frame({ src, out, width, height, pad }) {
  const input = sharp(`${SHOTS}/${src}`)
  const meta = await input.metadata()

  const scale = Math.min((width - pad * 2) / meta.width, (height - pad * 2) / meta.height)
  const w = Math.round(meta.width * scale)
  const h = Math.round(meta.height * scale)

  // Flatten first: compositing a transparent PNG leaves its corners showing
  // whatever sits behind them.
  const shot = await input
    .resize(w, h, { fit: 'inside', kernel: 'lanczos3' })
    .flatten({ background: { r: 20, g: 23, b: 30 } })
    .toBuffer()

  // A soft shadow lifts the panel off the backdrop instead of looking pasted on.
  const shadow = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } },
  }).blur(26).png().toBuffer()

  const top = Math.round((height - h) / 2)
  const left = Math.round((width - w) / 2)

  await sharp({ create: { width, height, channels: 4, background: BACKDROP } })
    .composite([
      { input: shadow, top: top + 16, left },
      { input: shot, top, left },
    ])
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/${out}`)

  console.log(`  ${out}  ${width}x${height}`)
}

await mkdir(OUT, { recursive: true })
await frame({ src: '03-history.png', out: 'lens-wide.png', width: 2048, height: 1280, pad: 90 })
await frame({ src: '02-answer.png', out: 'lens-portrait.png', width: 1440, height: 1800, pad: 80 })
await frame({ src: '04-settings.png', out: 'lens-square.png', width: 1440, height: 1440, pad: 90 })
