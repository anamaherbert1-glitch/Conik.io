import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { FeedbackActions } from './feedback-actions'

export const dynamic = 'force-dynamic'

export default async function AdminFeedbackPage() {
  await requirePlatformAdmin()
  const admin = createAdminClient()

  const { data: rows, error } = await admin
    .from('support_feedback')
    .select('id, user_email, subject, message, category, status, created_at, organization_id')
    .order('created_at', { ascending: false })
    .limit(150)

  return (
    <>
      <h1>Feedback & support</h1>
      <p className="sub">Messages envoyés depuis Paramètres → Support.</p>
      <div className="admin-card">
        {error && <div className="admin-empty">Table support_feedback indisponible : {error.message}</div>}
        {!error && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>E-mail</th>
                <th>Sujet</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Message</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((r) => (
                <tr key={r.id}>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleString('fr-FR') : '—'}</td>
                  <td>{r.user_email || '—'}</td>
                  <td>
                    <strong>{r.subject}</strong>
                  </td>
                  <td>
                    <span className="admin-badge">{r.category}</span>
                  </td>
                  <td>
                    <span className={`admin-badge ${r.status === 'open' ? 'warn' : 'ok'}`}>{r.status}</span>
                  </td>
                  <td style={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>{r.message}</td>
                  <td>
                    <FeedbackActions id={r.id} status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!error && (!rows || rows.length === 0) && <div className="admin-empty">Aucun feedback pour le moment.</div>}
      </div>
    </>
  )
}
