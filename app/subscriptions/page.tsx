import { redirect } from 'next/navigation'

export default function SubscriptionsPage() {
  redirect('/settings#billing')
}
