'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CreditCard, MessageSquare, Sparkles } from 'lucide-react'
import { SettingsMcp } from '@/components/settings-mcp'
import { PaymentProvidersPanel } from '@/components/payment-providers-panel'

type Provider = { id: string; provider: string; label: string; status: string; created_at: string }

const TABS = [
  { id: 'payments', label: 'Moyens de paiement', icon: CreditCard, href: '/integrations?tab=payments' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, href: '/integrations?tab=whatsapp' },
  { id: 'mcp', label: 'MCP', icon: Sparkles, href: '/integrations?tab=mcp' },
] as const

export function IntegrationsHub({
  paymentProviders,
  paymentsError,
}: {
  paymentProviders: Provider[]
  paymentsError?: string | null
}) {
  const search = useSearchParams()
  const tab = (search.get('tab') || 'payments').toLowerCase()
  const active = TABS.some((t) => t.id === tab) ? tab : 'payments'

  return (
    <>
      <nav className="integrations-tabs" aria-label="Int\u00e9grations">
        {TABS.map((t) => {
          const Icon = t.icon
          const isActive = active === t.id
          return (
            <Link
              key={t.id}
              href={t.href}
              className={isActive ? 'integrations-tab active' : 'integrations-tab'}
            >
              <Icon size={16} />
              {t.label}
            </Link>
          )
        })}
      </nav>

      {active === 'payments' && (
        <section>
          {paymentsError && (
            <div className="notice" style={{ marginBottom: 12 }}>
              Tables paiement non install\u00e9es. Ex\u00e9cutez dans Supabase :{' '}
              <code>20260916120000_payment_pages.sql</code> puis{' '}
              <code>20260916130000_payment_providers_expand.sql</code>.
            </div>
          )}
          <PaymentProvidersPanel initial={paymentProviders} />
        </section>
      )}

      {active === 'whatsapp' && (
        <section className="panel" style={{ display: 'grid', gap: 14, padding: 22 }}>
          <div>
            <h2 style={{ margin: '0 0 6px' }}>WhatsApp Business</h2>
            <p className="muted" style={{ margin: 0 }}>
              Connectez Meta ou Green API, g\u00e9rez conversations, templates et campagnes.
            </p>
          </div>
          <div className="button-row">
            <Link className="primary" href="/whatsapp">
              Ouvrir WhatsApp
            </Link>
            <Link className="outline" href="/whatsapp/conversations">
              Conversations
            </Link>
            <Link className="outline" href="/whatsapp/campaigns">
              Campagnes
            </Link>
            <Link className="outline" href="/whatsapp/templates">
              Templates
            </Link>
          </div>
        </section>
      )}

      {active === 'mcp' && (
        <section>
          <SettingsMcp />
        </section>
      )}

      <style jsx global>{`
        .integrations-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 18px;
          padding: 4px;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: var(--panel);
        }
        .integrations-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--muted);
          text-decoration: none;
        }
        .integrations-tab:hover {
          color: var(--ink);
          background: color-mix(in srgb, var(--ink) 6%, transparent);
        }
        .integrations-tab.active {
          color: var(--ink);
          background: color-mix(in srgb, var(--accent, #6366f1) 16%, transparent);
        }
      `}</style>
    </>
  )
}
