import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'
import { createHash } from 'crypto'
import { parseZip, textFrom, assetMime, sanitizeImportedHtml } from '@/lib/zip'
import { getSupabaseConfig } from '@/lib/supabase/config'
import { extractBody, extractScripts, extractStyles, rewriteCssUrls, rewriteHtmlRefs, titleFromHtml } from '@/lib/funnel/import'
import { detectInteractiveElements } from '@/lib/funnel/interactive-elements'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOrganizationUsage } from '@/lib/billing/usage'
import { getPlan } from '@/lib/billing/plans'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_UPLOAD = 25 * 1024 * 1024
const MAX_HTML_BYTES = 20 * 1024 * 1024
const MAX_ASSETS = 180
const schema = z.object({ pageId: z.string().uuid() })

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
    const usage = await checkOrganizationUsage(organization.id, 'importsHtml')
    if (!usage.allowed) return NextResponse.json({ error: `Limite d’imports HTML mensuelle atteinte (${usage.current}/${usage.limit}). Passez à une formule supérieure.`, code: 'HTML_IMPORT_LIMIT_REACHED', upgradeRequired: true, current: usage.current, limit: usage.limit, plan: usage.plan }, { status: 402 })
    const plan = getPlan(usage.plan)
    const maxUpload = plan.limits.importMaxMb * 1024 * 1024
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
      if (file.size <= 0 || file.size > maxUpload) {
        return NextResponse.json({ error: 'Le fichier dépasse la taille maximale autorisée par votre formule.' }, { status: 413 })
      }
      fileBuffer = Buffer.from(await file.arrayBuffer())
      sourceName = file.name
      fileMime = file.type || ''
    } else {
      return NextResponse.json({ error: 'La page et le fichier HTML/ZIP sont obligatoires.' }, { status: 400 })
    }

    if (fileBuffer.length <= 0 || fileBuffer.length > maxUpload) {
      return NextResponse.json({ error: 'Le fichier dépasse la taille maximale autorisée par votre formule.' }, { status: 413 })
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

    if (isZipCandidate(sourceName, fileMime)) {
      const access = await supabase.rpc('conik_check_feature_access', { p_organization_id: organization.id, p_feature_key: 'importZip' })
      const row = Array.isArray(access.data) ? access.data[0] : access.data
      if (access.error || row?.allowed !== true) return NextResponse.json({ error: 'L’import ZIP n’est pas disponible dans votre formule. Passez au niveau supérieur.', code: 'ZIP_IMPORT_LOCKED', upgradeRequired: true }, { status: 402 })
    }

    const isZip = isZipCandidate(sourceName, fileMime)

    function isZipCandidate(name: string, mime: string) {
      return /\.zip$/i.test(name) || mime === 'application/zip' || mime === 'application/x-zip-compressed'
    }

    let rawHtml = ''
    let css = ''
    let js = ''
    let externalScripts: string[] = []
    let runtimeScripts: Array<{ src?: string; code?: string; type?: string }> = []
    const assetUrls = new Map<string, string>()

    if (isZip) {
      const entries = await parseZip(fileBuffer)
      const htmlEntry = entries.find((e) => /\.html?$/i.test(e.name))
      if (!htmlEntry) {
        return NextResponse.json({ error: 'Aucun fichier HTML trouvé dans le ZIP.' }, { status: 400 })
      }
      if (htmlEntry.data.length > MAX_HTML_BYTES) {
        return NextResponse.json({ error: 'Le fichier HTML dépasse 20 Mo.' }, { status: 413 })
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
          jsByPath.push(entry.name)
        }
      }

      const { url: supabaseUrl } = getSupabaseConfig()
      const assetEntries = entries
        .filter((e) => !/\.html?$/i.test(e.name) && assetMime(e.name))
        .slice(0, MAX_ASSETS)

      for (const entry of assetEntries) {
        const mime = assetMime(entry.name)!
        const safeName = entry.name.replace(/[^a-zA-Z0-9._/-]+/g, '-').replace(/\/{2,}/g, '/').replace(/^\/+/, '')
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
      const styles = extractStyles(raw, htmlEntry.name, (cssPath) => {
        const body = cssByPath.get(cssPath)
        return body === undefined ? null : rewriteCssUrls(body, cssPath, assetUrl)
      })
      const extractedScripts = extractScripts(styles.html, htmlEntry.name, assetUrl)
      const cleaned = sanitizeImportedHtml(extractedScripts.html)
      rawHtml = rewriteHtmlRefs(extractBody(cleaned), htmlEntry.name, assetUrl, () => null)
      css = rewriteCssUrls(styles.css, htmlEntry.name, assetUrl)
      runtimeScripts = extractedScripts.scripts
      if (!runtimeScripts.length) {
        runtimeScripts = jsByPath
          .map((path) => assetUrl(path))
          .filter((src): src is string => Boolean(src))
          .map((src) => ({ src }))
      }
      externalScripts = runtimeScripts
        .filter((script) => typeof script.src === 'string')
        .map((script) => script.src as string)
      js = extractedScripts.scripts
        .filter((script) => typeof script.code === 'string')
        .map((script) => script.code as string)
        .join('\n\n')
    } else {
      if (!/\.html?$/i.test(sourceName) && fileMime !== 'text/html') {
        return NextResponse.json(
          { error: 'Importez un fichier .html ou un .zip contenant un HTML.' },
          { status: 400 },
        )
      }
      if (fileBuffer.length > MAX_HTML_BYTES) {
        return NextResponse.json({ error: 'Le fichier HTML dépasse 20 Mo.' }, { status: 413 })
      }
      const source = textFrom(fileBuffer, MAX_HTML_BYTES)
      const extractedScripts = extractScripts(source, sourceName, () => null)
      const raw = sanitizeImportedHtml(extractedScripts.html)
      const withStyles = extractStyles(raw, sourceName, () => null)
      rawHtml = extractBody(withStyles.html)
      css = withStyles.css
      runtimeScripts = extractedScripts.scripts
      externalScripts = runtimeScripts
        .filter((script) => typeof script.src === 'string')
        .map((script) => script.src as string)
      js = extractedScripts.scripts
        .filter((script) => typeof script.code === 'string')
        .map((script) => script.code as string)
        .join('\n\n')
    }
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
