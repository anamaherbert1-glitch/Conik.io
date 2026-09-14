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

function text(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim()
}

function classify(tag: string, attrs: string, target: string): InteractiveElement['actionType'] {
  if (attr(attrs, 'data-conik-redirect')) return 'conik-redirect'
  if (attr(attrs, 'href')) return 'link'
  if (attr(attrs, 'onclick')) {
    const onclick = attr(attrs, 'onclick').toLowerCase()
    if (/modal|dialog|drawer|popup/.test(onclick)) return 'modal'
    return 'onclick'
  }
  if (tag === 'form') return 'form'
  if (target) return 'link'
  return 'none'
}

export function detectInteractiveElements(source: string): InteractiveElement[] {
  const result: InteractiveElement[] = []
  let index = 0
  const re = /<(a|button|input|div|span|p|li)\\b([^>]*)>([\\s\\S]*?)<\\/\\1>|<(input)\\b([^>]*)\\/?\\s*>/gi
  let match: RegExpExecArray | null

  while ((match = re.exec(source))) {
    const tag = (match[1] || match[4]).toLowerCase()
    const attrs = match[2] || match[5] || ''
    const body = match[3] || ''
    const type = attr(attrs, 'type').toLowerCase()
    const role = attr(attrs, 'role').toLowerCase()
    if (tag === 'input' && !['button', 'submit', 'reset'].includes(type)) continue
    if (!['a', 'button', 'input'].includes(tag) && role !== 'button') continue

    index += 1
    const id = attr(attrs, 'id')
    const aria = attr(attrs, 'aria-label')
    const value = attr(attrs, 'value')
    const href = attr(attrs, 'href')
    const conikTarget = attr(attrs, 'data-conik-redirect')
    const onclick = attr(attrs, 'onclick')
    const target = conikTarget || href || ''
    const label = id ? `#${id}` : aria || text(body) || value || `${tag === 'a' ? 'Lien' : 'Bouton'} ${index}`
    const selector = id ? `#${id}` : `${tag}[data-conik-element=\"${index}\"]`
    const actionType = classify(tag, attrs, target)

    result.push({
      key: `${tag}-${index}-${id || label.slice(0, 30)}`,
      tag,
      label,
      selector,
      existingAction: Boolean(target || onclick || attr(attrs, 'data-conik-modal') || attr(attrs, 'data-conik-action')),
      actionType,
      target,
    })
  }

  return result
}
