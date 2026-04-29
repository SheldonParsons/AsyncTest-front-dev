<template>
  <div class="harness-chat-page">
    <!-- Left Sidebar -->
    <aside class="chat-sidebar">
      <div class="sidebar-header">
        <button class="sidebar-back-btn" @click="goBack" title="返回">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span class="sidebar-title">Chat</span>
        <button class="sidebar-new-btn" @click="startNewChat" title="新对话">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      <div class="sidebar-history">
        <div v-if="chatSessions.length === 0" class="sidebar-empty">
          <p>暂无历史对话</p>
        </div>
        <div v-else class="sidebar-session-list">
          <div v-for="(session, idx) in chatSessions" :key="idx"
            class="sidebar-session-item"
            :class="{ 'sidebar-session-item--active': idx === activeSessionIndex }"
            @click="switchSession(idx)">
            <span class="session-label">{{ session.title || '新对话' }}</span>
            <span class="session-time">{{ session.time }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Chat Area -->
    <main class="chat-main">
      <!-- Messages -->
      <div class="chat-messages" ref="messagesContainerRef">
        <!-- Welcome state -->
        <div v-if="messages.length === 0" class="chat-welcome">
          <div class="welcome-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
              <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
              <circle cx="12" cy="17" r="1" />
              <path d="M12 14v2" />
            </svg>
          </div>
          <h2 class="welcome-title">AsyncTest Agent</h2>
          <p class="welcome-desc">有什么可以帮你的？</p>
        </div>

        <!-- Message list -->
        <div v-for="(msg, idx) in messages" :key="idx"
          class="chat-message"
          :class="[`chat-message--${msg.role}`]">
          <div class="message-avatar" v-if="msg.role === 'assistant'">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
              <circle cx="12" cy="17" r="1" />
              <path d="M12 14v2" />
            </svg>
          </div>
          <div class="message-body">
            <div class="message-content">{{ msg.content }}<span v-if="msg.role === 'assistant' && msg.streaming"
                class="typing-cursor" /></div>
          </div>
        </div>

        <!-- Scroll anchor -->
        <div ref="scrollAnchorRef" class="scroll-anchor" />
      </div>

      <!-- Input Area -->
      <div class="chat-input-area">
        <div class="chat-input-wrapper" :class="{ 'chat-input-wrapper--focused': inputFocused }">
          <textarea ref="inputRef" v-model="inputText" class="chat-input" placeholder="输入你的消息..."
            :rows="1" :disabled="isStreaming" @focus="inputFocused = true" @blur="inputFocused = false"
            @keydown="handleKeydown" @input="autoResize" />
          <button class="chat-send-btn" :class="{ 'chat-send-btn--active': canSend }" :disabled="!canSend"
            @click="sendMessage">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
        <p class="chat-input-hint">Enter 发送 · Shift+Enter 换行</p>
      </div>
    </main>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { streamHarnessSse } from '@/api/harness'

interface Message {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface ChatSession {
  title: string
  time: string
  messages: Message[]
}

const router = useRouter()

// State
const messages = ref<Message[]>([])
const inputText = ref('')
const inputFocused = ref(false)
const isStreaming = ref(false)
const messagesContainerRef = ref<HTMLElement | null>(null)
const scrollAnchorRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const chatSessions = ref<ChatSession[]>([])
const activeSessionIndex = ref(-1)

const canSend = computed(() => inputText.value.trim().length > 0 && !isStreaming.value)

// Auto-scroll to bottom
function scrollToBottom(smooth = true) {
  nextTick(() => {
    scrollAnchorRef.value?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'instant',
      block: 'end',
    })
  })
}

// Auto-resize textarea
function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

// Keyboard handling
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// Send message
async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return

  // Add user message
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''

  // Reset textarea height
  nextTick(() => {
    if (inputRef.value) inputRef.value.style.height = 'auto'
  })
  scrollToBottom()

  // Add streaming assistant placeholder
  const assistantMsg: Message = { role: 'assistant', content: '', streaming: true }
  messages.value.push(assistantMsg)
  isStreaming.value = true
  scrollToBottom()

  try {
    await streamHarnessSse('/chat', { message: text }, {
      onChunk: (content) => {
        assistantMsg.content += content
        scrollToBottom(false)
      },
      onDone: () => {
        assistantMsg.streaming = false
        isStreaming.value = false
        scrollToBottom()
        updateSessionTitle()
      },
      onError: (message) => {
        assistantMsg.content += message || '请求出错'
        assistantMsg.streaming = false
        isStreaming.value = false
        scrollToBottom()
      },
    })
  } catch (err: any) {
    assistantMsg.content = '连接失败，请确认 Django 后端已启动。'
    assistantMsg.streaming = false
    isStreaming.value = false
    scrollToBottom()
  }
}

// Session management
function updateSessionTitle() {
  if (messages.value.length === 0) return
  const firstUserMsg = messages.value.find((m) => m.role === 'user')
  const title = firstUserMsg ? firstUserMsg.content.slice(0, 30) : '新对话'
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  if (activeSessionIndex.value >= 0 && activeSessionIndex.value < chatSessions.value.length) {
    chatSessions.value[activeSessionIndex.value].title = title
    chatSessions.value[activeSessionIndex.value].time = time
    chatSessions.value[activeSessionIndex.value].messages = [...messages.value]
  } else {
    chatSessions.value.unshift({ title, time, messages: [...messages.value] })
    activeSessionIndex.value = 0
  }
}

