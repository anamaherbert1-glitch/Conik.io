import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'
import { createHash } from 'crypto'
import { parseZip, textFrom, assetMime } from '@/lib/zip'
import { getSupabaseConfig } from '@/lib/supabase/config'
import {
  buildPagePathIndex,
  extractBody,
  extractScripts,
  extractStyles,
  pickHtmlEntries,
  rewriteCssUrls,
  rewriteHtmlRefs,
  rewriteScriptRefs,
  sanitizeProjectHtml,
  slugifyPath,
  titleFromHtml,
  type PreparedPage,
} from '@/lib/funnel/import'

export const runtime = 'nodejs'
/** Allow long ZIP imports on Vercel without cutting off mid-upload. */
export const maxDuration = 60

const MAX_UPLOAD = 25 * 1024 * 1024
const MAX_HTML_BYTES = 5 * 1024 * 1024
const MAX_PAGES = 40
const MAX_ASSETS = 220
/** Parallel storage uploads — keeps import fast without exhausting connections. */
const UPLOAD_CONCURRENCY = 8
const schema = z.object({ name: z.string().trim().min(1).max(120) })
const RESERVED_SLUGS = new Set([
  'dashboard',
  'login',
  'signup',
  'auth',
  'onboarding',
  'funnels',
  'contacts',
  'campaigns',
  'automations',
  'whatsapp',
  'emails',
  'links',
  'analytics',
  'domains',
  'settings',
  'integrations',
  'api',
  '_next',
  'r',
  'segments',
  'tunnel',
  'pay',
  'payment',
  'revenus',
  'lives',
  'live',
  'official',
  'tutorial',
])

