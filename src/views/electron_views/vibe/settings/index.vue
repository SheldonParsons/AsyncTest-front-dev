<template>
  <main class="vibe-settings-shell">
    <div class="settings-drag" />
    <aside class="settings-side">
      <button class="back-btn" type="button" @click="backToApp">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
        返回应用
      </button>

      <nav class="settings-nav" aria-label="设置导航">
        <section class="nav-section">
          <h2>个人</h2>
          <button class="nav-row" type="button" :class="{ active: activeKey === 'profile' }" @click="activeKey = 'profile'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            个人资料
          </button>
        </section>

        <section v-if="canViewTraceAudit" class="nav-section">
          <h2>Admin Settings</h2>
          <button class="nav-row" type="button" :class="{ active: activeKey === 'trace' }" @click="activeKey = 'trace'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            对话链路审计
          </button>
        </section>
      </nav>
    </aside>

    <section class="settings-main" :class="{ 'trace-active': activeKey === 'trace' }">
      <header class="settings-topbar">
        <span>{{ activeTitle }}</span>
      </header>

      <section v-if="activeKey === 'profile'" class="profile-panel">
        <div class="profile-hero">
          <span class="profile-avatar avatar-container">
            <el-avatar :size="58" :src="currentUserAvatar" class="user-avatar">{{ userInitials }}</el-avatar>
            <span class="online-indicator" aria-hidden="true" />
          </span>
          <h1>{{ currentUserName }}</h1>
          <p>@{{ currentUsername }} · <em>{{ canViewTraceAudit ? 'Admin' : 'Pro' }}</em></p>
        </div>
        <div class="profile-stats">
          <div><strong>--</strong><span>累计 Token 数</span></div>
          <div><strong>--</strong><span>峰值 Token 数</span></div>
          <div><strong>--</strong><span>最长任务时长</span></div>
          <div><strong>--</strong><span>当前连续天数</span></div>
        </div>
      </section>

      <section v-else-if="activeKey === 'trace' && canViewTraceAudit" class="trace-panel">
        <div class="trace-control">
          <div>
            <strong>记录新对话链路</strong>
            <span>{{ traceAuditEnabled ? '开启后，主对话区域的新请求会写入审计记录。' : '关闭后，新的对话链路不会再写入审计记录。' }}</span>
          </div>
          <button class="trace-switch" type="button" :class="{ on: traceAuditEnabled }" :disabled="traceConfigSaving" @click="toggleTraceAudit" :aria-pressed="traceAuditEnabled ? 'true' : 'false'">
            <i />
          </button>
        </div>

        <div class="trace-browser">
          <aside class="trace-list">
            <div class="trace-list-head">
              <div class="trace-list-title">
                <strong>最近链路</strong>
                <span v-if="selectedTraceIds.size">已选 {{ selectedTraceIds.size }}</span>
              </div>
              <div class="trace-list-actions">
                <button type="button" :disabled="!traceRuns.length" @click="toggleVisibleTraceSelection">{{ allVisibleTraceSelected ? '取消全选' : '全选' }}</button>
                <button type="button" :disabled="!selectedTraceIds.size" @click="copySelectedTraceMarkers">{{ copiedAuditMarkerBatch ? '已复制标识' : '复制标识' }}</button>
                <button type="button" :disabled="!selectedTraceIds.size || traceExporting" @click="exportSelectedTraces">{{ traceExporting ? '导出中' : '导出' }}</button>
                <button type="button" @click="loadTraceRuns(true)" :disabled="traceRunsLoading">刷新</button>
              </div>
            </div>
            <div class="trace-filter-bar">
              <label class="trace-filter-field">
                <span>项目</span>
                <input
                  v-model.trim="traceProjectFilter"
                  list="trace-project-options"
                  type="text"
                  placeholder="全部项目"
                  @keydown.enter.prevent="loadTraceRuns(true)"
                >
              </label>
              <label class="trace-filter-field">
                <span>用户</span>
                <input
                  v-model.trim="traceUserFilter"
                  list="trace-user-options"
                  type="text"
                  placeholder="全部用户"
                  @keydown.enter.prevent="loadTraceRuns(true)"
                >
              </label>
              <button class="trace-filter-apply" type="button" :disabled="traceRunsLoading" @click="loadTraceRuns(true)">过滤</button>
              <button class="trace-filter-clear" type="button" :disabled="traceRunsLoading || (!traceProjectFilter && !traceUserFilter)" @click="clearTraceFilters">清空</button>
              <datalist id="trace-project-options">
                <option v-for="item in traceFilterOptions.projects" :key="item.project_id" :value="traceProjectOptionValue(item)">{{ traceProjectOptionLabel(item) }}</option>
              </datalist>
              <datalist id="trace-user-options">
                <option v-for="item in traceFilterOptions.users" :key="`${item.user_id || ''}-${item.account || ''}-${item.username || ''}`" :value="traceUserOptionValue(item)">{{ item.label }}</option>
              </datalist>
            </div>
            <div v-if="traceRunsLoading && !traceRuns.length" class="trace-list-state">加载中...</div>
            <div v-else-if="!traceRuns.length" class="trace-list-state">暂无对话链路记录</div>
            <div
              v-for="run in traceRuns"
              :key="run.trace_id"
              class="trace-run-row"
              :class="{ active: selectedTraceId === run.trace_id, checked: isTraceSelected(run.trace_id) }"
            >
              <button
                class="trace-select-box"
                :class="{ checked: isTraceSelected(run.trace_id) }"
                type="button"
                :aria-pressed="isTraceSelected(run.trace_id) ? 'true' : 'false'"
                @click.stop="toggleTraceSelection(run.trace_id)"
              >
                <svg v-if="isTraceSelected(run.trace_id)" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m20 6-11 11-5-5"/></svg>
              </button>
              <button class="trace-row-main" type="button" @click="selectTrace(run.trace_id)">
                <span class="trace-row-heading">
                  <span class="trace-row-title">{{ run.input_text || '未命名对话' }}</span>
                  <span class="trace-audit-marker">{{ traceAuditMarker(run) }}</span>
                </span>
                <span class="trace-row-meta">
                  <i :class="['trace-status', traceStatusClass(run.final_status)]" />
                  {{ traceStatusText(run.final_status) }} · {{ traceActorLabel(run) }} · {{ traceProjectLabel(run) }}
                </span>
                <span class="trace-row-meta subtle">{{ traceSessionLabel(run) }} · {{ formatDuration(run.elapsed_ms) }} · {{ formatTime(run.started_at) }}</span>
              </button>
            </div>
            <button v-if="traceNextCursor" class="trace-more" type="button" :disabled="traceRunsLoading" @click="loadTraceRuns(false)">加载更多</button>
          </aside>

          <section class="trace-detail">
            <div v-if="traceDetailLoading" class="trace-detail-state">读取链路详情...</div>
            <div v-else-if="!selectedTrace" class="trace-detail-state">选择一条链路查看详情</div>
            <template v-else>
              <div class="trace-detail-head">
                <div>
                  <p>{{ formatTime(selectedTrace.started_at) }} · {{ formatDuration(selectedTrace.elapsed_ms) }} · {{ traceActorLabel(selectedTrace) }} · {{ traceProjectLabel(selectedTrace) }} · {{ traceSessionLabel(selectedTrace) }}</p>
                  <h2>{{ selectedTrace.input_text || '未命名对话' }}</h2>
                  <div class="trace-audit-id">
                    <span>审计标识</span>
                    <code>{{ traceAuditMarker(selectedTrace) }}</code>
                    <button type="button" @click="copyTraceAuditMarker(selectedTrace)">{{ copiedAuditMarker === traceAuditMarker(selectedTrace) ? '已复制' : '复制' }}</button>
                  </div>
                </div>
                <span :class="['trace-status-pill', traceStatusClass(selectedTrace.final_status)]">{{ traceStatusText(selectedTrace.final_status) }}</span>
              </div>

              <div class="trace-section">
                <div class="trace-section-title">用户输入</div>
                <div class="trace-markdown" v-html="renderMarkdown(selectedTrace.input_text || '')" />
                <div v-if="traceAttachments(selectedTrace).length" class="trace-attachment-list" aria-label="本轮使用文件">
                  <button
                    v-for="file in traceAttachments(selectedTrace)"
                    :key="attachmentKey(file)"
                    class="trace-attachment-chip"
                    type="button"
                    :title="attachmentName(file)"
                    @click="downloadAttachment(file)"
                  >
                    <span class="trace-attachment-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 2v5h5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 13h7M8.5 17h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                    </span>
                    <span class="trace-attachment-main">
                      <span class="trace-attachment-name">{{ attachmentName(file) }}</span>
                      <span class="trace-attachment-meta">{{ attachmentMeta(file) }}</span>
                    </span>
                  </button>
                </div>
              </div>

              <div v-if="selectedTrace.summary" class="trace-section">
                <div class="trace-section-title">最终结果</div>
                <div class="trace-markdown" v-html="renderMarkdown(selectedTrace.summary || '')" />
              </div>

              <div class="trace-section compact">
                <div class="trace-kv"><span>审计标识</span><code>{{ traceAuditMarker(selectedTrace) }}</code></div>
                <div class="trace-kv"><span>发起用户</span><code>{{ traceActorLabel(selectedTrace) }}</code></div>
                <div class="trace-kv"><span>所属项目</span><code>{{ traceProjectLabel(selectedTrace) }}</code></div>
                <div class="trace-kv"><span>对话会话</span><code>{{ traceSessionLabel(selectedTrace) }}</code></div>
                <div class="trace-kv"><span>Trace ID</span><code>{{ selectedTrace.trace_id }}</code></div>
                <div class="trace-kv"><span>Turn ID</span><code>{{ selectedTrace.turn_id || '-' }}</code></div>
                <div class="trace-kv"><span>动作</span><code>{{ routeActionLabel(selectedTrace.route_action || '') }}</code></div>
                <div class="trace-kv"><span>副作用</span><code>{{ compactJson(selectedTrace.side_effects) }}</code></div>
              </div>

              <div class="trace-section">
                <div class="trace-section-title">事件时间线</div>
                <div class="trace-timeline">
                  <article v-for="event in selectedTrace.events || []" :key="event.id || event.seq" class="trace-event">
                    <div class="trace-event-dot" />
                    <div class="trace-event-body">
                      <div class="trace-event-head">
                        <strong>{{ eventDisplayTitle(event) }}</strong>
                        <span>{{ eventTypeLabel(event.event_type) }} · #{{ event.seq }} · {{ formatDuration(event.elapsed_ms) }}</span>
                      </div>
                      <p v-if="event.reason" class="trace-event-reason">{{ event.reason }}</p>
                      <div v-if="eventText(event)" class="trace-markdown small" v-html="renderMarkdown(eventText(event))" />
                      <details class="trace-json">
                        <summary>Payload</summary>
                        <pre>{{ formatJson(annotatedPayload(event.payload)) }}</pre>
                      </details>
                    </div>
                  </article>
                </div>
              </div>
            </template>
          </section>
        </div>
      </section>

    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useRoute, useRouter } from 'vue-router'
