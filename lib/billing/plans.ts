/** Catalogue d’offres Conik — source de vérité UI + limites */

export type PlanCode = 'free' | 'basic' | 'premium' | 'business'

export type PlanLimits = {
  tunnels: number
  pagesPerTunnel: number
  importsHtmlPerMonth: number
  importZip: boolean
  importMaxMb: number
  storageMb: number
  customDomain: boolean
  removeBranding: boolean
  analytics: 'basic' | 'standard' | 'advanced'
  payments: 'none' | 'limited' | 'advanced'
  products: number
  whatsapp: boolean
  automations: 'none' | 'limited' | 'advanced'
  emailsPerMonth: number
  contacts: number
  live: boolean
  liveCohosts: number
  teamSeats: number
  dataExport: boolean
  advancedReports: boolean
  support: 'standard' | 'priority' | 'dedicated'
}

export type PlanDefinition = {
  code: PlanCode
  name: string
  tagline: string
  priceMonthlyXof: number
  highlighted?: boolean
  limits: PlanLimits
}

export const PLANS: PlanDefinition[] = [
  {
    code: 'free',
    name: 'Free',
    tagline: 'Découvrir Conik',
    priceMonthlyXof: 0,
    limits: {
      tunnels: 1,
      pagesPerTunnel: 3,
      importsHtmlPerMonth: 1,
      importZip: false,
      importMaxMb: 5,
      storageMb: 100,
      customDomain: false,
      removeBranding: false,
      analytics: 'basic',
      payments: 'none',
      products: 0,
      whatsapp: false,
      automations: 'none',
      emailsPerMonth: 0,
      contacts: 100,
      live: false,
      liveCohosts: 0,
      teamSeats: 1,
      dataExport: false,
      advancedReports: false,
      support: 'standard',
    },
  },
  {
    code: 'basic',
    name: 'Basic',
    tagline: 'Petit créateur',
    priceMonthlyXof: 15000,
    limits: {
      tunnels: 5,
      pagesPerTunnel: 10,
      importsHtmlPerMonth: 10,
      importZip: true,
      importMaxMb: 25,
      storageMb: 1024,
      customDomain: false,
      removeBranding: false,
      analytics: 'standard',
      payments: 'limited',
      products: 3,
      whatsapp: false,
      automations: 'none',
      emailsPerMonth: 500,
      contacts: 2000,
      live: false,
      liveCohosts: 0,
      teamSeats: 1,
      dataExport: false,
      advancedReports: false,
      support: 'standard',
    },
  },
  {
    code: 'premium',
    name: 'Premium',
    tagline: 'Business avancé',
    priceMonthlyXof: 45000,
    highlighted: true,
    limits: {
      tunnels: 20,
      pagesPerTunnel: 50,
      importsHtmlPerMonth: 50,
      importZip: true,
      importMaxMb: 100,
      storageMb: 10240,
      customDomain: true,
      removeBranding: true,
      analytics: 'advanced',
      payments: 'advanced',
      products: 20,
      whatsapp: true,
      automations: 'limited',
      emailsPerMonth: 5000,
      contacts: 10000,
      live: true,
      liveCohosts: 3,
      teamSeats: 3,
      dataExport: true,
      advancedReports: true,
      support: 'priority',
    },
  },
  {
    code: 'business',
    name: 'Business',
    tagline: 'Agences & équipes',
    priceMonthlyXof: 99000,
    limits: {
      tunnels: 100,
      pagesPerTunnel: 100,
      importsHtmlPerMonth: 200,
      importZip: true,
      importMaxMb: 200,
      storageMb: 51200,
      customDomain: true,
      removeBranding: true,
      analytics: 'advanced',
      payments: 'advanced',
      products: 100,
      whatsapp: true,
      automations: 'advanced',
      emailsPerMonth: 25000,
      contacts: 50000,
      live: true,
      liveCohosts: 10,
      teamSeats: 15,
      dataExport: true,
      advancedReports: true,
      support: 'dedicated',
    },
  },
]

export function getPlan(code: PlanCode | string | null | undefined) {
  return PLANS.find((p) => p.code === code) || PLANS[0]
}

export function formatStorage(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} Go`
  return `${mb} Mo`
}

export const PLAN_COMPARISON_ROWS: Array<{
  key: string
  label: string
  value: (p: PlanDefinition) => string
}> = [
  { key: 'tunnels', label: 'Tunnels', value: (p) => String(p.limits.tunnels) },
  { key: 'pages', label: 'Pages / tunnel', value: (p) => String(p.limits.pagesPerTunnel) },
  { key: 'import', label: 'Import HTML / mois', value: (p) => String(p.limits.importsHtmlPerMonth) },
  { key: 'zip', label: 'Import ZIP', value: (p) => (p.limits.importZip ? 'Oui' : 'Non') },
  { key: 'size', label: 'Taille import', value: (p) => `${p.limits.importMaxMb} Mo` },
  { key: 'storage', label: 'Stockage', value: (p) => formatStorage(p.limits.storageMb) },
  { key: 'domain', label: 'Domaine personnalisé', value: (p) => (p.limits.customDomain ? 'Oui' : 'Non') },
  { key: 'brand', label: 'Sans branding Conik', value: (p) => (p.limits.removeBranding ? 'Oui' : 'Non') },
  {
    key: 'pay',
    label: 'Paiements',
    value: (p) =>
      p.limits.payments === 'none' ? 'Non' : p.limits.payments === 'limited' ? 'Limité' : 'Avancé',
  },
  { key: 'products', label: 'Produits / offres', value: (p) => String(p.limits.products) },
  { key: 'wa', label: 'WhatsApp', value: (p) => (p.limits.whatsapp ? 'Oui' : 'Non') },
  {
    key: 'auto',
    label: 'Automatisations',
    value: (p) =>
      p.limits.automations === 'none' ? 'Non' : p.limits.automations === 'limited' ? 'Limitées' : 'Avancées',
  },
  { key: 'email', label: 'E-mails / mois', value: (p) => String(p.limits.emailsPerMonth) },
  { key: 'contacts', label: 'Contacts', value: (p) => p.limits.contacts.toLocaleString('fr-FR') },
  { key: 'live', label: 'Live', value: (p) => (p.limits.live ? 'Oui' : 'Non') },
  { key: 'team', label: 'Équipe', value: (p) => String(p.limits.teamSeats) },
  { key: 'export', label: 'Export données', value: (p) => (p.limits.dataExport ? 'Oui' : 'Non') },
]
