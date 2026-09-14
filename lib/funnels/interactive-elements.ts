export type InteractiveElement = {
  key: string
  tag: string
  label: string
  selector: string
  existingAction: boolean
  actionType: 'link' | 'onclick' | 'form' | 'modal' | 'conik-redirect' | 'none'
  target: string
}

function attr(attrs: string, name: string) {
  return (attrs.match(new RegExp(`\\b${name}\\s*=\\s*[\"']([^\"']*)[\"']`, 'i'))?.[1] || '').trim()
}

function hasAttr(attrs: string, name: string) {
  return new RegExp(`\\b${name}\\s*=`, 'i').test(attrs)
}

function text(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function classify(tag: string, attrs: string, target: string): InteractiveElement['actionType'] {
  if (attr(attrs, 'data-conik-redirect')) return 'conik-redirect'
  if (attr(attrs, 'href')) return 'link'
  if (attr(attrs, 'onclick')) {
    const onclick = attr(attrs, 'onclick').toLowerCase()
    if (/modal|dialog|drawer|popup|window\.open|showmodal/.test(onclick)) return 'modal'
    return 'onclick'
  }
  if (tag === 'form') return 'form'
  if (target) return 'link'
  return 'none'
}

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
    const modalMarker = attr(attrs, 'data-conik-modal') || attr(attrs, 'data-conik-action')

    const interactive =
      tag === 'a' ||
      tag === 'button' ||
      (tag === 'input' && ['button', 'submit', 'reset', 'image'].includes(type)) ||
      role === 'button' ||
      Boolean(onclick) ||
      Boolean(modalMarker)

    if (!interactive) continue

    index += 1
    const id = attr(attrs, 'id')
    const aria = attr(attrs, 'aria-label')
    const value = attr(attrs, 'value')
    const target = conikTarget || href || ''
    const cleanBody = text(body)
    const label = id
      ? `#${id}`
      : aria || cleanBody || value || `${tag === 'a' ? 'Lien' : 'Élément'} ${index}`

    const selector = id
      ? `#${id}`
      : `[data-conik-element="${index}"]`

    const actionType = classify(tag, attrs, target)
    const existingAction = Boolean(target || onclick || modalMarker || hasAttr(attrs, 'formaction'))

    result.push({
      key: id ? `${tag}-id-${id}` : `${tag}-${index}-${label.slice(0, 30)}`,
      tag,
      label,
      selector,
      existingAction,
      actionType,
      target,
    })
  }

  return result
}
