'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, FileArchive, Loader2, Plus, UploadCloud } from 'lucide-react'
import { FormEvent, Suspense, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UpgradeRequired } from '@/components/billing/upgrade-required'

async function readApiError(response: Response): Promise<string> {
  const text = await response.text()
  if (!text) return `Erreur serveur (${response.status}).`
  try {
    const data = JSON.parse(text) as { error?: string; message?: string }
    return data.error || data.message || text.slice(0, 300)
  } catch {
    // HTML / plain text (timeout, Vercel error page, etc.) — not invalid project JSON
    if (response.status === 413) return 'Fichier trop volumineux (max 25 Mo).'
    if (response.status === 401 || response.status === 403) return 'Session expirée ou accès refusé. Reconnectez-vous.'
    if (response.status >= 500) {
      return 'Le serveur a rencontré une erreur pendant l’import (souvent timeout ou ZIP trop lourd). Réessayez avec un ZIP plus petit.'
    }
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280) || `Erreur (${response.status}).`
  }
}

function NewFunnelInner() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') === 'import' ? 'import' : 'create'

  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState('')
  const [limitBlocked, setLimitBlocked] = useState<{kind: 'tunnels' | 'pages'; current: number; limit: number} | null>(null)
  const [importUpgrade, setImportUpgrade] = useState<{plan: 'Basic' | 'Premium' | 'Business'; description: string} | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function createFunnel(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
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
      const { data: usageRows, error: usageError } = await supabase.rpc('conik_check_usage', { p_organization_id: member.organization_id, p_usage_key: 'tunnels' })
      if (usageError) throw new Error(usageError.message)
      const usage = Array.isArray(usageRows) ? usageRows[0] : usageRows
      if (!usage?.allowed) {
        setLimitBlocked({ kind: 'tunnels', current: Number(usage?.current_value || 0), limit: Number(usage?.limit_value || 0) })
        setLoading(false)
        return
      }
      const slug =
        name
          .toLowerCase()
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 80) || `tunnel-${Date.now()}`
      const { data, error: insertError } = await supabase
        .from('funnels')
        .insert({
          organization_id: member.organization_id,
          name: name.trim(),
          slug,
          source: 'manual',
        })
        .select('id')
        .single()
      if (insertError) throw new Error(insertError.message)
      window.location.href = `/funnels/${data.id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le tunnel.')
      setLoading(false)
    }
  }

  async function importProject(event: FormEvent) {
    event.preventDefault()
    setError('')
    setProgress('')
    setImportUpgrade(null)
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('Choisissez un fichier ZIP du projet (HTML + CSS + images + JS…).')
      return
    }
    if (!/\.zip$/i.test(file.name) && file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
      setError('Le fichier doit être un ZIP (pas un JSON, HTML seul ou autre format).')
      return
    }
    if (!name.trim()) {
      setError('Donnez un nom à ce tunnel.')
      return
    }
    setLoading(true)
    setProgress('Analyse du ZIP et extraction des pages…')
    try {
      const body = new FormData()
      body.append('name', name.trim())
      body.append('file', file)
      const response = await fetch('/api/funnels/import', { method: 'POST', body })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        if (response.status === 402 && payload.upgradeRequired) {
          setImportUpgrade({
            plan: payload.plan === 'basic' ? 'Premium' : 'Basic',
            description: payload.error || 'Cette action dépasse les limites de votre formule actuelle.',
          })
          setLoading(false)
          setProgress('')
          return
        }
        throw new Error(payload.error || await readApiError(response))
      }
      let data: {
        funnel?: { id: string }
        analysis?: { pages?: number; assets?: number }
        error?: string
      }
      try {
        data = await response.json()
      } catch {
        throw new Error(
          'La réponse du serveur est illisible (souvent un timeout). Réessayez avec un ZIP plus léger ou moins de fichiers.',
        )
      }
      if (!data.funnel?.id) {
        throw new Error(data.error || 'Import terminé mais tunnel introuvable.')
      }
      setProgress(
        `Import réussi : ${data.analysis?.pages ?? 0} page(s), ${data.analysis?.assets ?? 0} ressource(s).`,
      )
      window.location.href = `/funnels/${data.funnel.id}/editor`
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'import.")
      setLoading(false)
      setProgress('')
    }
  }

  if (mode === 'import') {
    return (
      <div className="page funnel-new-page">
        <Link href="/funnels" className="back">
          <ArrowLeft size={15} /> Tunnels
        </Link>
        <small>IMPORT PROJET</small>
        <h1>Importer un projet web complet</h1>
        <p className="funnel-new-intro">
          Téléversez un <b>ZIP</b> contenant tout votre site : plusieurs pages HTML, CSS, JavaScript, images,
          vidéos, audio et polices. Conik recrée un tunnel multi-pages avec navigation interne.
        </p>

        {limitBlocked ? <UpgradeRequired feature="Tunnels" requiredPlan="Basic" description={`Vous utilisez déjà ${limitBlocked.current}/${limitBlocked.limit} tunnel(s) autorisé(s) dans votre formule.`} /> : null}
        {importUpgrade ? <UpgradeRequired feature="Import HTML / ZIP" requiredPlan={importUpgrade.plan} description={importUpgrade.description} /> : null}
      <div className="choice funnel-create-card">
          <div className="ico">
            <UploadCloud />
          </div>
          <h2>Projet ZIP</h2>
          <form onSubmit={importProject} className="funnel-create-form">
            <label className="form-label">
              Nom du tunnel
              <input
                className="form-input"
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mon site / offre"
                autoFocus
              />
            </label>

            <label className="form-label">
              Fichier ZIP du projet
              <div
                className="zip-drop"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const f = e.dataTransfer.files?.[0]
                  if (f && fileRef.current) {
                    const dt = new DataTransfer()
                    dt.items.add(f)
                    fileRef.current.files = dt.files
                    setFileName(f.name)
                  }
                }}
              >
                <FileArchive size={22} />
                <span>{fileName || 'Glissez un ZIP ici ou cliquez pour choisir'}</span>
                <small className="muted">Uniquement .zip — max 25 Mo — index.html + pages + assets</small>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                hidden
                onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
              />
            </label>

            {progress && <div className="muted">{progress}</div>}
            {error && <div className="error">{error}</div>}

            <button className="primary create-funnel-button" disabled={loading} type="submit">
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" /> Import en cours…
                </>
              ) : (
                <>
                  <UploadCloud size={16} /> Importer le projet
                </>
              )}
            </button>
          </form>
        </div>

        <p className="muted" style={{ marginTop: 20, maxWidth: 640, lineHeight: 1.6 }}>
          Important : n’importez pas un fichier <code>.json</code> seul. Conik attend un <b>ZIP</b> de site
          web. Si un message parle de JSON, c’est en général une erreur serveur (timeout), pas un défaut de
          votre projet.
        </p>

        <style jsx>{`
          .funnel-new-page {
            width: 100%;
            max-width: 900px;
            min-width: 0;
            overflow-x: hidden;
          }
          .funnel-new-intro {
            max-width: 760px;
            line-height: 1.7;
            margin: 0 0 24px;
          }
          .funnel-create-card {
            width: min(640px, 100%);
            max-width: 100%;
            padding: 28px;
            margin-top: 24px;
            overflow: hidden;
          }
          .funnel-create-form {
            display: grid;
            gap: 14px;
            width: 100%;
            max-width: 100%;
          }
          .funnel-create-form .form-label {
            width: 100%;
            min-width: 0;
          }
          .funnel-create-form .form-input {
            display: block;
            width: 100%;
            min-width: 0;
            min-height: 48px;
          }
          .zip-drop {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 28px 16px;
            border: 1.5px dashed #d1d5db;
            border-radius: 12px;
            background: #fafafa;
            cursor: pointer;
            text-align: center;
            margin-top: 8px;
          }
          .zip-drop:hover {
            border-color: #ea580c;
            background: #fff7ed;
          }
          .create-funnel-button {
            justify-self: start;
            min-height: 46px;
            margin-top: 4px;
            padding-inline: 22px;
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .funnel-create-form .error {
            margin-top: 0;
          }
          @media (max-width: 520px) {
            .funnel-new-page {
              padding: 24px 16px;
            }
            .funnel-create-card {
              padding: 22px;
              margin-top: 20px;
            }
            .create-funnel-button {
              width: 100%;
              margin-top: 5px;
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="page funnel-new-page">
      <Link href="/funnels" className="back">
        <ArrowLeft size={15} /> Tunnels
      </Link>
      <small>NOUVEAU TUNNEL</small>
      <h1>Créer un tunnel</h1>
      <p className="funnel-new-intro">
        Commencez simplement : donnez un nom à votre tunnel. Pour un site multi-pages, utilisez{' '}
        <Link href="/funnels/new?mode=import">Importer un tunnel</Link>.
      </p>
      <div className="choice funnel-create-card">
        <div className="ico">
          <Plus />
        </div>
        <h2>Nom du tunnel</h2>
        <form onSubmit={createFunnel} className="funnel-create-form">
          <label className="form-label">
            Nom du tunnel
            <input
              className="form-input"
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Campagne montres de luxe"
              autoFocus
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary create-funnel-button" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="spin" />
                Création…
              </>
            ) : (
              'Créer le tunnel'
            )}
          </button>
        </form>
      </div>
      <style jsx>{`
        .funnel-new-page {
          width: 100%;
          max-width: 900px;
          min-width: 0;
          overflow-x: hidden;
        }
        .funnel-new-intro {
          max-width: 760px;
          line-height: 1.7;
          margin: 0 0 24px;
        }
        .funnel-create-card {
          width: min(620px, 100%);
          max-width: 100%;
          padding: 28px;
          margin-top: 24px;
          overflow: hidden;
        }
        .funnel-create-form {
          display: grid;
          gap: 14px;
          width: 100%;
          max-width: 100%;
        }
        .funnel-create-form .form-label {
          width: 100%;
          min-width: 0;
        }
        .funnel-create-form .form-input {
          display: block;
          width: 100%;
          min-width: 0;
          min-height: 48px;
        }
        .create-funnel-button {
          justify-self: start;
          min-height: 46px;
          margin-top: 4px;
          padding-inline: 22px;
          white-space: nowrap;
        }
        .funnel-create-form .error {
          margin-top: 0;
        }
      `}</style>
    </div>
  )
}

export default function NewFunnel() {
  return (
    <Suspense fallback={<div className="page" style={{ padding: 40 }}>Chargement…</div>}>
      <NewFunnelInner />
    </Suspense>
  )
}
