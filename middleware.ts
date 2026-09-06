import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig } from './lib/supabase/config'

const PUBLIC_EXACT_PATHS = new Set(['/', '/login', '/signup'])
const PUBLIC_PREFIXES = [
  '/auth/',
  '/api/funnels/public',
  '/api/funnels/capture',
  '/api/events/',
  '/api/whatsapp/webhook',
  '/r/',
]
const PUBLIC_FUNNEL_RESERVED = new Set([
  'dashboard', 'login', 'signup', 'auth', 'onboarding', 'funnels', 'contacts',
  'campaigns', 'automations', 'whatsapp', 'emails', 'links', 'analytics', 'domains',
  'settings', 'integrations', 'api', '_next', 'r', 'segments',
])
const PLATFORM_HOSTS = new Set([
  'conik-io.vercel.app',
  'conik-io-anamaherbert1-glitchs-projects.vercel.app',
  'conik-io-git-main-anamaherbert1-glitchs-projects.vercel.app',
  'conik.io',
  'www.conik.io',
])

function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true
  const segments = pathname.split('/').filter(Boolean)
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
  const { url, key } = getSupabaseConfig()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const pathname = request.nextUrl.pathname
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  const segments = pathname.split('/').filter(Boolean)

  // A verified custom domain turns /slug into the internal public redirect route.
  // The original host is forwarded so the redirect resolver can select the correct link.
  if (host && !PLATFORM_HOSTS.has(host) && segments.length === 1 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(segments[0])) {
    const { data: verifiedDomain } = await supabase.rpc('is_verified_custom_domain', { target_host: host })
    if (verifiedDomain === true) {
      const rewriteUrl = request.nextUrl.clone()
      rewriteUrl.pathname = `/r/${segments[0].toLowerCase()}`
      const headers = new Headers(request.headers)
      headers.set('x-conik-host', host)
      return addSecurityHeaders(NextResponse.rewrite(rewriteUrl, { request: { headers } }))
    }
  }

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  if (!isPublicPath(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    return addSecurityHeaders(NextResponse.redirect(redirectUrl))
  }
  if (pathname === '/signup') return addSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)))
  if (user && pathname === '/login') return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)))
  return addSecurityHeaders(response)
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] }
