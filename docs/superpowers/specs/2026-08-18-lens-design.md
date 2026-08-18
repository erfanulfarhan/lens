# Lens: screen and audio aware assistant

Date: 2026-08-18
Status: implemented through the screen path; audio path pending

## What it is

A macOS overlay assistant. It captures the screen, answers questions about it in
a floating panel, and grounds those answers in the user's own material.

## Scope boundary

Anti-detection was requested and is deliberately **not** built. Hiding the panel
from screen sharing and proctoring software exists only to deceive an
interviewer, so the panel is an ordinary always-on-top window and shows up in a
screen share like anything else. Everything else in the original request is in.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Inputs | Screen, mic, system audio | User selected the full set |
| Triggering | Ambient: audio turns and screen changes | User selected ambient |
| Knowledge | Full injection behind a `KnowledgeSource` interface | Scale unknown; 1M context makes retrieval premature |
| Model | `claude-opus-5` + fast mode | Up to 2.5x output tokens/sec, Opus 5 / 4.8 only |
| Latency dial | `effort: "low"`, adaptive thinking on | Disabling thinking on Opus 5 leaks tool calls into text |
| Stack | Electron + React + Swift sidecar | Matches the user's stack; Swift only where macOS requires it |

## Architecture

Two processes. A Swift binary owns native capture (ScreenCaptureKit frames and
system audio, AVAudioEngine mic, `SpeechAnalyzer` transcription) and speaks
newline-delimited JSON over stdio. Electron owns triggers, knowledge, the model
call, storage and UI. No business logic in Swift; no native capture in Electron.

Because mic and system audio are separate streams, speaker attribution is free:
system audio is them, mic is you. No diarization model.

## The cache invariant

Render order is tools, system, messages, and any byte change in the prefix
invalidates everything after it. Layout:

1. Operating rules (frozen)
2. Persona and knowledge files, cache breakpoint here
3. Settled history
4. Volatile tail: transcript, screenshot, question, after every breakpoint

The screenshot is the highest-entropy content in the request. If it ever lands
ahead of a breakpoint, the entire prefix is rewritten on every call, expensively
and silently. `prompt.test.ts` asserts this directly, and `cache_read_input_tokens`
is surfaced in the panel because a persistent zero is the only runtime signal
that caching has stopped working.

## Trigger design

`ScreenChangeTrigger` fires on a settled change: the difference hash must move
past a threshold **and then hold still**, which is what separates a new problem
appearing from the user scrolling. `AudioTurnTrigger` fires when the other party
stops talking after a real turn, and stays suppressed while the mic is active.
`Dispatcher` owns cooldown, single-flight, and priority cancellation.

All three are pure and hardware-free, so ambient behaviour is tested by
replaying values rather than by talking at a laptop.

## Build order

1. Screen path end to end (done)
2. Swift sidecar: capture and transcription, verified standalone
3. Audio triggers wired to the dispatcher
4. Storage, history, settings

Screen capture works entirely inside Electron, so stage 1 is usable on its own.
Only system audio requires the sidecar, which is why it moved later.

## Known gaps

- Swift sidecar not yet written; ambient mode currently fires on screen only.
- No persistence: history is in-memory and dies with the process.
- Panel is functional, not designed.
