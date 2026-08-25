import axios from 'axios'
import GlobalStatus from '@/global'
import asyncTest from '@/db'
import {
  handleAuthenticationFailure,
  navigateToUnauthenticated,
} from '@/utils/authNavigation'

const isElectron = typeof window !== 'undefined'
  && window.navigator.userAgent.toLowerCase().includes('electron')

function getBaseURL() {
  if (import.meta.env.DEV) {
    return '/api'
  }
  if (import.meta.env.PROD) {
    return isElectron ? (import.meta.env.VITE_API_URL || '') : '/server'
  }
  return '/api'
}

function getAuthHeader(): Record<string, string> {
  const currentCookie = asyncTest.cookies.getCookie(GlobalStatus.cookieTag)
  if (currentCookie === false) {
    void navigateToUnauthenticated({ forceVibe: true })
    return {}
  }
  return { Authorization: `token=${currentCookie}` }
}

function normalizeBody(body: unknown) {
  return body != null ? JSON.parse(JSON.stringify(body)) : undefined
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data === 'string') return data
    if (typeof data?.detail === 'string') return data.detail
    if (data?.detail) return JSON.stringify(data.detail)
    return error.message
  }
  return error instanceof Error ? error.message : String(error)
}

export interface HarnessRequestErrorFacts {
  status: number
  code: string
  retryable: boolean | null
}

/**
 * 保留安全、类型化的 HTTP 失败身份；业务调用仍可按普通 Error 使用 message，
 * 需要恢复策略的调用则不必解析本地化文案。
 */
export class HarnessRequestError extends Error implements HarnessRequestErrorFacts {
  readonly status: number
  readonly code: string
  readonly retryable: boolean | null

  constructor(message: string, facts: Partial<HarnessRequestErrorFacts> = {}) {
    super(message)
    this.name = 'HarnessRequestError'
    this.status = Number.isFinite(facts.status) ? Number(facts.status) : 0
    this.code = String(facts.code || '')
    this.retryable = typeof facts.retryable === 'boolean' ? facts.retryable : null
  }
}

function requestErrorFacts(error: unknown): HarnessRequestErrorFacts {
  if (!axios.isAxiosError(error)) return { status: 0, code: '', retryable: null }
  const data = error.response?.data
  return {
    status: Number(error.response?.status || 0),
    code: typeof data?.code === 'string' ? data.code : '',
    retryable: typeof data?.retryable === 'boolean' ? data.retryable : null,
  }
}

async function responsePayload(error: unknown): Promise<unknown> {
  if (!axios.isAxiosError(error)) return undefined
  const data = error.response?.data
  if (!(data instanceof Blob)) return data
  const raw = await data.text().catch(() => '')
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return raw
  }
}

async function handleHarnessAuthenticationFailure(error: unknown): Promise<boolean> {
  if (!axios.isAxiosError(error)) return false
  return handleAuthenticationFailure(
    error.response?.status,
    await responsePayload(error),
    { forceVibe: true },
  )
}

