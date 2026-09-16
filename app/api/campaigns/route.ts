import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  status: z.enum(['draft', 'active', 'paused', 'archived']).default('draft'),
  funnel_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().max(800).optional().nullable(),
  channel: z.enum(['whatsapp', 'email', 'internal']).default('whatsapp'),
  message: z.string().trim().max(2000).optional().nullable(),
  audience: z.enum(['all_contacts', 'with_phone', 'with_email', 'funnel_leads']).default('all_contacts'),
  goal: z.string().trim().max(240).optional().nullable(),
})

const CORE = 'id,name,status,funnel_id,created_at,updated_at'
const FULL = `${CORE},description,channel,message,audience,goal,settings`

type CampaignRow = Record<string, unknown> | null

export async function GET() {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const result = await supabase
    .from('campaigns')
    .select(FULL)
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })

  if (!result.error) {
    return NextResponse.json({ campaigns: result.data || [] })
  }

  const fallback = await supabase
    .from('campaigns')
    .select(CORE)
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
  if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 })
  return NextResponse.json({ campaigns: fallback.data || [] })
}

export async function POST(request: Request) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Données de campagne invalides.' }, { status: 400 })

  if (parsed.data.funnel_id) {
    const { data: f } = await supabase
      .from('funnels')
      .select('id')
      .eq('id', parsed.data.funnel_id)
      .eq('organization_id', organization.id)
      .maybeSingle()
    if (!f) return NextResponse.json({ error: 'Ce tunnel n’appartient pas à cet espace de travail.' }, { status: 400 })
  }

  const row = {
    organization_id: organization.id,
    name: parsed.data.name,
    status: parsed.data.status,
    funnel_id: parsed.data.funnel_id || null,
    description: parsed.data.description || null,
    channel: parsed.data.channel,
    message: parsed.data.message || null,
    audience: parsed.data.audience,
    goal: parsed.data.goal || null,
  }

  let data: CampaignRow = null
  let error: { message: string } | null = null

  const result = await supabase.from('campaigns').insert(row).select(FULL).single()
  data = result.data as CampaignRow
  error = result.error

  if (error) {
    const core = {
      organization_id: organization.id,
      name: parsed.data.name,
      status: parsed.data.status,
      funnel_id: parsed.data.funnel_id || null,
    }
    const fallback = await supabase.from('campaigns').insert(core).select(CORE).single()
    data = fallback.data as CampaignRow
    error = fallback.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ campaign: data }, { status: 201 })
}
