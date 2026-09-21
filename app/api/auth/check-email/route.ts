import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || !email.includes('@') || email.length > 320) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Authentication service is not configured.' }, { status: 503 })
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) return NextResponse.json({ error: 'Unable to check this email.' }, { status: 500 })
      const exists = data.users.some((user) => user.email?.toLowerCase() === email)
      if (exists) return NextResponse.json({ exists: true })
      if (data.users.length < 1000) break
    }

    return NextResponse.json({ exists: false })
  } catch {
    return NextResponse.json({ error: 'Unable to check this email.' }, { status: 500 })
  }
}
