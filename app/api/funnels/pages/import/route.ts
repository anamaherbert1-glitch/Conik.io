import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'
import { createHash } from 'crypto'
import { parseZip, textFrom, assetMime, sanitizeImportedHtml } from '@/lib/zip'
import { getSupabaseConfig } from '@/lib/supabase/config'
import { extractBody, extractStyles, rewriteCssUrls, rewriteHtmlRefs, titleFromHtml } from '@/lib/funnel/import'

export const runtime = 'nodejs'

const MAX_UPLOAD = 25 * 1024 * 1024
const MAX_HTML_BYTES = 5 * 1024 * 1024
const MAX_ASSETS = 180
const schema = z.object({ pageId: z.string().uuid() })

function extractInlineScripts(html: string) {
  const scripts: string[] = []
  const clean = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_whole, body: string) => {
    if (body.trim()) scripts.push(body.trim())
    return ''
  })
  return { html: clean, js: scripts.join('\n\n') }
}

async function getAuthorizedPage(request: NextRequest) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const form = await request.formData()
  const parsed = schema.safeParse({ pageId: String(form.get('pageId') || '') })
  if (!parsed.success) throw new Error('La page est obligatoire.')
  const { data: page, error: pageError } = await supabase.from('funnel_pages').select('id,funnel_id,name,slug').eq('id', parsed.data.pageId).single()
  if (pageError || !page) throw new Error('Page introuvable.')
  const { data: funnel, error: funnelError } = await supabase.from('funnels').select('id,organization_id,slug').eq('id', page.funnel_id).single()
  if (funnelError || !funnel || funnel.organization_id !== organization.id) throw new Error('Tunnel introuvable ou accès refusé.')
  return { supabase, organization, page, funnel }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, organization, page, funnel } = await getAuthorizedPage(request)
    const prefix = `${organization.id}/${funnel.id}/${page.id}/`
    const { data: assets, error: assetQueryError } = await supabase.from('funnel_assets').select('storage_path').eq('funnel_id', funnel.id)
    if (assetQueryError) throw new Error(assetQueryError.message)
    const paths = (assets || []).map(a => a.storage_path).filter((path: string) => path.startsWith(prefix))
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from('funnel-assets').remove(paths)
      if (storageError) throw new Error(storageError.message)
      const { error: deleteError } = await supabase.from('funnel_assets').delete().eq('funnel_id', funnel.id).in('storage_path', paths)
      if (deleteError) throw new Error(deleteError.message)
    }
    return NextResponse.json({ ok: true, removed: paths.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Suppression impossible.' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const form = await request.formData()
    const file = form.get('file')
    const parsed = schema.safeParse({ pageId: String(form.get('pageId') || '') })
    if (!parsed.success || !(file instanceof File)) return NextResponse.json({ error: 'La page et le fichier HTML/ZIP sont obligatoires.' }, { status: 400 })
    if (file.size <= 0 || file.size > MAX_UPLOAD) return NextResponse.json({ error: 'Le fichier doit peser entre 1 octet et 25 Mo.' }, { status: 413 })

    const { data: page, error: pageError } = await supabase.from('funnel_pages').select('id,funnel_id,name,slug').eq('id', parsed.data.pageId).single()
    if (pageError || !page) return NextResponse.json({ error: 'Page introuvable.' }, { status: 404 })
    const { data: funnel, error: funnelError } = await supabase.from('funnels').select('id,organization_id,slug').eq('id', page.funnel_id).single()
    if (funnelError || !funnel || funnel.organization_id !== organization.id) return NextResponse.json({ error: 'Tunnel introuvable ou accès refusé.' }, { status: 403 })

    const isZip = /\.zip$/i.test(file.name) || file.type === 'application/zip' || file.type === 'application/x-zip-compressed'
    let rawHtml = ''
    let css = ''
    let js = ''
    let sourceName = file.name
    const assetUrls = new Map<string, string>()

    if (isZip) {
      const entries = await parseZip(Buffer.from(await file.arrayBuffer()))
      const htmlEntry = entries.find(e => /\.html?$/i.test(e.name))
      if (!htmlEntry) return NextResponse.json({ error: 'Aucun fichier HTML trouvé dans le ZIP.' }, { status: 400 })
      if (htmlEntry.data.length > MAX_HTML_BYTES) return NextResponse.json({ error: 'Le fichier HTML dépasse 5 Mo.' }, { status: 413 })
      const cssByPath = new Map<string, string>()
      const jsByPath: string[] = []
      for (const entry of entries) {
        if (/\.css$/i.test(entry.name)) {
          try { cssByPath.set(entry.name, textFrom(entry.data, MAX_HTML_BYTES)) } catch {}
        }
        if (/\.js$/i.test(entry.name)) {
          try { jsByPath.push(`/* ${entry.name} */\n${textFrom(entry.data, MAX_HTML_BYTES)}`) } catch {}
        }
      }
      const assets = entries.filter(e => e.name !== htmlEntry.name && assetMime(e.name)).slice(0, MAX_ASSETS)
      const { url: supabaseUrl } = getSupabaseConfig()
      for (const entry of assets) {
        const mime = assetMime(entry.name)!
        const safeName = entry.name.replace(/[^a-zA-Z0-9._/-]/g, '-').replace(/\/{2,}/g, '/').replace(/^\/+/, '')
        if (!safeName || safeName.includes('..')) throw new Error(`Chemin d'asset non sûr : ${entry.name}`)
        const path = `${organization.id}/${funnel.id}/${page.id}/${safeName}`
        const upload = await supabase.storage.from('funnel-assets').upload(path, Buffer.from(entry.data), { contentType: mime, upsert: true })
        if (upload.error) throw new Error(`Envoi de « ${entry.name} » impossible : ${upload.error.message}`)
        const { error: assetError } = await supabase.from('funnel_assets').insert({ funnel_id: funnel.id, storage_path: path, file_type: mime, size_bytes: entry.data.length, original_name: entry.name, mime_type: mime, sha256: createHash('sha256').update(entry.data).digest('hex') })
        if (assetError) throw new Error(`Enregistrement de « ${entry.name} » impossible : ${assetError.message}`)
        assetUrls.set(entry.name, `${supabaseUrl}/storage/v1/object/public/funnel-assets/${path.split('/').map(encodeURIComponent).join('/')}`)
      }
      const source = textFrom(htmlEntry.data, MAX_HTML_BYTES)
      const extractedScript = extractInlineScripts(source)
      const raw = sanitizeImportedHtml(extractedScript.html)
      const withStyles = extractStyles(raw, htmlEntry.name, cssPath => { const body = cssByPath.get(cssPath); return body === undefined ? null : rewriteCssUrls(body, cssPath, p => assetUrls.get(p) || null) })
      rawHtml = rewriteHtmlRefs(extractBody(withStyles.html), htmlEntry.name, p => assetUrls.get(p) || null, p => `/${funnel.slug}/${page.slug}`)
      css = rewriteCssUrls(withStyles.css, htmlEntry.name, p => assetUrls.get(p) || null)
      js = [extractedScript.js, ...jsByPath].filter(Boolean).join('\n\n')
      sourceName = htmlEntry.name
    } else {
      if (!/\.html?$/i.test(file.name) && file.type !== 'text/html') return NextResponse.json({ error: 'Envoyez un fichier .html ou un fichier .zip contenant un HTML.' }, { status: 400 })
      if (file.size > MAX_HTML_BYTES) return NextResponse.json({ error: 'Le fichier HTML dépasse 5 Mo.' }, { status: 413 })
      const source = textFrom(Buffer.from(await file.arrayBuffer()), MAX_HTML_BYTES)
      const extractedScript = extractInlineScripts(source)
      const raw = sanitizeImportedHtml(extractedScript.html)
      const withStyles = extractStyles(raw, file.name, () => null)
      rawHtml = extractBody(withStyles.html)
      css = withStyles.css
      js = extractedScript.js
    }

    const name = titleFromHtml(rawHtml, page.name || 'Page')
    const { data: latest } = await supabase.from('funnel_versions').select('version_number').eq('page_id', page.id).order('version_number', { ascending: false }).limit(1).maybeSingle()
    const next = (latest?.version_number || 0) + 1
    const { data: version, error: versionError } = await supabase.from('funnel_versions').insert({ page_id: page.id, version_number: next, html: rawHtml, css, js, metadata: { imported: true, scriptsRemovedFromPreview: true, source: sourceName, assets: assetUrls.size } }).select('id,version_number,html,css,js,metadata').single()
    if (versionError || !version) throw new Error(versionError?.message || 'Création de la version impossible')
    const { error: pageUpdateError } = await supabase.from('funnel_pages').update({ html_content: rawHtml, name, title: name }).eq('id', page.id)
    if (pageUpdateError) throw new Error(pageUpdateError.message)
    return NextResponse.json({ ok: true, page: { id: page.id, name, slug: page.slug }, version, assets: assetUrls.size })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Import de la page impossible.' }, { status: 400 })
  }
}
