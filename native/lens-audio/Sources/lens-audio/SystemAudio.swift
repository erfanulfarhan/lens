import Foundation
import ScreenCaptureKit
import AVFoundation

/// Captures audio playing on the machine — the other people on a call.
///
/// ScreenCaptureKit is the only supported way to do this on modern macOS, and it
/// is why a Swift helper exists at all: Electron's desktopCapturer cannot get
/// system audio here. `excludesCurrentProcessAudio` keeps the assistant from
/// hearing itself.
@available(macOS 15.0, *)
final class SystemAudioCapture: NSObject, SCStreamOutput, SCStreamDelegate {
  private let writer: EventWriter
  private let transcriber: Transcriber
  private var stream: SCStream?

  init(writer: EventWriter, transcriber: Transcriber) {
    self.writer = writer
    self.transcriber = transcriber
  }

  func start() async {
    do {
      // A display must be supplied even for audio-only capture.
      let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
      guard let display = content.displays.first else {
        writer.emit(.error(message: "no display available for system audio"))
        return
      }

      let filter = SCContentFilter(display: display, excludingApplications: [], exceptingWindows: [])
      let config = SCStreamConfiguration()
      config.capturesAudio = true
      config.excludesCurrentProcessAudio = true
      config.sampleRate = 16_000
      config.channelCount = 1
      // Video is required by the API; keep it minimal since we discard it.
      config.width = 2
      config.height = 2
      config.minimumFrameInterval = CMTime(value: 1, timescale: 1)

      let stream = SCStream(filter: filter, configuration: config, delegate: self)
      try stream.addStreamOutput(self, type: .audio, sampleHandlerQueue: DispatchQueue(label: "lens.sysaudio"))
      try await stream.startCapture()
      self.stream = stream
    } catch {
      writer.emit(.error(message: "system audio: \(error.localizedDescription)"))
    }
  }

  func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
    guard type == .audio, let buffer = Self.pcmBuffer(from: sampleBuffer) else { return }
    transcriber.append(buffer)
  }

  func stream(_ stream: SCStream, didStopWithError error: Error) {
    writer.emit(.error(message: "system audio stopped: \(error.localizedDescription)"))
  }

  func stop() async {
    try? await stream?.stopCapture()
    stream = nil
  }

  /// Converts a CMSampleBuffer to the AVAudioPCMBuffer the recognizer wants.
  private static func pcmBuffer(from sampleBuffer: CMSampleBuffer) -> AVAudioPCMBuffer? {
    guard let description = sampleBuffer.formatDescription,
          let asbd = description.audioStreamBasicDescription else { return nil }

    var streamDescription = asbd
    guard let format = AVAudioFormat(streamDescription: &streamDescription) else { return nil }

    let frames = AVAudioFrameCount(sampleBuffer.numSamples)
    guard frames > 0, let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames) else { return nil }
    buffer.frameLength = frames

    let audioBufferList = buffer.mutableAudioBufferList
    var blockBuffer: CMBlockBuffer?
    let status = CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer(
      sampleBuffer,
      bufferListSizeNeededOut: nil,
      bufferListOut: audioBufferList,
      bufferListSize: MemoryLayout<AudioBufferList>.size,
      blockBufferAllocator: nil,
      blockBufferMemoryAllocator: nil,
      flags: 0,
      blockBufferOut: &blockBuffer
    )
    return status == noErr ? buffer : nil
  }
}
