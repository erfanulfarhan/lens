# Design — Lens landing page

Extends the incumbent app identity rather than replacing it. The app's own tokens
and the aperture mark are the authority.

## Mode

Persuade. The visitor decides whether to download.

## Palette

Taken from the app's `src/index.css`, not invented.

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#0F1116` | Page ground, slightly deeper than the app shell |
| `--panel` | `#161920` | Raised surfaces |
| `--line` | `#252A34` | Hairlines |
| `--brass` | `#C8964F` | The machined metal: primary accent, the mark |
| `--brass-lit` | `#EBC689` | Highlight edge on brass |
| `--sage` | `#7FA88B` | Light from your own machine: the "local" signal only |
| `--paper` | `#E8E6E1` | Body text |
| `--muted` | `#9A9DA6` | Secondary text, 6.97:1 |
| `--faint` | `#82858F` | Small print, 5.13:1. Raised from `#6B6E78`, which measured 3.71 and failed the 4.5 floor |

Dark is chosen from the use scene, not the category: Lens is an overlay summoned
over other work, frequently at night. Sage is reserved — it marks what runs
locally and nothing else, so it keeps meaning.

## Type

- **Display: Bodoni Moda.** A Didone, so it carries the same machined
  high-contrast precision as the brass barrel. Used only at large sizes, where
  its hairlines survive; anything under ~1.3rem takes the body face instead.
  Fraunces was the first choice and was rejected: impeccable's detector flags it,
  correctly, as part of the font monoculture AI-generated UIs converge on.
- **Body: Schibsted Grotesk.** Calm, slightly humanist, uncommon. Recedes under
  the Didone rather than competing with it. Inter and Instrument Sans were both
  rejected for the same monoculture reason.
- **Mono: JetBrains Mono**, used only for shortcuts and shell commands, which are
  genuinely code and data. Never as a texture for "technical".

Display caps at 6rem, tracking floor -0.04em, body measure 65–75ch.

## Signature motion

One authored moment: the aperture opens. Brass blades rotate apart from a closed
iris and sage light spills through, and the hero resolves behind it. It is the
mark performing its own meaning — an opening that lets light in from your side.
Everything after that is quiet: no per-section entrance, no scattered effects.
Reduced motion serves the open state immediately.

## Structural rules

- No eyebrow or kicker above any heading.
- No grid of same-size icon cards as page structure.
- Numbers appear only in "how it works", where the sequence is real.
- No gradient text, no glass as decoration.
- Browser surfaces themed: selection, caret, scrollbar, focus ring.