function startNewChat() {
  if (messages.value.length > 0) {
    updateSessionTitle()
  }
  messages.value = []
  activeSessionIndex.value = -1
  isStreaming.value = false
  nextTick(() => inputRef.value?.focus())
}

function switchSession(idx: number) {
  if (idx === activeSessionIndex.value) return
  if (messages.value.length > 0 && activeSessionIndex.value === -1) {
    updateSessionTitle()
  }
  activeSessionIndex.value = idx
  messages.value = [...chatSessions.value[idx].messages]
  scrollToBottom(false)
}

function goBack() {
  router.push({ name: 'agentDashboard' })
}

// Lifecycle
onMounted(() => {
  nextTick(() => inputRef.value?.focus())
})
</script>

<style lang="scss" scoped>
// Light theme — black & white, no blue
$bg-page: #ffffff;
$bg-sidebar: #f5f5f7;
$bg-hover: #eaeaec;
$bg-active: #e3e3e6;
$bg-user-bubble: #1d1d1f;
$bg-assistant-bubble: #f0f0f2;
$bg-input: #f5f5f7;
$text-primary: #1d1d1f;
$text-secondary: rgba(0, 0, 0, 0.55);
$text-tertiary: rgba(0, 0, 0, 0.35);
$text-on-dark: #ffffff;
$border-color: rgba(0, 0, 0, 0.08);
$border-focus: rgba(0, 0, 0, 0.3);

.harness-chat-page {
  display: flex;
  height: 100vh;
  background: $bg-page;
  color: $text-primary;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial,
    sans-serif;
  overflow: hidden;
}

// ─── Sidebar ───
.chat-sidebar {
  width: 260px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  background: $bg-sidebar;
  border-right: 1px solid $border-color;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 14px 12px;
  -webkit-app-region: drag;
}

.sidebar-back-btn,
.sidebar-new-btn {
  -webkit-app-region: no-drag;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: $text-secondary;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: $bg-hover;
    color: $text-primary;
  }
}

.sidebar-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.224px;
  color: $text-primary;
}

.sidebar-history {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.sidebar-empty {
  padding: 40px 16px;
  text-align: center;

  p {
    font-size: 13px;
    color: $text-tertiary;
    margin: 0;
  }
}

.sidebar-session-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: $bg-hover;
  }

  &--active {
    background: $bg-active;
  }
}

.session-label {
  font-size: 13px;
  font-weight: 500;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.session-time {
  font-size: 11px;
  color: $text-tertiary;
  margin-left: 8px;
  flex-shrink: 0;
}

// ─── Main Chat Area ───
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: $bg-page;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 0 16px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.2);
  }
}

// Welcome
.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 60px 24px;
  text-align: center;
  opacity: 0;
  animation: fadeIn 0.5s ease 0.1s forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

.welcome-icon {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-sidebar;
  color: $text-primary;
  margin-bottom: 20px;
}

.welcome-title {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.28px;
  color: $text-primary;
}

.welcome-desc {
  margin: 12px 0 0;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: $text-secondary;
}

// Messages
.chat-message {
  display: flex;
  gap: 12px;
  padding: 8px 48px;
  animation: msgSlideIn 0.25s ease-out;

  &--user {
    justify-content: flex-end;
  }

  &--assistant {
    justify-content: flex-start;
  }
}

@keyframes msgSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: $bg-sidebar;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-primary;
  flex-shrink: 0;
  margin-top: 2px;
}

.message-body {
  max-width: 72%;
  min-width: 0;
}

.chat-message--user .message-body {
  max-width: 72%;
}

.message-content {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 15px;
  line-height: 1.6;
  letter-spacing: -0.224px;
  white-space: pre-wrap;
  word-break: break-word;

  .chat-message--user & {
    background: $bg-user-bubble;
    color: $text-on-dark;
    border-bottom-right-radius: 6px;
  }

  .chat-message--assistant & {
    background: $bg-assistant-bubble;
    color: $text-primary;
    border-bottom-left-radius: 6px;
  }
}

// Typing cursor
.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: $text-primary;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 0.8s step-end infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.scroll-anchor {
  height: 1px;
}

// ─── Input Area ───
.chat-input-area {
  padding: 0 48px 24px;
  flex-shrink: 0;
}

.chat-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 16px;
  background: $bg-input;
  border: 1px solid $border-color;
  border-radius: 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &--focused {
    border-color: $border-focus;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
  }
}

.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: $text-primary;
  font-family: inherit;
  font-size: 15px;
  line-height: 22px;
  letter-spacing: -0.224px;
  resize: none;
  max-height: 160px;
  padding: 7px 0;
  box-sizing: border-box;

  &::placeholder {
    color: $text-tertiary;
  }

  &:disabled {
    opacity: 0.5;
  }
}

.chat-send-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: $bg-hover;
  color: $text-tertiary;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: not-allowed;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &--active {
    background: $bg-user-bubble;
    color: $text-on-dark;
    cursor: pointer;

    &:hover {
      background: #000000;
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.95);
    }
  }
}

.chat-input-hint {
  margin: 8px 0 0;
  text-align: center;
  font-size: 12px;
  letter-spacing: -0.12px;
  color: $text-tertiary;
}
</style>
