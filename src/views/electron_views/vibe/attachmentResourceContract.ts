export const ATTACHMENT_RESOURCE_REF_SCHEMA = 'attachment_resource_ref.v1' as const

export type AttachmentUploadMime = 'text/markdown' | 'text/plain'

/**
 * 文件选择器的 File.type 由操作系统 MIME 数据库决定，同一个 .md 在 macOS / Electron
 * 可能被报告为 text/x-markdown 或 application/octet-stream。上传声明按已冻结的后缀合同
 * 规范化；这里不读取或转码正文，严格 UTF-8 与二进制嗅探仍由后端对原始字节执行。
 */
export function canonicalAttachmentUploadMime(
  filename: string,
  browserMime = '',
): AttachmentUploadMime {
  const basename = String(filename || '').replace(/\\/g, '/').split('/').pop()?.toLowerCase() || ''
  let expected: AttachmentUploadMime | '' = ''
  if (basename.endsWith('.md') || basename.endsWith('.markdown')) expected = 'text/markdown'
  if (basename.endsWith('.txt')) expected = 'text/plain'
  if (!expected) throw new Error('只支持 .md、.markdown 和 .txt 文本附件')

  const observed = String(browserMime || '').split(';', 1)[0].trim().toLowerCase()
  return observed === expected ? observed as AttachmentUploadMime : expected
}

export interface VibeAttachmentResourceRef {
  schema: 'attachment_resource_ref.v1'
  resource_id: string
  filename: string
  mime: string
  size: number
  chars: number
  content_sha256: string
  download_url: string
}

function requiredString(source: Record<string, unknown>, field: string): string {
  const value = source[field]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`附件上传响应缺少有效字段：${field}`)
  }
  return value
}

function requiredCount(source: Record<string, unknown>, field: string): number {
  const value = source[field]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`附件上传响应缺少有效字段：${field}`)
  }
  return value
}

/**
 * 把上传响应投影为 turn 唯一允许携带的附件引用。
 * 显式逐字段复制，避免服务端以后增加 content/text 或内部所有权字段时被透传进 turn。
 */
export function normalizeAttachmentResourceRef(value: unknown): VibeAttachmentResourceRef {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('附件上传响应不是有效的资源引用')
  }
  const source = value as Record<string, unknown>
  if (source.schema !== ATTACHMENT_RESOURCE_REF_SCHEMA) {
    throw new Error('附件上传响应 schema 不受支持')
  }
  const contentSha256 = requiredString(source, 'content_sha256')
  if (!/^[a-f0-9]{64}$/.test(contentSha256)) {
    throw new Error('附件上传响应缺少有效字段：content_sha256')
  }
  const downloadUrl = requiredString(source, 'download_url')
  if (!downloadUrl.startsWith('/vibe/sessions/') || downloadUrl.includes('://')) {
    throw new Error('附件上传响应缺少有效字段：download_url')
  }
  return {
    schema: ATTACHMENT_RESOURCE_REF_SCHEMA,
    resource_id: requiredString(source, 'resource_id'),
    filename: requiredString(source, 'filename'),
    mime: requiredString(source, 'mime'),
    size: requiredCount(source, 'size'),
    chars: requiredCount(source, 'chars'),
    content_sha256: contentSha256,
    download_url: downloadUrl,
  }
}
