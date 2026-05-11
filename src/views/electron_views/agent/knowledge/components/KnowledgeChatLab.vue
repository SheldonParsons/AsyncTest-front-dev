<template>
  <Teleport to="#kb-chat-session-host">
    <aside class="kbc-session-rail">
      <div class="kbc-session-head">
        <div>
          <strong>对话</strong>
        </div>
        <button class="kbc-session-add" type="button" :disabled="running" title="新建会话" aria-label="新建会话" @click="startNewSession">
          <span></span>
        </button>
      </div>

      <div class="kbc-session-list">
        <div v-if="sessionLoading" class="kbc-session-empty">加载会话中...</div>
        <template v-else>
          <button
            v-if="draftSessionActive"
            type="button"
            :class="['kbc-session-item kbc-session-item--draft', { active: activeSessionId === DRAFT_SESSION_ID }]"
            @click="focusDraftSession"
          >
            <span>新的会话</span>
            <small>尚未发送消息</small>
          </button>
          <button
            v-for="item in sessions"
            :key="item.id"
            type="button"
            :class="['kbc-session-item', { active: item.id === activeSessionId }]"
            @click="selectSession(item.id, false)"
          >
            <span>{{ item.title || '新的会话' }}</span>
            <small>{{ formatSessionTime(item.last_message_at || item.updated_at || item.created_at) }}</small>
            <i title="删除会话" @click.stop="removeSession(item.id)">删除</i>
          </button>
          <div v-if="!draftSessionActive && sessions.length === 0" class="kbc-session-empty">暂无会话</div>
        </template>
      </div>
    </aside>
  </Teleport>

  <section class="kbc">
    <main class="kbc-main">
      <header class="kbc-header">
        <div>
          <p>{{ kbName || '当前知识库' }}</p>
          <h1>知识库问答</h1>
        </div>
      </header>

      <div ref="scrollRef" class="kbc-thread">
        <div v-if="messages.length === 0" class="kbc-empty">
          <div class="kbc-empty-mark">
            <img :src="aiLogoUrl" alt="AI" />
          </div>
          <h2>Wiki 知识库问答测试</h2>
          <p>围绕当前知识库提问，快速定位业务说明、规则边界和相关来源。</p>
          <div class="kbc-quick">
            <button
              v-for="item in quickQuestions"
              :key="item"
              class="kbc-quick-item"
              type="button"
              @click="useQuestion(item)"
            >
              {{ item }}
            </button>
          </div>
        </div>

        <article
          v-for="message in messages"
          :key="message.id"
          class="kbc-message"
          :class="`kbc-message--${message.role}`"
        >
          <div class="kbc-avatar">
            <span v-if="message.role === 'user'">你</span>
            <img v-else :src="aiLogoUrl" alt="AI" />
          </div>
          <div class="kbc-bubble">
            <div v-if="message.role === 'assistant' && message.debugEvents?.length" class="kbc-process">
              <button class="kbc-process-toggle" type="button" @click="toggleProcess(message)">
                <span :class="{ 'is-running': running && message.id === activeAssistantId }"></span>
                <strong>执行过程</strong>
                <em>{{ processSummary(message) }}</em>
                <i>{{ message.processExpanded ? '收起' : '展开' }}</i>
              </button>
              <Transition name="kbc-process-fold">
                <div v-if="message.processExpanded" class="kbc-debug-list">
                  <div
                    v-for="(event, index) in message.debugEvents"
                    :key="`${message.id}-${index}-${event.text}`"
                    class="kbc-debug-line"
                    :class="{ 'kbc-debug-line--active': running && message.id === activeAssistantId && index === message.debugEvents.length - 1 }"
                  >
                    <span>{{ index + 1 }}</span>
                    <p>{{ event.text }}</p>
                  </div>
                </div>
              </Transition>
            </div>

            <div v-if="message.role === 'assistant' && message.toolConfirmation" class="kbc-tool-confirm">
              <div class="kbc-tool-confirm-head">
                <span>待确认 Calling</span>
                <strong>{{ message.toolConfirmation.tool_name || message.toolConfirmation.tool?.name || '未命名工具' }}</strong>
              </div>
              <p v-if="message.toolConfirmation.reason" class="kbc-tool-confirm-reason">{{ message.toolConfirmation.reason }}</p>
              <div v-if="message.toolConfirmation.tool_chain?.length" class="kbc-tool-chain">
                <div
                  v-for="(step, index) in message.toolConfirmation.tool_chain"
                  :key="`${message.id}-chain-${index}-${step.tool_id}`"
                  class="kbc-tool-chain-step"
                  :class="{ 'is-high-risk': step.risk_level === 'high' }"
                >
                  <i>{{ index + 1 }}</i>
                  <div>
                    <strong>{{ step.tool_name || step.tool_id }}</strong>
                    <p>{{ step.reason || (step.risk_level === 'high' ? '高风险工具步骤' : '工具步骤') }}</p>
                  </div>
                  <em>{{ step.risk_level === 'high' ? '高风险' : '低风险' }}</em>
                </div>
              </div>
              <div class="kbc-tool-args">
                <label
                  v-for="param in confirmationParams(message)"
                  :key="`${message.id}-${param.name}`"
                  class="kbc-tool-arg"
                >
                  <span>
                    {{ param.description || param.name }}
                    <em v-if="param.required">必填</em>
                  </span>
                  <input
                    v-if="param.type !== 'boolean'"
                    v-model="message.toolArgumentDraft![param.name]"
                    :type="isSensitiveParam(param.name) ? 'password' : 'text'"
                    :placeholder="param.name"
                    :disabled="message.toolConfirmation.status !== 'pending' || running"
                  />
                  <select
                    v-else
                    v-model="message.toolArgumentDraft![param.name]"
                    :disabled="message.toolConfirmation.status !== 'pending' || running"
                  >
                    <option :value="true">true</option>
                    <option :value="false">false</option>
                  </select>
                </label>
                <label
                  v-for="name in extraArgumentNames(message)"
                  :key="`${message.id}-${name}`"
                  class="kbc-tool-arg"
                >
                  <span>{{ name }}</span>
                  <input
                    v-model="message.toolArgumentDraft![name]"
                    :type="isSensitiveParam(name) ? 'password' : 'text'"
                    :disabled="message.toolConfirmation.status !== 'pending' || running"
                  />
                </label>
              </div>
              <div class="kbc-tool-confirm-foot">
                <small>确认后才会执行脚本。你可以先修改参数，取消则不会调用工具。</small>
                <label v-if="hasHighRiskStep(message) && message.toolConfirmation.status === 'pending'" class="kbc-tool-risk-pass">
                  <input v-model="message.approveHighRiskInSession" type="checkbox" :disabled="running" />
                  <span>本会话后续高风险步骤也放行</span>
                </label>
                <div v-if="message.toolConfirmation.status === 'pending'" class="kbc-tool-confirm-actions">
                  <button type="button" class="kbc-tool-btn kbc-tool-btn--ghost" :disabled="running" @click="cancelPendingTool(message)">取消调用</button>
                  <button type="button" class="kbc-tool-btn" :disabled="running" @click="approvePendingTool(message)">确认执行</button>
                </div>
                <strong v-else class="kbc-tool-status">{{ confirmationStatusText(message.toolConfirmation.status) }}</strong>
              </div>
            </div>

            <div v-if="message.role === 'assistant' && message.clarifications?.length" class="kbc-clarify-stack">
              <div
                v-for="clarification in message.clarifications"
                :key="clarification.id"
                class="kbc-clarify-card"
              >
                <div class="kbc-clarify-head">
                  <span>需要你决定</span>
                  <strong>{{ clarificationTitle(clarification.type) }}</strong>
                </div>
                <p>{{ clarification.message }}</p>
                <div v-if="clarification.selected" class="kbc-clarify-selected">
                  <span>已选择</span>
                  <strong>{{ clarification.selected }}</strong>
                </div>
                <div v-if="clarification.suggestions.length" class="kbc-clarify-options">
                  <button
                    v-for="item in clarification.suggestions"
                    :key="`${clarification.id}-${item}`"
                    type="button"
                    :disabled="running || Boolean(clarification.selected)"
                    @click="replyToClarification(item, message, clarification.id)"
                  >
                    {{ item }}
                  </button>
                </div>
                <div class="kbc-clarify-custom">
                  <textarea
                    v-model="clarification.draft"
                    :disabled="running || Boolean(clarification.selected)"
                    rows="2"
                    placeholder="也可以直接输入你的决定，例如：可以，就按当前账号可见范围查询"
                    @keydown.enter.exact.prevent="replyToClarification(clarification.draft, message, clarification.id)"
                  ></textarea>
                  <button
                    type="button"
                    :disabled="running || Boolean(clarification.selected) || !clarification.draft.trim()"
                    @click="replyToClarification(clarification.draft, message, clarification.id)"
                  >
                    继续
                  </button>
                </div>
              </div>
            </div>

            <div
              v-if="message.role === 'assistant' && (message.content || (!message.toolConfirmation && !message.clarifications?.length))"
              class="kbc-answer"
              v-html="renderMarkdown(message.content || '正在组织答案…')"
            ></div>
            <span v-if="running && message.id === activeAssistantId" class="kbc-typing-caret"></span>
            <p v-if="message.role === 'user'">{{ message.content }}</p>

            <div v-if="message.sources?.length" class="kbc-sources">
              <button
                v-for="source in message.sources"
                :key="`${source.type}-${source.id}`"
                type="button"
                class="kbc-source"
                :title="source.reason || source.path || source.name"
              >
                <span>{{ source.name }}</span>
                <small>{{ source.path }}</small>
              </button>
            </div>
          </div>
        </article>
      </div>

      <footer class="kbc-compose" :class="{ 'kbc-compose--running': running }">
        <div v-if="statusText" class="kbc-status">
          <span :class="{ 'kbc-status-pulse': running }"></span>
          {{ statusText }}
        </div>
        <div class="kbc-input-wrap">
          <textarea
            v-model="draft"
            ref="inputRef"
            class="kbc-input"
            :disabled="running"
            placeholder="输入问题，例如：如何创建账号？"
            rows="1"
            @input="resizeInput"
            @keydown.enter.exact.prevent="send"
          ></textarea>
          <button class="kbc-send" type="button" :disabled="!draft.trim() || running" @click="send">
            <span>{{ running ? '回答中' : '发送' }}</span>
          </button>
        </div>
      </footer>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { marked } from 'marked'
