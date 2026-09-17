import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

const VERCEL_CNAME_SUFFIXES = ['cname.vercel-dns.com', 'vercel-dns.com']
const VERCEL_PROJECT_CNAME_RE = /(^|\.)vercel-dns-\d+\.com$/
const VERCEL_A_IPS = new Set(['76.76.21.21'])

function normalizeDnsTarget(value: string) {
  return String(value || '').toLowerCase().trim().replace(/\.$/, '')
}

function isVercelCname(target: string) {
  const t = normalizeDnsTarget(target)
  return VERCEL_CNAME_SUFFIXES.some((suffix) => t === suffix || t.endsWith('.' + suffix)) || VERCEL_PROJECT_CNAME_RE.test(t)
}

async function queryDns(host: string, type: 'A' | 'CNAME') {
  const urls = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,
    `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`,
  ]
  const results = await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(url, { headers: { accept: 'application/dns-json' }, cache: 'no-store' })
      if (!response.ok) return []
      const json = await response.json().catch(() => ({}))
      return Array.isArray(json?.Answer) ? json.Answer : []
    } catch {
      return []
    }
  }))
  return results.flat()
}

export async function POST(request: Request) {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : null
  if (!id) return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 })

  const { data: domain } = await supabase
    .from('domains')
    .select('id,hostname,status')
    .eq('id', id)
    .eq('organization_id', membership.organizationId)
    .maybeSingle()

  if (!domain) return NextResponse.json({ error: 'Domaine introuvable.' }, { status: 404 })

  try {
    const [cnameAnswersRaw, aAnswersRaw] = await Promise.all([
      queryDns(domain.hostname, 'CNAME'),
      queryDns(domain.hostname, 'A'),
    ])

    const cnameAnswers = cnameAnswersRaw
      .filter((answer: any) => Number(answer?.type) === 5)
      .map((answer: any) => normalizeDnsTarget(String(answer.data || '')))
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index)

    const addresses = aAnswersRaw
      .filter((answer: any) => Number(answer?.type) === 1)
      .map((answer: any) => String(answer.data || '').trim())
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index)

    const pointsToVercel = cnameAnswers.some(isVercelCname) || addresses.some((ip) => VERCEL_A_IPS.has(ip))

    if (!pointsToVercel) {
      await supabase
        .from('domains')
        .update({ status: 'failed' })
        .eq('id', domain.id)
        .eq('organization_id', membership.organizationId)

      const foundCname = cnameAnswers.length ? cnameAnswers.join(', ') : 'aucun CNAME'
      const foundA = addresses.length ? addresses.join(', ') : 'aucune IP A'

      return NextResponse.json({
        verified: false,
        error: `Le DNS de « ${domain.hostname} » ne pointe pas encore vers Vercel. CNAME détecté : ${foundCname}. A détecté : ${foundA}.`,
        cname: cnameAnswers,
        addresses,
        expected: { cname: 'cname.vercel-dns.com ou cible Vercel *.vercel-dns-<numero>.com', a: '76.76.21.21' },
      })
    }

    const { data: updated, error } = await supabase
      .from('domains')
      .update({ status: 'verified' })
      .eq('id', domain.id)
      .eq('organization_id', membership.organizationId)
      .select('id,hostname,status,funnel_id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ verified: true, domain: updated, message: `DNS vérifié : « ${domain.hostname} » pointe bien vers Vercel.` })
  } catch (error) {
    return NextResponse.json({ verified: false, error: error instanceof Error ? error.message : 'Impossible de vérifier le DNS pour le moment. Réessayez.' }, { status: 502 })
  }
}
