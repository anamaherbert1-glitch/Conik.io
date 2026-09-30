import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function safeNext(value: string | null, fallback = '/onboarding') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}

function friendlyAuthError(value: string | null) {
  const message = (value || '').toLowerCase()
  if (message.includes('expired') || message.includes('otp_expired')) return 'Ce lien a expiré. Demandez un nouveau lien.'
  if (message.includes('invalid') && message.includes('token')) return 'Ce lien est invalide ou a déjà été utilisé.'
  if (message.includes('access_denied')) return 'L’authentification a été annulée.'
  return 'Impossible de finaliser l’authentification. Réessayez.'
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error') || url.searchParams.get('error_description')
  const next = safeNext(url.searchParams.get('next'))

  if (error) {
    const destination = next === '/reset-password' ? '/forgot-password' : '/login'
    return NextResponse.redirect(
      new URL(`${destination}?error=${encodeURIComponent(friendlyAuthError(error))}`, url.origin),
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=missing_code', url.origin),
    )
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    const destination = next === '/reset-password' ? '/forgot-password' : '/login'
    return NextResponse.redirect(
      new URL(`${destination}?error=${encodeURIComponent(friendlyAuthError(exchangeError.message))}`, url.origin),
    )
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
