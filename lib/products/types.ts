export const PRODUCT_TYPES = ['formation', 'ebook', 'video', 'bundle', 'other'] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

export const PRODUCT_STATUSES = ['draft', 'published', 'archived'] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export const FORMATION_FORMATS = ['video', 'ebook', 'live', 'mixed'] as const
export type FormationFormat = (typeof FORMATION_FORMATS)[number]

export const VIDEO_FORMATS = ['mp4', 'hls', 'youtube', 'vimeo', 'other'] as const
export type VideoFormat = (typeof VIDEO_FORMATS)[number]

export type FormationAttributes = {
  format?: FormationFormat
  modules_count?: number
  duration_hours?: number
  level?: 'debutant' | 'intermediaire' | 'avance' | 'tous'
  language?: string
  includes_certificate?: boolean
  includes_community?: boolean
}

export type EbookAttributes = {
  pages?: number
  format?: 'pdf' | 'epub' | 'mobi' | 'other'
  language?: string
  author?: string
}

export type VideoAttributes = {
  format?: VideoFormat
  duration_minutes?: number
  resolution?: string
  language?: string
}

export type BundleAttributes = {
  items_count?: number
  includes?: string[]
}

export type ProductAttributes =
  | FormationAttributes
  | EbookAttributes
  | VideoAttributes
  | BundleAttributes
  | Record<string, unknown>

export type ProductDelivery = {
  /** Direct file/download URL (ebook, zip, etc.) */
  file_url?: string
  /** Streaming or hosted video URL */
  video_url?: string
  /** External course platform URL */
  course_url?: string
  /** Access instructions shown after payment */
  instructions?: string
}

export type DigitalProduct = {
  id: string
  organization_id: string
  name: string
  slug: string
  description: string | null
  product_type: ProductType
  status: ProductStatus
  currency: string
  price_cents: number
  attributes: ProductAttributes
  delivery: ProductDelivery
  cover_url: string | null
  funnel_id: string | null
  payment_provider_id: string | null
  payment_page_id: string | null
  tariff_id: string | null
  enabled_methods: string[]
  success_message: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  formation: 'Formation',
  ebook: 'E-book',
  video: 'Vidéo',
  bundle: 'Pack / Bundle',
  other: 'Autre produit digital',
}

export const FORMATION_FORMAT_LABELS: Record<FormationFormat, string> = {
  video: 'Formation vidéo',
  ebook: 'Formation e-book',
  live: 'Formation live',
  mixed: 'Formation mixte (vidéo + e-book + live)',
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'produit'
}

export function formatPrice(cents: number, currency: string): string {
  const upper = (currency || 'XOF').toUpperCase()
  if (upper === 'XOF' || upper === 'XAF') {
    return `${Number(cents).toLocaleString('fr-FR')} ${upper}`
  }
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: upper }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${upper}`
  }
}
