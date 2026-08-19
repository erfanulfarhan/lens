import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

interface UpdateInfo {
  state: 'idle' | 'checking' | 'available' | 'current' | 'error'
  currentVersion: string
  release?: { version: string; name: string; notes: string; pageUrl: string }
  asset?: { name: string; url: string; size: number }
  message?: string
  checkedAt?: number
}

interface TranscriptLine {
  speaker: 'them' | 'you'
  text: string
  final: boolean
}

interface SessionMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  count: number
}

/** Wraps an IPC channel as a subscribe function that returns its own unsubscribe. */
function on<T>(channel: string) {
  return (cb: (payload: T) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, payload: T) => cb(payload)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
}

contextBridge.exposeInMainWorld('lens', {
  ask: (question: string) => ipcRenderer.invoke('lens:ask', question),
  setAmbient: (enabled: boolean) => ipcRenderer.invoke('lens:set-ambient', enabled),
  setWeb: (enabled: boolean) => ipcRenderer.invoke('lens:set-web', enabled),
  // Chat history
  sessions: () => ipcRenderer.invoke('lens:sessions'),
  openSession: (id: string) => ipcRenderer.invoke('lens:session-open', id),
  newSession: () => ipcRenderer.invoke('lens:session-new'),
  deleteSession: (id: string) => ipcRenderer.invoke('lens:session-delete', id),
  renameSession: (id: string, title: string) => ipcRenderer.invoke('lens:session-rename', id, title),
  searchSessions: (q: string) => ipcRenderer.invoke('lens:session-search', q),
  exportSession: (format: 'md' | 'txt' | 'json') => ipcRenderer.invoke('lens:export-session', format),
  rateAnswer: (answer: string, rating: 'good' | 'bad' | null) =>
    ipcRenderer.invoke('lens:rate-answer', answer, rating),
  // Memory + knowledge
  clearMemory: () => ipcRenderer.invoke('lens:clear-memory'),
  clearHistory: () => ipcRenderer.invoke('lens:clear-history'),
  clearKnowledge: () => ipcRenderer.invoke('lens:clear-knowledge'),
  removeFile: (name: string) => ipcRenderer.invoke('lens:remove-file', name),
  addAboutMe: (text: string) => ipcRenderer.invoke('lens:add-about-me', text),
  getAboutMe: () => ipcRenderer.invoke('lens:get-about-me'),
  setSidebar: (open: boolean) => ipcRenderer.invoke('lens:set-sidebar', open),
  captureScreen: () => ipcRenderer.invoke('lens:capture-screen'),
  discardScreen: () => ipcRenderer.invoke('lens:discard-screen'),
  setListening: (on: boolean) => ipcRenderer.invoke('lens:set-listening', on),
  setAutoAnswer: (on: boolean) => ipcRenderer.invoke('lens:set-auto-answer', on),
  transcript: () => ipcRenderer.invoke('lens:transcript'),
  clearTranscript: () => ipcRenderer.invoke('lens:clear-transcript'),
  answerLast: () => ipcRenderer.invoke('lens:answer-last'),
  systemCheck: () => ipcRenderer.invoke('lens:system-check'),
  pullModel: (tag: string) => ipcRenderer.invoke('lens:pull-model', tag),
  openExternal: (url: string) => ipcRenderer.invoke('lens:open-external', url),
  checkUpdate: () => ipcRenderer.invoke('lens:check-update'),
  updateStatus: () => ipcRenderer.invoke('lens:update-status'),
  downloadUpdate: () => ipcRenderer.invoke('lens:download-update'),
  cancelUpdateDownload: () => ipcRenderer.invoke('lens:cancel-update-download'),
  openReleaseNotes: () => ipcRenderer.invoke('lens:open-release-notes'),
  settings: () => ipcRenderer.invoke('lens:settings'),
  setApiKey: (id: string, key: string) => ipcRenderer.invoke('lens:set-api-key', id, key),
  setProvider: (id: string) => ipcRenderer.invoke('lens:set-provider', id),
  setOllamaUrl: (url: string) => ipcRenderer.invoke('lens:set-ollama-url', url),
  requestStatus: () => ipcRenderer.invoke('lens:status'),
  hide: () => ipcRenderer.invoke('lens:hide'),
  addFiles: () => ipcRenderer.invoke('lens:add-files'),
  listKnowledge: () => ipcRenderer.invoke('lens:list-knowledge'),
  openKnowledgeFolder: () => ipcRenderer.invoke('lens:open-knowledge'),
  quit: () => ipcRenderer.invoke('lens:quit'),
  listModels: () => ipcRenderer.invoke('lens:models'),
  setModel: (model: string) => ipcRenderer.invoke('lens:set-model', model),
  onStart: on<{ source: string; question: string }>('lens:start'),
  onDelta: on<string>('lens:delta'),
  onThinking: on<void>('lens:thinking'),
  onNoKnowledge: on<void>('lens:no-knowledge'),
  onSessions: on<SessionMeta[]>('lens:sessions'),
  onScreenAttached: on<void>('lens:screen-attached'),
  onTranscript: on<TranscriptLine[]>('lens:transcript'),
  onAudioError: on<string>('lens:audio-error'),
  onPullProgress: on<{ tag: string; status: string; percent?: number }>('lens:pull-progress'),
  onUpdate: on<UpdateInfo>('lens:update'),
  onUpdateProgress: on<{ percent: number; phase: string; message?: string }>('lens:update-progress'),
  onDone: on<{
    servedBy: string
    cacheReadTokens: number
    outputTokens: number
    sawScreen: boolean
  }>('lens:done'),
  onError: on<string>('lens:error'),
  onSuppressed: on<{ source: string; reason: string }>('lens:suppressed'),
  onStatus: on<{
    provider: string
    model: string
    askShortcut: string
    knowledgeBlocks: number
    ambient: boolean
    webEnabled: boolean
    webEngine: string
    memoryCount: number
    providerId: string
    listening: boolean
    autoAnswer: boolean
    audioAvailable: boolean
    transcriptLines: number
  }>('lens:status'),
})
