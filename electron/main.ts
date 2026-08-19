import { app, BrowserWindow, desktopCapturer, dialog, globalShortcut, ipcMain, safeStorage, screen, shell, systemPreferences } from 'electron'
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, join as pathJoin } from 'node:path'
import { join } from 'node:path'
import { createProvider, type AskContext, type Provider, type Turn } from './providers/index.js'
import { FullInjectSource } from './knowledge/full-inject.js'
import { RetrievalSource } from './knowledge/retrieval-source.js'
import { OllamaEmbedder } from './knowledge/embedder.js'
import { ollamaBaseUrl } from './providers/ollama-url.js'
import { OllamaEmbedder as EmbedderForMem } from './knowledge/embedder.js'
import { MemoryStore } from './memory/store.js'
import { SessionStore } from './history/sessions.js'
import { AudioSupervisor } from './audio/supervisor.js'
import { TranscriptLog } from './audio/protocol.js'
import { AudioTurnTrigger } from './triggers/audio-turn.js'
import { webConfigFromEnv, webContext, type WebConfig } from './web/index.js'
import type { KnowledgeSource } from './knowledge/source.js'
import { isSupported, SUPPORTED_EXTENSIONS } from './knowledge/extract.js'
import { safeKnowledgeName } from './knowledge/safe-name.js'
import { verifyVisionModels } from './providers/vision-probe.js'
import { detectSystem, probeOllama } from './hardware/detect.js'
import { checkForUpdate, type UpdateStatus } from './update/checker.js'
import { SettingsStore, type Cipher } from './settings/store.js'
import { providerFromSettings, type ProviderId } from './providers/index.js'
import { recommendModels } from './hardware/recommend.js'
import { Dispatcher, type TriggerSource } from './triggers/dispatcher.js'
import { questionNeedsScreen } from './screen-relevance.js'

// Keys live in .env next to the project so the app works when launched from
// Finder, where a shell profile's exports are not available.
try {
  process.loadEnvFile(join(app.getAppPath(), '.env'))
} catch {
  // No .env yet. createProvider falls back to the ambient environment.
}

// Knowledge lives in userData, NOT inside the app directory. Files under the app
// folder are wiped by rebuilds, reinstalls and auto-updates — that silently
// destroyed a user's documents once.
const KNOWLEDGE_DIR = join(app.getPath('userData'), 'knowledge')
const HISTORY_TURNS = 8

/** Tried in order; the first that registers wins. macOS silently refuses some
 *  combinations that are already claimed by the system or another app. */
const ASK_SHORTCUTS = ['CommandOrControl+Shift+Space', 'CommandOrControl+Shift+J', 'Alt+Space']
const TOGGLE_SHORTCUTS = ['CommandOrControl+Shift+H', 'CommandOrControl+Shift+K']

let panel: BrowserWindow | null = null
let provider: Provider
let currentModel = ''
let knowledge: KnowledgeSource
let retrieval: RetrievalSource | null = null
let knowledgeCount = 0
let webEnabled = false
let askShortcut = ''
let memory: MemoryStore | null = null
let sessions: SessionStore | null = null
let settings: SettingsStore | null = null
let updateStatus: UpdateStatus | null = null
let audio: AudioSupervisor | null = null
const transcript = new TranscriptLog()
const audioTurn = new AudioTurnTrigger()
/** Listening captures the conversation; auto-answer decides whether to speak up. */
let listening = false
let autoAnswer = false
let webConfig: WebConfig

const history: Turn[] = []
const dispatcher = new Dispatcher()
let inFlight: AbortController | null = null
/**
 * A screenshot captured by the hotkey and waiting for an instruction. The old
 * behaviour guessed ("what is on my screen?"); now the user is asked what they
 * want, and the image is held until they say.
 */
let pendingScreenshot: string | null = null

const PANEL_WIDTH = 480
const SIDEBAR_WIDTH = 232

function createPanel(): BrowserWindow {
  const { workArea } = screen.getPrimaryDisplay()
  const width = PANEL_WIDTH
  const height = 640

  const win = new BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width - 24,
    y: workArea.y + 24,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    hasShadow: true,
    icon: join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'build', 'icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return win
}

