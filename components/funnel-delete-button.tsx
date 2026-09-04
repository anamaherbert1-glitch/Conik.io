'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function FunnelDeleteButton({ funnelId }: { funnelId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function remove() {
    if (!window.confirm('Supprimer ce tunnel ainsi que toutes ses pages et versions ? Cette action est irréversible.')) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('funnels').delete().eq('id', funnelId)
    if (error) {
      window.alert(error.message)
      setBusy(false)
      return
    }
    router.replace('/funnels')
    router.refresh()
  }

  return <button className="outline" onClick={remove} disabled={busy} title="Supprimer le tunnel"><Trash2 size={15}/>{busy ? 'Suppression…' : 'Supprimer'}</button>
}
