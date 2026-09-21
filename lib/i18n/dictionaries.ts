export type Locale = 'fr' | 'en' | 'ar' | 'zh'
export type Theme = 'light' | 'dark' | 'system'
export const locales: { code: Locale; native: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'fr', native: 'Français', dir: 'ltr' },
  { code: 'en', native: 'English', dir: 'ltr' },
  { code: 'ar', native: 'العربية', dir: 'rtl' },
  { code: 'zh', native: '中文', dir: 'ltr' },
]

const frNav = {
  Dashboard: 'Tableau de bord',
  Funnels: 'Tunnels',
  Contacts: 'Contacts',
  Campaigns: 'Campagnes',
  Automations: 'Automatisations',
  'Live Events': 'Lives',
  WhatsApp: 'WhatsApp',
  Integrations: 'Intégrations',
  Tutorial: 'Tutoriel',
  Links: 'Liens',
  Revenus: 'Revenus',
  Analytics: 'Analytics',
  Domains: 'Domaines',
  Settings: 'Paramètres',
  Logout: 'Déconnexion',
  Subscriptions: 'Abonnements',
  Performance: 'Performance',
  Upgrade: 'Passer au niveau supérieur',
} as const

const enNav = {
  Dashboard: 'Dashboard',
  Funnels: 'Funnels',
  Contacts: 'Contacts',
  Campaigns: 'Campaigns',
  Automations: 'Automations',
  'Live Events': 'Live Events',
  WhatsApp: 'WhatsApp',
  Integrations: 'Integrations',
  Tutorial: 'Tutorial',
  Links: 'Links',
  Revenus: 'Revenue',
  Analytics: 'Analytics',
  Domains: 'Domains',
  Settings: 'Settings',
  Logout: 'Log out',
  Subscriptions: 'Subscriptions',
  Performance: 'Performance',
  Upgrade: 'Upgrade plan',
} as const

const arNav = {
  Dashboard: 'لوحة التحكم',
  Funnels: 'القمع',
  Contacts: 'جهات الاتصال',
  Campaigns: 'الحملات',
  Automations: 'الأتمتة',
  'Live Events': 'الأحداث المباشرة',
  WhatsApp: 'واتساب',
  Integrations: 'التكاملات',
  Tutorial: 'دليل',
  Links: 'الروابط',
  Revenus: 'الإيرادات',
  Analytics: 'التحليلات',
  Domains: 'النطاقات',
  Settings: 'الإعدادات',
  Logout: 'تسجيل الخروج',
  Subscriptions: 'الاشتراكات',
  Performance: 'الأداء',
  Upgrade: 'الترقية إلى خطة أعلى',
} as const

const zhNav = {
  Dashboard: '仪表盘',
  Funnels: '漏斗',
  Contacts: '联系人',
  Campaigns: '活动',
  Automations: '自动化',
  'Live Events': '直播活动',
  WhatsApp: 'WhatsApp',
  Integrations: '集成',
  Tutorial: '教程',
  Links: '链接',
  Revenus: '收入',
  Analytics: '分析',
  Domains: '域名',
  Settings: '设置',
  Logout: '退出登录',
  Subscriptions: '订阅',
  Performance: '效果',
  Upgrade: '升级套餐',
} as const

const frSettings = {
  title: 'Paramètres',
  subtitle: 'Mon profil, collaboration, tutoriel et support.',
  orgName: 'Nom de l’entreprise',
  email: 'E-mail du compte',
  theme: 'Thème',
  themeLight: 'Clair',
  themeDark: 'Sombre',
  themeSystem: 'Système',
  language: 'Langue',
  save: 'Enregistrer',
  saving: 'Enregistrement…',
  saved: 'Profil enregistré.',
  sessionExpired: 'Session expirée. Reconnectez-vous.',
  workspaceMissing: 'Espace de travail introuvable.',
  profile: 'Mon profil',
  collaboration: 'Collaboration',
  tutorial: 'Tutoriel',
  support: 'Support & feedback',
  appearance: 'Apparence',
}

const enSettings = {
  title: 'Settings',
  subtitle: 'Profile, collaboration, tutorial and support.',
  orgName: 'Company name',
  email: 'Account email',
  theme: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',
  language: 'Language',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Profile saved.',
  sessionExpired: 'Session expired. Please sign in again.',
  workspaceMissing: 'Workspace not found.',
  profile: 'My profile',
  collaboration: 'Collaboration',
  tutorial: 'Tutorial',
  support: 'Support & feedback',
  appearance: 'Appearance',
}

const arSettings = {
  title: 'الإعدادات',
  subtitle: 'الملف الشخصي والتعاون والدليل والدعم.',
  orgName: 'اسم الشركة',
  email: 'البريد الإلكتروني',
  theme: 'السمة',
  themeLight: 'فاتح',
  themeDark: 'داكن',
  themeSystem: 'النظام',
  language: 'اللغة',
  save: 'حفظ',
  saving: 'جاري الحفظ…',
  saved: 'تم حفظ الملف الشخصي.',
  sessionExpired: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.',
  workspaceMissing: 'مساحة العمل غير موجودة.',
  profile: 'ملفي الشخصي',
  collaboration: 'التعاون',
  tutorial: 'الدليل',
  support: 'الدعم والملاحظات',
  appearance: 'المظهر',
}

const zhSettings = {
  title: '设置',
  subtitle: '个人资料、协作、教程与支持。',
  orgName: '公司名称',
  email: '账户邮箱',
  theme: '主题',
  themeLight: '浅色',
  themeDark: '深色',
  themeSystem: '跟随系统',
  language: '语言',
  save: '保存',
  saving: '保存中…',
  saved: '个人资料已保存。',
  sessionExpired: '会话已过期，请重新登录。',
  workspaceMissing: '未找到工作区。',
  profile: '我的资料',
  collaboration: '协作',
  tutorial: '教程',
  support: '支持与反馈',
  appearance: '外观',
}

export const dict = {
  fr: { brand: 'Conik.io', tagline: 'Marketing OS', workspace: 'Espace de travail', nav: frNav, settings: frSettings },
  en: { brand: 'Conik.io', tagline: 'Marketing OS', workspace: 'Workspace', nav: enNav, settings: enSettings },
  ar: { brand: 'Conik.io', tagline: 'نظام التسويق', workspace: 'مساحة العمل', nav: arNav, settings: arSettings },
  zh: { brand: 'Conik.io', tagline: '营销操作系统', workspace: '工作区', nav: zhNav, settings: zhSettings },
}

export type Dictionary = {
  brand: string
  tagline: string
  workspace: string
  nav: Record<keyof typeof frNav, string>
  settings: Record<keyof typeof frSettings, string>
}

export function getDictionary(locale: Locale): Dictionary {
  return (dict[locale] || dict.fr) as Dictionary
}
