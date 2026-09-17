import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'
import { createHash } from 'crypto'
import { parseZip, textFrom, assetMime, sanitizeImportedHtml } from '@/lib/zip'
import { getSupabaseConfig } from '@/lib/supabase/config'
import { extractBody, extractStyles, rewriteCssUrls, rewriteHtmlRefs, titleFromHtml } from '@/lib/funnel/import'
import { detectInteractiveElements } from '@/lib/funnel/interactive-elements'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_UPLOAD = 25 * 1024 * 1024
const MAX_HTML_BYTES = 5 * 1024 * 1024
const MAX_ASSETS = 180
const schema = z.object({ pageId: z.string().uuid() })

type RuntimeScript = { src?: string; code?: string; type?: string }

function extractInlineScripts(html: string) {
  const scripts: string[] = []
  const clean = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (whole, attrs: string, body: string) => {
    if (/\bsrc\s*=/i.test(attrs || '')) return ''
    if (body.trim()) scripts.push(body.trim())
    return ''
  })
  return { html: clean, js: scripts.join('\n\n') }
}

function extractExternalScripts(html: string) {
  const urls: string[] = []
  const seen = new Set<string>()
  const re = /<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    const value = String(match[2] || '').trim()
    try {
      const url = new URL(value)
      if ((url.protocol === 'https:' || url.protocol === 'http:') && !seen.has(url.toString())) {
        seen.add(url.toString())
        urls.push(url.toString())
      }
    } catch {}
  }
  return urls.slice(0, 20)
}

function buildRuntimeScripts(externalScripts: string[], inlineJs: string): RuntimeScript[] {
  const list: RuntimeScript[] = externalScripts.map((src) => ({ src }))
  if (inlineJs.trim()) list.push({ code: inlineJs })
  return list
}

