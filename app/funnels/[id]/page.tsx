import Link from 'next/link'
import { ArrowLeft, Globe2, Pencil, UserRoundPlus, UploadCloud, CreditCard } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FunnelDeleteButton } from '@/components/funnel-delete-button'
import { CopyPageLink } from '@/components/copy-page-link'

export const dynamic = 'force-dynamic'

const STATUS_FR: Record<string, string> = { draft: 'brouillon', published: 'publié', archived: 'archivé' }
const SOURCE_FR: Record<string, string> = { imported: 'importé', ai_generated: 'généré par IA', manual: 'manuel' }

export default async function FunnelDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims) redirect('/login')
  const { data: funnel, error: funnelError } = await supabase
    .from('funnels')
    .select('id,name,slug,status,source,created_at,capture_enabled,capture_delay_ms,capture_html,payment_enabled,payment_html')
    .eq('id', id)
    .single()
  if (funnelError || !funnel) notFound()
  const { data: pages, error: pagesError } = await supabase
    .from('funnel_pages')
    .select('id,name,slug,page_type,published_version_id,position')
    .eq('funnel_id', id)
    .order('position')
  if (pagesError) {
    return (
      <div className="page">
        <p className="error">Impossible de charger les pages du tunnel.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <Link href="/funnels" className="back">
        <ArrowLeft size={15} />
        Tunnels
      </Link>

      <div className="head">
        <div>
          <small>TUNNEL</small>
          <h1>{funnel.name}</h1>
          <p>
            /{funnel.slug} · {STATUS_FR[funnel.status] ?? funnel.status} · source :{' '}
            {SOURCE_FR[funnel.source] ?? funnel.source}
          </p>
        </div>
        <div className="button-row">
          <Link className="outline" href={`/funnels/${id}/capture`}>
            <UserRoundPlus size={15} />
            Page de capture
          </Link>
          <Link className="outline" href={`/funnels/${id}/payment`}>
            <CreditCard size={15} />
            Page de paiement
          </Link>
          <Link className="outline" href={`/funnels/${id}/editor`}>
            <Pencil size={15} />
            Ouvrir l’éditeur
          </Link>
          {funnel.status === 'published' && (
            <a className="outline" href={`/${funnel.slug}`} target="_blank" rel="noreferrer">
              <Globe2 size={15} />
              Voir le tunnel public
            </a>
          )}
          <FunnelDeleteButton funnelId={id} />
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="section-head">
          <div>
            <h3 style={{ marginBottom: 4 }}>Page d’accueil de capture</h3>
            <span className="muted">Cette capture est affichée avant la première page réelle du tunnel.</span>
          </div>
          <span className={`status ${funnel.capture_enabled && funnel.capture_html ? 'published' : 'draft'}`}>
            {funnel.capture_enabled && funnel.capture_html ? 'Activée' : 'Non configurée'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <b>{funnel.capture_html ? 'Un HTML de capture est déjà importé.' : 'Aucun fichier HTML de capture importé.'}</b>
            <span className="muted" style={{ display: 'block', marginTop: 4 }}>
              {funnel.capture_html
                ? `Délai : ${Math.max(1, Math.round((funnel.capture_delay_ms || 5000) / 1000))} seconde(s)`
                : 'Importez votre fichier HTML pour commencer.'}
            </span>
          </div>
          <Link className="primary" href={`/funnels/${id}/capture`}>
            <UploadCloud size={16} />
            {funnel.capture_html ? 'Modifier / remplacer la capture' : 'Importer le HTML de capture'}
          </Link>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="section-head">
          <div>
            <h3 style={{ marginBottom: 4 }}>Page de paiement</h3>
            <span className="muted">
              Import HTML + tarifs avec liens à coller sur les boutons produits. Prestataire obligatoire.
            </span>
          </div>
          <span className={`status ${funnel.payment_enabled && funnel.payment_html ? 'published' : 'draft'}`}>
            {funnel.payment_enabled && funnel.payment_html ? 'Activée' : 'Non configurée'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <b>{funnel.payment_html ? 'Page de paiement configurée.' : 'Aucune page de paiement.'}</b>
            <span className="muted" style={{ display: 'block', marginTop: 4 }}>
              Créez des tarifs (2500, 5000…) puis copiez chaque lien sur le bouton du produit.
            </span>
          </div>
          <Link className="primary" href={`/funnels/${id}/payment`}>
            <CreditCard size={16} />
            Configurer le paiement
          </Link>
        </div>
      </div>

      <div className="panel">
        <div className="section-head">
          <div>
            <h3>Pages</h3>
            <span className="muted" style={{ display: 'block', marginTop: 4 }}>
              Chaque page a un lien public. Ouvre l’éditeur pour importer le HTML, détecter les boutons et définir les redirections.
            </span>
          </div>
          <span className="muted">{pages?.length || 0} page(s)</span>
        </div>

        {pages?.length ? (
          <div className="funnel-table">
            {pages.map((page) => {
              const publicPath = `/${funnel.slug}/${page.slug}`
              return (
                <div className="funnel-row" key={page.id} style={{ flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <b>
                      Page {page.position + 1} — {page.name}
                    </b>
                    <span style={{ display: 'block', marginTop: 4, fontSize: 13, wordBreak: 'break-all' }}>
                      {publicPath}
                    </span>
                  </div>
                  <span className={`status ${page.published_version_id ? 'published' : 'draft'}`}>
                    {page.published_version_id ? 'Publiée' : 'Brouillon'}
                  </span>
                  <div className="button-row" style={{ flexWrap: 'wrap' }}>
                    <CopyPageLink path={publicPath} />
                    <Link className="outline" href={`/funnels/${id}/editor`}>
                      <Pencil size={14} />
                      Éditer + redirections
                    </Link>
                    {page.published_version_id && (
                      <a className="outline" href={publicPath} target="_blank" rel="noreferrer">
                        <Globe2 size={14} />
                        Ouvrir
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty">
            <b>Aucune page pour le moment</b>
            <span>Ouvrez l’éditeur pour créer votre première page, importer le HTML et configurer les redirections des boutons.</span>
            <Link className="primary" href={`/funnels/${id}/editor`}>
              Créer la première page
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