import type { KBChatMessageRecord, KBChatRetrieval, KBChatSession, KBChatSource, KBChatToolConfirmation, KBAIToolInputParam } from '@/types/knowledge'
import { approveToolConfirmationStream, cancelToolConfirmation, deleteChatSession, listChatMessages, listChatSessions, listPendingToolConfirmations, streamKnowledgeChat } from '../api'

marked.setOptions({
  gfm: true,
  breaks: true,
})

const props = defineProps<{
  kbId: number
  kbName?: string
}>()

type ChatRole = 'user' | 'assistant'

interface ChatClarification {
  id: string
  message: string
  type: string
  suggestions: string[]
  draft: string
  selected?: string
}

interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  sources?: KBChatSource[]
  retrieval?: KBChatRetrieval
  debugEvents?: Array<{ text: string; type?: string }>
  processExpanded?: boolean
  processDone?: boolean
  toolConfirmation?: KBChatToolConfirmation | null
  toolArgumentDraft?: Record<string, any>
  approveHighRiskInSession?: boolean
  clarifications?: ChatClarification[]
}

const quickQuestions = [
  '当前平台下有哪些菜单？',
  '账号管理在哪个菜单下？',
  '如何创建账号？',
  '如何创建角色？',
  '为账号设置渠道监管的时候，我可以选择哪些组织进行监管的组织树是怎么形成的？',
  '为什么我看到的组织架构树和别人的不一样？',
]

const draft = ref('')
const running = ref(false)
const sessionLoading = ref(false)
const sessions = ref<KBChatSession[]>([])
const DRAFT_SESSION_ID = '__draft_chat_session__'
const activeSessionId = ref('')
const draftSessionActive = ref(false)
const messages = ref<ChatMessage[]>([])
const currentPhase = ref('')
const scrollRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const activeAssistantId = ref('')
const aiLogoUrl = 'https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/ai_full_light.svg'
let threadMutationObserver: MutationObserver | null = null
let autoScrollFrame = 0
let autoScrollTimer = 0

const statusText = computed(() => {
  if (running.value) return currentPhase.value || '正在准备回答'
  if (messages.value.length) return '已完成，可以继续追问'
  return ''
})

