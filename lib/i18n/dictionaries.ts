export type Locale = 'fr' | 'en' | 'ar' | 'zh'
export type Theme = 'light' | 'dark' | 'system'

export const locales: { code: Locale; native: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'fr', native: 'Français', dir: 'ltr' },
  { code: 'en', native: 'English', dir: 'ltr' },
  { code: 'ar', native: 'العربية', dir: 'rtl' },
  { code: 'zh', native: '中文', dir: 'ltr' },
]

const frNav = {
  Dashboard: 'Tableau de bord', Funnels: 'Tunnels', Contacts: 'Contacts', Campaigns: 'Campagnes',
  Automations: 'Automatisations', 'Live Events': 'Lives', WhatsApp: 'WhatsApp', Integrations: 'Intégrations',
  Tutorial: 'Tutoriel', Links: 'Liens', Revenus: 'Revenus', Analytics: 'Analytics', Domains: 'Domaines',
  Settings: 'Paramètres', Logout: 'Déconnexion', Subscriptions: 'Abonnements', Performance: 'Performance', Upgrade: 'Passer au niveau supérieur',
} as const
const enNav = {
  Dashboard: 'Dashboard', Funnels: 'Funnels', Contacts: 'Contacts', Campaigns: 'Campaigns',
  Automations: 'Automations', 'Live Events': 'Live Events', WhatsApp: 'WhatsApp', Integrations: 'Integrations',
  Tutorial: 'Tutorial', Links: 'Links', Revenus: 'Revenue', Analytics: 'Analytics', Domains: 'Domains',
  Settings: 'Settings', Logout: 'Log out', Subscriptions: 'Subscriptions', Performance: 'Performance', Upgrade: 'Upgrade',
} as const
const arNav = {
  Dashboard: 'لوحة التحكم', Funnels: 'القمع', Contacts: 'جهات الاتصال', Campaigns: 'الحملات',
  Automations: 'الأتمتة', 'Live Events': 'الأحداث المباشرة', WhatsApp: 'واتساب', Integrations: 'التكاملات',
  Tutorial: 'الدليل', Links: 'الروابط', Revenus: 'الإيرادات', Analytics: 'التحليلات', Domains: 'النطاقات',
  Settings: 'الإعدادات', Logout: 'تسجيل الخروج', Subscriptions: 'الاشتراكات', Performance: 'الأداء', Upgrade: 'الترقية',
} as const
const zhNav = {
  Dashboard: '仪表盘', Funnels: '漏斗', Contacts: '联系人', Campaigns: '活动',
  Automations: '自动化', 'Live Events': '直播活动', WhatsApp: 'WhatsApp', Integrations: '集成',
  Tutorial: '教程', Links: '链接', Revenus: '收入', Analytics: '分析', Domains: '域名',
  Settings: '设置', Logout: '退出登录', Subscriptions: '订阅', Performance: '效果', Upgrade: '升级',
} as const

