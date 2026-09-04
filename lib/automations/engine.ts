import { createClient } from '@/lib/supabase/server'
import { decryptAccessToken, getMetaConfig, sendCloudApiMessage } from '@/lib/whatsapp/meta'

type Context = {
  organizationId: string
  contactId: string
  phone?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  formData?: Record<string, unknown>
}

type Automation = {
  id: string
  name: string
  actions: Array<{ id: string; type: string; config: Record<string, unknown>; position: number }>
}

function valueAt(path: string, context: Context) {
  const key = path.replace(/^{{\s*|\s*}}$/g, '')
  const aliases: Record<string, unknown> = {
    'contact.first_name': context.firstName,
    'contact.last_name': context.lastName,
    'contact.email': context.email,
    'contact.phone': context.phone,
    first_name: context.firstName,
    last_name: context.lastName,
    email: context.email,
    phone: context.phone,
  }
  if (key in aliases) return aliases[key]
  if (key.startsWith('form.') && context.formData) return context.formData[key.slice(5)]
  if (context.formData && key in context.formData) return context.formData[key]
  return ''
}

function resolve(value: unknown, context: Context) {
  if (typeof value !== 'string') return value
  return value.replace(/{{\s*([^}]+)\s*}}/g, (_, key) => String(valueAt(String(key), context) ?? ''))
}

async function runWhatsAppAction(supabase: Awaited<ReturnType<typeof createClient>>, automationId: string, action: Automation['actions'][number], context: Context, connectionId: string) {
  const config = action.config
  const templateName = String(config.templateName || '').trim()
  const templateLanguage = String(config.templateLanguage || config.language || 'fr').trim()
  if (!templateName) return { ok: false, status: 'skipped', reason: 'missing_template' }
  if (!context.phone) return { ok: false, status: 'skipped', reason: 'contact_phone_missing' }

  const eligibility = await supabase.rpc('whatsapp_system_send_eligibility', {
    p_secret: getMetaConfig().serverSecret,
    p_connection_id: connectionId,
    p_phone_number: context.phone,
    p_is_template: true,
  })
  if (eligibility.error) throw new Error(eligibility.error.message)
  if (!eligibility.data?.allowed) return { ok: false, status: 'skipped', reason: eligibility.data?.code || 'not_eligible' }

  const template = await supabase.rpc('whatsapp_get_automation_template', {
    p_secret: getMetaConfig().serverSecret,
    p_organization_id: context.organizationId,
    p_connection_id: connectionId,
    p_name: templateName,
    p_language: templateLanguage,
  })
  if (template.error) throw new Error(template.error.message)
  if (!template.data?.ok) return { ok: false, status: 'skipped', reason: template.data?.reason || 'template_unavailable' }

  const credential = await supabase.rpc('whatsapp_get_credential', {
    p_secret: getMetaConfig().serverSecret,
    p_connection_id: connectionId,
  })
  if (credential.error) throw new Error(credential.error.message)
  const row = Array.isArray(credential.data) ? credential.data[0] : credential.data
  if (!row?.access_token_cipher) throw new Error('WhatsApp credential unavailable')

  const rawParameters = Array.isArray(config.parameters) ? config.parameters : []
  const parameters = rawParameters.map((parameter) => ({ type: 'text', text: String(resolve(parameter, context)) }))
  const components = parameters.length ? [{ type: 'body', parameters }] : undefined
  const payload = {
    to: context.phone.replace(/\D/g, ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: templateLanguage },
      ...(components ? { components } : {}),
    },
  }

  const recorded = await supabase.rpc('whatsapp_record_outbound', {
    p_connection_id: connectionId,
    p_phone_number: context.phone,
    p_message_type: 'template',
    p_content: null,
    p_template_name: templateName,
    p_template_language: templateLanguage,
    p_media_url: null,
    p_campaign_id: null,
    p_automation_id: automationId,
    p_payload: payload,
  })
  if (recorded.error) throw new Error(recorded.error.message)
  if (!recorded.data?.ok) throw new Error(recorded.data?.reason || 'Unable to queue WhatsApp message')

  try {
    const remote = await sendCloudApiMessage(decryptAccessToken(row.access_token_cipher), row.phone_number_id, payload)
    const waMessageId = Array.isArray(remote.messages) ? remote.messages[0]?.id : undefined
    await supabase.rpc('whatsapp_settle_outbound_system', {
      p_secret: getMetaConfig().serverSecret,
      p_message_id: recorded.data.messageId,
      p_status: 'sent',
      p_wa_message_id: waMessageId || null,
      p_error_code: null,
      p_error_message: null,
    })
    return { ok: true, status: 'success', messageId: recorded.data.messageId }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Meta send failed'
    await supabase.rpc('whatsapp_settle_outbound_system', {
      p_secret: getMetaConfig().serverSecret,
      p_message_id: recorded.data.messageId,
      p_status: 'failed',
      p_wa_message_id: null,
      p_error_code: 'META_SEND_FAILED',
      p_error_message: message,
    })
    return { ok: false, status: 'failed', reason: message }
  }
}

export async function runAutomations(trigger: 'new_contact' | 'form_submission', context: Context) {
  const supabase = await createClient()
  const secret = getMetaConfig().serverSecret
  const { data, error } = await supabase.rpc('whatsapp_matching_automations', {
    p_secret: secret,
    p_organization_id: context.organizationId,
    p_trigger: trigger,
    p_contact_id: context.contactId,
  })
  if (error) throw new Error(error.message)

  const automations = (data?.automations || []) as Automation[]
  const connectionId = data?.connectionId as string | null
  const results: Array<{ automationId: string; status: string; reason?: string }> = []

  for (const automation of automations) {
    let finalStatus = 'success'
    let finalError: string | null = null
    try {
      for (const action of [...automation.actions].sort((a, b) => a.position - b.position)) {
        if (action.type === 'wait') {
          finalStatus = 'skipped'
          finalError = 'wait_requires_scheduler'
          break
        }
        if (action.type === 'send_whatsapp') {
          if (!connectionId) { finalStatus = 'skipped'; finalError = 'whatsapp_not_connected'; break }
          const result = await runWhatsAppAction(supabase, automation.id, action, context, connectionId)
          if (!result.ok) { finalStatus = result.status; finalError = result.reason || null; break }
          continue
        }
        const result = await supabase.rpc('whatsapp_automation_action', {
          p_secret: secret,
          p_organization_id: context.organizationId,
          p_contact_id: context.contactId,
          p_action_type: action.type,
          p_config: action.config,
        })
        if (result.error) throw new Error(result.error.message)
        if (!result.data?.ok) { finalStatus = 'skipped'; finalError = result.data?.reason || 'action_failed'; break }
      }
    } catch (error) {
      finalStatus = 'failed'
      finalError = error instanceof Error ? error.message : 'automation_failed'
    }
    await supabase.rpc('whatsapp_record_automation_run', {
      p_secret: secret,
      p_automation_id: automation.id,
      p_contact_id: context.contactId,
      p_status: finalStatus,
      p_error: finalError,
    })
    results.push({ automationId: automation.id, status: finalStatus, ...(finalError ? { reason: finalError } : {}) })
  }
  return results
}
