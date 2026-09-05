'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, UploadCloud, Plus } from 'lucide-react'
import { FormEvent, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ImportResult = {
  id: string
  slug: string
  pages: { slug: string; name: string }[]
  assets: number
  forms: number
  ctas: number
}

export default function NewFunnel() {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function createFunnel(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session expirée. Veuillez vous reconnecter.')
      const { data: member, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .order('created_at')
        .limit(1)
        .maybeSingle()
      if (memberError) throw new Error(memberError.message)
      if (!member) throw new Error("Créez d'abord un espace de travail.")

      const slug = name.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `tunnel-${Date.now()}`
      const { data, error: insertError } = await supabase
        .from('funnels')
        .insert({ organization_id: member.organization_id, name: name.trim(), slug, source: 'manual' })
        .select('id')
        .single()
      if (insertError) throw new Error(insertError.message)
      window.location.href = `/funnels/${data.id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le tunnel.')
      setLoading(false)
    }
  }

  async function importZip(event: FormEvent) {
    event.preventDefault(); setError(''); setResult(null)
    const file = inputRef.current?.files?.[0]
    if (!file) { setError("Sélectionnez d'abord un fichier ZIP."); return }
    setLoading(true)
    try {
      const body = new FormData(); body.append('file', file); body.append('name', name.trim() || file.name.replace(/\.zip$/i, ''))
      const response = await fetch('/api/funnels/import', { method: 'POST', body })
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Échec de l'import.")
      setResult({ id: data.funnel.id, slug: data.funnel.slug, pages: data.pages, assets: data.analysis.assets, forms: data.analysis.forms, ctas: data.analysis.ctas })
    } catch (err) { setError(err instanceof Error ? err.message : "Échec de l'import.") }
    finally { setLoading(false) }
  }

  return <div className="page">
    <Link href="/funnels" className="back"><ArrowLeft size={15}/>Tunnels</Link>
    <small>NOUVEAU TUNNEL</small><h1>Créer un tunnel</h1>
    <p>Partez de zéro ou importez un site déjà conçu. Le code importé est nettoyé de ses scripts et n&apos;est jamais exécuté sur le domaine de l&apos;application.</p>
    <div className="choice" style={{ marginTop: 24 }}><div className="ico"><Plus/></div><h2>Démarrer un tunnel vide</h2>
      <form onSubmit={createFunnel}><label className="form-label">Nom du tunnel<input className="form-input" required minLength={2} value={name} onChange={(e)=>setName(e.target.value)} placeholder="Campagne montres de luxe"/></label>{error&&!result&&<div className="error">{error}</div>}<button className="primary" disabled={loading}>{loading?<><Loader2 size={16} className="spin"/>Création…</>:'Créer le tunnel'}</button></form>
    </div>
    <div className="choice" style={{ marginTop: 16 }}><div className="ico"><UploadCloud/></div><h2>Importer un ZIP</h2><p>Envoyez le ZIP de votre site (HTML, CSS, images). Conik importe les pages, héberge les fichiers et publie le tunnel après validation.</p>
      <form onSubmit={importZip}><input ref={inputRef} type="file" accept=".zip,application/zip" className="form-input"/>{error&&<div className="error">{error}</div>}{result&&<div className="success"><CheckCircle2 size={17}/><div><strong>Import terminé.</strong><br/>{result.pages.length} page(s) · {result.assets} fichier(s) · {result.forms} formulaire(s) · {result.ctas} lien(s)<br/><Link href={`/funnels/${result.id}`}>Ouvrir le tunnel importé →</Link>{' · '}<a href={`/${result.slug}`} target="_blank" rel="noreferrer">Voir la page en ligne →</a></div></div>}<button type="submit" className="outline" disabled={loading}>{loading?<><Loader2 size={16} className="spin"/>Analyse du ZIP…</>:'Importer et publier le ZIP'}</button></form><small>ZIP de 25 Mo maximum · 300 fichiers · 30 pages HTML.</small>
    </div>
  </div>
}
