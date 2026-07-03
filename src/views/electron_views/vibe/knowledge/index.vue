<template>
  <main class="vibe-shell">
    <div class="window-drag" />
    <aside class="side">
      <div class="side-top">
        <button class="back" type="button" :disabled="sending" @click="router.push({ name: 'vibeWorkbench' })">
          <svg class="back-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          AsyncTest Vibe
        </button>
      </div>

      <section class="proj-card">
        <span class="proj-label">当前项目</span>
        <AppSelect
          class="project-select"
          :model-value="selectedProjectId"
          :options="projectOptions"
          placeholder="选择项目"
          :disabled="sending || loading"
          @change="handleProjectChange"
        >
          <template #trigger="{ open, label, placeholder }">
            <span class="proj-ic" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
            </span>
            <span class="proj-main">
              <span class="proj-name">{{ label || placeholder }}</span>
              <span class="proj-kb">{{ kbStats.passages }} 段原文 · {{ kbStats.modules }} 模块</span>
            </span>
            <svg class="proj-caret" :class="{ open }" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </template>
        </AppSelect>
      </section>

      <section class="convs">
        <div class="convs-head">
          <span class="convs-title">需求对话</span>
          <button class="round-btn" type="button" title="新建对话" :disabled="sending" @click="newConversation">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>

        <div v-if="sessions.length" class="convs-search">
          <svg class="convs-search-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="m20 20-3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          <input v-model="sessionFilter" class="convs-search-input" type="text" placeholder="搜索对话" />
          <button v-if="sessionFilter" class="convs-search-clear" type="button" title="清除" @click="sessionFilter = ''">×</button>
        </div>

        <div class="convs-list">
          <div
            v-for="item in filteredSessions"
            :key="item.id"
            :class="['session-row', { active: activeSessionId === item.id }]"
          >
            <button class="session-open" type="button" @click="openSession(item.id)">
              <span class="session-ic" aria-hidden="true">
                <RunningDots v-if="isSessionWaiting(item.id)" />
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>
              </span>
              <span class="session-body">
                <span class="session-title">{{ sessionDisplayTitle(item) }}</span>
              </span>
            </button>
            <button
              class="session-delete"
              type="button"
              title="删除"
              :disabled="sending || deletingSessionId === item.id"
              @click="deleteSession(item.id)"
            >
              ×
            </button>
          </div>
          <p v-if="!sessions.length" class="muted">开始第一轮录入后，这里会出现对话记录。</p>
          <p v-else-if="!filteredSessions.length" class="muted">没有匹配“{{ sessionFilter }}”的对话。</p>
        </div>
      </section>

      <section class="kb-overview">
        <div class="kb-head">
          <span class="kb-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
            知识库概览
          </span>
          <button class="kb-refresh" type="button" title="刷新" :disabled="kbStatsLoading" @click="loadKbStats">
            <svg :class="['kb-refresh-ic', { spin: kbStatsLoading }]" width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12a8 8 0 0 1 13.7-5.6M18 4.5V8h-3.5M20 12a8 8 0 0 1-13.7 5.6M6 19.5V16h3.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <div class="kb-metrics">
          <div class="kb-metric"><span class="kb-num">{{ kbStats.passages }}</span><span class="kb-unit">原文段</span></div>
          <div class="kb-metric"><span class="kb-num">{{ kbStats.modules }}</span><span class="kb-unit">覆盖模块</span></div>
        </div>
      </section>
    </aside>

    <section class="main-frame">
      <section class="main">
        <header class="main-head" :class="{ compact: !headKicker }">
          <div>
            <p v-if="headKicker">{{ headKicker }}</p>
            <h1>{{ headTitle }}</h1>
          </div>
        </header>

      <section v-if="currentView === 'conversation'" class="conversation">
        <div ref="timelineEl" class="timeline" @scroll.passive="handleTimelineScroll">
          <div v-if="!events.length" class="empty">
            <strong>从一句话开始录入需求</strong>
            <span>直接描述需求、提出问题或补充说明，系统会自动判断本轮应该回答、整理需求，还是两者一起处理。</span>
          </div>
          <article
            v-for="event in events"
            :key="event.id"
            v-show="shouldRenderEvent(event)"
            :class="[
              event.role === 'assistant' ? 'assistant-message' : 'event user-event',
              {
                'confirmation-choice-event': isConfirmationReplyEvent(event),
                'package-action-message': isPackageActionEvent(event),
              },
            ]"
          >
            <!-- 反问续跑：整条【反问→你的选择→继续思考→(可再问→再选)→答案】合并成"一条思考"，不隐藏 -->
            <template v-if="isClarifyThreadRoot(event)">
              <ProcessDisclosure
                v-if="mergedThreadSteps(event).length || threadRunning(event)"
                :steps="mergedThreadSteps(event)"
                :running="threadRunning(event)"
                :duration-ms="threadDurationMs(event)"
              />
              <template v-if="threadFinalAnswer(event)">
                <div class="message-md" v-html="renderMarkdown(threadFinalAnswer(event))" />
                <div
                  v-if="threadFinalNode(event) && eventSources(threadFinalNode(event)).length"
                  class="answer-trust"
                >
                  <SourceChips :items="eventSources(threadFinalNode(event))" />
                </div>
                <AssistantActions
                  v-if="threadFinalNode(event)"
                  :time="formatTime(threadFinalNode(event).created_at)"
                  :content="threadFinalAnswer(event)"
                  :is-last="threadFinalNode(event).id === lastAssistantId"
                />
              </template>
            </template>
            <template v-else>
              <ProcessDisclosure
                v-if="event.role === 'assistant' && eventProcessSteps(event).length"
                :steps="eventProcessSteps(event)"
                :running="isPendingClarification(event)"
                :duration-ms="eventProcessDuration(event)"
              />
              <div v-if="event.role !== 'assistant'" class="event-top">
                <span class="role">{{ eventRoleLabel(event) }}</span>
                <time v-if="event.created_at">{{ formatTime(event.created_at) }}</time>
              </div>
              <div
                v-if="event.role !== 'assistant'"
                class="user-message-wrap"
                :class="{ expanded: isUserMessageExpanded(event.id) }"
              >
                <div class="user-message-bubble">
                  <p class="user-message-content">
                    <template v-if="isConfirmationReplyEvent(event)">已选择：{{ event.content }}</template>
                    <template v-else>{{ event.content }}</template>
                  </p>
                  <button
                    v-if="shouldCollapseUserMessage(event)"
                    class="user-message-more"
                    type="button"
                    @click="toggleUserMessageExpanded(event.id)"
                  >
                    {{ isUserMessageExpanded(event.id) ? '收起' : '显示更多' }}
                  </button>
                </div>
                <div class="user-message-tools">
                  <time v-if="event.created_at" class="user-hover-time">{{ formatHoverTime(event.created_at) }}</time>
                  <button
                    class="user-copy-btn"
                    type="button"
                    title="复制"
                    aria-label="复制输入内容"
                    @click.stop="copyUserMessage(event)"
                  >
                    <svg
                      class="copy-stack-pop"
                      width="20"
                      height="20"
                      viewBox="0 0 40 40"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <rect class="copy-back" x="11" y="9" width="16" height="16" rx="3" stroke="currentColor" stroke-width="2.2" />
                      <rect class="copy-front" x="14" y="14" width="16" height="16" rx="3" fill="#fff" stroke="currentColor" stroke-width="2.2" />
                      <rect class="copy-flash" x="14" y="14" width="16" height="16" rx="3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
              <div v-else-if="isPackageActionEvent(event)" class="package-action-line">
                <strong>{{ eventPackageActionTitle(event) }}</strong>
                <span>{{ eventPackageActionDetail(event) }}</span>
              </div>
              <!-- 待回答的反问：还在思考、别出加粗回复（选项框在输入区） -->
              <template v-else-if="!isPendingClarification(event)">
                <div class="message-md" v-html="renderMarkdown(eventDisplayContent(event))" />
                <div v-if="eventSources(event).length" class="answer-trust">
                  <SourceChips :items="eventSources(event)" />
                </div>
                <AssistantActions :time="formatTime(event.created_at)" :content="eventDisplayContent(event)" :is-last="event.id === lastAssistantId" />
              </template>
              <div v-if="parentContinuationResponses(event).length" class="continuation-responses">
                <article
                  v-for="responseEvent in parentContinuationResponses(event)"
                  :key="responseEvent.id"
                  class="continuation-response"
                >
                  <ProcessDisclosure
                    v-if="eventProcessSteps(responseEvent).length"
                    :steps="eventProcessSteps(responseEvent)"
                    :duration-ms="eventProcessDuration(responseEvent)"
                  />
                  <div class="message-md" v-html="renderMarkdown(eventDisplayContent(responseEvent))" />
                  <div v-if="eventSources(responseEvent).length" class="answer-trust">
                    <SourceChips :items="eventSources(responseEvent)" />
                  </div>
                  <AssistantActions :time="formatTime(responseEvent.created_at)" :content="eventDisplayContent(responseEvent)" :is-last="responseEvent.id === lastAssistantId" />
                </article>
              </div>
              <div v-if="isStreamingUnderEvent(event) && streamingTurnVisible" class="continuation-responses">
                <article class="continuation-response streaming-inline-response">
                  <ProcessDisclosure
                    v-if="streamingProcess.steps.length || streamingProcess.status === 'running'"
                    :steps="streamingProcess.steps"
                    :running="streamingProcess.status === 'running'"
                    :duration-ms="streamingProcess.durationMs"
                  />
                  <div v-if="streamingAssistantContent" class="message-md" v-html="renderMarkdown(streamingAssistantContent)" />
                  <div v-if="streamingAssistantContent && streamingSources.length" class="answer-trust">
                    <SourceChips :items="streamingSources" />
                  </div>
                </article>
              </div>
            </template>
          </article>
          <article v-if="streamingAssistantStandaloneVisible" class="assistant-message streaming-message">
            <ProcessDisclosure
              v-if="streamingProcess.steps.length || streamingProcess.status === 'running'"
              :steps="streamingProcess.steps"
              :running="streamingProcess.status === 'running'"
              :duration-ms="streamingProcess.durationMs"
            />
            <div v-if="streamingAssistantContent" class="message-md" v-html="renderMarkdown(streamingAssistantContent)" />
            <div v-if="streamingAssistantContent && streamingSources.length" class="answer-trust">
              <SourceChips :items="streamingSources" />
            </div>
          </article>
        </div>

        <div class="composer-anchor">
          <transition name="fab-fade">
            <button
              v-show="!isAtBottom"
              class="scroll-bottom-fab"
              type="button"
              aria-label="滚动到底部"
              @click="scrollBottomSmooth"
            >
              <ScrollDownIcon />
            </button>
          </transition>
        </div>

        <footer class="composer">
          <ChatComposer
            v-model="composerDraft"
            :sending="sending"
            :placeholder="composerPlaceholder"
            :status-text="composerStatusText"
            :question="composerQuestion"
            @send="onComposerSend"
            @answer="onComposerAnswer"
          />
        </footer>
      </section>
      </section>
    </section>

    <VibeModelSettings />
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ApiGetJoinProjects } from '@/api/project/index'
import AppSelect from '@/components/common/select/AppSelect.vue'
import VibeModelSettings from '../VibeModelSettings.vue'
import ProcessDisclosure from './components/ProcessDisclosure.vue'
import ScrollDownIcon from './components/icons/ScrollDownIcon.vue'
import AssistantActions from './components/AssistantActions.vue'
import SourceChips from './components/SourceChips.vue'
import RunningDots from './components/RunningDots.vue'
import ChatComposer from './components/ChatComposer.vue'
import {
  createProcessState,
  consumeProcessEvent,
  resetProcessState,
  stepsFromMeta,
  durationFromMeta,
  type ProcessStep,
} from './composables/useProcessTurn'
import {
  autoTitleVibeSession,
  createVibeSession,
  deleteVibeSession,
  getVibeProjectByAsyncProject,
  initVibeProject,
  listVibeEvents,
  listVibeSessions,
  streamFoundationTurn,
  listFoundationProposals,
  actFoundationProposal,
  getFoundationPassageStatsMany,
  updateVibeProject,
  updateVibeSession,
  type FoundationMaterial,
  type FoundationStatement,
  type VibeEvent,
  type VibeProject,
  type VibeSession,
} from '../api'

const router = useRouter()
const projects = ref<any[]>([])
const selectedProject = ref<any | null>(null)
const selectedProjectId = ref<string | number | null>(null)
const vibeProject = ref<VibeProject | null>(null)
const sessions = ref<VibeSession[]>([])
const events = ref<VibeEvent[]>([])

