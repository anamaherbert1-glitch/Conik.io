'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
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

const WA = {
  green: '#25D366',
  greenDark: '#128C7E',
  greenDeep: '#075E54',
  greenSoft: '#E7F8EF',
  greenBorder: '#A7E9C3',
  text: '#0B141A',
  muted: '#54656F',
  white: '#FFFFFF',
  danger: '#E11D48',
  dangerBg: '#FFF1F2',
}

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
    const data = (await response.json()) as StatusResponse
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
      const data = (await response.json()) as { type?: string; image?: string; message?: string }
      if (data.type === 'qrCode' && data.image) {
        setQr(data.image)
        setQrMessage('Scannez ce QR code avec WhatsApp Business sur le téléphone à connecter.')
      } else if (data.type === 'alreadyLogged') {
        setQr(null)
        setQrMessage('Instance déjà autorisée.')
        await loadStatus()
      } else if (data.message) {
        setQrMessage(data.message)
      }
    } catch {
      setQrMessage('Impossible de charger le QR code pour le moment.')
    } finally {
      qrBusy.current = false
    }
  }, [instance, loadStatus])

  const refresh = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const current = await loadStatus()
      if (current?.status === 'notAuthorized') await loadQr()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de statut.')
    } finally {
      setLoading(false)
    }
  }, [loadQr, loadStatus])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!instance || instance.status !== 'notAuthorized') return
    const timer = setInterval(() => {
      void loadQr()
      void loadStatus()
    }, 8000)
    return () => clearInterval(timer)
  }, [instance, loadQr, loadStatus])

  async function connectInstance() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/whatsapp/green/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idInstance: idInstance.trim(),
          apiTokenInstance: apiTokenInstance.trim(),
          apiUrl: apiUrl.trim(),
          instanceName: instanceName.trim() || undefined,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error((data as { error?: string }).error || 'Connexion GREEN-API impossible.')
      setShowConnect(false)
      setApiTokenInstance('')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible.')
    } finally {
      setBusy(false)
    }
  }

  const status = instance?.status || 'unknown'
  const connected = status === 'authorized'

  const btnPrimary: CSSProperties = {
    background: WA.green,
    color: WA.white,
    border: 'none',
    borderRadius: 10,
    padding: '10px 16px',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    textDecoration: 'none',
  }
  const btnOutline: CSSProperties = {
    background: WA.white,
    color: WA.greenDeep,
    border: `1.5px solid ${WA.greenBorder}`,
    borderRadius: 10,
    padding: '10px 16px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    textDecoration: 'none',
  }
  const inputStyle: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: 10,
    border: `1.5px solid ${WA.greenBorder}`,
    background: WA.white,
    color: WA.text,
    fontSize: 14,
  }
  const card: CSSProperties = {
    background: WA.white,
    border: `1px solid ${WA.greenBorder}`,
    borderRadius: 16,
    padding: 18,
  }

  return (
    <section
      style={{
        display: 'grid',
        gap: 18,
        background: `linear-gradient(180deg, ${WA.greenSoft} 0%, #F7FBF8 40%, transparent 100%)`,
        borderRadius: 20,
        padding: 18,
        border: `1px solid ${WA.greenBorder}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <small style={{ color: WA.greenDark, fontWeight: 700, letterSpacing: 0.4 }}>GREEN-API</small>
          <h2 style={{ margin: '6px 0', color: WA.greenDeep }}>Connecter WhatsApp</h2>
          <p style={{ margin: 0, color: WA.muted, fontSize: 14 }}>
            Vous utilisez votre propre compte GREEN-API. CONIK ne crée pas de compte ou d’instance à votre place.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={btnOutline} onClick={() => void refresh()} disabled={busy || loading}>
            {loading ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />} Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div style={{ ...card, background: WA.dangerBg, borderColor: '#FECDD3', color: WA.danger, fontWeight: 600, fontSize: 14 }}>
          {error}
        </div>
      )}

      {!instance ? (
        <>
          <div style={{ ...card, display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: WA.green,
                  color: WA.white,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Smartphone size={22} />
              </div>
              <div>
                <b style={{ color: WA.greenDeep }}>Vous n’avez pas encore de compte GREEN-API ?</b>
                <p style={{ margin: '6px 0 0', color: WA.muted, fontSize: 13 }}>
                  Créez votre compte directement sur la console GREEN-API, puis créez votre instance WhatsApp.
                </p>
              </div>
            </div>
            <a href={GREEN_API_REGISTER} target="_blank" rel="noreferrer" style={btnPrimary}>
              <ExternalLink size={15} /> Créer mon compte GREEN-API
            </a>
          </div>

          <div style={{ ...card, display: 'grid', gap: 14 }}>
            <div>
              <b style={{ color: WA.greenDeep }}>Vous avez déjà un compte GREEN-API ?</b>
              <p style={{ margin: '6px 0 0', color: WA.muted, fontSize: 13 }}>
                Ouvrez votre console, récupérez l’ID Instance, l’API Token et l’URL API, puis revenez ici pour connecter
                votre WhatsApp.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={GREEN_API_CONSOLE} target="_blank" rel="noreferrer" style={btnOutline}>
                <ExternalLink size={15} /> Ouvrir GREEN-API
              </a>
              <button type="button" style={btnPrimary} onClick={() => setShowConnect((v) => !v)}>
                <Wifi size={15} /> {showConnect ? 'Masquer le formulaire' : 'Connecter mon WhatsApp'}
              </button>
            </div>
          </div>

          {showConnect && (
            <div style={{ ...card, display: 'grid', gap: 12, background: WA.greenSoft }}>
              <h3 style={{ margin: 0, color: WA.greenDeep, fontSize: 16 }}>Informations de votre instance GREEN-API</h3>
              <p style={{ margin: 0, color: WA.muted, fontSize: 13 }}>Ces informations viennent de votre propre console GREEN-API.</p>
              <input style={inputStyle} placeholder="ID Instance (ex. 710722737696)" value={idInstance} onChange={(e) => setIdInstance(e.target.value)} />
              <input style={inputStyle} placeholder="URL API (https://….api.green-api.com)" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
              <input style={inputStyle} placeholder="API Token Instance" value={apiTokenInstance} onChange={(e) => setApiTokenInstance(e.target.value)} type="password" autoComplete="off" />
              <input style={inputStyle} placeholder="Nom de l’instance (facultatif)" value={instanceName} onChange={(e) => setInstanceName(e.target.value)} />
              <button
                type="button"
                style={{ ...btnPrimary, opacity: busy || !idInstance.trim() || !apiTokenInstance.trim() || !apiUrl.trim() ? 0.6 : 1 }}
                onClick={() => void connectInstance()}
                disabled={busy || !idInstance.trim() || !apiTokenInstance.trim() || !apiUrl.trim()}
              >
                {busy ? <Loader2 size={15} className="spin" /> : <Wifi size={15} />}
                {busy ? 'Connexion…' : 'Enregistrer et connecter'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(260px,340px)', gap: 20, alignItems: 'center' }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {connected ? (
                <CheckCircle2 size={24} color={WA.green} />
              ) : status === 'notAuthorized' ? (
                <QrCode size={24} color={WA.greenDark} />
              ) : status === 'unknown' ? (
                <WifiOff size={24} color={WA.muted} />
              ) : (
                <Wifi size={24} color={WA.greenDark} />
              )}
              <div>
                <b style={{ color: WA.greenDeep }}>{statusLabel[status] || status}</b>
                <div style={{ color: WA.muted, fontSize: 13 }}>
                  Instance {instance.idInstance}
                  {instance.wid ? ` · ${instance.wid}` : ''}
                </div>
              </div>
            </div>

            {status === 'notAuthorized' && <div style={{ color: WA.muted, fontSize: 13 }}>{qrMessage || 'Préparation du QR code…'}</div>}

            {connected && (
              <div style={{ ...card, background: WA.greenSoft, borderColor: WA.green }}>
                <b style={{ color: WA.greenDeep }}>Connexion active</b>
                <div style={{ color: WA.muted, fontSize: 13, marginTop: 4 }}>
                  Le numéro WhatsApp peut maintenant être utilisé par les fonctions GREEN-API de CONIK.
                </div>
              </div>
            )}

            {status === 'blocked' && (
              <div style={{ ...card, background: WA.dangerBg, borderColor: '#FECDD3', color: WA.danger }}>
                Le compte WhatsApp associé à cette instance est bloqué. Aucun envoi ne doit être lancé tant que le statut n’est pas rétabli.
              </div>
            )}
          </div>

          <div style={{ ...card, minHeight: 280, display: 'grid', placeItems: 'center', textAlign: 'center', background: connected ? WA.greenSoft : WA.white }}>
            {qr ? (
              <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
                <img src={qr} alt="QR code GREEN-API" style={{ width: 260, maxWidth: '100%', borderRadius: 12, background: '#fff', padding: 10 }} />
                <small style={{ color: WA.muted }}>Le QR code se renouvelle automatiquement.</small>
              </div>
            ) : connected ? (
              <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
                <CheckCircle2 size={44} color={WA.green} />
                <b style={{ color: WA.greenDeep }}>Connecté</b>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
                <QrCode size={44} color={WA.greenDark} />
                <span style={{ color: WA.muted }}>QR code en préparation…</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
