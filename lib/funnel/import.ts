/**
 * Transforms an imported ZIP archive (a site exported from any builder / AI tool)
 * into Conik funnel pages: multi-page support, asset URL rewriting, CSS inlining
 * and cross-page link rewriting.
 */

export type ImportEntry = { name: string; data: Uint8Array }

export type PreparedPage = {
  /** Slug used in the public URL: /{funnelSlug}/{pageSlug} */
  slug: string
  /** Human readable name */
  name: string
  /** Original path inside the ZIP */
  source: string
  isHome: boolean
  html: string
  css: string
}

const HTML_RE = /\.x?html?$/i
const CSS_RE = /\.css$/i

/** Resolve a relative reference against the directory of the referencing file. */
export function resolveRelative(from: string, ref: string): string | null {
  if (!ref) return null
  const trimmed = ref.trim()
  if (!trimmed) return null
  // Absolute / external / non-file references are left untouched.
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:|mailto:|tel:)/i.test(trimmed)) return null

  const base = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : ''
  const cleaned = trimmed.replace(/^\.\//, '')
  const startsAtRoot = cleaned.startsWith('/')
  const parts = (startsAtRoot ? cleaned.slice(1) : base ? `${base}/${cleaned}` : cleaned).split('/')

  const stack: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') stack.pop()
    else stack.push(part)
  }
  return stack.join('/') || null
}

/** Split a reference into its path and its ?query#hash suffix. */
function splitRef(ref: string): [string, string] {
  const at = ref.search(/[?#]/)
  return at === -1 ? [ref, ''] : [ref.slice(0, at), ref.slice(at)]
}

export function slugifyPath(input: string): string {
  const base = input
    .replace(HTML_RE, '')
    .replace(/\/+$/, '')
    .split('/')
    .filter(Boolean)
    .join('-')
  const slug = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  return slug || 'page'
}

export function titleFromHtml(html: string, fallback: string): string {
  const match = /<title[^>]*>([\s\S]{0,200}?)<\/title>/i.exec(html)
  const title = match?.[1]?.replace(/\s+/g, ' ').trim()
  if (title) return title.slice(0, 120)
  const h1 = /<h1[^>]*>([\s\S]{0,200}?)<\/h1>/i.exec(html)
  const heading = h1?.[1]?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return (heading || fallback).slice(0, 120)
}

/** Rank candidate home pages: index.html at the root wins. */
function homeScore(name: string): number {
  const depth = name.split('/').length - 1
  const file = name.split('/').pop()!.toLowerCase()
  const base = file.replace(HTML_RE, '')
  const nameScore = base === 'index' ? 0 : base === 'home' || base === 'accueil' ? 1 : 2
  return depth * 10 + nameScore
}

export function pickHtmlEntries(entries: ImportEntry[], max: number): ImportEntry[] {
  return entries
    .filter((e) => HTML_RE.test(e.name))
    .sort((a, b) => homeScore(a.name) - homeScore(b.name) || a.name.localeCompare(b.name))
    .slice(0, max)
}

/** Rewrite url(...) references inside a CSS payload. */
export function rewriteCssUrls(
  css: string,
  fromPath: string,
  assetUrl: (path: string) => string | null,
  /** Quote character to wrap rewritten URLs with. Use '' inside HTML attributes. */
  quoteWith: '"' | "'" | '' = '"'
): string {
  return css.replace(
    /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
    (whole, _quote: string, ref: string) => {
      const [path, suffix] = splitRef(ref)
      const resolved = resolveRelative(fromPath, path)
      const url = resolved ? assetUrl(resolved) : null
      return url ? `url(${quoteWith}${url}${suffix}${quoteWith})` : whole
    }
  )
}

const URL_ATTRS = ['src', 'href', 'poster', 'data-src', 'data-bg']

/**
 * Rewrite every local reference in an HTML document:
 * - assets (images, fonts, media) -> public storage URL
 * - other HTML files -> /{funnelSlug}/{pageSlug}
 */
export function rewriteHtmlRefs(
  html: string,
  fromPath: string,
  assetUrl: (path: string) => string | null,
  pageUrl: (path: string) => string | null
): string {
  const mapRef = (ref: string): string | null => {
    const [path, suffix] = splitRef(ref)
    const resolved = resolveRelative(fromPath, path)
    if (!resolved) return null
    const page = pageUrl(resolved)
    if (page) return `${page}${suffix}`
    const asset = assetUrl(resolved)
    return asset ? `${asset}${suffix}` : null
  }

  let out = html

  // Standard single-value URL attributes.
  for (const attr of URL_ATTRS) {
    const re = new RegExp(`(\\s${attr}\\s*=\\s*)(["'])([^"']*)\\2`, 'gi')
    out = out.replace(re, (whole, head: string, quote: string, ref: string) => {
      const mapped = mapRef(ref)
      return mapped ? `${head}${quote}${mapped}${quote}` : whole
    })
  }

  // srcset / imagesrcset: comma separated "url descriptor" pairs.
  out = out.replace(
    /(\s(?:image)?srcset\s*=\s*)(["'])([^"']*)\2/gi,
    (whole, head: string, quote: string, value: string) => {
      const mapped = value
        .split(',')
        .map((part) => {
          const chunk = part.trim()
          if (!chunk) return null
          const space = chunk.search(/\s/)
          const ref = space === -1 ? chunk : chunk.slice(0, space)
          const descriptor = space === -1 ? '' : chunk.slice(space)
          const url = mapRef(ref)
          return `${url || ref}${descriptor}`
        })
        .filter(Boolean)
        .join(', ')
      return `${head}${quote}${mapped}${quote}`
    }
  )

  // url(...) inside <style> blocks and inline style attributes.
  out = out.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (whole, body: string) =>
    whole.replace(body, rewriteCssUrls(body, fromPath, assetUrl))
  )
  // Inline style attributes — handled per quote type so that the opposite
  // quote may legally appear inside url('…').
  out = out.replace(/(\sstyle\s*=\s*")([^"]*)"/gi, (whole, head: string, value: string) =>
    value.includes('url(') ? `${head}${rewriteCssUrls(value, fromPath, assetUrl, "'")}"` : whole
  )
  out = out.replace(/(\sstyle\s*=\s*')([^']*)'/gi, (whole, head: string, value: string) =>
    value.includes('url(') ? `${head}${rewriteCssUrls(value, fromPath, assetUrl, '"')}'` : whole
  )

  return out
}

/** Pull <style> blocks and local stylesheet <link>s out of the document. */
export function extractStyles(
  html: string,
  fromPath: string,
  readCss: (path: string) => string | null
): { html: string; css: string } {
  const collected: string[] = []

  let out = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_whole, body: string) => {
    collected.push(body)
    return ''
  })

  out = out.replace(/<link\b[^>]*>/gi, (tag: string) => {
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) return tag
    const href = /href\s*=\s*(["'])([^"']*)\1/i.exec(tag)?.[2]
    if (!href) return tag
    const [path] = splitRef(href)
    const resolved = resolveRelative(fromPath, path)
    if (!resolved || !CSS_RE.test(resolved)) return tag
    const body = readCss(resolved)
    if (body === null) return tag
    collected.push(body)
    return ''
  })

  return { html: out, css: collected.join('\n\n').trim() }
}

/** Keep only the body content — the runtime wraps it in its own document. */
export function extractBody(html: string): string {
  const match = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)
  if (match) return match[1]
  return html
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, '')
    .replace(/<(?:meta|title)\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
}
