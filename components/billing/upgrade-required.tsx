'use client'

type Props = { feature: string; requiredPlan?: 'Basic' | 'Premium' | 'Business' }

const planCode: Record<NonNullable<Props['requiredPlan']>, string> = {
  Basic: 'basic',
  Premium: 'premium',
  Business: 'business',
}

export function UpgradeRequired({ feature, requiredPlan = 'Premium' }: Props) {
  const target = planCode[requiredPlan]

  return (
    <section className="panel upgrade-required" style={{ marginTop: 18, textAlign: 'center', padding: 28 }}>
      <div style={{ fontSize: 34, marginBottom: 10 }}>🔒</div>
      <h2 style={{ margin: 0 }}>Fonctionnalité non disponible</h2>
      <p className="muted" style={{ maxWidth: 620, margin: '10px auto 18px' }}>
        <b>{feature}</b> n’est pas disponible dans votre formule actuelle.
        Cette fonctionnalité nécessite au minimum la formule <b>{requiredPlan}</b>.
      </p>
      <a
        className="upgrade-button"
        href={`/subscriptions?upgrade=${target}`}
        aria-label={`Passer à la formule ${requiredPlan}`}
      >
        Upgrade → {requiredPlan}
      </a>
    </section>
  )
}
