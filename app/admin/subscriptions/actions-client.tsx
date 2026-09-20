'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AdminSubscriptionActions({
  id,
  table,
  status,
}: {
  id: string
  table: 'conik_subscriptions' | 'whatsapp_subscriptions'
  status: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function setStatus(next: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, table, status: next }),
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
      {status !== 'active' && (
        <button type="button" className="primary" disabled={loading} onClick={() => void setStatus('active')}>
          Activer
        </button>
      )}
      {status === 'active' && (
        <button type="button" className="outline" disabled={loading} onClick={() => void setStatus('expired')}>
          Expirer
        </button>
      )}
      <button type="button" className="outline" disabled={loading} onClick={() => void setStatus('cancelled')}>
        Annuler
      </button>
    </div>
  )
}
