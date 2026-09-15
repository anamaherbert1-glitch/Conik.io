'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ConikDialog } from '@/components/conik-dialog'

export function FunnelDeleteButton({ funnelId }: { funnelId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')

  async function remove() {
    setBusy(true)
    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase.from('funnels').delete().eq('id', funnelId)
      if (deleteError) {
        setError(deleteError.message)
        return
      }
      setConfirmOpen(false)
      router.replace('/funnels')
      router.refresh()
    } catch {
      setError('Une erreur réseau est survenue. Veuillez réessayer.')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <button className="outline" onClick={() => setConfirmOpen(true)} disabled={busy} title="Supprimer le tunnel"><Trash2 size={15}/>{busy ? 'Suppression…' : 'Supprimer'}</button>
    <ConikDialog open={confirmOpen} title="Supprimer ce tunnel ?" message="Toutes les pages et versions liées à ce tunnel seront supprimées. Cette action est irréversible." tone="danger" confirmLabel="Supprimer le tunnel" busy={busy} onConfirm={remove} onCancel={() => !busy && setConfirmOpen(false)} />
    <ConikDialog open={!!error} title="Suppression impossible" message={error} tone="danger" confirmLabel="Fermer" onConfirm={() => setError('')} onCancel={() => setError('')} />
  </>
}
