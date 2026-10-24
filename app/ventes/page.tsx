import Link from 'next/link'
import { BookOpen, Film, GraduationCap, Package, Plus, ShoppingBag } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { requireWorkspace } from '@/lib/auth/require-user'
import { PRODUCT_TYPE_LABELS, formatPrice, type ProductType } from '@/lib/products/types'

export const dynamic = 'force-dynamic'

const STATUS_FR: Record<string, string> = {
  draft: 'brouillon',
  published: 'publié',
  archived: 'archivé',
}

const TYPE_ICON: Record<ProductType, React.ElementType> = {
  formation: GraduationCap,
  ebook: BookOpen,
  video: Film,
  bundle: Package,
  other: ShoppingBag,
}

export default async function VentesPage() {
  const { supabase, organization } = await requireWorkspace()
  const { data: products, error } = await supabase
    .from('digital_products')
    .select('id,name,slug,product_type,status,currency,price_cents,updated_at')
    .eq('organization_id', organization.id)
    .order('updated_at', { ascending: false })

  return (
    <AppShell active="Ventes">
      <header>
        <div>
          <small>ESPACE DE VENTE</small>
          <h1>Vos produits</h1>
          <p className="muted">
            Vendez formations, e-books, vidéos et packs. Associez un tunnel, configurez le paiement et partagez un lien.
          </p>
        </div>
        <Link className="primary" href="/ventes/new">
          <Plus size={17} /> Ajouter un produit
        </Link>
      </header>

      {error && (
        <div className="error">
          Impossible de charger les produits : {error.message}. Vérifiez que la migration digital_products a été appliquée.
        </div>
      )}

      <div className="choices">
        <div className="choice">
          <div className="ico">
            <GraduationCap />
          </div>
          <h2>Formation</h2>
          <p>Vidéo, e-book, live ou mixte — avec modules, durée et niveau.</p>
          <Link className="outline" href="/ventes/new?type=formation">
            <Plus size={15} /> Créer une formation
          </Link>
        </div>
        <div className="choice">
          <div className="ico">
            <BookOpen />
          </div>
          <h2>E-book</h2>
          <p>PDF ou ePub livré automatiquement après paiement.</p>
          <Link className="outline" href="/ventes/new?type=ebook">
            <Plus size={15} /> Créer un e-book
          </Link>
        </div>
        <div className="choice">
          <div className="ico">
            <Film />
          </div>
          <h2>Vidéo</h2>
          <p>Format, durée, résolution — accès après achat.</p>
          <Link className="outline" href="/ventes/new?type=video">
            <Plus size={15} /> Créer une vidéo
          </Link>
        </div>
      </div>

      <section className="panel funnel-list">
        <div className="section-head">
          <h3>Produits de l’espace de vente</h3>
          <span>{products?.length ?? 0} au total</span>
        </div>
        {products && products.length > 0 ? (
          <div className="funnel-table">
            {products.map((p) => {
              const Icon = TYPE_ICON[(p.product_type as ProductType) || 'other'] || ShoppingBag
              return (
                <div className="funnel-row" key={p.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 240px', minWidth: 0 }}>
                    <span className="ico" style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 10, background: 'var(--panel-2, #f3f4f6)' }}>
                      <Icon size={18} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <b>{p.name}</b>
                      <span>
                        {PRODUCT_TYPE_LABELS[(p.product_type as ProductType) || 'other']} · /p/{p.slug} ·{' '}
                        {formatPrice(p.price_cents, p.currency)}
                      </span>
                    </div>
                  </div>
                  <span className={`status ${p.status}`}>{STATUS_FR[p.status] ?? p.status}</span>
                  <Link className="outline" href={`/ventes/${p.id}`}>
                    Configurer
                  </Link>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="emptybox">
            <b>Aucun produit pour le moment</b>
            <p>Ajoutez une formation, un e-book ou une vidéo. Vous pourrez ensuite l’associer à un tunnel et partager le lien de vente.</p>
            <Link className="primary" href="/ventes/new" style={{ marginTop: 12, display: 'inline-flex' }}>
              <Plus size={16} /> Ajouter un produit
            </Link>
          </div>
        )}
      </section>
    </AppShell>
  )
}
