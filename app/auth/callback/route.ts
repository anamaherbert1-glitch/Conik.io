import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/onboarding'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/onboarding'
  if (!code) return NextResponse.redirect(new URL('/login?error=missing_code', url.origin))
  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin))
  return NextResponse.redirect(new URL(safeNext, url.origin))
}
