'use client'

import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function OfficialLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) return
    const supabase = createClient(url, key)
    const record = (event_type: 'page_view' | 'download' | 'support_click', metadata: Record<string, unknown> = {}) => {
      void supabase.from('site_events').insert({ event_type, platform: navigator.platform, metadata })
    }
    record('page_view', { path: window.location.pathname })
    const handler = (event: Event) => {
      const target = event.currentTarget as HTMLAnchorElement
      const href = target.getAttribute('href') || ''
      if (href.includes('CONIK-Setup.exe')) record('download', { platform: 'windows' })
      else if (href.startsWith('mailto:')) record('support_click', { channel: 'email' })
    }
    const links = Array.from(document.querySelectorAll('a'))
    links.forEach(link => link.addEventListener('click', handler))
    return () => links.forEach(link => link.removeEventListener('click', handler))
  }, [])
  return children
}