// 最后一条 assistant 回复的 id（其操作按钮常驻显示）
const lastAssistantId = computed(() => {
  for (let i = events.value.length - 1; i >= 0; i -= 1) {
    const e: any = events.value[i]
    if (e?.role === 'assistant' && !isPackageActionEvent(e)) return e.id
  }
  return ''
})
const activeSessionId = ref('')
const currentView = ref<'conversation' | 'baseline'>('conversation')
const loading = ref(false)
// 对话搜索（纯客户端过滤，不打后端）
const sessionFilter = ref('')
const filteredSessions = computed(() => {
  const q = sessionFilter.value.trim().toLowerCase()
  if (!q) return sessions.value
  return sessions.value.filter(s => sessionDisplayTitle(s).toLowerCase().includes(q))
})
// 左栏知识库读数。关键：passages 表按【vibe 工程 UUID】存（turn/录入用的是 vibeProject.id），
// 而左栏项目下拉是【async 项目 id】，两者不同。所以这里要先把 async id 解析成 vibe UUID，
// 再按 UUID 批量取段/模块——否则用 async id 查 passages 永远是 0。
const asyncToVibe = reactive<Record<string, string>>({})                                 // async 项目 id -> vibe UUID
const projectStatsMap = reactive<Record<string, { passages: number; modules: number }>>({}) // 按 vibe UUID 存读数
const kbStatsLoading = ref(false)
async function loadKbStats() {
  // 当前项目的 UUID 已知（selectProject 解析过），先登记，项目卡/概览即时有数
  const curAid = selectedProjectId.value != null ? String(selectedProjectId.value) : ''
  if (curAid && vibeProject.value?.id) asyncToVibe[curAid] = String(vibeProject.value.id)
  // 其余项目逐个解析 async -> vibe（并行；没建 vibe 工程的当 0 处理）
  await Promise.all((projects.value || []).map(async (p: any) => {
    const aid = String(p.id)
    if (asyncToVibe[aid]) return
    try {
      const vp = await getVibeProjectByAsyncProject(Number(p.id))
      if (vp?.id) asyncToVibe[aid] = String(vp.id)
    } catch { /* 该项目还没建 vibe 工程 → 视为 0 段 */ }
  }))
  const uuids = Array.from(new Set(Object.values(asyncToVibe))).filter(Boolean)
  if (!uuids.length) return
  kbStatsLoading.value = true
  try {
    const map = await getFoundationPassageStatsMany(uuids)
    uuids.forEach((u) => {
      const s = map?.[u]
      projectStatsMap[u] = { passages: Number(s?.passages || 0), modules: Number(s?.modules || 0) }
    })
  } catch { /* 概览读取失败不阻塞主流程 */ } finally {
    kbStatsLoading.value = false
  }
}
// 当前项目读数（项目卡 + 底部概览卡共用）：按 vibe UUID 取
const kbStats = computed(() => {
  const u = vibeProject.value?.id ? String(vibeProject.value.id) : (asyncToVibe[String(selectedProjectId.value ?? '')] || '')
  return (u && projectStatsMap[u]) || { passages: 0, modules: 0 }
})
// 对话行"等待回复中"：本轮 turn 跑在活动会话上，故活动会话 + 后端忙 = 等待
function isSessionWaiting(id: string): boolean {
  return (foundationBusy.value || preparingSend.value) && id === activeSessionId.value
}
const preparingSend = ref(false)
const sendingSessionIds = ref<string[]>([])
const draft = ref('')
const liveLogs = ref<{ id: string; type: string; message: string }[]>([])
// foundation 新管线（知识库前端唯一管线，不再有灰度开关）
const foundationBusy = ref(false)
const foundationPending = ref(0)
const processExpanded = ref(false)
const streamingProcess = createProcessState()
// 历史事件渲染（eventDisplayContent）仍需读取方案包状态展示，保留只读覆盖表
const packageStatusOverrides = ref<Record<string, string>>({})
const sessionTitleOverrides = ref<Record<string, string>>({})
const expandedUserMessageIds = ref<string[]>([])
const deletingSessionId = ref('')
const streamingAssistantContent = ref('')
const streamingSources = ref<any[]>([])        // T1 溯源：本轮答案的来源段（流式渲染用）
const streamingVerification = ref<any | null>(null) // T8 核验：{checked, issues, clean}
const streamingContinuationParentId = ref('')
const timelineEl = ref<HTMLElement | null>(null)
const processBodyEl = ref<HTMLElement | null>(null)
const draftEl = ref<HTMLTextAreaElement | null>(null)
const MAX_LIVE_LOGS = 80
const baselineDraft = reactive<{ system_name: string; summary: string; system_goals: { name: string; description: string }[] }>({ system_name: '', summary: '', system_goals: [] })
const composerDraft = computed({
  get: () => draft.value,
  set: (value: string) => { draft.value = value },
})

const projectOptions = computed(() => projects.value.map(project => {
  const u = asyncToVibe[String(project.id)]
  const st = u ? projectStatsMap[u] : undefined
  return {
    value: String(project.id),
    label: project.name || project.project_name || `项目 ${project.id}`,
    // 下拉里逐项目显示原文段数 + 模块数（拿不到时退回原描述）
    hint: st ? `${st.passages} 段 · ${st.modules} 模块` : (project.description || project.owner_name || project.creator_name || ''),
  }
}))
const activeSessionSending = computed(() =>
  !!activeSessionId.value && sendingSessionIds.value.includes(activeSessionId.value),
)
const sending = computed(() => preparingSend.value || foundationBusy.value || sendingSessionIds.value.length > 0)
const composerStatusText = computed(() => {
  if (preparingSend.value) return '正在创建对话…'
  if (!foundationBusy.value) return ''
  // 任何时刻都让用户知道"在处理"：过程区在跑时它自己显示思考；过程区收起到答案出来这段
  // （之前的"空窗"）补一句明确状态，避免看起来卡住。
  if (streamingProcess.status === 'running') return ''
  return streamingAssistantContent.value ? '正在收尾…' : '正在生成回答…'
})
const composerPlaceholder = computed(() =>
  sending.value
    ? '正在处理上一条，请稍候…'
    : '描述需求原文或直接提问，系统会自动判断录入还是检索…')
// 询问模式（Codex 反问）：后端 ask_clarification（录入纪律"这段要不要记进知识库"拿不准时）→ 输入框变选项
// pending = 后端反问挂起时的"思考草稿"；用户回答时原样回传 → 续跑同一思考（不另起新轮）。
const clarificationActive = ref<{ question: string; raw?: any; pending?: any[] } | null>(null)
const composerQuestion = computed(() => {
  const c = clarificationActive.value
  if (!c?.question) return null
  const raw: any = c.raw
  const kind = raw && typeof raw === 'object' ? raw.kind : null

  // ① 改原文·待确认：显示 diff 预览 + 确认应用/取消
  if (kind === 'edit') {
    return {
      title: c.question,
      description: raw.summary || '看下面的改动预览，确认应用吗？',
      diff: { breadcrumb: raw.breadcrumb, oldBody: raw.old_body, newBody: raw.new_body },
      items: [
        { type: 'choice' as const, label: '确认应用', value: '__APPLY_EDIT__' },
        { type: 'choice' as const, label: '取消', value: '__CANCEL_EDIT__' },
        { type: 'input' as const, placeholder: '或者说说要怎么改…' },
      ],
    }
  }
  // ①b 录入单条·待确认：新段预览（diff 全绿）+ 确认录入/取消
  if (kind === 'insert') {
    return {
      title: c.question,
      description: raw.summary || '把这条作为新原文段录进知识库，确认吗？',
      diff: { breadcrumb: raw.breadcrumb, oldBody: '', newBody: raw.body },
      items: [
        { type: 'choice' as const, label: '确认录入', value: '__APPLY_EDIT__' },
        { type: 'choice' as const, label: '取消', value: '__CANCEL_EDIT__' },
        { type: 'input' as const, placeholder: '或者说说要怎么改…' },
      ],
    }
  }
  // ①c 连锁（Phase 3）：主改后发现多处也该一起改 → 多处 diff、逐项勾选、一次确认
  if (kind === 'cascade') {
    const cands = Array.isArray(raw.candidates) ? raw.candidates : []
    return {
      title: c.question,
      description: '勾选要一起改的地方，确认后批量应用；取消勾选的那处保持不变。',
      cascade: cands.map((cd: any) => ({
        id: cd.passage_id, breadcrumb: cd.breadcrumb, oldBody: cd.old_body, newBody: cd.new_body,
        reason: cd.reason || '', mode: cd.mode || 'literal', checked: cd.checked !== false,
      })),
      items: [
        { type: 'choice' as const, label: '确认应用勾选项', value: '__APPLY_EDIT__' },
        { type: 'choice' as const, label: '都不改了', value: '__CANCEL_EDIT__' },
      ],
    }
  }
  // ② 开放式反问（改原文定位不准/要更具体）：给输入框 + 一个"取消"，别让用户被一个框困住
  if (kind === 'ask') {
    return {
      title: c.question,
      description: '把要改/删的那句原文说得更具体点，或者取消这次修改',
      items: [
        { type: 'choice' as const, label: '取消', value: '__CANCEL_EDIT__' },
        { type: 'input' as const, placeholder: '说得更具体点…' },
      ],
    }
  }
  // ③ 录入纪律（默认）：是/否
  return {
    title: c.question,
    description: '选一个，我就按你的意思处理',
    items: [
      { type: 'choice' as const, label: '是，记进知识库', value: '是，请把这段记进知识库' },
      { type: 'choice' as const, label: '否，只是问问', value: '不用记，我只是想问一下' },
      { type: 'input' as const, placeholder: '或者告诉我该怎么处理…' },
    ],
  }
})
// #4 反问【持久化】：未回答的反问，下次进会话、甚至关 app 重开都还原选项框。
// 判据：会话最后一条是 assistant 反问（后面没有用户回答）→ 还原；否则清掉。
// 依赖后端把 clarification 存进 assistant 事件 meta（已加）。
function restoreClarificationFromEvents() {
  const evs = events.value as any[]
  const last = evs[evs.length - 1]
  if (last && last.role === 'assistant') {
    const q = eventClarificationQuestion(last)
    const clar = last?.meta?.clarification
    clarificationActive.value = q
      ? { question: q, raw: clar?.raw, pending: Array.isArray(clar?.pending) ? clar.pending : [] }
      : null
  } else {
    clarificationActive.value = null
  }
}
const streamingTurnVisible = computed(() =>
  !!streamingAssistantContent.value
  || streamingProcess.status === 'running'
  || streamingProcess.steps.length > 0,
)
const streamingAssistantStandaloneVisible = computed(() =>
  streamingTurnVisible.value
  && (!streamingContinuationParentId.value || !hasEvent(streamingContinuationParentId.value)),
)
const headKicker = computed(() => {
  if (currentView.value === 'conversation') return ''
  return 'Project Baseline'
})
const activeSession = computed(() =>
  sessions.value.find(item => item.id === activeSessionId.value) || null,
)
const headTitle = computed(() => {
  if (currentView.value === 'conversation') {
    return activeSession.value ? sessionDisplayTitle(activeSession.value) : 'Vibe 需求对话'
  }
  return '项目基线'
})

onMounted(() => { bootstrap(); refreshFoundationPending() })

async function bootstrap() {
  loading.value = true
  try {
    const response: any = await ApiGetJoinProjects({})
    projects.value = Array.isArray(response) ? response : (response?.results || [])
    if (projects.value.length) {
      const saved = localStorage.getItem('vibe_project_source_project_id')
      const target = projects.value.find(item => String(item.id) === String(saved)) || projects.value[0]
      await selectProject(target)
    }
  } finally {
    loading.value = false
  }
}

async function selectProject(project: any) {
  selectedProject.value = project
  selectedProjectId.value = String(project.id)
  packageStatusOverrides.value = {}
  sessionTitleOverrides.value = {}
  localStorage.setItem('vibe_project_source_project_id', String(project.id))
  try {
    vibeProject.value = await getVibeProjectByAsyncProject(Number(project.id))
  } catch {
    vibeProject.value = await initVibeProject(Number(project.id), { name: project.name || project.project_name || `项目 ${project.id}` })
  }
  syncBaselineDraft()
  await refreshState({ autoOpenLatest: true })
  loadKbStats()  // 切项目后刷新左栏知识库概览
}

async function handleProjectChange(value: string | number) {
  if (sending.value) return
  const project = projects.value.find(item => String(item.id) === String(value))
  if (!project) return
  activeSessionId.value = ''
  events.value = []
  liveLogs.value = []
  processExpanded.value = false
  clearStreamingAssistant()
  currentView.value = 'conversation'
  await selectProject(project)
}

function syncBaselineDraft() {
  const baseline = vibeProject.value?.baseline || {}
  baselineDraft.system_name = baseline.system_name || vibeProject.value?.name || ''
  baselineDraft.summary = baseline.summary || ''
  const goals = Array.isArray(baseline.system_goals) ? baseline.system_goals : []
  baselineDraft.system_goals = goals.map((g: any) =>
    typeof g === 'string'
      ? { name: g, description: '' }
      : { name: g?.name || '', description: g?.description || '' },
  )
}

function sessionDisplayTitle(session: VibeSession) {
  return sessionTitleOverrides.value[session.id] || session.title || 'Vibe 需求对话'
}

function isDefaultSessionTitle(title?: string) {
  const value = (title || '').trim()
  return !value || ['新的需求对话', 'Vibe 需求对话', '未命名对话'].includes(value)
}

