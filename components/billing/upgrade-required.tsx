'use client'

type Props = { feature: string; requiredPlan?: string }

export function UpgradeRequired({ feature, requiredPlan = 'Premium' }: Props) {
  return (
    <section className="panel" style={{ marginTop: 18, textAlign: 'center', padding: 28 }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>🔒</div>
      <h2 style={{ margin: 0 }}>Fonctionnalité non disponible</h2>
      <p className="muted" style={{ maxWidth: 620, margin: '10px auto 18px' }}>
        <b>{feature}</b> n’est pas disponible dans votre formule actuelle.
        Passez à {requiredPlan} ou à une formule supérieure pour l’utiliser.
      </p>
      <a className="primary" href="/subscriptions">Mettre à niveau</a>
    </section>
  )
}
