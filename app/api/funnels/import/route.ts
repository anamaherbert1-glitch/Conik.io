import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { parseZip } from '@/lib/funnel/zip'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_UPLOAD = 15 * 1024 * 1024
const MAX_PAGES = 50
const ALLOWED_ASSET_TYPES: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.css': 'text/css',
}

function slugify(value: string, fallback = 'funnel') {
  const slug = value.toLowerCase().trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70)
  return slug || fallback
}

function attrFromTag(attrs: string, name: string) {
  return attrs.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]
}

function normalizeRef(value: string) {
  try {
    const decoded = decodeURIComponent(value.trim()).replaceAll('\\', '/')
    if (/^(https?:|data:|mailto:|tel:|#|\/\/)/i.test(decoded)) return null
    return decoded.replace(/^\.\//, '').replace(/^\/+/, '').split('#')[0].split('?')[0]
  } catch { return null }
}

function sanitizeHtml(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\/?\s*>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*\/?\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(?:href|src|action|formaction)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, '')
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '')
}

function extractForms(html: string) {
  const forms: Array<{ name: string; fields: unknown[] }> = []
  let formIndex = 0
  for (const match of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    formIndex++
    const fields: unknown[] = []
    let position = 0
    for (const control of match[2].matchAll(/<(input|textarea|select)\b([^>]*)>/gi)) {
      const attrs = control[2]
      const attr = (name: string) => attrFromTag(attrs, name)
      const type = (attr('type') || (control[1].toLowerCase() === 'textarea' ? 'textarea' : control[1].toLowerCase() === 'select' ? 'select' : 'text')).toLowerCase()
      if (type === 'hidden' || type === 'submit' || type === 'button') continue
      const fieldName = slugify(attr('name') || attr('id') || `field_${position + 1}`).replace(/-/g, '_').slice(0, 60) || `field_${position + 1}`
      fields.push({ name: fieldName, label: attr('placeholder') || fieldName, field_type: ['email','tel','number','checkbox','text','textarea','select'].includes(type) ? type : 'text', required: /\brequired(?:\s*=|\s|\/?>)/i.test(attrs), position })
      position++
    }
    forms.push({ name: attrFromTag(match[1], 'id') || `Imported form ${formIndex}`, fields })
  }
  return forms
}

function extractCtas(html: string) {
  const ctas: Array<{ type: string; text: string; href?: string }> = []
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const href = attrFromTag(m[1], 'href')
    if (text || href) ctas.push({ type: 'link', text: text.slice(0, 160), href })
  }
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (text) ctas.push({ type: 'button', text: text.slice(0, 160) })
  }
  return ctas.slice(0, 200)
}

function pageType(name: string): 'landing' | 'checkout' | 'thank-you' | 'custom' {
  if (/thank|thanks|success|confirmation|merci/i.test(name)) return 'thank-you'
  if (/checkout|payment|paiement|cart|panier/i.test(name)) return 'checkout'
  if (/index|home|landing|accueil/i.test(name)) return 'landing'
  return 'custom'
}

function textFrom(buffer: Buffer, max = 5 * 1024 * 1024) {
  if (buffer.length > max) throw new Error('Text file exceeds the safe parsing limit.')
  return buffer.toString('utf8').replace(/^\uFEFF/, '')
}

function assetMime(name: string) {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
  return ALLOWED_ASSET_TYPES[ext] || null
}

function isIgnored(name: string) {
  return name.startsWith('__MACOSX/') || name.endsWith('/.DS_Store') || name === '.DS_Store' || name.startsWith('.git/') || name.includes('/node_modules/')
}

function replaceLocalRefs(value: string, publicUrls: Map<string, string>) {
  let result = value
  for (const [source, url] of publicUrls) {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(`(["'\\(])(?:\\.\\/)?${escaped}(?=["'\\)#?])`, 'gi'), `$1${url}`)
  }
  return result
}

function inlineReferencedCss(html: string, cssByName: Map<string, string>) {
  return html.replace(/<link\b([^>]*?)>/gi, (full, attrs) => {
    const rel = attrFromTag(attrs, 'rel')?.toLowerCase()
    const href = attrFromTag(attrs, 'href')
    if (rel !== 'stylesheet' || !href) return full
    const ref = normalizeRef(href)
    const css = ref ? cssByName.get(ref.toLowerCase()) : undefined
    return css ? `<style>${css}</style>` : full
  })
}

