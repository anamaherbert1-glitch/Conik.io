import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { getPaymentMethodDefinitions } from '@/lib/payment-method-catalog'

export async function GET(request: Request) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const url = new URL(request.url)
  const paymentPageId = url.searchParams.get('paymentPageId')
  const provider = url.searchParams.get('provider')
  if (!paymentPageId) return NextResponse.json({ error: 'paymentPageId requis.' }, { status: 400 })

  const { data: page } = await supabase
    .from('payment_pages')
    .select('id,organization_id,funnel_id,status')
    .eq('id', paymentPageId)
    .eq('organization_id', organization.id)
    .maybeSingle()
  if (!page) return NextResponse.json({ error: 'Page de paiement introuvable.' }, { status: 404 })

  const { data: methods, error } = await supabase
    .from('payment_page_methods')
    .select('id,provider_id,method_code,display_name,enabled,sort_order,config')
    .eq('payment_page_id', paymentPageId)
    .order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const catalog = provider ? getPaymentMethodDefinitions(provider) : []
  return NextResponse.json({ methods: methods || [], catalog, paymentPage: page })
}

export async function POST(request: Request) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const body = await request.json().catch(() => null)
  const paymentPageId = typeof body?.paymentPageId === 'string' ? body.paymentPageId : ''
  const providerId = typeof body?.providerId === 'string' ? body.providerId : ''
  const provider = typeof body?.provider === 'string' ? body.provider : ''
  const methods = Array.isArray(body?.methods) ? body.methods : []
  if (!paymentPageId || !providerId || !provider) return NextResponse.json({ error: 'paymentPageId, providerId et provider sont requis.' }, { status: 400 })

  const { data: page } = await supabase
    .from('payment_pages')
    .select('id,organization_id,funnel_id')
    .eq('id', paymentPageId)
    .eq('organization_id', organization.id)
    .maybeSingle()
  if (!page) return NextResponse.json({ error: 'Page de paiement introuvable.' }, { status: 404 })

  const catalog = getPaymentMethodDefinitions(provider)
  const allowed = new Map(catalog.map(item => [item.code, item]))
  const normalized = methods
    .map((item: any, index: number) => {
      const code = String(item?.method_code || '')
      const definition = allowed.get(code)
      if (!definition) return null
      return {
        payment_page_id: paymentPageId,
        provider_id: providerId,
        method_code: code,
        display_name: definition.name,
        enabled: item?.enabled !== false,
        sort_order: Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index,
        config: typeof item?.config === 'object' && item.config ? item.config : {},
      }
    })
    .filter(Boolean)

  const { error: clearError } = await supabase
    .from('payment_page_methods')
    .delete()
    .eq('payment_page_id', paymentPageId)
    .eq('provider_id', providerId)
  if (clearError) return NextResponse.json({ error: clearError.message }, { status: 400 })

  if (normalized.length) {
    const { error: insertError } = await supabase.from('payment_page_methods').insert(normalized)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  return NextResponse.json({ methods: normalized })
}