function summarizeSessionTitleFromContent(content: string) {
  const normalized = content
    .replace(/\s+/g, ' ')
    .replace(/^[请帮我帮我想要我想现在需要]+/u, '')
    .trim()
  const systemIntro = normalized.match(/(?:这是|这是一个|这个是|当前是|系统是)([^，,。；;：:]{2,24})(?:，|,|。|；|;|用于|主要|是一个|$)/u)
  if (systemIntro?.[1]) return `${systemIntro[1].trim()}介绍`
  const firstSentence = normalized.split(/[。！？!?；;]/u).find(Boolean) || normalized
  const compact = firstSentence
    .replace(/^(请|帮我|我想|需要|现在)/u, '')
    .replace(/[，,：:]+$/u, '')
    .trim()
  return compact.length > 24 ? `${compact.slice(0, 24)}…` : compact || '新的需求对话'
}

function applySessionTitle(sessionId: string, title: string) {
  if (!title) return
  sessionTitleOverrides.value = { ...sessionTitleOverrides.value, [sessionId]: title }
  sessions.value = sessions.value.map(item => item.id === sessionId ? { ...item, title } : item)
}

async function autoNameSessionFromFirstInput(sessionId: string, content: string) {
  const session = sessions.value.find(item => item.id === sessionId)
  if (!session || !isDefaultSessionTitle(session.title) || events.value.length) return
  // 1) 先用本地启发式标题占位，即时反馈，不阻塞发送。
  const placeholder = summarizeSessionTitleFromContent(content)
  applySessionTitle(sessionId, placeholder)
  // 2) 后台请求后端用 LLM 总结一个更精炼的标题；成功则替换，失败回退占位并落库。
  autoTitleVibeSession(sessionId, content)
    .then((updated) => { applySessionTitle(sessionId, updated?.title || placeholder) })
    .catch(() => { updateVibeSession(sessionId, { title: placeholder }).catch(() => {}) })
}

function addBaselineGoal() {
  baselineDraft.system_goals.push({ name: '', description: '' })
}

function removeBaselineGoal(idx: number) {
  baselineDraft.system_goals.splice(idx, 1)
}

async function refreshState(options: { autoOpenLatest?: boolean } = {}) {
  if (!vibeProject.value) return
  sessions.value = await listVibeSessions(vibeProject.value.id)
  if (options.autoOpenLatest && !activeSessionId.value && sessions.value.length) {
    await openSession(sessions.value[0].id)
  }
}

async function openSession(sessionId: string) {
  // #2：答题进行中也允许切到别的会话【只读查看】（本轮 UI 由 turnSessionId 守住、不串会话）。
  activeSessionId.value = sessionId
  currentView.value = 'conversation'
  liveLogs.value = []
  processExpanded.value = false
  clearStreamingAssistant()
  events.value = sortEvents(await listVibeEvents(sessionId))
  restoreClarificationFromEvents()  // #4：进会话时若有未答反问 → 还原选项框
  await scrollBottom()
}

function newConversation() {
  if (sending.value) return
  activeSessionId.value = ''
  events.value = []
  liveLogs.value = []
  processExpanded.value = false
  clarificationActive.value = null
  clearStreamingAssistant()
  currentView.value = 'conversation'
  draft.value = ''
  resizeDraft()
}

async function deleteSession(sessionId: string) {
  if (!sessionId || deletingSessionId.value || sending.value) return
  deletingSessionId.value = sessionId
  const deletingActive = activeSessionId.value === sessionId
  try {
    await deleteVibeSession(sessionId)
    if (deletingActive) {
      activeSessionId.value = ''
      events.value = []
      liveLogs.value = []
      processExpanded.value = false
      clearStreamingAssistant()
      currentView.value = 'conversation'
    }
    await refreshState({ autoOpenLatest: deletingActive })
  } finally {
    deletingSessionId.value = ''
  }
}

async function ensureSession() {
  if (activeSessionId.value) return activeSessionId.value
  if (!vibeProject.value) throw new Error('Vibe 项目未初始化')
  const session = await createVibeSession(vibeProject.value.id, { title: '新的需求对话' })
  activeSessionId.value = session.id
  await refreshState()
  if (!sessions.value.some(item => item.id === session.id)) {
    sessions.value.unshift(session)
  }
  return session.id
}

async function send() {
  await sendFoundationTurn()
}

// 录入意图关键词：附件 + 这些词之一 → 把文件【整篇录入知识库】（切段进 passage 库），而不是当提问资料。
const INGEST_INTENT_RE = /录入|导入|入库|收录|沉淀|存进|存入|记进|加进知识库|存到知识库/

// 新输入框发送：
//  ① 附件 + 录入意图 → 整篇文件录入知识库（document 切段，干净显示"导入《X》"，不塞 markdown 进提问）；
//  ② 否则 → 文件作本轮提问的资料（附在问题后，不入库）。
async function onComposerSend({ text, files }: { text: string; files: File[] }) {
  const base = (text || '').trim()
  const fileList = files || []
  if (sending.value) return

  // ① 录入文件：附件整篇录入知识库（切段进 passage 库），但【保留用户自己输入的那句话】作为气泡，不替换。
  // （附件本身后续在 UI 上挂到提问处展示；这里只把文件正文走 document 字段切段，不动可见消息。）
  if (fileList.length && INGEST_INTENT_RE.test(base)) {
    let doc = ''
    for (const f of fileList) {
      try {
        const c = (await f.text()).trim()
        if (c) doc += (doc ? '\n\n' : '') + c
      } catch { /* 读不出的跳过 */ }
    }
    if (doc) {
      draft.value = ''
      await sendFoundationTurn(base, { documentContent: doc })
      return
    }
  }

  // ② 文件作提问资料
  let materials = ''
  for (const f of fileList) {
    try {
      const content = await f.text()
      if (content.trim()) materials += `\n\n----- 附带资料《${f.name}》-----\n${content.trim()}`
    } catch { /* 读不出的文件跳过 */ }
  }
  const combined = (base + materials).trim()
  if (!combined) return
  draft.value = ''
  await sendFoundationTurn(combined)
}

// 询问模式（clarification）选项被选/提交：把答案【续跑同一思考】发出去（空=跳过，仅收起反问）。
// 关键：先取 pending（挂起草稿），再清反问；带 seedMessages 回传后端 → 接着上一轮思路想，不另起新轮。
async function onComposerAnswer(value: string) {
  const c = clarificationActive.value
  const raw: any = c?.raw
  const kind = raw && typeof raw === 'object' ? raw.kind : null

  // 改原文 / 录入单条·确认提案：确认 → 回传 apply_edit 确定性落库；取消 → 收起不动；输入 → 当作新的说法。
  if (kind === 'edit' || kind === 'insert') {
    const parentId = lastClarificationAssistantId()  // 在清空前取：让"确认+已更新"挂到反问之下，合成一条思考
    clarificationActive.value = null
    if (value === '__CANCEL_EDIT__') return
    if (value === '__APPLY_EDIT__') {
      if (sending.value) return
      const label = kind === 'insert' ? `确认录入（${raw.breadcrumb}）` : `确认应用这处修改（${raw.breadcrumb}）`
      await sendFoundationTurn(label, { applyEdit: raw, continuationParentId: parentId })
      return
    }
    const vv = (value || '').trim()
    if (vv && !sending.value) await sendFoundationTurn(vv)  // 重新说 = 一条新的请求
    return
  }

  // 连锁（Phase 3）：勾选确认 → 批量落库；都不改 → 收起不动。挂到同一条思考下。
  if (kind === 'cascade') {
    const parentId = lastClarificationAssistantId()
    const cands = Array.isArray(raw?.candidates) ? raw.candidates : []
    clarificationActive.value = null
    if (value === '__CANCEL_EDIT__' || !value.startsWith('__CASCADE_APPLY__:')) return
    const ids = new Set(value.slice('__CASCADE_APPLY__:'.length).split(',').map((s: string) => Number(s)).filter((n: number) => !Number.isNaN(n)))
    const items = cands.filter((cd: any) => ids.has(cd.passage_id)).map((cd: any) => ({
      passage_id: cd.passage_id, breadcrumb: cd.breadcrumb, ops: cd.ops, edit_request: `连锁同步：${cd.term || ''}`,
    }))
    if (!items.length || sending.value) return
    await sendFoundationTurn(`确认连锁更新这 ${items.length} 处`, {
      applyEdit: { kind: 'cascade_apply', items }, continuationParentId: parentId,
    })
    return
  }
  // 开放式反问（改原文没定准）：取消 → 收起不动；说得更具体 → 当作一条新的修改请求重试。
  if (kind === 'ask') {
    clarificationActive.value = null
    const vv = (value || '').trim()
    if (!vv || vv === '__CANCEL_EDIT__') return
    if (!sending.value) await sendFoundationTurn(vv)
    return
  }

  const seed = c?.pending
  // 续跑挂到"反问那条 assistant"之下 → 渲染成同一条思考。反问 = 当前最后一条 assistant 事件。
  const parentId = lastClarificationAssistantId()
  clarificationActive.value = null
  const v = (value || '').trim()
  if (!v || sending.value) return
  await sendFoundationTurn(v, {
    seedMessages: Array.isArray(seed) && seed.length ? seed : undefined,
    continuationParentId: parentId,
  })
}

// 取"未答反问"那条 assistant 事件 id（会话最后一条 assistant，且带 clarification meta），供续跑嵌套挂载。
function lastClarificationAssistantId(): string {
  const evs = events.value as any[]
  for (let i = evs.length - 1; i >= 0; i--) {
    const e = evs[i]
    if (e?.role === 'assistant') return eventClarificationQuestion(e) ? String(e.id || '') : ''
  }
  return ''
}

// ===== foundation 新管线灰度通道 =====
// 复用现有 ProcessDisclosure/streaming 渲染骨架。消息由后端在 turn 流中持久化
// 并以 event_saved 推回（B 配套）；本地合成事件仅作持久化失败时的兜底呈现。

function fndPushStep(text: string) {
  streamingProcess.steps.push({ kind: 'message', key: `fnd-${Date.now()}-${streamingProcess.steps.length}`, text })
}

const FND_FLAG_LABELS: Record<string, string> = {
  conflict: '⚠ 未决冲突',
  suspect: '疑似',
  superseded: '已被取代',
  degraded: '降级',
  text_path: '文本路',
}

function fndMaterialLine(m: FoundationMaterial): string {
  const flags = (m.flags || []).filter(f => f !== 'text_path').map(f => FND_FLAG_LABELS[f] || f)
  return `- ${m.quote}（source#${m.source_id}${flags.length ? '，' + flags.join('，') : ''}）`
}

function fndIngestMarkdown(summary: any): string {
  // passage（原文段）录入：用"段"口径，别套用旧的"N 条事实"文案（否则显示"undefined 条事实"）。
  if (summary?.mode === 'passage' || summary?.passages != null) {
    if (summary?.warning_kind === 'empty') return '这篇没切出任何内容（空白或纯符号），未录入。'
    const n = summary?.passages ?? 0
    const nm = Object.keys(summary?.by_namespace || {}).length
    let line = `已按原文段录入 ${n} 段（覆盖 ${nm} 个模块）。`
    if (summary?.warning_kind === 'no_structure') {
      line += '这篇没有标题结构，已按段落兜底切段——可召回、可溯源，建议补上层级标题再录。'
    }
    return line
  }
  const lines: string[] = []
  const statements: FoundationStatement[] = summary?.statements || []
  lines.push(`本轮录入 ${summary?.facts ?? statements.length} 条事实：`)
  statements.forEach((s) => {
    const anchors = (s.anchor_names || []).join('、')
    lines.push(`- ${s.quote} ·${s.coarse}·${anchors ? ` → ${anchors}` : ''}${s.conflict ? '（⚠ 与既有结论冲突，已置为候选待裁决）' : ''}`)
  })
  if (summary?.whole_fallback) lines.push('\n> 本轮未能拆出原子陈述，已整段兜底保存（未定类）。')
  if (summary?.degraded) lines.push(`\n> 其中 ${summary.degraded} 条为非正式知识（降级），只作线索不作依据。`)
  return lines.join('\n')
}

function fndSyntheticEvent(role: 'user' | 'assistant', content: string, mode: string, meta: Record<string, any> = {}): VibeEvent {
  return {
    id: `fnd-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    created_at: new Date().toISOString(),
    mode,
    meta: { foundation: true, ...meta },
  } as unknown as VibeEvent
}

function fndSerializeSteps(): any[] {
  return streamingProcess.steps
    .filter(s => s.kind === 'message')
    .map(s => ({ kind: 'message', text: (s as any).text }))
}

async function refreshFoundationPending() {
  try {
    const data = await listFoundationProposals()
    foundationPending.value = data.items.length
  } catch {
    /* 静默：提案数只是提示 */
  }
}

async function showFoundationProposals() {
  try {
    const data = await listFoundationProposals()
    foundationPending.value = data.items.length
    if (!data.items.length) {
      ElMessage.info('当前没有待批准提案')
      return
    }
    for (const p of data.items) {
      const text = p.kind === 'alias_add'
        ? `把「${p.payload.mention}」收为节点「${p.payload.node_name}」的别名？`
        : `${p.kind}：${JSON.stringify(p.payload)}`
      // eslint-disable-next-line no-await-in-loop
      const action = await ElMessageBox.confirm(text, `提案 #${p.task_id}`, {
        confirmButtonText: '批准',
        cancelButtonText: '驳回',
        distinguishCancelAndClose: true,
      }).then(() => 'approve' as const).catch((why: string) => (why === 'cancel' ? 'reject' as const : null))
      if (!action) break
      // eslint-disable-next-line no-await-in-loop
      const res = await actFoundationProposal(p.task_id, action)
      ElMessage.success(res.message)
      foundationPending.value = res.pending
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error))
  }
}

