export const DEFAULT_AVATAR_MIME = 'image/webp'
export const DEFAULT_AVATAR_QUALITY = 0.88
export const DEFAULT_AVATAR_FILENAME = 'avatar.webp'

export interface AvatarCropCanvas {
  width: number
  height: number
  toBlob(
    callback: (blob: Blob | null) => void,
    type?: string,
    quality?: number,
  ): void
}

export interface AvatarCropperLike {
  getResult(): {
    canvas?: AvatarCropCanvas | null
  } | null | undefined
}

export interface CroppedAvatarFileOptions {
  lastModified?: number
}

export function createCroppedAvatarFile(
  cropper: AvatarCropperLike | null | undefined,
  options: CroppedAvatarFileOptions = {},
): Promise<File> {
  const canvas = cropper?.getResult()?.canvas
  if (!canvas || canvas.width <= 0 || canvas.height <= 0 || typeof canvas.toBlob !== 'function') {
    return Promise.reject(new Error('没有可上传的头像裁剪结果'))
  }

  const lastModified = Number.isFinite(options.lastModified)
    ? Number(options.lastModified)
    : Date.now()

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.size <= 0) {
        reject(new Error('生成裁剪头像失败，请重新选择图片'))
        return
      }
      if (String(blob.type || '').toLowerCase() !== DEFAULT_AVATAR_MIME) {
        reject(new Error('当前环境无法生成 WebP 头像'))
        return
      }
      resolve(new File([blob], DEFAULT_AVATAR_FILENAME, {
        type: DEFAULT_AVATAR_MIME,
        lastModified,
      }))
    }, DEFAULT_AVATAR_MIME, DEFAULT_AVATAR_QUALITY)
  })
}

export function revokeObjectUrl(url: string | null | undefined): void {
  const normalized = String(url || '').trim()
  if (!normalized || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return
  URL.revokeObjectURL(normalized)
}