import { getVibeCapabilities, getVibeDialogueTraceDetail, listVibeDialogueTraceRuns, updateVibeTraceAuditConfig, type VibeAttachment, type VibeCapabilityUser, type VibeDialogueTraceDetail, type VibeDialogueTraceEvent, type VibeDialogueTraceRun, type VibeFeatureConfig } from '../api'

const route = useRoute()
const router = useRouter()
const activeKey = ref<'profile' | 'trace'>('profile')
const capabilities = ref<Record<string, boolean>>({})
const featureConfigs = ref<Record<string, VibeFeatureConfig>>({})
const currentUser = ref<VibeCapabilityUser | null>(null)
const traceConfigSaving = ref(false)
const traceRuns = ref<VibeDialogueTraceRun[]>([])
const selectedTraceId = ref('')
const selectedTrace = ref<VibeDialogueTraceDetail | null>(null)
const traceNextCursor = ref('')
const traceRunsLoading = ref(false)
const traceDetailLoading = ref(false)
const selectedTraceIds = ref<Set<string>>(new Set())
const traceExporting = ref(false)
const copiedAuditMarker = ref('')
const copiedAuditMarkerBatch = ref(false)
const traceProjectFilter = ref('')
const traceUserFilter = ref('')
const traceFilterOptions = ref<{
  projects: Array<{ project_id: string; project_name: string; count: number }>
  users: Array<{ user_id?: number; account?: string; username?: string; user_display_name?: string; label: string; count: number }>
}>({ projects: [], users: [] })

