import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { defaultSettings, type ProviderId, type Settings } from './schema.js'

/** Encrypts/decrypts secrets. Backed by the OS keychain in the app; a plain
 *  pass-through in tests. Ciphertext is stored base64 in the settings file. */
export interface Cipher {
  encrypt(plain: string): string
  decrypt(cipher: string): string
  available: boolean
}

/**
 * Persists app settings to a JSON file. API keys are never written in plaintext:
 * they are encrypted with the OS keychain (Electron safeStorage) via the Cipher.
 * The rest of the settings are plain, so the file is inspectable but safe.
 */
export class SettingsStore {
  private settings: Settings

  constructor(
    private path: string,
    private cipher: Cipher,
    private fallbackKnowledgeDir: string
  ) {
    this.settings = defaultSettings(fallbackKnowledgeDir)
  }

  async load(): Promise<void> {
    try {
      const raw = JSON.parse(await readFile(this.path, 'utf8')) as Partial<Settings>
      this.settings = { ...defaultSettings(this.fallbackKnowledgeDir), ...raw }
    } catch {
      this.settings = defaultSettings(this.fallbackKnowledgeDir)
    }
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true })
    await writeFile(this.path, JSON.stringify(this.settings, null, 2), 'utf8')
  }

  /** Settings safe to send to the renderer: no secrets, only which keys exist. */
  redacted(): Omit<Settings, 'encryptedKeys'> & { hasKey: Partial<Record<ProviderId, boolean>> } {
    const { encryptedKeys, ...rest } = this.settings
    const hasKey: Partial<Record<ProviderId, boolean>> = {}
    for (const id of Object.keys(encryptedKeys) as ProviderId[]) hasKey[id] = Boolean(encryptedKeys[id])
    return { ...rest, hasKey }
  }

  get raw(): Settings {
    return this.settings
  }

  /** Decrypts and returns a provider's API key, or undefined if none set. */
  apiKey(id: ProviderId): string | undefined {
    const enc = this.settings.encryptedKeys[id]
    if (!enc) return undefined
    try {
      return this.cipher.decrypt(enc)
    } catch {
      return undefined
    }
  }

  async setApiKey(id: ProviderId, plainKey: string): Promise<void> {
    if (plainKey) this.settings.encryptedKeys[id] = this.cipher.encrypt(plainKey)
    else delete this.settings.encryptedKeys[id]
    await this.persist()
  }

  async update(patch: Partial<Omit<Settings, 'encryptedKeys'>>): Promise<void> {
    this.settings = { ...this.settings, ...patch }
    await this.persist()
  }

  async setModel(id: ProviderId, model: string): Promise<void> {
    this.settings.models = { ...this.settings.models, [id]: model }
    await this.persist()
  }
}