const FND_ACTION_LABELS: Record<string, string> = {
  save: '录入新知识',
  overview: '盘点知识库',
  kb: '检索知识库',
  system: '使用向导',
  external: '库外问题（待接工具）',
}

async function sendFoundationTurn(overrideText?: string, opts?: { seedMessages?: any[]; continuationParentId?: string; documentContent?: string; applyEdit?: any }) {
  const content = (overrideText ?? draft.value).trim()
  if (!content || sending.value) return
  const seedMessages = opts?.seedMessages  // 续跑：上一轮反问的挂起草稿，回传后端接着想
  const documentContent = opts?.documentContent  // 文件整篇录入：整篇原文走 document、text 只作干净消息
  const applyEdit = opts?.applyEdit  // 改原文·确认：回传 diff 提案，后端确定性落库
  // 续跑·视觉一体化：本轮(回答+续跑答案)挂到上一轮反问那条 assistant 之下，渲染成同一条思考。
  const contParent = opts?.continuationParentId && hasEvent(opts.continuationParentId) ? opts.continuationParentId : ''
  if (!vibeProject.value) {
    ElMessage.warning('请先选择项目')
    return
  }
  clarificationActive.value = null  // 发新一轮即收起上一轮的反问
  const project = String(vibeProject.value.id)
  const startedAt = Date.now()
  foundationBusy.value = true
  processExpanded.value = true
  clearStreamingAssistant()
  streamingContinuationParentId.value = contParent  // 必须在 clearStreamingAssistant 之后（它会清空）
  resetProcessState(streamingProcess)
  streamingProcess.status = 'running'
  // 续跑轮：用户的回答=对反问的"选择回复"，挂到反问之下、不再单列成气泡。
  events.value.push(fndSyntheticEvent('user', content, 'entry',
    contParent ? { confirmation_reply: true, parent_event_id: contParent } : {}))
  draft.value = ''
  resizeDraft()
  scrollBottom()

  let assistantContent = ''
  let actions: string[] = []
  let ingestSummary: any = null
  let recallRan = false
  let recallMaterials: FoundationMaterial[] = []
  let recallNotes: string[] = []
  let recallSources: any[] = []
  let recallVerification: any | null = null
  const answers: string[] = []
  let failed = ''
  let sessionId = ''
  let turnSessionId = ''
  let userEventSaved = false
  let assistantEventSaved = false

  const onEvent = (event: any) => {
    // #2 切换查看：本轮进行中用户切到别的会话时，只【静默渲染】，但本轮数据照常收集
    // （answers / 标志位 / 来源等都要收，否则切回来本轮回答会丢——这是上一版回答消失的根因）。
    // 后端始终持久化，切回本轮会话会通过 event_saved / 重载补全。
    const live = !turnSessionId || activeSessionId.value === turnSessionId
    if (String(event?.type || '').startsWith('process_')) {
      if (live) { consumeProcessEvent(streamingProcess, event); scrollBottom() }
      return
    }
    switch (String(event?.type || '')) {
      case 'event_saved': {
        // 后端已把本轮消息写进会话历史。标志位无论是否在场都要置（兜底/重载判定要用）；
        // 只有【当前正看本轮会话】时才把服务器事件写进 events.value（避免串到别的会话）。
        const saved = event.event as VibeEvent
        if (event.role === 'user') {
          userEventSaved = true
          if (live) events.value = events.value.filter(e => !String(e.id).startsWith('fnd-user-'))
        } else if (event.role === 'assistant') {
          assistantEventSaved = true
        }
        if (live) upsertEvent(saved)
        break
      }
      case 'stage':
        if (live) fndPushStep(String(event.message || ''))
        break
      case 'intent':
        actions = (event.actions || []).map(String)
        if (live) fndPushStep(actions.length
          ? `意图：${actions.map(a => FND_ACTION_LABELS[a] || a).join('＋')}`
          : '意图：寒暄/无关（边界说明）')
        break
      case 'fact': {
        const f = event.fact || {}
        if (live) fndPushStep(`落库：${f.quote}（${f.coarse}${f.conflict ? '，⚠ 冲突候选' : ''}）`)
        break
      }
      case 'summary':
        ingestSummary = event
        if (live) {
          if (event.mode === 'passage' || event.passages != null) {
            fndPushStep(`完成：录入 ${event.passages ?? 0} 段（原文段）`)
          } else {
            fndPushStep(`完成：${event.facts} 条事实` + (event.degraded ? `，降级 ${event.degraded}` : '')
              + (event.conflicts?.length ? `，冲突 ${event.conflicts.length}` : ''))
          }
        }
        break
      case 'materials':
        recallRan = true
        recallMaterials = event.items || []
        if (live) fndPushStep(recallMaterials.length
          ? `命中 ${recallMaterials.length} 条材料，合成答案中…`
          : '未命中材料')
        break
      case 'answer': {
        const text = String(event.text || '')
        if (text) answers.push(text)
        if (live) streamingAssistantContent.value = answers.join('\n\n')
        break
      }
      case 'clarification': {
        // 录入纪律反问（"这段要不要记进知识库"拿不准）→ 输入框切到询问模式（选项）。仅在场时才弹。
        const q = String(event.question || '').trim()
        // pending=挂起草稿：用户回答时回传后端 → 续跑同一思考（不另起新轮、不丢上下文）。
        if (q && live) clarificationActive.value = {
          question: q, raw: event.raw,
          pending: Array.isArray((event as any).pending) ? (event as any).pending : [],
        }
        break
      }
      case 'sources': {
        // T1 溯源：本轮答案的来源段；流式即时挂出，并留给兜底合成事件。
        recallSources = Array.isArray(event.items) ? event.items : []
        if (live) streamingSources.value = recallSources
        break
      }
      case 'verification': {
        // T8 后端核验：{checked, issues, clean}
        recallVerification = (event && typeof event === 'object') ? {
          checked: !!event.checked,
          clean: event.clean != null ? !!event.clean : !(event.issues && event.issues.length),
          issues: Array.isArray(event.issues) ? event.issues.map(String) : [],
        } : null
        if (live) streamingVerification.value = recallVerification
        break
      }
      case 'notes':
        recallNotes = (event.items || []).map(String)
        if (live) recallNotes.forEach(n => fndPushStep(n))
        break
      case 'proposals':
        foundationPending.value = Number(event.pending || 0)
        if (live && foundationPending.value > 0) fndPushStep(`有 ${foundationPending.value} 条待批准提案（侧边栏可处理）`)
        break
      case 'error':
        failed = String(event.detail || '执行失败')
        break
      default:
        break
    }
    if (live) scrollBottom()
  }

  try {
    try {
      sessionId = await ensureSession()
    } catch {
      sessionId = '' // 会话不可用：本轮退回无持久化的旧行为，不阻塞对话
    }
    turnSessionId = sessionId || activeSessionId.value  // 锚定本轮归属的会话（#2 切换查看用）
    await streamFoundationTurn({ project, text: content, session_id: sessionId, seed_messages: seedMessages, continuation_parent_id: contParent || undefined, mode: documentContent ? 'document' : undefined, document: documentContent || undefined, apply_edit: applyEdit || undefined }, {
      onEvent,
      onError(message: string) { failed = failed || message },
    })
    if (!failed) {
      const parts: string[] = []
      if (ingestSummary) parts.push(fndIngestMarkdown(ingestSummary))
      if (answers.length) parts.push(answers.join('\n\n'))
      else if (recallRan && !recallMaterials.length) parts.push('当前知识库中没有命中相关材料。')
      if (recallMaterials.length) {
        parts.push(`**依据材料（${recallMaterials.length} 条）**\n${recallMaterials.slice(0, 5).map(fndMaterialLine).join('\n')}`)
      }
      if (recallNotes.length) parts.push(`> ${recallNotes.join('\n> ')}`)
      assistantContent = parts.join('\n\n')
    }
  } catch (error) {
    failed = failed || (error instanceof Error ? error.message : String(error))
  } finally {
    streamingProcess.status = 'done'
    streamingProcess.durationMs = Date.now() - startedAt
    if (failed) {
      assistantContent = `本轮处理失败：${failed}`
      draft.value = content
      resizeDraft()
    }
    if (!assistantEventSaved && (!turnSessionId || activeSessionId.value === turnSessionId)) {
      // 兜底：后端没存上（无会话/持久化失败）才用本地合成事件呈现本轮回答；
      // 若用户已切去别的会话查看，则不把本轮兜底气泡写进所看会话（避免串会话）。
      events.value.push(fndSyntheticEvent('assistant', assistantContent, actions.includes('save') ? 'entry' : 'chat', {
        process: fndSerializeSteps(),
        process_summary: { duration_ms: Date.now() - startedAt },
        ...(recallSources.length ? { sources: recallSources } : {}),
        ...(recallVerification ? { verification: recallVerification } : {}),
        // 续跑兜底：嵌套挂到反问之下，保持"同一条思考"的视觉（与后端持久化路径一致）。
        ...(contParent ? { continuation_context: { parent_event_id: contParent } } : {}),
      }))
    }
    clearStreamingAssistant()
    resetProcessState(streamingProcess)
    // #2：流已结束、答案已落在 events 里 → 立刻解除"发送中"（停止按钮动画），
    // 后面的服务器刷新是后台事，不该让按钮继续转。
    foundationBusy.value = false
    if (ingestSummary) loadKbStats()  // 本轮有录入 → 段数/模块数可能变，刷新概览
    // 与 sendMessage 一致的服务器刷新；仅在两条都已持久化时做，否则会把仅存在于本地的合成兜底气泡刷掉
    if (sessionId && userEventSaved && assistantEventSaved && activeSessionId.value === sessionId) {
      try {
        await refreshState()
        events.value = sortEvents(await listVibeEvents(sessionId).catch(() => events.value))
      } catch { /* 刷新失败不影响本轮结果展示 */ }
    }
    await scrollBottom()
  }
}

function handleDraftKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  if (sending.value) return  // 思考过程进行中：禁止发送（输入框已禁用，这里再兜一道）
  send()
}

function markSessionSending(sessionId: string, value: boolean) {
  if (!sessionId) return
  const next = new Set(sendingSessionIds.value)
  if (value) next.add(sessionId)
  else next.delete(sessionId)
  sendingSessionIds.value = Array.from(next)
}

function upsertEvent(event?: VibeEvent) {
  if (!event?.id) return
  const idx = events.value.findIndex(item => item.id === event.id)
  if (idx >= 0) events.value.splice(idx, 1, event)
  else events.value.push(event)
  events.value = sortEvents(events.value)
}

function sortEvents(rows: VibeEvent[]) {
  return [...rows].sort(compareEvents)
}

function clearStreamingAssistant() {
  streamingAssistantContent.value = ''
  streamingSources.value = []
  streamingVerification.value = null
  streamingContinuationParentId.value = ''
}

function addLog(type: string, message: string) {
  const normalizedType = String(type || '过程')
  const normalizedMessage = String(message || '')
  const last = liveLogs.value[liveLogs.value.length - 1]
  if (last?.type === normalizedType && last.message === normalizedMessage) return
  liveLogs.value.push({ id: `${Date.now()}-${Math.random()}`, type: normalizedType, message: normalizedMessage })
  if (liveLogs.value.length > MAX_LIVE_LOGS) {
    liveLogs.value = liveLogs.value.slice(-MAX_LIVE_LOGS)
  }
  scrollProcessBottom()
}

function renderMarkdown(content: string) {
  const html = marked.parse(content || '') as string
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  })
}

function eventDisplayContent(event: any) {
  const content = String(event?.content || '')
  const answerCard = answerCards(event).find((card: any) => card?.type === 'answer' && card?.answer_text)
  const answerText = String(event?.meta?.answer?.answer_text || answerCard?.answer_text || '')
  const base = event?.role === 'assistant' && answerText && answerText.length > content.length
    ? answerText
    : (content || answerText || event?.meta?.package?.summary || '')
  const extra: string[] = []
  const supplement = eventAnswerSupplement(event)
  if (supplement?.missing?.length) {
    extra.push(`**缺失信息**\n\n${supplement.missing.map(item => `- ${item}`).join('\n')}`)
  }
  if (supplement?.followups?.length) {
    extra.push(`**可以继续问**\n\n${supplement.followups.map(item => `- ${item}`).join('\n')}`)
  }
  if (event?.meta?.package) {
    const pkg = event.meta.package
    extra.push(`**${packageStatusLabel(pkg)}：${pkg.title || '未命名方案包'}**\n\n${pkg.summary || '确认后才写入正式知识。'}`)
  }
  return [base, ...extra].filter(Boolean).join('\n\n')
}

function answerCards(event: any) {
  const cards = event?.meta?.answer?.cards
  return Array.isArray(cards) ? cards : []
}

