/**
 * A 64x64 PNG: solid red square on white. Small enough to probe with for free,
 * unambiguous enough that a correct answer proves the model actually decoded
 * the image rather than guessing from the prompt.
 */
export const PROBE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAZElEQVR4nO3PAQ3AIAADQZTgX9S8DA1kWR6S+1RAb7yXN+oDXwOoA6gDqAOoA6gDqAOo2wY8c/46AAAAAAAAAAAAAAAAAAAAAAAAAAAAAIDzAKcFUAdQB1AHUAdQB1AHUHc9YAGLjT5ZadpnEgAAAABJRU5ErkJggg=='

export const PROBE_PROMPT = 'What colour is the square? Reply with one word.'

/** A model passes only if it names the colour it was shown. */
export function probePassed(answer: string): boolean {
  return /red/i.test(answer)
}

/**
 * Runs `probe` over candidates with bounded concurrency and keeps the order of
 * the candidate list, which is ranked best-first. Listing a model the user
 * cannot actually use is worse than listing fewer, so anything that errors,
 * times out, or answers wrongly is dropped.
 */
export async function verifyVisionModels(
  candidates: string[],
  probe: (model: string) => Promise<boolean>,
  concurrency = 3
): Promise<string[]> {
  const passed = new Set<string>()
  const queue = [...candidates]

  async function worker(): Promise<void> {
    for (let model = queue.shift(); model; model = queue.shift()) {
      try {
        if (await probe(model)) passed.add(model)
      } catch {
        // Unreachable, unauthorized, rate limited, or not multimodal: all mean
        // "do not offer this to the user".
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, worker))
  return candidates.filter((m) => passed.has(m))
}
