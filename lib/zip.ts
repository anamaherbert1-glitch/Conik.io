import JSZip from 'jszip'

export type ZipEntry = { name: string; data: Uint8Array }

const MAX_ENTRIES = 300
const MAX_UNCOMPRESSED = 40 * 1024 * 1024
const MAX_ENTRY = 10 * 1024 * 1024

function safePath(name: string) {
  const normalized = name.replaceAll('\\', '/').replace(/^\/+/, '')
  if (!normalized || normalized.endsWith('/') || normalized.includes('\0')) return null
  const parts = normalized.split('/')
  if (parts.some(p => p === '..' || p === '.')) return null
  return parts.join('/')
}

export async function parseZip(buffer: Buffer): Promise<ZipEntry[]> {
  if (buffer.length < 22) throw new Error('Invalid ZIP file.')
  const zip = await JSZip.loadAsync(buffer, { createFolders: false, checkCRC32: true })
  const files = Object.values(zip.files).filter(file => !file.dir)
  if (!files.length || files.length > MAX_ENTRIES) throw new Error('ZIP contains an invalid number of files.')
  const out: ZipEntry[] = []
  let total = 0
  for (const file of files) {
    const name = safePath(file.name)
    if (!name) throw new Error('ZIP contains an unsafe path.')
    const data = await file.async('uint8array')
    if (data.length > MAX_ENTRY || (total += data.length) > MAX_UNCOMPRESSED) throw new Error('ZIP contents are too large.')
    out.push({ name, data })
  }
  return out
}

export function textFrom(data: Uint8Array, max: number) {
  if (data.length > max) throw new Error('HTML file is too large.')
  return new TextDecoder('utf-8', { fatal: false }).decode(data)
}

export function assetMime(name: string): string | null {
  const ext = name.toLowerCase().split('.').pop() || ''
  const map: Record<string, string> = {
    css: 'text/css', js: 'text/javascript', json: 'application/json',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon',
    avif: 'image/avif', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
    mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', wav: 'audio/wav'
  }
  return map[ext] || null
}

export function sanitizeImportedHtml(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\/?\s*>/gi, '')
    .replace(/on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/<base\b[^>]*>/gi, '')
}