function eventClarificationQuestion(event: any) {
  const direct = event?.meta?.clarification?.question
  if (direct) return String(direct)
  const clarifyCard = answerCards(event).find((card: any) => card?.type === 'clarify' && card?.question)
  return clarifyCard?.question ? String(clarifyCard.question) : ''
}

function eventProcessSteps(event: any): ProcessStep[] {
  return stepsFromMeta(event?.meta)
}

// T1 溯源：历史消息从 meta.sources 复原；兼容 answer cards 里附带的 sources。
function eventSources(event: any): any[] {
  const fromMeta = event?.meta?.sources
  if (Array.isArray(fromMeta) && fromMeta.length) return fromMeta
  const card = answerCards(event).find((c: any) => c?.type === 'sources' && Array.isArray(c?.items))
  return Array.isArray(card?.items) ? card.items : []
}

// T8 核验：历史消息从 meta.verification 复原。
function eventVerification(event: any): any | null {
  const v = event?.meta?.verification
  if (v && typeof v === 'object' && v.checked) {
    return {
      checked: true,
      clean: v.clean != null ? !!v.clean : !(Array.isArray(v.issues) && v.issues.length),
      issues: Array.isArray(v.issues) ? v.issues.map(String) : [],
    }
  }
  return null
}

function eventProcessDuration(event: any): number {
  return durationFromMeta(event?.meta)
}

function eventAnswerSupplement(event: any) {
  if (!event || event.role !== 'assistant' || isPackageActionEvent(event)) return null
  const answer = event?.meta?.answer || {}
  const answerCard = answerCards(event).find((card: any) => card?.type === 'answer') || {}
  const missing = normalizeTextList(
    answer.missing_knowledge
    || answerCard.missing_knowledge
    || event?.meta?.missing_knowledge,
  )
  const followups = normalizeTextList(
    answer.suggested_followup_questions
    || answer.suggested_followups
    || answerCard.suggested_followups
    || answerCard.suggested_followup_questions
    || event?.meta?.suggested_followups
    || event?.meta?.suggested_followup_questions,
  )
  if (!missing.length && !followups.length) return null
  return { missing, followups }
}

function normalizeTextList(value: any): string[] {
  const items = Array.isArray(value) ? value : (value ? [value] : [])
  return uniqueTextList(items
    .map((item: any) => typeof item === 'string' ? item : (item?.label || item?.text || item?.title || item?.value || ''))
    .map((item: any) => String(item || '').trim())
    .filter(Boolean))
    .slice(0, 5)
}

function uniqueTextList(items: string[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.replace(/\s+/g, ' ').trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function scrollBottom() {
  await nextTick()
  const el = timelineEl.value
  if (el) el.scrollTop = el.scrollHeight
  isAtBottom.value = true
}

// 是否已滚动到底部（用于控制"回到底部"悬浮按钮的显隐）
const isAtBottom = ref(true)

function handleTimelineScroll() {
  const el = timelineEl.value
  if (!el) return
  isAtBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 48
}

function scrollBottomSmooth() {
  const el = timelineEl.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  isAtBottom.value = true
}

async function scrollProcessBottom() {
  await nextTick()
  const el = processBodyEl.value
  if (el) el.scrollTop = el.scrollHeight
}

async function resizeDraft() {
  await nextTick()
  const el = draftEl.value
  if (!el) return
  const minHeight = 38
  const lineCount = (composerDraft.value.match(/\n/g) || []).length + 1
  if (lineCount <= 2) {
    el.style.height = `${minHeight}px`
    return
  }
  el.style.height = 'auto'
  el.style.height = `${Math.max(minHeight, Math.min(el.scrollHeight, 160))}px`
}

async function saveBaseline() {
  if (!vibeProject.value) return
  const existing = vibeProject.value.baseline || {}
  const existingGoals: any[] = Array.isArray(existing.system_goals) ? existing.system_goals : []
  const srcByName = new Map<string, any>()
  existingGoals.forEach((g) => {
    if (g && typeof g === 'object' && g.name) srcByName.set(g.name, g.source_package_id)
  })
  const goals = baselineDraft.system_goals
    .filter((g) => (g.name || '').trim())
    .map((g) => ({
      name: g.name.trim(),
      description: (g.description || '').trim(),
      source_package_id: srcByName.get(g.name.trim()) || null,
    }))
  vibeProject.value = await updateVibeProject(vibeProject.value.id, {
    baseline: {
      system_name: baselineDraft.system_name,
      summary: baselineDraft.summary,
      system_goals: goals,
    },
  })
}

// 历史事件渲染（eventDisplayContent）仍可能携带 meta.package，保留只读的状态展示助手。
function effectivePackageStatus(pkg?: any) {
  if (!pkg) return ''
  if (pkg.status === 'pending' && pkg.quality_gate?.passed === false) return 'needs_review'
  return pkg.status || 'pending'
}

function packageStatus(pkg?: string | { id?: string; status?: string }) {
  const packageId = typeof pkg === 'string' ? pkg : pkg?.id
  if (packageId && packageStatusOverrides.value[packageId]) return packageStatusOverrides.value[packageId]
  return effectivePackageStatus(typeof pkg === 'object' ? pkg : null)
}

function packageStatusLabel(pkg?: string | { id?: string; status?: string }) {
  const status = packageStatus(pkg)
  return ({
    pending: '待确认方案包',
    needs_review: '需复核方案包',
    confirmed: '已入库',
    ignored: '已忽略',
  } as Record<string, string>)[status] || '方案包'
}

function userMessageText(event: VibeEvent) {
  return isConfirmationReplyEvent(event) ? `已选择：${event.content || ''}` : String(event.content || '')
}

function shouldCollapseUserMessage(event: VibeEvent) {
  const text = userMessageText(event)
  const lineCount = text.split(/\r?\n/).length
  return text.length > 120 || lineCount > 4
}

function isUserMessageExpanded(eventId?: string) {
  return !!eventId && expandedUserMessageIds.value.includes(eventId)
}

function toggleUserMessageExpanded(eventId?: string) {
  if (!eventId) return
  if (expandedUserMessageIds.value.includes(eventId)) {
    expandedUserMessageIds.value = expandedUserMessageIds.value.filter(id => id !== eventId)
  } else {
    expandedUserMessageIds.value = [...expandedUserMessageIds.value, eventId]
  }
}

async function writeClipboardText(text: string) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'readonly')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

async function copyUserMessage(event: VibeEvent) {
  const text = userMessageText(event)
  if (!text) return
  try {
    await writeClipboardText(text)
  } catch {
    ElMessage.error('复制失败')
  }
}

// 后端 created_at 多为"不带时区标记的 UTC 时间戳"，浏览器会按本地时区解析导致偏移。
// 这里统一：无时区标记则按 UTC 解析，再由 Intl 转成上海时区显示。
function toDate(value?: string): Date {
  let v = String(value || '').trim()
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(v)
  if (!hasTz) v = v.replace(' ', 'T') + 'Z'
  else v = v.replace(' ', 'T')
  return new Date(v)
}

// 上海时区下该时刻所在"日"的序号（自 epoch 起的天数），用于判断当天/本周。
function shanghaiDayIndex(date: Date): number {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const v = (t: string) => Number(p.find(x => x.type === t)?.value || 0)
  return Math.floor(Date.UTC(v('year'), v('month') - 1, v('day')) / 86400000)
}

// 时间格式（上海时区）：
//  - 当天 → 14:17
//  - 非当天但在本周（周一为起点）→ 星期五 15:33
//  - 更早 → 06/01 11:22
function formatTime(value?: string) {
  if (!value) return ''
  const date = toDate(value)
  if (isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    weekday: 'long', hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find(part => part.type === type)?.value || ''
  const time = `${get('hour')}:${get('minute')}`

  const dayIdx = shanghaiDayIndex(date)
  const nowIdx = shanghaiDayIndex(new Date())
  if (dayIdx === nowIdx) return time

  const dowSun = (nowIdx + 4) % 7        // 0=周日
  const mondayOffset = (dowSun + 6) % 7  // 距本周一的天数
  const weekStart = nowIdx - mondayOffset
  if (dayIdx >= weekStart && dayIdx <= weekStart + 6) return `${get('weekday')} ${time}`
  return `${get('month')}/${get('day')} ${time}`
}

function formatHoverTime(value?: string) {
  if (!value) return ''
  const date = toDate(value)
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const nowParts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const parts = formatter.formatToParts(date)
  const get = (type: string) => parts.find(part => part.type === type)?.value || ''
  const getNow = (type: string) => nowParts.find(part => part.type === type)?.value || ''
  const time = `${get('hour')}:${get('minute')}`
  const isToday = get('year') === getNow('year') && get('month') === getNow('month') && get('day') === getNow('day')
  return isToday ? time : `${get('weekday')} ${time}`
}

function eventRoleLabel(event: any) {
  if (isConfirmationReplyEvent(event)) return '确认'
  if (event?.meta?.message_kind === 'package_action') return '操作'
  if (event?.meta?.message_kind === 'error') return '错误'
  if (event?.role === 'assistant' && eventClarificationQuestion(event)) return '确认'
  if (event?.role === 'assistant') return '回答'
  if (event?.role === 'user') return ''
  if (event?.mode === 'entry') return '录入'
  if (event?.mode === 'chat') return '对话'
  return ''
}

function isConfirmationReplyEvent(event: any) {
  return event?.role === 'user' && !!event?.meta?.confirmation_reply
}

function isPackageActionEvent(event: any) {
  return event?.role === 'assistant' && event?.meta?.message_kind === 'package_action'
}

function eventPackageActionTitle(event: any) {
  const title = event?.meta?.package_title || '方案包'
  const action = event?.meta?.package_action
  if (action === 'confirmed') return `已确认入库：${title}`
  if (action === 'ignored') return `已忽略：${title}`
  return title
}

function eventPackageActionDetail(event: any) {
  const content = String(event?.content || '').replace(/\*\*/g, '').trim()
  const lines = content.split(/\n+/).map(line => line.trim()).filter(Boolean)
  return lines.slice(1).join(' ') || lines[0] || ''
}

function isContinuationAssistantEvent(event: any) {
  return event?.role === 'assistant' && !!event?.meta?.continuation_context?.parent_event_id
}

function shouldRenderEvent(event: any) {
  if (event?.meta?.hidden_interaction_reply) return false
  if (isContinuationAssistantEvent(event) && hasEvent(event.meta.continuation_context.parent_event_id)) return false
  return !isConfirmationReplyEvent(event) || !event?.meta?.parent_event_id || !hasEvent(event.meta.parent_event_id)
}

function parentContinuationResponses(event: any) {
  if (!event?.id || event?.role !== 'assistant') return []
  return events.value
    .filter(item => isContinuationAssistantEvent(item) && eventThreadRootId(item) === event.id)
    .sort(compareEvents)
}

// 取挂在这条反问下的"选择回复"内容（confirmation_reply 的 user 事件），插进思考里作"你的选择"那一环。
function clarificationReplyContent(event: any): string {
  const id = String(event?.id || '')
  if (!id) return ''
  const reply = (events.value as any[]).find(e =>
    e?.role === 'user' && e?.meta?.confirmation_reply && String(e?.meta?.parent_event_id || '') === id)
  return reply ? String(reply.content || '').trim() : ''
}

// 待回答的反问（选项框正显示、还没选）：思考【还没结束】→ 过程区保持"正在思考"计时、不出加粗回复。
function isPendingClarification(event: any): boolean {
  return !!clarificationActive.value
    && event?.role === 'assistant'
    && !!eventClarificationQuestion(event)
    && event.id === lastAssistantId.value
    && parentContinuationResponses(event).length === 0
    && !isStreamingUnderEvent(event)
}

// ===== 反问续跑：把【反问→你的选择→继续思考→(可能再问→再选)→答案】合并成一条思考 =====
// 线程根 = 第一条反问(自己不是续跑子)，且已被回答(下面挂了续跑 或 正在流式续跑)。
function isClarifyThreadRoot(event: any): boolean {
  return event?.role === 'assistant'
    && !!eventClarificationQuestion(event)
    && !event?.meta?.continuation_context?.parent_event_id
    && (parentContinuationResponses(event).length > 0 || isStreamingUnderEvent(event))
}

// 顺着续跑链把所有节点(assistant)按思考顺序取出来。
// parentContinuationResponses(root) 已按【最终根】聚合 + 时间排序，含【任意层级】的续跑子（A→B→C 全在内）——
// 所以直接拼接即可，别再"只跟 kids[0] 逐级下钻"（那样多级续跑会漏掉第 3 层，导致末轮答案不显示）。
function clarifyThreadNodes(root: any): any[] {
  return [root, ...parentContinuationResponses(root)]
}

// 合并所有节点的过程步；每个"反问节点"后插一个"你的选择"气泡；流式续跑时把 live 过程步接到末尾。
// 改原文：行级局部 diff（共同前缀/后缀外的中段 = 删/增），供"思考里看 diff"。
function diffLines(oldT?: string, newT?: string): { t: 'ctx' | 'del' | 'add'; text: string }[] {
  const a = String(oldT || '').split('\n'); const b = String(newT || '').split('\n')
  let s = 0; while (s < a.length && s < b.length && a[s] === b[s]) s++
  let e = 0; while (e < a.length - s && e < b.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++
  const out: { t: 'ctx' | 'del' | 'add'; text: string }[] = []
  for (let i = 0; i < s; i++) out.push({ t: 'ctx', text: a[i] })
  for (let i = s; i < a.length - e; i++) out.push({ t: 'del', text: a[i] })
  for (let i = s; i < b.length - e; i++) out.push({ t: 'add', text: b[i] })
  for (let i = a.length - e; i < a.length; i++) out.push({ t: 'ctx', text: a[i] })
  return out
}

function mergedThreadSteps(root: any): any[] {
  const out: any[] = []
  for (const n of clarifyThreadNodes(root)) {
    for (const s of eventProcessSteps(n)) out.push(s)
    if (eventClarificationQuestion(n)) {
      // 改原文反问：把 diff 作为思考里的一环展示（红删绿增）
      const raw = n?.meta?.clarification?.raw
      if (raw && raw.kind === 'edit' && raw.old_body != null) {
        out.push({ kind: 'diff', key: `diff-${n.id}`, lines: diffLines(raw.old_body, raw.new_body) })
      } else if (raw && raw.kind === 'insert' && raw.body != null) {
        out.push({ kind: 'diff', key: `diff-${n.id}`, lines: diffLines('', raw.body) })  // 新段：全绿
      } else if (raw && raw.kind === 'cascade' && Array.isArray(raw.candidates)) {
        // 连锁：把每处受影响段的面包屑 + diff 都摆进这条思考里
        for (const cd of raw.candidates) {
          out.push({ kind: 'message', key: `casc-bc-${n.id}-${cd.passage_id}`, text: `↳ ${cd.breadcrumb}` })
          out.push({ kind: 'diff', key: `casc-diff-${n.id}-${cd.passage_id}`, lines: diffLines(cd.old_body, cd.new_body) })
        }
      }
      const choice = clarificationReplyContent(n)
      if (choice) out.push({ kind: 'choice', key: `choice-${n.id}`, question: eventClarificationQuestion(n), text: choice })
    }
  }
  if (isStreamingUnderEvent(root)) {
    for (const s of (streamingProcess.steps as any[])) out.push(s)
  }
  return out
}

function threadRunning(root: any): boolean {
  return isStreamingUnderEvent(root) && streamingProcess.status === 'running'
}

function threadDurationMs(root: any): number {
  return clarifyThreadNodes(root).reduce((sum: number, n: any) => sum + (eventProcessDuration(n) || 0), 0)
}

// 线程的最终答案节点 = 最后一个【非反问】节点；若最后还是反问(还在问)则没有最终答案。
function threadFinalNode(root: any): any {
  const nodes = clarifyThreadNodes(root)
  const last = nodes[nodes.length - 1]
  return eventClarificationQuestion(last) ? null : last
}

function threadFinalAnswer(root: any): string {
  const node = threadFinalNode(root)
  if (node) return eventDisplayContent(node)
  return isStreamingUnderEvent(root) ? (streamingAssistantContent.value || '') : ''
}

function compareEvents(a: any, b: any) {
  const orderA = Number(a?.event_order || 0)
  const orderB = Number(b?.event_order || 0)
  if (orderA !== orderB) return orderA - orderB
  return String(a?.created_at || '').localeCompare(String(b?.created_at || ''))
}

function hasEvent(eventId: string) {
  return !!eventId && events.value.some(item => item.id === eventId)
}

function eventThreadRootId(event: any) {
  let parentId = String(
    event?.meta?.continuation_context?.parent_event_id
    || event?.meta?.parent_event_id
    || '',
  )
  const seen = new Set<string>()
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId)
    const parent = events.value.find(item => item.id === parentId)
    const nextParentId = String(
      parent?.meta?.continuation_context?.parent_event_id
      || parent?.meta?.parent_event_id
      || '',
    )
    if (!nextParentId) return parentId
    parentId = nextParentId
  }
  return parentId
}

function isStreamingUnderEvent(event: any) {
  if (!event?.id || !streamingContinuationParentId.value) return false
  const pseudoEvent = {
    meta: {
      continuation_context: {
        parent_event_id: streamingContinuationParentId.value,
      },
    },
  }
  return eventThreadRootId(pseudoEvent) === event.id
}

</script>

<style scoped lang="scss">
.vibe-shell {
  --vibe-glass-bg:
    linear-gradient(180deg, rgba(248, 248, 247, 0.9), rgba(242, 242, 240, 0.82)),
    rgba(245, 245, 244, 0.76);
  --vibe-glass-filter: blur(22px) saturate(1.12);
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: grid;
  grid-template-columns: 282px minmax(0, 1fr);
  /* 关键：显式定义行轨道填满视口。否则隐式行按内容撑高，消息超过窗口高度时
     整个 shell 被撑过 100vh，overflow:hidden 裁掉底部，输入框被挤到可视区下方
     （窗口越小越明显；最大化时内容不超高，所以"看起来正确"）。
     minmax(0,1fr) 让行恰好等于视口高，且 min=0 允许内部 .timeline 收缩并自行滚动。 */
  grid-template-rows: minmax(0, 1fr);
  background: transparent;
  color: #1f1f21;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
}

:global(.main-router.vibe-shell),
:global(.main-router:has(.vibe-shell)) {
  background: transparent !important;
}

.window-drag {
  position: fixed;
  inset: 0 0 auto 0;
  height: 34px;
  -webkit-app-region: drag;
  z-index: 10;
}

.side,
.main-frame {
  position: relative;
  z-index: 1;
  min-width: 0;
  background: var(--vibe-glass-bg);
  backdrop-filter: var(--vibe-glass-filter);
  -webkit-backdrop-filter: var(--vibe-glass-filter);
  box-sizing: border-box;
}

.side {
  padding: 38px 13px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  /* 高度自适应：side 自身不滚，由内部对话列表滚动——库再多也不外溢、项目卡与概览卡常驻 */
  min-height: 0;
  overflow: hidden;
}

.side-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 0;
  -webkit-app-region: no-drag;
}

