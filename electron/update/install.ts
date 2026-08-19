import { spawn } from 'node:child_process'

export interface InstallOutcome {
  /** Whether the app should quit so the installer can replace it. */
  quitting: boolean
  message: string
}

/**
 * Applies a downloaded installer.
 *
 * The behaviour differs by platform because the platforms genuinely differ:
 *
 * Windows: the NSIS installer can replace the app while it is closed, so it is
 * launched and Lens quits. This is a true self-update.
 *
 * macOS: replacing a running app bundle in place needs a valid Developer ID
 * signature, which an ad-hoc build does not have. Rather than fail at the last
 * step, the disk image is opened so the user drags the app across once. That is
 * one action instead of a trip to GitHub.
 */
export function installUpdate(
  installerPath: string,
  platform: NodeJS.Platform = process.platform
): InstallOutcome {
  if (platform === 'win32') {
    // Detached, so it survives this process exiting a moment later.
    spawn(installerPath, [], { detached: true, stdio: 'ignore' }).unref()
    return { quitting: true, message: 'Installing. Lens will close and reopen.' }
  }

  if (platform === 'darwin') {
    // Clear the quarantine flag first, or Gatekeeper refuses to open a disk image
    // downloaded by something other than a browser.
    spawn('xattr', ['-d', 'com.apple.quarantine', installerPath], { stdio: 'ignore' })
      .on('close', () => {
        spawn('open', [installerPath], { detached: true, stdio: 'ignore' }).unref()
      })
    return {
      quitting: false,
      message: 'Opening the installer. Drag Lens to Applications to finish.',
    }
  }

  spawn('xdg-open', [installerPath], { detached: true, stdio: 'ignore' }).unref()
  return { quitting: false, message: 'Opening the installer.' }
}

/** Whether this platform can replace the app without the user doing anything. */
export function canSelfInstall(platform: NodeJS.Platform = process.platform): boolean {
  return platform === 'win32'
}
