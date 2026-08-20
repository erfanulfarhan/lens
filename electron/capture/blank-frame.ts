/**
 * Detects the frame macOS hands back when it refuses a screen capture.
 *
 * A refusal is not an error and not an empty image: `desktopCapturer` returns a
 * correctly sized frame with every pixel identical, usually black. Because
 * `NativeImage.isEmpty()` is false for that, a refused capture used to pass
 * straight through and be sent to the model as a black rectangle.
 *
 * Kept as a pure function over a bitmap so it can be tested without Electron.
 */
export function isUniformBitmap(bytes: Uint8Array, channels = 4): boolean {
  if (bytes.length < channels * 2) return true

  const r = bytes[0]
  const g = bytes[1]
  const b = bytes[2]

  for (let i = channels; i + 2 < bytes.length; i += channels) {
    if (bytes[i] !== r || bytes[i + 1] !== g || bytes[i + 2] !== b) return false
  }
  return true
}
