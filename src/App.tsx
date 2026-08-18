import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage, DoneInfo, SessionMeta, StatusInfo, TranscriptLine } from './lens.js'
import { Sidebar } from './components/Sidebar.js'
import { Composer } from './components/Composer.js'
import { Readout } from './components/Readout.js'
import { SettingsPanel } from './components/SettingsPanel.js'
import { Thinking } from './components/Thinking.js'
import { Logo } from './components/Logo.js'
import { Transcript } from './components/Transcript.js'
import { detectPlatform, formatAccelerator } from './shortcuts.js'
import { Onboarding } from './components/Onboarding.js'

interface Turn {
  id: number
  role: 'user' | 'assistant'
  text: string
  done?: DoneInfo
  error?: boolean
}

export default function App() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [streaming, setStreaming] = useState(false)
  const [reasoning, setReasoning] = useState(false)
  const [status, setStatus] = useState<StatusInfo | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [files, setFiles] = useState<string[]>([])
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sidebar, setSidebar] = useState(false)
  const [settings, setSettings] = useState(false)
  const [onboarding, setOnboarding] = useState(() => localStorage.getItem('lens-onboarded') !== 'yes')
  const [noKnowledge, setNoKnowledge] = useState(false)
  const [loadingModel, setLoadingModel] = useState<string | null>(null)
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [input, setInput] = useState('')
  const [screenAttached, setScreenAttached] = useState(false)
  const [lines, setLines] = useState<TranscriptLine[]>([])
  const scroller = useRef<HTMLDivElement>(null)
  const nextId = useRef(0)

  const refreshSessions = useCallback(async () => {
    setSessions(await window.lens.sessions().catch(() => []))
  }, [])

  useEffect(() => {
    void window.lens.requestStatus()
    void window.lens.listModels().then(setModels).catch(() => setModels([]))
    void window.lens.listKnowledge().then(setFiles).catch(() => setFiles([]))
    void refreshSessions()
    void window.lens
      .settings()
      .then((s) => { if (s && typeof s.ollamaUrl === 'string') setOllamaUrl(s.ollamaUrl) })
      .catch(() => {})

    const offs = [
      window.lens.onStatus(setStatus),
      window.lens.onSessions(setSessions),
      window.lens.onScreenAttached(() => setScreenAttached(true)),
      window.lens.onTranscript(setLines),
      window.lens.onAudioError((m) =>
        setTurns((prev) => [...prev, { id: nextId.current++, role: 'assistant', text: m, error: true }])
      ),
      window.lens.onNoKnowledge(() => setNoKnowledge(true)),
      window.lens.onThinking(() => setReasoning(true)),

      window.lens.onStart(({ question }) => {
        setStreaming(true)
        setScreenAttached(false)
        setReasoning(false)
        setNoKnowledge(false)
        setTurns((prev) => [
          ...prev,
          { id: nextId.current++, role: 'user', text: question },
          { id: nextId.current++, role: 'assistant', text: '' },
        ])
      }),

      window.lens.onDelta((delta) => {
        setReasoning(false)
        setTurns((prev) => {
          const next = [...prev]
          const last = next.at(-1)
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, text: last.text + delta }
          return next
        })
      }),

      window.lens.onDone((done) => {
        setStreaming(false)
        setTurns((prev) => {
          const next = [...prev]
          const last = next.at(-1)
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, done }
          return next
        })
      }),

      window.lens.onError((message) => {
        setStreaming(false)
        setTurns((prev) => {
          const next = [...prev]
          const last = next.at(-1)
          if (last?.role === 'assistant' && !last.text) {
            next[next.length - 1] = { ...last, text: message, error: true }
            return next
          }
          return [...prev, { id: nextId.current++, role: 'assistant', text: message, error: true }]
        })
      }),
    ]
    return () => offs.forEach((off) => off())
  }, [refreshSessions])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [turns])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (settings) setSettings(false)
        else void window.lens.hide()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settings])

  function toggleSidebar() {
    const next = !sidebar
    setSidebar(next)
    void window.lens.setSidebar(next)
  }

  function send() {
    const question = input.trim()
    if (!question) return
    setInput('')
    void window.lens.ask(question)
  }

  async function openChat(id: string) {
    const session = await window.lens.openSession(id)
    if (!session) return
    setActiveId(id)
    setTurns(
      session.messages.map((m: ChatMessage) => ({ id: nextId.current++, role: m.role, text: m.text }))
    )
  }

  async function newChat() {
    await window.lens.newSession()
    setActiveId(null)
    setTurns([])
    void refreshSessions()
  }

  async function attach() {
    await window.lens.addFiles()
    setFiles(await window.lens.listKnowledge())
  }

  const local = status?.provider.startsWith('ollama') ?? false

  return (
    <div className="relative flex h-full overflow-hidden rounded-2xl border border-line bg-panel/95 shadow-2xl backdrop-blur-2xl">
      {sidebar && (
        <Sidebar
          sessions={sessions}
          activeId={activeId}
          onOpen={openChat}
          onNew={newChat}
          onDelete={async (id) => {
            await window.lens.deleteSession(id)
            if (id === activeId) { setActiveId(null); setTurns([]) }
          }}
          onRename={(id, title) => void window.lens.renameSession(id, title)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="drag flex items-center gap-2 border-b border-line px-2.5 py-2">
          <button
            onClick={toggleSidebar}
            title="Chat history"
            className={
              'no-drag shrink-0 rounded-md px-1.5 py-1 text-[13px] leading-none transition ' +
              (sidebar ? 'bg-raise text-brass' : 'text-muted hover:bg-raise hover:text-paper')
            }
          >
            <span aria-hidden>&#9776;</span>
          </button>

          <span className={'shrink-0 ' + (streaming ? '' : 'lens-mark-idle')}>
            <Logo size={17} active={streaming} />
          </span>
          <span className="readout shrink-0 text-paper">Lens</span>
          {/* Sage means the answer came from your own machine. */}
          <span
            aria-hidden
            title={local ? 'Running on your machine' : 'Running on a cloud provider'}
            className={'size-1.5 shrink-0 rounded-full ' + (local ? 'bg-sage' : 'bg-muted/50')}
          />

          <select
            value={status?.model ?? ''}
            onChange={async (e) => {
              const next = e.target.value
              // A 12GB card holds one model at a time, so a switch means loading
              // several GB from disk. Show that rather than appearing frozen.
              setLoadingModel(next)
              await window.lens.setModel(next)
              setLoadingModel(null)
            }}
            title="Model"
            className="no-drag ml-1 min-w-0 flex-1 truncate rounded-md border border-line bg-raise px-1.5 py-1 font-[family-name:var(--font-read)] text-[10.5px] text-muted outline-none hover:text-paper focus:border-brass/40"
          >
            {(models.length ? models : [status?.model ?? '']).map((m) => (
              <option key={m} value={m} className="bg-panel">{m}</option>
            ))}
          </select>

          {status?.audioAvailable && (
            <button
              onClick={() => void window.lens.setListening(!status?.listening)}
              title={status?.listening ? 'Stop listening' : 'Listen to this call'}
              className={
                'no-drag shrink-0 rounded-md px-1.5 py-1 text-[10px] transition ' +
                (status?.listening
                  ? 'bg-sage/20 text-sage'
                  : 'text-muted hover:bg-raise hover:text-paper')
              }
            >
              {status?.listening ? 'Listening' : 'Listen'}
            </button>
          )}
          <button
            onClick={() => void window.lens.setWeb(!status?.webEnabled)}
            title={status?.webEnabled ? 'Web search on' : 'Web search off'}
            className={
              'no-drag shrink-0 rounded-md px-1.5 py-1 text-[10px] transition ' +
              (status?.webEnabled ? 'bg-sage/15 text-sage' : 'text-muted hover:bg-raise hover:text-paper')
            }
          >
            Web
          </button>
          <button
            onClick={() => setSettings(true)}
            title="Settings"
            className="no-drag shrink-0 rounded-md px-1.5 py-1 text-[13px] leading-none text-muted transition hover:bg-raise hover:text-paper"
          >
            <span aria-hidden>&#9881;</span>
          </button>
          <button
            onClick={() => void window.lens.hide()}
            title="Hide (Esc). Lens keeps running."
            className="no-drag shrink-0 rounded-md px-1.5 py-1 text-[13px] leading-none text-muted transition hover:bg-raise hover:text-paper"
          >
            <span aria-hidden>&#8211;</span>
          </button>
          <button
            onClick={() => void window.lens.quit()}
            title="Quit Lens"
            className="no-drag shrink-0 rounded-md px-1.5 py-1 text-[13px] leading-none text-muted transition hover:bg-red-500/20 hover:text-red-300"
          >
            <span aria-hidden>&times;</span>
          </button>
        </header>

        {loadingModel && (
          <p className="border-b border-brass/20 bg-brass/10 px-3 py-2 text-[11px] leading-relaxed text-brass">
            Loading {loadingModel} into your GPU. First use takes about 15 seconds, then
            answers are fast.
          </p>
        )}

        {status?.listening && (
          <Transcript
            lines={lines}
            autoAnswer={status?.autoAnswer ?? false}
            onToggleAutoAnswer={() => void window.lens.setAutoAnswer(!status?.autoAnswer)}
            onAnswerLast={() => void window.lens.answerLast()}
            onClear={() => {
              void window.lens.clearTranscript()
              setLines([])
            }}
          />
        )}

        {noKnowledge && (
          <p className="border-b border-brass/20 bg-brass/10 px-3 py-2 text-[11px] leading-relaxed text-brass">
            No documents loaded, so answers stay general. Add yours with the clip below.
          </p>
        )}

        <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-3.5 py-3.5">
          {turns.length === 0 && (
            <div className="pt-6">
              <p className="readout mb-2 text-brass">Runs on your machine</p>
              <p className="max-w-[34ch] text-[13px] leading-relaxed text-muted">
                Ask anything. Add your own documents and it answers as you, not as a
                stranger. Press{' '}
                <kbd className="rounded border border-line bg-raise px-1 font-[family-name:var(--font-read)] text-[10px] text-paper">
                  {formatAccelerator(status?.askShortcut || 'CommandOrControl+Shift+Space', detectPlatform())}
                </kbd>{' '}
                to ask about what is on your screen.
              </p>
            </div>
          )}

          {turns.map((t) =>
            t.role === 'user' ? (
              <div key={t.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-xl rounded-br-sm bg-raise px-3 py-2 text-[13px] leading-relaxed text-paper">
                  {t.text}
                </p>
              </div>
            ) : (
              <div key={t.id}>
                {t.text ? (
                  <p
                    className={
                      'whitespace-pre-wrap text-[13px] leading-relaxed ' +
                      (t.error ? 'text-red-400' : 'text-paper') +
                      // The caret trails only the answer still being written.
                      (streaming && !t.done && !t.error ? ' caret' : '')
                    }
                  >
                    {t.text}
                  </p>
                ) : (
                  <Thinking reasoning={reasoning} />
                )}
                {t.done && <Readout info={t.done} docs={status?.knowledgeBlocks ?? 0} />}
              </div>
            )
          )}
        </div>

        {screenAttached && (
          <div className="border-t border-brass/25 bg-brass/[0.07] px-3 py-2.5">
            <div className="mb-2 flex items-center gap-2">
              <span className="readout text-brass">Screen attached</span>
              <button
                onClick={() => {
                  void window.lens.discardScreen()
                  setScreenAttached(false)
                }}
                className="ml-auto rounded px-1 text-[13px] leading-none text-muted transition hover:text-red-400"
                title="Discard the capture"
              >
                ×
              </button>
            </div>
            <p className="mb-2 text-[12px] leading-relaxed text-paper">
              What would you like me to do with it?
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['Explain this', 'Summarise it', 'Draft a reply', 'Find the problem', 'Translate it'].map(
                (preset) => (
                  <button
                    key={preset}
                    onClick={() => void window.lens.ask(preset)}
                    className="rounded-full border border-line bg-raise px-2.5 py-1 text-[11px] text-muted transition hover:border-brass/40 hover:text-paper"
                  >
                    {preset}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        <Composer
          value={input}
          busy={streaming}
          screenAttached={screenAttached}
          fileCount={files.length}
          onChange={setInput}
          onSubmit={send}
          onAttach={() => void attach()}
        />
      </div>

      {onboarding && (
        <Onboarding
          onDone={() => {
            localStorage.setItem('lens-onboarded', 'yes')
            setOnboarding(false)
            void window.lens.requestStatus()
            void window.lens.listModels().then(setModels).catch(() => setModels([]))
          }}
        />
      )}

      {settings && (
        <SettingsPanel
          status={status}
          files={files}
          onClose={() => setSettings(false)}
          onClearMemory={() => void window.lens.clearMemory()}
          onClearHistory={async () => {
            await window.lens.clearHistory()
            setTurns([]); setActiveId(null); void refreshSessions()
          }}
          onClearKnowledge={async () => {
            await window.lens.clearKnowledge()
            setFiles(await window.lens.listKnowledge())
          }}
          onRemoveFile={async (name) => {
            await window.lens.removeFile(name)
            setFiles(await window.lens.listKnowledge())
          }}
          onOpenKnowledge={() => void window.lens.openKnowledgeFolder()}
          onSaveAboutMe={(text) => void window.lens.addAboutMe(text)}
          ollamaUrl={ollamaUrl}
          onSaveOllamaUrl={async (url) => {
            setOllamaUrl(url)
            await window.lens.setOllamaUrl(url)
            // The new server has its own models, so refresh the picker.
            setModels(await window.lens.listModels().catch(() => []))
          }}
        />
      )}
    </div>
  )
}