const canViewTraceAudit = computed(() => !!capabilities.value.trace_audit)
const traceAuditEnabled = computed(() => featureConfigs.value.trace_audit?.enabled !== false)
const currentUserName = computed(() => String(currentUser.value?.display_name || currentUser.value?.nick_name || currentUser.value?.username || '用户'))
const currentUsername = computed(() => String(currentUser.value?.username || 'user'))
const currentUserAvatar = computed(() => String(currentUser.value?.avatar_url || ''))
const userInitials = computed(() => {
  const text = currentUserName.value.trim() || 'U'
  const letters = Array.from(text).slice(0, 2).join('')
  return /^[a-z0-9]+$/i.test(letters) ? letters.toUpperCase() : letters
})
const activeTitle = computed(() => activeKey.value === 'trace' ? '对话链路审计' : '个人资料')
const allVisibleTraceSelected = computed(() => {
  const ids = traceRuns.value.map((item) => item.trace_id).filter(Boolean)
  return !!ids.length && ids.every((id) => selectedTraceIds.value.has(id))
})

async function loadCapabilities() {
  try {
    const res = await getVibeCapabilities()
    capabilities.value = res?.capabilities || {}
    featureConfigs.value = res?.feature_configs || {}
    currentUser.value = res?.user || null
  } catch {
    capabilities.value = {}
    featureConfigs.value = {}
    currentUser.value = null
  }
}

async function toggleTraceAudit() {
  if (traceConfigSaving.value) return
  traceConfigSaving.value = true
  try {
    const res = await updateVibeTraceAuditConfig(!traceAuditEnabled.value)
    if (res?.item) featureConfigs.value = { ...featureConfigs.value, trace_audit: res.item }
  } finally {
    traceConfigSaving.value = false
  }
}

async function loadTraceRuns(reset = false) {
  if (!canViewTraceAudit.value || traceRunsLoading.value) return
  traceRunsLoading.value = true
  try {
    const res = await listVibeDialogueTraceRuns({
      limit: 30,
      cursor: reset ? '' : traceNextCursor.value,
      project: traceProjectFilter.value,
      user: traceUserFilter.value,
    })
    const items = res?.items || []
    if (res?.filters) {
      traceFilterOptions.value = {
        projects: res.filters.projects || [],
        users: res.filters.users || [],
      }
    }
    if (reset) {
      selectedTraceId.value = ''
      selectedTrace.value = null
      selectedTraceIds.value = new Set()
    }
    traceRuns.value = reset ? items : [...traceRuns.value, ...items]
    traceNextCursor.value = res?.next_cursor || ''
    if (!selectedTraceId.value && traceRuns.value.length) await selectTrace(traceRuns.value[0].trace_id)
  } finally {
    traceRunsLoading.value = false
  }
}

async function selectTrace(traceId: string) {
  if (!traceId) return
  selectedTraceId.value = traceId
  traceDetailLoading.value = true
  try {
    selectedTrace.value = await getVibeDialogueTraceDetail(traceId)
  } finally {
    traceDetailLoading.value = false
  }
}

function clearTraceFilters() {
  traceProjectFilter.value = ''
  traceUserFilter.value = ''
  loadTraceRuns(true)
}

function traceUserOptionValue(item: { user_id?: number; account?: string; username?: string; user_display_name?: string }) {
  return String(item.account || item.username || item.user_display_name || item.user_id || '')
}

function traceProjectOptionValue(item: { project_id?: string; project_name?: string }) {
  return String(item.project_name || item.project_id || '')
}

function traceProjectOptionLabel(item: { project_id?: string; project_name?: string; count?: number }) {
  const name = String(item.project_name || '').trim()
  const id = String(item.project_id || '').trim()
  const count = Number(item.count || 0)
  const suffix = count > 0 ? ` · ${count}` : ''
  return `${name || id}${suffix}`
}

function isTraceSelected(traceId: string) {
  return selectedTraceIds.value.has(traceId)
}

function toggleTraceSelection(traceId: string) {
  if (!traceId) return
  const next = new Set(selectedTraceIds.value)
  if (next.has(traceId)) next.delete(traceId)
  else next.add(traceId)
  selectedTraceIds.value = next
}

function toggleVisibleTraceSelection() {
  const visible = traceRuns.value.map((item) => item.trace_id).filter(Boolean)
  const next = new Set(selectedTraceIds.value)
  if (visible.length && visible.every((id) => next.has(id))) visible.forEach((id) => next.delete(id))
  else visible.forEach((id) => next.add(id))
  selectedTraceIds.value = next
}

function selectedTraceRunsInTimeOrder() {
  const selected = selectedTraceIds.value
  return traceRuns.value
    .filter((item) => selected.has(item.trace_id))
    .slice()
    .sort((a, b) => {
      const at = new Date(a.started_at || '').getTime()
      const bt = new Date(b.started_at || '').getTime()
      const av = Number.isFinite(at) ? at : 0
      const bv = Number.isFinite(bt) ? bt : 0
      return av - bv
    })
}

function mdValue(value: any) {
  const text = String(value ?? '').trim()
  return text || '-'
}

function mdFence(value: string, lang = '') {
  return `\`\`\`\`${lang}\n${String(value || '').replace(/\`\`\`\`/g, '\`\`\`\\`')}\n\`\`\`\``
}

