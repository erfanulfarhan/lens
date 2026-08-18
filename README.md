# Lens

A screen and audio aware AI assistant that runs on **your own machine**.

Lens watches your screen when you ask it to, listens to calls when you turn that
on, and answers using documents you give it. The model can run locally through
[Ollama](https://ollama.com), so there is no subscription and nothing leaves your
computer. If you already own an API key, it uses that instead.

<!-- Add a screenshot here once you have one you like. -->

## Why

Assistants of this kind are usually rented: a monthly fee, your screen sent to
someone else's servers, and a model you cannot choose. Lens is the same idea
built the other way round. You host the model, you pick it, you keep the data.

## What it does

- **Answers about your screen.** Press `⌘⇧Space`, and it asks what you want done
  with the capture rather than guessing.
- **Follows conversations.** With listening on, it transcribes the call on-device
  and can answer the last thing the other person said.
- **Knows your material.** Drop PDFs, Word files, notes or markdown in and it
  retrieves only the relevant passages per question, so a large library still
  fits a small model's context.
- **Remembers across sessions.** Chats are kept in a searchable sidebar, and it
  recalls relevant past exchanges.
- **Searches the web** when you want it to, off by default.
- **Recommends a model for your hardware.** It reads your RAM and VRAM and
  suggests one that will actually run smoothly.

## Install

Download the installer for your platform from
[Releases](../../releases), or build it yourself:

```bash
git clone https://github.com/erfanulfarhan/lens.git
cd lens
npm install
npm run native      # builds the macOS audio helper (macOS only)
npm run dev
```

The installers are not code-signed yet. On macOS, right-click the app and choose
**Open** the first time. On Windows, choose **More info → Run anyway**.

## Running a model locally

1. Install [Ollama](https://ollama.com/download).
2. Pull a model. Lens recommends one on first run, or:
   ```bash
   ollama pull gemma3:12b        # good all-rounder, needs ~10GB
   ollama pull qwen2.5vl:7b      # lighter, ~7GB
   ```
3. Start Lens. It finds Ollama automatically.

**Using another machine's GPU.** Set `OLLAMA_HOST=0.0.0.0:11434` on the machine
with the GPU, open port 11434, then point Lens at `http://<that-ip>:11434` in
Settings. Inference runs there while the panel stays on your laptop.

## Shortcuts

| Shortcut | Action |
|---|---|
| `⌘⇧Space` | Capture the screen, then say what to do with it |
| `⌘⇧H` | Show or hide the panel |
| `Esc` | Hide the panel |
| `Enter` | Send · `⇧Enter` for a new line |

## Your data

Documents, chats and learned memory are stored under your user data directory
(`~/Library/Application Support/lens` on macOS) and never uploaded. API keys are
encrypted with the OS keychain. Transcription runs on-device.

Two things do leave your machine, and only when you choose them: a cloud provider
if you pick one instead of local, and web search when you switch it on.

## Layout

```
electron/
  providers/   model adapters (Ollama, Anthropic, Gemini, OpenAI, Groq)
  knowledge/   document extraction, chunking, embedding, retrieval
  history/     chat sessions
  memory/      cross-session learning
  audio/       Swift helper supervisor and transcript assembly
  hardware/    system detection and model recommendation
  settings/    encrypted settings store
native/
  lens-audio/  Swift helper: system audio + microphone, on-device transcription
src/           React interface
```

## Tests

```bash
npm test          # unit tests, no network or hardware needed
npm run typecheck
```

Tests that need a live model or the internet are skipped unless `LENS_LIVE=1`.

## Licence

MIT
