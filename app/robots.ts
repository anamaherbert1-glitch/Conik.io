import type { MetadataRoute } from 'next'

const SITE_URL = 'https://conik-io.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/onboarding',
          '/admin',
          '/settings',
          '/subscriptions',
          '/funnels/new',
          '/contacts',
          '/campaigns',
          '/automations',
          '/analytics',
          '/integrations',
          '/domains',
          '/api/',
          '/auth/',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
        ],
      },
      {
        userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'Bytespider'],
        allow: '/',
        disallow: ['/dashboard', '/onboarding', '/admin', '/settings', '/subscriptions', '/api/', '/auth/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