function exportStamp(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function buildTraceExportMarkdown(details: VibeDialogueTraceDetail[]) {
  const lines: string[] = []
  lines.push('# 对话链路审计导出')
  lines.push('')
  lines.push(`- 导出时间：${new Date().toLocaleString('zh-CN')}`)
  lines.push(`- 导出数量：${details.length}`)
  lines.push('- 文件用途：离线交给 AI 分析主对话区域链路、决策过程、召回材料、落库/修改/删除动作。')
  lines.push('')

  details.forEach((trace, index) => {
    lines.push(`## ${index + 1}. ${mdValue(trace.input_text || '未命名对话').split('\n')[0]}`)
    lines.push('')
    lines.push('| 字段 | 内容 |')
    lines.push('| --- | --- |')
    lines.push(`| 审计标识 | ${mdValue(traceAuditMarker(trace))} |`)
    lines.push(`| Trace ID | ${mdValue(trace.trace_id)} |`)
    lines.push(`| Turn ID | ${mdValue(trace.turn_id)} |`)
    lines.push(`| 发起用户 | ${mdValue(traceActorLabel(trace))} |`)
    lines.push(`| 所属项目 | ${mdValue(traceProjectLabel(trace))} |`)
    lines.push(`| 对话会话 | ${mdValue(traceSessionLabel(trace))} |`)
    lines.push(`| 状态 | ${mdValue(traceStatusText(trace.final_status))} |`)
    lines.push(`| 路由动作 | ${mdValue(routeActionLabel(trace.route_action || ''))} |`)
    lines.push(`| 开始时间 | ${mdValue(trace.started_at)} |`)
    lines.push(`| 结束时间 | ${mdValue(trace.ended_at)} |`)
    lines.push(`| 耗时 | ${mdValue(formatDuration(trace.elapsed_ms))} |`)
    lines.push('')
    lines.push('### 用户输入')
    lines.push('')
    lines.push(mdFence(trace.input_text || '-', 'markdown'))
    lines.push('')
    const files = traceAttachments(trace)
    if (files.length) {
      lines.push('### 使用文件')
      lines.push('')
      files.forEach((file, fileIndex) => {
        lines.push(`#### ${fileIndex + 1}. ${mdValue(attachmentName(file))}`)
        lines.push('')
        lines.push(`- 大小：${mdValue(attachmentSizeLabel(file.size))}`)
        lines.push(`- 类型：${mdValue(file.mime || '')}`)
        lines.push('')
        lines.push(mdFence(String(file.content ?? file.text ?? ''), 'markdown'))
        lines.push('')
      })
    }
    lines.push('### 最终结果')
    lines.push('')
    lines.push(mdFence(trace.summary || '-', 'markdown'))
    lines.push('')
    lines.push('### 副作用')
    lines.push('')
    lines.push(mdFence(formatJson(trace.side_effects || {}), 'json'))
    lines.push('')
    lines.push('### 事件时间线')
    lines.push('')
    if (!trace.events?.length) {
      lines.push('- 无事件记录')
      lines.push('')
    } else {
      trace.events.forEach((event) => {
        lines.push(`#### #${event.seq} ${eventTypeLabel(event.event_type)}`)
        lines.push('')
        lines.push(`- 阶段：${mdValue(STAGE_LABELS[event.stage] ? withCode(STAGE_LABELS[event.stage], event.stage) : event.stage)}`)
        lines.push(`- 标题：${mdValue(eventDisplayTitle(event))}`)
        lines.push(`- 原因：${mdValue(event.reason)}`)
        lines.push(`- 耗时：${mdValue(formatDuration(event.elapsed_ms))}`)
        const text = eventText(event)
        if (text) {
          lines.push('')
          lines.push('正文：')
          lines.push('')
          lines.push(mdFence(text, 'markdown'))
        }
        lines.push('')
        lines.push('Payload：')
        lines.push('')
        lines.push(mdFence(formatJson(annotatedPayload(event.payload)), 'json'))
        lines.push('')
      })
    }
  })
  return lines.join('\n')
}

function downloadMarkdown(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function attachmentName(file: Partial<VibeAttachment> | any) {
  return String(file?.name || file?.filename || '未命名文件')
}

function attachmentKey(file: Partial<VibeAttachment> | any) {
  return String(file?.id || `${attachmentName(file)}-${file?.size || file?.chars || ''}`)
}

function attachmentSizeLabel(size?: number) {
  const n = Number(size || 0)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n < 1024) return `${Math.round(n)} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function attachmentMeta(file: Partial<VibeAttachment> | any) {
  const parts = [attachmentSizeLabel(file?.size), file?.mime ? String(file.mime) : '']
  return parts.filter(Boolean).join(' · ') || '点击下载'
}

function traceAttachments(trace?: Partial<VibeDialogueTraceDetail> | null): VibeAttachment[] {
  const summary = trace?.attachment_summary || {}
  if (Array.isArray((summary as any).items)) return (summary as any).items
  const filename = String((summary as any).filename || '').trim()
  if (!filename) return []
  return [{
    id: 'trace-document-1',
    name: filename,
    filename,
    chars: Number((summary as any).document_chars || 0),
    kind: 'document',
  }]
}

function downloadAttachment(file: Partial<VibeAttachment> | any) {
  const url = String(file?.download_url || '').trim()
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  const name = attachmentName(file)
  const content = String(file?.content ?? file?.text ?? '')
  const blob = new Blob([content], { type: String(file?.mime || 'text/markdown;charset=utf-8') })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

async function exportSelectedTraces() {
  const ids = selectedTraceRunsInTimeOrder().map((item) => item.trace_id)
  if (!ids.length || traceExporting.value) return
  traceExporting.value = true
  try {
    const details: VibeDialogueTraceDetail[] = []
    for (const id of ids) {
      if (selectedTrace.value?.trace_id === id) details.push(selectedTrace.value)
      else details.push(await getVibeDialogueTraceDetail(id))
    }
    const markdown = buildTraceExportMarkdown(details)
    downloadMarkdown(`dialogue-trace-${exportStamp()}-${details.length}.md`, markdown)
  } finally {
    traceExporting.value = false
  }
}

async function copySelectedTraceMarkers() {
  const markers = selectedTraceRunsInTimeOrder().map((item) => traceAuditMarker(item)).filter(Boolean)
  if (!markers.length) return
  await copyText(markers.join('\n'))
  copiedAuditMarkerBatch.value = true
  window.setTimeout(() => {
    copiedAuditMarkerBatch.value = false
  }, 1400)
}


function renderMarkdown(text: string) {
  const raw = String(text || '').trim()
  if (!raw) return '<span class="trace-empty-text">-</span>'
  return DOMPurify.sanitize(marked.parse(raw, { async: false }) as string, {
    USE_PROFILES: { html: true },
  })
}

function formatJson(value: any) {
  if (value === undefined || value === null) return '{}'
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}

function compactJson(value: any) {
  if (!value || (typeof value === 'object' && !Object.keys(value).length)) return '-'
  try { return JSON.stringify(value) } catch { return String(value) }
}


const EVENT_TYPE_LABELS: Record<string, string> = {
  'request.accepted': '请求已接收',
  'request.continuation_accepted': '确认回复并入父链路',
  'clarification.cancelled': '用户取消反问/确认',
  'trace.config_resolved': '审计配置已解析',
  'session.loaded': '会话上下文已加载',
  'session.load_failed': '会话上下文加载失败',
  'llm.call_started': 'LLM 调用开始',
  'llm.call_finished': 'LLM 调用完成',
  'sse.turn_started': '轮次开始',
  'sse.event_saved': '消息已保存',
  'sse.intent': '意图判定',
  'sse.process_started': '处理过程开始',
  'sse.process_message': '过程旁白',
  'sse.process_message_delta': '流式过程旁白',
  'sse.process_action_started': '过程动作开始',
  'sse.process_action_done': '过程动作完成',
  'sse.process_persist': '过程状态持久化',
  'sse.stage': '阶段更新',
  'sse.answer': '答案输出',
  'sse.answer_delta': '答案流式输出',
  'sse.notes': '补充说明',
  'sse.materials': '召回材料',
  'sse.sources': '来源引用',
  'sse.proposals': '候选变更',
  'sse.summary': '摘要/方案包',
  'sse.clarification': '反问确认',
  'sse.interaction_required': '等待用户选择',
  'sse.interaction_resolved': '用户选择已处理',
  'sse.verification': '校验结果',
  'sse.structure_review': '结构重审',
  'sse.warning': '警告',
  'sse.error': '错误',
  'sse.cancelled': '已取消',
  'sse.done': '流结束',
  'sse.ping': '心跳',
  'sse.fact': '事实条目',
}

const RAW_TYPE_LABELS: Record<string, string> = {
  turn_started: '轮次开始',
  event_saved: '消息已保存',
  intent: '意图判定',
  process_started: '处理过程开始',
  process_message: '过程旁白',
  process_message_delta: '流式过程旁白',
  process_action_started: '过程动作开始',
  process_action_done: '过程动作完成',
  process_persist: '过程状态持久化',
  stage: '阶段更新',
  answer: '答案输出',
  answer_delta: '答案流式输出',
  notes: '补充说明',
  materials: '召回材料',
  sources: '来源引用',
  proposals: '候选变更',
  summary: '摘要/方案包',
  clarification: '反问确认',
  interaction_required: '等待用户选择',
  interaction_resolved: '用户选择已处理',
  verification: '校验结果',
  structure_review: '结构重审',
  warning: '警告',
  error: '错误',
  cancelled: '已取消',
  done: '流结束',
  ping: '心跳',
  fact: '事实条目',
}

const STAGE_LABELS: Record<string, string> = {
  request: '请求入口',
  trace: '审计配置',
  session: '会话上下文',
  sse: '前端流事件',
  route: '路由判断',
  llm: 'LLM 调用',
  retrieve: '知识库召回',
  answer: '答案生成',
  ingest: '录入处理',
  edit: '修改/删除',
  cascade: '连锁同步',
  converge: '收敛处理',
  memory: '历史上下文',
  overview: '知识库总览',
}

const ACTION_LABELS: Record<string, string> = {
  save: '录入',
  candidate_save: '候选录入',
  edit: '修改',
  delete: '删除',
  kb_question: '知识库问答',
  kb_overview: '知识库总览',
  system_question: '系统问题',
  external_question: '外部问题',
  smalltalk: '寒暄/无关',
  unknown: '未知',
  cancelled: '已取消',
}

const PROCESS_ACTION_LABELS: Record<string, string> = {
  route: '路由判断',
  retrieve: '知识库召回',
  answer: '答案生成',
  ingest: '录入处理',
  edit: '修改处理',
  delete: '删除处理',
  converge: '收敛处理',
  structure_review: '结构重审',
  clarify: '反问确认',
}

function withCode(label: string, code: string) {
  const raw = String(code || '').trim()
  return raw ? `${label}（${raw}）` : label
}

function eventTypeLabel(type?: string | null) {
  const raw = String(type || '').trim()
  if (!raw) return '未知事件'
  return withCode(EVENT_TYPE_LABELS[raw] || raw, raw)
}

function rawTypeLabel(type?: string | null) {
  const raw = String(type || '').trim()
  if (!raw) return ''
  return withCode(RAW_TYPE_LABELS[raw] || raw, raw)
}

function routeActionLabel(action?: string | null) {
  const raw = String(action || '').trim()
  if (!raw) return '-'
  return withCode(ACTION_LABELS[raw] || raw, raw)
}

function eventDisplayTitle(event: VibeDialogueTraceEvent) {
  const title = String(event?.title || '').trim()
  const payload = event?.payload || {}
  const payloadType = typeof payload.type === 'string' ? rawTypeLabel(payload.type) : ''
  const fallback = eventTypeLabel(event?.event_type)
  return title ? `${title} · ${payloadType || fallback}` : (payloadType || fallback)
}

function annotatedPayload(value: any): any {
  if (Array.isArray(value)) return value.map((item) => annotatedPayload(item))
  if (!value || typeof value !== 'object') return value
  const out: Record<string, any> = {}
  Object.entries(value).forEach(([key, item]) => {
    out[key] = annotatedPayload(item)
    if (typeof item === 'string') {
      if (key === 'type') {
        const label = rawTypeLabel(item)
        if (label && label !== item) out[`${key}_zh`] = label
      } else if (key === 'stage' || key === 'step') {
        const label = STAGE_LABELS[item] || ''
        if (label) out[`${key}_zh`] = withCode(label, item)
      } else if (key === 'action' || key === 'action_type' || key === 'intent' || key === 'primary_intent') {
        const label = ACTION_LABELS[item] || PROCESS_ACTION_LABELS[item] || ''
        if (label) out[`${key}_zh`] = withCode(label, item)
      }
    }
    if (Array.isArray(item) && (key === 'actions' || key === 'secondary_intents')) {
      const labels = item
        .filter((entry) => typeof entry === 'string')
        .map((entry) => routeActionLabel(entry))
      if (labels.length) out[`${key}_zh`] = labels
    }
  })
  return out
}


function eventText(event: VibeDialogueTraceEvent) {
  const payload = event?.payload || {}
  const candidates = [payload.message, payload.text, payload.detail, payload.answer, payload.summary]
  const first = candidates.find((item) => typeof item === 'string' && item.trim())
  return first ? String(first) : ''
}

function formatDuration(ms?: number | null) {
  if (ms === undefined || ms === null) return '-'
  const n = Number(ms)
  if (!Number.isFinite(n)) return '-'
  if (n < 1000) return `${Math.max(0, Math.round(n))}ms`
  return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}s`
}

function formatTime(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function traceAuditMarker(trace?: Partial<VibeDialogueTraceRun> | null) {
  const explicit = String(trace?.audit_marker || '').trim()
  if (explicit) return explicit
  const raw = String(trace?.trace_id || '').replace(/[^a-z0-9]/gi, '')
  return raw ? `DTA-${raw.slice(0, 8).toUpperCase()}` : 'DTA-UNKNOWN'
}

async function copyText(value: string) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard api unavailable')
    await navigator.clipboard.writeText(value)
  } catch {
    const input = document.createElement('textarea')
    input.value = value
    input.style.position = 'fixed'
    input.style.left = '-9999px'
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    input.remove()
  }
}

