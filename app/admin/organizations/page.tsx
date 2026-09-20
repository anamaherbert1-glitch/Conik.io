import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AdminOrgsPage() {
  await requirePlatformAdmin()
  const admin = createAdminClient()

  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const { data: members } = await admin.from('organization_members').select('organization_id, role, user_id')
  const { data: funnels } = await admin.from('funnels').select('organization_id, id, status')

  const memberCount = new Map<string, number>()
  const funnelCount = new Map<string, number>()
  for (const m of members || []) memberCount.set(m.organization_id, (memberCount.get(m.organization_id) || 0) + 1)
  for (const f of funnels || []) funnelCount.set(f.organization_id, (funnelCount.get(f.organization_id) || 0) + 1)

  return (
    <>
      <h1>Organisations</h1>
      <p className="sub">Espaces de travail créés sur Conik.</p>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Slug</th>
              <th>Membres</th>
              <th>Funnels</th>
              <th>Créée</th>
            </tr>
          </thead>
          <tbody>
            {(orgs || []).map((o) => (
              <tr key={o.id}>
                <td>
                  <strong>{o.name}</strong>
                </td>
                <td>{o.slug}</td>
                <td>{memberCount.get(o.id) || 0}</td>
                <td>{funnelCount.get(o.id) || 0}</td>
                <td>{o.created_at ? new Date(o.created_at).toLocaleDateString('fr-FR') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!orgs || orgs.length === 0) && <div className="admin-empty">Aucune organisation.</div>}
      </div>
    </>
  )
}
