import { LandingPage } from '@/components/landing-page'

type HomeSearchParams = { auth?: string; email?: string }

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<HomeSearchParams>
}) {
  const params = searchParams ? await searchParams : {}
  return (
    <LandingPage
      alreadyRegistered={params.auth === 'already_registered'}
      email={params.email}
    />
  )
}