.back,
.icon-btn,
.round-btn,
.ghost,
.primary-btn,
.send {
  border: 0;
  cursor: pointer;
  transition: background 150ms ease, transform 150ms ease, opacity 150ms ease;
}

.back {
  height: 26px;
  padding: 0 11px 0 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: rgba(15, 15, 15, 0.62);
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.back-ic { opacity: 0.7; }

.icon-btn,
.round-btn {
  height: 25px;
  min-width: 25px;
  border-radius: 8px;
  background: transparent;
  color: rgba(15, 15, 15, 0.58);
}

.icon-btn:hover,
.round-btn:hover,
.back:hover {
  background: rgba(255, 255, 255, 0.96);
}

.icon-btn:disabled,
.round-btn:disabled,
.back:disabled,
.session-open:disabled,
.session-delete:disabled,
.nav button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.project-box {
  display: flex;
  flex-direction: column;
  gap: 6px;

  > span {
    padding: 0 8px;
    color: rgba(15, 15, 15, 0.42);
    font-size: 12px;
    font-weight: 600;
  }
}

.project-select {
  width: 100%;
  display: flex;

  /* 触发器=项目卡：[知识库 icon] [项目名 / 段·模块] [caret]，高度自适应内容 */
  :deep(.app-select-trigger) {
    width: 100%;
    min-width: 0;
    height: auto;
    min-height: 50px;
    padding: 8px 10px 8px 11px;
    gap: 10px;
    border-radius: 12px;
    border-color: rgba(15, 15, 15, 0.07);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(249, 249, 248, 0.72)),
      rgba(255, 255, 255, 0.76);
    color: rgba(15, 15, 15, 0.78);
  }
}

/* 项目卡内部：知识库 icon 用黑色（非蓝），名称+读数两行 */
.proj-ic {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: rgba(15, 15, 15, 0.06);
  color: rgba(15, 15, 15, 0.82);
}

.proj-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  text-align: left;
}

