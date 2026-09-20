import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  await requirePlatformAdmin()
  const admin = createAdminClient()

  let users: Array<{
    id: string
    email?: string
    created_at?: string
    last_sign_in_at?: string
    email_confirmed_at?: string
    user_metadata?: Record<string, unknown>
  }> = []

  try {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (error) throw error
    users = data.users || []
  } catch (e) {
    return (
      <>
        <h1>Utilisateurs</h1>
        <p className="sub">Comptes connectés à Conik (Supabase Auth).</p>
        <div className="admin-card">
          <div className="admin-empty">
            Impossible de lister les utilisateurs. Vérifie SUPABASE_SERVICE_ROLE_KEY sur Vercel.
            <br />
            {e instanceof Error ? e.message : ''}
          </div>
        </div>
      </>
    )
  }

  const { data: memberships } = await admin
    .from('organization_members')
    .select('user_id, role, organization_id, organizations(name, slug)')

  const byUser = new Map<string, Array<{ role: string; org: string }>>()
  for (const m of memberships || []) {
    const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations
    const list = byUser.get(m.user_id) || []
    list.push({ role: m.role, org: (org as { name?: string } | null)?.name || m.organization_id })
    byUser.set(m.user_id, list)
  }

  return (
    <>
      <h1>Utilisateurs</h1>
      <p className="sub">{users.length} compte(s) — e-mails connectés à la plateforme.</p>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>E-mail</th>
              <th>Nom</th>
              <th>Créé</th>
              <th>Dernière connexion</th>
              <th>Organisations</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.email || '—'}</strong>
                  {!u.email_confirmed_at && (
                    <>
                      {' '}
                      <span className="admin-badge warn">non confirmé</span>
                    </>
                  )}
                </td>
                <td>{String(u.user_metadata?.full_name || u.user_metadata?.name || '—')}</td>
                <td>{u.created_at ? new Date(u.created_at).toLocaleString('fr-FR') : '—'}</td>
                <td>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('fr-FR') : '—'}</td>
                <td>
                  {(byUser.get(u.id) || []).map((x, i) => (
                    <div key={i}>
                      {x.org} <span className="admin-badge">{x.role}</span>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="admin-empty">Aucun utilisateur.</div>}
      </div>
    </>
  )
}
