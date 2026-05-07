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

            <div v-if="message.role === 'assistant'" class="kbc-answer" v-html="renderMarkdown(message.content || '正在组织答案…')"></div>
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
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { marked } from 'marked'
import type { KBChatMessageRecord, KBChatRetrieval, KBChatSession, KBChatSource } from '@/types/knowledge'
import { deleteChatSession, listChatMessages, listChatSessions, streamKnowledgeChat } from '../api'

marked.setOptions({
  gfm: true,
  breaks: true,
})

const props = defineProps<{
  kbId: number
  kbName?: string
}>()

type ChatRole = 'user' | 'assistant'

interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  sources?: KBChatSource[]
  retrieval?: KBChatRetrieval
  debugEvents?: Array<{ text: string }>
  processExpanded?: boolean
  processDone?: boolean
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
  scrollToBottom()
}

async function scrollToBottom(smooth = true) {
  await nextTick()
  const el = scrollRef.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
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
  const rows = await listChatMessages(props.kbId, sessionId)
  messages.value = rows.map(messageRecordToChat)
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
  const events = (row.debug_events || [])
    .map((event) => ({
      text: String(event.text || event.stage || event.message || event.type || '').trim(),
    }))
    .filter((event) => event.text)
  return {
    id: row.id,
    role: row.role === 'user' ? 'user' : 'assistant',
    content: row.content || '',
    sources: row.sources || [],
    retrieval: row.retrieval,
    debugEvents: events,
    processExpanded: false,
    processDone: true,
  }
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

function toggleProcess(message: ChatMessage) {
  message.processExpanded = !message.processExpanded
}

function processSummary(message: ChatMessage) {
  const count = message.debugEvents?.length || 0
  if (running.value && message.id === activeAssistantId.value) return count ? `${count} 步进行中` : '准备中'
  return message.processDone ? `${count} 步，已完成` : `${count} 步`
}

async function send() {
  const question = draft.value.trim()
  if (!question || running.value) return

  draft.value = ''
  running.value = true
  currentPhase.value = '连接后端'

  messages.value.push({ id: makeId(), role: 'user', content: question })
  const assistant: ChatMessage = {
    id: makeId(),
    role: 'assistant',
    content: '',
    sources: [],
    debugEvents: [],
    processExpanded: true,
    processDone: false,
  }
  messages.value.push(assistant)
  activeAssistantId.value = assistant.id
  const assistantIndex = messages.value.length - 1
  const updateAssistant = (updater: (message: ChatMessage) => void) => {
    const current = messages.value[assistantIndex]
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
      onClarification: (message) => {
        updateAssistant((item) => { item.content += message })
        pushDebug(assistant, '需要用户补充确认')
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
    }, sessionId)
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
  display: block;
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

  &--draft {
    span {
      color: #ffffff;
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
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
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
  overflow: auto;
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
  padding: 14px 16px;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(16, 20, 24, 0.06);

  p {
    margin: 0;
    white-space: pre-wrap;
    line-height: 1.55;
    font-size: 14px;
  }
}

.kbc-process {
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
  display: inline-block;
  width: 8px;
  height: 18px;
  margin-left: 2px;
  vertical-align: text-bottom;
  border-radius: 3px;
  background: #111316;
  animation: kbcCaret 0.9s ease-in-out infinite;
}

.kbc-answer {
  :deep(p) {
    margin: 0 0 10px;
    line-height: 1.72;
    font-size: 14px;
  }

  :deep(ul),
  :deep(ol) {
    margin: 8px 0 10px;
    padding-left: 20px;
  }

  :deep(li) {
    margin: 4px 0;
    line-height: 1.65;
  }

  :deep(strong) {
    color: #0f1114;
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px;
    overflow: hidden;
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
}

.kbc-sources {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(20, 23, 27, 0.08);
}

.kbc-source {
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

  .kbc-send {
    width: 72px;
  }
}
</style>