const common = {
  fr: {
    close: 'Fermer', open: 'Ouvrir', menu: 'Menu', integrations: 'Intégrations', paymentSolutions: 'Solutions de paiement',
    freeTrial: '14 jours d’essai gratuit', trial: 'Essai', save: 'Enregistrer', saving: 'Enregistrement…',
    sent: 'Envoyé', cancel: 'Annuler', remove: 'Retirer', invite: 'Inviter', sending: 'Envoi…',
    chooseCountry: 'Choisir un pays', searchCountry: 'Rechercher un pays ou un indicatif…',
    phonePrefixHint: 'L’indicatif sera ajouté automatiquement au téléphone.', language: 'Langue',
    system: 'Système', light: 'Clair', dark: 'Sombre', choosePhoto: 'Choisir une photo',
    takePhoto: 'Prendre une photo', importing: 'Import…', fullName: 'Nom complet', country: 'Pays',
    phone: 'Téléphone', city: 'Ville', company: 'Entreprise', workspaceName: 'Nom de l’espace de travail',
    profilePhoto: 'Photo de profil', importPhotoHint: 'Importez une image directement depuis votre téléphone.',
    saveProfile: 'Enregistrer le profil', support: 'Support & feedback', type: 'Type', subject: 'Sujet',
    message: 'Message', sendSupport: 'Envoyer au support', bug: 'Bug', idea: 'Idée', question: 'Question', other: 'Autre',
    collaboration: 'Collaboration', inviteHint: 'Invitez des collaborateurs sur votre espace. L’organisateur principal garde le contrôle et peut retirer un accès à tout moment.',
    collaboratorEmail: 'E-mail du collaborateur', role: 'Rôle', activeTeam: 'Équipe active', noMembers: 'Aucun membre listé.',
    pendingInvites: 'Invitations en attente', noPending: 'Aucune invitation en attente.', chooseRole: 'Choisir un rôle',
    permissionsHint: 'Définit les permissions du collaborateur.', admin: 'Administrateur', editor: 'Éditeur', viewer: 'Lecteur',
    adminHint: 'Gère l’équipe, les intégrations et la facturation.', editorHint: 'Crée et modifie les tunnels, campagnes et contenus.', viewerHint: 'Consulte les données sans pouvoir modifier.',
    tutorial: 'Tutoriel', tutorialHint: 'Apprenez à créer un tunnel, importer un site HTML, connecter un paiement et publier.', openGuide: 'Ouvrir le guide complet',
    featureUnavailable: 'Fonctionnalité non disponible', notAvailableInPlan: 'n’est pas disponible dans votre formule actuelle.', minimumPlan: 'Niveau minimum requis', upgradeTo: 'Upgrade vers',
  },
  en: {
    close: 'Close', open: 'Open', menu: 'Menu', integrations: 'Integrations', paymentSolutions: 'Payment solutions',
    freeTrial: '14-day free trial', trial: 'Trial', save: 'Save', saving: 'Saving…', sent: 'Sent', cancel: 'Cancel',
    remove: 'Remove', invite: 'Invite', sending: 'Sending…', chooseCountry: 'Choose a country',
    searchCountry: 'Search for a country or calling code…', phonePrefixHint: 'The calling code will be added automatically to the phone number.',
    language: 'Language', system: 'System', light: 'Light', dark: 'Dark', choosePhoto: 'Choose a photo',
    takePhoto: 'Take a photo', importing: 'Import…', fullName: 'Full name', country: 'Country', phone: 'Phone',
    city: 'City', company: 'Company', workspaceName: 'Workspace name', profilePhoto: 'Profile photo',
    importPhotoHint: 'Import an image directly from your phone.', saveProfile: 'Save profile',
    support: 'Support & feedback', type: 'Type', subject: 'Subject', message: 'Message', sendSupport: 'Send to support',
    bug: 'Bug', idea: 'Idea', question: 'Question', other: 'Other', collaboration: 'Collaboration',
    inviteHint: 'Invite collaborators to your workspace. The main organizer keeps control and can revoke access at any time.',
    collaboratorEmail: 'Collaborator email', role: 'Role', activeTeam: 'Active team', noMembers: 'No members listed.',
    pendingInvites: 'Pending invitations', noPending: 'No pending invitations.', chooseRole: 'Choose a role',
    permissionsHint: 'Defines the collaborator’s permissions.', admin: 'Administrator', editor: 'Editor', viewer: 'Viewer',
    adminHint: 'Manages the team, integrations and billing.', editorHint: 'Creates and edits funnels, campaigns and content.', viewerHint: 'Can view data but cannot edit.',
    tutorial: 'Tutorial', tutorialHint: 'Learn how to create a funnel, import an HTML site, connect a payment method and publish.', openGuide: 'Open full guide',
    featureUnavailable: 'Feature unavailable', notAvailableInPlan: 'is not available on your current plan.', minimumPlan: 'Minimum required plan', upgradeTo: 'Upgrade to',
  },
  ar: {
    close: 'إغلاق', open: 'فتح', menu: 'القائمة', integrations: 'التكاملات', paymentSolutions: 'حلول الدفع',
    freeTrial: 'تجربة مجانية لمدة 14 يومًا', trial: 'تجربة', save: 'حفظ', saving: 'جارٍ الحفظ…', sent: 'تم الإرسال',
    cancel: 'إلغاء', remove: 'إزالة', invite: 'دعوة', sending: 'جارٍ الإرسال…', chooseCountry: 'اختر دولة',
    searchCountry: 'ابحث عن دولة أو رمز اتصال…', phonePrefixHint: 'سيُضاف رمز الاتصال تلقائيًا إلى رقم الهاتف.',
    language: 'اللغة', system: 'النظام', light: 'فاتح', dark: 'داكن', choosePhoto: 'اختيار صورة',
    takePhoto: 'التقاط صورة', importing: 'جارٍ الاستيراد…', fullName: 'الاسم الكامل', country: 'الدولة', phone: 'الهاتف',
    city: 'المدينة', company: 'الشركة', workspaceName: 'اسم مساحة العمل', profilePhoto: 'صورة الملف الشخصي',
    importPhotoHint: 'استورد صورة مباشرة من هاتفك.', saveProfile: 'حفظ الملف الشخصي', support: 'الدعم والملاحظات',
    type: 'النوع', subject: 'الموضوع', message: 'الرسالة', sendSupport: 'إرسال إلى الدعم', bug: 'خطأ', idea: 'فكرة',
    question: 'سؤال', other: 'أخرى', collaboration: 'التعاون', inviteHint: 'ادعُ المتعاونين إلى مساحة عملك. يحتفظ المنظم الرئيسي بالتحكم ويمكنه إلغاء الوصول في أي وقت.',
    collaboratorEmail: 'البريد الإلكتروني للمتعاون', role: 'الدور', activeTeam: 'الفريق النشط', noMembers: 'لا يوجد أعضاء.',
    pendingInvites: 'الدعوات المعلقة', noPending: 'لا توجد دعوات معلقة.', chooseRole: 'اختر دورًا',
    permissionsHint: 'يحدد صلاحيات المتعاون.', admin: 'مسؤول', editor: 'محرر', viewer: 'مشاهد',
    adminHint: 'يدير الفريق والتكاملات والفوترة.', editorHint: 'ينشئ ويعدل القمع والحملات والمحتوى.', viewerHint: 'يمكنه عرض البيانات دون تعديلها.',
    tutorial: 'الدليل', tutorialHint: 'تعلم إنشاء قمع واستيراد موقع HTML وربط الدفع والنشر.', openGuide: 'فتح الدليل الكامل',
    featureUnavailable: 'الميزة غير متاحة', notAvailableInPlan: 'غير متاحة في خطتك الحالية.', minimumPlan: 'الحد الأدنى المطلوب',
    upgradeTo: 'الترقية إلى',
  },
  zh: {
    close: '关闭', open: '打开', menu: '菜单', integrations: '集成', paymentSolutions: '支付方案',
    freeTrial: '14天免费试用', trial: '试用', save: '保存', saving: '保存中…', sent: '已发送', cancel: '取消',
    remove: '移除', invite: '邀请', sending: '发送中…', chooseCountry: '选择国家', searchCountry: '搜索国家或区号…',
    phonePrefixHint: '区号会自动添加到电话号码。', language: '语言', system: '系统', light: '浅色', dark: '深色',
    choosePhoto: '选择照片', takePhoto: '拍照', importing: '导入中…', fullName: '姓名', country: '国家', phone: '电话',
    city: '城市', company: '公司', workspaceName: '工作区名称', profilePhoto: '头像', importPhotoHint: '直接从手机导入图片。',
    saveProfile: '保存资料', support: '支持与反馈', type: '类型', subject: '主题', message: '消息', sendSupport: '发送给支持团队',
    bug: '错误', idea: '想法', question: '问题', other: '其他', collaboration: '协作',
    inviteHint: '邀请协作者加入工作区。主组织者保留控制权，并可随时撤销访问权限。', collaboratorEmail: '协作者邮箱',
    role: '角色', activeTeam: '活跃团队', noMembers: '暂无成员。', pendingInvites: '待处理邀请', noPending: '暂无待处理邀请。',
    chooseRole: '选择角色', permissionsHint: '定义协作者权限。', admin: '管理员', editor: '编辑者', viewer: '查看者',
    adminHint: '管理团队、集成和账单。', editorHint: '创建和编辑漏斗、活动和内容。', viewerHint: '可查看数据但不能编辑。',
    tutorial: '教程', tutorialHint: '学习创建漏斗、导入HTML网站、连接支付并发布。', openGuide: '打开完整指南',
    featureUnavailable: '功能不可用', notAvailableInPlan: '在当前套餐中不可用。', minimumPlan: '最低要求套餐', upgradeTo: '升级到',
  },
} as const

