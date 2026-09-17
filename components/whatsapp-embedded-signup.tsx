'use client'

/**
 * Legacy Meta Embedded Signup compatibility component.
 * WhatsApp now uses the customer's own GREEN-API account/instance.
 * This component intentionally renders nothing so the legacy architecture
 * cannot appear in the UI even if an older page still imports it.
 */
export function WhatsAppEmbeddedSignup(_props: unknown) {
  return null
}
