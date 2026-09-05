import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const { supabase, membership } = await requireWorkspaceRole(['owner','admin','editor'])
  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : null
  if (!id) return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 })
  const { data: domain } = await supabase.from('domains').select('id,hostname,status').eq('id',id).eq('organization_id',membership.organizationId).maybeSingle()
  if (!domain) return NextResponse.json({ error: 'Domaine introuvable.' }, { status: 404 })

  try {
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain.hostname)}&type=CNAME`, { headers: { accept: 'application/dns-json' }, cache: 'no-store' })
    const cname = await response.json().catch(() => ({}))
    const answers = Array.isArray(cname?.Answer) ? cname.Answer.map((a: any) => String(a.data || '').toLowerCase().replace(/\.$/,'')) : []
    const aResponse = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain.hostname)}&type=A`, { headers: { accept: 'application/dns-json' }, cache: 'no-store' })
    const aJson = await aResponse.json().catch(() => ({}))
    const addresses = Array.isArray(aJson?.Answer) ? aJson.Answer.map((a: any) => String(a.data || '')) : []
    const pointsToVercel = answers.some((v:string) => v === 'cname.vercel-dns.com' || v.endsWith('.vercel-dns.com')) || addresses.includes('76.76.21.21')
    if (!pointsToVercel) {
      await supabase.from('domains').update({ status: 'failed' }).eq('id',domain.id).eq('organization_id',membership.organizationId)
      return NextResponse.json({ verified: false, error: 'Le DNS ne pointe pas encore vers Vercel.', cname: answers, addresses })
    }
    const { data: updated, error } = await supabase.from('domains').update({ status: 'verified' }).eq('id',domain.id).eq('organization_id',membership.organizationId).select('id,hostname,status,funnel_id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ verified: true, domain: updated })
  } catch (error) {
    return NextResponse.json({ verified: false, error: error instanceof Error ? error.message : 'Vérification DNS impossible.' }, { status: 502 })
  }
}
