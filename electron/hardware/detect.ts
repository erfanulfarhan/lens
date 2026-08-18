import { execFile } from 'node:child_process'
import { totalmem, cpus, arch, platform } from 'node:os'
import { promisify } from 'node:util'
import type { SystemSpec } from './recommend.js'

const run = promisify(execFile)

/**
 * Reads what the machine can actually run a model on.
 *
 * VRAM is the number that matters on a PC, because spilling out of it is what
 * makes local models crawl. Apple Silicon shares memory with the GPU, so it is
 * reported as unified and budgeted differently.
 */
export async function detectSystem(): Promise<SystemSpec> {
  const ramGb = Math.round(totalmem() / 1024 ** 3)
  const cpuCores = cpus().length
  const appleSilicon = platform() === 'darwin' && arch() === 'arm64'

  if (appleSilicon) {
    return { ramGb, vramGb: 0, unifiedMemory: true, cpuCores, gpuName: cpus()[0]?.model }
  }

  // NVIDIA is the common case for local inference; nvidia-smi is authoritative.
  try {
    const { stdout } = await run('nvidia-smi', [
      '--query-gpu=name,memory.total',
      '--format=csv,noheader,nounits',
    ])
    const [name, mib] = stdout.trim().split('\n')[0].split(',').map((s) => s.trim())
    return {
      ramGb,
      vramGb: Math.round(Number(mib) / 1024),
      unifiedMemory: false,
      gpuName: name,
      cpuCores,
    }
  } catch {
    // No NVIDIA GPU (or no driver): treat as CPU-only, which recommendModels
    // handles by suggesting an API key instead.
    return { ramGb, vramGb: 0, unifiedMemory: false, cpuCores }
  }
}

/** Is an Ollama server reachable at this address? */
export async function probeOllama(baseUrl: string, timeoutMs = 2500): Promise<boolean> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), timeoutMs)
  try {
    const res = await fetch(`${baseUrl.replace(/\/v1$/, '')}/api/version`, { signal: abort.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
