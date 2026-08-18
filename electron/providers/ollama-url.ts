const DEFAULT = 'http://localhost:11434/v1'

/**
 * Accepts anything a person would plausibly type for a remote Ollama host and
 * normalises it: a bare IP, a host:port, with or without scheme, with or
 * without the /v1 suffix. Getting this wrong produces a confusing 404 rather
 * than an obvious error, so it is worth being generous here.
 */
export function ollamaBaseUrl(raw?: string): string {
  const input = raw?.trim()
  if (!input) return DEFAULT

  let url = /^https?:\/\//i.test(input) ? input : `http://${input}`
  url = url.replace(/\/+$/, '')

  // Assume the default port when only a host was given.
  if (!/:\d+(\/|$)/.test(url)) url = `${url}:11434`
  if (!/\/v1$/.test(url)) url = `${url}/v1`

  return url
}
