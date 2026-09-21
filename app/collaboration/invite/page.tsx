'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Users, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CollaborationInvitePage() {
  const router = useRouter()
  const params = useSearchParams()
  const inviteId = params.get('invite') || ''
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'accepted'>('loading')
  const [message, setMessage] = useState('Vérification de votre invitation…')

  useEffect(() => {
    if (!inviteId) {
      setStatus('error')
      setMessage('Le lien d’invitation est incomplet.')
      return
    }
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login?next=' + encodeURIComponent('/collaboration/invite?invite=' + inviteId))
        return
      }
      setStatus('ready')
      setMessage('Vous pouvez rejoindre cette collaboration.')
    })
  }, [inviteId, router])

  async function accept() {
    setStatus('loading')
    setMessage('Ajout à la collaboration…')
    const response = await fetch('/api/team/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        router.push('/login?next=' + encodeURIComponent('/collaboration/invite?invite=' + inviteId))
        return
      }
      setStatus('error')
      setMessage(data.error || 'Impossible d’accepter cette invitation.')
      return
    }
    setStatus('accepted')
    setMessage('Vous avez rejoint la collaboration.')
    setTimeout(() => router.push('/dashboard'), 700)
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'radial-gradient(circle at top, #20264a 0, #0f1220 55%, #090b13 100%)' }}>
      <section className="panel" style={{ width: '100%', maxWidth: 520, padding: 32, textAlign: 'center', borderRadius: 24 }}>
        <div style={{ width: 58, height: 58, margin: '0 auto 18px', borderRadius: 17, display: 'grid', placeItems: 'center', background: '#5b5cf0', color: '#fff' }}>
          {status === 'accepted' ? <CheckCircle2 size={30} /> : status === 'error' ? <AlertCircle size={30} /> : <Users size={30} />}
        </div>
        <h1 style={{ marginBottom: 10 }}>Invitation à une collaboration</h1>
        <p className="muted" style={{ lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
        {status === 'ready' && (
          <button type="button" className="primary" onClick={() => void accept()} style={{ width: '100%', minHeight: 46 }}>
            Accéder à la collaboration →
          </button>
        )}
        {status === 'error' && (
          <button type="button" className="outline" onClick={() => router.push('/dashboard')}>Retour à Conik</button>
        )}
      </section>
    </main>
  )
}
