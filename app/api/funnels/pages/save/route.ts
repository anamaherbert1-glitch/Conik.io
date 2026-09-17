import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'
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

function publicUrl(supabaseUrl: string, path: string) {
  return `${supabaseUrl}/storage/v1/object/public/funnel-assets/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`
}

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

    const { url: supabaseUrl } = getSupabaseConfig()
    const contentMeta: Record<string, string> = {}

    function acceptPath(path: string | undefined, kind: 'html' | 'css' | 'js') {
      if (!path) return
      if (!path.startsWith(`${organization.id}/`) || path.includes('..')) {
        throw new Error(`Chemin ${kind} invalide.`)
      }
      contentMeta[`${kind}_path`] = path
      contentMeta[`${kind}_url`] = publicUrl(supabaseUrl, path)
    }

    // Prefer storage paths (large pages) — NEVER re-download multi-MB files here
    acceptPath(parsed.data.htmlPath, 'html')
    acceptPath(parsed.data.cssPath, 'css')
    acceptPath(parsed.data.jsPath, 'js')

    const hasStorage = Boolean(contentMeta.html_path || contentMeta.css_path || contentMeta.js_path)

    // DB keeps light placeholders when content lives in Storage
    let storeHtml = hasStorage && contentMeta.html_path ? '<!-- content in storage -->' : parsed.data.html ?? ''
    let storeCss = hasStorage && contentMeta.css_path ? '/* content in storage */' : parsed.data.css ?? ''
    let storeJs = hasStorage && contentMeta.js_path ? '/* content in storage */' : parsed.data.js ?? ''

    // Soft size guard only when inline body is used (no storage paths)
    if (!hasStorage) {
      const total = storeHtml.length + storeCss.length + storeJs.length
      if (total > 1_500_000) {
        return NextResponse.json(
          {
            error:
              'Contenu trop volumineux pour un enregistrement direct. Réessayez : le système enverra le fichier vers le stockage automatiquement.',
          },
          { status: 413 },
        )
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
          large_content: hasStorage,
        },
      })
      .select('id,version_number,html,css,js,metadata')
      .single()

    if (versionError || !version) {
      throw new Error(versionError?.message || 'Enregistrement impossible.')
    }

    // Echo back whatever the client already has in memory for the editor UI
    return NextResponse.json({
      ok: true,
      version: {
        ...version,
        html: parsed.data.html ?? storeHtml,
        css: parsed.data.css ?? storeCss,
        js: parsed.data.js ?? storeJs,
        metadata: version.metadata,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Enregistrement impossible.' }, { status: 400 })
  }
}
