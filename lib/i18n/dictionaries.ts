export type Locale = 'fr' | 'en' | 'ar' | 'zh'
export type Theme = 'light' | 'dark' | 'system'

export const locales: { code: Locale; label: string; native: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'fr', label: 'French', native: 'Français', dir: 'ltr' },
  { code: 'en', label: 'English', native: 'English', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl' },
  { code: 'zh', label: 'Chinese', native: '中文', dir: 'ltr' },
]

const dict = {
  fr: {
    brand: 'Conik.io',
    tagline: 'Marketing OS',
    workspace: 'Espace de travail',
    nav: {
      Dashboard: 'Tableau de bord',
      Funnels: 'Funnels',
      Contacts: 'Contacts',
      Campaigns: 'Campagnes',
      Automations: 'Automatisations',
      WhatsApp: 'WhatsApp',
      Integrations: 'Intégrations',
      Links: 'Liens',
      Analytics: 'Analytique',
      Domains: 'Domaines',
      Settings: 'Paramètres',
      Logout: 'Déconnexion',
    },
    settings: {
      title: 'Paramètres de l’espace de travail',
      subtitle: 'Apparence, langue et informations de l’organisation.',
      orgName: 'Nom de l’entreprise',
      email: 'E-mail du compte',
      theme: 'Thème',
      themeLight: 'Clair',
      themeDark: 'Sombre',
      themeSystem: 'Système',
      language: 'Langue',
      save: 'Enregistrer les paramètres',
      saving: 'Enregistrement…',
      saved: 'Paramètres enregistrés.',
      sessionExpired: 'Session expirée. Veuillez vous reconnecter.',
      workspaceMissing: 'Espace de travail introuvable.',
    },
  },
  en: {
    brand: 'Conik.io',
    tagline: 'Marketing OS',
    workspace: 'Workspace',
    nav: {
      Dashboard: 'Dashboard',
      Funnels: 'Funnels',
      Contacts: 'Contacts',
      Campaigns: 'Campaigns',
      Automations: 'Automations',
      WhatsApp: 'WhatsApp',
      Integrations: 'Integrations',
      Links: 'Links',
      Analytics: 'Analytics',
      Domains: 'Domains',
      Settings: 'Settings',
      Logout: 'Log out',
    },
    settings: {
      title: 'Workspace settings',
      subtitle: 'Appearance, language and organization details.',
      orgName: 'Company name',
      email: 'Account email',
      theme: 'Theme',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeSystem: 'System',
      language: 'Language',
      save: 'Save settings',
      saving: 'Saving…',
      saved: 'Settings saved.',
      sessionExpired: 'Session expired. Please sign in again.',
      workspaceMissing: 'Workspace not found.',
    },
  },
  ar: {
    brand: 'Conik.io',
    tagline: 'نظام التسويق',
    workspace: 'مساحة العمل',
    nav: {
      Dashboard: 'لوحة التحكم',
      Funnels: 'القمع',
      Contacts: 'جهات الاتصال',
      Campaigns: 'الحملات',
      Automations: 'الأتمتة',
      WhatsApp: 'واتساب',
      Integrations: 'التكاملات',
      Links: 'الروابط',
      Analytics: 'التحليلات',
      Domains: 'النطاقات',
      Settings: 'الإعدادات',
      Logout: 'تسجيل الخروج',
    },
    settings: {
      title: 'إعدادات مساحة العمل',
      subtitle: 'المظهر واللغة ومعلومات المؤسسة.',
      orgName: 'اسم الشركة',
      email: 'البريد الإلكتروني',
      theme: 'السمة',
      themeLight: 'فاتح',
      themeDark: 'داكن',
      themeSystem: 'النظام',
      language: 'اللغة',
      save: 'حفظ الإعدادات',
      saving: 'جاري الحفظ…',
      saved: 'تم حفظ الإعدادات.',
      sessionExpired: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.',
      workspaceMissing: 'مساحة العمل غير موجودة.',
    },
  },
  zh: {
    brand: 'Conik.io',
    tagline: '营销操作系统',
    workspace: '工作区',
    nav: {
      Dashboard: '仪表盘',
      Funnels: '漏斗',
      Contacts: '联系人',
      Campaigns: '活动',
      Automations: '自动化',
      WhatsApp: 'WhatsApp',
      Integrations: '集成',
      Links: '链接',
      Analytics: '分析',
      Domains: '域名',
      Settings: '设置',
      Logout: '退出登录',
    },
    settings: {
      title: '工作区设置',
      subtitle: '外观、语言与组织信息。',
      orgName: '公司名称',
      email: '账户邮箱',
      theme: '主题',
      themeLight: '浅色',
      themeDark: '深色',
      themeSystem: '跟随系统',
      language: '语言',
      save: '保存设置',
      saving: '保存中…',
      saved: '设置已保存。',
      sessionExpired: '会话已过期，请重新登录。',
      workspaceMissing: '未找到工作区。',
    },
  },
} as const

/** Structural type so FR/EN/AR/ZH are all assignable */
export type Dictionary = {
  brand: string
  tagline: string
  workspace: string
  nav: Record<keyof (typeof dict)['fr']['nav'], string>
  settings: Record<keyof (typeof dict)['fr']['settings'], string>
}

export function getDictionary(locale: Locale): Dictionary {
  return (dict[locale] || dict.fr) as Dictionary
}