.proj-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(15, 15, 15, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proj-kb {
  font-size: 12px;
  color: rgba(15, 15, 15, 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proj-caret {
  flex: 0 0 auto;
  color: rgba(15, 15, 15, 0.4);
  transition: transform 0.2s ease;
}
.proj-caret.open { transform: rotate(180deg); }

/* —— 重排后的左栏：项目卡 / 对话区 / 知识库概览 —— */
.proj-card {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.proj-label {
  padding: 0 4px;
  color: rgba(15, 15, 15, 0.42);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

/* 对话区整段 flex:1，列表内部滚动（宽度跟随 282px 栏宽，长标题省略号不撑宽） */
.convs {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.convs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 0 6px;
  margin-bottom: 6px;
}

.convs-title {
  color: rgba(15, 15, 15, 0.46);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.04em;
}

.convs-search {
  position: relative;
  display: flex;
  align-items: center;
  margin: 0 2px 6px;
}

.convs-search-ic {
  position: absolute;
  left: 9px;
  color: rgba(15, 15, 15, 0.34);
  pointer-events: none;
}

.convs-search-input {
  width: 100%;
  height: 30px;
  box-sizing: border-box;
  padding: 0 26px 0 28px;
  border: 1px solid rgba(15, 15, 15, 0.08);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  color: rgba(15, 15, 15, 0.8);
  outline: none;
  transition: border-color 150ms ease, background 150ms ease;
}

.convs-search-input:focus {
  border-color: rgba(15, 15, 15, 0.18);
  background: rgba(255, 255, 255, 0.92);
}

.convs-search-clear {
  position: absolute;
  right: 6px;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: rgba(15, 15, 15, 0.4);
  cursor: pointer;
  line-height: 1;
  font-size: 14px;
}

.convs-search-clear:hover {
  background: rgba(15, 15, 15, 0.07);
  color: rgba(15, 15, 15, 0.7);
}

.convs-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-right: 1px;
}

.session-title { font-weight: 500; }

/* 知识库概览（只读，底部常驻）—— 当前项目的段数 + 模块数 */
.kb-overview {
  flex: 0 0 auto;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(15, 15, 15, 0.06);
  border-radius: 12px;
  padding: 10px 12px;
  box-sizing: border-box;
}

.kb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.kb-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(15, 15, 15, 0.66);
  font-size: 12px;
  font-weight: 600;
}

.kb-title svg { opacity: 0.66; }

.kb-refresh {
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(15, 15, 15, 0.4);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.kb-refresh:hover {
  background: rgba(15, 15, 15, 0.06);
  color: rgba(15, 15, 15, 0.7);
}

.kb-refresh:disabled { cursor: default; opacity: 0.6; }
.kb-refresh-ic.spin { animation: kb-spin 0.8s linear infinite; }
@keyframes kb-spin { to { transform: rotate(360deg); } }

.kb-metrics {
  display: flex;
  gap: 8px;
}

.kb-metric {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 7px 4px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
}

.kb-num {
  font-size: 18px;
  font-weight: 500;
  color: rgba(15, 15, 15, 0.86);
  line-height: 1.1;
}

.kb-unit {
  font-size: 11px;
  color: rgba(15, 15, 15, 0.5);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
  padding: 0 4px 0 8px;
  color: rgba(15, 15, 15, 0.46);
  font-size: 12px;
  font-weight: 650;
}

.sessions {
  min-height: 112px;
}

.session-open,
.nav button {
  width: 100%;
  min-height: 34px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  text-align: left;
  padding: 7px 9px;
  box-sizing: border-box;
  cursor: pointer;
  color: rgba(15, 15, 15, 0.72);
  font-size: 13px;

  &:hover { background: rgba(255, 255, 255, 0.6); }
  &.active { background: rgba(255, 255, 255, 0.92); box-shadow: inset 0 0 0 1px rgba(15, 15, 15, 0.06); }
  &:disabled {
    cursor: not-allowed;
  }
}

.session-row {
  position: relative;

  &.active .session-open {
    background: rgba(255, 255, 255, 0.92);
    box-shadow: inset 0 0 0 1px rgba(15, 15, 15, 0.06);
  }
}

.session-open {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  /* 去掉时间后变单行，行高收窄 */
  min-height: 28px;
  padding-top: 5px;
  padding-bottom: 5px;
  padding-right: 28px;
}

.session-ic {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  color: rgba(15, 15, 15, 0.36);
  transition: color 140ms ease;
}

.session-body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.session-body .session-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(15, 15, 15, 0.74);
  transition: color 140ms ease;
}

.session-body small {
  color: rgba(15, 15, 15, 0.38);
  font-size: 11px;
}

/* 选中 / hover → 黑色（icon + 标题），不用蓝色 */
.session-row:hover .session-ic,
.session-row:hover .session-title {
  color: rgba(15, 15, 15, 0.9);
}
.session-row.active .session-ic {
  color: rgba(15, 15, 15, 0.96);
}
.session-row.active .session-title {
  color: rgba(15, 15, 15, 0.96);
}

.session-row:hover .session-delete,
.session-row:focus-within .session-delete {
  opacity: 1;
}

.session-delete {
  position: absolute;
  top: 50%;
  right: 6px;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(15, 15, 15, 0.36);
  cursor: pointer;
  opacity: 0;
  transition: opacity 140ms ease, background 140ms ease, color 140ms ease;

  &:hover {
    background: rgba(15, 15, 15, 0.07);
    color: rgba(15, 15, 15, 0.74);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.5;
  }
}

.muted {
  margin: 8px;
  color: rgba(15, 15, 15, 0.42);
  font-size: 12px;
  line-height: 1.6;
}

.nav {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-title {
  padding: 0 8px 6px;
  color: rgba(15, 15, 15, 0.42);
  font-size: 12px;
  font-weight: 650;
}

.nav button {
  display: flex;
  justify-content: space-between;
  align-items: center;

  i {
    min-width: 18px;
    height: 18px;
    border-radius: 999px;
    background: #1f1f21;
    color: white;
    font-style: normal;
    text-align: center;
    line-height: 18px;
    font-size: 11px;
  }
}

.test-cleanup {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(15, 15, 15, 0.06);
}

.test-cleanup-toggle {
  width: 100%;
  min-height: 32px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: rgba(15, 15, 15, 0.56);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  font-size: 12.5px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.62);
    color: rgba(15, 15, 15, 0.74);
  }

  b {
    font-size: 11px;
    font-weight: 500;
    color: rgba(15, 15, 15, 0.36);
  }
}

.test-cleanup-body {
  margin-top: 6px;
  padding: 9px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.52);
  box-shadow: inset 0 0 0 1px rgba(15, 15, 15, 0.055);
  display: grid;
  gap: 8px;

  p {
    margin: 0;
    color: rgba(15, 15, 15, 0.48);
    font-size: 11.5px;
    line-height: 1.55;
  }

  small {
    color: rgba(15, 15, 15, 0.42);
    font-size: 11px;
  }
}

.danger-clean-btn {
  width: 100%;
  min-height: 30px;
  border: 1px solid rgba(220, 38, 38, 0.22);
  border-radius: 9px;
  background: rgba(254, 242, 242, 0.82);
  color: #b91c1c;
  font-size: 12px;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, transform 120ms ease;

  &:hover:not(:disabled) {
    background: #fee2e2;
    border-color: rgba(220, 38, 38, 0.38);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.52;
  }
}

.cleanup-result {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;

  span {
    padding: 2px 6px;
    border-radius: 999px;
    background: rgba(15, 15, 15, 0.055);
    color: rgba(15, 15, 15, 0.5);
    font-size: 11px;
  }
}

.main-frame {
  left: -1px;
  margin: 0;
  padding: 10px;
  border-radius: 0 16px 16px 0;
  display: flex;
  overflow: hidden;
  width: calc(100% + 1px);
}

.main {
  min-width: 0;
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: none;
}

.main-head {
  height: 68px;
  flex-shrink: 0;
  padding: 0 20px;
  border-bottom: 1px solid rgba(15, 15, 15, 0.07);
  display: flex;
  align-items: center;
  justify-content: space-between;

  p {
    margin: 0 0 4px;
    color: rgba(15, 15, 15, 0.42);
    font-size: 12px;
  }

  h1 {
    margin: 0;
    font-size: 16px;
    font-weight: 650;
  }

  &.compact {
    height: 48px;
  }
}

.ghost {
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  background: rgba(15, 15, 15, 0.05);
  color: rgba(15, 15, 15, 0.7);
}

.ghost:hover { background: rgba(15, 15, 15, 0.08); }

.ghost:disabled,
.primary-btn:disabled,
.send:disabled {
  opacity: 0.48;
  cursor: not-allowed;
  transform: none;
}

.conversation {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
  position: relative;
}

/* 回到底部悬浮按钮：贴在输入框正上方居中 */
.composer-anchor {
  position: relative;
  height: 0;
  z-index: 6;
}

.scroll-bottom-fab {
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 1px solid rgba(15, 15, 15, 0.1);
  border-radius: 50%;
  background: #fff;
  color: #111827;
  cursor: pointer;
  box-shadow:
    0 1px 2px rgba(15, 15, 15, 0.06),
    0 6px 18px rgba(15, 15, 15, 0.12);
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.scroll-bottom-fab:hover {
  box-shadow:
    0 2px 4px rgba(15, 15, 15, 0.08),
    0 10px 24px rgba(15, 15, 15, 0.16);
}

.fab-fade-enter-active,
.fab-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fab-fade-enter-from,
.fab-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
}

.timeline {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 24px max(28px, calc((100% - 760px) / 2));
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty {
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: rgba(15, 15, 15, 0.46);
  text-align: center;

  strong { color: rgba(15, 15, 15, 0.72); font-size: 15px; }
  span { max-width: 420px; font-size: 13px; line-height: 1.7; }

  &.inline {
    margin: 40px auto;
  }
}

.event,
.log {
  width: fit-content;
  max-width: min(660px, 100%);
  border-radius: 12px;
  background: rgba(15, 15, 15, 0.04);
  padding: 12px 14px;
  box-sizing: border-box;

  .role,
  span {
    color: rgba(15, 15, 15, 0.42);
    font-size: 11px;
    font-weight: 650;
  }

  p {
    margin: 6px 0 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.7;
    font-size: 13px;
  }
}

.event-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;

  time {
    flex-shrink: 0;
    color: rgba(15, 15, 15, 0.36);
    font-size: 11px;
  }
}

.event-top.compact {
  margin-bottom: 4px;
}

.user-event .event-top time {
  display: none;
}

.user-event {
  position: relative;
  align-self: flex-end;
  max-width: min(520px, 82%);
  padding: 0;
  background: transparent;
  color: rgba(15, 15, 15, 0.82);

  .event-top {
    display: none;
  }

  .role {
    color: rgba(15, 15, 15, 0.36);
  }
}

.user-message-wrap {
  position: relative;
  min-width: 0;
}

.user-message-bubble {
  border-radius: 12px;
  background: rgb(244, 244, 244);
  padding: 5px 10px;
  box-sizing: border-box;
}

.user-message-bubble .user-message-content {
  max-height: 92px;
  margin: 0;
  overflow: hidden;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.68;
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.user-message-wrap.expanded .user-message-content {
  max-height: none;
}

.user-message-more {
  margin-top: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(15, 15, 15, 0.44);
  font-size: 12px;
  cursor: pointer;

  &:hover {
    color: rgba(15, 15, 15, 0.72);
  }
}

.user-message-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  height: 18px;
  margin: 5px 1px 0 auto;
  opacity: 0;
  pointer-events: none;
  transition: opacity 140ms ease;
}

.user-hover-time {
  display: block;
  color: rgba(15, 15, 15, 0.34);
  font-size: 11px;
  line-height: 1;
  text-align: right;
  white-space: nowrap;
}

.user-copy-btn {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(15, 15, 15, 0.42);
  display: grid;
  place-items: center;
  cursor: pointer;
  pointer-events: auto;
  transition: color 140ms ease, background 140ms ease;

  &:hover {
    color: rgba(15, 15, 15, 0.74);
    background: rgba(15, 15, 15, 0.055);
  }
}

.copy-stack-pop {
  overflow: visible;
}

.copy-stack-pop .copy-back,
.copy-stack-pop .copy-flash {
  transform-origin: 20px 20px;
}

.copy-stack-pop .copy-flash {
  opacity: 0;
  stroke-dasharray: 18 82;
  stroke-dashoffset: 18;
}

.user-copy-btn:hover .copy-stack-pop .copy-back,
.user-copy-btn:focus-visible .copy-stack-pop .copy-back {
  animation: copy-back-pop 1200ms cubic-bezier(.25, .1, .25, 1) both;
}

.user-copy-btn:hover .copy-stack-pop .copy-flash,
.user-copy-btn:focus-visible .copy-stack-pop .copy-flash {
  animation: copy-flash-run 1200ms cubic-bezier(.25, .1, .25, 1) both;
}

.user-event:hover .user-message-tools,
.user-message-tools:focus-within {
  opacity: 1;
}

@keyframes copy-back-pop {
  0%, 100% {
    opacity: .5;
    transform: translate(0, 0);
  }

  42%, 64% {
    opacity: .82;
    transform: translate(5px, -5px);
  }
}

@keyframes copy-flash-run {
  0%, 20% {
    opacity: 0;
    stroke-dashoffset: 18;
  }

  34% {
    opacity: .9;
  }

  72% {
    opacity: .9;
    stroke-dashoffset: -58;
  }

  88%, 100% {
    opacity: 0;
    stroke-dashoffset: -72;
  }
}

.confirmation-choice-event {
  align-self: flex-start;
  max-width: min(560px, 86%);
  background: transparent;
  color: rgba(15, 15, 15, 0.74);
  box-shadow: none;

  .user-message-bubble {
    background: rgba(15, 15, 15, 0.045);
    box-shadow: inset 0 0 0 1px rgba(15, 15, 15, 0.055);
  }

  .role {
    color: rgba(15, 15, 15, 0.42);
  }

  .event-top time {
    display: none;
  }

  .event-top {
    display: flex;
  }

  .user-message-content {
    color: rgba(15, 15, 15, 0.74);
  }
}

.assistant-message {
  align-self: flex-start;
  max-width: min(680px, 100%);
  width: min(680px, 100%);
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

/* 悬停回答区时显隐操作栏：时间始终随 hover 出现；操作按钮非最后一条时随 hover 出现 */
.assistant-message:hover :deep(.assistant-actions .aa-time),
.continuation-response:hover :deep(.assistant-actions .aa-time) {
  opacity: 1;
}
.assistant-message:hover :deep(.assistant-actions .aa-btn),
.continuation-response:hover :deep(.assistant-actions .aa-btn) {
  opacity: 1;
  pointer-events: auto;
}

.package-action-line {
  display: block;
  max-width: 100%;
  color: rgba(15, 15, 15, 0.62);
  font-size: 14px;
  line-height: 1.75;

  strong {
    display: inline;
    color: rgba(15, 15, 15, 0.72);
    font-size: inherit;
    font-weight: 600;
  }

  span {
    display: inline;
    margin-left: 6px;
    color: rgba(15, 15, 15, 0.42);
    font-size: inherit;
  }
}

.streaming-message {
  background: transparent;
  box-shadow: none;
}

.thinking-text {
  display: inline;
  color: rgba(15, 15, 15, 0.46);
  font-size: 13px;
  line-height: 1.7;
  animation: vibe-thinking-blink 1.15s ease-in-out infinite;
}

@keyframes vibe-thinking-blink {
  0%, 100% { opacity: 0.32; }
  50% { opacity: 1; }
}

/* 可信区（T1 溯源 + T8 核验）：flex-wrap 让徽章/来源随宽度自适应换行；
   src-block 自身宽 100% 会自然换到下一行，于是徽章在上、来源在下，互不挤压。 */
.answer-trust {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 6px 8px;
  margin-top: 7px;
  max-width: 100%;
  min-width: 0;
}
.answer-trust:empty { display: none; }

.message-md {
  margin-top: 0;
  color: rgba(15, 15, 15, 0.96);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.75;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;

  :deep(p) {
    margin: 0 0 8px;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 7px 0 8px 18px;
    padding: 0;
  }

  :deep(li) {
    margin: 4px 0;
  }

  :deep(strong) {
    color: #000;
    font-weight: 700;
  }

  :deep(code) {
    padding: 1px 5px;
    border-radius: 5px;
    background: rgba(15, 15, 15, 0.07);
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
  }

  :deep(pre) {
    max-width: 100%;
    overflow: auto;
    margin: 8px 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(15, 15, 15, 0.07);
  }

  :deep(pre code) {
    padding: 0;
    background: transparent;
    white-space: pre;
  }

  :deep(table) {
    display: block;
    max-width: 100%;
    overflow: auto;
    border-collapse: collapse;
    margin: 8px 0;
  }

  :deep(th),
  :deep(td) {
    border: 1px solid rgba(15, 15, 15, 0.09);
    padding: 6px 8px;
    white-space: nowrap;
  }

  :deep(blockquote) {
    margin: 8px 0;
    padding: 2px 0 2px 10px;
    border-left: 3px solid rgba(15, 15, 15, 0.16);
    color: rgba(15, 15, 15, 0.62);
  }

  :deep(a) {
    color: #1f4f99;
    text-decoration: none;
    word-break: break-all;

    &:hover {
      text-decoration: underline;
    }
  }
}

.thought-line {
  margin: 0 0 8px;
  color: rgba(15, 15, 15, 0.46);
  font-size: 13px;
  line-height: 1.6;
}

.thought-line summary {
  width: fit-content;
  list-style: none;
  cursor: pointer;
  user-select: none;
  color: rgba(15, 15, 15, 0.45);
  font-size: 13px;
}

.thought-line summary::-webkit-details-marker {
  display: none;
}

.thought-line[open] summary span {
  display: inline-block;
  transform: rotate(90deg);
}

.thought-line ol {
  margin: 6px 0 0 17px;
  padding: 0;
  color: rgba(15, 15, 15, 0.5);
}

.thought-line li {
  margin: 3px 0;
}

.thought-line b {
  color: rgba(15, 15, 15, 0.56);
  font-weight: 550;
}

.thought-line em,
.thought-line small {
  margin-left: 6px;
  color: rgba(15, 15, 15, 0.42);
  font-style: normal;
  font-size: 12px;
}

.live-thought {
  align-self: flex-start;
  width: min(680px, 100%);
}

.live-thought.thinking summary {
  animation: vibe-thinking-blink 1.15s ease-in-out infinite;
}


.continuation-responses {
  margin-top: 12px;
  padding-top: 0;
  border-top: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 已回答的反问折叠成的紧凑卡：一条思考的"我确认了X·你选了Y"那一环 */
.clarify-recap {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 11px;
  border-radius: 9px;
  background: rgba(17, 24, 39, 0.045);
  color: rgba(15, 15, 15, 0.6);
  font-size: 13px;
  line-height: 1.4;
}

.clarify-recap-icon {
  flex: none;
  color: rgba(15, 15, 15, 0.4);
}

.clarify-recap-text em {
  margin: 0 6px;
  color: rgba(15, 15, 15, 0.32);
  font-style: normal;
}

.clarify-recap-text b {
  color: rgba(15, 15, 15, 0.78);
  font-weight: 600;
}

.continuation-response {
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.streaming-inline-response {
  background: transparent;
  box-shadow: none;
}


.package-item-preview {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 7px 8px;
    border-radius: 9px;
    background: rgba(15, 15, 15, 0.035);

    &.more {
      display: block;
      background: transparent;
      color: rgba(15, 15, 15, 0.46);
      font-size: 12px;
      text-align: center;
    }
  }

  span {
    margin: 0;
    padding: 2px 7px;
    border-radius: 999px;
    background: rgba(15, 15, 15, 0.065);
    color: rgba(15, 15, 15, 0.58);
    font-size: 11px;
    white-space: nowrap;
  }

  strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 600;
  }

  small {
    color: rgba(15, 15, 15, 0.42);
    font-size: 11px;
    white-space: nowrap;
  }
}

.route-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: fit-content;
  max-width: 100%;
  margin-top: 4px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(245, 245, 244, 0.96);
  box-shadow: inset 0 0 0 1px rgba(15, 15, 15, 0.06);
  color: rgba(15, 15, 15, 0.54);
  font-size: 12px;

  button {
    height: 24px;
    padding: 0 9px;
    border: 0;
    border-radius: 999px;
    background: #fff;
    color: rgba(15, 15, 15, 0.72);
    cursor: pointer;
    font-size: 12px;
    box-shadow: inset 0 0 0 1px rgba(15, 15, 15, 0.06);

    &:hover {
      background: #f1f1ef;
    }
  }
}

.composer {
  /* 只做居中容器：边框/背景/阴影由 ChatComposer 自身的 shell 提供，避免双层框。 */
  width: min(760px, calc(100% - 56px));
  margin: 0 auto 18px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
}

.interaction-console {
  margin: 0 0 8px;
  padding: 9px 10px;
  border-radius: 12px;
  background: rgba(15, 15, 15, 0.035);
  box-shadow: inset 0 0 0 1px rgba(15, 15, 15, 0.055);
  display: grid;
  gap: 8px;
}

.interaction-copy {
  display: grid;
  gap: 2px;

  strong {
    color: rgba(15, 15, 15, 0.82);
    font-size: 12.5px;
    font-weight: 650;
  }

  p {
    margin: 0;
    color: rgba(15, 15, 15, 0.58);
    font-size: 12px;
    line-height: 1.45;
  }
}

.interaction-options {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;

  button {
    min-height: 28px;
    padding: 0 10px;
    border: 1px solid rgba(15, 15, 15, 0.08);
    border-radius: 999px;
    background: #fff;
    color: rgba(15, 15, 15, 0.68);
    cursor: pointer;
    font-size: 12px;
    font-weight: 550;
    transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;

    &:hover:not(:disabled) {
      background: #f5f5f3;
      border-color: rgba(15, 15, 15, 0.14);
      transform: translateY(-1px);
    }

    &.primary {
      background: #111827;
      border-color: #111827;
      color: #fff;
    }

    &:disabled {
      opacity: 0.46;
      cursor: not-allowed;
    }
  }
}

.composer-status {
  grid-row: 3;
  margin-top: -3px;
  color: rgba(15, 15, 15, 0.42);
  font-size: 11.5px;
  line-height: 1.4;
}

.composer-actions {
  min-height: 34px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px;
  gap: 8px;
  align-items: center;
}

.composer-tools {
  min-height: 0;
}

textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 38px;
  max-height: 160px;
  resize: none;
  border: 0;
  outline: none;
  font-size: 13.5px;
  font-weight: 500;
  line-height: 19px;
  padding: 0;
  color: #1f1f21;

  &::placeholder {
    color: rgba(15, 15, 15, 0.32);
  }
}