/**
 * Full grab for the model. The panel is hidden first: it floats above
 * everything, so otherwise the model receives a screenshot of its own UI
 * covering the thing it was asked about.
 */
async function captureScreen(): Promise<string | undefined> {
  const wasVisible = panel?.isVisible() ?? false
  if (wasVisible) panel?.hide()

  try {
    const { size, scaleFactor } = screen.getPrimaryDisplay()
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(size.width * Math.min(scaleFactor, 2)),
        height: Math.round(size.height * Math.min(scaleFactor, 2)),
      },
    })
    const shot = sources[0]?.thumbnail
    if (!shot || shot.isEmpty()) return undefined
    return shot.resize({ width: provider.maxImageWidth }).toPNG().toString('base64')
  } finally {
    if (wasVisible) panel?.showInactive()
  }
}


function send(channel: string, payload?: unknown): void {
  panel?.webContents.send(channel, payload)
}

function pushStatus(): void {
  send('lens:status', {
    provider: provider.name,
    providerId: settings?.raw.provider ?? 'ollama',
    model: currentModel,
    askShortcut,
    knowledgeBlocks: knowledgeCount,
    webEnabled,
    webEngine: webConfig?.engine ?? 'duckduckgo',
    memoryCount: memory?.size ?? 0,
    listening,
    autoAnswer,
    audioAvailable: audio?.available ?? false,
    transcriptLines: transcript.size,
  })
}

