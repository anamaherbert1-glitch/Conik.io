import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'
import { createHash } from 'crypto'
import { parseZip, textFrom, assetMime, sanitizeImportedHtml } from '@/lib/zip'
import { getSupabaseConfig } from '@/lib/supabase/config'
import {
  extractBody,
  extractStyles,
  pickHtmlEntries,
  rewriteCssUrls,
  rewriteHtmlRefs,
  slugifyPath,
  titleFromHtml,
  type PreparedPage,
} from '@/lib/funnel/import'

export const runtime = 'nodejs'

const MAX_UPLOAD = 25 * 1024 * 1024
const MAX_HTML_BYTES = 5 * 1024 * 1024
const MAX_PAGES = 30
const MAX_ASSETS = 180

const schema = z.object({ name: z.string().trim().min(1).max(120) })

/** Segments de premier niveau réservés par l'application (cf. middleware.ts). */
const RESERVED_SLUGS = new Set([
  'dashboard', 'login', 'signup', 'auth', 'onboarding', 'funnels', 'contacts',
  'campaigns', 'automations', 'whatsapp', 'emails', 'links', 'analytics',
  'domains', 'settings', 'integrations', 'api', '_next', 'r', 'segments', 'tunnel',
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

export async function POST(request: NextRequest) {
  try {
    const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])

    const form = await request.formData()
    const file = form.get('file')
    const parsed = schema.safeParse({ name: String(form.get('name') || '').trim() })
    if (!parsed.success || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Le nom du tunnel et le fichier ZIP sont obligatoires.' },
        { status: 400 }
      )
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD) {
      return NextResponse.json({ error: 'Le ZIP doit peser entre 1 octet et 25 Mo.' }, { status: 413 })
    }

    const entries = await parseZip(Buffer.from(await file.arrayBuffer()))
    const htmlEntries = pickHtmlEntries(entries, MAX_PAGES)
    if (!htmlEntries.length) {
      return NextResponse.json({ error: 'Aucun fichier HTML trouvé dans le ZIP.' }, { status: 400 })
    }

    // --- Unique funnel slug (slugs are globally unique) -------------------
    let slug = slugifyName(parsed.data.name)
    // Un tunnel ne doit jamais masquer une route de l'application.
    if (RESERVED_SLUGS.has(slug)) slug = `${slug}-tunnel`
    const { data: taken } = await supabase.from('funnels').select('id').eq('slug', slug).maybeSingle()
    if (taken) slug = `${slug}-${Date.now().toString(36).slice(-5)}`

    // --- Map every HTML file to a unique page slug ------------------------
    const pageSlugs = new Map<string, string>()
    const usedSlugs = new Set<string>()
    htmlEntries.forEach((entry, index) => {
      let candidate = index === 0 ? 'home' : slugifyPath(entry.name)
      if (candidate === 'home' && index !== 0) candidate = `${candidate}-${index}`
      let unique = candidate
      let n = 2
      while (usedSlugs.has(unique)) unique = `${candidate}-${n++}`
      usedSlugs.add(unique)
      pageSlugs.set(entry.name, unique)
    })

    // --- Assets: everything that is not an imported HTML page -------------
    const htmlNames = new Set(htmlEntries.map((e) => e.name))
    const cssByPath = new Map<string, string>()
    for (const entry of entries) {
      if (/\.css$/i.test(entry.name)) {
        try {
          cssByPath.set(entry.name, textFrom(entry.data, MAX_HTML_BYTES))
        } catch {
          /* stylesheet too large — leave it as a linked asset */
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
      // --- Upload assets and remember their public URL -------------------
      for (const entry of assetEntries) {
        const mime = assetMime(entry.name)!
        const safeName = entry.name
          .replace(/[^a-zA-Z0-9._/-]/g, '-')
          .replace(/\/{2,}/g, '/')
          .replace(/^\/+/, '')
        if (!safeName || safeName.includes('..')) throw new Error(`Chemin d'asset non sûr : ${entry.name}`)

        const path = `${organization.id}/${funnel.id}/${safeName}`
        const upload = await supabase.storage
          .from('funnel-assets')
          .upload(path, Buffer.from(entry.data), { contentType: mime, upsert: true })
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

        const publicUrl = `${supabaseUrl}/storage/v1/object/public/funnel-assets/${path
          .split('/')
          .map(encodeURIComponent)
          .join('/')}`
        assetUrls.set(entry.name, publicUrl)
      }

      const assetUrl = (path: string) => assetUrls.get(path) || null
      const pageUrl = (path: string) => {
        const target = pageSlugs.get(path)
        return target ? `/${funnel.slug}/${target}` : null
      }

      // --- Build every page: inline CSS, rewrite refs, keep body only ----
      const prepared: PreparedPage[] = htmlEntries.map((entry, index) => {
        const raw = sanitizeImportedHtml(textFrom(entry.data, MAX_HTML_BYTES))
        const pageSlug = pageSlugs.get(entry.name)!

        const withStyles = extractStyles(raw, entry.name, (cssPath) => {
          const body = cssByPath.get(cssPath)
          if (body === undefined) return null
          return rewriteCssUrls(body, cssPath, assetUrl)
        })

        const html = rewriteHtmlRefs(extractBody(withStyles.html), entry.name, assetUrl, pageUrl)
        const css = rewriteCssUrls(withStyles.css, entry.name, assetUrl)

        return {
          slug: pageSlug,
          name: titleFromHtml(raw, index === 0 ? 'Accueil' : entry.name),
          source: entry.name,
          isHome: index === 0,
          html,
          css,
        }
      })

      // --- Persist pages + versions, then publish ------------------------
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
            metadata: { imported: true, scriptsRemoved: true, source: page.source },
          })
          .select('id')
          .single()
        if (versionError || !version) throw new Error(versionError?.message || 'Version illisible')

        const { error: publishError } = await supabase.rpc('publish_funnel_page', {
          target_page: row.id,
          target_version: version.id,
        })
        if (publishError) throw new Error(`Publication impossible : ${publishError.message}`)
      }

      const forms = prepared.reduce((n, p) => n + (p.html.match(/<form\b/gi)?.length || 0), 0)
      const ctas = prepared.reduce(
        (n, p) => n + (p.html.match(/<(?:button|a)\b[^>]*>/gi)?.length || 0),
        0
      )

      return NextResponse.json({
        ok: true,
        funnel: { id: funnel.id, slug: funnel.slug, name: funnel.name },
        pages: prepared.map((p) => ({ slug: p.slug, name: p.name, source: p.source })),
        analysis: { assets: assetUrls.size, forms, ctas, pages: prepared.length },
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
