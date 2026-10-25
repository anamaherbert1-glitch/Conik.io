import Link from 'next/link'
import { Plus, ShoppingBag } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { requireWorkspace } from '@/lib/auth/require-user'
import { formatPrice } from '@/lib/products/types'

export const dynamic = 'force-dynamic'

const STATUS_FR: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publi\u00e9',
  archived: 'Archiv\u00e9',
}

export default async function VentesPage() {
  const { supabase, organization } = await requireWorkspace()
  const { data: products } = await supabase
    .from('digital_products')
    .select('id,name,slug,product_type,status,currency,price_cents,updated_at')
    .eq('organization_id', organization.id)
    .order('updated_at', { ascending: false })

  const list = products || []

  return (
    <AppShell active="Ventes">
      <header>
        <div>
          <h1>Produits</h1>
          <p className="muted">Catalogue de vos offres digitales. Liez-les ensuite \u00e0 un tunnel pour vendre.</p>
        </div>
        <Link className="primary" href="/ventes/new">
          <Plus size={17} /> Ajouter un produit
        </Link>
      </header>

      {list.length === 0 ? (
        <section className="panel emptybox" style={{ textAlign: 'center', padding: 48 }}>
          <ShoppingBag size={36} style={{ opacity: 0.45, marginBottom: 12 }} />
          <h2 style={{ margin: '0 0 8px' }}>Aucun produit</h2>
          <p className="muted" style={{ marginBottom: 18 }}>
            Cr\u00e9ez votre premi\u00e8re offre, t\u00e9l\u00e9versez le fichier et d\u00e9finissez le prix.
          </p>
          <Link className="primary" href="/ventes/new">
            <Plus size={16} /> Ajouter un produit
          </Link>
        </section>
      ) : (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="funnel-table">
            {list.map((p) => (
              <Link
                key={p.id}
                href={`/ventes/${p.id}`}
                className="funnel-row"
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 12,
                  padding: '14px 18px',
                }}
              >
                <div>
                  <b>{p.name}</b>
                  <span className="muted" style={{ display: 'block', fontSize: 12 }}>
                    {formatPrice(p.price_cents || 0, p.currency || 'XOF')}
                  </span>
                </div>
                <span className={`status ${p.status === 'published' ? 'published' : ''}`}>
                  {STATUS_FR[p.status] || p.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  )
}
