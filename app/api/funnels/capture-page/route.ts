import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { extractBody, extractStyles, rewriteCssUrls, rewriteHtmlRefs } from '@/lib/funnel/import'
import { parseZip, textFrom, assetMime, sanitizeImportedHtml } from '@/lib/zip'
import { getSupabaseConfig } from '@/lib/supabase/config'
import { createHash } from 'crypto'

export const runtime = 'nodejs'
const MAX_HTML_BYTES = 5 * 1024 * 1024
const MAX_UPLOAD = 25 * 1024 * 1024
const MAX_ASSETS = 80
const MIN_DELAY_MS = 1000
const MAX_DELAY_MS = 60000

async function getFunnel(request: NextRequest) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const url = new URL(request.url)
  const funnelId = String(url.searchParams.get('funnelId') || '').trim()
  if (!/^[0-9a-f-]{36}$/i.test(funnelId)) throw new Error('Tunnel invalide.')
  const { data: funnel, error } = await supabase
    .from('funnels')
    .select('id,name,slug,capture_enabled,capture_delay_ms,capture_html,capture_css,capture_js')
    .eq('id', funnelId)
    .eq('organization_id', organization.id)
    .single()
  if (error || !funnel) throw new Error('Tunnel introuvable ou accès refusé.')
  return { supabase, organization, funnel }
}