.composer textarea {
  min-height: 38px;
}

.composer textarea:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.send {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #111827;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 18px rgba(17, 24, 39, 0.16);
  padding: 0;

  &:hover:not(:disabled) {
    background: #020617;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  &.running {
    opacity: 1;
    cursor: progress;
    background: #111827;
  }
}

.send-arrow-flow,
.pause-running-flow {
  width: 30px;
  height: 30px;
  overflow: visible;
  pointer-events: none;
  display: block;
}

.send-arrow-flow {

  .orbit {
    opacity: 0;
    stroke-dasharray: 30 96;
    stroke-dashoffset: 0;
    transform-origin: 20px 20px;
  }

  .arrow-stem,
  .arrow-head {
    stroke-dasharray: 28;
    stroke-dashoffset: 0;
    transform-origin: 20px 20px;
  }
}

.pause-running-flow {
  .pause-block {
    transform-origin: 20px 20px;
    animation: pause-block-out 1500ms cubic-bezier(.25, .1, .25, 1) infinite;
  }

  .run-dot {
    opacity: 0;
    transform-origin: center;
    animation: running-dot 1500ms cubic-bezier(.25, .1, .25, 1) infinite;
  }

  .dot-2 {
    animation-delay: 90ms;
  }

  .dot-3 {
    animation-delay: 180ms;
  }
}

.send:hover:not(:disabled) .send-arrow-flow .orbit,
.send:focus-visible:not(:disabled) .send-arrow-flow .orbit {
  animation: send-flow-orbit 1600ms cubic-bezier(.25, .1, .25, 1) both;
}

.send:hover:not(:disabled) .send-arrow-flow .arrow-stem,
.send:hover:not(:disabled) .send-arrow-flow .arrow-head,
.send:focus-visible:not(:disabled) .send-arrow-flow .arrow-stem,
.send:focus-visible:not(:disabled) .send-arrow-flow .arrow-head {
  animation: send-flow-arrow 1600ms cubic-bezier(.25, .1, .25, 1) both;
  will-change: opacity, stroke-dashoffset, transform;
}

@keyframes send-flow-orbit {
  0%, 18% {
    opacity: 0;
    transform: rotate(0deg);
  }
  26% {
    opacity: .86;
    transform: rotate(0deg);
  }
  78% {
    opacity: .86;
    transform: rotate(360deg);
  }
  88%, 100% {
    opacity: 0;
    transform: rotate(360deg);
  }
}

@keyframes send-flow-arrow {
  0% {
    opacity: 1;
  }
  22% {
    opacity: 0;
  }
  72% {
    opacity: 0;
  }
  90%, 100% {
    opacity: 1;
  }
}

@keyframes pause-block-out {
  0%, 18% {
    opacity: 1;
    transform: scaleX(1);
  }
  34%, 72% {
    opacity: 0;
    transform: scaleX(.42);
  }
  100% {
    opacity: 1;
    transform: scaleX(1);
  }
}

@keyframes running-dot {
  0%, 18% {
    opacity: 0;
    transform: translateY(3px) scale(.72);
  }
  34% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  50% {
    opacity: .55;
    transform: translateY(-2px) scale(.92);
  }
  66% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  82%, 100% {
    opacity: 0;
    transform: translateY(3px) scale(.72);
  }
}

@media (prefers-reduced-motion: reduce) {
  .send:hover:not(:disabled) .send-arrow-flow .orbit,
  .send:hover:not(:disabled) .send-arrow-flow .arrow-stem,
  .send:hover:not(:disabled) .send-arrow-flow .arrow-head,
  .send:focus-visible:not(:disabled) .send-arrow-flow .orbit,
  .send:focus-visible:not(:disabled) .send-arrow-flow .arrow-stem,
  .send:focus-visible:not(:disabled) .send-arrow-flow .arrow-head,
  .pause-running-flow .pause-block,
  .pause-running-flow .run-dot {
    animation: none;
  }
}

.asset-page {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 22px;
  box-sizing: border-box;

  &.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
    align-content: start;
  }

  &.split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;

    h2 {
      margin: 0 0 12px;
      font-size: 14px;
    }
  }

  &.auxiliary-page {
    grid-template-columns: minmax(190px, 0.72fr) minmax(190px, 0.72fr) minmax(260px, 1fr) minmax(280px, 1.1fr);
    overflow: hidden;
  }
}

.asset-column {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;

  &.wide {
    min-width: 0;
  }
}

.asset-empty {
  min-height: 82px;
  border: 1px dashed rgba(15, 15, 15, 0.12);
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: rgba(15, 15, 15, 0.38);
  font-size: 12px;
  background: rgba(15, 15, 15, 0.025);
}

.baseline-card,
.suggest-card,
.package-card,
.fact-card,
.mini-card {
  border: 1px solid rgba(15, 15, 15, 0.08);
  border-radius: 14px;
  background: #fff;
  padding: 16px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.04);
}

.baseline-card {
  display: grid;
  gap: 9px;
  max-width: 720px;

  label {
    color: rgba(15, 15, 15, 0.5);
    font-size: 12px;
    font-weight: 650;
  }

  input,
  textarea {
    border: 1px solid rgba(15, 15, 15, 0.08);
    border-radius: 10px;
    padding: 10px;
    resize: vertical;
  }

  .goal-list {
    display: grid;
    gap: 8px;
  }

  .goal-item {
    display: grid;
    grid-template-columns: minmax(120px, 200px) 1fr 28px;
    gap: 8px;
    align-items: center;
  }

  .goal-remove {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1px solid rgba(15, 15, 15, 0.08);
    background: #fff;
    color: rgba(15, 15, 15, 0.5);
    cursor: pointer;
  }

  .goal-add {
    justify-self: start;
    height: 28px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px dashed rgba(15, 15, 15, 0.2);
    background: transparent;
    color: rgba(15, 15, 15, 0.6);
    font-size: 12px;
    cursor: pointer;
  }
}

.suggest-card {
  max-width: 720px;
  margin-top: 14px;

  pre {
    max-height: 260px;
    overflow: auto;
    background: rgba(15, 15, 15, 0.04);
    border-radius: 10px;
    padding: 12px;
    font-size: 12px;
  }
}

.primary-btn {
  height: 32px;
  padding: 0 13px;
  border-radius: 9px;
  background: #1f1f21;
  color: #fff;

  &.small {
    height: 28px;
    font-size: 12px;
  }
}

.package-card {
  margin-bottom: 12px;

  header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  header span,
  li span,
  .fact-card span {
    padding: 2px 7px;
    border-radius: 999px;
    background: rgba(15, 15, 15, 0.06);
    font-size: 11px;
    color: rgba(15, 15, 15, 0.56);
  }

  header strong {
    font-size: 15px;
  }

  header small {
    margin-left: auto;
    color: rgba(15, 15, 15, 0.42);
  }

  p {
    color: rgba(15, 15, 15, 0.62);
    font-size: 13px;
    line-height: 1.7;
  }

  ul {
    display: grid;
    gap: 7px;
    padding: 0;
    margin: 12px 0;
    list-style: none;
  }

  li {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 13px;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

.quality {
  display: flex;
  gap: 10px;
  color: rgba(15, 15, 15, 0.5);
  font-size: 12px;

  b { color: rgba(15, 15, 15, 0.72); }
  em { font-style: normal; }
}

.quality-issues {
  padding: 8px 10px !important;
  margin: 10px 0 !important;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.18);

  li {
    display: block;
    color: rgba(92, 64, 16, 0.82);
    line-height: 1.55;
    font-size: 12px;
  }
}

.fact-card {
  h3 {
    margin: 12px 0 8px;
    font-size: 15px;
  }

  p {
    margin: 0;
    color: rgba(15, 15, 15, 0.58);
    line-height: 1.65;
    font-size: 13px;
  }
}

.mini-card {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  strong { font-size: 13px; }
  span { color: rgba(15, 15, 15, 0.58); font-size: 12px; line-height: 1.6; }

  small {
    width: fit-content;
    max-width: 100%;
    padding: 2px 7px;
    border-radius: 999px;
    background: rgba(15, 15, 15, 0.055);
    color: rgba(15, 15, 15, 0.44);
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  em {
    color: rgba(15, 15, 15, 0.44);
    font-size: 11.5px;
    font-style: normal;
    line-height: 1.55;
  }
}

.note-card,
.candidate-card {
  background: #fbfbfa;
}

/* ===== foundation 新管线灰度 ===== */
.foundation-section .test-cleanup-toggle b.fnd-on {
  color: rgba(22, 119, 80, 0.78);
}
.fnd-proposal-btn {
  min-height: 30px;
  border: 0;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: inset 0 0 0 1px rgba(15, 15, 15, 0.08);
  color: rgba(15, 15, 15, 0.72);
  font-size: 12px;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;

  &:hover {
    background: rgba(255, 255, 255, 0.92);
    color: rgba(15, 15, 15, 0.88);
  }
}
</style>
