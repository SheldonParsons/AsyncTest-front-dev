import { teamRequest } from '@/api/team'

export async function ApiCreateTouchPixel(data: { project: number | string; desc?: string; type?: number }) {
  const result = await teamRequest('/team/join-requests/', 'POST', { project: Number(data.project), reason: data.desc || '' })
  window.dispatchEvent(new CustomEvent('ast:team-changed'))
  return { result: 1, data: result }
}
