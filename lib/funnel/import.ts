export type ImportEntry = { name: string; data: Uint8Array }
export type RuntimeScript = { src?: string; code?: string; type?: string }
export type PreparedPage = {
  slug: string
  name: string
  source: string
  isHome: boolean
  html: string
  css: string
  scripts: RuntimeScript[]
}

const HTML_RE = /\.x?html?/i
const CSS_RE = /\.css$/i

export function resolveRelative(from: string, ref: string): string | null {
  const trimmed = ref?.trim()
  if (!trimmed || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:|mailto:|tel:|javascript:)/i.test(trimmed)) {
    return null
  }
  const base = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : ''
  const cleaned = trimmed.replace(/^\.\//, '')
  const parts = (cleaned.startsWith('/') ? cleaned.slice(1) : base ? `${base}/${cleaned}` : cleaned).split('/')
  const stack: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') stack.pop()
    else stack.push(part)
  }
  return stack.join('/') || null
}

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
  return (
    base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/, '') || 'page'
  )
}

export function titleFromHtml(html: string, fallback: string): string {
  const title = /<title[^>]*>([\s\S]{0,200}?)<\/title>/i.exec(html)?.[1]?.replace(/\s+/g, ' ').trim()
  if (title) return title.slice(0, 120)
  const heading = /<h1[^>]*>([\s\S]{0,200}?)<\/h1>/i
    .exec(html)?.[1]
    ?.replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return (heading || fallback).slice(0, 120)
}

function homeScore(name: string): number {
  const depth = name.split('/').length - 1
  const file = name.split('/').pop()!.toLowerCase().replace(HTML_RE, '')
  return depth * 10 + (file === 'index' ? 0 : file === 'home' || file === 'accueil' ? 1 : 2)
}

export function pickHtmlEntries(entries: ImportEntry[], max: number): ImportEntry[] {
  return entries
    .filter((e) => HTML_RE.test(e.name))
    .sort((a, b) => homeScore(a.name) - homeScore(b.name) || a.name.localeCompare(b.name))
    .slice(0, max)
}

/** Build a lookup that maps many possible relative paths to the same page slug. */
export function buildPagePathIndex(pageSlugs: Map<string, string>): Map<string, string> {
  const index = new Map<string, string>()
  for (const [sourcePath, slug] of pageSlugs) {
    const variants = new Set<string>()
    variants.add(sourcePath)
    variants.add(sourcePath.replace(/^\.\//, ''))
    const noExt = sourcePath.replace(HTML_RE, '')
    variants.add(noExt)
    variants.add(`${noExt}/`)
    variants.add(`${noExt}/index.html`)
    variants.add(`${noExt}/index.htm`)
    const base = sourcePath.split('/').pop()
    if (base) {
      variants.add(base)
      variants.add(base.replace(HTML_RE, ''))
    }
    for (const key of variants) {
      if (key && !index.has(key)) index.set(key, slug)
    }
  }
  return index
}

export function rewriteCssUrls(
  css: string,
  fromPath: string,
  assetUrl: (path: string) => string | null,
  quoteWith: '"' | "'" | '' = '"',
): string {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (whole, _quote: string, ref: string) => {
    const [path, suffix] = splitRef(ref)
    const resolved = resolveRelative(fromPath, path)
    const url = resolved ? assetUrl(resolved) : null
    return url ? `url(${quoteWith}${url}${suffix}${quoteWith})` : whole
  })
}

const URL_ATTRS = ['src', 'href', 'poster', 'data-src', 'data-bg', 'data-background']

export function rewriteHtmlRefs(
  html: string,
  fromPath: string,
  assetUrl: (path: string) => string | null,
  pageUrl: (path: string) => string | null,
): string {
  const mapRef = (ref: string) => {
    const [path, suffix] = splitRef(ref)
    const resolved = resolveRelative(fromPath, path)
    if (!resolved) return null
    const page = pageUrl(resolved)
    if (page) return `${page}${suffix}`
    const withoutExt = resolved.replace(HTML_RE, '')
    const alt =
      pageUrl(withoutExt) ||
      pageUrl(`${withoutExt}.html`) ||
      pageUrl(`${withoutExt}.htm`) ||
      pageUrl(`${withoutExt}/index.html`) ||
      pageUrl(`${withoutExt}/index.htm`)
    if (alt) return `${alt}${suffix}`
    const asset = assetUrl(resolved)
    return asset ? `${asset}${suffix}` : null
  }

  let out = html
  for (const attr of URL_ATTRS) {
    const re = new RegExp(`(\\s${attr}\\s*=\\s*)(["'])([^"']*)\\2`, 'gi')
    out = out.replace(re, (whole, head: string, quote: string, ref: string) => {
      const mapped = mapRef(ref)
      return mapped ? `${head}${quote}${mapped}${quote}` : whole
    })
  }

  out = out.replace(/(\s(?:image)?srcset\s*=\s*)(["'])([^"']*)\2/gi, (whole, head: string, quote: string, value: string) => {
    const mapped = value
      .split(',')
      .map((part) => {
        const chunk = part.trim()
        if (!chunk) return null
        const space = chunk.search(/\s/)
        const ref = space === -1 ? chunk : chunk.slice(0, space)
        const descriptor = space === -1 ? '' : chunk.slice(space)
        return `${mapRef(ref) || ref}${descriptor}`
      })
      .filter(Boolean)
      .join(', ')
    return `${head}${quote}${mapped}${quote}`
  })

  out = out.replace(/(\s<source\b[^>]*\bsrc\s*=\s*)(["'])([^"']*)\2/gi, (whole, head: string, quote: string, ref: string) => {
    const mapped = mapRef(ref)
    return mapped ? `${head}${quote}${mapped}${quote}` : whole
  })

  out = out.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (whole, body: string) =>
    whole.replace(body, rewriteCssUrls(body, fromPath, assetUrl)),
  )
  out = out.replace(/(\sstyle\s*=\s*")([^"]*)"/gi, (whole, head: string, value: string) =>
    value.includes('url(') ? `${head}${rewriteCssUrls(value, fromPath, assetUrl, "'")}"` : whole,
  )
  out = out.replace(/(\sstyle\s*=\s*')([^']*)'/gi, (whole, head: string, value: string) =>
    value.includes('url(') ? `${head}${rewriteCssUrls(value, fromPath, assetUrl, '"')}'` : whole,
  )
  return out
}

