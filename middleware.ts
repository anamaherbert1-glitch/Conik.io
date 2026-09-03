import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_EXACT_PATHS = new Set(['/', '/login', '/signup'])
const PUBLIC_PREFIXES = ['/auth/']
const PUBLIC_FUNNEL_RESERVED = new Set([
  'dashboard',
  'login',
  'signup',
  'auth',
  'onboarding',
  'funnels',
  'contacts',
  'api',
])

function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true

  // Published funnels use /<funnelSlug>. Keep this one-segment runtime public.
  // Reserved application paths can never be treated as funnel slugs.
  const segments = pathname.split('/').filter(Boolean)
  return segments.length === 1 && !PUBLIC_FUNNEL_RESERVED.has(segments[0].toLowerCase())
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return response
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // getClaims() validates the signed session claims and also lets Supabase
  // refresh the session through the SSR cookie flow when necessary.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  const pathname = request.nextUrl.pathname
  const publicPath = isPublicPath(pathname)

  if (!publicPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Preserve the internal destination so login can return the user there.
    url.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    return addSecurityHeaders(NextResponse.redirect(url))
  }

  // Public signup is intentionally disabled for Conik.
  if (pathname === '/signup') {
    return addSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)))
  }

  // Authenticated users should not see the login screen.
  if (user && pathname === '/login') {
    return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)))
  }

  return addSecurityHeaders(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
