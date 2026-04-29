import axios from 'axios'
import GlobalStatus from '@/global'
import asyncTest from '@/db'

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
    if (import.meta.env.VITE_IS_ELECTRON === 'true') {
      asyncTest.router.router.push({ name: GlobalStatus.anonymousElectronPage })
    } else {
      asyncTest.router.router.push({ name: GlobalStatus.anonymousPage })
    }
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
    throw new Error(errorMessage(error))
  }
}

export async function streamHarnessSse(
  path: string,
  body: Record<string, unknown>,
  handlers: {
    onChunk?: (content: string) => void
    onDone?: () => void
    onError?: (message: string) => void
  } = {},
) {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...getAuthHeader(),
    },
    body: JSON.stringify(normalizeBody(body) ?? {}),
  })

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    const raw = await response.text().catch(() => '')
    try {
      const data = raw ? JSON.parse(raw) : null
      if (typeof data?.detail === 'string') {
        message = data.detail
      } else if (data) {
        message = JSON.stringify(data)
      }
    } catch {
      if (raw) message = raw
    }
    throw new Error(message)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('当前环境不支持流式响应')

  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let done = false

  const handleLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.startsWith('data:')) return
    const data = trimmed.slice(5).trim()
    if (data === '[DONE]') {
      done = true
      handlers.onDone?.()
      return
    }
    try {
      const parsed = JSON.parse(data)
      if (parsed.error) {
        done = true
        handlers.onError?.(String(parsed.error))
      } else if (parsed.delta) {
        handlers.onChunk?.(String(parsed.delta))
      }
    } catch {
      handlers.onChunk?.(data)
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

  if (!done) {
    handlers.onDone?.()
  }
}