export async function POST(request: Request) {
  const { supabase, user, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const formData = await request.formData()
  const file = formData.get('file')
  const requestedName = String(formData.get('name') || '').trim()

  if (!(file instanceof File)) return NextResponse.json({ error: 'Select a ZIP file.' }, { status: 400 })
  if (!file.name.toLowerCase().endsWith('.zip')) return NextResponse.json({ error: 'Only .zip files are accepted.' }, { status: 400 })
  if (file.size <= 0 || file.size > MAX_UPLOAD) return NextResponse.json({ error: 'ZIP must be between 1 byte and 15 MB.' }, { status: 400 })

  let funnelId: string | null = null
  const uploadedPaths: string[] = []
  try {
    const archive = Buffer.from(await file.arrayBuffer())
    const entries = parseZip(archive).filter((entry) => !isIgnored(entry.name))
    const htmlEntries = entries.filter((entry) => /\.(html?|xhtml)$/i.test(entry.name))
    if (!htmlEntries.length) throw new Error('No HTML page was found in the ZIP.')
    if (htmlEntries.length > MAX_PAGES) throw new Error(`The ZIP contains too many HTML pages (maximum ${MAX_PAGES}).`)

    const baseName = (requestedName || file.name.replace(/\.zip$/i, '').replace(/[_-]+/g, ' ')).slice(0, 160)
    let slug = slugify(baseName)
    const { data: existing } = await supabase.from('funnels').select('slug').eq('organization_id', membership.organizationId).like('slug', `${slug}%`).limit(20)
    if (existing?.some((row) => row.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`

    const { data: funnel, error: funnelError } = await supabase.from('funnels').insert({ organization_id: membership.organizationId, name: baseName, slug, source: 'import', created_by: user.id, status: 'draft' }).select('id').single()
    if (funnelError || !funnel) throw new Error(funnelError?.message || 'Unable to create funnel.')
    funnelId = funnel.id

    const publicUrls = new Map<string, string>()
    const assetRows: Array<{ funnel_id: string; storage_path: string; file_type: string; size_bytes: number; original_name: string; mime_type: string; sha256: string }> = []
    const assets = entries.filter((entry) => assetMime(entry.name))
    if (assets.length > 180) throw new Error('The ZIP contains too many supported assets (maximum 180).')
    const cssByName = new Map<string, string>()
    for (const entry of assets.filter((entry) => /\.css$/i.test(entry.name))) cssByName.set(entry.name.toLowerCase(), textFrom(entry.data, 2 * 1024 * 1024))

    for (const entry of assets) {
      const mime = assetMime(entry.name)!
      const safeName = entry.name.replace(/[^a-zA-Z0-9._/-]/g, '-').replace(/\/{2,}/g, '/').replace(/^\/+/, '')
      const path = `${membership.organizationId}/${funnel.id}/${safeName}`
      const upload = await supabase.storage.from('funnel-assets').upload(path, new Blob([entry.data], { type: mime }), { contentType: mime, upsert: false })
      if (upload.error) throw new Error(`Asset upload failed for ${entry.name}: ${upload.error.message}`)
      uploadedPaths.push(path)
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/funnel-assets/${path.split('/').map(encodeURIComponent).join('/')}`
      publicUrls.set(entry.name, publicUrl)
      publicUrls.set(entry.name.replace(/^\.\//, ''), publicUrl)
      assetRows.push({ funnel_id: funnel.id, storage_path: path, file_type: mime, size_bytes: entry.data.length, original_name: entry.name, mime_type: mime, sha256: createHash('sha256').update(entry.data).digest('hex') })
    }

    const assetInsert = assetRows.length ? await supabase.from('funnel_assets').insert(assetRows).select('id, storage_path, original_name') : { data: [], error: null }
    if (assetInsert.error) throw new Error(`Unable to index assets: ${assetInsert.error.message}`)

    const ordered = [...htmlEntries].sort((a, b) => ((/(^|\/)index\.html?$/i.test(a.name) ? 0 : 1) - (/(^|\/)index\.html?$/i.test(b.name) ? 0 : 1)) || a.name.localeCompare(b.name))
    const pages: Array<{ id: string; slug: string; name: string }> = []
    let totalForms = 0
    let totalCtas = 0

    for (let index = 0; index < ordered.length; index++) {
      const entry = ordered[index]
      const rawHtml = textFrom(entry.data)
      const jsParts = [...rawHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((m) => m[2].trim()).filter(Boolean)
      let html = sanitizeHtml(rawHtml)
      html = inlineReferencedCss(html, cssByName)
      const forms = extractForms(html)
      const ctas = extractCtas(html)
      totalForms += forms.length
      totalCtas += ctas.length
      html = replaceLocalRefs(html, publicUrls)
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || entry.name.split('/').pop()?.replace(/\.x?html?$/i, '') || `Page ${index + 1}`
      const rawName = /(^|\/)index\.html?$/i.test(entry.name) ? 'Home' : title.slice(0, 120)
      let pageSlug = slugify(entry.name.replace(/\.x?html?$/i, '').split('/').pop() || `page-${index + 1}`, `page-${index + 1}`)
      if (pageSlug === 'index') pageSlug = index === 0 ? 'home' : `page-${index + 1}`
      if (pages.some((page) => page.slug === pageSlug)) pageSlug = `${pageSlug}-${index + 1}`

      const { data: page, error: pageError } = await supabase.from('funnel_pages').insert({ funnel_id: funnel.id, name: rawName, title: rawName, slug: pageSlug, page_type: pageType(entry.name), html_content: html, is_home: index === 0, position: index }).select('id').single()
      if (pageError || !page) throw new Error(`Unable to create page ${entry.name}: ${pageError?.message || 'unknown error'}`)

      const metadata = { imported_file: entry.name, detected_forms: forms.length, forms, detected_ctas: ctas.length, ctas, asset_count: assets.length, security: { scripts_stored_but_not_executed: true, dangerous_markup_removed: true } }
      const { data: version, error: versionError } = await supabase.from('funnel_versions').insert({ page_id: page.id, version_number: 1, html, css: '', js: jsParts.join('\n\n'), metadata, created_by: user.id }).select('id').single()
      if (versionError || !version) throw new Error(`Unable to create version for ${entry.name}: ${versionError?.message || 'unknown error'}`)
      pages.push({ id: page.id, slug: pageSlug, name: rawName })
    }

    return NextResponse.json({ ok: true, funnel: { id: funnel.id, name: baseName, slug }, pages, analysis: { html_pages: htmlEntries.length, assets: assets.length, forms: totalForms, ctas: totalCtas, total_files: entries.length, security: 'sanitized_and_sandbox_ready' } })
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from('funnel-assets').remove(uploadedPaths).catch(() => undefined)
    if (funnelId) await supabase.from('funnels').delete().eq('id', funnelId).catch(() => undefined)
    const message = error instanceof Error ? error.message : 'Import failed.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