export function extractStyles(
  html: string,
  fromPath: string,
  readCss: (path: string) => string | null,
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

export function extractScripts(
  html: string,
  fromPath: string,
  assetUrl: (path: string) => string | null,
): { html: string; scripts: RuntimeScript[] } {
  const scripts: RuntimeScript[] = []
  const out = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_whole, attrs: string, code: string) => {
    const src = /\bsrc\s*=\s*(["'])([^"']*)\1/i.exec(attrs)?.[2]
    const type = /\btype\s*=\s*(["'])([^"']*)\1/i.exec(attrs)?.[2]
    if (src) {
      const [path, suffix] = splitRef(src)
      const resolved = resolveRelative(fromPath, path)
      const local = resolved ? assetUrl(resolved) : null
      if (local) scripts.push({ src: `${local}${suffix}`, type })
      else if (/^(?:https?:)?\/\//i.test(src) || /^https?:\/\//i.test(src)) scripts.push({ src, type })
    } else if (code.trim()) {
      scripts.push({ code, type })
    }
    return ''
  })
  return { html: out, scripts }
}

export function rewriteScriptRefs(
  code: string,
  fromPath: string,
  assetUrl: (path: string) => string | null,
): string {
  const rewrite = (ref: string) => {
    const resolved = resolveRelative(fromPath, ref)
    return resolved ? assetUrl(resolved) || ref : ref
  }
  return code
    .replace(
      /(\b(?:import|export)\s+(?:[^'";]+?\s+from\s+|))(['"])([^'"]+)\2/g,
      (_whole, head, quote, ref) => `${head}${quote}${rewrite(ref)}${quote}`,
    )
    .replace(/(\bimport\s*\(\s*)(['"])([^'"]+)\2/g, (_whole, head, quote, ref) => `${head}${quote}${rewrite(ref)}${quote}`)
}

export function extractBody(html: string): string {
  const match = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)
  if (match) return match[1]
  return html
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
}

/** Strip only dangerous structural tags; keep onclick / media / data-* for fidelity. */
export function sanitizeProjectHtml(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\/?\s*>/gi, '')
    .replace(/<base\b[^>]*>/gi, '')
}