function renderMarkdown(content: string) {
  return marked.parse(content || '') as string
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function pushDebug(message: ChatMessage | null, text: string) {
  if (!text.trim()) return
  if (!message) return
  if (!message.debugEvents) message.debugEvents = []
  message.debugEvents.push({ text })
  if (message.processExpanded !== false) message.processExpanded = true
  scheduleRunningScrollToBottom()
}

function createArgumentDraft(confirmation: KBChatToolConfirmation) {
  const draftArgs: Record<string, any> = { ...(confirmation.arguments || {}) }
  ;(confirmation.tool?.input_schema || []).forEach((param) => {
    if (draftArgs[param.name] === undefined && param.default !== undefined) {
      draftArgs[param.name] = param.default
    }
  })
  return draftArgs
}

function confirmationParams(message: ChatMessage): KBAIToolInputParam[] {
  return message.toolConfirmation?.tool?.input_schema || []
}

function extraArgumentNames(message: ChatMessage) {
  const schemaNames = new Set(confirmationParams(message).map((param) => param.name))
  return Object.keys(message.toolArgumentDraft || {}).filter((name) => !schemaNames.has(name))
}

function isSensitiveParam(name: string) {
  return /(password|token|access_token|secret|key|authorization|auth)/i.test(name || '')
}

function confirmationStatusText(status: string) {
  if (status === 'approved') return '已确认执行'
  if (status === 'cancelled') return '已取消'
  if (status === 'failed') return '执行失败'
  if (status === 'expired') return '已过期'
  return status || '已处理'
}

function hasHighRiskStep(message: ChatMessage) {
  return Boolean(message.toolConfirmation?.tool_chain?.some((step) => step.risk_level === 'high'))
}

function clarificationTitle(type?: string) {
  if (type === 'missing_arguments') return '补充参数'
  if (type === 'tool_scope') return '确认查询口径'
  if (type === 'tool_account') return '选择账号范围'
  return '补充信息'
}

function confirmationToChat(confirmation: KBChatToolConfirmation): ChatMessage {
  return {
    id: `tool-confirm-${confirmation.id}`,
    role: 'assistant',
    content: '',
    sources: confirmation.sources || [],
    retrieval: confirmation.retrieval,
    debugEvents: [{ text: `等待确认工具调用：${confirmation.tool_name || confirmation.tool?.name || confirmation.tool_id}` }],
    processExpanded: false,
    processDone: true,
    toolConfirmation: confirmation,
    toolArgumentDraft: createArgumentDraft(confirmation),
    approveHighRiskInSession: Boolean(confirmation.allow_high_risk_in_session),
  }
}

function waitFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

function forceScrollToBottom() {
  const el = scrollRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

function scheduleRunningScrollToBottom() {
  if (!running.value) return
  if (autoScrollFrame) cancelAnimationFrame(autoScrollFrame)
  if (autoScrollTimer) window.clearTimeout(autoScrollTimer)
  autoScrollFrame = requestAnimationFrame(() => {
    autoScrollFrame = requestAnimationFrame(() => {
      autoScrollFrame = 0
      forceScrollToBottom()
    })
  })
  autoScrollTimer = window.setTimeout(() => {
    autoScrollTimer = 0
    forceScrollToBottom()
  }, 260)
}

async function scrollToBottom(smooth = true) {
  await nextTick()
  await waitFrame()
  const el = scrollRef.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  await waitFrame()
  const latest = scrollRef.value
  if (!latest) return
  latest.scrollTo({ top: latest.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

function resizeInput() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(Math.max(el.scrollHeight, 38), 128)}px`
}

function useQuestion(question: string) {
  if (running.value) return
  draft.value = question
  nextTick(resizeInput)
}

function clearConversation() {
  messages.value = []
  currentPhase.value = ''
}

onMounted(() => {
  loadSessions()
  nextTick(() => {
    if (!scrollRef.value || typeof MutationObserver === 'undefined') return
    threadMutationObserver = new MutationObserver(() => {
      scheduleRunningScrollToBottom()
    })
    threadMutationObserver.observe(scrollRef.value, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    })
  })
})

onBeforeUnmount(() => {
  threadMutationObserver?.disconnect()
  threadMutationObserver = null
  if (autoScrollFrame) cancelAnimationFrame(autoScrollFrame)
  if (autoScrollTimer) window.clearTimeout(autoScrollTimer)
})

watch(() => props.kbId, () => {
  activeSessionId.value = ''
  draftSessionActive.value = false
  messages.value = []
  loadSessions()
})

async function loadSessions(preferredSessionId = activeSessionId.value) {
  sessionLoading.value = true
  try {
    sessions.value = await listChatSessions(props.kbId)
    const nextSession = sessions.value.find((item) => item.id === preferredSessionId) || sessions.value[0]
    if (nextSession && activeSessionId.value !== DRAFT_SESSION_ID) {
      await selectSession(nextSession.id, false)
    } else if (!nextSession && !draftSessionActive.value) {
      activeSessionId.value = ''
      messages.value = []
    }
  } finally {
    sessionLoading.value = false
  }
}

async function selectSession(sessionId: string, skipSame = true) {
  if (running.value) return
  if (skipSame && activeSessionId.value === sessionId) return
  activeSessionId.value = sessionId
  const [rows, pendingConfirmations] = await Promise.all([
    listChatMessages(props.kbId, sessionId),
    listPendingToolConfirmations(props.kbId, sessionId),
  ])
  messages.value = chatRowsToMessages(rows)
  pendingConfirmations.forEach((confirmation) => {
    const latest = messages.value[messages.value.length - 1]
    if (isOpenClarificationMessage(latest)) {
      latest.toolConfirmation = confirmation
      latest.toolArgumentDraft = createArgumentDraft(confirmation)
      latest.approveHighRiskInSession = Boolean(confirmation.allow_high_risk_in_session)
      latest.processExpanded = false
      latest.processDone = true
    } else {
      messages.value.push(confirmationToChat(confirmation))
    }
  })
  await scrollToBottom(false)
}

async function startNewSession() {
  if (running.value) return
  draftSessionActive.value = true
  activeSessionId.value = DRAFT_SESSION_ID
  messages.value = []
  currentPhase.value = ''
  await nextTick()
  resizeInput()
  inputRef.value?.focus()
}

async function focusDraftSession() {
  if (running.value) return
  draftSessionActive.value = true
  activeSessionId.value = DRAFT_SESSION_ID
  messages.value = []
  await nextTick()
  inputRef.value?.focus()
}

function activePersistedSessionId() {
  if (activeSessionId.value && activeSessionId.value !== DRAFT_SESSION_ID) return activeSessionId.value
  return undefined
}

async function removeSession(sessionId: string) {
  if (running.value) return
  if (!window.confirm('确认删除这个会话？')) return
  await deleteChatSession(props.kbId, sessionId)
  const next = sessions.value.filter((item) => item.id !== sessionId)
  sessions.value = next
  if (activeSessionId.value === sessionId) {
    const fallback = next[0]
    if (fallback) {
      await selectSession(fallback.id, false)
    } else if (draftSessionActive.value) {
      activeSessionId.value = DRAFT_SESSION_ID
      messages.value = []
    } else {
      activeSessionId.value = ''
      messages.value = []
    }
  }
}

function messageRecordToChat(row: KBChatMessageRecord): ChatMessage {
  const rawEvents = row.debug_events || []
  const eventTypes = new Set(rawEvents.map((event) => String(event.type || '')))
  const events = rawEvents
    .map((event) => ({
      type: String(event.type || ''),
      text: String(event.text || event.stage || event.message || event.type || '').trim(),
    }))
    .filter((event) => event.text)
  const isOpenClarification = row.role !== 'user' && eventTypes.has('clarification') && !eventTypes.has('final')
  const clarificationEvent = rawEvents.find((event) => String(event.type || '') === 'clarification')
  const clarificationPayload = clarificationEvent?.payload || {}
  return {
    id: row.id,
    role: row.role === 'user' ? 'user' : 'assistant',
    content: isOpenClarification ? '' : (row.content || ''),
    sources: row.sources || [],
    retrieval: row.retrieval,
    debugEvents: events,
    processExpanded: false,
    processDone: true,
    clarifications: isOpenClarification
      ? [{
          id: `${row.id}-clarification`,
          message: row.content || String(clarificationEvent?.stage || ''),
          type: String(clarificationPayload.clarification_type || ''),
          suggestions: Array.isArray(clarificationPayload.suggested_replies)
            ? clarificationPayload.suggested_replies.map((item: unknown) => String(item || '').trim()).filter(Boolean)
            : [],
          draft: '',
        }]
      : undefined,
  }
}

function isOpenClarificationMessage(message: ChatMessage | undefined) {
  if (!message || message.role !== 'assistant') return false
  const eventTypes = new Set((message.debugEvents || []).map((event) => event.type || ''))
  return eventTypes.has('clarification') && !eventTypes.has('final')
}

function chatRowsToMessages(rows: KBChatMessageRecord[]) {
  const result: ChatMessage[] = []
  rows.forEach((row) => {
    const current = messageRecordToChat(row)
    const latest = result[result.length - 1]
    if (current.role === 'assistant' && isOpenClarificationMessage(latest) && !isOpenClarificationMessage(current)) {
      latest.content = current.content
      latest.sources = current.sources
      latest.retrieval = current.retrieval
      latest.debugEvents = [...(latest.debugEvents || []), ...(current.debugEvents || [])]
      latest.clarifications = undefined
      latest.processDone = true
      latest.processExpanded = false
      return
    }
    result.push(current)
  })
  return result
}

async function replyToClarification(value: string, message?: ChatMessage, clarificationId?: string) {
  const text = (value || '').trim()
  if (!text || running.value) return
  if (message?.clarifications?.length) {
    const clarification = message.clarifications.find((item) => item.id === clarificationId) || message.clarifications[message.clarifications.length - 1]
    clarification.selected = text
    clarification.draft = ''
  }
  await send({
    questionOverride: text,
    showUserMessage: false,
    continuationMessage: message,
  })
}

function upsertSession(session: KBChatSession) {
  if (!session?.id) return
  draftSessionActive.value = false
  const next = sessions.value.filter((item) => item.id !== session.id)
  sessions.value = [session, ...next]
  activeSessionId.value = session.id
}

function formatSessionTime(value?: string | null) {
  if (!value) return ''
  const normalized = /(?:z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function approvePendingTool(message: ChatMessage) {
  const confirmation = message.toolConfirmation
  if (!confirmation || confirmation.status !== 'pending' || running.value) return
  running.value = true
  activeAssistantId.value = message.id
  currentPhase.value = '确认执行工具'
  message.processExpanded = true
  message.processDone = false
  pushDebug(message, '用户已确认，准备执行工具')
  try {
    await approveToolConfirmationStream(props.kbId, confirmation.id, {
      ...(message.toolArgumentDraft || {}),
      __approve_high_risk_in_session: Boolean(message.approveHighRiskInSession),
    }, {
      onStage: (event) => {
        const stage = String(event.stage || '执行中')
        currentPhase.value = stage
        const model = event.model ? ` · ${event.model}` : ''
        pushDebug(message, `${stage}${model}`)
      },
      onToolEvent: (event) => {
        const type = String(event.type || '')
        if (type === 'tool_call') {
          const tool = event.tool || {}
          pushDebug(message, `调用工具：${tool.tool_name || tool.tool_id || '未命名工具'}`)
          return
        }
        if (type === 'tool_result') {
          const result = event.result || {}
          const toolName = result.tool?.name || confirmation.tool_name || '工具'
          pushDebug(message, `${toolName} 执行完成 · ${result.elapsed_ms || 0}ms`)
          return
        }
        if (type === 'tool_error') {
          pushDebug(message, `工具执行失败：${event.message || event.stage || '未知错误'}`)
          return
        }
        pushDebug(message, String(event.stage || event.message || '工具流程执行中'))
      },
      onToolConfirmationRequired: (nextConfirmation) => {
        message.toolConfirmation = nextConfirmation
        message.toolArgumentDraft = createArgumentDraft(nextConfirmation)
        message.approveHighRiskInSession = Boolean(nextConfirmation.allow_high_risk_in_session)
        message.processDone = true
        message.processExpanded = true
        pushDebug(message, `等待二次确认：${nextConfirmation.tool_name || nextConfirmation.tool?.name || nextConfirmation.tool_id}`)
      },
      onChunk: (chunk) => {
        message.content += chunk
        scrollToBottom()
      },
      onFinal: (event) => {
        if (!message.content && event.answer) message.content = String(event.answer)
        if (Array.isArray(event.sources)) message.sources = event.sources
        if (event.retrieval) message.retrieval = event.retrieval
        if (message.toolConfirmation) message.toolConfirmation.status = 'approved'
        message.processDone = true
        message.processExpanded = false
        pushDebug(message, '回答完成')
      },
      onError: (errorMessage) => {
        throw new Error(errorMessage || '工具执行失败')
      },
    })
    if (message.toolConfirmation) message.toolConfirmation.status = 'approved'
    message.processDone = true
    message.processExpanded = false
    await loadSessions(activeSessionId.value)
  } catch (error: any) {
    message.content = message.content || `工具执行失败：${error?.message || String(error)}`
    if (message.toolConfirmation) message.toolConfirmation.status = 'failed'
    message.processDone = true
    message.processExpanded = true
    pushDebug(message, `错误：${error?.message || String(error)}`)
  } finally {
    running.value = false
    activeAssistantId.value = ''
    currentPhase.value = ''
    await scrollToBottom()
  }
}

async function cancelPendingTool(message: ChatMessage) {
  const confirmation = message.toolConfirmation
  if (!confirmation || confirmation.status !== 'pending' || running.value) return
  running.value = true
  activeAssistantId.value = message.id
  currentPhase.value = '取消工具调用'
  try {
    const next = await cancelToolConfirmation(props.kbId, confirmation.id)
    message.toolConfirmation = next
    message.toolArgumentDraft = createArgumentDraft(next)
    message.approveHighRiskInSession = Boolean(next.allow_high_risk_in_session)
    message.content = `已取消工具调用：${next.tool_name || next.tool?.name || next.tool_id}。本次没有执行工具。`
    message.processDone = true
    message.processExpanded = false
    pushDebug(message, '用户取消工具调用，未执行工具')
    await loadSessions(activeSessionId.value)
  } catch (error: any) {
    pushDebug(message, `取消失败：${error?.message || String(error)}`)
  } finally {
    running.value = false
    activeAssistantId.value = ''
    currentPhase.value = ''
    await scrollToBottom()
  }
}

function toggleProcess(message: ChatMessage) {
  message.processExpanded = !message.processExpanded
}

function processSummary(message: ChatMessage) {
  const count = message.debugEvents?.length || 0
  if (running.value && message.id === activeAssistantId.value) return count ? `${count} 步进行中` : '准备中'
  return message.processDone ? `${count} 步，已完成` : `${count} 步`
}

async function send(options: {
  questionOverride?: string
  showUserMessage?: boolean
  continuationMessage?: ChatMessage
} = {}) {
  const question = (options.questionOverride ?? draft.value).trim()
  if (!question || running.value) return

  if (!options.questionOverride) draft.value = ''
  running.value = true
  currentPhase.value = '连接后端'

  if (options.showUserMessage !== false) {
    messages.value.push({ id: makeId(), role: 'user', content: question })
  }
  const assistant: ChatMessage = options.continuationMessage || {
    id: makeId(),
    role: 'assistant',
    content: '',
    sources: [],
    debugEvents: [],
    processExpanded: true,
    processDone: false,
  }
  assistant.content = ''
  assistant.processExpanded = true
  assistant.processDone = false
  assistant.toolConfirmation = null
  if (!options.continuationMessage) assistant.clarifications = []
  if (!options.continuationMessage) {
    messages.value.push(assistant)
  }
  activeAssistantId.value = assistant.id
  const assistantIndex = messages.value.length - 1
  const updateAssistant = (updater: (message: ChatMessage) => void) => {
    const current = options.continuationMessage || messages.value[assistantIndex]
    if (!current) return
    updater(current)
  }
  await scrollToBottom(false)

  try {
    const sessionId = activePersistedSessionId()
    await streamKnowledgeChat(props.kbId, question, {
      onSession: (session) => {
        upsertSession(session)
      },
      onStage: (event) => {
        const stage = String(event.stage || '执行中')
        currentPhase.value = stage
        const model = event.model ? ` · ${event.model}` : ''
        pushDebug(assistant, `${stage}${model}`)
      },
      onRetrieval: (retrieval) => {
        updateAssistant((message) => { message.retrieval = retrieval })
        const blockCount = Array.isArray(retrieval.selected_blocks) ? retrieval.selected_blocks.length : 0
        const nodeCount = Array.isArray(retrieval.selected_nodes) ? retrieval.selected_nodes.length : 0
        const conceptCount = Array.isArray(retrieval.matched_concepts) ? retrieval.matched_concepts.length : 0
        const missing = retrieval.missing_knowledge ? `；缺失：${retrieval.missing_knowledge}` : ''
        pushDebug(assistant, `召回规划完成：命中 ${blockCount} 个块，${nodeCount} 个节点，${conceptCount} 个概念${missing}`)
      },
      onSources: (sources) => {
        updateAssistant((message) => { message.sources = sources })
        pushDebug(assistant, `最终引用来源：${sources.length} 个来源`)
      },
      onClarification: (message, event) => {
        const suggestions = Array.isArray(event?.suggested_replies)
          ? event.suggested_replies.map((item: unknown) => String(item || '').trim()).filter(Boolean).slice(0, 3)
          : []
        updateAssistant((item) => {
          item.content = ''
          item.clarifications = [
            ...(item.clarifications || []),
            {
              id: makeId(),
              message,
              type: String(event?.clarification_type || ''),
              suggestions,
              draft: '',
            },
          ]
          item.toolConfirmation = null
          item.processDone = true
          item.processExpanded = false
        })
        pushDebug(assistant, '需要用户补充确认')
      },
      onToolEvent: (event) => {
        const type = String(event.type || '')
        if (type === 'tool_candidates') {
          const candidates = event.candidates || {}
          const count = Array.isArray(candidates.candidate_tool_ids) ? candidates.candidate_tool_ids.length : 0
          pushDebug(assistant, `工具发现完成：候选工具 ${count} 个`)
          return
        }
        if (type === 'tool_call') {
          const tool = event.tool || {}
          pushDebug(assistant, `调用工具：${tool.tool_name || tool.tool_id || '未命名工具'}`)
          return
        }
        if (type === 'tool_result') {
          const result = event.result || {}
          const toolName = result.tool?.name || '工具'
          pushDebug(assistant, `${toolName} 执行完成 · ${result.elapsed_ms || 0}ms`)
          return
        }
        if (type === 'tool_error') {
          pushDebug(assistant, `工具执行失败：${event.message || event.stage || '未知错误'}`)
          return
        }
        pushDebug(assistant, String(event.stage || event.message || '工具流程执行中'))
      },
      onToolConfirmationRequired: (confirmation) => {
        updateAssistant((message) => {
          message.content = ''
          message.toolConfirmation = confirmation
          message.toolArgumentDraft = createArgumentDraft(confirmation)
          message.approveHighRiskInSession = Boolean(confirmation.allow_high_risk_in_session)
          message.processDone = true
          message.processExpanded = false
        })
        pushDebug(assistant, `等待确认工具调用：${confirmation.tool_name || confirmation.tool?.name || confirmation.tool_id}`)
      },
      onChunk: (chunk) => {
        updateAssistant((message) => { message.content += chunk })
        scrollToBottom()
      },
      onFinal: (event) => {
        updateAssistant((message) => {
          if (Array.isArray(event.sources)) message.sources = event.sources
          if (event.retrieval) message.retrieval = event.retrieval
        })
        updateAssistant((message) => {
          message.processDone = true
          message.processExpanded = false
        })
        pushDebug(assistant, '回答完成')
      },
      onError: (message) => {
        throw new Error(message || '问答失败')
      },
    }, sessionId, { continuation: options.showUserMessage === false })
    updateAssistant((message) => {
      message.processDone = true
      message.processExpanded = false
    })
  } catch (error: any) {
    updateAssistant((message) => { message.content = `问答失败：${error?.message || String(error)}` })
    updateAssistant((message) => {
      message.processDone = true
      message.processExpanded = true
    })
    pushDebug(assistant, `错误：${error?.message || String(error)}`)
  } finally {
    running.value = false
    activeAssistantId.value = ''
    currentPhase.value = ''
    nextTick(resizeInput)
    await scrollToBottom()
  }
}
</script>

<style scoped lang="scss">
.kbc {
  height: 100%;
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  display: block;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(247, 248, 250, 0.92), rgba(255, 255, 255, 0.98)),
    #f6f7f8;
  color: #15171a;
}

.kbc-session-rail {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.kbc-session-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 18px 14px 14px;
  border-bottom: 1px solid rgba(20, 23, 27, 0.06);

  p,
  strong {
    margin: 0;
  }

  p {
    color: #7b838d;
    font-size: 11px;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 3px;
    color: #15171a;
    font-size: 15px;
  }

  .kbc-session-add {
    position: relative;
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: #4b535c;
    padding: 0;
    cursor: pointer;
    transition: background 0.14s ease, color 0.14s ease, transform 0.14s ease, opacity 0.14s ease;

    span,
    &::before {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 10px;
      height: 2px;
      border-radius: 999px;
      background: currentColor;
      content: '';
      transform: translate(-50%, -50%);
    }

    span {
      width: 2px;
      height: 10px;
    }

    &:hover:not(:disabled) {
      background: #eef1f4;
      color: #15171a;
    }

    &:active:not(:disabled) {
      transform: translateY(1px) scale(0.98);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }
}

.kbc-session-list {
  min-height: 0;
  overflow: auto;
  padding: 10px;
}

.kbc-session-empty {
  padding: 16px 8px;
  color: #8a929b;
  font-size: 12px;
}

.kbc-session-item {
  position: relative;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: #20242a;
  text-align: left;
  padding: 10px 42px 10px 10px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;

  span,
  small {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    font-size: 13px;
    font-weight: 800;
  }

  small {
    margin-top: 5px;
    color: #8a929b;
    font-size: 11px;
  }

  i {
    position: absolute;
    top: 9px;
    right: 9px;
    color: #9aa3ad;
    font-size: 11px;
    font-style: normal;
    opacity: 0;
    transition: opacity 0.16s ease, color 0.16s ease;
  }

  &:hover {
    background: #f2f4f6;
    transform: translateX(1px);

    i {
      opacity: 1;
    }
  }

  &.active {
    background: #111316;
    border-color: #111316;
    color: #ffffff;
    box-shadow: 0 10px 24px rgba(17, 19, 22, 0.16);

    small {
      color: rgba(255, 255, 255, 0.62);
    }

    i {
      color: rgba(255, 255, 255, 0.64);
      opacity: 1;
    }
  }

  &--draft:not(.active) {
    span {
      color: #20242a;
    }

    small {
      color: #8a929b;
    }
  }

  i:hover {
    color: #d92d20;
  }
}

.kbc-quick {
  width: min(760px, 100%);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.kbc-quick-item {
  width: 100%;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.78);
  color: #20242a;
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.45;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;

  &:hover {
    background: #ffffff;
    border-color: rgba(20, 23, 27, 0.08);
    transform: translateY(-1px);
  }
}

.kbc-debug-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  scroll-behavior: smooth;
  margin-top: 10px;
  overflow: hidden;
}

.kbc-debug-line {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  padding: 8px 9px;
  border-radius: 8px;
  background: #f5f6f7;
  animation: kbcSlideIn 0.22s ease both;

  span {
    height: 22px;
    border-radius: 7px;
    background: #111316;
    color: #fff;
    display: grid;
    place-items: center;
    font-size: 10px;
    font-weight: 800;
  }

  p {
    margin: 2px 0 0;
    font-size: 12px;
    color: #383e45;
    line-height: 1.5;
  }

  &--active {
    animation: kbcPulse 1.2s ease-in-out infinite;
  }
}

.kbc-main {
  height: 100%;
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  background: #f8f9fb;
}

.kbc-header {
  padding: 14px 24px 11px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid rgba(20, 23, 27, 0.06);

  p {
    margin: 0 0 3px;
    color: #7b838d;
    font-size: 11px;
    font-weight: 700;
  }

  h1 {
    margin: 0;
    font-size: 17px;
    letter-spacing: 0;
    line-height: 1.15;
  }
}

.kbc-send {
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.14s ease, opacity 0.14s ease, background 0.14s ease;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  &:not(:disabled):active {
    transform: translateY(1px);
  }
}

.kbc-thread {
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 18px max(34px, calc((100% - 1080px) / 2)) 28px;
}

.kbc-empty {
  height: 100%;
  min-height: 360px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  text-align: center;
  color: #6f7781;

  h2 {
    margin: 0;
    color: #16191d;
    font-size: 20px;
  }

  p {
    width: min(460px, 100%);
    margin: 0;
    font-size: 13px;
    line-height: 1.7;
  }
}

.kbc-empty-mark {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  background: #111316;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 18px 44px rgba(17, 19, 22, 0.18);

  img {
    width: 42px;
    max-height: 34px;
    object-fit: contain;
  }
}

.kbc-message {
  min-width: 0;
  max-width: 100%;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  margin: 18px 0;
  animation: kbcRise 0.22s ease both;

  &--user {
    grid-template-columns: minmax(0, 1fr) 34px;

    .kbc-avatar {
      grid-column: 2;
      grid-row: 1;
      background: #e7ebef;
      color: #20242a;
    }

    .kbc-bubble {
      grid-column: 1;
      grid-row: 1;
      background: #111316;
      color: #fff;
      justify-self: end;
      max-width: min(760px, 82%);
      padding: 9px 12px;
      border-radius: 9px;
    }
  }

  &--assistant {
    .kbc-bubble {
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(20, 23, 27, 0.08);
      color: #181b20;
      max-width: min(860px, 92%);
    }

    .kbc-avatar {
      background: #111316;
      border: 1px solid rgba(255, 255, 255, 0.14);
      box-shadow: 0 10px 24px rgba(17, 19, 22, 0.16);
    }
  }
}

.kbc-avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 900;

  img {
    width: 24px;
    max-height: 18px;
    object-fit: contain;
  }
}

.kbc-bubble {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(16, 20, 24, 0.06);

  p {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
    line-height: 1.55;
    font-size: 14px;
  }
}

.kbc-process {
  order: 0;
  margin: -2px 0 14px;
  border: 1px solid rgba(20, 23, 27, 0.08);
  border-radius: 10px;
  background: #f7f8f9;
  overflow: hidden;
}

.kbc-process-toggle {
  width: 100%;
  min-height: 42px;
  border: 0;
  background: transparent;
  display: grid;
  grid-template-columns: 10px auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  cursor: pointer;
  color: #1d2127;
  text-align: left;

  > span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #9aa3ad;

    &.is-running {
      background: #8db600;
      animation: kbcBlink 1s ease-in-out infinite;
    }
  }

  strong {
    font-size: 12px;
    font-weight: 900;
  }

  em {
    min-width: 0;
    color: #6f7781;
    font-size: 12px;
    font-style: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  i {
    color: #2f353c;
    font-size: 12px;
    font-style: normal;
    font-weight: 800;
  }

  &:hover {
    background: #ffffff;
  }
}

.kbc-typing-caret {
  order: 2;
  align-self: flex-start;
  display: inline-block;
  width: 8px;
  height: 18px;
  margin: 2px 0 12px 2px;
  vertical-align: text-bottom;
  border-radius: 3px;
  background: #111316;
  animation: kbcCaret 0.9s ease-in-out infinite;
}

.kbc-answer {
  order: 3;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;

  :deep(p) {
    margin: 0 0 10px;
    line-height: 1.72;
    font-size: 14px;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  :deep(ul),
  :deep(ol) {
    margin: 8px 0 10px;
    padding-left: 20px;
  }

  :deep(li) {
    margin: 4px 0;
    line-height: 1.65;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  :deep(strong) {
    color: #0f1114;
  }

  :deep(table) {
    display: block;
    width: 100%;
    max-width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px;
    overflow-x: auto;
    border-radius: 8px;
    box-shadow: 0 0 0 1px rgba(20, 23, 27, 0.1);
    font-size: 13px;
  }

  :deep(th),
  :deep(td) {
    border: 1px solid rgba(20, 23, 27, 0.1);
    padding: 8px 10px;
    line-height: 1.55;
    text-align: left;
    vertical-align: top;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  :deep(th) {
    background: #f1f3f5;
    color: #111316;
    font-weight: 900;
  }

  :deep(td) {
    background: #fff;
    color: #30363d;
  }

  :deep(tr:nth-child(even) td) {
    background: #fafbfc;
  }

  :deep(pre) {
    max-width: 100%;
    box-sizing: border-box;
    overflow-x: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
    border-radius: 8px;
    background: #111316;
    color: #f5f7fa;
    padding: 12px;
  }

  :deep(code) {
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
}

.kbc-tool-confirm {
  order: 2;
  margin-bottom: 12px;
  border: 1px solid rgba(17, 19, 22, 0.1);
  border-radius: 10px;
  background: #fbfcfd;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
  overflow: hidden;
}

.kbc-tool-confirm-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 11px 12px;
  border-bottom: 1px solid rgba(17, 19, 22, 0.08);
  background: #f3f5f7;

  span {
    padding: 3px 7px;
    border-radius: 999px;
    background: #111316;
    color: #fff;
    font-size: 11px;
    font-weight: 900;
  }

  strong {
    min-width: 0;
    color: #15171a;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.kbc-tool-confirm-reason {
  margin: 0;
  padding: 10px 12px 0;
  color: #4c535c;
  font-size: 12px;
  line-height: 1.6;
}

.kbc-tool-chain {
  display: grid;
  gap: 8px;
  padding: 12px 12px 0;
}

.kbc-tool-chain-step {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  border: 1px solid rgba(20, 23, 27, 0.08);
  border-radius: 9px;
  background: #fff;
  padding: 8px 9px;

  i {
    width: 24px;
    height: 24px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    background: #111316;
    color: #fff;
    font-size: 11px;
    font-style: normal;
    font-weight: 900;
  }

  div {
    min-width: 0;
  }

  strong,
  p {
    margin: 0;
  }

  strong {
    display: block;
    color: #15171a;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin-top: 3px;
    color: #747d87;
    font-size: 11px;
    line-height: 1.45;
  }

  em {
    border-radius: 999px;
    background: #edf7ee;
    color: #28733b;
    padding: 3px 7px;
    font-size: 11px;
    font-style: normal;
    font-weight: 900;
  }

  &.is-high-risk {
    border-color: rgba(194, 65, 12, 0.2);

    em {
      background: #fff1e8;
      color: #c2410c;
    }
  }
}

.kbc-tool-args {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 12px;
}

.kbc-tool-arg {
  min-width: 0;
  display: grid;
  gap: 6px;

  span {
    min-width: 0;
    color: #2f353c;
    font-size: 12px;
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  em {
    margin-left: 6px;
    color: #c2410c;
    font-size: 11px;
    font-style: normal;
    font-weight: 900;
  }

  input,
  select {
    width: 100%;
    min-width: 0;
    height: 34px;
    box-sizing: border-box;
    border: 1px solid rgba(20, 23, 27, 0.12);
    border-radius: 8px;
    background: #fff;
    color: #15171a;
    font-size: 12px;
    outline: none;
    padding: 0 10px;
    transition: border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;

    &:focus {
      border-color: rgba(17, 19, 22, 0.38);
      box-shadow: 0 0 0 3px rgba(17, 19, 22, 0.08);
    }

    &:disabled {
      background: #f2f4f6;
      color: #7b838d;
      cursor: not-allowed;
    }
  }
}

.kbc-tool-confirm-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px 12px;
  border-top: 1px solid rgba(17, 19, 22, 0.06);

  small {
    min-width: 0;
    color: #747d87;
    font-size: 11px;
    line-height: 1.5;
  }
}

.kbc-tool-risk-pass {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #30363d;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  input {
    width: 14px;
    height: 14px;
    accent-color: #111316;
  }
}

.kbc-tool-confirm-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.kbc-tool-btn {
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: #111316;
  color: #fff;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  transition: background 0.16s ease, transform 0.16s ease, opacity 0.16s ease;

  &:hover:not(:disabled) {
    background: #242930;
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--ghost {
    border: 1px solid rgba(20, 23, 27, 0.12);
    background: #fff;
    color: #2f353c;

    &:hover:not(:disabled) {
      background: #f2f4f6;
    }
  }
}

.kbc-tool-status {
  flex: 0 0 auto;
  color: #4b535c;
  font-size: 12px;
}

.kbc-clarify-stack {
  order: 1;
}

.kbc-clarify-card {
  margin-bottom: 12px;
  border: 1px solid rgba(17, 19, 22, 0.12);
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f8fa 100%);
  overflow: hidden;
  box-shadow: 0 10px 26px rgba(17, 19, 22, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.9);

  p {
    margin: 0;
    padding: 12px 14px 10px;
    color: #2d333a;
    font-size: 13px;
    line-height: 1.7;
  }
}

.kbc-clarify-head {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 14px;
  border-bottom: 1px solid rgba(17, 19, 22, 0.08);
  background: #f1f3f5;

  span {
    border-radius: 999px;
    background: #111316;
    color: #fff;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 900;
  }

  strong {
    color: #15171a;
    font-size: 13px;
  }
}

.kbc-clarify-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 14px 12px;

  button {
    min-height: 30px;
    border: 1px solid rgba(17, 19, 22, 0.12);
    border-radius: 999px;
    background: #fff;
    color: #20252b;
    padding: 0 11px;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      border-color: rgba(17, 19, 22, 0.28);
      background: #f6f7f8;
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }
}

.kbc-clarify-selected {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 14px 12px;
  border: 1px solid rgba(33, 150, 83, 0.18);
  border-radius: 9px;
  background: #f0faf3;
  padding: 8px 10px;

  span {
    flex: 0 0 auto;
    color: #28733b;
    font-size: 11px;
    font-weight: 900;
  }

  strong {
    min-width: 0;
    color: #1f3d2a;
    font-size: 12px;
    overflow-wrap: anywhere;
  }
}

.kbc-clarify-custom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 9px;
  align-items: end;
  padding: 0 14px 14px;

  textarea {
    width: 100%;
    min-width: 0;
    resize: vertical;
    box-sizing: border-box;
    border: 1px solid rgba(17, 19, 22, 0.12);
    border-radius: 9px;
    background: #fff;
    color: #15171a;
    padding: 9px 10px;
    font-size: 12px;
    line-height: 1.55;
    outline: none;
    transition: border-color 0.16s ease, box-shadow 0.16s ease;

    &:focus {
      border-color: rgba(17, 19, 22, 0.4);
      box-shadow: 0 0 0 3px rgba(17, 19, 22, 0.08);
    }
  }

  button {
    height: 36px;
    border: 0;
    border-radius: 9px;
    background: #111316;
    color: #fff;
    padding: 0 14px;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
    transition: transform 0.16s ease, background 0.16s ease, opacity 0.16s ease;

    &:hover:not(:disabled) {
      background: #252a31;
    }

    &:active:not(:disabled) {
      transform: translateY(1px);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }
}

.kbc-sources {
  order: 4;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-wrap: wrap;
  overflow: hidden;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(20, 23, 27, 0.08);
}

.kbc-clarify-stack + .kbc-sources,
.kbc-tool-confirm + .kbc-sources {
  margin-top: 18px;
}

.kbc-source {
  min-width: 0;
  border: 1px solid rgba(20, 23, 27, 0.08);
  background: #f6f7f8;
  border-radius: 8px;
  padding: 7px 9px;
  max-width: 260px;
  text-align: left;
  cursor: default;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(17, 19, 22, 0.18);
    background: #fff;
  }

  span {
    display: block;
    font-size: 12px;
    font-weight: 900;
    color: #1d2127;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    display: block;
    margin-top: 2px;
    color: #747d87;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.kbc-compose {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  padding: 7px max(24px, calc((100% - 1080px) / 2)) 14px;
  border-top: 1px solid rgba(20, 23, 27, 0.06);
  background: rgba(250, 251, 252, 0.78);
  backdrop-filter: blur(12px);
}

.kbc-status {
  min-height: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #616a74;
  font-size: 12px;
  margin-bottom: 5px;

  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #9aa3ad;
  }
}

.kbc-status-pulse {
  background: #8db600 !important;
  animation: kbcBlink 1s ease-in-out infinite;
}

.kbc-input-wrap {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px;
  border-radius: 11px;
  background: #fff;
  border: 1px solid rgba(20, 23, 27, 0.1);
  box-shadow: 0 18px 42px rgba(16, 20, 24, 0.09);
}

.kbc-input {
  flex: 1;
  min-width: 0;
  height: 38px;
  min-height: 38px;
  max-height: 128px;
  box-sizing: border-box;
  resize: none;
  border: 0;
  outline: none;
  color: #15171a;
  font-size: 13px;
  line-height: 20px;
  padding: 9px 2px 9px 4px;
  border-radius: 0;
  background: transparent;
  overflow-y: auto;

  &::placeholder {
    color: #9aa3ad;
  }
}

.kbc-send {
  width: 72px;
  height: 38px;
  flex: 0 0 auto;
  background: #111316;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  border-radius: 8px;

  &:not(:disabled):hover {
    background: #242930;
  }
}

.kbc-process-fold-enter-active,
.kbc-process-fold-leave-active {
  transition: max-height 0.22s ease, opacity 0.18s ease;
  overflow: hidden;
}

.kbc-process-fold-enter-from,
.kbc-process-fold-leave-to {
  max-height: 0;
  opacity: 0;
}

.kbc-process-fold-enter-to,
.kbc-process-fold-leave-from {
  max-height: 420px;
  opacity: 1;
}

@keyframes kbcRise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes kbcSlideIn {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes kbcPulse {
  0%, 100% { box-shadow: inset 0 0 0 1px rgba(141, 182, 0, 0); }
  50% { box-shadow: inset 0 0 0 1px rgba(141, 182, 0, 0.35); }
}

@keyframes kbcBlink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.78); }
}

@keyframes kbcCaret {
  0%, 100% { opacity: 0.25; transform: scaleY(0.72); }
  50% { opacity: 1; transform: scaleY(1); }
}

@media (max-width: 980px) {
  .kbc-session-rail {
    min-height: 190px;
  }

  .kbc-quick {
    grid-template-columns: 1fr;
  }

  .kbc-thread,
  .kbc-compose,
  .kbc-header {
    padding-left: 18px;
    padding-right: 18px;
  }

  .kbc-input-wrap {
    gap: 8px;
  }

  .kbc-tool-args {
    grid-template-columns: 1fr;
  }

  .kbc-tool-confirm-foot {
    align-items: stretch;
    flex-direction: column;
  }

  .kbc-tool-confirm-actions {
    justify-content: flex-end;
  }

  .kbc-send {
    width: 72px;
  }
}
</style>
