/** Route document web links through Electron without navigating the renderer. */
export function openDocumentExternalLink(event: MouseEvent): void {
  const openExternal = window.electronAPI?.openExternal
  if (!openExternal || event.defaultPrevented || event.button > 1) return
  const target = event.target instanceof Element
    ? event.target
    : event.target instanceof Node ? event.target.parentElement : null
  const anchor = target?.closest('a[href]')
  if (!anchor || !(event.currentTarget instanceof Element) || !event.currentTarget.contains(anchor)) return
  const href = anchor.getAttribute('href')?.trim()
  if (!href || href.startsWith('#')) return

  // Documents are not application routes. Unsupported/relative links must not
  // navigate the renderer or launch arbitrary OS protocol handlers.
  event.preventDefault()
  event.stopPropagation()
  try {
    const url = new URL(href.startsWith('//') ? `https:${href}` : href)
    if (url.protocol === 'https:' || url.protocol === 'http:') openExternal(url.href)
  } catch { /* Not an absolute web URL. */ }
}
