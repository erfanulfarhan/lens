import { describe, expect, it } from 'vitest'
import { detectSystem, probeOllama } from './detect.js'

describe('detectSystem', () => {
  it('reports plausible memory and cores for this machine', async () => {
    const spec = await detectSystem()
    expect(spec.ramGb).toBeGreaterThan(0)
    expect(spec.cpuCores).toBeGreaterThan(0)
    // Apple Silicon shares memory with the GPU, which changes the budget maths.
    if (process.platform === 'darwin' && process.arch === 'arm64') {
      expect(spec.unifiedMemory).toBe(true)
      expect(spec.vramGb).toBe(0)
    }
  })
})

describe('probeOllama', () => {
  it('returns false for an address with nothing listening', async () => {
    // Port 1 is reserved and never serves Ollama.
    expect(await probeOllama('http://127.0.0.1:1', 800)).toBe(false)
  })

  it('tolerates a /v1 suffix in the configured url', async () => {
    expect(await probeOllama('http://127.0.0.1:1/v1', 800)).toBe(false)
  })
})