async function copyTraceAuditMarker(trace?: Partial<VibeDialogueTraceRun> | null) {
  const marker = traceAuditMarker(trace)
  await copyText(marker)
  copiedAuditMarker.value = marker
  window.setTimeout(() => {
    if (copiedAuditMarker.value === marker) copiedAuditMarker.value = ''
  }, 1400)
}

function traceActorLabel(trace?: Partial<VibeDialogueTraceRun> | null) {
  if (!trace) return '未知用户'
  const name = String(trace.user_display_name || trace.username || trace.account || '').trim()
  if (name) return name
  return trace.user_id !== undefined && trace.user_id !== null ? `用户 ${trace.user_id}` : '未知用户'
}

function traceSessionLabel(trace?: Partial<VibeDialogueTraceRun> | null) {
  if (!trace) return '未知会话'
  const title = String(trace.session_title || '').trim()
  if (title) return title
  const sid = String(trace.session_id || '').trim()
  return sid ? `会话 ${sid.slice(0, 8)}` : '无会话'
}

function traceProjectLabel(trace?: Partial<VibeDialogueTraceRun> | null) {
  if (!trace) return '未知项目'
  const name = String(trace.project_name || '').trim()
  if (name) return name
  const id = String(trace.project_id || '').trim()
  return id ? `项目 ${id.slice(0, 8)}` : '未知项目'
}

