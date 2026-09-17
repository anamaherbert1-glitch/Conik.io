import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 })

  const form = await request.formData()
  const pageId = String(form.get('pageId') || '').trim()
  const file = form.get('file')
  if (!pageId || !(file instanceof File)) return NextResponse.json({ error: 'Page ou image manquante.' }, { status: 400 })

  const extension = ALLOWED.get(file.type)
  if (!extension) return NextResponse.json({ error: 'Format accepté : JPG, PNG ou WebP.' }, { status: 415 })
  if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: 'L’image doit faire au maximum 8 Mo.' }, { status: 413 })

  const { data: page, error: pageError } = await supabase
    .from('funnel_pages')
    .select('id,funnel_id,published_version_id')
    .eq('id', pageId)
    .single()
  if (pageError || !page) return NextResponse.json({ error: 'Page introuvable ou accès refusé.' }, { status: 404 })

  const { data: funnel, error: funnelError } = await supabase
    .from('funnels')
    .select('id,organization_id')
    .eq('id', page.funnel_id)
    .single()
  if (funnelError || !funnel) return NextResponse.json({ error: 'Tunnel introuvable ou accès refusé.' }, { status: 404 })

  const { data: membership } = await supabase
    .from('organization_members')
    .select('id,role')
    .eq('organization_id', funnel.organization_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  const admin = createAdminClient()
  const path = `share-previews/${funnel.organization_id}/${funnel.id}/${page.id}/${crypto.randomUUID()}.${extension}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadError } = await admin.storage.from('funnel-assets').upload(path, bytes, {
    contentType: file.type,
    upsert: false,
    cacheControl: '31536000',
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: publicUrl } = admin.storage.from('funnel-assets').getPublicUrl(path)
  const imageUrl = publicUrl.publicUrl

  const versionIds = [page.published_version_id].filter((id): id is string => Boolean(id))
  const { data: latestVersion } = await supabase
    .from('funnel_versions')
    .select('id,version_number,metadata')
    .eq('page_id', page.id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latestVersion) versionIds.push(latestVersion.id)

  for (const versionId of [...new Set(versionIds)]) {
    const { data: current } = await supabase
      .from('funnel_versions')
      .select('metadata')
      .eq('id', versionId)
      .maybeSingle()
    const metadata = current?.metadata && typeof current.metadata === 'object'
      ? current.metadata as Record<string, unknown>
      : {}
    await supabase
      .from('funnel_versions')
      .update({ metadata: { ...metadata, share_image_url: imageUrl } })
      .eq('id', versionId)
  }

  return NextResponse.json({ imageUrl, path })
}
