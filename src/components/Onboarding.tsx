import { useEffect, useState } from 'react'
import type { SystemCheck } from '../lens.js'
import { Logo } from './Logo.js'

/**
 * First run. Two things decide whether someone can use Lens at all: whether their
 * machine can host a model, and whether they have an API key. Rather than asking
 * them to guess, this reads the hardware and says plainly what will work.
 */
export function Onboarding({ onDone }: { onDone(): void }) {
  const [check, setCheck] = useState<SystemCheck | null>(null)
  const [pulling, setPulling] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ status: string; percent?: number } | null>(null)
  const [keyProvider, setKeyProvider] = useState('anthropic')
  const [keyValue, setKeyValue] = useState('')

  useEffect(() => {
    void window.lens.systemCheck().then(setCheck).catch(() => setCheck(null))
    return window.lens.onPullProgress((p) => setProgress({ status: p.status, percent: p.percent }))
  }, [])

  async function pull(tag: string) {
    setPulling(tag)
    setProgress({ status: 'starting' })
    const ok = await window.lens.pullModel(tag)
    setPulling(null)
    if (ok) onDone()
  }

  async function saveKey() {
    if (!keyValue.trim()) return
    await window.lens.setApiKey(keyProvider, keyValue.trim())
    onDone()
  }

  const best = check?.recommendation.best
  const alreadyHave = best && check?.installed.includes(best.tag)

  return (
    <div className="no-drag absolute inset-0 z-30 flex flex-col overflow-y-auto bg-ink px-5 py-6">
      <div className="mb-5 flex items-center gap-2.5">
        <Logo size={26} />
        <div>
          <h1 className="text-[15px] font-semibold text-paper">Lens</h1>
          <p className="readout text-brass">Runs on your machine</p>
        </div>
      </div>

      {!check ? (
        <p className="text-[12px] text-muted">Checking what your machine can run…</p>
      ) : (
        <>
          <section className="mb-4 rounded-xl border border-line bg-panel p-3">
            <h2 className="readout mb-2 text-muted/70">Your machine</h2>
            <p className="font-[family-name:var(--font-read)] text-[11px] text-paper">
              {check.spec.ramGb}GB memory
              {check.spec.vramGb > 0 && ` · ${check.spec.vramGb}GB VRAM`}
              {check.spec.gpuName && ` · ${check.spec.gpuName}`}
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
              {check.recommendation.reason}
            </p>
          </section>

          {best && (
            <section className="mb-4">
              <h2 className="readout mb-2 text-muted/70">Recommended · free, private</h2>

              {!check.ollamaRunning && (
                <div className="mb-2 rounded-lg border border-brass/30 bg-brass/10 p-2.5">
                  <p className="text-[12px] leading-relaxed text-brass">
                    Install Ollama first — it is what runs models on your own machine.
                  </p>
                  <button
                    onClick={() => void window.lens.openExternal('https://ollama.com/download')}
                    className="mt-1.5 rounded-md bg-brass px-2.5 py-1 text-[11px] font-semibold text-ink"
                  >
                    Get Ollama
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-line bg-panel p-3">
                <p className="text-[13px] font-medium text-paper">{best.label}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                  {best.note}. {best.sizeGb}GB download.
                </p>

                {pulling === best.tag ? (
                  <div className="mt-2.5">
                    <div className="h-1 overflow-hidden rounded-full bg-raise">
                      <div
                        className="h-full rounded-full bg-brass transition-all"
                        style={{ width: `${progress?.percent ?? 5}%` }}
                      />
                    </div>
                    <p className="readout mt-1.5 text-muted">
                      {progress?.status ?? 'downloading'}
                      {progress?.percent !== undefined && ` · ${progress.percent}%`}
                    </p>
                  </div>
                ) : alreadyHave ? (
                  <button
                    onClick={onDone}
                    className="mt-2.5 w-full rounded-lg bg-brass py-1.5 text-[12px] font-semibold text-ink"
                  >
                    Already installed — start using Lens
                  </button>
                ) : (
                  <button
                    onClick={() => void pull(best.tag)}
                    disabled={!check.ollamaRunning}
                    className="mt-2.5 w-full rounded-lg bg-brass py-1.5 text-[12px] font-semibold text-ink disabled:bg-raise disabled:text-muted"
                  >
                    Download {best.label}
                  </button>
                )}
              </div>
            </section>
          )}

          <section className="mb-4">
            <h2 className="readout mb-2 text-muted/70">Or use a key you already own</h2>
            <p className="mb-2 text-[11.5px] leading-relaxed text-muted">
              Any provider works. Your key is encrypted and stays on this device.
            </p>
            <div className="flex gap-1.5">
              <select
                value={keyProvider}
                onChange={(e) => setKeyProvider(e.target.value)}
                className="rounded-lg border border-line bg-raise px-2 py-1.5 text-[11.5px] text-paper outline-none focus:border-brass/40"
              >
                <option value="anthropic">Claude</option>
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="groq">Groq</option>
              </select>
              <input
                type="password"
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder="Paste API key"
                className="min-w-0 flex-1 rounded-lg border border-line bg-raise px-2.5 py-1.5 text-[11.5px] text-paper outline-none placeholder:text-muted/60 focus:border-brass/40"
              />
              <button
                onClick={() => void saveKey()}
                disabled={!keyValue.trim()}
                className="rounded-lg bg-raise px-2.5 py-1.5 text-[11.5px] text-paper disabled:text-muted"
              >
                Save
              </button>
            </div>
          </section>

          <button onClick={onDone} className="mt-auto text-[11.5px] text-muted hover:text-paper">
            Skip for now
          </button>
        </>
      )}
    </div>
  )
}