async function getAuthorizedPage(request: NextRequest) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const form = await request.formData()
  const parsed = schema.safeParse({ pageId: String(form.get('pageId') || '') })
  if (!parsed.success) throw new Error('La page est obligatoire.')
  const { data: page, error: pageError } = await supabase
    .from('funnel_pages')
    .select('id,funnel_id,name,slug')
    .eq('id', parsed.data.pageId)
    .single()
  if (pageError || !page) throw new Error('Page introuvable.')
  const { data: funnel, error: funnelError } = await supabase
    .from('funnels')
    .select('id,organization_id,slug')
    .eq('id', page.funnel_id)
    .single()
  if (funnelError || !funnel || funnel.organization_id !== organization.id) {
    throw new Error('Tunnel introuvable ou accès refusé.')
  }
  return { supabase, organization, page, funnel }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, organization, page, funnel } = await getAuthorizedPage(request)
    const prefix = `${organization.id}/${funnel.id}/${page.id}/`
    const { data: assets, error: assetQueryError } = await supabase
      .from('funnel_assets')
      .select('storage_path')
      .eq('funnel_id', funnel.id)
    if (assetQueryError) throw new Error(assetQueryError.message)
    const paths = (assets || [])
      .map((a) => a.storage_path)
      .filter((path: string) => path.startsWith(prefix))
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from('funnel-assets').remove(paths)
      if (storageError) throw new Error(storageError.message)
      const { error: deleteError } = await supabase
        .from('funnel_assets')
        .delete()
        .eq('funnel_id', funnel.id)
        .in('storage_path', paths)
      if (deleteError) throw new Error(deleteError.message)
    }
    return NextResponse.json({ ok: true, removed: paths.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Suppression impossible.' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  let tempStoragePath: string | null = null
  try {
    const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const form = await request.formData()
    const file = form.get('file')
    const storagePath = String(form.get('storagePath') || '').trim()
    const fileNameHint = String(form.get('fileName') || '').trim()
    const parsed = schema.safeParse({ pageId: String(form.get('pageId') || '') })
    if (!parsed.success) {
      return NextResponse.json({ error: 'La page est obligatoire.' }, { status: 400 })
    }

    let fileBuffer: Buffer
    let sourceName: string
    let fileMime = ''

    if (storagePath) {
      if (!storagePath.startsWith(`${organization.id}/`) || storagePath.includes('..')) {
        return NextResponse.json({ error: 'Chemin de fichier invalide.' }, { status: 400 })
      }
      const admin = createAdminClient()
      const { data: blob, error: dlError } = await admin.storage.from('funnel-assets').download(storagePath)
      if (dlError || !blob) {
        return NextResponse.json({ error: dlError?.message || 'Fichier introuvable sur le stockage.' }, { status: 404 })
      }
      fileBuffer = Buffer.from(await blob.arrayBuffer())
      sourceName = fileNameHint || storagePath.split('/').pop() || 'upload.zip'
      tempStoragePath = storagePath
    } else if (file instanceof File) {
      if (file.size <= 0 || file.size > MAX_UPLOAD) {
        return NextResponse.json({ error: 'Le fichier doit peser entre 1 octet et 25 Mo.' }, { status: 413 })
      }
      fileBuffer = Buffer.from(await file.arrayBuffer())
      sourceName = file.name
      fileMime = file.type || ''
    } else {
      return NextResponse.json({ error: 'La page et le fichier HTML/ZIP sont obligatoires.' }, { status: 400 })
    }

    if (fileBuffer.length <= 0 || fileBuffer.length > MAX_UPLOAD) {
      return NextResponse.json({ error: 'Le fichier doit peser entre 1 octet et 25 Mo.' }, { status: 413 })
    }

    const { data: page, error: pageError } = await supabase
      .from('funnel_pages')
      .select('id,funnel_id,name,slug')
      .eq('id', parsed.data.pageId)
      .single()
    if (pageError || !page) return NextResponse.json({ error: 'Page introuvable.' }, { status: 404 })

    const { data: funnel, error: funnelError } = await supabase
      .from('funnels')
      .select('id,organization_id,slug')
      .eq('id', page.funnel_id)
      .single()
    if (funnelError || !funnel || funnel.organization_id !== organization.id) {
      return NextResponse.json({ error: 'Tunnel introuvable ou accès refusé.' }, { status: 403 })
    }

    const isZip =
      /\.zip$/i.test(sourceName) ||
      fileMime === 'application/zip' ||
      fileMime === 'application/x-zip-compressed'

    let rawHtml = ''
    let css = ''
    let js = ''
    let externalScripts: string[] = []
    const assetUrls = new Map<string, string>()

    if (isZip) {
      const entries = await parseZip(fileBuffer)
      const htmlEntry = entries.find((e) => /\.html?$/i.test(e.name))
      if (!htmlEntry) {
        return NextResponse.json({ error: 'Aucun fichier HTML trouvé dans le ZIP.' }, { status: 400 })
      }
      if (htmlEntry.data.length > MAX_HTML_BYTES) {
        return NextResponse.json({ error: 'Le fichier HTML dépasse 5 Mo.' }, { status: 413 })
      }

      const cssByPath = new Map<string, string>()
      const jsByPath: string[] = []
      for (const entry of entries) {
        if (/\.css$/i.test(entry.name)) {
          try {
            cssByPath.set(entry.name, textFrom(entry.data, MAX_HTML_BYTES))
          } catch {}
        }
        if (/\.js$/i.test(entry.name) && entry.data.length <= MAX_HTML_BYTES) {
          try {
            jsByPath.push(textFrom(entry.data, MAX_HTML_BYTES))
          } catch {}
        }
      }

      const { url: supabaseUrl } = getSupabaseConfig()
      const assetEntries = entries
        .filter((e) => !/\.html?$/i.test(e.name) && assetMime(e.name))
        .slice(0, MAX_ASSETS)

      for (const entry of assetEntries) {
        const mime = assetMime(entry.name)!
        const safeName = entry.name.replace(/[^a-zA-Z0-9._/-]/g, '-').replace(/\/{2,}/g, '/').replace(/^\/+/, '')
        if (!safeName || safeName.includes('..')) continue
        const path = `${organization.id}/${funnel.id}/${page.id}/${safeName}`
        const upload = await supabase.storage.from('funnel-assets').upload(path, Buffer.from(entry.data), {
          contentType: mime,
          upsert: true,
          cacheControl: '31536000',
        })
        if (upload.error) throw new Error(`Envoi de « ${entry.name} » impossible : ${upload.error.message}`)
        const { error: assetError } = await supabase.from('funnel_assets').insert({
          funnel_id: funnel.id,
          storage_path: path,
          file_type: mime,
          size_bytes: entry.data.length,
          original_name: entry.name,
          mime_type: mime,
          sha256: createHash('sha256').update(entry.data).digest('hex'),
        })
        if (assetError) throw new Error(`Enregistrement de « ${entry.name} » impossible : ${assetError.message}`)
        assetUrls.set(
          entry.name,
          `${supabaseUrl}/storage/v1/object/public/funnel-assets/${path.split('/').map(encodeURIComponent).join('/')}`,
        )
      }

      const assetUrl = (path: string) => {
        if (assetUrls.has(path)) return assetUrls.get(path)!
        const base = path.split('/').pop()
        if (base) {
          for (const [k, u] of assetUrls) if (k === base || k.endsWith('/' + base)) return u
        }
        return null
      }

      const raw = textFrom(htmlEntry.data, MAX_HTML_BYTES)
      sourceName = htmlEntry.name
      externalScripts = extractExternalScripts(raw)
      const styles = extractStyles(raw, htmlEntry.name, (cssPath) => {
        const body = cssByPath.get(cssPath)
        return body === undefined ? null : rewriteCssUrls(body, cssPath, assetUrl)
      })
      const extractedScript = extractInlineScripts(styles.html)
      const cleaned = sanitizeImportedHtml(extractedScript.html)
      rawHtml = rewriteHtmlRefs(extractBody(cleaned), htmlEntry.name, assetUrl, () => null)
      css = rewriteCssUrls(styles.css, htmlEntry.name, assetUrl)
      js = [extractedScript.js, ...jsByPath].filter(Boolean).join('\n\n')
    } else {
      if (!/\.html?$/i.test(sourceName) && fileMime !== 'text/html') {
        return NextResponse.json(
          { error: 'Importez un fichier .html ou un .zip contenant un HTML.' },
          { status: 400 },
        )
      }
      if (fileBuffer.length > MAX_HTML_BYTES) {
        return NextResponse.json({ error: 'Le fichier HTML dépasse 5 Mo.' }, { status: 413 })
      }
      const source = textFrom(fileBuffer, MAX_HTML_BYTES)
      externalScripts = extractExternalScripts(source)
      const extractedScript = extractInlineScripts(source)
      const raw = sanitizeImportedHtml(extractedScript.html)
      const withStyles = extractStyles(raw, sourceName, () => null)
      rawHtml = extractBody(withStyles.html)
      css = withStyles.css
      js = extractedScript.js
    }

    const runtimeScripts = buildRuntimeScripts(externalScripts, js)
    const interactiveElements = detectInteractiveElements(rawHtml)
    const name = titleFromHtml(rawHtml, page.name || 'Page')

    const { data: latest } = await supabase
      .from('funnel_versions')
      .select('version_number')
      .eq('page_id', page.id)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    const next = (latest?.version_number || 0) + 1

    const { data: version, error: versionError } = await supabase
      .from('funnel_versions')
      .insert({
        page_id: page.id,
        version_number: next,
        html: rawHtml,
        css,
        js,
        metadata: {
          imported: true,
          execution_engine: true,
          scriptsRemovedFromPreview: false,
          source: sourceName,
          assets: assetUrls.size,
          interactive_elements: interactiveElements,
          external_scripts: externalScripts,
          runtime_scripts: runtimeScripts,
        },
      })
      .select('id,version_number,html,css,js,metadata')
      .single()

    if (versionError || !version) {
      throw new Error(versionError?.message || 'Création de la version impossible')
    }

    const { error: pageUpdateError } = await supabase
      .from('funnel_pages')
      .update({ html_content: rawHtml, name, title: name })
      .eq('id', page.id)
    if (pageUpdateError) throw new Error(pageUpdateError.message)

    if (tempStoragePath) {
      try {
        const admin = createAdminClient()
        await admin.storage.from('funnel-assets').remove([tempStoragePath])
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      page: { id: page.id, name, slug: page.slug },
      version,
      assets: assetUrls.size,
      interactiveElements,
      runtimeScripts: runtimeScripts.length,
    })
  } catch (e: any) {
    if (tempStoragePath) {
      try {
        const admin = createAdminClient()
        await admin.storage.from('funnel-assets').remove([tempStoragePath])
      } catch {}
    }
    return NextResponse.json({ error: e?.message || 'Import de la page impossible.' }, { status: 400 })
  }
}
