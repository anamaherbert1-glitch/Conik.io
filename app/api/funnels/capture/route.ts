import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const LIMIT = 50 * 1024

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > LIMIT) return NextResponse.json({ error: 'Submission too large.' }, { status: 413 })
    const body = await request.json()
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 })

    const funnelSlug = String(body.funnelSlug || '').trim().toLowerCase()
    const pageSlug = String(body.pageSlug || 'home').trim().toLowerCase()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(funnelSlug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pageSlug)) {
      return NextResponse.json({ error: 'Invalid funnel or page.' }, { status: 400 })
    }

    const clean = (value: unknown, max: number) => {
      const text = typeof value === 'string' ? value.trim() : ''
      return text ? text.slice(0, max) : null
    }
    const email = clean(body.email, 320)
    const phone = clean(body.phone, 40)
    const firstName = clean(body.firstName, 120)
    const lastName = clean(body.lastName, 120)
    const consent = body.marketingConsent === true
    const formData = body.formData && typeof body.formData === 'object' && !Array.isArray(body.formData) ? body.formData : {}

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('capture_funnel_contact', {
      target_funnel_slug: funnelSlug,
      target_page_slug: pageSlug,
      contact_email: email,
      contact_phone: phone,
      contact_first_name: firstName,
      contact_last_name: lastName,
      marketing_consent: consent,
      form_data: formData,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, contactId: data })
  } catch {
    return NextResponse.json({ error: 'Invalid form submission.' }, { status: 400 })
  }
}
