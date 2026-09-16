export type GatewayField = {
  key: string
  label: string
  placeholder: string
  secret?: boolean
}

export type GatewayDef = {
  id: string
  name: string
  description: string
  countries: string
  logoUrl: string
  color: string
  bg: string
  websiteUrl: string
  signupUrl: string
  credentialsHelp: string
  fields: GatewayField[]
  docsUrl?: string
}

export const PAYMENT_GATEWAYS: GatewayDef[] = [
  {
    id: 'cinetpay',
    name: 'CinetPay',
    description: 'Mobile Money + cartes — Afrique francophone',
    countries: 'CI · TG · BF · ML · CM · SN · BJ · GN…',
    logoUrl: 'https://docs.cinetpay.com/images/logo-new.png',
    color: '#0B5FFF',
    bg: '#EEF4FF',
    websiteUrl: 'https://www.cinetpay.com',
    signupUrl: 'https://www.cinetpay.com',
    credentialsHelp:
      'Après inscription et validation KYC, créez un Service Marchand dans votre compte CinetPay pour obtenir l’API Key et le Site ID (docs.cinetpay.com).',
    fields: [
      { key: 'apikey', label: 'API Key', placeholder: 'Votre apikey CinetPay' },
      { key: 'site_id', label: 'Site ID', placeholder: 'Ex. 445566' },
      { key: 'secret_key', label: 'Secret key (si fourni)', placeholder: 'optionnel', secret: true },
    ],
    docsUrl: 'https://docs.cinetpay.com',
  },
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    description: 'Panafricain — Mobile Money + cartes internationales',
    countries: 'Afrique + diaspora',
    logoUrl: 'https://cdn.brandfetch.io/idJHbFHlDW/w/400/h/100/theme/dark/logo.png?c=1dxbfHSJFAPEGdCLU4o5B',
    color: '#FB9129',
    bg: '#FFF6EC',
    websiteUrl: 'https://flutterwave.com',
    signupUrl: 'https://app.flutterwave.com/',
    credentialsHelp:
      'Dans le dashboard Flutterwave (Settings → API Keys), copiez Public Key et Secret Key (mode Live ou Test).',
    fields: [
      { key: 'public_key', label: 'Public key', placeholder: 'FLWPUBK_…' },
      { key: 'secret_key', label: 'Secret key', placeholder: 'FLWSECK_…', secret: true },
      { key: 'encryption_key', label: 'Encryption key (optionnel)', placeholder: '…' },
    ],
    docsUrl: 'https://developer.flutterwave.com',
  },
  {
    id: 'paydunya',
    name: 'PayDunya',
    description: 'Sénégal & UEMOA — Wave, Orange, MTN, Moov + cartes',
    countries: 'SN · CI · BJ · BF · TG · ML',
    logoUrl: 'https://cdn.brandfetch.io/id0xZQZQZQ/w/400/h/100/theme/dark/logo.png?c=1dxbfHSJFAPEGdCLU4o5B',
    color: '#00A86B',
    bg: '#ECFBF4',
    websiteUrl: 'https://paydunya.com',
    signupUrl: 'https://paydunya.com/signup',
    credentialsHelp:
      'Compte Business activé → menu « Intégrez notre API » → configurer une application → Master Key, Private Key et Token.',
    fields: [
      { key: 'master_key', label: 'Master Key', placeholder: '…' },
      { key: 'private_key', label: 'Private Key', placeholder: '…', secret: true },
      { key: 'token', label: 'Token', placeholder: '…' },
    ],
    docsUrl: 'https://developers.paydunya.com',
  },
  {
    id: 'wave',
    name: 'Wave',
    description: 'Mobile Money Wave — SN, CI, ML, BF…',
    countries: 'SN · CI · ML · BF · GM…',
    logoUrl: 'https://cdn.brandfetch.io/idq5Y0sZR6/w/400/h/100/theme/dark/logo.png?c=1dxbfHSJFAPEGdCLU4o5B',
    color: '#1DC8FF',
    bg: '#EAF9FF',
    websiteUrl: 'https://www.wave.com',
    signupUrl: 'https://www.wave.com',
    credentialsHelp:
      'Demandez l’accès API marchand auprès de Wave (compte business). Collez la clé API fournie par Wave.',
    fields: [
      { key: 'api_key', label: 'Clé API Wave', placeholder: 'wave_…' },
      { key: 'api_secret', label: 'Secret API', placeholder: 'optionnel', secret: true },
    ],
    docsUrl: 'https://www.wave.com',
  },
  {
    id: 'saspay',
    name: 'SasPay',
    description: 'Agrégateur Mobile Money + cartes — Afrique de l’Ouest et du Centre',
    countries: 'UEMOA · CEMAC · multi-pays',
    logoUrl: 'https://cdn.brandfetch.io/idsaspay/w/400/h/100/theme/dark/logo.png?c=1dxbfHSJFAPEGdCLU4o5B',
    color: '#2563EB',
    bg: '#EFF6FF',
    websiteUrl: 'https://saspay.me',
    signupUrl: 'https://app.saspay.me',
    credentialsHelp:
      'Créez un compte sur app.saspay.me, validez le KYC, puis générez une clé API (sk_live_… ou sk_test_…). La clé secrète n’est affichée qu’une seule fois.',
    fields: [
      { key: 'secret_key', label: 'Clé API secrète', placeholder: 'sk_live_… ou sk_test_…', secret: true },
      { key: 'merchant_id', label: 'Merchant ID (si affiché)', placeholder: 'optionnel' },
    ],
    docsUrl: 'https://docs.saspay.me',
  },
  {
    id: 'ligdicash',
    name: 'LigdiCash',
    description: 'Burkina + multi-pays Ouest Afrique',
    countries: 'BF · CI · SN · ML · TG · BJ · CM…',
    logoUrl: 'https://cdn.brandfetch.io/idLigdiCash/w/400/h/100/theme/dark/logo.png?c=1dxbfHSJFAPEGdCLU4o5B',
    color: '#6C2BD9',
    bg: '#F3EDFF',
    websiteUrl: 'https://www.ligdicash.com',
    signupUrl: 'https://client.ligdicash.com',
    credentialsHelp:
      'Après protocole d’intégration LigdiCash, récupérez Apikey et API Token dans client.ligdicash.com (projet API).',
    fields: [
      { key: 'apikey', label: 'Apikey', placeholder: '…' },
      { key: 'api_token', label: 'API Token (Bearer)', placeholder: 'eyJ…', secret: true },
    ],
    docsUrl: 'https://developers.ligdicash.com',
  },
  {
    id: 'hub2',
    name: 'Hub2',
    description: 'Orchestrateur multi-pays UEMOA / CEMAC',
    countries: 'CI · SN · CM · TG · BJ · BF…',
    logoUrl: 'https://cdn.brandfetch.io/idHub2io/w/400/h/100/theme/dark/logo.png?c=1dxbfHSJFAPEGdCLU4o5B',
    color: '#111827',
    bg: '#F3F4F6',
    websiteUrl: 'https://www.hub2.io',
    signupUrl: 'https://www.hub2.io/register-for-a-free-sandbox/',
    credentialsHelp:
      'Après validation Hub2, utilisez ApiKey et MerchantId fournis pour l’environnement live ou sandbox.',
    fields: [
      { key: 'api_key', label: 'ApiKey', placeholder: '…' },
      { key: 'merchant_id', label: 'MerchantId', placeholder: '…' },
      { key: 'client_secret', label: 'Secret (si fourni)', placeholder: 'optionnel', secret: true },
    ],
    docsUrl: 'https://docs.hub2.io',
  },
  {
    id: 'fedapay',
    name: 'FedaPay',
    description: 'Bénin & UEMOA — MTN, Moov + cartes',
    countries: 'BJ · TG · SN · CI…',
    logoUrl: 'https://cdn.brandfetch.io/idFedaPay/w/400/h/100/theme/dark/logo.png?c=1dxbfHSJFAPEGdCLU4o5B',
    color: '#00B4A0',
    bg: '#E8FAF7',
    websiteUrl: 'https://fedapay.com',
    signupUrl: 'https://fedapay.com',
    credentialsHelp:
      'Dashboard FedaPay → clés API (publique + secrète). Activez le compte Live pour les paiements réels.',
    fields: [
      { key: 'public_key', label: 'Clé publique', placeholder: 'pk_…' },
      { key: 'secret_key', label: 'Clé secrète', placeholder: 'sk_…', secret: true },
    ],
    docsUrl: 'https://docs.fedapay.com',
  },
  {
    id: 'campay',
    name: 'CamPay',
    description: 'Cameroun — MTN MoMo & Orange Money',
    countries: 'Cameroun',
    logoUrl: 'https://cdn.brandfetch.io/idCamPay/w/400/h/100/theme/dark/logo.png?c=1dxbfHSJFAPEGdCLU4o5B',
    color: '#E11D48',
    bg: '#FFF1F2',
    websiteUrl: 'https://www.campay.net',
    signupUrl: 'https://www.campay.net/',
    credentialsHelp:
      'Inscrivez-vous sur campay.net, puis récupérez username / password (ou token) dans l’espace développeur.',
    fields: [
      { key: 'username', label: 'Username', placeholder: '…' },
      { key: 'password', label: 'Password', placeholder: '…', secret: true },
    ],
    docsUrl: 'https://www.campay.net',
  },
]

export function getGateway(id: string): GatewayDef | undefined {
  return PAYMENT_GATEWAYS.find((g) => g.id === id)
}
