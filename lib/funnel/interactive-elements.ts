export type InteractiveElement = {
  key: string
  tag: string
  label: string
  selector: string
  existingAction: string
  actionType: 'link' | 'redirect' | 'javascript' | 'modal' | 'none'
  configurable: boolean
}

function attr(attrs: string, name: string) {
  return attrs.match(new RegExp(`\\b${name}\\s*=\\s*[\"']([^\"']*)[\"']`, 'i'))?.[1]?.trim() || ''
}

function labelFor(attrs: string, body: string, tag: string, index: number) {
  const id = attr(attrs, 'id')
  const aria = attr(attrs, 'aria-label')
  const value = attr(attrs, 'value')
  const text = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (id) return `#${id}`
  return aria || value || text || `${tag === 'button' ? 'Bouton' : 'Élément'} ${index}`
}

function actionFrom(tag: string, attrs: string) {
  const href = attr(attrs, 'href')
  const redirect = attr(attrs, 'data-conik-redirect')
  const onclick = attr(attrs, 'onclick')
  const modal = attr(attrs, 'data-modal') || attr(attrs, 'data-modal-target') || attr(attrs, 'data-bs-target')

  if (modal) return { existingAction: modal, actionType: 'modal' as const }
  if (redirect) return { existingAction: redirect, actionType: 'redirect' as const }
  if (href) return { existingAction: href, actionType: 'link' as const }
  if (onclick) {
    const match = onclick.match(/(?:window\.location(?:\.href)?|location(?:\.href)?)\s*=\s*[\"']([^\"']+)[\"']/i)
    return { existingAction: match?.[1] || onclick, actionType: 'javascript' as const }
  }
  return { existingAction: '', actionType: 'none' as const }
}

export function detectInteractiveElements(source: string): InteractiveElement[] {
  const found: InteractiveElement[] = []
  let index = 0

  const pairRe = /<(a|button|div|span|p|li)\b([^>]*)>([\s\S]*?)<\/\1>/gi
  let match: RegExpExecArray | null
  while ((match = pairRe.exec(source))) {
    const tag = match[1].toLowerCase()
    const attrs = match[2] || ''
    const body = match[3] || ''
    const role = attr(attrs, 'role')
    if (tag !== 'a' && tag !== 'button' && role !== 'button') continue
    index += 1
    const action = actionFrom(tag, attrs)
    const id = attr(attrs, 'id')
    found.push({
      key: `${tag}-${index}-${id || index}`,
      tag,
      label: labelFor(attrs, body, tag, index),
      selector: id ? `#${id}` : `${tag}[data-conik-index="${index}"]`,
      existingAction: action.existingAction,
      actionType: action.actionType,
      configurable: action.actionType === 'none',
    })
  }

  const inputRe = /<input\b([^>]*\btype=[\"'](?:button|submit|reset)[\"'][^>]*)\/?\s*>/gi
  while ((match = inputRe.exec(source))) {
    const attrs = match[1] || ''
    index += 1
    const action = actionFrom('input', attrs)
    const id = attr(attrs, 'id')
    found.push({
      key: `input-${index}-${id || index}`,
      tag: 'input',
      label: labelFor(attrs, '', 'input', index),
      selector: id ? `#${id}` : `input[data-conik-index="${index}"]`,
      existingAction: action.existingAction,
      actionType: action.actionType,
      configurable: action.actionType === 'none',
    })
  }

  return found
}