function traceStatusText(status?: string) {
  const s = String(status || '')
  if (s === 'completed') return '完成'
  if (s === 'failed') return '失败'
  if (s === 'cancelled') return '已停止'
  if (s === 'running') return '处理中'
  return s || '未知'
}

function traceStatusClass(status?: string) {
  const s = String(status || '')
  if (s === 'completed') return 'ok'
  if (s === 'failed') return 'bad'
  if (s === 'cancelled') return 'warn'
  return 'neutral'
}

function syncRouteTab() {
  if (route.name === 'vibeSettingsTrace') activeKey.value = 'trace'
}

function backToApp() {
  router.push({ name: 'vibeKnowledge', query: route.query })
}

watch(canViewTraceAudit, (allowed) => {
  if (!allowed && activeKey.value === 'trace') activeKey.value = 'profile'
})

watch(activeKey, (key) => {
  if (key === 'trace' && canViewTraceAudit.value && !traceRuns.value.length) loadTraceRuns(true)
})

onMounted(async () => {
  syncRouteTab()
  await loadCapabilities()
  if (!canViewTraceAudit.value && activeKey.value === 'trace') activeKey.value = 'profile'
  if (activeKey.value === 'trace' && canViewTraceAudit.value) await loadTraceRuns(true)
})
</script>

<style scoped>
.vibe-settings-shell,
.vibe-settings-shell *,
.vibe-settings-shell *::before,
.vibe-settings-shell *::after {
  box-sizing: border-box;
}

.vibe-settings-shell {
  --ink-1: rgba(18, 18, 18, 0.92);
  --ink-2: rgba(18, 18, 18, 0.72);
  --ink-3: rgba(18, 18, 18, 0.46);
  --line: rgba(18, 18, 18, 0.08);
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
  background: #fff;
  color: var(--ink-1);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif;
  overflow: hidden;
}

.settings-drag {
  position: fixed;
  inset: 0 0 auto 0;
  height: 28px;
  -webkit-app-region: drag;
  z-index: 3;
  pointer-events: none;
}

.settings-side {
  min-height: 0;
  padding: 58px 10px 16px;
  background: linear-gradient(90deg, #eeeeef 0%, #dadbdd 100%);
  box-shadow: inset -1px 0 0 rgba(18, 18, 18, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.back-btn,
.nav-row {
  border: 0;
  width: 100%;
  height: 31px;
  border-radius: 10px;
  background: transparent;
  color: var(--ink-2);
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 11px;
  font-size: 14px;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
}

.back-btn {
  background: rgba(255, 255, 255, 0.24);
  color: var(--ink-3);
}

.back-btn:hover,
.nav-row:hover {
  background: rgba(255, 255, 255, 0.42);
}

.settings-search {
  height: 34px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: inset 0 0 0 1px rgba(18, 18, 18, 0.05);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  color: var(--ink-3);
}

.settings-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--ink-1);
  font-size: 13px;
}

.settings-search input::placeholder { color: var(--ink-3); }

.settings-nav {
  margin-top: 8px;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.nav-section h2 {
  margin: 0 0 5px;
  padding: 0 11px;
  color: var(--ink-3);
  font-size: 13px;
  line-height: 1.8;
  font-weight: 500;
}

.nav-row.active {
  background: rgba(18, 18, 18, 0.07);
  color: var(--ink-1);
}

.settings-main {
  min-width: 0;
  min-height: 0;
  position: relative;
  overflow: auto;
  background: #fff;
}

.settings-main.trace-active {
  overflow: hidden;
}

.settings-topbar {
  position: sticky;
  top: 0;
  z-index: 2;
  height: 56px;
  padding: 0 22px;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 620;
  backdrop-filter: blur(12px);
}

.profile-panel,
.trace-panel {
  max-width: 920px;
  margin: 78px auto 60px;
  padding: 0 28px;
}

.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.profile-avatar.avatar-container {
  position: relative;
  width: 58px;
  height: 58px;
  cursor: pointer;
}

.profile-avatar .user-avatar {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 2px solid rgba(0, 0, 0, 0.08);
  will-change: transform;
}

.profile-avatar .online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 11px;
  height: 11px;
  background: #10b981;
  border: 2px solid #fff;
  border-radius: 50%;
  animation: user-pulse 2s ease-in-out infinite;
}

.profile-avatar:hover .user-avatar {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

@keyframes user-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0); }
}

