'use strict'
const { execFileSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const { join } = require('node:path')

/**
 * Ad-hoc signs the macOS bundle after packaging.
 *
 * There is no paid certificate yet, and electron-builder skips signing entirely
 * when `identity` is null. An unsigned bundle is worse than an ad-hoc signed one:
 * macOS can refuse to launch it after it is moved or quarantined, which looks to
 * the user like a crash rather than a security prompt. Ad-hoc signing does NOT
 * remove the "unidentified developer" warning — only a paid Developer ID and
 * notarization do that.
 *
 * The nested Swift helper is signed first: signing the outer bundle seals what is
 * inside it, so an unsigned helper would invalidate the app's own signature.
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appName = `${context.packager.appInfo.productFilename}.app`
  const appPath = join(context.appOutDir, appName)
  const helper = join(appPath, 'Contents', 'Resources', 'bin', 'lens-audio')

  const sign = (target, extra = []) => {
    execFileSync('codesign', ['--force', '--timestamp=none', '--sign', '-', ...extra, target], {
      stdio: 'inherit',
    })
  }

  try {
    if (existsSync(helper)) {
      sign(helper, ['--identifier', 'dev.lens.audio'])
      console.log('  • ad-hoc signed the audio helper')
    }
    // --deep so the Electron Framework and helper apps inside are covered too.
    sign(appPath, ['--deep'])
    console.log('  • ad-hoc signed', appName)

    execFileSync('codesign', ['--verify', '--verbose=1', appPath], { stdio: 'inherit' })
  } catch (err) {
    // A failed ad-hoc signature should not fail the build; the app still runs,
    // it is just more fragile once moved.
    console.warn('  • ad-hoc signing failed:', err.message)
  }
}
