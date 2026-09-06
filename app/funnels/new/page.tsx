'use client'

import Link from 'next/link'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewFunnel() {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function createFunnel(event: FormEvent) {
    event.preventDefault()
    setError(''); setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session expirée. Veuillez vous reconnecter.')
      const { data: member, error: memberError } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id).order('created_at').limit(1).maybeSingle()
      if (memberError) throw new Error(memberError.message)
      if (!member) throw new Error("Créez d'abord un espace de travail.")
      const slug = name.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `tunnel-${Date.now()}`
      const { data, error: insertError } = await supabase.from('funnels').insert({ organization_id: member.organization_id, name: name.trim(), slug, source: 'manual' }).select('id').single()
      if (insertError) throw new Error(insertError.message)
      window.location.href = `/funnels/${data.id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le tunnel.')
      setLoading(false)
    }
  }

  return <div className="page">
    <Link href="/funnels" className="back"><ArrowLeft size={15}/>Tunnels</Link>
    <small>NOUVEAU TUNNEL</small>
    <h1>Créer un tunnel</h1>
    <p>Commencez simplement : donnez un nom à votre tunnel. Vous pourrez ensuite créer ses pages et importer votre HTML ou votre ZIP depuis l’éditeur.</p>
    <div className="choice" style={{ marginTop: 24, maxWidth: 620 }}>
      <div className="ico"><Plus/></div>
      <h2>Nom du tunnel</h2>
      <form onSubmit={createFunnel}>
        <label className="form-label">Nom du tunnel<input className="form-input" required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Campagne montres de luxe" autoFocus /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={loading}>{loading ? <><Loader2 size={16} className="spin"/>Création…</> : 'Créer le tunnel'}</button>
      </form>
    </div>
  </div>
}
