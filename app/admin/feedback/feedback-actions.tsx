'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function FeedbackActions({ id, status }: { id: string; status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function setStatus(next: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error || 'Erreur')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-actions">
      {status !== 'resolved' && (
        <button type="button" className="primary" disabled={loading} onClick={() => void setStatus('resolved')}>
          Résolu
        </button>
      )}
      {status !== 'open' && (
        <button type="button" className="outline" disabled={loading} onClick={() => void setStatus('open')}>
          Rouvrir
        </button>
      )}
    </div>
  )
}
