'use client'

import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)

export default function OfficialLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const record = (event_type: 'page_view' | 'download' | 'support_click' | 'demo_click', metadata: Record<string, unknown> = {}) => {
      supabase.from('site_events').insert({ event_type, platform: navigator.platform, metadata }).then(() => {})
    }
    record('page_view', { path: window.location.pathname })
    const handler = (event: Event) => {
      const target = event.currentTarget as HTMLAnchorElement
      const href = target.getAttribute('href') || ''
      if (href.includes('CONIK-Setup.exe')) record('download', { platform: 'windows' })
      else if (href.startsWith('mailto:')) record('support_click', { channel: 'email' })
      else if (href === '#download') record('demo_click', { source: 'navigation' })
    }
    const links = Array.from(document.querySelectorAll('a'))
    links.forEach(link => link.addEventListener('click', handler))
    return () => links.forEach(link => link.removeEventListener('click', handler))
  }, [])

  return children
}
