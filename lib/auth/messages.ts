export function authErrorMessage(message: string | null | undefined) {
  const value = (message || '').toLowerCase()

  if (value.includes('invalid login credentials') || value.includes('invalid credentials')) {
    return 'Adresse e-mail ou mot de passe incorrect.'
  }
  if (value.includes('email not confirmed') || value.includes('email_not_confirmed')) {
    return 'Votre adresse e-mail n’est pas encore vérifiée. Consultez votre boîte e-mail.'
  }
  if (value.includes('user already registered') || value.includes('already registered')) {
    return 'Cette adresse e-mail est déjà associée à un compte.'
  }
  if (value.includes('password should be at least') || value.includes('password is too short')) {
    return 'Le mot de passe doit contenir au moins 8 caractères.'
  }
  if (value.includes('email rate limit') || value.includes('rate limit')) {
    return 'Trop de tentatives. Patientez quelques instants avant de réessayer.'
  }
  if (value.includes('expired') || value.includes('otp_expired')) {
    return 'Ce lien a expiré. Demandez un nouveau lien.'
  }
  if (value.includes('invalid') && value.includes('token')) {
    return 'Ce lien est invalide ou a déjà été utilisé.'
  }
  if (value.includes('network') || value.includes('fetch')) {
    return 'Impossible de contacter Conik. Vérifiez votre connexion Internet.'
  }

  return 'Une erreur est survenue. Vérifiez les informations saisies puis réessayez.'
}