.profile-hero h1 {
  margin: 18px 0 4px;
  font-size: 25px;
  font-weight: 560;
}

.profile-hero p {
  margin: 0;
  color: var(--ink-3);
  font-size: 13px;
}

.profile-hero em {
  display: inline-flex;
  margin-left: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid var(--line);
  font-style: normal;
  color: var(--ink-3);
}

.profile-stats {
  margin: 56px auto 0;
  max-width: 720px;
  min-height: 72px;
  border: 1px solid var(--line);
  border-radius: 17px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
}

.profile-stats div {
  padding: 13px 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
  justify-content: center;
}

.profile-stats div + div { border-left: 1px solid var(--line); }
.profile-stats strong { font-size: 16px; font-weight: 620; }
.profile-stats span { color: var(--ink-3); font-size: 12px; }

.trace-panel {
  max-width: none;
  width: 100%;
  height: calc(100vh - 56px);
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.trace-control {
  flex: 0 0 auto;
  margin-top: 0;
  min-height: 42px;
  border: 1px solid var(--line);
  border-radius: 0;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.trace-control div {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.trace-control strong {
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 560;
  color: var(--ink-1);
}

.trace-control span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-3);
  font-size: 12px;
}

.trace-switch {
  width: 44px;
  height: 25px;
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  padding: 2px;
  background: rgba(18, 18, 18, 0.14);
  cursor: pointer;
  transition: background 0.18s ease;
}

.trace-switch i {
  display: block;
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(18, 18, 18, 0.18);
  transition: transform 0.18s ease;
}

.trace-switch.on { background: rgba(18, 18, 18, 0.86); }
.trace-switch.on i { transform: translateX(19px); }
.trace-switch:disabled { opacity: 0.58; cursor: default; }


.trace-browser {
  flex: 1 1 auto;
  margin-top: 0;
  height: auto;
  min-height: 0;
  border: 1px solid var(--line);
  border-radius: 0;
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  overflow: hidden;
  background: #fff;
}

.trace-list {
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--line);
  background: #fafafa;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

.trace-list-head {
  position: sticky;
  top: 0;
  z-index: 2;
  min-height: 44px;
  padding: 6px 8px 6px 10px;
  background: #fafafa;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.trace-list-title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.trace-list-title strong {
  font-size: 13px;
  font-weight: 560;
}

.trace-list-title span {
  color: var(--ink-3);
  font-size: 11px;
}

.trace-list-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
}

.trace-list-actions button,
.trace-more {
  border: 0;
  background: transparent;
  color: var(--ink-3);
  font-size: 12px;
  cursor: pointer;
}

.trace-list-actions button:hover,
.trace-more:hover { color: var(--ink-1); }

.trace-list-actions button:disabled,
.trace-more:disabled {
  opacity: 0.42;
  cursor: default;
}

.trace-filter-bar {
  position: sticky;
  top: 44px;
  z-index: 2;
  padding: 7px 8px;
  border-bottom: 1px solid var(--line);
  background: #fafafa;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto auto;
  gap: 6px;
  align-items: end;
}

.trace-filter-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.trace-filter-field span {
  color: var(--ink-3);
  font-size: 10.5px;
  line-height: 1;
}

.trace-filter-field input {
  width: 100%;
  height: 27px;
  border: 1px solid rgba(18, 18, 18, 0.1);
  border-radius: 7px;
  background: #fff;
  color: var(--ink-1);
  outline: none;
  padding: 0 8px;
  font-size: 12px;
  min-width: 0;
}

.trace-filter-field input:focus {
  border-color: rgba(18, 18, 18, 0.34);
  box-shadow: 0 0 0 2px rgba(18, 18, 18, 0.055);
}

.trace-filter-apply,
.trace-filter-clear {
  height: 27px;
  border: 1px solid rgba(18, 18, 18, 0.1);
  border-radius: 7px;
  background: #fff;
  color: var(--ink-2);
  padding: 0 8px;
  font-size: 12px;
  cursor: pointer;
}

.trace-filter-apply:hover,
.trace-filter-clear:hover {
  color: var(--ink-1);
  border-color: rgba(18, 18, 18, 0.2);
}

.trace-filter-apply:disabled,
.trace-filter-clear:disabled {
  opacity: 0.42;
  cursor: default;
}

.trace-list-state,
.trace-detail-state {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);
  font-size: 13px;
}

.trace-run-row {
  width: 100%;
  border-bottom: 1px solid rgba(18, 18, 18, 0.055);
  background: transparent;
  padding: 0;
  text-align: left;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: stretch;
}

.trace-run-row:hover { background: rgba(18, 18, 18, 0.035); }
.trace-run-row.active { background: #fff; box-shadow: inset 3px 0 0 #111; }
.trace-run-row.checked { background: rgba(18, 18, 18, 0.026); }

.trace-select-box {
  position: relative;
  width: 100%;
  border: 0;
  background: transparent;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.trace-select-box::before {
  content: "";
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid rgba(18, 18, 18, 0.24);
  background: #fff;
}

.trace-select-box.checked::before {
  position: absolute;
  border-color: #111;
  background: #111;
}

.trace-select-box svg {
  position: relative;
  z-index: 1;
}

.trace-row-main {
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 7px 10px 7px 0;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
}

.trace-row-heading {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
}

.trace-row-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-1);
  font-size: 13px;
  line-height: 1.3;
}

