import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

const clean = (value: unknown, max: number) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null
const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

function parseCsv(input: string) {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted
    } else if (ch === ',' && !quoted) { row.push(cell); cell = ''
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && input[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some(v => v.trim())) rows.push(row)
      row = []
    } else cell += ch
  }
  if (cell || row.length) { row.push(cell); if (row.some(v => v.trim())) rows.push(row) }
  return rows
}

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, '_')
const emailValid = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)

export async function GET() {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const { data, error } = await supabase.from('contacts').select('email,phone,first_name,last_name,status,consent_status,custom_fields,created_at').eq('organization_id', membership.organizationId).order('created_at', { ascending: false }).limit(5000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const header = ['first_name','last_name','email','phone','status','consent_marketing','source','created_at']
  const lines = [header.map(csvEscape).join(',')]
  for (const c of data || []) lines.push([c.first_name,c.last_name,c.email,c.phone,c.status,c.consent_status === 'granted',c.custom_fields?.source || 'manual',c.created_at].map(csvEscape).join(','))
  return new NextResponse('\uFEFF' + lines.join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="conik-contacts.csv"', 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const { supabase, user, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'CSV file is required.' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'CSV file must be 5 MB or smaller.' }, { status: 413 })
  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length < 2) return NextResponse.json({ error: 'CSV must contain a header and at least one contact.' }, { status: 400 })
  const headers = rows[0].map(normalizeHeader)
  const index = (names: string[]) => names.map(n => headers.indexOf(n)).find(i => i >= 0) ?? -1
  const firstIndex=index(['first_name','firstname','prenom','prénom']), lastIndex=index(['last_name','lastname','nom']), emailIndex=index(['email','e_mail']), phoneIndex=index(['phone','telephone','téléphone','mobile']), consentIndex=index(['consent_marketing','consent','marketing_consent']), sourceIndex=index(['source'])
  if (emailIndex < 0 && phoneIndex < 0) return NextResponse.json({ error: 'CSV must contain an email or phone column.' }, { status: 400 })

  const { data: existing, error: existingError } = await supabase.from('contacts').select('email,phone').eq('organization_id', membership.organizationId).limit(10000)
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
  const emails = new Set((existing || []).map(c => c.email?.toLowerCase()).filter(Boolean))
  const phones = new Set((existing || []).map(c => c.phone).filter(Boolean))
  const seenEmails = new Set<string>(), seenPhones = new Set<string>()
  const toInsert: any[] = [], errors: string[] = [], skipped: { row:number; reason:string }[] = []
  rows.slice(1).forEach((row, offset) => {
    const line = offset + 2
    const email = emailIndex >= 0 ? clean(row[emailIndex],320)?.toLowerCase() || null : null
    const phone = phoneIndex >= 0 ? clean(row[phoneIndex],40) : null
    if (!email && !phone) { skipped.push({row:line,reason:'missing email and phone'}); return }
    if (email && !emailValid(email)) { skipped.push({row:line,reason:'invalid email'}); return }
    if ((email && (emails.has(email) || seenEmails.has(email))) || (phone && (phones.has(phone) || seenPhones.has(phone)))) { skipped.push({row:line,reason:'duplicate email or phone'}); return }
    const consentRaw = consentIndex >= 0 ? String(row[consentIndex] || '').trim().toLowerCase() : ''
    const consent = ['true','yes','1','oui','granted'].includes(consentRaw)
    toInsert.push({organization_id:membership.organizationId,email,phone,first_name:firstIndex>=0?clean(row[firstIndex],120):null,last_name:lastIndex>=0?clean(row[lastIndex],120):null,status:'active',consent_status:consent?'granted':'unknown',custom_fields:{source:sourceIndex>=0?clean(row[sourceIndex],160)||'import_csv':'import_csv'}})
    if(email) seenEmails.add(email); if(phone) seenPhones.add(phone)
  })
  if (!toInsert.length) return NextResponse.json({ imported:0, skipped:skipped.length, skippedRows:skipped, errors }, { status: 200 })
  const { data: inserted, error } = await supabase.from('contacts').insert(toInsert).select('id')
  if (error) return NextResponse.json({ error: error.message, imported:0, skipped:skipped.length }, { status: 400 })
  const activities = (inserted || []).map(c => ({contact_id:c.id,organization_id:membership.organizationId,type:'contact_imported',metadata:{source:'csv',created_by:user.id}}))
  if (activities.length) await supabase.from('contact_activity').insert(activities)
  return NextResponse.json({ imported: inserted?.length || 0, skipped: skipped.length, skippedRows: skipped, errors })
}
