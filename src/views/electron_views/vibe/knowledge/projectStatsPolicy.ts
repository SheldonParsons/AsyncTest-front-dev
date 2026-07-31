export interface KnowledgeStats {
  sections: number
  modules: number
}

export interface KnowledgeStatsPayload {
  items?: Record<string, Partial<KnowledgeStats> | undefined>
}

const EMPTY_KNOWLEDGE_STATS: Readonly<KnowledgeStats> = Object.freeze({
  sections: 0,
  modules: 0,
})

/** Foundation 知识事实键只接受外层 AsyncTest 数字项目 ID。 */
export function knowledgeStatsProjectId(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!/^\d+$/.test(text)) return ''
  const numeric = Number(text)
  return Number.isSafeInteger(numeric) && numeric > 0 ? String(numeric) : ''
}

export function collectKnowledgeStatsProjectIds(
  projects: Array<{ id?: unknown }>,
): string[] {
  return Array.from(new Set(
    projects
      .map(project => knowledgeStatsProjectId(project.id))
      .filter(Boolean),
  ))
}

export function knowledgeStatsFromPayload(
  payload: KnowledgeStatsPayload,
  projectId: unknown,
): KnowledgeStats {
  const key = knowledgeStatsProjectId(projectId)
  const stats = key ? payload.items?.[key] : undefined
  return {
    sections: Number(stats?.sections || 0),
    modules: Number(stats?.modules || 0),
  }
}

export function writeKnowledgeStats(
  target: Record<string, KnowledgeStats>,
  payload: KnowledgeStatsPayload,
  projectId: unknown,
): boolean {
  const key = knowledgeStatsProjectId(projectId)
  if (!key) return false
  target[key] = knowledgeStatsFromPayload(payload, key)
  return true
}

export function readKnowledgeStats(
  source: Record<string, KnowledgeStats>,
  projectId: unknown,
): KnowledgeStats {
  const key = knowledgeStatsProjectId(projectId)
  return (key && source[key]) || EMPTY_KNOWLEDGE_STATS
}