.trace-audit-marker {
  flex: 0 0 auto;
  max-width: 96px;
  border: 1px solid rgba(18, 18, 18, 0.12);
  border-radius: 5px;
  padding: 1px 5px;
  background: #f3f3f3;
  color: rgba(18, 18, 18, 0.56);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10.5px;
  line-height: 1.25;
}

.trace-row-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-3);
  font-size: 11.5px;
}

.trace-row-meta.subtle {
  padding-left: 12px;
  font-size: 11px;
}

.trace-status {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #9ca3af;
  flex: 0 0 auto;
}
.trace-status.ok { background: #2f7d4b; }
.trace-status.bad { background: #b84a4a; }
.trace-status.warn { background: #9a6a16; }
.trace-status.neutral { background: #8b8b8b; }

.trace-more {
  height: 36px;
  border-top: 1px solid var(--line);
}

.trace-detail {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 10px 12px 16px;
}

.trace-detail-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
}

.trace-detail-head p {
  margin: 0 0 3px;
  color: var(--ink-3);
  font-size: 11px;
}

.trace-detail-head h2 {
  margin: 0;
  font-size: 15px;
  line-height: 1.35;
  font-weight: 560;
}

.trace-audit-id {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--ink-3);
  font-size: 11px;
}

.trace-audit-id code {
  border: 1px solid rgba(18, 18, 18, 0.12);
  border-radius: 5px;
  padding: 2px 6px;
  background: #f3f3f3;
  color: var(--ink-1);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.trace-audit-id button {
  border: 0;
  background: transparent;
  color: var(--ink-3);
  font-size: 11px;
  cursor: pointer;
}

.trace-audit-id button:hover { color: var(--ink-1); }

.trace-status-pill {
  height: 24px;
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 12px;
  border: 1px solid var(--line);
  color: var(--ink-3);
  flex: 0 0 auto;
}
.trace-status-pill.ok { color: #2f7d4b; background: #eef8f1; border-color: #d8ecdf; }
.trace-status-pill.bad { color: #a33a3a; background: #fff1f1; border-color: #f0d8d8; }
.trace-status-pill.warn { color: #8a5c0e; background: #fff7e8; border-color: #f3dfb8; }

.trace-section {
  padding: 9px 0;
  border-bottom: 1px solid var(--line);
}

.trace-section.compact {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px 10px;
}

.trace-section-title {
  margin-bottom: 5px;
  color: var(--ink-3);
  font-size: 11px;
  font-weight: 560;
}

.trace-attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.trace-attachment-chip {
  max-width: 320px;
  min-width: 0;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 6px 8px 6px 6px;
  color: var(--ink-2);
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.trace-attachment-chip:hover {
  border-color: rgba(18, 18, 18, 0.18);
  background: #fafafa;
}

.trace-attachment-icon {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  color: var(--ink-2);
  background: #f3f4f6;
}

.trace-attachment-icon svg {
  width: 16px;
  height: 16px;
}

.trace-attachment-main {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.trace-attachment-name,
.trace-attachment-meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trace-attachment-name {
  color: var(--ink-1);
  font-size: 12px;
  font-weight: 560;
  line-height: 1.25;
}

.trace-attachment-meta {
  color: var(--ink-3);
  font-size: 11px;
  line-height: 1.2;
}

.trace-kv {
  min-width: 0;
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
}

.trace-kv span { color: var(--ink-3); flex: 0 0 58px; }
.trace-kv code {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #f5f5f5;
  border-radius: 5px;
  padding: 1px 5px;
  color: var(--ink-2);
}

.trace-markdown {
  color: var(--ink-1);
  font-size: 12.5px;
  line-height: 1.56;
  overflow-wrap: anywhere;
}

.trace-markdown.small { font-size: 12px; color: var(--ink-2); }
.trace-markdown :deep(p) { margin: 0 0 5px; }
.trace-markdown :deep(p:last-child) { margin-bottom: 0; }
.trace-markdown :deep(ul),
.trace-markdown :deep(ol) { margin: 6px 0; padding-left: 20px; }
.trace-markdown :deep(code) {
  background: #f2f2f2;
  border-radius: 5px;
  padding: 1px 5px;
  font-family: "SF Mono", Menlo, monospace;
  font-size: 12px;
}
.trace-markdown :deep(pre) {
  margin: 8px 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f7f7f7;
  overflow: auto;
}
.trace-markdown :deep(blockquote) {
  margin: 8px 0;
  padding: 4px 0 4px 10px;
  border-left: 3px solid #d6d6d6;
  color: var(--ink-2);
}
.trace-markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 12px;
}
.trace-markdown :deep(th),
.trace-markdown :deep(td) { border: 1px solid var(--line); padding: 5px 7px; }
.trace-empty-text { color: var(--ink-3); }

.trace-timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.trace-event {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 6px;
}

.trace-event-dot {
  width: 6px;
  height: 6px;
  margin: 8px auto 0;
  border-radius: 50%;
  background: #111;
}

.trace-event-body {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 7px 8px;
  background: #fff;
}

.trace-event-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.trace-event-head strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 560;
}

.trace-event-head span,
.trace-event-reason {
  color: var(--ink-3);
  font-size: 11.5px;
}

.trace-event-reason { margin: 3px 0 0; }

.trace-json {
  margin-top: 5px;
  font-size: 11.5px;
}

.trace-json summary {
  color: var(--ink-3);
  cursor: pointer;
  user-select: none;
}

.trace-json pre {
  max-height: 520px;
  overflow: auto;
  margin: 5px 0 0;
  padding: 7px 8px;
  border-radius: 6px;
  background: #f7f7f7;
  color: var(--ink-2);
  font-family: "SF Mono", Menlo, monospace;
  font-size: 11px;
  line-height: 1.42;
}

@media (max-width: 980px) {
  .trace-panel { height: auto; min-height: calc(100vh - 56px); overflow: visible; }
  .trace-control div { align-items: flex-start; flex-direction: column; gap: 2px; }
  .trace-browser { grid-template-columns: 1fr; height: auto; min-height: 0; }
  .trace-list { max-height: 260px; border-right: 0; border-bottom: 1px solid var(--line); }
  .trace-section.compact { grid-template-columns: 1fr; }
}

</style>