function slugifyName(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/, '') || 'tunnel'
  )
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function run() {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
    }
  }
  const runners = Array.from({ length: Math.min(concurrency, items.length) || 1 }, () => run())
  await Promise.all(runners)
  return results
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const form = await request.formData()
    const file = form.get('file')
    const parsed = schema.safeParse({ name: String(form.get('name') || '').trim() })
    if (!parsed.success || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Le nom du tunnel et le fichier ZIP sont obligatoires.' },
        { status: 400 },
      )
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD) {
      return NextResponse.json({ error: 'Le ZIP doit peser entre 1 octet et 25 Mo.' }, { status: 413 })
    }

    const entries = await parseZip(Buffer.from(await file.arrayBuffer()))
    const htmlEntries = pickHtmlEntries(entries, MAX_PAGES)
    const { data: tunnelUsage, error: tunnelUsageError } = await supabase.rpc('conik_check_usage', { p_organization_id: organization.id, p_usage_key: 'tunnels' })
    const tunnelLimit = Array.isArray(tunnelUsage) ? tunnelUsage[0] : tunnelUsage
    if (tunnelUsageError) throw new Error(tunnelUsageError.message)
    if (!tunnelLimit?.allowed) return NextResponse.json({ error: `Limite de tunnels atteinte (${Number(tunnelLimit?.current_value || 0)}/${Number(tunnelLimit?.limit_value || 0)}). Passez à une formule supérieure.`, code: 'TUNNEL_LIMIT_REACHED', upgradeRequired: true }, { status: 402 })
    if (!htmlEntries.length) {
      return NextResponse.json({ error: 'Aucun fichier HTML trouvé dans le ZIP.' }, { status: 400 })
    }

    let slug = slugifyName(parsed.data.name)
    if (RESERVED_SLUGS.has(slug)) slug = `${slug}-tunnel`
    const { data: taken } = await supabase.from('funnels').select('id').eq('slug', slug).maybeSingle()
    if (taken) slug = `${slug}-${Date.now().toString(36).slice(-5)}`

    const pageSlugs = new Map<string, string>()
    const usedSlugs = new Set<string>()
    htmlEntries.forEach((entry, index) => {
      let candidate = index === 0 ? 'home' : slugifyPath(entry.name)
      if (candidate === 'home' && index !== 0) candidate = `home-${index}`
      let unique = candidate
      let n = 2
      while (usedSlugs.has(unique)) unique = `${candidate}-${n++}`
      usedSlugs.add(unique)
      pageSlugs.set(entry.name, unique)
    })
    const pathIndex = buildPagePathIndex(pageSlugs)

    const htmlNames = new Set(htmlEntries.map((e) => e.name))
    const cssByPath = new Map<string, string>()
    for (const entry of entries) {
      if (/\.css$/i.test(entry.name)) {
        try {
          cssByPath.set(entry.name, textFrom(entry.data, MAX_HTML_BYTES))
        } catch {
          // skip
        }
      }
    }

    const assetEntries = entries
      .filter((e) => !htmlNames.has(e.name) && assetMime(e.name))
      .slice(0, MAX_ASSETS)
    const { url: supabaseUrl } = getSupabaseConfig()
    const assetUrls = new Map<string, string>()

    const { data: funnel, error: funnelError } = await supabase
      .from('funnels')
      .insert({
        organization_id: organization.id,
        name: parsed.data.name,
        slug,
        status: 'draft',
        source: 'imported',
      })
      .select('id,name,slug')
      .single()
    if (funnelError || !funnel) throw new Error(funnelError?.message || 'Création du tunnel impossible')

    try {
      type AssetRow = {
        original: string
        path: string
        mime: string
        size: number
        sha: string
        publicUrl: string
      }

      const uploaded = await mapPool(assetEntries, UPLOAD_CONCURRENCY, async (entry) => {
        const mime = assetMime(entry.name)!
        const safeName = entry.name
          .replace(/[^a-zA-Z0-9._/-]/g, '-')
          .replace(/\/{2,}/g, '/')
          .replace(/^\/+/, '')
        if (!safeName || safeName.includes('..')) {
          throw new Error(`Chemin d'asset non sûr : ${entry.name}`)
        }
        const path = `${organization.id}/${funnel.id}/${safeName}`
        const bytes = Buffer.from(entry.data)
        const upload = await supabase.storage.from('funnel-assets').upload(path, bytes, {
          contentType: mime,
          upsert: true,
          cacheControl: '31536000',
        })
        if (upload.error) {
          throw new Error(`Envoi de « ${entry.name} » impossible : ${upload.error.message}`)
        }
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/funnel-assets/${path
          .split('/')
          .map(encodeURIComponent)
          .join('/')}`
        return {
          original: entry.name,
          path,
          mime,
          size: entry.data.length,
          sha: createHash('sha256').update(entry.data).digest('hex'),
          publicUrl,
        } satisfies AssetRow
      })

      for (const row of uploaded) {
        assetUrls.set(row.original, row.publicUrl)
      }

      if (uploaded.length) {
        const { error: assetError } = await supabase.from('funnel_assets').insert(
          uploaded.map((row) => ({
            funnel_id: funnel.id,
            storage_path: row.path,
            file_type: row.mime,
            size_bytes: row.size,
            original_name: row.original,
            mime_type: row.mime,
            sha256: row.sha,
          })),
        )
        if (assetError) {
          throw new Error(`Enregistrement des assets impossible : ${assetError.message}`)
        }
      }

      const assetUrl = (path: string) => {
        if (assetUrls.has(path)) return assetUrls.get(path)!
        const base = path.split('/').pop()
        if (base) {
          for (const [k, u] of assetUrls) {
            if (k === base || k.endsWith(`/${base}`)) return u
          }
        }
        return null
      }
      const pageUrl = (path: string) => {
        const target = pathIndex.get(path) || pageSlugs.get(path)
        return target ? `/${funnel.slug}/${target}` : null
      }

      const prepared: PreparedPage[] = htmlEntries.map((entry, index) => {
        const raw = textFrom(entry.data, MAX_HTML_BYTES)
        const styles = extractStyles(raw, entry.name, (cssPath) => {
          const body = cssByPath.get(cssPath)
          return body === undefined ? null : rewriteCssUrls(body, cssPath, assetUrl)
        })
        const extracted = extractScripts(styles.html, entry.name, assetUrl)
        const scripts = extracted.scripts.map((script) =>
          script.code ? { ...script, code: rewriteScriptRefs(script.code, entry.name, assetUrl) } : script,
        )
        const cleaned = sanitizeProjectHtml(extracted.html)
        return {
          slug: pageSlugs.get(entry.name)!,
          name: titleFromHtml(raw, index === 0 ? 'Accueil' : entry.name),
          source: entry.name,
          isHome: index === 0,
          html: rewriteHtmlRefs(extractBody(cleaned), entry.name, assetUrl, pageUrl),
          css: rewriteCssUrls(styles.css, entry.name, assetUrl),
          scripts,
        }
      })

      const publishJobs: { pageId: string; versionId: string }[] = []

      for (const [index, page] of prepared.entries()) {
        const { data: row, error: pageError } = await supabase
          .from('funnel_pages')
          .insert({
            funnel_id: funnel.id,
            name: page.name,
            title: page.name,
            slug: page.slug,
            page_type: 'landing',
            position: index,
            is_home: page.isHome,
            html_content: page.html,
          })
          .select('id')
          .single()
        if (pageError || !row) throw new Error(pageError?.message || 'Création de la page impossible')

        const { data: version, error: versionError } = await supabase
          .from('funnel_versions')
          .insert({
            page_id: row.id,
            version_number: 1,
            html: page.html,
            css: page.css,
            js: '',
            metadata: {
              imported: true,
              source: page.source,
              project_import: true,
              runtime_scripts: page.scripts,
              scriptsRemoved: false,
              assets: assetUrls.size,
            },
          })
          .select('id')
          .single()
        if (versionError || !version) throw new Error(versionError?.message || 'Version illisible')
        publishJobs.push({ pageId: row.id, versionId: version.id })
      }

      await mapPool(publishJobs, 6, async (job) => {
        const { error: publishError } = await supabase.rpc('publish_funnel_page', {
          target_page: job.pageId,
          target_version: job.versionId,
        })
        if (publishError) throw new Error(`Publication impossible : ${publishError.message}`)
        return true
      })

      const forms = prepared.reduce((n, p) => n + (p.html.match(/<form\b/gi)?.length || 0), 0)
      const ctas = prepared.reduce(
        (n, p) => n + (p.html.match(/<(?:button|a)\b[^>]*>/gi)?.length || 0),
        0,
      )
      const scripts = prepared.reduce((n, p) => n + p.scripts.length, 0)

      return NextResponse.json({
        ok: true,
        funnel: { id: funnel.id, slug: funnel.slug, name: funnel.name },
        pages: prepared.map((p) => ({
          slug: p.slug,
          name: p.name,
          source: p.source,
          isHome: p.isHome,
        })),
        analysis: {
          assets: assetUrls.size,
          forms,
          ctas,
          scripts,
          pages: prepared.length,
        },
      })
    } catch (e) {
      await supabase.storage
        .from('funnel-assets')
        .remove(Array.from(assetUrls.keys()).map((n) => `${organization.id}/${funnel.id}/${n}`))
        .catch(() => {})
      await supabase.from('funnels').delete().eq('id', funnel.id)
      throw e
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Échec de l'import" }, { status: 400 })
  }
}
