/** Every provider the published app can talk to. Ollama is the free self-host. */
export type ProviderId = 'ollama' | 'anthropic' | 'gemini' | 'openai' | 'groq'

export const CLOUD_PROVIDERS: Exclude<ProviderId, 'ollama'>[] = ['anthropic', 'gemini', 'openai', 'groq']

export interface ProviderMeta {
  id: ProviderId
  label: string
  /** Where the user gets a key; shown in settings. Empty for local Ollama. */
  keysUrl: string
  /** Human hint for the default model. */
  defaultModel: string
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  ollama: { id: 'ollama', label: 'Local (Ollama)', keysUrl: '', defaultModel: 'gemma3:12b' },
  anthropic: { id: 'anthropic', label: 'Anthropic (Claude)', keysUrl: 'https://console.anthropic.com/settings/keys', defaultModel: 'claude-opus-5' },
  gemini: { id: 'gemini', label: 'Google (Gemini)', keysUrl: 'https://aistudio.google.com/apikey', defaultModel: 'gemini-3.7-flash' },
  openai: { id: 'openai', label: 'OpenAI (GPT)', keysUrl: 'https://platform.openai.com/api-keys', defaultModel: 'gpt-4o' },
  groq: { id: 'groq', label: 'Groq', keysUrl: 'https://console.groq.com/keys', defaultModel: 'qwen/qwen3.6-27b' },
}

export interface Settings {
  /** Which provider is active. */
  provider: ProviderId
  /** Selected model per provider, so switching providers remembers the choice. */
  models: Partial<Record<ProviderId, string>>
  /** Ollama server URL (local or a remote machine on the LAN). */
  ollamaUrl: string
  /** Encrypted API keys per cloud provider (ciphertext, base64). */
  encryptedKeys: Partial<Record<ProviderId, string>>
  /** Absolute path to the knowledge folder. */
  knowledgeDir: string
  /** Web search on/off and engine. */
  webEnabled: boolean
}

export function defaultSettings(knowledgeDir: string): Settings {
  return {
    provider: 'ollama',
    models: {},
    ollamaUrl: 'http://localhost:11434',
    encryptedKeys: {},
    knowledgeDir,
    webEnabled: false,
  }
}
