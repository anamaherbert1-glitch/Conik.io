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
    event.preventDefault(); setError(''); setLoading(true)
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
    } catch (err) { setError(err instanceof Error ? err.message : 'Impossible de créer le tunnel.'); setLoading(false) }
  }

  return <div className="page funnel-new-page">
    <Link href="/funnels" className="back"><ArrowLeft size={15}/>Tunnels</Link>
    <small>NOUVEAU TUNNEL</small>
    <h1>Créer un tunnel</h1>
    <p className="funnel-new-intro">Commencez simplement : donnez un nom à votre tunnel. Vous pourrez ensuite créer ses pages et importer votre HTML ou votre ZIP depuis l’éditeur.</p>
    <div className="choice funnel-create-card">
      <div className="ico"><Plus/></div>
      <h2>Nom du tunnel</h2>
      <form onSubmit={createFunnel} className="funnel-create-form">
        <label className="form-label">Nom du tunnel<input className="form-input" required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Campagne montres de luxe" autoFocus /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary create-funnel-button" disabled={loading}>{loading ? <><Loader2 size={16} className="spin"/>Création…</> : 'Créer le tunnel'}</button>
      </form>
    </div>
    <style jsx>{`
      .funnel-new-page{width:100%;max-width:900px;min-width:0;overflow-x:hidden}
      .funnel-new-intro{max-width:760px;line-height:1.7;margin:0 0 24px}
      .funnel-create-card{width:min(620px,100%);max-width:100%;padding:28px;margin-top:24px;overflow:hidden}
      .funnel-create-form{display:grid;gap:14px;width:100%;max-width:100%}
      .funnel-create-form .form-label{width:100%;min-width:0}
      .funnel-create-form .form-input{display:block;width:100%;min-width:0;min-height:48px}
      .create-funnel-button{justify-self:start;min-height:46px;margin-top:4px;padding-inline:22px;white-space:nowrap}
      .funnel-create-form .error{margin-top:0}
      @media(max-width:520px){.funnel-new-page{padding:24px 16px}.funnel-create-card{padding:22px;margin-top:20px}.create-funnel-button{width:100%;margin-top:5px}.funnel-new-intro{line-height:1.6}}
    `}</style>
  </div>
}
