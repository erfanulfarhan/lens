/**
 * Every claim on this page, in one place, so it can be checked against the
 * README rather than drifting into marketing.
 */

export const RELEASES = 'https://github.com/erfanulfarhan/lens/releases';
export const REPO = 'https://github.com/erfanulfarhan/lens';
export const VERSION = 'v0.1.3';

export interface Target {
  label: string;
  file: string;
  match: RegExp;
}

/** The six real build targets from the README's install table. */
export const TARGETS: Target[] = [
  { label: 'macOS, Apple Silicon', file: 'Lens-*-arm64.dmg', match: /Mac.*ARM|Mac OS X.*arm/i },
  { label: 'macOS, Intel', file: 'Lens-*.dmg', match: /Macintosh|Mac OS X/i },
  { label: 'Windows', file: 'Lens-Setup-*.exe', match: /Windows/i },
  { label: 'Linux, any distribution', file: 'Lens-*.AppImage', match: /Linux|X11/i },
  { label: 'Debian, Ubuntu, Mint', file: 'lens_*_amd64.deb', match: /^$/ },
  { label: 'Fedora, RHEL, openSUSE', file: 'lens-*.x86_64.rpm', match: /^$/ },
];

/**
 * Verifiable facts, standing in for social proof this product has not earned
 * yet. Nothing here is a testimonial, a user count, or a logo.
 */
export const LEDGER: Array<{ fact: string; detail: string; local?: boolean }> = [
  {
    fact: 'Six install targets',
    detail: 'macOS on Apple Silicon and Intel, Windows, AppImage, deb and rpm.',
  },
  {
    fact: VERSION + ', shipped',
    detail: 'Published as a real release, not a waitlist or an early-access form.',
  },
  {
    fact: 'Transcription runs on-device',
    detail: 'A Swift helper on ScreenCaptureKit. Audio is never sent anywhere.',
    local: true,
  },
  {
    fact: 'Keys held in the OS keychain',
    detail: 'If you bring your own API key it is encrypted by the system, not stored in a file.',
  },
  {
    fact: 'No server to pay for',
    detail: 'The cost of running it is your own electricity, which is why it can be free.',
    local: true,
  },
  {
    fact: 'Source available',
    detail: 'Clone it, read it, build it yourself. Nothing about the app is a black box.',
  },
];

/**
 * What people actually ask it, typed in the hero. Drawn from the app's own
 * commands, so the page demonstrates the product rather than describing it.
 */
export const ASKED = [
  'What does this error mean?',
  'Summarise the contract on my screen',
  'Draft a reply to this email',
  'What did they just ask me?',
  'Turn my notes into revision questions',
  'Translate this',
];

export const STEPS = [
  {
    title: 'Install Ollama and pull a model',
    body: 'One download, then one command. Lens recommends a model that will actually fit your RAM and VRAM instead of letting you find out the hard way.',
    code: 'ollama pull gemma3:12b',
    aside: 'Lighter machines: qwen2.5vl:7b, about 7GB.',
  },
  {
    title: 'Open Lens',
    body: 'It finds Ollama by itself. If your GPU lives in another machine, point Settings at that address and inference runs there while the panel stays on your laptop.',
    code: 'Settings → Model server',
    aside: 'Or paste an API key to use a cloud provider instead.',
  },
  {
    title: 'Ask',
    body: 'The panel captures your screen and asks what you want done with it, rather than guessing. Drop in documents and it retrieves only the passages that matter for the question.',
    code: '⌘⇧Space',
    aside: 'Ctrl+Shift+Space on Windows and Linux.',
  },
];

export const FAQ = [
  {
    q: 'Does it hide from screen sharing?',
    a: 'No, and that is deliberate. Lens has no anti-detection of any kind and none is planned. It is built to be a tool you use openly, not one you conceal during an interview or an exam. If that is what you are looking for, this is the wrong project.',
  },
  {
    q: 'Is it actually free, or free for now?',
    a: 'Actually free. There is no account, no trial and no server bill to eventually pass on to you — the model runs on your own hardware, so the only running cost is your electricity. There is no paid tier held back for later.',
  },
  {
    q: 'Does anything leave my computer?',
    a: 'Two things, and only when you choose them: a cloud provider, if you pick one instead of running locally, and web search, which is off until you switch it on. Documents, chat history and learned memory stay in your user data directory and are never uploaded.',
  },
  {
    q: 'Do I need a powerful GPU?',
    a: 'Not necessarily. Lens reads your RAM and VRAM on first run and suggests a model that will run smoothly on what you have. If you own a desktop with a real GPU, you can leave inference there and run the panel on a laptop over your own network.',
  },
  {
    q: 'Why does my machine warn me when I open it?',
    a: 'The installers are not code-signed yet. On macOS, right-click the app and choose Open the first time. On Windows, choose More info, then Run anyway. Linux needs nothing.',
  },
  {
    q: 'Can it listen to calls on Windows or Linux?',
    a: 'Not yet. Call transcription uses a small Swift helper built against ScreenCaptureKit, which has no equivalent on other platforms. Everything else — screen questions, documents, memory, web search — works everywhere.',
  },
];

/**
 * The screenshot carousel.
 *
 * Real captures, not mockups, and each one is here to answer a different
 * question a visitor actually has: what does an answer look like, can I use a
 * model I already pay for, and does it work before I have set anything up.
 */
export const SHOTS = [
  {
    src: '/shot-answer.png',
    alt: 'The Lens panel answering a question, showing the model in use and the local status badge',
    width: 2240,
    height: 600,
    title: 'One question, one answer',
    body: 'The badge on the answer says where it ran. LOCAL means the exchange never left the machine.',
  },
  {
    src: '/shot-settings.png',
    alt: 'Settings: choosing a provider, adding an API key and viewing keyboard shortcuts',
    width: 1800,
    height: 900,
    title: 'Local model, or a key you already own',
    body: 'Pick a model Lens has matched to your hardware, or paste a key for a provider you already pay for.',
  },
  {
    src: '/shot-ready.png',
    alt: 'Lens on first launch, reporting which local model it found and that it is ready',
    width: 1800,
    height: 900,
    title: 'Ready on first launch',
    body: 'It checks what your machine can run and tells you, rather than asking you to guess at a model list.',
  },
] as const;
