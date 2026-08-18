import Foundation

/// Events the helper writes to stdout, one JSON object per line.
///
/// The helper carries no application logic: it captures and transcribes, and
/// Electron decides what any of it means. That split keeps the Swift surface
/// small enough to run standalone in a terminal while debugging.
enum Event: Encodable {
  case ready(sampleRate: Double)
  /// Voice activity changed on one source.
  case voice(source: Source, active: Bool)
  /// A transcript fragment. `isFinal` marks a settled phrase.
  case transcript(source: Source, text: String, isFinal: Bool)
  case error(message: String)
  case stopped

  enum Source: String, Encodable {
    /// Audio playing on the machine: the other people on a call.
    case system
    /// The microphone: the user speaking.
    case mic
  }

  private enum CodingKeys: String, CodingKey {
    case type, source, text, isFinal, active, sampleRate, message
  }

  func encode(to encoder: Encoder) throws {
    var c = encoder.container(keyedBy: CodingKeys.self)
    switch self {
    case let .ready(sampleRate):
      try c.encode("ready", forKey: .type)
      try c.encode(sampleRate, forKey: .sampleRate)
    case let .voice(source, active):
      try c.encode("voice", forKey: .type)
      try c.encode(source, forKey: .source)
      try c.encode(active, forKey: .active)
    case let .transcript(source, text, isFinal):
      try c.encode("transcript", forKey: .type)
      try c.encode(source, forKey: .source)
      try c.encode(text, forKey: .text)
      try c.encode(isFinal, forKey: .isFinal)
    case let .error(message):
      try c.encode("error", forKey: .type)
      try c.encode(message, forKey: .message)
    case .stopped:
      try c.encode("stopped", forKey: .type)
    }
  }
}

/// Serialises events to stdout. Line-buffered so Electron sees them immediately.
///
/// Sendable because capture callbacks arrive on several queues; the serial queue
/// is what actually guarantees one whole line at a time reaches stdout.
final class EventWriter: @unchecked Sendable {
  private let lock = NSLock()

  /// Writes synchronously: buffering events on a queue lost them when the
  /// process exited, which made the helper look silently broken.
  func emit(_ event: Event) {
    guard let data = try? JSONEncoder().encode(event),
          let line = String(data: data, encoding: .utf8) else { return }
    lock.lock()
    print(line)
    fflush(stdout)
    lock.unlock()
  }
}