async function ask(source: TriggerSource, question: string): Promise<void> {
  const now = Date.now()
  const decision = dispatcher.request(source, now)

  if (!decision.run) {
    send('lens:suppressed', { source, reason: decision.reason })
    return
  }
  if (decision.cancelInFlight) inFlight?.abort()

  const controller = new AbortController()
  inFlight = controller
  dispatcher.started(source, now)

  if (!panel?.isVisible()) panel?.showInactive()
  send('lens:start', { source, question })

  try {
    // A screenshot the user explicitly attached wins. Otherwise capture only
    // when the question actually refers to the screen: attaching one to every
    // question makes a vision model describe the screen instead of answering.
    let base64: string | undefined
    if (pendingScreenshot) {
      base64 = pendingScreenshot
      pendingScreenshot = null
    } else if (source === 'hotkey' || questionNeedsScreen(question)) {
      base64 = await captureScreen()
    }

    // Built per question: retrieval selects doc excerpts relevant to THIS
    // question, keeping a large knowledge base inside the context window.
    const system = await knowledge.build(question)

    // Cross-session recall: topical past exchanges, so it improves over time.
    if (memory) {
      const recalled = await memory.recall(question).catch(() => '')
      if (recalled) system.push({ text: recalled })
    }

    // Optional live web context. Off by default; it sends the query off-device.
    if (webEnabled) {
      try {
        const { text } = await webContext(question, webConfig, controller.signal, { results: 3 })
        system.push({
          text:
            text ||
            'Web search is ENABLED for this conversation: this app can search the ' +
              'internet for you. No results came back for this particular question, ' +
              'so answer from what you know, but do not claim you lack web access.',
        })
      } catch {
        // A search failure must not sink the answer; proceed with local context.
      }
    }

    const ctx: AskContext = {
      system,
      history: history.slice(-HISTORY_TURNS),
      screenshot: base64 ? { mediaType: 'image/png', base64 } : undefined,
      // What was actually said in the room, so an answer can respond to it.
      transcript: listening ? transcript.recentText() : undefined,
      question,
    }

    // Answering with an empty knowledge base produces generic "I don't know you"
    // replies. Say so explicitly rather than letting it look like a model fault.
    if (knowledgeCount === 0) send('lens:no-knowledge')

    const result = await provider.ask(
      ctx,
      (delta) => send('lens:delta', delta),
      controller.signal,
      () => send('lens:thinking')
    )
    history.push({ role: 'user', text: question }, { role: 'assistant', text: result.text })
    void memory?.add(question, result.text).catch(() => {})

    // Persist to the browsable chat history.
    const now2 = Date.now()
    await sessions?.append({ role: 'user', text: question, ts: now2 })
    await sessions?.append({
      role: 'assistant',
      text: result.text,
      ts: now2 + 1,
      sawScreen: Boolean(base64),
    })
    send('lens:sessions', sessions?.list() ?? [])

    send('lens:done', {
      servedBy: result.servedBy,
      // A zero here across repeated calls is the only reliable signal that
      // prompt caching has silently stopped working.
      cacheReadTokens: result.usage.cacheReadTokens,
      outputTokens: result.usage.outputTokens,
      sawScreen: Boolean(base64),
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    send('lens:error', (err as Error).message)
  } finally {
    dispatcher.finished()
    inFlight = null
  }
}

/** Probing costs a round trip per model, so the verified list is cached per provider. */
const modelCache = new Map<string, string[]>()

/**
 * Only models proven to read an image are offered. Endpoints happily list
 * embedding, speech and video models that cannot answer a screen question, and
 * offering those made the picker useless.
 */
async function usableModels(): Promise<string[]> {
  const cached = modelCache.get(provider.name)
  if (cached) return cached

  const candidates = provider.candidateModels.length
    ? provider.candidateModels
    : ((await provider.listModels?.()) ?? [currentModel])

  // Skip the vision-probe for local Ollama: probing a reasoning model costs a
  // full 15s+ inference each. The installed non-embedding models are the list.
  const isOllama = provider.name.startsWith('ollama:')
  const probe = provider.probeVision?.bind(provider)
  const verified = probe && !isOllama
    ? await verifyVisionModels(candidates, probe)
    : candidates

  // Never hand back an empty picker: the current model stays selectable so the
  // user is not locked out when the endpoint is having a bad day.
  const result = verified.length ? verified : [currentModel]
  modelCache.set(provider.name, result)
  return result
}

/**
 * Grabs the screen and hands control back to the user: the panel shows that the
 * screen is attached and waits for an instruction. Nothing is sent to the model
 * until the user says what they want done with it.
 */
async function captureForCommand(): Promise<void> {
  const base64 = await captureScreen().catch(() => undefined)
  if (!base64) {
    send('lens:error', 'Could not capture the screen. Check Screen Recording permission in System Settings.')
    return
  }
  pendingScreenshot = base64
  if (!panel?.isVisible()) panel?.show()
  panel?.focus()
  send('lens:screen-attached')
}

/**
 * Builds the active provider from saved settings, falling back to environment
 * variables so a developer checkout still works without a settings file.
 */
function buildProvider(modelOverride?: string) {
  if (!settings) return createProvider(process.env, modelOverride)

  const s = settings.raw
  const useSettings = s.provider !== 'ollama' ? Boolean(settings.apiKey(s.provider)) : true
  if (!useSettings) return createProvider(process.env, modelOverride)

  return providerFromSettings({
    provider: s.provider,
    model: modelOverride ?? s.models[s.provider],
    apiKey: settings.apiKey(s.provider),
    ollamaUrl: s.ollamaUrl,
  })
}

async function rebuildKnowledge(): Promise<void> {
  if (retrieval) {
    await retrieval.reindex()
    knowledgeCount = retrieval.size
  } else {
    knowledgeCount = (await knowledge.build()).length
  }
  pushStatus()
}

/** Registers the first accelerator that macOS actually accepts. */
function registerFirst(candidates: string[], handler: () => void): string {
  for (const accelerator of candidates) {
    if (globalShortcut.register(accelerator, handler) && globalShortcut.isRegistered(accelerator)) {
      return accelerator
    }
  }
  return ''
}

app.whenReady().then(async () => {
  await mkdir(KNOWLEDGE_DIR, { recursive: true })

  // API keys are encrypted with the OS keychain. If it is unavailable (rare, and
  // only on misconfigured Linux), fall back to storing nothing rather than
  // writing a key in plaintext.
  const cipher: Cipher = {
    available: safeStorage.isEncryptionAvailable(),
    encrypt: (plain) => safeStorage.encryptString(plain).toString('base64'),
    decrypt: (b64) => safeStorage.decryptString(Buffer.from(b64, 'base64')),
  }
  settings = new SettingsStore(join(app.getPath('userData'), 'settings.json'), cipher, KNOWLEDGE_DIR)
  await settings.load()

  provider = buildProvider()
  currentModel = (provider as { model?: string }).model ?? provider.name

  // Retrieval needs a local embedding endpoint. Ollama has one; use it so the
  // assistant scales past the context window. Other providers fall back to
  // full injection (fine for a small knowledge folder).
  if ((process.env.LENS_PROVIDER ?? '').toLowerCase() === 'ollama') {
    const embedder = new OllamaEmbedder(
      ollamaBaseUrl(process.env.LENS_OLLAMA_URL ?? process.env.OLLAMA_HOST).replace(/\/v1$/, ''),
      process.env.LENS_EMBED_MODEL ?? 'nomic-embed-text'
    )
    retrieval = new RetrievalSource(KNOWLEDGE_DIR, embedder)
    knowledge = retrieval
  } else {
    knowledge = new FullInjectSource(KNOWLEDGE_DIR)
  }
  knowledge.onChange(() => void rebuildKnowledge())
  await rebuildKnowledge()

  webConfig = webConfigFromEnv(process.env)
  webEnabled = process.env.LENS_WEB === '1'

  // Memory reuses the local embedder when available (Ollama); otherwise it still
  // persists and recalls by recency.
  const memEmbedder = new EmbedderForMem(
    ollamaBaseUrl(process.env.LENS_OLLAMA_URL ?? process.env.OLLAMA_HOST).replace(/\/v1$/, ''),
    process.env.LENS_EMBED_MODEL ?? 'nomic-embed-text'
  )
  memory = new MemoryStore(join(app.getPath('userData'), 'memory', 'history.jsonl'), memEmbedder)
  await memory.load()

  sessions = new SessionStore(join(app.getPath('userData'), 'history', 'sessions.json'))
  await sessions.load()

  // The Swift helper ships beside the app in development and inside Resources
  // once packaged.
  // Packaged, the helper lives in Contents/Resources/bin (extraResources), which
  // is OUTSIDE the asar archive — a binary inside asar cannot be executed.
  const helper =
    process.env.LENS_AUDIO_BIN ??
    (app.isPackaged
      ? join(process.resourcesPath, 'bin', 'lens-audio')
      : join(app.getAppPath(), 'bin', 'lens-audio'))
  audio = new AudioSupervisor(helper)
  audio.onEvent((event) => {
    switch (event.type) {
      case 'transcript':
        transcript.apply(event)
        send('lens:transcript', transcript.current())
        break

      case 'voice':
        // Mic vs system audio gives speaker attribution for free.
        audioTurn.onVoiceActivity(event.source === 'mic' ? 'you' : 'them', event.active, Date.now())
        break

      case 'error':
        send('lens:audio-error', event.message)
        break

      case 'stopped':
        listening = false
        pushStatus()
        break
    }
  })

  // Poll for the end of the other party's turn: that is the moment an answer is
  // wanted. Only acts when the user has asked for automatic answers.
  setInterval(() => {
    if (!listening || !autoAnswer) return
    if (!audioTurn.poll(Date.now())) return

    const question = transcript.lastFromThem()
    if (question.length < 8) return
    void ask('audio-turn', question)
  }, 400)
  // Seed the in-memory conversation with recent turns so it remembers across restarts.
  for (const ex of memory.recent(HISTORY_TURNS / 2)) {
    history.push({ role: 'user', text: ex.question }, { role: 'assistant', text: ex.answer })
  }

  panel = createPanel()
  panel.once('ready-to-show', () => {
    panel?.show()
    pushStatus()
  })

  // Documentation capture, off unless explicitly requested.
  if (process.env.LENS_SHOTS) {
    const { captureScreenshots } = await import('./dev/screenshots.js')
    panel.once('ready-to-show', () => {
      void captureScreenshots(panel!, process.env.LENS_SHOTS!).finally(() => app.quit())
    })
  }

  askShortcut = registerFirst(ASK_SHORTCUTS, () => {
    void captureForCommand()
  })
  const toggleShortcut = registerFirst(TOGGLE_SHORTCUTS, () => {
    if (panel?.isVisible()) panel.hide()
    else panel?.showInactive()
  })

  console.log(`[lens] ask shortcut: ${askShortcut || 'NONE REGISTERED'}`)
  console.log(`[lens] toggle shortcut: ${toggleShortcut || 'NONE REGISTERED'}`)

  ipcMain.handle('lens:ask', (_e, question: string) => ask('text', question))
  ipcMain.handle('lens:status', () => pushStatus())
  ipcMain.handle('lens:hide', () => panel?.hide())

  // Attach files: copy the chosen files into the watched knowledge folder. The
  // existing file watcher then rebuilds the prefix, so a fresh capture already
  // knows about them. No separate ingest step.
  ipcMain.handle('lens:add-files', async () => {
    if (!panel) return { added: 0 }
    const { canceled, filePaths } = await dialog.showOpenDialog(panel, {
      title: 'Add interview knowledge',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Documents', extensions: SUPPORTED_EXTENSIONS.map((e) => e.slice(1)) }],
    })
    if (canceled) return { added: 0 }

    let added = 0
    for (const src of filePaths) {
      if (!isSupported(src)) continue
      await copyFile(src, pathJoin(KNOWLEDGE_DIR, basename(src)))
      added++
    }
    await rebuildKnowledge()
    return { added }
  })

  ipcMain.handle('lens:list-knowledge', async () => {
    const names = await readdir(KNOWLEDGE_DIR).catch(() => [] as string[])
    return names.filter((n) => !n.startsWith('.') && isSupported(n)).sort()
  })

  ipcMain.handle('lens:open-knowledge', () => shell.openPath(KNOWLEDGE_DIR))
  ipcMain.handle('lens:set-web', (_e, on: boolean) => {
    webEnabled = on
    pushStatus()
    return webEnabled
  })
  ipcMain.handle('lens:quit', () => app.quit())

  // --- Chat history ---
  ipcMain.handle('lens:sessions', () => sessions?.list() ?? [])
  ipcMain.handle('lens:session-open', async (_e, id: string) => {
    const s = await sessions?.open(id)
    // Reopening a chat restores it as the live conversation context.
    history.length = 0
    for (const msg of s?.messages ?? []) history.push({ role: msg.role, text: msg.text })
    return s
  })
  ipcMain.handle('lens:session-new', async () => {
    history.length = 0
    const s = await sessions?.newSession()
    send('lens:sessions', sessions?.list() ?? [])
    return s
  })
  ipcMain.handle('lens:session-delete', async (_e, id: string) => {
    await sessions?.remove(id)
    send('lens:sessions', sessions?.list() ?? [])
  })
  ipcMain.handle('lens:session-rename', async (_e, id: string, title: string) => {
    await sessions?.rename(id, title)
    send('lens:sessions', sessions?.list() ?? [])
  })
  ipcMain.handle('lens:session-search', (_e, q: string) => sessions?.search(q) ?? [])
  // The panel widens for the sidebar rather than squeezing the conversation, and
  // it grows LEFTWARD so its right edge stays put. Repositioning against the
  // screen edge instead made the whole window appear to jump sideways.
  ipcMain.handle('lens:discard-screen', () => {
    pendingScreenshot = null
  })
  ipcMain.handle('lens:capture-screen', () => captureForCommand())

  // --- Onboarding ---
  // Tells a new user what their machine can actually run, rather than making them
  // guess between a dozen model names.
  ipcMain.handle('lens:system-check', async () => {
    const spec = await detectSystem()
    const recommendation = recommendModels(spec)
    const ollamaUrl = process.env.LENS_OLLAMA_URL ?? 'http://localhost:11434'
    const ollamaRunning = await probeOllama(ollamaUrl)

    let installed: string[] = []
    if (ollamaRunning) {
      installed = await (provider.listModels?.() ?? Promise.resolve([])).catch(() => [])
    }
    return { spec, recommendation, ollamaRunning, ollamaUrl, installed }
  })

  // Pulls a model onto the Ollama host, streaming progress to the panel.
  ipcMain.handle('lens:pull-model', async (_e, tag: string) => {
    const base = ollamaBaseUrl(process.env.LENS_OLLAMA_URL ?? process.env.OLLAMA_HOST).replace(/\/v1$/, '')
    try {
      const res = await fetch(`${base}/api/pull`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: tag }),
      })
      if (!res.ok || !res.body) throw new Error(`pull failed: ${res.status}`)

      // Progress arrives as newline-delimited JSON; forward a simple percentage.
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nl: number
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl).trim()
          buffer = buffer.slice(nl + 1)
          if (!line) continue
          try {
            const p = JSON.parse(line) as { status?: string; completed?: number; total?: number }
            send('lens:pull-progress', {
              tag,
              status: p.status ?? '',
              percent: p.total ? Math.round((100 * (p.completed ?? 0)) / p.total) : undefined,
            })
          } catch {
            // Ignore a truncated progress line.
          }
        }
      }
      send('lens:pull-progress', { tag, status: 'success', percent: 100 })
      modelCache.clear()
      return true
    } catch (err) {
      send('lens:pull-progress', { tag, status: `error: ${(err as Error).message}` })
      return false
    }
  })

  // --- Updates ---
  // The check is automatic; nothing is downloaded or installed without the user
  // saying so, which is the whole point of asking first.
  const runUpdateCheck = async () => {
    updateStatus = { state: 'checking', currentVersion: app.getVersion() }
    send('lens:update', updateStatus)
    updateStatus = await checkForUpdate(app.getVersion())
    send('lens:update', updateStatus)
    return updateStatus
  }

  ipcMain.handle('lens:check-update', () => runUpdateCheck())
  ipcMain.handle('lens:update-status', () => updateStatus)
  // Downloading is a deliberate act: it opens the installer in the browser so the
  // user can see what they are getting, since an unsigned build cannot install
  // itself on macOS.
  ipcMain.handle('lens:download-update', () => {
    const url = updateStatus?.asset?.url ?? updateStatus?.release?.pageUrl
    if (url) void shell.openExternal(url)
    return Boolean(url)
  })
  ipcMain.handle('lens:open-release-notes', () => {
    if (updateStatus?.release?.pageUrl) void shell.openExternal(updateStatus.release.pageUrl)
  })

  // Give the window a moment to paint before reaching for the network.
  setTimeout(() => void runUpdateCheck(), 4000)

  ipcMain.handle('lens:open-external', (_e, url: string) => {
    // Only ever open http(s): a file or custom scheme here would be a hole.
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
  })

  // --- Listening ---
  ipcMain.handle('lens:set-listening', async (_e, on: boolean) => {
    if (!on) {
      audio?.stop()
      listening = false
      pushStatus()
      return false
    }

    // Permissions belong to the app bundle, which has the usage strings. The
    // helper only reports what it is allowed to do, so ask here first.
    const mic = await systemPreferences.askForMediaAccess('microphone').catch(() => false)
    if (!mic) {
      send('lens:audio-error', 'Microphone access is needed to tell your voice from theirs. Allow it in System Settings > Privacy & Security > Microphone.')
    }
    if (systemPreferences.getMediaAccessStatus('screen') !== 'granted') {
      send('lens:audio-error', 'Screen Recording permission is what lets Lens hear other people on a call. Allow it in System Settings > Privacy & Security > Screen Recording, then start listening again.')
    }

    audio?.start()
    listening = audio?.available ?? false
    pushStatus()
    return listening
  })
  ipcMain.handle('lens:set-auto-answer', (_e, on: boolean) => {
    autoAnswer = on
    pushStatus()
    return autoAnswer
  })
  ipcMain.handle('lens:transcript', () => transcript.current())
  ipcMain.handle('lens:clear-transcript', () => {
    transcript.clear()
    send('lens:transcript', [])
  })
  // Answer the last thing the other person said, on demand.
  ipcMain.handle('lens:answer-last', () => {
    const question = transcript.lastFromThem()
    if (!question) return false
    void ask('voice', question)
    return true
  })
  ipcMain.handle('lens:set-sidebar', (_e, open: boolean) => {
    if (!panel) return
    const [currentWidth, height] = panel.getSize()
    const [x, y] = panel.getPosition()
    const rightEdge = x + currentWidth
    const width = open ? PANEL_WIDTH + SIDEBAR_WIDTH : PANEL_WIDTH

    panel.setBounds({ x: rightEdge - width, y, width, height }, true)
  })

  // --- Memory + knowledge management ---
  ipcMain.handle('lens:clear-memory', async () => {
    await memory?.clear()
    history.length = 0
    pushStatus()
    return true
  })
  ipcMain.handle('lens:clear-history', async () => {
    await sessions?.clearAll()
    history.length = 0
    send('lens:sessions', [])
    return true
  })
  // Remove one document. The name is reduced to a basename first so a crafted
  // value cannot delete outside the knowledge folder.
  ipcMain.handle('lens:remove-file', async (_e, name: string) => {
    const safe = safeKnowledgeName(name)
    if (!safe) return false
    await rm(pathJoin(KNOWLEDGE_DIR, safe), { force: true }).catch(() => {})
    await rebuildKnowledge()
    return true
  })
  ipcMain.handle('lens:clear-knowledge', async () => {
    // Removes every indexed document so a new topic can be started clean.
    const names = await readdir(KNOWLEDGE_DIR).catch(() => [] as string[])
    for (const n of names) await rm(pathJoin(KNOWLEDGE_DIR, n), { force: true }).catch(() => {})
    await rebuildKnowledge()
    return true
  })
  // "Tell the AI about myself": appended to a plain about-me file in knowledge/.
  ipcMain.handle('lens:add-about-me', async (_e, text: string) => {
    const file = pathJoin(KNOWLEDGE_DIR, 'about-me.md')
    const existing = await readFile(file, 'utf8').catch(() => '# About me\n')
    await writeFile(file, `${existing.trimEnd()}\n\n${text.trim()}\n`, 'utf8')
    await rebuildKnowledge()
    return true
  })
  ipcMain.handle('lens:get-about-me', () =>
    readFile(pathJoin(KNOWLEDGE_DIR, 'about-me.md'), 'utf8').catch(() => '')
  )
  ipcMain.handle('lens:models', () => usableModels())
  ipcMain.handle('lens:set-model', async (_e, model: string) => {
    if (settings) await settings.setModel(settings.raw.provider, model)
    provider = buildProvider(model)
    currentModel = model
    pushStatus()
    return model
  })

  // --- Providers and keys ---
  ipcMain.handle('lens:settings', () => settings?.redacted() ?? null)
  ipcMain.handle('lens:set-api-key', async (_e, id: ProviderId, key: string) => {
    if (!settings) return false
    await settings.setApiKey(id, key)
    if (key) {
      // Switching to a provider the moment its key arrives is what the user means.
      await settings.update({ provider: id })
    } else if (settings.raw.provider === id) {
      // Removing the key of the provider in use would leave it selected but
      // unusable, so fall back to local hosting, which needs no key.
      await settings.update({ provider: 'ollama' })
    }
    provider = buildProvider()
    currentModel = (provider as { model?: string }).model ?? provider.name
    modelCache.clear()
    pushStatus()
    return true
  })
  ipcMain.handle('lens:set-provider', async (_e, id: ProviderId) => {
    if (!settings) return false
    await settings.update({ provider: id })
    provider = buildProvider()
    currentModel = (provider as { model?: string }).model ?? provider.name
    modelCache.clear()
    pushStatus()
    return true
  })
  ipcMain.handle('lens:set-ollama-url', async (_e, url: string) => {
    if (!settings) return false
    await settings.update({ ollamaUrl: url })
    provider = buildProvider()
    modelCache.clear()
    pushStatus()
    return true
  })

})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  audio?.stop()
})
app.on('window-all-closed', () => app.quit())
