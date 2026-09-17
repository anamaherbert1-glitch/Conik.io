'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, ExternalLink, Loader2, QrCode, RefreshCw, Smartphone, Wifi, WifiOff } from 'lucide-react'

type GreenInstance = {
  id: string
  idInstance: string
  status: string
  wid?: string | null
  instanceName?: string | null
}

type StatusResponse = {
  ok: boolean
  connected: boolean
  error?: string
  instance: GreenInstance | null
}

const statusLabel: Record<string, string> = {
  notAuthorized: 'En attente du QR code',
  authorized: 'WhatsApp connecté',
  blocked: 'Compte bloqué',
  starting: 'Démarrage de l’instance',
  yellow: 'Connexion limitée',
  red: 'Connexion suspendue',
  unknown: 'Statut inconnu',
}

const GREEN_API_CONSOLE = 'https://console.green-api.com/'
const GREEN_API_REGISTER = 'https://console.green-api.com/registration'

export function WhatsAppGreenApi() {
  const [instance, setInstance] = useState<GreenInstance | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [qrMessage, setQrMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showConnect, setShowConnect] = useState(false)
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [apiUrl, setApiUrl] = useState('https://api.green-api.com')
  const [instanceName, setInstanceName] = useState('')
  const qrBusy = useRef(false)

  const loadStatus = useCallback(async () => {
    const response = await fetch('/api/whatsapp/green/status', { cache: 'no-store' })
    const data = await response.json() as StatusResponse
    if (!response.ok && !data.instance) throw new Error(data.error || 'Impossible de récupérer le statut GREEN-API.')
    setInstance(data.instance)
    if (data.connected) setQr(null)
    return data.instance
  }, [])

  const loadQr = useCallback(async () => {
    if (qrBusy.current || !instance || instance.status !== 'notAuthorized') return
    qrBusy.current = true
    try {
      const response = await fetch('/api/whatsapp/green/qr', { cache: 'no-store' })
      const data = await response.json() as { type?: string; image?: string; message?: string }
      if (data.type === 'qrCode' && data.image) {
        setQr(data.image)
        setQrMessage('Scannez ce QR code avec WhatsApp Business sur le téléphone à connecter.')
      } else if (data.type === 'alreadyLogged') {
        setQr(null)
        setQrMessage('WhatsApp est déjà autorisé. Actualisation du statut…')
      } else {
        setQr(null)
        setQrMessage(data.message || 'QR code temporairement indisponible.')
      }
    } catch (e) {
      setQrMessage(e instanceof Error ? e.message : 'QR code indisponible.')
    } finally {
      qrBusy.current = false
    }
  }, [instance])

  const refresh = useCallback(async () => {
    setError('')
    try { await loadStatus() } catch (e) { setError(e instanceof Error ? e.message : 'Impossible de charger GREEN-API.') }
  }, [loadStatus])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadStatus().catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Impossible de charger GREEN-API.') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [loadStatus])

  useEffect(() => {
    if (!instance || instance.status === 'authorized') return
    const timer = window.setInterval(() => { loadStatus().catch(() => undefined) }, 5000)
    return () => window.clearInterval(timer)
  }, [instance, loadStatus])

  useEffect(() => {
    if (!instance || instance.status !== 'notAuthorized') return
    loadQr()
    const timer = window.setInterval(loadQr, 2000)
    return () => window.clearInterval(timer)
  }, [instance, loadQr])

  async function connectInstance() {
    setBusy(true)
    setError('')
    setQr(null)
    setQrMessage('Vérification de l’instance GREEN-API…')
    try {
      const response = await fetch('/api/whatsapp/green/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idInstance, apiTokenInstance, apiUrl, instanceName }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Impossible de connecter l’instance GREEN-API.')
      setInstance({
        id: data.instance.id,
        idInstance: String(data.instance.idInstance),
        status: data.instance.status,
        instanceName: data.instance.instanceName,
      })
      setShowConnect(false)
      setApiTokenInstance('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de connecter l’instance GREEN-API.')
    } finally {
      setBusy(false)
    }
  }

  const status = instance?.status || ''

  return <section className="panel" style={{ display: 'grid', gap: 18 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div>
        <small>GREEN-API</small>
        <h2 style={{ margin: '6px 0' }}>Connecter WhatsApp</h2>
        <p className="muted">Vous utilisez votre propre compte GREEN-API. CONIK ne crée pas de compte ou d’instance à votre place.</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="button" onClick={refresh} disabled={busy || loading}><RefreshCw size={15}/> Actualiser</button>
      </div>
    </div>

    {error && <div className="panel" style={{ borderColor: 'var(--danger, #dc2626)' }}>{error}</div>}

    {loading ? <div className="empty"><Loader2 size={24} className="spin"/><span>Chargement de la connexion GREEN-API…</span></div> : !instance ? <>
      <div className="panel" style={{ display: 'grid', gap: 14 }}>
        <div>
          <b>Vous n’avez pas encore de compte GREEN-API ?</b>
          <div className="muted">Créez votre compte directement sur la console GREEN-API, puis créez votre instance WhatsApp.</div>
        </div>
        <a className="button primary" href={GREEN_API_REGISTER} target="_blank" rel="noreferrer">
          <ExternalLink size={15}/> Créer mon compte GREEN-API
        </a>
      </div>

      <div className="panel" style={{ display: 'grid', gap: 14 }}>
        <div>
          <b>Vous avez déjà un compte GREEN-API ?</b>
          <div className="muted">Ouvrez votre console, récupérez l’ID Instance, l’API Token et l’URL API, puis revenez ici pour connecter votre WhatsApp.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a className="button" href={GREEN_API_CONSOLE} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Ouvrir GREEN-API</a>
          <button className="button primary" onClick={() => setShowConnect((value) => !value)} disabled={busy}><Smartphone size={15}/> Connecter mon WhatsApp</button>
        </div>
      </div>

      {showConnect && <div className="panel" style={{ display: 'grid', gap: 12 }}>
        <div><b>Informations de votre instance GREEN-API</b><div className="muted">Ces informations viennent de votre propre console GREEN-API.</div></div>
        <input className="input" placeholder="ID Instance" value={idInstance} onChange={(event) => setIdInstance(event.target.value)} inputMode="numeric" />
        <input className="input" placeholder="API URL" value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} />
        <input className="input" placeholder="API Token Instance" value={apiTokenInstance} onChange={(event) => setApiTokenInstance(event.target.value)} type="password" autoComplete="off" />
        <input className="input" placeholder="Nom de l’instance (facultatif)" value={instanceName} onChange={(event) => setInstanceName(event.target.value)} />
        <button className="button primary" onClick={connectInstance} disabled={busy || !idInstance.trim() || !apiTokenInstance.trim() || !apiUrl.trim()}>{busy ? <Loader2 size={15} className="spin"/> : <Wifi size={15}/>} {busy ? 'Connexion…' : 'Enregistrer et connecter'}</button>
      </div>}
    </> : <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(260px,340px)', gap: 20, alignItems: 'center' }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{status === 'authorized' ? <CheckCircle2 size={24}/> : status === 'notAuthorized' ? <QrCode size={24}/> : status === 'unknown' ? <WifiOff size={24}/> : <Wifi size={24}/>}<div><b>{statusLabel[status] || status}</b><div className="muted">Instance {instance.idInstance}{instance.wid ? ` · ${instance.wid}` : ''}</div></div></div>
        {status === 'notAuthorized' && <div className="muted">{qrMessage || 'Préparation du QR code…'}</div>}
        {status === 'authorized' && <div className="panel"><b>Connexion active</b><div className="muted">Le numéro WhatsApp peut maintenant être utilisé par les fonctions GREEN-API de CONIK.</div></div>}
        {status === 'blocked' && <div className="panel">Le compte WhatsApp associé à cette instance est bloqué. Aucun envoi ne doit être lancé tant que le statut n’est pas rétabli.</div>}
      </div>
      <div className="panel" style={{ minHeight: 280, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        {qr ? <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}><img src={qr} alt="QR code GREEN-API" style={{ width: 260, maxWidth: '100%', borderRadius: 12, background: '#fff', padding: 10 }}/><small className="muted">Le QR code se renouvelle automatiquement.</small></div> : status === 'authorized' ? <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}><CheckCircle2 size={44}/><b>Connecté</b></div> : <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}><QrCode size={44}/><span className="muted">QR code en préparation…</span></div>}
      </div>
    </div>}
  </section>
}
