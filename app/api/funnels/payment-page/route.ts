import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { parseZip } from '@/lib/funnel/zip'

export const runtime = 'nodejs'

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || `tarif-${Date.now().toString(36)}`
}

function isZip(file: File) {
  return /\.zip$/i.test(file.name) || file.type === 'application/zip' || file.type === 'application/x-zip-compressed'
}

function isHtml(file: File) {
  return /\.(html?|HTML?)$/i.test(file.name) || file.type.includes('html')
}

function isCss(file: File) {
  return /\.css$/i.test(file.name) || file.type.includes('css')
}

function isJs(file: File) {
  return /\.m?js$/i.test(file.name) || file.type.includes('javascript')
}

function extractHtmlParts(text: string) {
  let html = text
  let css = ''
  let js = ''
  const styleMatches = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
  const scriptMatches = [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
  styleMatches.forEach((m) => (css += `\n${m[1]}`))
  scriptMatches.forEach((m) => (js += `\n${m[1]}`))
  html = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<\/?head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '')
    .trim()
  return { html, css, js }
}

async function parseImport(request: Request) {
  const form = await request.formData()
  const funnelId = String(form.get('funnelId') || '')
  const enabled = String(form.get('enabled') || 'false') === 'true'
  const providerId = String(form.get('providerId') || '') || null
  const files: File[] = []
  for (const [key, value] of form.entries()) {
    if (value instanceof File && value.size > 0 && (key === 'file' || key.startsWith('file_'))) files.push(value)
  }

  let html = ''
  let css = ''
  let js = ''
  let hasFiles = false

  for (const file of files) {
    if (isZip(file)) {
      const entries = parseZip(Buffer.from(await file.arrayBuffer()))
      const htmlEntries = entries.filter((entry) => /\.html?$/i.test(entry.name))
      const htmlEntry = htmlEntries.find((entry) => /(^|\/)index\.html?$/i.test(entry.name)) || htmlEntries[0]
      if (!htmlEntry) throw new Error(`Aucun fichier HTML trouvé dans « ${file.name} ».`)

      const parts = extractHtmlParts(htmlEntry.data.toString('utf8'))
      html = parts.html
      css += parts.css
      js += parts.js
      for (const entry of entries) {
        if (entry.name === htmlEntry.name) continue
        if (/\.css$/i.test(entry.name)) css += `\n${entry.data.toString('utf8')}`
        else if (/\.m?js$/i.test(entry.name)) js += `\n${entry.data.toString('utf8')}`
      }
      hasFiles = true
      continue
    }

    if (isHtml(file)) {
      const parts = extractHtmlParts(await file.text())
      html = parts.html
      css += parts.css
      js += parts.js
      hasFiles = true
    } else if (isCss(file)) {
      css += `\n${await file.text()}`
      hasFiles = true
    } else if (isJs(file)) {
      js += `\n${await file.text()}`
      hasFiles = true
    }
  }

  return { funnelId, enabled, providerId, html, css, js, hasFiles }
}

export async function GET(request: Request) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const funnelId = new URL(request.url).searchParams.get('funnelId')
  if (!funnelId) return NextResponse.json({ error: 'funnelId requis' }, { status: 400 })

  const { data: funnel, error } = await supabase
    .from('funnels')
    .select('id,name,slug,payment_enabled,payment_html,payment_css,payment_js,payment_provider_id,organization_id')
    .eq('id', funnelId)
    .eq('organization_id', organization.id)
    .single()
  if (error || !funnel) return NextResponse.json({ error: 'Tunnel introuvable' }, { status: 404 })

  const [{ data: tariffs }, { data: providers }] = await Promise.all([
    supabase.from('payment_tariffs').select('id,name,amount_cents,currency,slug,product_label,active,created_at').eq('funnel_id', funnelId).order('amount_cents'),
    supabase.from('payment_providers').select('id,provider,label,status').eq('organization_id', organization.id).eq('status', 'connected'),
  ])

  return NextResponse.json({ payment: funnel, tariffs: tariffs || [], providers: providers || [] })
}

