import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSupabaseConfig } from '@/lib/supabase/config'

export const runtime = 'nodejs'
export const maxDuration = 60

const schema = z.object({
  pageId: z.string().uuid(),
  html: z.string().optional(),
  css: z.string().optional(),
  js: z.string().optional(),
  htmlPath: z.string().optional(),
  cssPath: z.string().optional(),
  jsPath: z.string().optional(),
  redirects: z.array(z.object({ key: z.string(), target: z.string() })).optional(),
  shareImageUrl: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
    }
    const { pageId, redirects = [], shareImageUrl } = parsed.data

    const { data: page, error: pageError } = await supabase
      .from('funnel_pages')
      .select('id,funnel_id,name,slug')
      .eq('id', pageId)
      .single()
    if (pageError || !page) {
      return NextResponse.json({ error: 'Page introuvable.' }, { status: 404 })
    }

    const { data: funnel, error: funnelError } = await supabase
      .from('funnels')
      .select('id,organization_id')
      .eq('id', page.funnel_id)
      .single()
    if (funnelError || !funnel || funnel.organization_id !== organization.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    let html = parsed.data.html ?? ''
    let css = parsed.data.css ?? ''
    let js = parsed.data.js ?? ''
    const contentMeta: Record<string, string> = {}

    const admin = createAdminClient()
    const { url: supabaseUrl } = getSupabaseConfig()

    async function loadPath(path: string | undefined, kind: string) {
      if (!path) return null
      if (!path.startsWith(`${organization.id}/`) || path.includes('..')) {
        throw new Error(`Chemin ${kind} invalide.`)
      }
      const { data, error } = await admin.storage.from('funnel-assets').download(path)
      if (error || !data) throw new Error(error?.message || `Fichier ${kind} introuvable.`)
      const text = await data.text()
      contentMeta[`${kind}_url`] =
        `${supabaseUrl}/storage/v1/object/public/funnel-assets/${path.split('/').map(encodeURIComponent).join('/')}`
      contentMeta[`${kind}_path`] = path
      return text
    }

    if (parsed.data.htmlPath) html = (await loadPath(parsed.data.htmlPath, 'html')) || ''
    if (parsed.data.cssPath) css = (await loadPath(parsed.data.cssPath, 'css')) || ''
    if (parsed.data.jsPath) js = (await loadPath(parsed.data.jsPath, 'js')) || ''

    const LARGE = 400_000
    let storeHtml = html
    let storeCss = css
    let storeJs = js
    if (html.length > LARGE || css.length > LARGE || js.length > LARGE) {
      const base = `${organization.id}/${funnel.id}/${page.id}/content`
      const uploads: { key: string; body: string; mime: string }[] = []
      if (html.length > LARGE) {
        uploads.push({ key: 'html', body: html, mime: 'text/html; charset=utf-8' })
        storeHtml = '<!-- content in storage -->'
      }
      if (css.length > LARGE) {
        uploads.push({ key: 'css', body: css, mime: 'text/css; charset=utf-8' })
        storeCss = '/* content in storage */'
      }
      if (js.length > LARGE) {
        uploads.push({ key: 'js', body: js, mime: 'text/javascript; charset=utf-8' })
        storeJs = '/* content in storage */'
      }
      for (const u of uploads) {
        const path = `${base}/${u.key}-${Date.now()}.${u.key === 'html' ? 'html' : u.key}`
        const up = await admin.storage.from('funnel-assets').upload(path, Buffer.from(u.body, 'utf8'), {
          contentType: u.mime,
          upsert: true,
          cacheControl: '60',
        })
        if (up.error) throw new Error(up.error.message)
        contentMeta[`${u.key}_url`] =
          `${supabaseUrl}/storage/v1/object/public/funnel-assets/${path.split('/').map(encodeURIComponent).join('/')}`
        contentMeta[`${u.key}_path`] = path
      }
    }

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
        html: storeHtml,
        css: storeCss,
        js: storeJs,
        metadata: {
          editor: 'conik',
          redirects,
          ...(shareImageUrl ? { share_image_url: shareImageUrl } : {}),
          ...contentMeta,
          large_content: Object.keys(contentMeta).length > 0,
        },
      })
      .select('id,version_number,html,css,js,metadata')
      .single()

    if (versionError || !version) {
      throw new Error(versionError?.message || 'Enregistrement impossible.')
    }

    return NextResponse.json({
      ok: true,
      version: { ...version, html, css, js, metadata: version.metadata },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Enregistrement impossible.' }, { status: 400 })
  }
}
