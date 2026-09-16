import { NextResponse } from 'next/server'
import { getPaymentMethodDefinitions } from '@/lib/payment-method-catalog'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params
  const methods = getPaymentMethodDefinitions(provider)
  return NextResponse.json({ provider, methods })
}
