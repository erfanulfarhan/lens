import { AnthropicProvider } from './anthropic.js'
import { ollamaBaseUrl } from './ollama-url.js'
import { OpenAICompatProvider } from './openai-compat.js'
import { OllamaProvider } from './ollama.js'
import type { Provider } from './types.js'

export * from './types.js'
export * from '../settings/schema.js'
export { AnthropicProvider, OpenAICompatProvider, OllamaProvider }

/**
 * LENS_PROVIDER selects the backend:
 *   anthropic (default) | gemini | groq | ollama
 */
export function createProvider(
  env: NodeJS.ProcessEnv = process.env,
  modelOverride?: string
): Provider {
  switch ((env.LENS_PROVIDER ?? 'anthropic').toLowerCase()) {
    case 'gemini':
      // Google ships an OpenAI-compatible endpoint, so no separate adapter is
      // needed. Free tier is ~1M tokens/min, which is what makes ambient mode
      // viable for development where Groq's 8000/min is not.
      return new OpenAICompatProvider({
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        model: modelOverride ?? env.LENS_GEMINI_MODEL ?? 'gemini-3.7-flash',
        // Ranked best-first. Only these get probed, so the picker never fills
        // up with embedding, speech or video models that cannot see a screen.
        candidateModels: [
          'gemini-3.7-flash',
          'gemini-3.5-flash',
          'gemini-2.5-flash',
          'gemini-3.1-flash-lite',
          'gemini-2.5-flash-lite',
        ],
        apiKey: env.GEMINI_API_KEY,
        maxImageWidth: Number(env.LENS_GEMINI_IMAGE_WIDTH ?? 1200),
        reasoningEffort: (env.LENS_GEMINI_EFFORT as 'none') ?? 'none',
      })
    case 'groq':
      return new OpenAICompatProvider({
        baseUrl: 'https://api.groq.com/openai/v1',
        model: modelOverride ?? env.LENS_GROQ_MODEL ?? 'qwen/qwen3.6-27b',
        candidateModels: ['qwen/qwen3.6-27b'],
        apiKey: env.GROQ_API_KEY,
        reasoningFormat: 'hidden',
        // Free tier is 8000 tokens/minute. A wide screenshot alone exceeds it.
        maxImageWidth: Number(env.LENS_GROQ_IMAGE_WIDTH ?? 760),
      })
    case 'ollama':
      return new OllamaProvider({
        baseUrl: ollamaBaseUrl(env.LENS_OLLAMA_URL ?? env.OLLAMA_HOST).replace(/\/v1$/, ''),
        model: modelOverride ?? env.LENS_OLLAMA_MODEL ?? 'gemma3:12b',
        maxImageWidth: Number(env.LENS_OLLAMA_IMAGE_WIDTH ?? 1100),
        think: env.LENS_OLLAMA_THINK === '1' ? true : env.LENS_OLLAMA_THINK === '0' ? false : undefined,
        numPredict: Number(env.LENS_OLLAMA_NUM_PREDICT ?? 2048),
      })
    default:
      return new AnthropicProvider({
        apiKey: env.ANTHROPIC_API_KEY,
        fastMode: env.LENS_FAST_MODE !== '0',
      })
  }
}


/**
 * Builds a provider from user settings rather than environment variables. This
 * is what the packaged app uses: the user picks a provider in Settings and
 * supplies their own key (or self-hosts with Ollama), so no .env is involved.
 */
export function providerFromSettings(opts: {
  provider: import('../settings/schema.js').ProviderId
  model?: string
  apiKey?: string
  ollamaUrl?: string
}): Provider {
  const { provider, model, apiKey, ollamaUrl } = opts

  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider({ apiKey, fastMode: true })

    case 'gemini':
      return new OpenAICompatProvider({
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        model: model ?? 'gemini-3.7-flash',
        apiKey,
        maxImageWidth: 1200,
        reasoningEffort: 'none',
        candidateModels: [
          'gemini-3.7-flash',
          'gemini-3.5-flash',
          'gemini-2.5-flash',
          'gemini-3.1-flash-lite',
        ],
      })

    case 'openai':
      return new OpenAICompatProvider({
        baseUrl: 'https://api.openai.com/v1',
        model: model ?? 'gpt-4o',
        apiKey,
        maxImageWidth: 1200,
        candidateModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini'],
      })

    case 'groq':
      return new OpenAICompatProvider({
        baseUrl: 'https://api.groq.com/openai/v1',
        model: model ?? 'qwen/qwen3.6-27b',
        apiKey,
        reasoningFormat: 'hidden',
        maxImageWidth: 760,
        candidateModels: ['qwen/qwen3.6-27b'],
      })

    case 'ollama':
    default:
      return new OllamaProvider({
        baseUrl: ollamaBaseUrl(ollamaUrl).replace(/\/v1$/, ''),
        model: model ?? 'gemma3:12b',
        maxImageWidth: 1100,
        numPredict: 2048,
      })
  }
}
