/** Parsers d’import contacts — CSV (Google / générique) + VCF (vCard) */

export type ParsedContact = {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  source: string
}

const clean = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null

export function emailValid(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}

/** Normalise un numéro : garde + et chiffres */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  let s = String(raw).trim()
  if (!s) return null
  const hasPlus = s.startsWith('+')
  s = s.replace(/[^\d+]/g, '')
  if (hasPlus && !s.startsWith('+')) s = '+' + s.replace(/\+/g, '')
  s = s.replace(/(?!^)\+/g, '')
  if (s.replace(/\D/g, '').length < 6) return null
  return s.slice(0, 40)
}

export function parseCsvRows(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"'
        i++
      } else quoted = !quoted
    } else if (ch === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && input[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      if (row.some((v) => v.trim())) rows.push(row)
      row = []
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    if (row.some((v) => v.trim())) rows.push(row)
  }
  return rows
}

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, '_')
    .replace(/[^\w]/g, '')

function indexOfHeader(headers: string[], names: string[]) {
  for (const n of names) {
    const i = headers.indexOf(n)
    if (i >= 0) return i
  }
  return -1
}

/** CSV générique + Google Contacts export */
export function contactsFromCsv(text: string): { contacts: ParsedContact[]; error?: string } {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''))
  if (rows.length < 2) {
    return { contacts: [], error: 'Le CSV doit contenir une ligne d’en-tête et au moins un contact.' }
  }
  const headers = rows[0].map(normalizeHeader)

  const firstIndex = indexOfHeader(headers, [
    'first_name',
    'firstname',
    'given_name',
    'prenom',
    'prénom',
  ])
  const lastIndex = indexOfHeader(headers, [
    'last_name',
    'lastname',
    'family_name',
    'nom',
  ])
  const fullNameIndex = indexOfHeader(headers, ['name', 'full_name', 'nom_complet', 'fn'])
  const emailIndex = indexOfHeader(headers, [
    'email',
    'e_mail',
    'email_1_value',
    'e_mail_1_value',
    'mail',
  ])
  const phoneIndex = indexOfHeader(headers, [
    'phone',
    'telephone',
    'téléphone',
    'mobile',
    'phone_1_value',
    'tel',
    'cellphone',
  ])
  const sourceIndex = indexOfHeader(headers, ['source'])

  if (emailIndex < 0 && phoneIndex < 0) {
    return {
      contacts: [],
      error: 'Le fichier doit contenir une colonne e-mail ou téléphone (ex. Phone 1 - Value).',
    }
  }

  const contacts: ParsedContact[] = []
  for (const row of rows.slice(1)) {
    let email = emailIndex >= 0 ? clean(row[emailIndex], 320)?.toLowerCase() || null : null
    const phone = phoneIndex >= 0 ? normalizePhone(row[phoneIndex]) : null
    if (email && !emailValid(email)) email = null
    if (!email && !phone) continue

    let first = firstIndex >= 0 ? clean(row[firstIndex], 120) : null
    let last = lastIndex >= 0 ? clean(row[lastIndex], 120) : null
    if (!first && !last && fullNameIndex >= 0) {
      const full = clean(row[fullNameIndex], 200)
      if (full && !/^\+?\d[\d\s\-]+$/.test(full)) {
        const parts = full.split(/\s+/)
        first = parts[0] || null
        last = parts.slice(1).join(' ') || null
      }
    }

    contacts.push({
      first_name: first,
      last_name: last,
      email,
      phone,
      source: sourceIndex >= 0 ? clean(row[sourceIndex], 160) || 'import_csv' : 'import_csv',
    })
  }

  return { contacts }
}

function unfoldVcard(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').replace(/\r[ \t]/g, '')
}

function parseVcardProperty(line: string): { name: string; params: string; value: string } | null {
  const idx = line.indexOf(':')
  if (idx < 0) return null
  const left = line.slice(0, idx)
  const value = line.slice(idx + 1).trim()
  const semi = left.indexOf(';')
  const name = (semi >= 0 ? left.slice(0, semi) : left).toUpperCase()
  const params = semi >= 0 ? left.slice(semi + 1) : ''
  return { name, params, value }
}

function splitN(value: string): { last: string | null; first: string | null } {
  const parts = value.split(';')
  const last = clean(parts[0] || '', 120)
  const first = clean(parts[1] || '', 120)
  return { last, first }
}

export function contactsFromVcf(text: string): { contacts: ParsedContact[]; error?: string } {
  const unfolded = unfoldVcard(text.replace(/^\uFEFF/, ''))
  const blocks = unfolded.split(/BEGIN:VCARD/i).slice(1)
  if (!blocks.length) {
    return { contacts: [], error: 'Aucun contact vCard (BEGIN:VCARD) trouvé dans le fichier.' }
  }

  const contacts: ParsedContact[] = []
  for (const block of blocks) {
    const body = block.split(/END:VCARD/i)[0] || ''
    const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

    let first: string | null = null
    let last: string | null = null
    let fn: string | null = null
    let email: string | null = null
    let phone: string | null = null

    for (const line of lines) {
      const prop = parseVcardProperty(line)
      if (!prop) continue
      if (prop.name === 'FN') {
        fn = clean(prop.value, 200)
      } else if (prop.name === 'N') {
        const n = splitN(prop.value)
        first = n.first || first
        last = n.last || last
      } else if (prop.name === 'EMAIL' && !email) {
        const e = clean(prop.value, 320)?.toLowerCase() || null
        if (e && emailValid(e)) email = e
      } else if (prop.name === 'TEL' && !phone) {
        phone = normalizePhone(prop.value)
      }
    }

    if (!first && !last && fn && !/^\+?\d[\d\s\-]+$/.test(fn)) {
      const parts = fn.split(/\s+/)
      first = parts[0] || null
      last = parts.slice(1).join(' ') || null
    }

    if (!email && !phone) continue

    contacts.push({
      first_name: first,
      last_name: last,
      email,
      phone,
      source: 'import_vcf',
    })
  }

  if (!contacts.length) {
    return {
      contacts: [],
      error: 'Aucun contact valide (e-mail ou téléphone) trouvé dans le fichier VCF.',
    }
  }

  return { contacts }
}

export function detectImportFormat(filename: string, text: string): 'csv' | 'vcf' | 'unknown' {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.vcf') || lower.endsWith('.vcard')) return 'vcf'
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    if (/BEGIN:VCARD/i.test(text)) return 'vcf'
    return 'csv'
  }
  if (/BEGIN:VCARD/i.test(text)) return 'vcf'
  if (text.includes(',') && text.split('\n').length > 1) return 'csv'
  return 'unknown'
}
