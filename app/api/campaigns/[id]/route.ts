import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  status: z.enum(['draft', 'active', 'paused', 'archived']),
  funnel_id: z.string().uuid().nullable(),
  description: z.string().trim().max(800).optional().nullable(),
  channel: z.enum(['whatsapp', 'email', 'internal']).optional(),
  message: z.string().trim().max(2000).optional().nullable(),
  audience: z.enum(['all_contacts', 'with_phone', 'with_email', 'funnel_leads']).optional(),
  goal: z.string().trim().max(240).optional().nullable(),
})

const CORE = 'id,name,status,funnel_id,created_at,updated_at'
const FULL = `${CORE},description,channel,message,audience,goal,settings`

type CampaignResponse = Record<string, unknown> | null

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const { id } = await params
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Données de campagne invalides.' }, { status: 400 })

  if (parsed.data.funnel_id) {
    const { data: f } = await supabase.from('funnels').select('id').eq('id', parsed.data.funnel_id).eq('organization_id', organization.id).maybeSingle()
    if (!f) return NextResponse.json({ error: 'Tunnel invalide.' }, { status: 400 })
  }

  const payload = {
    name: parsed.data.name,
    status: parsed.data.status,
    funnel_id: parsed.data.funnel_id,
    description: parsed.data.description ?? null,
    channel: parsed.data.channel || 'whatsapp',
    message: parsed.data.message ?? null,
    audience: parsed.data.audience || 'all_contacts',
    goal: parsed.data.goal ?? null,
    updated_at: new Date().toISOString(),
  }

  let data: CampaignResponse = null
  let error: { message: string } | null = null

  const result = await supabase
    .from('campaigns')
    .update(payload)
    .eq('id', id)
    .eq('organization_id', organization.id)
    .select(FULL)
    .single()

  data = result.data as CampaignResponse
  error = result.error

  if (error) {
    const fallback = await supabase
      .from('campaigns')
      .update({ name: payload.name, status: payload.status, funnel_id: payload.funnel_id, updated_at: payload.updated_at })
      .eq('id', id)
      .eq('organization_id', organization.id)
      .select(CORE)
      .single()
    data = fallback.data as CampaignResponse
    error = fallback.error
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ campaign: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin'])
  const { id } = await params
  const { error } = await supabase.from('campaigns').delete().eq('id', id).eq('organization_id', organization.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
