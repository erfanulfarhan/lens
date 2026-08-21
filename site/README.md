# The Lens site

Live at **https://getlens.pages.dev** — Cloudflare Pages, project name `getlens`.

## Deploy

```bash
npm run deploy
```

That builds and pushes to the `getlens` Pages project. `CLOUDFLARE_API_TOKEN` must
be in the environment; it lives in `~/.erfanul-secrets.env`.

There is no git integration on the project, so a push to GitHub does **not**
redeploy the site. Run the command above.

## Design

The palette is the spectrum a lens produces rather than a single accent. Each
section declares a wavelength through `data-band`, and the page runs violet,
azure, jade, amber, rose from top to bottom. The mark itself stays brass in every
band: it is the product's face, printed on the installers and the favicon.

Two things to know before editing the CSS:

- A custom property that references another is substituted where it is
  **defined**. `--brass: var(--accent)` on `:root` is baked to amber, so every
  band restates the aliases. Removing those restatements turns accents orange
  again inside coloured sections.
- The rail is `position: fixed`, so it inherits no band and reads the section
  crossing the middle of the viewport in JavaScript instead.
