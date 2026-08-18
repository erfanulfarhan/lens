import Foundation
import AVFoundation

/// lens-audio: captures system audio and the microphone, transcribes both
/// on-device, and writes newline-delimited JSON events to stdout.
///
/// Run it standalone to verify capture without involving Electron:
///   ./lens-audio            both sources
///   ./lens-audio --system   system audio only
///   ./lens-audio --mic      microphone only
@main
struct LensAudio {
  static func main() async {
    let writer = EventWriter()
    let args = Set(CommandLine.arguments.dropFirst())
    let wantSystem = args.isEmpty || args.contains("--system")
    let wantMic = args.isEmpty || args.contains("--mic")

    // Permission prompts belong to the host app, which has the usage strings.
    // Here we only report what is currently allowed.
    if !Transcriber.authorized() {
      writer.emit(.error(message: "Speech recognition is not authorised yet. Allow it in System Settings > Privacy & Security > Speech Recognition, then start listening again."))
    }
    if wantMic, AVCaptureDevice.authorizationStatus(for: .audio) != .authorized {
      writer.emit(.error(message: "Microphone access is not authorised yet. Allow it in System Settings > Privacy & Security > Microphone."))
    }

    // A box, so the signal handlers can reach the captures without capturing
    // mutable locals (which Swift 6 concurrency rejects).
    let captures = CaptureBox()

    if wantSystem {
      let transcriber = Transcriber(source: .system, writer: writer)
      transcriber.start()
      let capture = SystemAudioCapture(writer: writer, transcriber: transcriber)
      await capture.start()
      captures.system = capture
    }

    if wantMic {
      let transcriber = Transcriber(source: .mic, writer: writer)
      transcriber.start()
      let capture = MicCapture(writer: writer, transcriber: transcriber)
      capture.start()
      captures.mic = capture
    }

    writer.emit(.ready(sampleRate: 16_000))

    // Stop cleanly when Electron closes the pipe or sends SIGTERM.
    let stop: @Sendable () -> Void = {
      Task {
        await captures.stopAll()
        writer.emit(.stopped)
        // Give the writer queue a moment to flush before exiting.
        try? await Task.sleep(nanoseconds: 150_000_000)
        exit(0)
      }
    }
    // Dispatch sources, not signal(): a C function pointer cannot capture context.
    signal(SIGTERM, SIG_IGN)
    signal(SIGINT, SIG_IGN)
    let term = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
    let int = DispatchSource.makeSignalSource(signal: SIGINT, queue: .main)
    term.setEventHandler { stop() }
    int.setEventHandler { stop() }
    term.resume()
    int.resume()

    // Electron's control channel. Monitored asynchronously: reading stdin
    // synchronously returned nil the moment stdin was not a terminal, which
    // exited the process immediately and produced no output at all.
    let stdin = FileHandle.standardInput
    stdin.readabilityHandler = { handle in
      let data = handle.availableData
      if data.isEmpty {
        stop() // pipe closed: the parent went away
        return
      }
      if let text = String(data: data, encoding: .utf8), text.contains("stop") {
        stop()
      }
    }

    // Parks the main thread and services the capture callbacks forever. Without
    // this the async main returns and the process ends.
    dispatchMain()
  }
}


/// Holds the capture objects so shutdown can reach them from a signal handler.
final class CaptureBox: @unchecked Sendable {
  private let lock = NSLock()
  private var _system: SystemAudioCapture?
  private var _mic: MicCapture?

  var system: SystemAudioCapture? {
    get { lock.withLock { _system } }
    set { lock.withLock { _system = newValue } }
  }
  var mic: MicCapture? {
    get { lock.withLock { _mic } }
    set { lock.withLock { _mic = newValue } }
  }

  func stopAll() async {
    await system?.stop()
    mic?.stop()
  }
}
