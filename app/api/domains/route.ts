import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

const hostname = (value: unknown) => {
  if (typeof value !== 'string') return null
  const valueTrimmed = value.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/$/,'')
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(valueTrimmed)) return null
  return valueTrimmed
}

export async function GET() {
  const { supabase, membership } = await requireWorkspaceRole(['owner','admin','editor','viewer'])
  const { data, error } = await supabase.from('domains').select('id,hostname,status,funnel_id,created_at').eq('organization_id', membership.organizationId).order('created_at',{ascending:false})
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ domains: data || [] })
}

export async function POST(request: Request) {
  const { supabase, membership } = await requireWorkspaceRole(['owner','admin','editor'])
  const body = await request.json().catch(() => null)
  const host = hostname(body?.hostname)
  if (!host) return NextResponse.json({ error: 'Nom de domaine invalide.' }, { status: 400 })
  const funnelId = typeof body?.funnelId === 'string' && /^[0-9a-f-]{36}$/i.test(body.funnelId) ? body.funnelId : null
  if (funnelId) {
    const { data: funnel } = await supabase.from('funnels').select('id').eq('id', funnelId).eq('organization_id', membership.organizationId).maybeSingle()
    if (!funnel) return NextResponse.json({ error: 'Tunnel introuvable.' }, { status: 404 })
  }
  const { data: existing } = await supabase.from('domains').select('id').eq('hostname',host).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Ce domaine est déjà enregistré.' }, { status: 409 })
  const { data, error } = await supabase.from('domains').insert({ organization_id: membership.organizationId, funnel_id: funnelId, hostname: host, status: 'pending_dns' }).select('id,hostname,status,funnel_id,created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, domain: data }, { status: 201 })
}

export async function DELETE(request: Request) {
  const { supabase, membership } = await requireWorkspaceRole(['owner','admin'])
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 })
  const { error } = await supabase.from('domains').delete().eq('id',id).eq('organization_id',membership.organizationId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
