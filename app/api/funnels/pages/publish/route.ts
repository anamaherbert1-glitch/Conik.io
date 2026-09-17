import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 30

const schema = z.object({
  pageId: z.string().uuid(),
  versionId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'pageId et versionId requis.' }, { status: 400 })
    }

    const { data: page, error: pageError } = await supabase
      .from('funnel_pages')
      .select('id,funnel_id')
      .eq('id', parsed.data.pageId)
      .single()
    if (pageError || !page) {
      return NextResponse.json({ error: 'Page introuvable.' }, { status: 404 })
    }

    const { data: funnel } = await supabase
      .from('funnels')
      .select('id,organization_id')
      .eq('id', page.funnel_id)
      .single()
    if (!funnel || funnel.organization_id !== organization.id) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    const { error } = await supabase.rpc('publish_funnel_page', {
      target_page: parsed.data.pageId,
      target_version: parsed.data.versionId,
    })
    if (error) {
      return NextResponse.json({ error: error.message || 'Publication impossible.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, published_version_id: parsed.data.versionId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Publication impossible.' }, { status: 400 })
  }
}
