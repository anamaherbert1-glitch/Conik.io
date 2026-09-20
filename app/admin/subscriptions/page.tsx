import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSubscriptionActions } from './actions-client'

export const dynamic = 'force-dynamic'

export default async function AdminSubscriptionsPage() {
  await requirePlatformAdmin()
  const admin = createAdminClient()

  const [{ data: conik }, { data: whatsapp }] = await Promise.all([
    admin
      .from('conik_subscriptions')
      .select('id, organization_id, user_id, plan_code, status, amount, currency, starts_at, ends_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('whatsapp_subscriptions')
      .select('id, organization_id, user_id, plan_code, status, amount, currency, starts_at, ends_at, days_purchased, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const { data: orgs } = await admin.from('organizations').select('id, name')
  const orgName = new Map((orgs || []).map((o) => [o.id, o.name]))

  return (
    <>
      <h1>Abonnements</h1>
      <p className="sub">Abonnements Conik et WhatsApp — données live du backend.</p>

      <div className="admin-card">
        <h2>Conik</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Plan</th>
              <th>Statut</th>
              <th>Montant</th>
              <th>Période</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(conik || []).map((s) => (
              <tr key={s.id}>
                <td>{orgName.get(s.organization_id) || s.organization_id.slice(0, 8)}</td>
                <td>
                  <span className="admin-badge">{s.plan_code}</span>
                </td>
                <td>
                  <span className={`admin-badge ${s.status === 'active' ? 'ok' : 'warn'}`}>{s.status}</span>
                </td>
                <td>
                  {Number(s.amount || 0).toLocaleString('fr-FR')} {s.currency || 'XOF'}
                </td>
                <td>
                  {s.starts_at ? new Date(s.starts_at).toLocaleDateString('fr-FR') : '—'} →{' '}
                  {s.ends_at ? new Date(s.ends_at).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td>
                  <AdminSubscriptionActions id={s.id} table="conik_subscriptions" status={s.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!conik || conik.length === 0) && <div className="admin-empty">Aucun abonnement Conik.</div>}
      </div>

      <div className="admin-card">
        <h2>WhatsApp</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Plan</th>
              <th>Jours</th>
              <th>Statut</th>
              <th>Montant</th>
              <th>Fin</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(whatsapp || []).map((s) => (
              <tr key={s.id}>
                <td>{orgName.get(s.organization_id) || s.organization_id.slice(0, 8)}</td>
                <td>
                  <span className="admin-badge">{s.plan_code}</span>
                </td>
                <td>{s.days_purchased ?? '—'}</td>
                <td>
                  <span className={`admin-badge ${s.status === 'active' ? 'ok' : 'warn'}`}>{s.status}</span>
                </td>
                <td>
                  {Number(s.amount || 0).toLocaleString('fr-FR')} {s.currency || 'XOF'}
                </td>
                <td>{s.ends_at ? new Date(s.ends_at).toLocaleDateString('fr-FR') : '—'}</td>
                <td>
                  <AdminSubscriptionActions id={s.id} table="whatsapp_subscriptions" status={s.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!whatsapp || whatsapp.length === 0) && <div className="admin-empty">Aucun abonnement WhatsApp.</div>}
      </div>
    </>
  )
}
