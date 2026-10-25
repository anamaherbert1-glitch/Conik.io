'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, KeyRound, Plug, RefreshCw, Trash2, Sparkles } from 'lucide-react'

type McpKey = {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

export function SettingsMcp() {
  const [keys, setKeys] = useState<McpKey[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('Assistant IA')
  const [secret, setSecret] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://conik-io.vercel.app'
  const endpoint = `${baseUrl}/api/mcp`

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/mcp/keys')
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(j.error || 'Impossible de charger les cl\u00e9s MCP.')
        setKeys([])
      } else {
        setKeys((j.keys || []).filter((k: McpKey) => !k.revoked_at))
      }
    } catch {
      setError('Erreur r\u00e9seau.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const cursorConfig = useMemo(() => {
    return JSON.stringify(
      {
        mcpServers: {
          conik: {
            url: endpoint,
            headers: {
              Authorization: `Bearer ${secret || 'cnk_VOTRE_CLE'}`,
            },
          },
        },
      },
      null,
      2,
    )
  }, [endpoint, secret])

  const claudeHint = useMemo(() => {
    return `# Conik MCP\nURL: ${endpoint}\nHeader: Authorization: Bearer ${secret || 'cnk_VOTRE_CLE'}\n\nOutils:\n- get_workspace_summary\n- list_products / create_product\n- list_funnels / create_funnel\n- list_contacts / create_contact\n- list_links / create_link`
  }, [endpoint, secret])

  async function createKey() {
    setBusy(true)
    setMsg('')
    setError('')
    setSecret(null)
    const r = await fetch('/api/mcp/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || 'Assistant IA', scopes: ['read', 'write'] }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'Cr\u00e9ation impossible.')
    else {
      setSecret(j.secret)
      setMsg(j.warning || 'Cl\u00e9 cr\u00e9\u00e9e. Copiez-la maintenant.')
      await load()
    }
    setBusy(false)
  }

  async function revokeKey(id: string) {
    if (!confirm('R\u00e9voquer cette cl\u00e9 MCP ?')) return
    setBusy(true)
    const r = await fetch(`/api/mcp/keys?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'R\u00e9vocation impossible.')
    else {
      setMsg('Cl\u00e9 r\u00e9voqu\u00e9e.')
      await load()
    }
    setBusy(false)
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text)
    setMsg('Copi\u00e9 dans le presse-papiers.')
  }

  return (
    <section className="panel settings-section">
      <div className="section-head" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plug size={18} /> Conik MCP
          </h2>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            Connectez ChatGPT, Claude, Cursor ou une autre IA \u00e0 votre espace Conik pour cr\u00e9er des produits,
            tunnels, contacts et liens.
          </p>
        </div>
      </div>

      <div className="grid" style={{ gap: 14 }}>
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} /> Opportunit\u00e9s avec le MCP
          </h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)', fontSize: 14, lineHeight: 1.55 }}>
            <li>L\u2019IA cr\u00e9e des <b>produits / offres</b> et les publie dans Conik</li>
            <li>G\u00e9n\u00e9ration et organisation de <b>tunnels</b> (funnels) de vente</li>
            <li>Ajout et recherche de <b>contacts</b> CRM</li>
            <li>Cr\u00e9ation de <b>liens track\u00e9s</b> vers vos pages</li>
            <li>R\u00e9sum\u00e9 de l\u2019espace (compteurs) pour pilotage par conversation</li>
          </ul>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={16} /> Cl\u00e9s d\u2019acc\u00e8s
          </h3>
          <div className="form-grid" style={{ marginBottom: 12 }}>
            <label className="form-label">
              Nom de la cl\u00e9
              <input
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Assistant IA, Cursor, Claude\u2026"
              />
            </label>
          </div>
          <div className="button-row">
            <button type="button" className="primary" disabled={busy} onClick={() => void createKey()}>
              G\u00e9n\u00e9rer une cl\u00e9 MCP
            </button>
            <button type="button" className="outline" disabled={loading} onClick={() => void load()}>
              <RefreshCw size={14} /> Actualiser
            </button>
          </div>

          {secret && (
            <div className="notice" style={{ marginTop: 14 }}>
              <b>Cl\u00e9 secr\u00e8te (une seule fois)</b>
              <code style={{ display: 'block', marginTop: 8, wordBreak: 'break-all', fontSize: 12 }}>{secret}</code>
              <button type="button" className="outline" style={{ marginTop: 8 }} onClick={() => copy(secret)}>
                <Copy size={14} /> Copier la cl\u00e9
              </button>
            </div>
          )}

          {msg && <p className="muted" style={{ marginTop: 10 }}>{msg}</p>}
          {error && <p className="error" style={{ marginTop: 10 }}>{error}</p>}

          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            {loading && <p className="muted">Chargement\u2026</p>}
            {!loading && keys.length === 0 && (
              <p className="muted">Aucune cl\u00e9 active. G\u00e9n\u00e9rez-en une pour connecter une IA.</p>
            )}
            {keys.map((k) => (
              <div
                key={k.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'center',
                  padding: '10px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <b style={{ display: 'block' }}>{k.name}</b>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {k.key_prefix}\u2026 \u00b7 {k.scopes?.join(', ')}
                    {k.last_used_at
                      ? ` \u00b7 utilis\u00e9e ${new Date(k.last_used_at).toLocaleString('fr-FR')}`
                      : ' \u00b7 jamais utilis\u00e9e'}
                  </span>
                </div>
                <button type="button" className="outline" onClick={() => void revokeKey(k.id)} disabled={busy}>
                  <Trash2 size={14} /> R\u00e9voquer
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 8px' }}>Endpoint MCP</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            URL \u00e0 brancher dans votre client IA (HTTP / Streamable MCP) :
          </p>
          <code style={{ display: 'block', wordBreak: 'break-all', fontSize: 13, marginBottom: 8 }}>{endpoint}</code>
          <button type="button" className="outline" onClick={() => copy(endpoint)}>
            <Copy size={14} /> Copier l\u2019URL
          </button>

          <h3 style={{ margin: '18px 0 8px' }}>Exemple config (Cursor / clients HTTP)</h3>
          <pre
            style={{
              margin: 0,
              padding: 12,
              borderRadius: 10,
              background: 'var(--code-bg, var(--input-bg))',
              border: '1px solid var(--line)',
              fontSize: 11,
              overflow: 'auto',
              maxHeight: 220,
            }}
          >
            {cursorConfig}
          </pre>
          <button type="button" className="outline" style={{ marginTop: 8 }} onClick={() => copy(cursorConfig)}>
            <Copy size={14} /> Copier la config
          </button>

          <h3 style={{ margin: '18px 0 8px' }}>Aide connexion</h3>
          <pre
            style={{
              margin: 0,
              padding: 12,
              borderRadius: 10,
              background: 'var(--code-bg, var(--input-bg))',
              border: '1px solid var(--line)',
              fontSize: 11,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {claudeHint}
          </pre>
        </div>
      </div>
    </section>
  )
}
