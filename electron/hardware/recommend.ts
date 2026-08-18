export interface SystemSpec {
  /** Total system RAM in GB. */
  ramGb: number
  /** Dedicated GPU VRAM in GB; 0 when there is no discrete GPU. */
  vramGb: number
  /** Apple Silicon shares RAM with the GPU, which changes the maths. */
  unifiedMemory: boolean
  gpuName?: string
  cpuCores?: number
}

export interface ModelRec {
  /** Ollama tag to pull. */
  tag: string
  label: string
  /** Approximate download / disk size in GB. */
  sizeGb: number
  /** Memory needed to run comfortably, in GB. */
  needsGb: number
  vision: boolean
  /** Why this model, in one line for the UI. */
  note: string
}

/** Ordered strongest-first. Chosen for vision + instruction quality. */
export const CATALOG: ModelRec[] = [
  { tag: 'qwen2.5vl:32b', label: 'Qwen2.5-VL 32B', sizeGb: 21, needsGb: 24, vision: true, note: 'Best quality, needs a large GPU' },
  { tag: 'gemma3:27b', label: 'Gemma 3 27B', sizeGb: 17, needsGb: 20, vision: true, note: 'Excellent reasoning and screen reading' },
  { tag: 'gemma3:12b', label: 'Gemma 3 12B', sizeGb: 8.1, needsGb: 10, vision: true, note: 'Strong all-rounder, fast answers' },
  { tag: 'qwen3-vl:8b', label: 'Qwen3-VL 8B', sizeGb: 6.1, needsGb: 8, vision: true, note: 'Best instruction-following, reasons before answering (slower)' },
  { tag: 'qwen2.5vl:7b', label: 'Qwen2.5-VL 7B', sizeGb: 6, needsGb: 7, vision: true, note: 'Fast, direct answers' },
  { tag: 'gemma3:4b', label: 'Gemma 3 4B', sizeGb: 3.3, needsGb: 5, vision: true, note: 'Runs on modest hardware' },
  { tag: 'qwen3-vl:4b', label: 'Qwen3-VL 4B', sizeGb: 3.5, needsGb: 5, vision: true, note: 'Small but reasons; slower than its size suggests' },
  { tag: 'gemma3:1b', label: 'Gemma 3 1B', sizeGb: 0.8, needsGb: 2, vision: false, note: 'Last resort: text only, very light' },
]

/**
 * Memory actually usable for a model.
 *
 * On a discrete GPU, only VRAM matters: spilling into system RAM is what makes
 * local models crawl. On Apple Silicon the GPU shares system RAM, but the OS and
 * apps need a slice, so we budget roughly 65% of it.
 */
export function usableMemoryGb(spec: SystemSpec): number {
  if (spec.vramGb >= 4) return spec.vramGb
  if (spec.unifiedMemory) return Math.max(0, spec.ramGb * 0.65)
  // Integrated graphics on a PC: CPU inference out of system RAM, leave headroom.
  return Math.max(0, (spec.ramGb - 4) * 0.7)
}

export interface Recommendation {
  /** Best model that fits comfortably, or null if nothing fits. */
  best: ModelRec | null
  /** Also-fits options, strongest first, for a dropdown. */
  alternatives: ModelRec[]
  usableGb: number
  /** Plain-language explanation shown in onboarding. */
  reason: string
}

export function recommendModels(spec: SystemSpec): Recommendation {
  const usableGb = usableMemoryGb(spec)
  const fits = CATALOG.filter((m) => m.needsGb <= usableGb)
  const best = fits[0] ?? null

  const where = spec.vramGb >= 4
    ? `${spec.vramGb}GB of VRAM on your ${spec.gpuName ?? 'GPU'}`
    : spec.unifiedMemory
      ? `${spec.ramGb}GB of unified memory`
      : `${spec.ramGb}GB of system RAM and no dedicated GPU`

  const reason = best
    ? `Based on ${where}, ${best.label} is the best fit. ${best.note}.`
    : `With ${where} there is not enough memory to run a local model well. Use an API key instead, or add a GPU.`

  return { best, alternatives: fits.slice(1), usableGb, reason }
}
