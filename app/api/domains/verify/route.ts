import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

const VERCEL_CNAME_SUFFIXES = ['cname.vercel-dns.com', 'vercel-dns.com']
const VERCEL_PROJECT_CNAME_RE = /(^|\.)vercel-dns-\d+\.com$/
const VERCEL_A_IPS = new Set(['76.76.21.21'])

function normalizeDnsTarget(value: string) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\.$/, '')
}

function isVercelCname(target: string) {
  const t = normalizeDnsTarget(target)
  return (
    VERCEL_CNAME_SUFFIXES.some((suffix) => t === suffix || t.endsWith('.' + suffix)) ||
    VERCEL_PROJECT_CNAME_RE.test(t)
  )
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
    const [cnameRes, aRes] = await Promise.all([
      fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain.hostname)}&type=CNAME`, {
        headers: { accept: 'application/dns-json' },
        cache: 'no-store',
      }),
      fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain.hostname)}&type=A`, {
        headers: { accept: 'application/dns-json' },
        cache: 'no-store',
      }),
    ])

    const cnameJson = await cnameRes.json().catch(() => ({}))
    const aJson = await aRes.json().catch(() => ({}))

    const cnameAnswers: string[] = Array.isArray(cnameJson?.Answer)
      ? cnameJson.Answer
          .filter((answer: any) => Number(answer?.type) === 5)
          .map((answer: any) => normalizeDnsTarget(String(answer.data || '')))
          .filter(Boolean)
      : []
    const addresses: string[] = Array.isArray(aJson?.Answer)
      ? aJson.Answer
          .filter((answer: any) => Number(answer?.type) === 1)
          .map((answer: any) => String(answer.data || '').trim())
          .filter(Boolean)
      : []

    const pointsToVercel =
      cnameAnswers.some(isVercelCname) || addresses.some((ip) => VERCEL_A_IPS.has(ip))

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
        error:
          `Le DNS de « ${domain.hostname} » ne pointe pas encore vers Vercel. ` +
          `Pour un sous-domaine, utilisez le CNAME indiqué par Vercel ` +
          `(cname.vercel-dns.com ou une cible *.vercel-dns-<numero>.com). ` +
          `Pour le domaine racine, utilisez l'enregistrement A vers 76.76.21.21. ` +
          `Attendez la propagation DNS puis réessayez. ` +
          `Actuellement détecté : CNAME = ${foundCname} · A = ${foundA}.`,
        cname: cnameAnswers,
        addresses,
        expected: {
          cname: 'cname.vercel-dns.com ou cible Vercel *.vercel-dns-<numero>.com',
          a: '76.76.21.21',
        },
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
    return NextResponse.json({
      verified: true,
      domain: updated,
      message: `DNS vérifié : « ${domain.hostname} » pointe bien vers Vercel.`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        verified: false,
        error:
          error instanceof Error
            ? error.message
            : 'Impossible de vérifier le DNS pour le moment. Réessayez dans quelques minutes.',
      },
      { status: 502 },
    )
  }
}
