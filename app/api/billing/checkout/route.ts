import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan, type PlanCode } from '@/lib/billing/plans'
import { initializeProviderPayment } from '@/lib/payments/provider-adapters'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { membership, user, organization } = await requireWorkspaceRole(['owner', 'admin'])
    const body = await request.json().catch(() => ({}))
    const plan = String(body.plan || '') as PlanCode
    const interval = body.interval === 'annual' ? 'annual' : 'monthly'

    if (!['basic', 'premium', 'business'].includes(plan)) {
      return NextResponse.json({ error: 'Plan payant invalide.' }, { status: 400 })
    }

    const def = getPlan(plan)
    const admin = createAdminClient()

    const { data: catalog } = await admin
      .from('subscription_billing_catalog')
      .select('product_code,plan_code,price,currency,billing_interval,active')
      .eq('plan_code', plan)
      .eq('billing_interval', interval)
      .eq('active', true)
      .eq('product_type', 'conik')
      .maybeSingle()

    const amount = Number(catalog?.price ?? (interval === 'annual' ? def.priceAnnualEur : def.priceMonthlyEur))
    const currency = String(catalog?.currency || 'EUR').toUpperCase()
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Tarif de l’abonnement invalide.' }, { status: 500 })

    const durationDays = interval === 'annual' ? 365 : 30
    const starts = new Date()
    const ends = new Date(starts)
    ends.setDate(ends.getDate() + durationDays)

    const { data: subscription, error: subscriptionError } = await admin
      .from('conik_subscriptions')
      .insert({
        organization_id: membership.organizationId,
        user_id: user.id,
        plan_code: plan,
        duration_days: durationDays,
        amount,
        currency,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        status: 'pending',
      })
      .select('id')
      .single()

    if (subscriptionError || !subscription) {
      return NextResponse.json({ error: subscriptionError?.message || 'Impossible de créer la demande d’abonnement.' }, { status: 400 })
    }

    const { data: provider } = await admin
      .from('payment_providers')
      .select('id,provider,credentials,public_config,status,supported_methods')
      .eq('organization_id', organization.id)
      .in('status', ['connected', 'active'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!provider) {
      await admin.from('conik_subscriptions').delete().eq('id', subscription.id)
      return NextResponse.json({ error: 'Aucun prestataire de paiement actif. Configurez d’abord un prestataire dans les paramètres de paiement.' }, { status: 409 })
    }

    const supported = provider.supported_methods
    const methodCode =
      Array.isArray(supported) && supported.length
        ? String(supported[0])
        : supported && typeof supported === 'object'
          ? String(Object.keys(supported)[0] || 'mobile_money')
          : 'mobile_money'

    const amountCents = Math.round(amount * 100)
    const buyerEmail = user.email || null
    const buyerName = user.user_metadata?.full_name || user.user_metadata?.name || null

    const { data: order, error: orderError } = await admin
      .from('payment_orders')
      .insert({
        organization_id: organization.id,
        provider_id: provider.id,
        amount_cents: amountCents,
        currency,
        status: 'pending',
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        customer_email: buyerEmail,
        product_label: `Conik ${def.name} — ${interval === 'annual' ? 'annuel' : 'mensuel'}`,
        subtotal: amount,
        total_amount: amount,
        metadata: {
          source: 'conik_subscription',
          subscription_id: subscription.id,
          plan_code: plan,
          billing_interval: interval,
          organization_id: organization.id,
        },
      })
      .select('id,order_number,amount_cents,currency,status')
      .single()

    if (orderError || !order) {
      await admin.from('conik_subscriptions').delete().eq('id', subscription.id)
      return NextResponse.json({ error: orderError?.message || 'Impossible de créer la commande de paiement.' }, { status: 400 })
    }

    const { data: transaction, error: transactionError } = await admin
      .from('payment_transactions')
      .insert({
        organization_id: organization.id,
        order_id: order.id,
        provider_id: provider.id,
        amount,
        currency,
        status: 'pending',
        method_code: methodCode,
      })
      .select('id')
      .single()

    if (transactionError || !transaction) {
      await admin.from('payment_orders').delete().eq('id', order.id)
      await admin.from('conik_subscriptions').delete().eq('id', subscription.id)
      return NextResponse.json({ error: transactionError?.message || 'Impossible de créer la transaction.' }, { status: 400 })
    }

    const origin = new URL(request.url).origin
    const result = await initializeProviderPayment({
      provider,
      methodCode,
      orderId: order.id,
      orderNumber: order.order_number || order.id,
      amountCents,
      currency,
      productLabel: `Conik ${def.name} — ${interval === 'annual' ? 'annuel' : 'mensuel'}`,
      customer: { name: buyerName, email: buyerEmail },
      baseUrl: origin,
    })

    await admin
      .from('payment_transactions')
      .update({
        provider_transaction_id: result.providerTransactionId,
        method_code: methodCode,
        status: result.status,
        raw_response: result.rawResponse,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id)

    await admin
      .from('payment_orders')
      .update({
        provider_ref: result.providerTransactionId,
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    await admin
      .from('conik_subscriptions')
      .update({ order_id: order.id, payment_id: null, updated_at: new Date().toISOString() })
      .eq('id', subscription.id)

    return NextResponse.json({
      ok: true,
      subscriptionId: subscription.id,
      orderId: order.id,
      orderNumber: order.order_number,
      provider: provider.provider,
      method: methodCode,
      amount,
      currency,
      interval,
      paymentUrl: result.paymentUrl || null,
      status: result.status,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Initialisation du paiement impossible.' }, { status: 502 })
  }
}