const frSettings = { title:'Paramètres', subtitle:'Mon profil, collaboration, tutoriel et support.', orgName:'Nom de l’entreprise', email:'E-mail du compte', theme:'Thème', themeLight:'Clair', themeDark:'Sombre', themeSystem:'Système', language:'Langue', save:'Enregistrer', saving:'Enregistrement…', saved:'Profil enregistré.', sessionExpired:'Session expirée. Reconnectez-vous.', workspaceMissing:'Espace de travail introuvable.', profile:'Mon profil', collaboration:'Collaboration', tutorial:'Tutoriel', support:'Support & feedback', appearance:'Apparence' } as const
const enSettings = { title:'Settings', subtitle:'Profile, collaboration, tutorial and support.', orgName:'Company name', email:'Account email', theme:'Theme', themeLight:'Light', themeDark:'Dark', themeSystem:'System', language:'Language', save:'Save', saving:'Saving…', saved:'Profile saved.', sessionExpired:'Session expired. Please sign in again.', workspaceMissing:'Workspace not found.', profile:'My profile', collaboration:'Collaboration', tutorial:'Tutorial', support:'Support & feedback', appearance:'Appearance' } as const
const arSettings = { title:'الإعدادات', subtitle:'الملف الشخصي والتعاون والدليل والدعم.', orgName:'اسم الشركة', email:'البريد الإلكتروني', theme:'السمة', themeLight:'فاتح', themeDark:'داكن', themeSystem:'النظام', language:'اللغة', save:'حفظ', saving:'جارٍ الحفظ…', saved:'تم حفظ الملف الشخصي.', sessionExpired:'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.', workspaceMissing:'مساحة العمل غير موجودة.', profile:'ملفي الشخصي', collaboration:'التعاون', tutorial:'الدليل', support:'الدعم والملاحظات', appearance:'المظهر' } as const
const zhSettings = { title:'设置', subtitle:'个人资料、协作、教程与支持。', orgName:'公司名称', email:'账户邮箱', theme:'主题', themeLight:'浅色', themeDark:'深色', themeSystem:'跟随系统', language:'语言', save:'保存', saving:'保存中…', saved:'个人资料已保存。', sessionExpired:'会话已过期，请重新登录。', workspaceMissing:'未找到工作区。', profile:'我的资料', collaboration:'协作', tutorial:'教程', support:'支持与反馈', appearance:'外观' } as const

export const dict = {
  fr:{brand:'Conik.io',tagline:'Marketing OS',workspace:'Espace de travail',nav:frNav,settings:frSettings,common:common.fr},
  en:{brand:'Conik.io',tagline:'Marketing OS',workspace:'Workspace',nav:enNav,settings:enSettings,common:common.en},
  ar:{brand:'Conik.io',tagline:'نظام التسويق',workspace:'مساحة العمل',nav:arNav,settings:arSettings,common:common.ar},
  zh:{brand:'Conik.io',tagline:'营销操作系统',workspace:'工作区',nav:zhNav,settings:zhSettings,common:common.zh},
}

export type Dictionary = {
  brand:string; tagline:string; workspace:string;
  nav:Record<keyof typeof frNav,string>;
  settings:Record<keyof typeof frSettings,string>;
  common:Record<keyof typeof common.fr,string>;
}

export function getDictionary(locale: Locale): Dictionary { return (dict[locale] || dict.fr) as Dictionary }
