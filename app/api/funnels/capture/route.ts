import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runAutomations } from '@/lib/automations/engine'

export const runtime = 'nodejs'
const LIMIT = 50 * 1024
function firstHeaderValue(value: string | null) { return value?.split(',')[0]?.trim() || null }

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > LIMIT) return NextResponse.json({ error: 'Submission too large.' }, { status: 413 })
    const body = await request.json()
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 })
    const funnelSlug = String(body.funnelSlug || '').trim().toLowerCase()
    const pageSlug = String(body.pageSlug || 'home').trim().toLowerCase()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(funnelSlug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pageSlug)) return NextResponse.json({ error: 'Invalid funnel or page.' }, { status: 400 })
    const clean = (value: unknown, max: number) => { const text = typeof value === 'string' ? value.trim() : ''; return text ? text.slice(0, max) : null }
    const email = clean(body.email, 320), phone = clean(body.phone, 40), firstName = clean(body.firstName, 120), lastName = clean(body.lastName, 120)
    const consent = body.marketingConsent === true, whatsappOptIn = body.whatsappOptIn === true
    const whatsappConsentText = clean(body.whatsappConsentText, 1000)
    const rawFormData = body.formData && typeof body.formData === 'object' && !Array.isArray(body.formData) ? (body.formData as Record<string, unknown>) : {}
    const formData = { source: `tunnel:${funnelSlug}`, ...rawFormData }
    if (whatsappOptIn && !phone) return NextResponse.json({ error: 'Un numéro de téléphone est requis pour le consentement WhatsApp.' }, { status: 422 })

    const supabase = await createClient()
    const { data: contactId, error } = await supabase.rpc('capture_funnel_contact', {
      target_funnel_slug: funnelSlug, target_page_slug: pageSlug, contact_email: email, contact_phone: phone,
      contact_first_name: firstName, contact_last_name: lastName, marketing_consent: consent, form_data: formData,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    let whatsapp: { ok: boolean; reason?: string; contactId?: string; whatsappContactId?: string } | null = null
    if (whatsappOptIn && phone) {
      const { data, error: optInError } = await supabase.rpc('whatsapp_register_funnel_opt_in', {
        target_funnel_slug: funnelSlug, contact_phone: phone, contact_id_in: contactId,
        consent_text_in: whatsappConsentText || 'J’accepte de recevoir des messages WhatsApp de cette entreprise et je peux me désinscrire à tout moment.',
        visitor_ip: firstHeaderValue(request.headers.get('x-forwarded-for')) || request.headers.get('x-real-ip'),
        visitor_agent: clean(request.headers.get('user-agent'), 400),
      })
      if (optInError) return NextResponse.json({ error: optInError.message }, { status: 400 })
      whatsapp = data || { ok: false, reason: 'opt_in_failed' }
      if (!whatsapp.ok) return NextResponse.json({ error: `WhatsApp opt-in refusé: ${whatsapp.reason || 'unknown'}` }, { status: 422 })
    }

    const { data: organizationId } = await supabase.rpc('funnel_organization_id', { target_funnel_slug: funnelSlug })
    if (organizationId) {
      try {
        await runAutomations('form_submission', { organizationId, contactId, phone, firstName, lastName, email, formData })
        await runAutomations('new_contact', { organizationId, contactId, phone, firstName, lastName, email, formData })
      } catch (automationError) {
        console.error('[automation] execution failed', automationError)
      }
    }
    return NextResponse.json({ ok: true, contactId, whatsapp })
  } catch {
    return NextResponse.json({ error: 'Invalid form submission.' }, { status: 400 })
  }
}
