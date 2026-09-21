import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import {
  contactsFromCsv,
  contactsFromVcf,
  detectImportFormat,
  emailValid,
  normalizePhone,
} from '@/lib/contacts/import-parsers'

export const runtime = 'nodejs'

const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

export async function GET() {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const { data, error } = await supabase
    .from('contacts')
    .select('email,phone,first_name,last_name,status,consent_status,custom_fields,created_at')
    .eq('organization_id', membership.organizationId)
    .order('created_at', { ascending: false })
    .limit(5000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const header = ['first_name', 'last_name', 'email', 'phone', 'status', 'consent_marketing', 'source', 'created_at']
  const lines = [header.map(csvEscape).join(',')]
  for (const c of data || []) {
    lines.push(
      [
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.status,
        c.consent_status === 'opted_in',
        c.custom_fields?.source || 'manual',
        c.created_at,
      ]
        .map(csvEscape)
        .join(','),
    )
  }
  return new NextResponse('\uFEFF' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="conik-contacts.csv"',
      'Cache-Control': 'no-store',
    },
  })
}

export async function POST(request: Request) {
  const { supabase, user, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Un fichier CSV ou VCF est requis.' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Le fichier ne doit pas dépasser 10 Mo.' }, { status: 413 })
  }

  const text = await file.text()
  const format = detectImportFormat(file.name || '', text)

  let parsed =
    format === 'vcf'
      ? contactsFromVcf(text)
      : format === 'csv'
        ? contactsFromCsv(text)
        : {
            contacts: [] as ReturnType<typeof contactsFromCsv>['contacts'],
            error: 'Format non reconnu. Utilisez un fichier .csv (Google Contacts) ou .vcf (vCard).',
          }

  if (format === 'csv' && parsed.error && /BEGIN:VCARD/i.test(text)) {
    parsed = contactsFromVcf(text)
  }

  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  if (!parsed.contacts.length) {
    return NextResponse.json({ error: 'Aucun contact valide trouvé dans le fichier.' }, { status: 400 })
  }

  const { data: existing, error: existingError } = await supabase
    .from('contacts')
    .select('email,phone')
    .eq('organization_id', membership.organizationId)
    .limit(20000)
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

  const emails = new Set(
    (existing || []).map((c) => c.email?.toLowerCase()).filter(Boolean) as string[],
  )
  const phones = new Set(
    (existing || []).map((c) => normalizePhone(c.phone) || c.phone).filter(Boolean) as string[],
  )
  const seenEmails = new Set<string>()
  const seenPhones = new Set<string>()
  const toInsert: Record<string, unknown>[] = []
  const skipped: { reason: string }[] = []

  for (const c of parsed.contacts) {
    let email = c.email
    let phone = normalizePhone(c.phone) || c.phone
    if (email && !emailValid(email)) email = null
    if (!email && !phone) {
      skipped.push({ reason: 'e-mail et téléphone manquants' })
      continue
    }
    if (email && (emails.has(email) || seenEmails.has(email))) {
      skipped.push({ reason: 'e-mail en doublon' })
      continue
    }
    if (phone && (phones.has(phone) || seenPhones.has(phone))) {
      skipped.push({ reason: 'téléphone en doublon' })
      continue
    }

    toInsert.push({
      organization_id: membership.organizationId,
      email,
      phone,
      first_name: c.first_name,
      last_name: c.last_name,
      status: 'lead',
      consent_status: 'unknown',
      custom_fields: { source: c.source || (format === 'vcf' ? 'import_vcf' : 'import_csv') },
    })
    if (email) {
      seenEmails.add(email)
      emails.add(email)
    }
    if (phone) {
      seenPhones.add(phone)
      phones.add(phone)
    }
  }

  if (!toInsert.length) {
    return NextResponse.json({
      imported: 0,
      skipped: skipped.length,
      skippedRows: skipped,
      format,
    })
  }

  let imported = 0
  const allIds: string[] = []
  for (let i = 0; i < toInsert.length; i += 200) {
    const chunk = toInsert.slice(i, i + 200)
    const { data: inserted, error } = await supabase.from('contacts').insert(chunk).select('id')
    if (error) {
      return NextResponse.json(
        { error: error.message, imported, skipped: skipped.length, format },
        { status: 400 },
      )
    }
    imported += inserted?.length || 0
    for (const row of inserted || []) allIds.push(row.id)
  }

  if (allIds.length) {
    const activities = allIds.map((id) => ({
      contact_id: id,
      organization_id: membership.organizationId,
      type: 'contact_imported',
      metadata: { source: format === 'vcf' ? 'vcf' : 'csv', created_by: user.id },
    }))
    for (let i = 0; i < activities.length; i += 200) {
      await supabase.from('contact_activity').insert(activities.slice(i, i + 200))
    }
  }

  return NextResponse.json({
    imported,
    skipped: skipped.length,
    skippedRows: skipped.slice(0, 50),
    format,
  })
}
