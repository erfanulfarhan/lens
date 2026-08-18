import Foundation
import AVFoundation

/// Captures the microphone — the user's own voice.
///
/// Kept separate from system audio so speaker attribution is free: mic is you,
/// system audio is them. No diarisation model is needed, which matters because
/// diarisation is slow and error-prone.
final class MicCapture {
  private let writer: EventWriter
  private let transcriber: Transcriber
  private let engine = AVAudioEngine()

  init(writer: EventWriter, transcriber: Transcriber) {
    self.writer = writer
    self.transcriber = transcriber
  }

  func start() {
    let input = engine.inputNode
    let format = input.outputFormat(forBus: 0)
    guard format.sampleRate > 0 else {
      writer.emit(.error(message: "no microphone input available"))
      return
    }

    input.installTap(onBus: 0, bufferSize: 2048, format: format) { [weak self] buffer, _ in
      self?.transcriber.append(buffer)
    }

    do {
      engine.prepare()
      try engine.start()
    } catch {
      writer.emit(.error(message: "microphone: \(error.localizedDescription)"))
    }
  }

  func stop() {
    engine.inputNode.removeTap(onBus: 0)
    engine.stop()
  }
}