function extractInlineScripts(html: string) {
  const scripts: string[] = []
  const clean = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (whole, attrs: string, body: string) => {
    // Skip external scripts (src=...) — they are handled separately if present as files
    if (/\bsrc\s*=/i.test(attrs || '')) return whole
    if (body.trim()) scripts.push(body.trim())
    return ''
  })
  return { html: clean, js: scripts.join('\n\n') }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, funnel } = await getFunnel(request)
    const { data: pages, error: pagesError } = await supabase
      .from('funnel_pages')
      .select('id,name,slug,page_type,position,published_version_id')
      .eq('funnel_id', funnel.id)
      .order('position', { ascending: true })

    if (pagesError) return NextResponse.json({ error: pagesError.message }, { status: 400 })

    return NextResponse.json({
      capture: funnel,
      pages: pages || [],
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Impossible de charger la page de capture.' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const form = await request.formData()
    const funnelId = String(form.get('funnelId') || '').trim()
    if (!/^[0-9a-f-]{36}$/i.test(funnelId)) {
      return NextResponse.json({ error: 'Tunnel invalide.' }, { status: 400 })
    }
    const { data: funnel, error: funnelError } = await supabase
      .from('funnels')
      .select('id,name,slug')
      .eq('id', funnelId)
      .eq('organization_id', organization.id)
      .single()
    if (funnelError || !funnel) {
      return NextResponse.json({ error: 'Tunnel introuvable ou accès refusé.' }, { status: 404 })
    }

    // Collect all uploaded files (HTML, CSS, JS, ZIP, assets)
    const files: File[] = []
    for (const [key, value] of form.entries()) {
      if (value instanceof File && value.size > 0 && (key === 'file' || key === 'files' || key.startsWith('file'))) {
        files.push(value)
      }
    }
    // Also support single 'file'
    const single = form.get('file')
    if (single instanceof File && single.size > 0 && !files.includes(single)) files.push(single)

    let captureHtml: string | undefined
    let captureCss: string | undefined
    let captureJs: string | undefined

    if (files.length > 0) {
      const totalSize = files.reduce((s, f) => s + f.size, 0)
      if (totalSize > MAX_UPLOAD) {
        return NextResponse.json({ error: 'Les fichiers dépassent 25 Mo au total.' }, { status: 413 })
      }

      const zipFile = files.find(
        (f) => /\.zip$/i.test(f.name) || f.type === 'application/zip' || f.type === 'application/x-zip-compressed',
      )

      if (zipFile) {
        // --- ZIP import: extract HTML + CSS + JS + assets ---
        const entries = await parseZip(Buffer.from(await zipFile.arrayBuffer()))
        const htmlEntry = entries.find((e) => /\.html?$/i.test(e.name))
        if (!htmlEntry) {
          return NextResponse.json({ error: 'Aucun fichier HTML trouvé dans le ZIP.' }, { status: 400 })
        }
        if (htmlEntry.data.length > MAX_HTML_BYTES) {
          return NextResponse.json({ error: 'Le fichier HTML dépasse 5 Mo.' }, { status: 413 })
        }

        const cssByPath = new Map<string, string>()
        const jsParts: string[] = []
        for (const entry of entries) {
          if (/\.css$/i.test(entry.name)) {
            try {
              cssByPath.set(entry.name, textFrom(entry.data, MAX_HTML_BYTES))
            } catch {
              /* skip oversized */
            }
          }
          if (/\.js$/i.test(entry.name)) {
            try {
              jsParts.push(`/* ${entry.name} */\n${textFrom(entry.data, MAX_HTML_BYTES)}`)
            } catch {
              /* skip */
            }
          }
        }

        // Upload non-code assets (images, fonts…)
        const assetUrls = new Map<string, string>()
        const assetEntries = entries
          .filter((e) => e.name !== htmlEntry.name && assetMime(e.name) && !/\.(css|js)$/i.test(e.name))
          .slice(0, MAX_ASSETS)
        const { url: supabaseUrl } = getSupabaseConfig()

        for (const entry of assetEntries) {
          const mime = assetMime(entry.name)!
          const safeName = entry.name
            .replace(/[^a-zA-Z0-9._/-]/g, '-')
            .replace(/\/{2,}/g, '/')
            .replace(/^\/+/, '')
          if (!safeName || safeName.includes('..')) continue
          const path = `${organization.id}/${funnel.id}/capture/${safeName}`
          const upload = await supabase.storage
            .from('funnel-assets')
            .upload(path, Buffer.from(entry.data), { contentType: mime, upsert: true })
          if (upload.error) continue
          await supabase.from('funnel_assets').insert({
            funnel_id: funnel.id,
            storage_path: path,
            file_type: mime,
            size_bytes: entry.data.length,
            original_name: entry.name,
            mime_type: mime,
            sha256: createHash('sha256').update(entry.data).digest('hex'),
          })
          assetUrls.set(
            entry.name,
            `${supabaseUrl}/storage/v1/object/public/funnel-assets/${path.split('/').map(encodeURIComponent).join('/')}`,
          )
        }

        const assetUrl = (p: string) => assetUrls.get(p) || null
        const source = textFrom(htmlEntry.data, MAX_HTML_BYTES)
        const extractedScript = extractInlineScripts(source)
        const raw = sanitizeImportedHtml(extractedScript.html)
        const withStyles = extractStyles(raw, htmlEntry.name, (cssPath) => {
          const body = cssByPath.get(cssPath)
          return body === undefined ? null : rewriteCssUrls(body, cssPath, assetUrl)
        })
        let bodyHtml = extractBody(withStyles.html)
        bodyHtml = rewriteHtmlRefs(bodyHtml, htmlEntry.name, assetUrl, () => null)

        captureHtml = bodyHtml
        captureCss = rewriteCssUrls(withStyles.css, htmlEntry.name, assetUrl)
        captureJs = [extractedScript.js, ...jsParts].filter(Boolean).join('\n\n')
      } else {
        // --- Multi-file or single HTML import ---
        const htmlFile = files.find((f) => /\.html?$/i.test(f.name) || f.type === 'text/html')
        if (!htmlFile) {
          return NextResponse.json({ error: 'Importez au moins un fichier HTML (ou un ZIP).' }, { status: 400 })
        }
        if (htmlFile.size > MAX_HTML_BYTES) {
          return NextResponse.json({ error: 'Le fichier HTML dépasse 5 Mo.' }, { status: 413 })
        }

        const cssFiles = files.filter((f) => /\.css$/i.test(f.name) || f.type === 'text/css')
        const jsFiles = files.filter(
          (f) => /\.js$/i.test(f.name) || /javascript/i.test(f.type),
        )

        const externalCss = (
          await Promise.all(cssFiles.map(async (f) => textFrom(Buffer.from(await f.arrayBuffer()), MAX_HTML_BYTES)))
        ).join('\n\n')
        const externalJs = (
          await Promise.all(jsFiles.map(async (f) => textFrom(Buffer.from(await f.arrayBuffer()), MAX_HTML_BYTES)))
        ).join('\n\n')

        const source = textFrom(Buffer.from(await htmlFile.arrayBuffer()), MAX_HTML_BYTES)
        const extractedScript = extractInlineScripts(source)
        const raw = sanitizeImportedHtml(extractedScript.html)
        // No external path resolution for loose files — only inline <style> + uploaded .css
        const withStyles = extractStyles(raw, htmlFile.name, () => null)

        captureHtml = extractBody(withStyles.html)
        captureCss = [withStyles.css, externalCss].filter(Boolean).join('\n\n').trim()
        captureJs = [extractedScript.js, externalJs].filter(Boolean).join('\n\n').trim()
      }
    }

    const enabledRaw = String(form.get('enabled') || '').trim().toLowerCase()
    const enabled = ['1', 'true', 'on', 'yes', 'oui'].includes(enabledRaw)
    const delayRaw = Number(form.get('delayMs') || 5000)
    const delayMs = Number.isFinite(delayRaw)
      ? Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, Math.round(delayRaw)))
      : 5000

    const update: Record<string, unknown> = {
      capture_enabled: enabled,
      capture_delay_ms: delayMs,
    }
    if (captureHtml !== undefined) {
      update.capture_html = captureHtml
      update.capture_css = captureCss || ''
      update.capture_js = captureJs || ''
    }

    const { data, error } = await supabase
      .from('funnels')
      .update(update)
      .eq('id', funnel.id)
      .select('id,name,slug,capture_enabled,capture_delay_ms,capture_html,capture_css,capture_js')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({
      ok: true,
      capture: data,
      analysis: {
        hasHtml: Boolean(data.capture_html),
        cssBytes: (data.capture_css || '').length,
        jsBytes: (data.capture_js || '').length,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Enregistrement impossible.' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, funnel } = await getFunnel(request)
    const { data, error } = await supabase
      .from('funnels')
      .update({
        capture_enabled: false,
        capture_delay_ms: 5000,
        capture_html: null,
        capture_css: null,
        capture_js: null,
      })
      .eq('id', funnel.id)
      .select('id,name,slug,capture_enabled,capture_delay_ms,capture_html,capture_css,capture_js')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, capture: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Suppression impossible.' }, { status: 400 })
  }
}
