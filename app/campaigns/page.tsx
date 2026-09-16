import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { requireWorkspace } from '@/lib/auth/require-user'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, string> = {
  draft: 'Brouillon',
  active: 'Active',
  paused: 'En pause',
  archived: 'Archivée',
}

const CHANNEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  internal: 'Interne',
}

export default async function CampaignsPage() {
  const { supabase, organization } = await requireWorkspace()
  let { data, error } = await supabase
    .from('campaigns')
    .select('id,name,status,funnel_id,channel,audience,goal,created_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    const fallback = await supabase
      .from('campaigns')
      .select('id,name,status,funnel_id,created_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(100)
    data = fallback.data
    error = fallback.error
  }

  return (
    <AppShell active="Campaigns">
      <header>
        <div>
          <small>CAMPAGNES</small>
          <h1>Campagnes</h1>
          <p className="muted">
            Une campagne = une offre + un tunnel + un public + un message. Préparez-la ici. L’envoi groupé WhatsApp arrivera ensuite.
          </p>
        </div>
        <Link className="primary" href="/campaigns/new">
          Créer une campagne
        </Link>
      </header>

      {error && <div className="error">Impossible de charger les campagnes : {error.message}</div>}

      <section className="panel">
        {data?.length ? (
          <div className="funnel-table">
            {data.map((c: any) => (
              <div className="funnel-row" key={c.id}>
                <div>
                  <b>{c.name || 'Campagne sans titre'}</b>
                  <span>
                    {STATUS[c.status] || c.status}
                    {c.channel ? ` · ${CHANNEL[c.channel] || c.channel}` : ''}
                    {c.funnel_id ? ' · tunnel lié' : ''}
                    {c.goal ? ` · ${c.goal}` : ''}
                  </span>
                </div>
                <Link className="outline" href={`/campaigns/${c.id}`}>
                  Ouvrir
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <b>Aucune campagne pour le moment</b>
            <span>Créez une campagne pour préparer une offre, son tunnel et son message.</span>
          </div>
        )}
      </section>
    </AppShell>
  )
}