function buildUrl(path: string) {
  const baseURL = getBaseURL()
  if (!baseURL) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseURL.replace(/\/$/, '')}${normalizedPath}`
}

const harnessHttp = axios.create({
  baseURL: getBaseURL(),
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function harnessRequest<T = any>(method: string, path: string, body?: any): Promise<T> {
  try {
    const response = await harnessHttp.request({
      method,
      url: path,
      data: normalizeBody(body),
      headers: getAuthHeader(),
    })
    return response.data as T
  } catch (error) {
    await handleHarnessAuthenticationFailure(error)
    throw new HarnessRequestError(errorMessage(error), requestErrorFacts(error))
  }
}

/**
 * Vibe 私有附件上传专用 multipart 请求。
 * 不设置 Content-Type，让浏览器为 FormData 生成带 boundary 的请求头。
 */
export async function harnessMultipartRequest<T = any>(
  method: string,
  path: string,
  body: FormData,
  headers: Record<string, string> = {},
): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method,
    headers: {
      ...getAuthHeader(),
      ...headers,
    },
    body,
  })
  const raw = await response.text().catch(() => '')
  let payload: any = null
  try {
    payload = raw ? JSON.parse(raw) : null
  } catch {
    payload = raw
  }
  if (!response.ok) {
    await handleAuthenticationFailure(response.status, payload, { forceVibe: true })
    const message = typeof payload?.error?.detail === 'string'
      ? payload.error.detail
      : (typeof payload?.detail === 'string' ? payload.detail : (raw || `HTTP ${response.status}`))
    throw new Error(message)
  }
  if (!payload || typeof payload !== 'object') throw new Error('附件上传响应无效')
  return payload as T
}

export interface HarnessBlobDownload {
  blob: Blob
  filename: string
  contentType: string
}

function responseFilename(contentDisposition: unknown): string {
  const raw = String(contentDisposition || '')
  const encoded = raw.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded)
    } catch {
      return encoded
    }
  }
  return raw.match(/filename="?([^";]+)"?/i)?.[1] || ''
}

async function blobErrorMessage(error: unknown): Promise<string> {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    const raw = await error.response.data.text().catch(() => '')
    try {
      const data = raw ? JSON.parse(raw) : null
      if (typeof data?.detail === 'string') return data.detail
    } catch {
      if (raw) return raw
    }
  }
  return errorMessage(error)
}

export async function harnessBlobRequest(path: string): Promise<HarnessBlobDownload> {
  try {
    const response = await harnessHttp.request<Blob>({
      method: 'GET',
      url: path,
      responseType: 'blob',
      headers: getAuthHeader(),
    })
    const blob = response.data
    if (!(blob instanceof Blob) || blob.size <= 0) throw new Error('文件内容已不可用')
    return {
      blob,
      filename: responseFilename(response.headers['content-disposition']),
      contentType: String(response.headers['content-type'] || blob.type || ''),
    }
  } catch (error) {
    await handleHarnessAuthenticationFailure(error)
    if (error instanceof Error && error.message === '文件内容已不可用') throw error
    throw new Error(await blobErrorMessage(error))
  }
}

export type HarnessSseCloseReason = 'done_signal' | 'eof' | 'error_event'

export interface HarnessSseResult {
  closeReason: HarnessSseCloseReason
}

export async function streamHarnessSse(
  path: string,
  body: Record<string, unknown>,
  handlers: {
    onOpen?: () => void
    onChunk?: (content: string) => void
    onEvent?: (event: any) => void
    onDone?: () => void
    onError?: (message: string) => void
    onClose?: (result: HarnessSseResult) => void
  } = {},
  signal?: AbortSignal,
) {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...getAuthHeader(),
    },
    signal,
    body: JSON.stringify(normalizeBody(body) ?? {}),
  })

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    const raw = await response.text().catch(() => '')
    let payload: unknown = raw
    try {
      const data = raw ? JSON.parse(raw) : null
      payload = data
      if (typeof data?.detail === 'string') {
        message = data.detail
      } else if (data) {
        message = JSON.stringify(data)
      }
    } catch {
      if (raw) message = raw
    }
    await handleAuthenticationFailure(response.status, payload, { forceVibe: true })
    throw new Error(message)
  }
  handlers.onOpen?.()

  const reader = response.body?.getReader()
  if (!reader) throw new Error('当前环境不支持流式响应')

  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let done = false
  let closeReason: HarnessSseCloseReason = 'eof'

  const handleLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith(':') || !trimmed.startsWith('data:')) return
    const data = trimmed.slice(5).trim()
    if (data === '[DONE]') {
      done = true
      closeReason = 'done_signal'
      handlers.onDone?.()
      return
    }
    let parsed: any
    try {
      parsed = JSON.parse(data)
    } catch {
      handlers.onChunk?.(data)
      return
    }
    // 只把 JSON 解析失败当作文本块；业务 handler 自身的异常必须向上抛出，不能被吞成 chunk。
    handlers.onEvent?.(parsed)
    if (parsed.error) {
      done = true
      closeReason = 'error_event'
      handlers.onError?.(String(parsed.error))
    } else if (parsed.delta) {
      handlers.onChunk?.(String(parsed.delta))
    }
  }

  while (!done) {
    const { value, done: readerDone } = await reader.read()
    if (readerDone) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    lines.forEach(handleLine)
    if (done) {
      await reader.cancel().catch(() => undefined)
      break
    }
  }

  buffer += decoder.decode()
  if (buffer) {
    buffer.split('\n').forEach(handleLine)
  }

  const result = { closeReason }
  handlers.onClose?.(result)
  return result
}
