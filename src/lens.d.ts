export interface DoneInfo {
  servedBy: string
  cacheReadTokens: number
  outputTokens: number
  sawScreen: boolean
}

export interface SystemSpec {
  ramGb: number
  vramGb: number
  unifiedMemory: boolean
  gpuName?: string
  cpuCores?: number
}

export interface ModelRec {
  tag: string
  label: string
  sizeGb: number
  needsGb: number
  vision: boolean
  note: string
}

export interface SystemCheck {
  spec: SystemSpec
  recommendation: { best: ModelRec | null; alternatives: ModelRec[]; usableGb: number; reason: string }
  ollamaRunning: boolean
  ollamaUrl: string
  installed: string[]
}

export interface TranscriptLine {
  speaker: 'them' | 'you'
  text: string
  final: boolean
}

export interface SessionMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  count: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  ts: number
  sawScreen?: boolean
}

export interface StatusInfo {
  provider: string
  model: string
  askShortcut: string
  knowledgeBlocks: number
  webEnabled: boolean
  webEngine: string
  memoryCount: number
  providerId: string
  listening: boolean
  autoAnswer: boolean
  audioAvailable: boolean
  transcriptLines: number
}

declare global {
  interface Window {
    lens: {
      ask(question: string): Promise<void>
      setWeb(enabled: boolean): Promise<boolean>
      sessions(): Promise<SessionMeta[]>
      openSession(id: string): Promise<{ id: string; title: string; messages: ChatMessage[] } | null>
      newSession(): Promise<{ id: string; title: string }>
      deleteSession(id: string): Promise<void>
      renameSession(id: string, title: string): Promise<void>
      searchSessions(q: string): Promise<SessionMeta[]>
      clearMemory(): Promise<boolean>
      clearHistory(): Promise<boolean>
      clearKnowledge(): Promise<boolean>
      removeFile(name: string): Promise<boolean>
      addAboutMe(text: string): Promise<boolean>
      getAboutMe(): Promise<string>
      setSidebar(open: boolean): Promise<void>
      captureScreen(): Promise<void>
      discardScreen(): Promise<void>
      setListening(on: boolean): Promise<boolean>
      setAutoAnswer(on: boolean): Promise<boolean>
      transcript(): Promise<TranscriptLine[]>
      clearTranscript(): Promise<void>
      answerLast(): Promise<boolean>
      systemCheck(): Promise<SystemCheck>
      pullModel(tag: string): Promise<boolean>
      openExternal(url: string): Promise<void>
      settings(): Promise<Record<string, unknown> | null>
      setApiKey(id: string, key: string): Promise<boolean>
      setProvider(id: string): Promise<boolean>
      setOllamaUrl(url: string): Promise<boolean>
      setVoice(enabled: boolean): Promise<boolean>
      stopSpeaking(): Promise<void>
      wakeUtterance(audio: ArrayBuffer): Promise<{ woke: boolean }>
      transcribeAsk(audio: ArrayBuffer): Promise<{ text: string }>
      requestStatus(): Promise<void>
      hide(): Promise<void>
      addFiles(): Promise<{ added: number }>
      listKnowledge(): Promise<string[]>
      openKnowledgeFolder(): Promise<void>
      quit(): Promise<void>
      listModels(): Promise<string[]>
      setModel(model: string): Promise<string>
      onStart(cb: (p: { source: string; question: string }) => void): () => void
      onDelta(cb: (text: string) => void): () => void
      onThinking(cb: () => void): () => void
      onNoKnowledge(cb: () => void): () => void
      onSessions(cb: (list: SessionMeta[]) => void): () => void
      onScreenAttached(cb: () => void): () => void
      onTranscript(cb: (lines: TranscriptLine[]) => void): () => void
      onAudioError(cb: (message: string) => void): () => void
      onPullProgress(cb: (p: { tag: string; status: string; percent?: number }) => void): () => void
      onDone(cb: (info: DoneInfo) => void): () => void
      onError(cb: (message: string) => void): () => void
      onSuppressed(cb: (p: { source: string; reason: string }) => void): () => void
      onStatus(cb: (info: StatusInfo) => void): () => void
    }
  }
}
export {}
