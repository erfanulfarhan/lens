import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { LineParser, type AudioEvent } from './protocol.js'

/**
 * Runs and watches the Swift audio helper.
 *
 * The helper does capture and transcription; all interpretation stays here. It is
 * restarted with backoff if it dies, because losing audio silently mid-meeting is
 * worse than a brief gap.
 */
export class AudioSupervisor {
  private child: ChildProcess | null = null
  private parser = new LineParser()
  private restarts = 0
  private stopping = false
  private listeners: Array<(e: AudioEvent) => void> = []

  constructor(
    private binaryPath: string,
    private platform: NodeJS.Platform = process.platform
  ) {}

  /**
   * The helper is a macOS binary built against ScreenCaptureKit and Speech, so it
   * cannot run anywhere else. Checking only that the file exists would offer a
   * Listen button on Windows and Linux that fails the moment it is pressed, since
   * the file ships in the bundle on every platform.
   */
  get available(): boolean {
    return this.platform === 'darwin' && existsSync(this.binaryPath)
  }

  get running(): boolean {
    return this.child !== null
  }

  onEvent(cb: (e: AudioEvent) => void): void {
    this.listeners.push(cb)
  }

  private emit(event: AudioEvent): void {
    for (const l of this.listeners) l(event)
  }

  start(): void {
    if (this.child || !this.available) return
    this.stopping = false
    this.parser = new LineParser()

    const child = spawn(this.binaryPath, [], { stdio: ['pipe', 'pipe', 'pipe'] })
    this.child = child

    child.stdout?.setEncoding('utf8')
    child.stdout?.on('data', (chunk: string) => {
      for (const event of this.parser.push(chunk)) this.emit(event)
    })

    // The helper reports its own problems as events; stderr is the crash channel.
    child.stderr?.setEncoding('utf8')
    child.stderr?.on('data', (chunk: string) => {
      const message = chunk.trim()
      if (message) this.emit({ type: 'error', message })
    })

    child.on('exit', () => {
      this.child = null
      if (this.stopping) return

      // Backoff, capped: a permission denial would otherwise spin forever.
      if (this.restarts < 3) {
        const delay = 1000 * 2 ** this.restarts
        this.restarts++
        setTimeout(() => this.start(), delay)
      } else {
        this.emit({ type: 'error', message: 'Audio helper keeps stopping. Check microphone and screen recording permissions.' })
      }
    })
  }

  stop(): void {
    this.stopping = true
    const child = this.child
    if (!child) return
    // Ask politely first: the helper flushes its transcript before exiting.
    child.stdin?.write('stop\n')
    setTimeout(() => child.kill('SIGTERM'), 400)
    this.child = null
    this.restarts = 0
  }
}
