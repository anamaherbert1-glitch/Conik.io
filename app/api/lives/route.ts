import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'live'
}

export async function GET() {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])

  const { data, error } = await supabase
    .from('live_events')
    .select('id,title,description,slug,scheduled_at,ended_at,timezone,status,access_type,stream_provider,stream_id,created_by,created_at,updated_at')
    .eq('organization_id', membership.organizationId)
    .order('scheduled_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ lives: data || [] })
}

export async function POST(request: Request) {
  const { supabase, user, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Live invalide.' }, { status: 400 })
  }

  const title = text(body.title, 200)
  const scheduledAt = text(body.scheduled_at, 80)
  const timezone = text(body.timezone, 80) || 'UTC'

  if (!title || !scheduledAt) {
    return NextResponse.json({ error: 'Le titre et la date du Live sont obligatoires.' }, { status: 400 })
  }

  const parsedDate = new Date(scheduledAt)
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'Date du Live invalide.' }, { status: 400 })
  }

  let baseSlug = slugify(text(body.slug, 120) || title)
  let slug = baseSlug

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data: existing } = await supabase
      .from('live_events')
      .select('id')
      .eq('organization_id', membership.organizationId)
      .eq('slug', slug)
      .maybeSingle()

    if (!existing) break
    slug = `${baseSlug}-${attempt + 2}`
  }

  const { data: live, error } = await supabase
    .from('live_events')
    .insert({
      organization_id: membership.organizationId,
      created_by: user.id,
      title,
      description: text(body.description, 5000),
      slug,
      cover_image: text(body.cover_image, 1000),
      scheduled_at: parsedDate.toISOString(),
      ended_at: null,
      timezone,
      status: body.status === 'scheduled' ? 'scheduled' : 'draft',
      access_type: 'crm_allowlist',
      stream_provider: text(body.stream_provider, 80),
      stream_id: text(body.stream_id, 500),
    })
    .select('id,title,description,slug,scheduled_at,ended_at,timezone,status,access_type,stream_provider,stream_id,created_by,created_at,updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ live }, { status: 201 })
}
