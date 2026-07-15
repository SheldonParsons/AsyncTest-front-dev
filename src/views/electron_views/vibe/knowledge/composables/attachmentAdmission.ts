export const MAX_ATTACHMENT_COUNT = 10
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
export const MAX_ATTACHMENT_BATCH_BYTES = 50 * 1024 * 1024

export interface AttachmentAdmissionResult {
  files: File[]
  error: string
}

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function sizeLabel(bytes: number): string {
  return `${Math.ceil(bytes / 1024 / 1024)} MB`
}

/**
 * 前端只做与后端一致的资源准入，不判断附件要录入、总结还是用于问答。
 * 任一新文件不合格时整批拒绝，避免用户误以为只提交了其中一部分。
 */
export function admitAttachmentSelection(existing: File[], picked: File[]): AttachmentAdmissionResult {
  const known = new Set(existing.map(fileKey))
  const fresh = picked.filter(file => !known.has(fileKey(file)))
  const combined = [...existing, ...fresh]
  if (combined.length > MAX_ATTACHMENT_COUNT) {
    return { files: existing, error: `每轮最多上传 ${MAX_ATTACHMENT_COUNT} 个文件，本次没有添加任何文件。` }
  }
  const oversized = combined.find(file => file.size > MAX_ATTACHMENT_BYTES)
  if (oversized) {
    return {
      files: existing,
      error: `“${oversized.name}”超过单文件 ${sizeLabel(MAX_ATTACHMENT_BYTES)} 上限，本次没有添加任何文件。`,
    }
  }
  const total = combined.reduce((sum, file) => sum + file.size, 0)
  if (total > MAX_ATTACHMENT_BATCH_BYTES) {
    return {
      files: existing,
      error: `文件合计超过 ${sizeLabel(MAX_ATTACHMENT_BATCH_BYTES)} 上限，本次没有添加任何文件。`,
    }
  }
  return { files: combined, error: '' }
}
