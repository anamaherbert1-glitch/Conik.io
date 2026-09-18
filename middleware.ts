import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig } from './lib/supabase/config'

const PUBLIC_EXACT_PATHS = new Set(['/', '/login', '/signup', '/pay'])
const PUBLIC_PREFIXES = [
  '/auth/',
  '/api/funnels/public',
  '/api/funnels/capture',
  '/api/events/',
  '/api/whatsapp/webhook',
  '/api/lives/access',
  '/api/lives/token',
  '/api/lives/chat',
  '/api/payments/checkout',
  '/r/',
  '/live/',
  '/pay',
]
const PUBLIC_FUNNEL_RESERVED = new Set([
  'dashboard',
  'login',
  'signup',
  'auth',
  'onboarding',
  'funnels',
  'contacts',
  'campaigns',
  'automations',
  'whatsapp',
  'emails',
  'links',
  'analytics',
  'domains',
  'settings',
  'integrations',
  'api',
  '_next',
  'r',
  'segments',
  'lives',
  'live',
  'pay',
])
const ROOT_DOMAIN = (process.env.CONIK_ROOT_DOMAIN || 'conik.io').trim().toLowerCase().replace(/^\.+|\.+$/g, '')
const PLATFORM_HOSTS = new Set([
  'conik-io.vercel.app',
  'conik-io-anamaherbert1-glitchs-projects.vercel.app',
  'conik-io-git-main-anamaherbert1-glitchs-projects.vercel.app',
  ROOT_DOMAIN,
  `www.${ROOT_DOMAIN}`,
])
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'dashboard',
  'login',
  'signup',
  'auth',
  'domains',
  'status',
])
const FUNNEL_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i
const FUNNEL_SYSTEM_PATHS = new Set(['api', '_next', 'favicon.ico', 'r'])
function getWildcardTenant(host: string) {
  if (!host || PLATFORM_HOSTS.has(host)) return null
  const suffix = `.${ROOT_DOMAIN}`
  if (!host.endsWith(suffix)) return null
  const subdomain = host.slice(0, -suffix.length)
  if (!subdomain || subdomain.includes('.') || RESERVED_SUBDOMAINS.has(subdomain)) return null
  return FUNNEL_SLUG.test(subdomain) ? subdomain.toLowerCase() : null
}
function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true
  const segments = pathname.split('/').filter(Boolean)
  return (
    (segments.length === 1 || segments.length === 2) &&
    !PUBLIC_FUNNEL_RESERVED.has(segments[0].toLowerCase())
  )
}
function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), display-capture=(self), geolocation=()',
  )
  if (process.env.NODE_ENV === 'production')
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
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
  const wildcardTenant = getWildcardTenant(host)

  // A wildcard tenant maps:
  //   https://tenant.conik.io/           -> /tenant
  //   https://tenant.conik.io/about     -> /tenant/about
  // Keep API/system paths untouched so imported pages can still call Conik APIs.
  if (wildcardTenant && !FUNNEL_SYSTEM_PATHS.has(segments[0]?.toLowerCase() || '')) {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = segments.length
      ? `/${wildcardTenant}/${segments.join('/')}`
      : `/${wildcardTenant}`
    const headers = new Headers(request.headers)
    headers.set('x-conik-host', host)
    headers.set('x-conik-tenant', wildcardTenant)
    return addSecurityHeaders(NextResponse.rewrite(rewriteUrl, { request: { headers } }))
  }

  if (
    host &&
    !PLATFORM_HOSTS.has(host) &&
    !wildcardTenant &&
    segments.length === 1 &&
    FUNNEL_SLUG.test(segments[0])
  ) {
    const { data: verifiedDomain } = await supabase.rpc('is_verified_custom_domain', {
      target_host: host,
    })
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
  if (user && pathname === '/login')
    return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)))
  return addSecurityHeaders(response)
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
