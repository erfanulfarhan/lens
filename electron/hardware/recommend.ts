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

/**
 * Models worth offering, strongest first. Sizes are the real layer totals from
 * the Ollama registry, not estimates.
 *
 * Every entry can read a screen. A text-only model would install cleanly and then
 * silently fail at the app's main purpose, so anyone whose machine cannot run a
 * vision model is told to use an API key instead.
 *
 * Within a memory tier, models that answer directly rank above models that reason
 * first: the reasoning ones are smarter but spend two to three times as many
 * tokens thinking, which is a poor trade for a glanceable answer on a screen.
 */
export const CATALOG: ModelRec[] = [
  { tag: 'qwen2.5vl:72b', label: 'Qwen2.5-VL 72B', sizeGb: 48.7, needsGb: 54, vision: true,
    note: 'Workstation class, the best local screen reading there is' },
  { tag: 'qwen2.5vl:32b', label: 'Qwen2.5-VL 32B', sizeGb: 21.2, needsGb: 24, vision: true,
    note: 'Excellent and answers directly' },
  { tag: 'qwen3-vl:32b', label: 'Qwen3-VL 32B', sizeGb: 20.9, needsGb: 24, vision: true,
    note: 'Strongest reasoning, but thinks before answering so it is slower' },
  { tag: 'qwen3.8:27b', label: 'Qwen3.8 27B', sizeGb: 17.7, needsGb: 20, vision: true,
    note: 'Newest Qwen with vision; reasons before answering, so slower' },
  { tag: 'gemma3:27b', label: 'Gemma 3 27B', sizeGb: 17.4, needsGb: 20, vision: true,
    note: 'Excellent reasoning and screen reading' },
  { tag: 'mistral-small3.2:24b', label: 'Mistral Small 3.2', sizeGb: 15.2, needsGb: 18, vision: true,
    note: 'Strong at following instructions precisely' },
  { tag: 'gemma3:12b', label: 'Gemma 3 12B', sizeGb: 8.1, needsGb: 10, vision: true,
    note: 'Strong all-rounder, fast answers' },
  { tag: 'qwen2.5vl:7b', label: 'Qwen2.5-VL 7B', sizeGb: 6.0, needsGb: 7, vision: true,
    note: 'Fast and direct, good at reading text on screen' },
  { tag: 'qwen3-vl:8b', label: 'Qwen3-VL 8B', sizeGb: 6.1, needsGb: 8, vision: true,
    note: 'Best instruction-following of the small models, but reasons first so it is slower' },
  { tag: 'minicpm-v:8b', label: 'MiniCPM-V 8B', sizeGb: 5.5, needsGb: 7, vision: true,
    note: 'Compact and unusually good at dense screenshots' },
  { tag: 'gemma3:4b', label: 'Gemma 3 4B', sizeGb: 3.3, needsGb: 5, vision: true,
    note: 'Runs on modest hardware and still sees the screen' },
  { tag: 'qwen2.5vl:3b', label: 'Qwen2.5-VL 3B', sizeGb: 3.2, needsGb: 4.5, vision: true,
    note: 'Light and quick, weaker on long answers' },
  { tag: 'qwen3-vl:4b', label: 'Qwen3-VL 4B', sizeGb: 3.3, needsGb: 5, vision: true,
    note: 'Small but reasons, so slower than its size suggests' },
  { tag: 'qwen3-vl:2b', label: 'Qwen3-VL 2B', sizeGb: 1.9, needsGb: 3, vision: true,
    note: 'For a very small machine; expect short, simple answers' },
  { tag: 'moondream:1.8b', label: 'Moondream 1.8B', sizeGb: 1.7, needsGb: 2.5, vision: true,
    note: 'The lightest model that can still read a screen' },
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
    : `With ${where} there is not enough memory to run a model that can read your screen. Add an API key instead, or use a machine with more memory.`

  return { best, alternatives: fits.slice(1), usableGb, reason }
}
