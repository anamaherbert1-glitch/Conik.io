export type InteractiveActionType = 'link' | 'onclick' | 'form' | 'modal' | 'conik-redirect' | 'none'

export type InteractiveElement = {
  key: string
  tag: string
  label: string
  selector: string
  existingAction: boolean
  actionType: InteractiveActionType
  target: string
  existingCode?: string
}

function attr(attrs: string, name: string) {
  return (attrs.match(new RegExp(`\\b${name}\\s*=\\s*[\"']([^\"']*)[\"']`, 'i'))?.[1] || '').trim()
}

function hasAttr(attrs: string, name: string) {
  return new RegExp(`\\b${name}(?:\\s*=|\\s|>)`, 'i').test(attrs)
}

function text(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function escapeSelector(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function classify(tag: string, attrs: string, target: string): InteractiveActionType {
  if (attr(attrs, 'data-conik-redirect')) return 'conik-redirect'
  if (attr(attrs, 'href')) return 'link'
  if (attr(attrs, 'formaction')) return 'form'
  if (attr(attrs, 'onclick')) {
    const onclick = attr(attrs, 'onclick').toLowerCase()
    if (/modal|dialog|drawer|popup|window\.open|showmodal/.test(onclick)) return 'modal'
    return 'onclick'
  }
  if (target) return 'link'
  return 'none'
}

/**
 * Detect interactive HTML in document order.
 * Existing href/onclick/form/modal actions are reported but are never modified here.
 */
export function detectInteractiveElements(source: string): InteractiveElement[] {
  const result: InteractiveElement[] = []
  let index = 0
  const re = /<([a-z][a-z0-9:-]*)\b([^>]*)>([\s\S]*?)<\/\1\s*>|<([a-z][a-z0-9:-]*)\b([^>]*)\/?\s*>/gi
  let match: RegExpExecArray | null

  while ((match = re.exec(source))) {
    const tag = (match[1] || match[4] || '').toLowerCase()
    const attrs = match[2] || match[5] || ''
    const body = match[3] || ''
    const type = attr(attrs, 'type').toLowerCase()
    const role = attr(attrs, 'role').toLowerCase()
    const onclick = attr(attrs, 'onclick')
    const href = attr(attrs, 'href')
    const conikTarget = attr(attrs, 'data-conik-redirect')
    const formAction = attr(attrs, 'formaction')
    const modalMarker = attr(attrs, 'data-conik-modal') || attr(attrs, 'data-conik-action')

    const interactive =
      tag === 'a' ||
      tag === 'button' ||
      (tag === 'input' && ['button', 'submit', 'reset', 'image'].includes(type)) ||
      role === 'button' ||
      Boolean(onclick) ||
      Boolean(modalMarker) ||
      Boolean(formAction)

    if (!interactive) continue

    index += 1
    const id = attr(attrs, 'id')
    const dataKey = attr(attrs, 'data-conik-element-key')
    const aria = attr(attrs, 'aria-label')
    const value = attr(attrs, 'value')
    const target = conikTarget || href || ''
    const cleanBody = text(body)
    const label = id
      ? `#${id}`
      : aria || cleanBody || value || `${tag === 'a' ? 'Lien' : 'Élément'} ${index}`

    const key = dataKey || (id ? `${tag}-id-${id}` : `${tag}-${index}-${escapeSelector(label.slice(0, 30))}`)
    const selector = id
      ? `#${id}`
      : `[data-conik-element-key="${key}"]`

    const actionType = classify(tag, attrs, target)
    const existingAction = Boolean(target || onclick || modalMarker || formAction)

    result.push({
      key,
      tag,
      label,
      selector,
      existingAction,
      actionType,
      target,
      existingCode: onclick || formAction || undefined,
    })
  }

  return result
}

/**
 * Adds a stable Conik marker only when an interactive element has no id/key.
 * Existing attributes and actions are preserved byte-for-byte otherwise.
 */
export function addInteractiveElementKeys(source: string): string {
  let index = 0
  const re = /<([a-z][a-z0-9:-]*)\b([^>]*)>/gi
  return source.replace(re, (full, rawTag, rawAttrs) => {
    const tag = String(rawTag).toLowerCase()
    const attrs = String(rawAttrs || '')
    const type = attr(attrs, 'type').toLowerCase()
    const role = attr(attrs, 'role').toLowerCase()
    const interactive =
      tag === 'a' ||
      tag === 'button' ||
      (tag === 'input' && ['button', 'submit', 'reset', 'image'].includes(type)) ||
      role === 'button' ||
      hasAttr(attrs, 'onclick') ||
      hasAttr(attrs, 'data-conik-modal') ||
      hasAttr(attrs, 'data-conik-action') ||
      hasAttr(attrs, 'formaction')

    if (!interactive || hasAttr(attrs, 'id') || hasAttr(attrs, 'data-conik-element-key')) return full

    index += 1
    return `<${rawTag}${attrs} data-conik-element-key="conik-${index}">`
  })
}
