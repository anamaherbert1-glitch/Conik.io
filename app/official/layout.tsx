'use client'

import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ndsksabyzxfmhnyykcfb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_-adOy-Xd9Xuqugx74Cjklg_CV9EzTfF'

export default function OfficialLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
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
