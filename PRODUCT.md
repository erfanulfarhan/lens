# Product

Lens — a screen and audio aware AI assistant that runs on the user's own machine.

## Platform

web (this surface: a marketing landing page for a desktop app)

## Stack

Vite + React + Tailwind for the landing page, matching the owner's standing
preference for new web projects. Delegated to the assistant; the owner was away
when this surface was built.

## Users

People who want the capability of a paid screen-reading AI assistant without the
subscription or the data leaving their computer. Comfortable installing a desktop
app; many will install Ollama if told plainly why. Mixed hardware, so "will it
run on mine" is a live question.

## Product Purpose

Answer questions about what is on your screen, what was just said on a call, and
what is in your own documents, using a model you host and choose.

## Positioning

The same idea as rented assistants, built the other way round: you host the
model, you pick it, you keep the data. Free because there is no server to pay
for, not as a trial.

## Operating Context

A desktop overlay summoned by a keyboard shortcut, often at night, over other
work. Inference runs locally through Ollama, optionally on another machine's GPU
over the LAN, or through the user's own API key.

## Capabilities and Constraints

- Screen capture on demand (`⌘⇧Space`), asks what to do rather than guessing.
- Call transcription on-device — **macOS only** (Swift helper on ScreenCaptureKit).
- Retrieval over the user's PDFs, Word files, notes and markdown.
- Cross-session chat history and recalled memory.
- Web search, off by default.
- Recommends a model from the machine's RAM and VRAM.
- Installers are **not code-signed yet**: macOS needs right-click → Open,
  Windows needs More info → Run anyway.
- **No anti-detection, deliberately.** It does not hide from screen sharing.

## Brand Commitments

The mark is an aperture, not an eye: brass blades around an opening that glows
sage — light arriving from your own machine. Palette is brass `#C8964F`, sage
`#7FA88B`, ink `#14161C`, paper `#E8E6E1`. Warm machined instrument, not
cold-tech.

## Evidence on Hand

- Real product screenshots: `docs/screenshots/*.png` (4).
- Real releases: v0.1.3, published 2026-08-19.
- Six install targets: macOS arm64/Intel, Windows, AppImage, deb, rpm.
- **No social proof yet: 0 stars, 0 forks, no testimonials, no press.** Nothing
  on this surface may imply otherwise.
- **No licence file yet**, so "open source" must not be claimed as a term of art
  until one is added; "source available / build it yourself" is accurate.

## Product Principles

- Say what leaves the machine and when. Never imply more privacy than is true.
- Never market it as undetectable. That capability was excluded on purpose.
- Free means free; do not manufacture urgency or a fake paid tier.

## Accessibility & Inclusion

Keyboard reachable, visible focus, reduced-motion respected, body text ≥4.5:1.
Shortcut glyphs need text equivalents for screen readers.
