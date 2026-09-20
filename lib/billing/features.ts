import type { PlanCode } from '@/lib/billing/plans'
import { getPlan } from '@/lib/billing/plans'

/** Fonctionnalités verrouillables + plan minimum requis */
export type FeatureKey =
  | 'whatsapp'
  | 'customDomain'
  | 'removeBranding'
  | 'automations'
  | 'live'
  | 'payments'
  | 'advancedAnalytics'
  | 'team'
  | 'dataExport'
  | 'importZip'
  | 'products'

export const FEATURE_META: Record<
  FeatureKey,
  { title: string; description: string; minPlan: PlanCode; check: (plan: PlanCode) => boolean }
> = {
  whatsapp: {
    title: 'WhatsApp / Green API',
    description: 'Connectez WhatsApp pour automatiser vos messages et conversations.',
    minPlan: 'premium',
    check: (p) => getPlan(p).limits.whatsapp,
  },
  customDomain: {
    title: 'Domaine personnalisé',
    description: 'Publiez vos tunnels sur votre propre nom de domaine.',
    minPlan: 'premium',
    check: (p) => getPlan(p).limits.customDomain,
  },
  removeBranding: {
    title: 'Sans branding Conik',
    description: 'Retirez le filigrane « Made with Conik » de vos pages publiées.',
    minPlan: 'premium',
    check: (p) => getPlan(p).limits.removeBranding,
  },
  automations: {
    title: 'Automatisations',
    description: 'Créez des scénarios automatiques (e-mails, actions, déclencheurs).',
    minPlan: 'premium',
    check: (p) => getPlan(p).limits.automations !== 'none',
  },
  live: {
    title: 'Live streaming',
    description: 'Organisez des lives et co-animations avec votre audience.',
    minPlan: 'premium',
    check: (p) => getPlan(p).limits.live,
  },
  payments: {
    title: 'Paiements',
    description: 'Acceptez les paiements via les prestataires connectés (CinetPay, FedaPay…).',
    minPlan: 'basic',
    check: (p) => getPlan(p).limits.payments !== 'none',
  },
  advancedAnalytics: {
    title: 'Analytics avancés',
    description: 'Rapports détaillés, exports et insights de performance.',
    minPlan: 'premium',
    check: (p) => getPlan(p).limits.analytics === 'advanced' || getPlan(p).limits.advancedReports,
  },
  team: {
    title: 'Collaboration d’équipe',
    description: 'Invitez des collaborateurs et gérez les rôles sur votre espace.',
    minPlan: 'premium',
    check: (p) => getPlan(p).limits.teamSeats > 1,
  },
  dataExport: {
    title: 'Export des données',
    description: 'Exportez contacts, ventes et rapports au format CSV / Excel.',
    minPlan: 'business',
    check: (p) => getPlan(p).limits.dataExport,
  },
  importZip: {
    title: 'Import projet ZIP',
    description: 'Importez un site HTML complet (pages, CSS, JS, médias) en un fichier ZIP.',
    minPlan: 'basic',
    check: (p) => getPlan(p).limits.importZip,
  },
  products: {
    title: 'Produits / offres',
    description: 'Créez et vendez des produits ou offres dans vos tunnels.',
    minPlan: 'basic',
    check: (p) => getPlan(p).limits.products > 0,
  },
}

export function planRank(code: PlanCode): number {
  return { free: 0, basic: 1, premium: 2, business: 3 }[code] ?? 0
}

export function nextPlan(code: PlanCode): PlanCode | null {
  if (code === 'free') return 'basic'
  if (code === 'basic') return 'premium'
  if (code === 'premium') return 'business'
  return null
}
