import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { PricingForm } from './pricing-form'

export const dynamic = 'force-dynamic'

export default async function AdminPricingPage() {
  await requirePlatformAdmin()
  const admin = createAdminClient()

  const { data: catalog } = await admin.from('subscription_billing_catalog').select('*').order('product_code')

  const defaults = [
    { product_code: 'conik_basic', plan_code: 'basic', product_type: 'conik', price: 0, daily_price: null, currency: 'XOF', active: true },
    { product_code: 'conik_premium', plan_code: 'premium', product_type: 'conik', price: 0, daily_price: null, currency: 'XOF', active: true },
    { product_code: 'whatsapp_basic', plan_code: 'basic', product_type: 'whatsapp', price: 0, daily_price: 0, currency: 'XOF', active: true },
    { product_code: 'whatsapp_premium', plan_code: 'premium', product_type: 'whatsapp', price: 0, daily_price: 0, currency: 'XOF', active: true },
  ]

  const rows = catalog && catalog.length > 0 ? catalog : defaults

  return (
    <>
      <h1>Tarifs des abonnements</h1>
      <p className="sub">Modifie les prix affichés et facturés dans Conik (catalogue partagé).</p>
      <div className="admin-card">
        <PricingForm initial={rows as Array<Record<string, unknown>>} />
      </div>
    </>
  )
}
