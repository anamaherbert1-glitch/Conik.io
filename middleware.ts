import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_EXACT_PATHS = new Set(['/', '/login', '/signup'])
const PUBLIC_PREFIXES = ['/auth/']
const PUBLIC_FUNNEL_RESERVED = new Set([
  'dashboard', 'login', 'signup', 'auth', 'onboarding', 'funnels', 'contacts',
  'campaigns', 'automations', 'whatsapp', 'emails', 'links', 'analytics', 'domains',
  'settings', 'api', '_next',
])

function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true
  const segments = pathname.split('/').filter(Boolean)
  // Public funnel runtime supports /funnel and /funnel/page.
  return (segments.length === 1 || segments.length === 2) && !PUBLIC_FUNNEL_RESERVED.has(segments[0].toLowerCase())
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (process.env.NODE_ENV === 'production') response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  return response
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  const pathname = request.nextUrl.pathname
  if (!isPublicPath(pathname) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    return addSecurityHeaders(NextResponse.redirect(url))
  }
  if (pathname === '/signup') return addSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)))
  if (user && pathname === '/login') return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)))
  return addSecurityHeaders(response)
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] }
