import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const dynamic = 'force-dynamic'

function parseDateParam(value: string | null, fallback: Date): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return fallback.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
    const sp = request.nextUrl.searchParams
    const today = new Date()
    const defaultFrom = new Date(Date.now() - 29 * 86400000)
    const from = parseDateParam(sp.get('from'), defaultFrom)
    const to = parseDateParam(sp.get('to'), today)
    const fromIso = `${from}T00:00:00.000Z`
    const toIso = `${to}T23:59:59.999Z`

    const { data: funnels } = await supabase.from('funnels').select('id,name').eq('organization_id', organization.id)
    const funnelIds = (funnels || []).map((f: { id: string }) => f.id)
    const funnelName: Record<string, string> = {}
    for (const f of funnels || []) funnelName[f.id] = f.name

    // Commandes / ventes
    let orders: any[] = []
    const ordersRes = await supabase
      .from('payment_orders')
      .select('id,funnel_id,tariff_id,provider_id,amount_cents,currency,status,buyer_email,buyer_phone,buyer_name,provider_ref,product_label,created_at,paid_at')
      .eq('organization_id', organization.id)
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .order('created_at', { ascending: false })
      .limit(500)

    if (!ordersRes.error) orders = ordersRes.data || []

    // Fallback conversions (ancien modèle)
    let conversions: any[] = []
    const convRes = await supabase
      .from('conversions')
      .select('id,created_at,amount,currency')
      .eq('organization_id', organization.id)
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
    if (!convRes.error) conversions = convRes.data || []

    // Visites
    let views: any[] = []
    if (funnelIds.length) {
      const viewsRes = await supabase
        .from('page_views')
        .select('id,visitor_id,funnel_id,created_at')
        .in('funnel_id', funnelIds)
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .limit(5000)
      if (!viewsRes.error) views = viewsRes.data || []
    }

    const paidOrders = orders.filter((o) => o.status === 'paid')
    const salesCount = paidOrders.length || conversions.length
    const revenueCents = paidOrders.reduce((s, o) => s + Number(o.amount_cents || 0), 0)
    const revenueFromConv = conversions.reduce((s, c) => s + Number(c.amount || 0), 0)
    const currency = paidOrders[0]?.currency || conversions[0]?.currency || 'XOF'
    const visitors = new Set(views.map((v) => v.visitor_id).filter(Boolean)).size

    // Série journalière
    const byDay: Record<string, { date: string; sales: number; revenue_cents: number; visits: number; pending: number }> = {}
    const start = new Date(`${from}T12:00:00Z`)
    const end = new Date(`${to}T12:00:00Z`)
    for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
      const d = new Date(t).toISOString().slice(0, 10)
      byDay[d] = { date: d, sales: 0, revenue_cents: 0, visits: 0, pending: 0 }
    }

    for (const o of orders) {
      const d = String(o.paid_at || o.created_at).slice(0, 10)
      if (!byDay[d]) continue
      if (o.status === 'paid') {
        byDay[d].sales++
        byDay[d].revenue_cents += Number(o.amount_cents || 0)
      } else if (o.status === 'pending') byDay[d].pending++
    }
    if (paidOrders.length === 0) {
      for (const c of conversions) {
        const d = String(c.created_at).slice(0, 10)
        if (!byDay[d]) continue
        byDay[d].sales++
        byDay[d].revenue_cents += Math.round(Number(c.amount || 0) * (String(c.currency).toUpperCase() === 'XOF' ? 1 : 100))
      }
    }
    for (const v of views) {
      const d = String(v.created_at).slice(0, 10)
      if (byDay[d]) byDay[d].visits++
    }

    // Jours avec activité (pour calendrier heatmap)
    const calendar: Record<string, { sales: number; revenue_cents: number; visits: number }> = {}
    for (const d of Object.values(byDay)) {
      if (d.sales || d.visits || d.revenue_cents) {
        calendar[d.date] = { sales: d.sales, revenue_cents: d.revenue_cents, visits: d.visits }
      }
    }

    const table = paidOrders.length
      ? paidOrders.map((o) => ({
          id: o.id,
          date: o.paid_at || o.created_at,
          amount_cents: o.amount_cents,
          currency: o.currency || currency,
          buyer: o.buyer_name || o.buyer_email || o.buyer_phone || '—',
          product: o.product_label || '—',
          funnel: funnelName[o.funnel_id] || '—',
          status: o.status,
          ref: o.provider_ref || null,
        }))
      : conversions.map((c) => ({
          id: c.id,
          date: c.created_at,
          amount_cents: Math.round(Number(c.amount || 0) * (String(c.currency).toUpperCase() === 'XOF' ? 1 : 100)),
          currency: c.currency || currency,
          buyer: '—',
          product: '—',
          funnel: '—',
          status: 'paid',
          ref: null,
        }))

    return NextResponse.json({
      from,
      to,
      salesCount,
      revenueCents: revenueCents || revenueFromConv,
      currency,
      visits: views.length,
      visitors,
      pendingCount: orders.filter((o) => o.status === 'pending').length,
      byDay: Object.values(byDay),
      calendar,
      orders: table,
      ordersTableMissing: Boolean(ordersRes.error),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Non autorisé' }, { status: 401 })
  }
}
