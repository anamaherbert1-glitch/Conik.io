import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AdminHomePage() {
  await requirePlatformAdmin()
  const admin = createAdminClient()

  const [orgs, members, funnels, feedback, conikSubs, catalog] = await Promise.all([
    admin.from('organizations').select('id', { count: 'exact', head: true }),
    admin.from('organization_members').select('id', { count: 'exact', head: true }),
    admin.from('funnels').select('id', { count: 'exact', head: true }),
    admin.from('support_feedback').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    admin.from('conik_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('subscription_billing_catalog').select('*').order('product_code'),
  ])

  let authUsersCount = 0
  try {
    const full = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    authUsersCount = full.data?.users?.length || 0
  } catch {
    authUsersCount = members.count || 0
  }

  const stats = [
    { label: 'Comptes (auth)', value: authUsersCount },
    { label: 'Organisations', value: orgs.count || 0 },
    { label: 'Membres', value: members.count || 0 },
    { label: 'Funnels', value: funnels.count || 0 },
    { label: 'Abonnements actifs', value: conikSubs.count || 0 },
    { label: 'Feedback ouverts', value: feedback.count || 0 },
  ]

  return (
    <>
      <h1>Espace administrateur</h1>
      <p className="sub">Pilotage global de Conik.io — mêmes données que l’app utilisateur.</p>

      <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {stats.map((s) => (
          <div key={s.label} className="admin-stat">
            <small>{s.label}</small>
            <b>{s.value}</b>
          </div>
        ))}
      </div>

      <div className="admin-card">
        <h2>Tarifs catalogue</h2>
        {catalog.data && catalog.data.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Plan</th>
                <th>Type</th>
                <th>Prix</th>
                <th>Actif</th>
              </tr>
            </thead>
            <tbody>
              {catalog.data.map((row: Record<string, unknown>) => (
                <tr key={String(row.product_code)}>
                  <td>{String(row.product_code)}</td>
                  <td>{String(row.plan_code)}</td>
                  <td>{String(row.product_type)}</td>
                  <td>
                    {Number(row.price || 0).toLocaleString('fr-FR')} {String(row.currency || 'XOF')}
                    {row.daily_price != null ? ` · ${Number(row.daily_price).toLocaleString('fr-FR')}/j` : ''}
                  </td>
                  <td>
                    <span className={`admin-badge ${row.active ? 'ok' : 'bad'}`}>{row.active ? 'oui' : 'non'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="admin-empty">Aucun tarif. Configure-les dans « Tarifs ».</div>
        )}
      </div>
    </>
  )
}
