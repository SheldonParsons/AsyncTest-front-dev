import { http } from '@/utils/http'

export interface Person { id: number; username: string; nick_name: string; avatar_url: string }
export interface TeamProject {
  id: number; name: string; desc: string; creator: Person | null; role: number | null
  allowed_actions: string[]; pending_request_id: number | null; application_status: string | null
}
export interface Member {
  id: number; user: Person; role: number; status: number; joined_at: string; allowed_actions: string[]
}
export interface JoinRequest {
  id: number; project: { id: number; name: string }; applicant: Person; reason: string; status: string
  reviewer: Person | null; decision_note: string; granted_role: number | null; source: string
  created_at: string; resolved_at: string | null; allowed_actions: string[]
  history?: { id: number; action: string; source: string; note: string; actor: Person | null; created_at: string; before: unknown; after: unknown }[]
}
export interface GlobalUser extends Person { is_active: boolean; date_joined: string; last_login: string; project_count: number }
export interface UserProject { id: number; name: string; role: number | null; membership_status: number | null; can_set_role: boolean }
export interface Page<T> { count: number; results: T[] }
export interface Behavior { key: string; version: string; scope: string; state: string; should_trigger: boolean }

export const roleLabel = (role: number | null) => role === null ? '未加入' : ['成员', '管理员', '创建者'][role] || '未知'
export const statusLabel = (status: string) => ({ pending: '待审批', approved: '已通过', rejected: '已驳回', withdrawn: '已撤回', invalid: '已失效' }[status] || status)
export const personName = (user: Person | null) => user ? user.nick_name || user.username : '—'
export const formatTime = (value?: string | null) => value ? new Date(value).toLocaleString() : '—'

export function errorText(reason: unknown): string {
  const error = reason as { response?: { data?: unknown; status?: number }; message?: string }
  const fallback = error?.response?.status === 404
    ? '当前后端尚未提供此接口，请完成后端更新后重试。'
    : '服务端返回了异常响应，请稍后重试；如持续出现，请检查后端日志。'
  const extract = (value: unknown, depth = 0): string => {
    if (depth > 5) return ''
    if (typeof value === 'string') {
      if (/<\s*(?:!doctype|html|head|body|title|style|script)\b/i.test(value)) return fallback
      return value.slice(0, 300)
    }
    if (Array.isArray(value)) return value.map(item => extract(item, depth + 1)).filter(Boolean).join('；').slice(0, 300)
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>
      return extract(obj.msg || obj.detail || Object.entries(obj).filter(([key]) => key !== 'code').map(([, v]) => v), depth + 1)
    }
    return ''
  }
  return extract(error?.response?.data) || extract(error?.message) || (typeof reason === 'string' ? extract(reason) : '') || '操作失败，请重试'
}

export async function pageRequest<T>(url: string, params: Record<string, unknown> = {}): Promise<Page<T>> {
  const response = await http.request<Page<T>>({ url, params })
  if (!response || !Array.isArray(response.results) || !Number.isFinite(response.count)) {
    throw new Error('服务响应格式不正确，请确认前后端版本一致。')
  }
  return response
}

export async function teamRequest<T = unknown>(url: string, method = 'GET', data?: unknown): Promise<T> {
  const response = await http.request<{ result: number; data: T; msg?: string }>({ url, method, data })
  if (!response || typeof response !== 'object') throw new Error('服务响应格式不正确，请确认前后端版本一致。')
  if (response.result !== 1) throw new Error(errorText({ response: { data: response } }))
  return response.data
}

export function notifyTeamChanged() {
  window.dispatchEvent(new CustomEvent('ast:team-changed'))
}
