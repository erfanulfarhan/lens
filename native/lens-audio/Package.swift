// swift-tools-version:6.0
import PackageDescription

let package = Package(
  name: "lens-audio",
  platforms: [.macOS(.v15)],
  targets: [
    .executableTarget(
      name: "lens-audio",
      path: "Sources/lens-audio",
      linkerSettings: [
        // The Info.plist must be embedded in the executable itself: without the
        // usage-description keys, macOS aborts the process the moment it asks
        // for microphone or speech permission.
        .unsafeFlags([
          "-Xlinker", "-sectcreate",
          "-Xlinker", "__TEXT",
          "-Xlinker", "__info_plist",
          "-Xlinker", "Info.plist",
        ])
      ]
    )
  ]
)
