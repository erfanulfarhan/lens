import Foundation
import Speech
import AVFoundation

/// On-device speech recognition for one audio source.
///
/// Uses SFSpeechRecognizer with `requiresOnDeviceRecognition`, so audio never
/// leaves the machine — the whole point of a self-hosted assistant. Voice
/// activity is derived from buffer energy rather than a separate detector,
/// because Electron only needs to know when a turn ends.
final class Transcriber {
  private let source: Event.Source
  private let writer: EventWriter
  private let recognizer: SFSpeechRecognizer?
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?

  /// Energy above which a buffer counts as speech. Tuned for normal call levels.
  private let speechThreshold: Float = 0.012
  private var speaking = false
  private var lastEmittedText = ""

  init(source: Event.Source, writer: EventWriter, locale: Locale = Locale(identifier: "en-US")) {
    self.source = source
    self.writer = writer
    self.recognizer = SFSpeechRecognizer(locale: locale)
  }

  func start() {
    guard let recognizer, recognizer.isAvailable else {
      writer.emit(.error(message: "speech recognizer unavailable for \(source.rawValue)"))
      return
    }

    let request = SFSpeechAudioBufferRecognitionRequest()
    request.shouldReportPartialResults = true
    // Keep everything local; a cloud fallback would defeat the privacy premise.
    if recognizer.supportsOnDeviceRecognition {
      request.requiresOnDeviceRecognition = true
    }
    self.request = request

    task = recognizer.recognitionTask(with: request) { [weak self] result, error in
      guard let self else { return }
      if let error {
        // A cancelled task at shutdown is normal; anything else is worth saying.
        let ns = error as NSError
        if ns.code != 301 && ns.code != 216 {
          self.writer.emit(.error(message: "\(self.source.rawValue): \(error.localizedDescription)"))
        }
        return
      }
      guard let result else { return }
      let text = result.bestTranscription.formattedString
      guard text != self.lastEmittedText || result.isFinal else { return }
      self.lastEmittedText = text
      self.writer.emit(.transcript(source: self.source, text: text, isFinal: result.isFinal))
    }
  }

  func append(_ buffer: AVAudioPCMBuffer) {
    request?.append(buffer)
    updateVoiceActivity(buffer)
  }

  /// Emits an event only on transitions, so Electron gets edges not a stream.
  private func updateVoiceActivity(_ buffer: AVAudioPCMBuffer) {
    guard let channel = buffer.floatChannelData?[0] else { return }
    let count = Int(buffer.frameLength)
    guard count > 0 else { return }

    var sum: Float = 0
    for i in 0..<count { sum += channel[i] * channel[i] }
    let rms = (sum / Float(count)).squareRoot()
    let isSpeech = rms > speechThreshold

    if isSpeech != speaking {
      speaking = isSpeech
      writer.emit(.voice(source: source, active: isSpeech))
    }
  }

  func stop() {
    request?.endAudio()
    task?.cancel()
    request = nil
    task = nil
  }

  /// Reads the current permission state.
  ///
  /// Deliberately does NOT call `requestAuthorization`: requesting permission
  /// from a process whose responsible app has no usage-description strings makes
  /// macOS abort the process outright (SIGABRT), with no error to report. The
  /// host app owns the prompts; the helper only reports what it is allowed to do.
  static func authorized() -> Bool {
    SFSpeechRecognizer.authorizationStatus() == .authorized
  }
}