export async function POST(request: Request) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => null)
    if (!body?.funnelId) return NextResponse.json({ error: 'funnelId requis' }, { status: 400 })

    if (body.action === 'create_tariff') {
      const amountCents = String(body.currency || 'XOF').toUpperCase() === 'XOF'
        ? Math.round(Number(body.amount))
        : Math.round(Number(body.amount) * 100)
      if (!amountCents || amountCents <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
      const name = String(body.name || `Tarif ${amountCents}`).slice(0, 120)
      const slug = slugify(String(body.slug || name))
      const { data, error } = await supabase
        .from('payment_tariffs')
        .insert({
          organization_id: organization.id,
          funnel_id: body.funnelId,
          name,
          amount_cents: amountCents,
          currency: String(body.currency || 'XOF').toUpperCase().slice(0, 8),
          slug,
          product_label: body.product_label ? String(body.product_label).slice(0, 200) : null,
          active: true,
        })
        .select('id,name,amount_cents,currency,slug,product_label,active')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ tariff: data }, { status: 201 })
    }

    if (body.action === 'delete_tariff' && body.tariffId) {
      const { error } = await supabase
        .from('payment_tariffs')
        .delete()
        .eq('id', body.tariffId)
        .eq('organization_id', organization.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'save_settings') {
      const providerId = body.providerId || null
      if (body.enabled && !providerId) {
        return NextResponse.json({ error: 'Connectez un prestataire avant d’activer la page de paiement.' }, { status: 400 })
      }
      if (providerId) {
        const { data: p } = await supabase.from('payment_providers').select('id').eq('id', providerId).eq('organization_id', organization.id).maybeSingle()
        if (!p) return NextResponse.json({ error: 'Prestataire invalide.' }, { status: 400 })
      }
      const { data, error } = await supabase
        .from('funnels')
        .update({ payment_enabled: Boolean(body.enabled), payment_provider_id: providerId })
        .eq('id', body.funnelId)
        .eq('organization_id', organization.id)
        .select('id,name,slug,payment_enabled,payment_html,payment_css,payment_js,payment_provider_id')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ payment: data })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  }

  try {
    const parsed = await parseImport(request)
    if (!parsed.funnelId) return NextResponse.json({ error: 'funnelId requis' }, { status: 400 })
    if (!parsed.hasFiles) return NextResponse.json({ error: 'Importez un ZIP ou des fichiers HTML, CSS ou JS.' }, { status: 400 })

    const { data: funnel } = await supabase
      .from('funnels')
      .select('id,payment_html,payment_css,payment_js,payment_provider_id')
      .eq('id', parsed.funnelId)
      .eq('organization_id', organization.id)
      .maybeSingle()
    if (!funnel) return NextResponse.json({ error: 'Tunnel introuvable' }, { status: 404 })

    if (parsed.enabled && !parsed.providerId && !funnel.payment_provider_id) {
      return NextResponse.json({ error: 'Intégrez d’abord un prestataire de paiement (Wave, CinetPay…) dans Intégrations.' }, { status: 400 })
    }

    const update: Record<string, any> = {
      payment_enabled: parsed.enabled,
      payment_provider_id: parsed.providerId || funnel.payment_provider_id,
    }
    if (parsed.html) update.payment_html = parsed.html
    if (parsed.css) update.payment_css = parsed.css
    if (parsed.js) update.payment_js = parsed.js

    const { data, error } = await supabase
      .from('funnels')
      .update(update)
      .eq('id', parsed.funnelId)
      .eq('organization_id', organization.id)
      .select('id,name,slug,payment_enabled,payment_html,payment_css,payment_js,payment_provider_id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({
      payment: data,
      analysis: { cssBytes: (data.payment_css || '').length, jsBytes: (data.payment_js || '').length },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Import de la page impossible.' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const funnelId = new URL(request.url).searchParams.get('funnelId')
  if (!funnelId) return NextResponse.json({ error: 'funnelId requis' }, { status: 400 })
  const { data, error } = await supabase
    .from('funnels')
    .update({ payment_enabled: false, payment_html: '', payment_css: '', payment_js: '', payment_provider_id: null })
    .eq('id', funnelId)
    .eq('organization_id', organization.id)
    .select('id,name,slug,payment_enabled,payment_html,payment_css,payment_js,payment_provider_id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ payment: data })
}
