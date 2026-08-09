export function normalizeAttachmentOssBaseUrlInput(value: unknown): string {
  return String(value ?? '').trim()
}

export function attachmentOssBaseUrlValidationMessage(value: unknown): string {
  const normalized = normalizeAttachmentOssBaseUrlInput(value)
  if (!normalized) return ''
  try {
    const url = new URL(normalized)
    return url.protocol === 'https:' ? '' : '请输入 HTTPS 地址'
  } catch {
    return '请输入有效的 HTTPS 地址'
  }
}
