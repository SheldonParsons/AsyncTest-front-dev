<template>
  <main class="vibe-shell" :class="{ 'side-collapsed': sideCollapsed }" :data-trace-audit="canViewTraceAudit ? '1' : '0'">
    <div class="window-drag" />
    <!-- 侧栏收起/展开：钉在窗口左上（mac 靠红绿灯右侧），收起后仍可见 -->
    <button
      class="side-toggle"
      :class="{ mac: isMacPlatform }"
      type="button"
      :title="sideCollapsed ? '展开侧栏' : '收起侧栏'"
      :aria-label="sideCollapsed ? '展开侧栏' : '收起侧栏'"
      @click="toggleSide"
    >
      <!-- lucide: panel-left-open / panel-left-close -->
      <svg v-if="sideCollapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="m14 9 3 3-3 3" /></svg>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="m16 15-3-3 3-3" /></svg>
    </button>
    <!-- Windows 窗口控制（mac 有原生红绿灯，不显示）：默认隐藏，hover 右上角才浮现 -->
    <div v-if="showWinControls" class="win-ctl-zone">
      <VibeWindowControls
        class="win-ctl"
        :maximized="winMaximized"
        @minimize="winControl('minimize')"
        @maximize-toggle="winControl('maximizeToggle')"
        @close="winControl('close')"
      />
    </div>
    <aside class="side">
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
              <span class="proj-kb">{{ kbStats.sections }} 个章节 · {{ kbStats.modules }} 模块</span>
            </span>
            <svg class="proj-caret" :class="{ open }" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </template>
        </AppSelect>
      </section>
      <button class="kb-browser-entry" type="button" :disabled="!vibeProject || loading" @click="openKbBrowser">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open-icon lucide-book-open"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>
        <span>原文浏览</span>
        <em>{{ kbStats.sections }} 章</em>
      </button>

      <section class="convs">
        <div class="convs-head">
          <span class="convs-title">需求对话</span>
          <button class="round-btn" type="button" title="新建对话" :disabled="sending" @click="newConversation">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>

        <div class="convs-list">
          <div
            v-for="item in sessions"
            :key="item.id"
            :class="['session-row', { active: activeSessionId === item.id }]"
          >
            <button class="session-open" type="button" @click="openSession(item.id)">
              <span class="session-ic" aria-hidden="true">
                <!-- 正在对话：灰色实心点·呼吸闪烁（motion:solid-dot-blink）；空闲：空心圆点（motion:hollow-status-dot） -->
                <svg v-if="isSessionWaiting(item.id)" class="dot-blink" width="15" height="15" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle class="dot-blink-core" cx="20" cy="20" r="7" fill="currentColor" /></svg>
                <svg v-else width="15" height="15" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6" /></svg>
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
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
          <p v-if="!sessions.length" class="muted">开始第一轮录入后，这里会出现对话记录。</p>
        </div>
      </section>

      <button class="side-user-card" type="button" @click="openVibeSettings">
        <span class="side-user-avatar avatar-container">
          <el-avatar :size="32" :src="currentUserAvatar" class="user-avatar">{{ userInitials }}</el-avatar>
          <span class="online-indicator" aria-hidden="true" />
        </span>
        <span class="side-user-main">
          <strong>{{ currentUserName }}</strong>
        </span>
      </button>

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
        <nav
          v-if="conversationRailItems.length"
          class="conversation-rail"
          aria-label="最近对话预览"
          @mouseleave="hoveredConversationRailIndex = null"
        >
          <button
            v-for="(item, index) in conversationRailItems"
            :key="item.id"
            class="conversation-rail-row"
            :class="{
              active: hoveredConversationRailIndex === null && activeConversationRailIndex === index,
              hover: hoveredConversationRailIndex === index,
              'hover-near-1': conversationRailHoverDistance(index) === 1,
              'hover-near-2': conversationRailHoverDistance(index) === 2,
              'hover-near-3': conversationRailHoverDistance(index) === 3,
            }"
            type="button"
            @mouseenter="hoveredConversationRailIndex = index"
            @focus="hoveredConversationRailIndex = index"
            @blur="hoveredConversationRailIndex = null"
            @click="jumpToConversationTurn(item.id, index)"
          >
            <span class="conversation-rail-line" aria-hidden="true" />
            <div v-if="hoveredConversationRailIndex === index" class="conversation-rail-card">
              <strong>{{ item.question }}</strong>
              <p>{{ item.answer }}</p>
            </div>
          </button>
        </nav>
        <div ref="timelineEl" class="timeline" @scroll.passive="handleTimelineScroll" @click="handleTimelineClick">
          <div v-if="!events.length" class="empty">
            <!-- 鲸鱼游动 → 知识库 logo（alpha webm，播一次停在 logo；点击重播） -->
            <video
              class="empty-video"
              :src="whaleIntroUrl"
              autoplay
              muted
              playsinline
              preload="auto"
              disablepictureinpicture
              aria-hidden="true"
              @loadeddata="setIntroRate"
              @click="replayIntro"
            />
            <strong>从一句话开始录入需求</strong>
            <span>直接描述需求、提出问题或补充说明，系统会自动判断本轮应该回答、整理需求，还是两者一起处理。</span>
            <div class="empty-hints">
              <button
                v-for="hint in EMPTY_HINTS"
                :key="hint"
                class="empty-hint"
                type="button"
                :disabled="sending"
                @click="useHint(hint)"
              >
                {{ hint }}
              </button>
            </div>
          </div>
          <article
            v-for="event in events"
            :id="`timeline-event-${event.id}`"
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
                :awaiting="threadAwaiting(event)"
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
                :running="false"
                :awaiting="isPendingClarification(event)"
                :duration-ms="eventProcessDuration(event)"
              /><!-- 0703:挂反问时后端已收工,是"等你选择"不是"正在思考"(两分支口径统一) -->
              <div v-if="event.role !== 'assistant'" class="event-top">
                <span class="role">{{ eventRoleLabel(event) }}</span>
                <time v-if="event.created_at">{{ formatTime(event.created_at) }}</time>
              </div>
              <div
                v-if="event.role !== 'assistant'"
                class="user-message-wrap"
                :class="{ expanded: isUserMessageExpanded(event.id) }"
              >
                <div
                  v-if="eventAttachments(event).length"
                  class="user-attachment-list"
                  :class="{ expanded: areAttachmentsExpanded(event.id) }"
                  aria-label="本轮附件"
                >
                  <button
                    v-for="file in visibleEventAttachments(event)"
                    :key="attachmentKey(file)"
                    class="user-attachment-chip"
                    type="button"
                    :title="attachmentName(file)"
                    @click.stop="downloadAttachment(file)"
                  >
                    <span class="user-attachment-icon" :class="{ markdown: isMarkdownAttachment(file) }" aria-hidden="true">
                      <svg v-if="isMarkdownAttachment(file)" viewBox="0 0 32 32" fill="none">
                        <path d="M7 9.5H25C26.1 9.5 27 10.4 27 11.5V20.5C27 21.6 26.1 22.5 25 22.5H7C5.9 22.5 5 21.6 5 20.5V11.5C5 10.4 5.9 9.5 7 9.5Z" fill="rgba(255,255,255,.18)" stroke="currentColor" stroke-width="1.6"/>
                        <path d="M9 19V13L12 16.7L15 13V19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19 13V18.5M19 18.5L16.9 16.4M19 18.5L21.1 16.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M23.5 13V19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" fill="none"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 2v5h5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 13h7M8.5 17h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                    </span>
                    <span class="user-attachment-main">
                      <span class="user-attachment-name">{{ displayAttachmentName(file) }}</span>
                      <span class="user-attachment-meta">{{ attachmentMeta(file) }}</span>
                    </span>
                  </button>
                  <button
                    v-if="hiddenAttachmentCount(event) > 0"
                    class="user-attachment-more"
                    type="button"
                    @click.stop="toggleAttachmentsExpanded(event.id)"
                  >
                    {{ areAttachmentsExpanded(event.id) ? '收起' : `+${hiddenAttachmentCount(event)}` }}
                  </button>
                </div>
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
                    v-if="streamingProcess.steps.length || procRunning"
                    :steps="streamingProcess.steps"
                    :running="procRunning"
                    :duration-ms="procDurationMs"
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
              v-if="streamingProcess.steps.length || procRunning"
              :steps="streamingProcess.steps"
              :running="procRunning"
              :duration-ms="procDurationMs"
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
            :model-options="composerModelOptions"
            :model-value-id="selectedLlmProviderId"
            :model-disabled="modelConfigLoading"
            @model-open="refreshComposerModels"
            @model-change="handleComposerModelChange"
            @send="onComposerSend"
            @answer="onComposerAnswer"
            @stop="stopFoundationTurn"
          />
        </footer>
      </section>
      </section>
    </section>

  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import whaleIntroUrl from './assets/whale-intro.webm'
import VibeWindowControls from './components/VibeWindowControls.vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ApiGetJoinProjects } from '@/api/project/index'
import AppSelect from '@/components/common/select/AppSelect.vue'
import ProcessDisclosure from './components/ProcessDisclosure.vue'
import ScrollDownIcon from './components/icons/ScrollDownIcon.vue'
import AssistantActions from './components/AssistantActions.vue'
import SourceChips from './components/SourceChips.vue'
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
  getVibeCapabilities,
  getVibeProjectByAsyncProject,
  getVibeProjectsByAsyncProjects,
  initVibeProject,
  getVibeLLMRuntimeConfig,
  listVibeEvents,
  listVibeSessions,
  listVibeLLMProviders,
  listFoundationRunningTurns,
  streamFoundationTurn,
  cancelFoundationTurn,
  getFoundationKnowledgeStatsMany,
  updateVibeProject,
  updateVibeSession,
  type FoundationRunningTurn,
  type VibeAttachment,
  type VibeCapabilityUser,
  type VibeEvent,
  type VibeLLMProviderConfig,
  type VibeLLMRuntimeConfig,
  type VibeProject,
  type VibeSession,
} from '../api'

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
const vibeCapabilities = ref<Record<string, boolean>>({})
const canViewTraceAudit = computed(() => !!vibeCapabilities.value.trace_audit)
const currentUser = ref<VibeCapabilityUser | null>(null)
const currentUserName = computed(() => String(currentUser.value?.display_name || currentUser.value?.nick_name || currentUser.value?.username || '用户'))
const currentUserAvatar = computed(() => String(currentUser.value?.avatar_url || ''))
const llmProviders = ref<VibeLLMProviderConfig[]>([])
const llmRuntime = ref<VibeLLMRuntimeConfig | null>(null)
const selectedLlmProviderId = ref('')
const modelConfigLoading = ref(false)
const composerModelOptions = computed(() => llmProviders.value
  .filter((item) => item.enabled !== false)
  .map((item) => ({
    value: item.id,
    label: item.name || 'DeepSeek',
    hint: item.is_system_default ? '系统默认' : (item.source === 'mine' ? '个人模型' : ''),
  })))
const userInitials = computed(() => {
  const text = currentUserName.value.trim() || 'U'
  const letters = Array.from(text).slice(0, 2).join('')
  return /^[a-z0-9]+$/i.test(letters) ? letters.toUpperCase() : letters
})
// 左栏知识库读数按 vibe 工程 UUID 隔离；先批量解析 async 项目，再一次取第四代章节/模块数。
const asyncToVibe = reactive<Record<string, string>>({})                                 // async 项目 id -> vibe UUID
const projectStatsMap = reactive<Record<string, { sections: number; modules: number }>>({}) // 按 vibe UUID 存读数
async function loadModelConfig(sessionId = activeSessionId.value, opts: { silent?: boolean } = {}) {
  if (!opts.silent) modelConfigLoading.value = true
  try {
    const [providerPayload, runtime] = await Promise.all([
      listVibeLLMProviders(),
      getVibeLLMRuntimeConfig(sessionId || undefined),
    ])
    const providers = (providerPayload.providers || []).filter((item) => item.enabled !== false)
    llmProviders.value = providers
    llmRuntime.value = runtime
    const session = sessions.value.find(item => item.id === sessionId)
    const candidate = session?.llm_provider_id || String(runtime.provider?.id || '')
    selectedLlmProviderId.value = providers.some((item) => item.id === candidate) ? candidate : (providers[0]?.id || '')
  } finally {
    if (!opts.silent) modelConfigLoading.value = false
  }
}

function applySessionModel(sessionId: string, providerId: string) {
  sessions.value = sessions.value.map(item => item.id === sessionId ? { ...item, llm_provider_id: providerId } : item)
}

async function refreshComposerModels() {
  await loadModelConfig(activeSessionId.value, { silent: true })
}

async function ensureComposerModelUsable() {
  try {
    const providerPayload = await listVibeLLMProviders()
    const providers = (providerPayload.providers || []).filter((item) => item.enabled !== false)
    llmProviders.value = providers
    const selected = selectedLlmProviderId.value
    if (selected && providers.some((item) => item.id === selected)) {
      if (activeSessionId.value) {
        const current = sessions.value.find((item) => item.id === activeSessionId.value)
        if (current?.llm_provider_id !== selected) {
          const updated = await updateVibeSession(activeSessionId.value, { llm_provider_id: selected })
          applySessionModel(activeSessionId.value, updated.llm_provider_id || selected)
        }
      }
      return true
    }
    if (!selected && providers[0]?.id) {
      selectedLlmProviderId.value = providers[0].id
      if (activeSessionId.value) {
        const updated = await updateVibeSession(activeSessionId.value, { llm_provider_id: providers[0].id })
        applySessionModel(activeSessionId.value, updated.llm_provider_id || providers[0].id)
      }
      return true
    }
    ElMessage.error(selected ? '当前选择的模型不存在或已被禁用，请重新选择模型。' : '暂无可用模型，请先在设置中添加模型或等待管理员启用系统模型。')
    return false
  } catch (error: any) {
    ElMessage.error(`模型检查失败：${error?.message || String(error)}`)
    return false
  }
}

async function handleComposerModelChange(providerId: string) {
  selectedLlmProviderId.value = providerId
  if (!activeSessionId.value) return
  try {
    const updated = await updateVibeSession(activeSessionId.value, { llm_provider_id: providerId })
    applySessionModel(activeSessionId.value, updated.llm_provider_id || providerId)
    await loadModelConfig(activeSessionId.value)
  } catch (error: any) {
    ElMessage.error(`模型切换失败：${error?.message || String(error)}`)
    await loadModelConfig(activeSessionId.value)
  }
}

async function loadKbStats() {
  // 当前项目的 UUID 已知（selectProject 解析过），先登记，项目卡/概览即时有数
  const curAid = selectedProjectId.value != null ? String(selectedProjectId.value) : ''
  if (curAid && vibeProject.value?.id) asyncToVibe[curAid] = String(vibeProject.value.id)

  // 其余 async 项目一次性批量解析成 vibe UUID，避免进入主对话时按项目数量打满请求。
  const unresolvedIds = Array.from(new Set((projects.value || [])
    .map((p: any) => Number(p.id))
    .filter((id) => Number.isFinite(id) && !asyncToVibe[String(id)])))
  if (unresolvedIds.length) {
    try {
      const payload = await getVibeProjectsByAsyncProjects(unresolvedIds)
      ;(payload.items || []).forEach((vp) => {
        if (vp?.id) asyncToVibe[String(vp.project_id)] = String(vp.id)
      })
    } catch { /* 未初始化项目继续按 0 段处理，概览不阻塞主流程 */ }
  }

  const uuids = Array.from(new Set(Object.values(asyncToVibe))).filter(Boolean)
  if (!uuids.length) return
  try {
    const payload = await getFoundationKnowledgeStatsMany(uuids)
    uuids.forEach((u) => {
      const s = payload.items?.[u]
      projectStatsMap[u] = { sections: Number(s?.sections || 0), modules: Number(s?.modules || 0) }
    })
  } catch { /* 概览读取失败不阻塞主流程 */ }
}
// 当前项目读数（项目卡 + 底部概览卡共用）：按 vibe UUID 取
const kbStats = computed(() => {
  const u = vibeProject.value?.id ? String(vibeProject.value.id) : (asyncToVibe[String(selectedProjectId.value ?? '')] || '')
  return (u && projectStatsMap[u]) || { sections: 0, modules: 0 }
})
// 对话行"等待回复中"：本轮 turn 跑在活动会话上，故活动会话 + 后端忙 = 等待
function isSessionWaiting(id: string): boolean {
  return ((foundationBusy.value || preparingSend.value) && id === activeSessionId.value)
    || runningSessionIds.value.includes(id)
}
const preparingSend = ref(false)
const sendingSessionIds = ref<string[]>([])
const draft = ref('')
const liveLogs = ref<{ id: string; type: string; message: string }[]>([])
// foundation 新管线（知识库前端唯一管线，不再有灰度开关）
const foundationBusy = ref(false)
const runningSessionIds = ref<string[]>([])
const recoveredTurnId = ref('')
let runningTurnPollTimer: ReturnType<typeof setTimeout> | null = null
// T26 停止：本轮后端令牌 id（turn_started 事件带来）+ 防连点
const activeTurnId = ref('')
const cancelRequested = ref(false)

async function stopFoundationTurn() {
  if (!activeTurnId.value || cancelRequested.value) return
  cancelRequested.value = true
  try {
    await cancelFoundationTurn(activeTurnId.value)
    // 不 abort 流：后端置位后会自己发 cancelled + 已停止回执 + done 正常收尾
  } catch { cancelRequested.value = false /* 失败允许再点 */ }
}
// 0704 体验修复:"已处理"计时与"正在思考"由【整轮请求生命周期】驱动,不再听后端 process_done。
// 根因:后端 pe.done 在最终 answer 之前入队,done 之后还有 recall 兜底/安全网录入/收敛/持久化
// (都可能是秒级 LLM 调用)——旧逻辑一收到 process_done 就冻结成"已处理 Xs",页面既不在思考又没结束。
const streamingElapsedMs = ref(0)
let _elapsedTimer: ReturnType<typeof setInterval> | null = null
function startElapsedTicker(startedAt: number) {
  stopElapsedTicker()
  streamingElapsedMs.value = 0
  _elapsedTimer = setInterval(() => { streamingElapsedMs.value = Date.now() - startedAt }, 500)
}
function stopElapsedTicker() {
  if (_elapsedTimer) { clearInterval(_elapsedTimer); _elapsedTimer = null }
}
// 思考态=整轮在途(SSE 没关就没结束);计时=在途时前端秒表、结束后用最终值。
const procRunning = computed(() => foundationBusy.value || streamingProcess.status === 'running')
const procDurationMs = computed(() =>
  foundationBusy.value ? streamingElapsedMs.value : streamingProcess.durationMs)
const processExpanded = ref(false)
const streamingProcess = createProcessState()
// 历史事件渲染（eventDisplayContent）仍需读取方案包状态展示，保留只读覆盖表
const packageStatusOverrides = ref<Record<string, string>>({})
const sessionTitleOverrides = ref<Record<string, string>>({})
const expandedUserMessageIds = ref<string[]>([])
const expandedAttachmentEventIds = ref<string[]>([])
const deletingSessionId = ref('')
const streamingAssistantContent = ref('')
// assistant event_saved 到达后，正式事件接管过程与答案渲染；避免临时思考块落到答案下方。
const streamingAssistantEventId = ref('')
const streamingSources = ref<any[]>([])        // T1 溯源：本轮答案的来源段（流式渲染用）
const streamingVerification = ref<any | null>(null) // T8 核验：{checked, issues, clean}
const streamingContinuationParentId = ref('')
const hoveredConversationRailIndex = ref<number | null>(null)
const activeConversationEventId = ref('')
const timelineEl = ref<HTMLElement | null>(null)
const processBodyEl = ref<HTMLElement | null>(null)
const draftEl = ref<HTMLTextAreaElement | null>(null)
const MAX_LIVE_LOGS = 80
const MAX_CONVERSATION_RAIL_ITEMS = 40
let conversationRailRaf = 0
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
    // 下拉里逐项目显示第四代章节数 + 模块数（拿不到时退回原描述）
    hint: st ? `${st.sections} 章 · ${st.modules} 模块` : (project.description || project.owner_name || project.creator_name || ''),
  }
}))
const activeSessionSending = computed(() =>
  !!activeSessionId.value && sendingSessionIds.value.includes(activeSessionId.value),
)
const conversationRailItems = computed(() => buildConversationRailItems())
const activeConversationRailIndex = computed(() => {
  const items = conversationRailItems.value
  if (!items.length) return -1
  const index = items.findIndex(item => item.id === activeConversationEventId.value)
  return index >= 0 ? index : Math.max(0, items.length - 1)
})
const sending = computed(() => preparingSend.value || foundationBusy.value || sendingSessionIds.value.length > 0)
const composerStatusText = computed(() => {
  if (preparingSend.value) return '正在创建对话…'
  return ''  // 0704 用户定:输入框下不再显示"正在思考/收尾"——状态由过程区"已处理 Xs"+按钮■表达
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

  // clarification.v2 的所有交互语义均由后端提供。前端只按顺序渲染，
  // 并回传 option_id 或补充文本；禁止在这里补标题、说明、取消或 placeholder。
  if (raw?.schema === 'clarification.v2') {
    const options = Array.isArray(raw.options) ? raw.options : []
    const input = raw.input && typeof raw.input === 'object' ? raw.input : {}
    const hasDiff = raw.old_body != null && raw.new_body != null
      && (String(raw.old_body).length > 0 || String(raw.new_body).length > 0)
    return {
      title: String(raw.title),
      description: String(raw.description),
      ...(hasDiff ? { diff: { breadcrumb: '现行知识文档', oldBody: raw.old_body, newBody: raw.new_body } } : {}),
      items: [
        ...options.map((item: any) => ({
          type: 'choice' as const,
          label: String(item.label),
          description: String(item.description || item.effect),
          value: `__CLARIFICATION_OPTION__:${String(item.id)}`,
        })),
        ...(input.enabled ? [{
          type: 'input' as const,
          placeholder: String(input.placeholder),
          showSkip: false,
          submitLabel: String(input.submit_label),
        }] : []),
      ],
    }
  }

  // 第四代整体变更确认：小文档显示完整 diff；大文件只显示摘要，提交只带 confirmation_id。
  if (kind === 'knowledge_change') {
    const hasDiff = raw.old_body != null && raw.new_body != null
      && (String(raw.old_body).length > 0 || String(raw.new_body).length > 0)
    return {
      title: c.question,
      description: raw.summary || (raw.preview_truncated
        ? '变更范围较大，已完成服务端校验；确认后生成新的现行文档版本。'
        : '查看整体文档变更，确认后生成新的现行文档版本。'),
      ...(hasDiff ? { diff: { breadcrumb: '现行知识文档', oldBody: raw.old_body, newBody: raw.new_body } } : {}),
      items: [
        { type: 'choice' as const, label: '就这么改', value: '__APPLY_EDIT__' },
        { type: 'choice' as const, label: '先不改', value: '__CANCEL_EDIT__' },
        { type: 'input' as const, placeholder: '或者说说要怎么改…' },
      ],
    }
  }
  if (kind === 'empty_library_change') {
    const canInsert = !!String(raw.insert_request || '').trim()
    return {
      title: c.question,
      description: canInsert
        ? '当前项目没有可更新的原文。只有确认后，目标内容才会作为新知识写入。'
        : '当前项目没有可操作的现行知识，请切换项目或取消。',
      items: [
        ...(canInsert ? [{ type: 'choice' as const, label: '作为新知识录入', value: '__CREATE_EMPTY_LIBRARY_KNOWLEDGE__' }] : []),
        { type: 'choice' as const, label: '取消', value: '__CANCEL_EDIT__' },
        { type: 'input' as const, placeholder: '或者重新说明要处理的项目或内容…' },
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
  // ②b 带选项的通用反问（0703）：脑自带候选答案（如"复查刚才那处，还是别处也删"）→ 按脑给的选项渲染，
  // 选项文本原样回传（走默认续跑同一思考路径）。修"问复查/删别处却弹『记进知识库』模板"的答非所问。
  if (kind === 'choices' && Array.isArray(raw.options) && raw.options.length) {
    return {
      title: c.question,
      description: '选一个，我就按你的意思处理',
      items: [
        ...raw.options.map((o: string) => ({ type: 'choice' as const, label: o, value: o })),
        // input_hint(0703):脑需要用户打字补充时,给输入框写提示语,而不是造"其他/手动输入"假选项
        { type: 'input' as const, placeholder: raw.input_hint || '或者告诉我该怎么处理…' },
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
    // 可选连锁候选仍允许恢复到输入区处理，但不会触发消息头“等你选择”。
    clarificationActive.value = q
      ? { question: q, raw: clar?.raw, pending: Array.isArray(clar?.pending) ? clar.pending : [] }
      : null
  } else {
    clarificationActive.value = null
  }
}
const streamingTurnVisible = computed(() =>
  !streamingAssistantEventId.value
  && (
    !!streamingAssistantContent.value
    || procRunning.value
    || streamingProcess.steps.length > 0
  ),
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

// ===== 侧栏收起/展开：给主对话区让空间，状态记住（下次打开保持） =====
const SIDE_COLLAPSED_KEY = 'vibe_kb_side_collapsed'
const sideCollapsed = ref(localStorage.getItem(SIDE_COLLAPSED_KEY) === '1')
const isMacPlatform = window.electronAPI?.platform === 'darwin'

function toggleSide() {
  sideCollapsed.value = !sideCollapsed.value
  localStorage.setItem(SIDE_COLLAPSED_KEY, sideCollapsed.value ? '1' : '0')
}

// ===== Windows 窗口控制：关闭 / 最大化切换 / 最小化 =====
// Vibe 窗口的控件默认 hover 才出现，所以在 Electron 全平台开放，避免 mac 自定义窗口缺少控制入口。
// windowKey 随 route.query 传递（dashboard 开 vibe 窗口时带 vibe-workbench，workbench→knowledge 跳转保留 query）。
const route = useRoute()
const router = useRouter()
const showWinControls = computed(() => !!window.electronAPI)
const winKey = computed(() => (route.query.windowKey as string) || 'vibe-workbench')

function winControl(action: 'minimize' | 'maximizeToggle' | 'close') {
  window.electronAPI?.wm?.control(winKey.value, action)
}

function openKbBrowser() {
  router.push({ name: 'vibeKnowledgeBrowser', query: { ...route.query, project: String(selectedProjectId.value || '') } })
}

function openVibeSettings() {
  router.push({ name: 'vibeSettings', query: { ...route.query, project: String(selectedProjectId.value || '') } })
}

// 最大化状态：初始查一次 + 订阅主进程 wm:maximize-state 推送（覆盖按钮/快捷键/拖顶等一切途径），
// 据此在 最大化 ⇄ 还原 图标间切换。
const winMaximized = ref(false)
let offMaximizeState: (() => void) | null = null

function trackMaximizeState() {
  if (!window.electronAPI) return
  window.electronAPI.wm?.isMaximized?.(winKey.value)
    ?.then((v: boolean) => { winMaximized.value = !!v })
    ?.catch(() => {})
  offMaximizeState = window.electronAPI.on?.('wm:maximize-state', (_event: any, payload: { key?: string; maximized?: boolean } = {}) => {
    if (payload?.key !== winKey.value) return
    winMaximized.value = !!payload.maximized
  }) || null
}

onBeforeUnmount(() => {
  offMaximizeState?.()
  stopElapsedTicker()
  stopRunningTurnPolling()
  if (conversationRailRaf) cancelAnimationFrame(conversationRailRaf)
})

// 空态示例：三种典型输入（录入一句 / 检索提问 / 盘点），点一下填进输入框，不自动发送
const EMPTY_HINTS = ['积分永久有效', '退款期限是多久？', '盘点一下知识库里都有什么']

function useHint(text: string) {
  if (sending.value) return
  draft.value = text
  resizeDraft()
}

async function loadVibeCapabilities() {
  try {
    const res = await getVibeCapabilities()
    vibeCapabilities.value = res?.capabilities || {}
    currentUser.value = res?.user || null
  } catch {
    vibeCapabilities.value = {}
    currentUser.value = null
  }
}

// 播放速度（原素材 3s 偏慢，2 = 加速一倍）
const INTRO_PLAYBACK_RATE = 2

function setIntroRate(event: Event) {
  const el = event.currentTarget as HTMLVideoElement
  if (el) el.playbackRate = INTRO_PLAYBACK_RATE
}

// 动画播完停在 logo；点击可重播
function replayIntro(event: MouseEvent) {
  const el = event.currentTarget as HTMLVideoElement
  if (!el || !el.ended) return
  el.currentTime = 0
  el.play().catch(() => {})
}

onMounted(() => { bootstrap(); loadVibeCapabilities(); trackMaximizeState() })

watch(
  () => [events.value.length, streamingAssistantContent.value],
  async () => { await nextTick(updateActiveConversationRail) },
)

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
  await loadModelConfig(activeSessionId.value).catch(() => {})
  await refreshProjectRunningTurns()
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
  const currentSession = sessions.value.find(item => item.id === sessionId)
  selectedLlmProviderId.value = currentSession?.llm_provider_id || selectedLlmProviderId.value
  await loadModelConfig(sessionId).catch(() => {})
  events.value = sortEvents(await listVibeEvents(sessionId))
  restoreClarificationFromEvents()  // #4：进会话时若有未答反问 → 还原选项框
  await recoverRunningTurnForSession(sessionId)
  await scrollBottom()
}

function stopRunningTurnPolling() {
  if (runningTurnPollTimer) {
    clearTimeout(runningTurnPollTimer)
    runningTurnPollTimer = null
  }
}

function scheduleRunningTurnPolling(sessionId: string) {
  stopRunningTurnPolling()
  if (!sessionId) return
  runningTurnPollTimer = setTimeout(() => {
    recoverRunningTurnForSession(sessionId).catch(() => {})
  }, 900)
}

function setSessionRunning(sessionId: string, running: boolean) {
  if (!sessionId) return
  const next = new Set(runningSessionIds.value)
  if (running) next.add(sessionId)
  else next.delete(sessionId)
  runningSessionIds.value = Array.from(next)
}

async function refreshProjectRunningTurns() {
  if (!vibeProject.value?.id) {
    runningSessionIds.value = []
    return
  }
  try {
    const res = await listFoundationRunningTurns({ project: String(vibeProject.value.id) })
    runningSessionIds.value = (res.items || []).map(item => String(item.session_id || '')).filter(Boolean)
  } catch {
    runningSessionIds.value = []
  }
}

function replayRunningTurn(turn: FoundationRunningTurn) {
  const turnId = String(turn.turn_id || '')
  const sessionId = String(turn.session_id || '')
  if (!turnId || !sessionId || activeSessionId.value !== sessionId) return
  const startedAt = Number(turn.started_at || 0) > 0 ? Number(turn.started_at) * 1000 : Date.now()
  if (recoveredTurnId.value !== turnId) {
    recoveredTurnId.value = turnId
    startElapsedTicker(startedAt)
  }
  foundationBusy.value = true
  activeTurnId.value = turnId
  cancelRequested.value = false
  resetProcessState(streamingProcess)
  streamingProcess.status = 'running'
  streamingAssistantEventId.value = ''
  streamingAssistantContent.value = ''
  streamingSources.value = []
  streamingVerification.value = null

  const answers: string[] = []
  let answerStreamText = ''
  let answerStreamDoneText = ''
  for (const event of turn.events || []) {
    const type = String(event?.type || '')
    if (type.startsWith('process_')) {
      consumeProcessEvent(streamingProcess, event)
      continue
    }
    switch (type) {
      case 'event_saved': {
        const saved = event.event as VibeEvent
        if (event.role === 'user') {
          const parentId = String((saved as any)?.meta?.parent_event_id || '')
          if (parentId) streamingContinuationParentId.value = parentId
        } else if (event.role === 'assistant') {
          streamingAssistantEventId.value = String(saved?.id || '')
          streamingAssistantContent.value = ''
          streamingSources.value = []
          streamingVerification.value = null
        }
        upsertEvent(saved)
        break
      }
      case 'turn_started':
        activeTurnId.value = String(event.turn_id || turnId)
        break
      case 'intent':
        fndPushStep(intentStepLabel((event.actions || []).map(String), '', undefined))
        break
      case 'stage':
        fndPushStep(String(event.message || ''))
        break
      case 'answer_start':
        answerStreamText = ''
        answerStreamDoneText = ''
        streamingAssistantContent.value = ''
        break
      case 'answer_delta':
        answerStreamText += String(event.delta || '')
        streamingAssistantContent.value = answerStreamText
        break
      case 'answer_done':
        answerStreamDoneText = answerStreamText
        if (answerStreamDoneText) streamingAssistantContent.value = answerStreamDoneText
        break
      case 'answer': {
        const text = String(event.text || '')
        if (text && answers[answers.length - 1] !== text) answers.push(text)
        answerStreamDoneText = text || answerStreamDoneText
        streamingAssistantContent.value = answers.join('\n\n')
        break
      }
      case 'sources':
        streamingSources.value = Array.isArray(event.items) ? event.items : []
        break
      case 'verification':
        streamingVerification.value = {
          checked: !!event.checked,
          clean: event.clean != null ? !!event.clean : !(event.issues && event.issues.length),
          issues: Array.isArray(event.issues) ? event.issues.map(String) : [],
        }
        break
      case 'clarification': {
        const q = String(event.question || '').trim()
        if (q) clarificationActive.value = {
          question: q,
          raw: event.raw,
          pending: Array.isArray(event.pending) ? event.pending : [],
        }
        break
      }
      case 'done':
        streamingProcess.status = 'done'
        break
      default:
        break
    }
  }
}

async function recoverRunningTurnForSession(sessionId: string) {
  if (!sessionId || !vibeProject.value?.id) return
  let turn: FoundationRunningTurn | null = null
  try {
    const res = await listFoundationRunningTurns({ project: String(vibeProject.value.id), session_id: sessionId })
    turn = (res.items || [])[0] || null
  } catch {
    turn = null
  }
  if (!turn) {
    setSessionRunning(sessionId, false)
    if (activeSessionId.value === sessionId && recoveredTurnId.value) {
      stopElapsedTicker()
      activeTurnId.value = ''
      recoveredTurnId.value = ''
      foundationBusy.value = false
      streamingAssistantEventId.value = ''
      clearStreamingAssistant()
      resetProcessState(streamingProcess)
      events.value = sortEvents(await listVibeEvents(sessionId).catch(() => events.value))
      restoreClarificationFromEvents()
    }
    return
  }
  setSessionRunning(sessionId, true)
  replayRunningTurn(turn)
  if (turn.done || turn.failed) {
    setSessionRunning(sessionId, false)
    stopElapsedTicker()
    activeTurnId.value = ''
    recoveredTurnId.value = ''
    foundationBusy.value = false
    streamingAssistantEventId.value = ''
    clearStreamingAssistant()
    resetProcessState(streamingProcess)
    events.value = sortEvents(await listVibeEvents(sessionId).catch(() => events.value))
    restoreClarificationFromEvents()
    await scrollBottomIfFollowing()
    return
  }
  scheduleRunningTurnPolling(sessionId)
  await scrollBottomIfFollowing()
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
  try {
    await ElMessageBox.confirm('删除后这个会话不会再出现在列表中。', '删除会话？', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      distinguishCancelAndClose: true,
    })
  } catch {
    return
  }
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
  const session = await createVibeSession(vibeProject.value.id, {
    title: '新的需求对话',
    llm_provider_id: selectedLlmProviderId.value || undefined,
  })
  activeSessionId.value = session.id
  selectedLlmProviderId.value = session.llm_provider_id || selectedLlmProviderId.value
  await refreshState()
  if (!sessions.value.some(item => item.id === session.id)) {
    sessions.value.unshift(session)
  }
  return session.id
}

async function send() {
  await sendFoundationTurn()
}

async function prepareComposerAttachments(files: File[]): Promise<VibeAttachment[]> {
  const items: VibeAttachment[] = []
  for (const [index, file] of files.entries()) {
    let content = ''
    try {
      content = await file.text()
    } catch {
      content = ''
    }
    items.push({
      id: `${Date.now()}-${index}-${file.name}-${file.size}`,
      name: file.name,
      filename: file.name,
      mime: file.type || 'text/markdown',
      size: file.size,
      chars: content.length,
      kind: 'document',
      content,
      text: content,
    })
  }
  return items
}

// 前端只提交输入框和完整附件批次，不通过关键词决定录入/总结/问答。
// 输入框是目的轴心，后端目标计划是唯一语义权威。
async function onComposerSend({ text, files }: { text: string; files: File[] }) {
  const base = (text || '').trim()
  const fileList = files || []
  if (sending.value) return
  const attachments = fileList.length ? await prepareComposerAttachments(fileList) : []

  const combined = base || (attachments.length
    ? `我上传了${attachments.length > 1 ? `${attachments.length} 个` : '一个'}文件：${attachments.map((item) => attachmentName(item)).join('、')}`
    : '')
  if (!combined) return
  draft.value = ''
  await sendFoundationTurn(combined, {
    attachments,
    filename: attachments.map((item) => attachmentName(item)).filter(Boolean).join('、'),
  })
}

// 询问模式（clarification）选项被选/提交：把答案【续跑同一思考】发出去（空=跳过，仅收起反问）。
// 关键：先取 pending（挂起草稿），再清反问；带 seedMessages 回传后端 → 接着上一轮思路想，不另起新轮。
async function onComposerAnswer(value: string) {
  const c = clarificationActive.value
  const raw: any = c?.raw
  const kind = raw && typeof raw === 'object' ? raw.kind : null
  if (raw?.schema === 'clarification.v2') {
    const parentId = lastClarificationAssistantId()
    const optionPrefix = '__CLARIFICATION_OPTION__:'
    clarificationActive.value = null
    if (value.startsWith(optionPrefix)) {
      const optionId = value.slice(optionPrefix.length)
      const selected = (Array.isArray(raw.options) ? raw.options : [])
        .find((item: any) => String(item?.id || '') === optionId)
      if (!selected || sending.value) return
      await sendFoundationTurn(String(selected.label || ''), {
        continuationParentId: parentId,
        clarificationResponse: { type: 'option', option_id: optionId },
      })
      return
    }
    const inputText = String(value || '').trim()
    if (!inputText || sending.value) return
    await sendFoundationTurn(inputText, {
      continuationParentId: parentId,
      clarificationResponse: { type: 'input', text: inputText },
    })
    return
  }

  if (kind === 'empty_library_change') {
    const parentId = lastClarificationAssistantId()
    clarificationActive.value = null
    if (value === '__CANCEL_EDIT__' || value === '__SKIP__') {
      await sendFoundationTurn('取消这次操作', { clarificationCancel: true, continuationParentId: parentId })
      return
    }
    if (value === '__CREATE_EMPTY_LIBRARY_KNOWLEDGE__') {
      const insertRequest = String(raw.insert_request || '').trim()
      if (insertRequest && !sending.value) {
        await sendFoundationTurn(insertRequest, { continuationParentId: parentId })
      }
      return
    }
    const vv = (value || '').trim()
    if (vv && !sending.value) await sendFoundationTurn(vv)
    return
  }

  // 第四代确认只回传不可伪造的服务端 confirmation_id，预览正文不参与提交。
  if (kind === 'knowledge_change') {
    const parentId = lastClarificationAssistantId()  // 在清空前取：让"确认+已更新"挂到反问之下，合成一条思考
    clarificationActive.value = null
    if (value === '__CANCEL_EDIT__' || value === '__SKIP__') {
      await sendFoundationTurn('取消这次操作', { clarificationCancel: true, continuationParentId: parentId })
      return
    }
    if (value === '__APPLY_EDIT__') {
      if (sending.value) return
      await sendFoundationTurn('就这么改', {
        applyEdit: { kind: 'knowledge_change', confirmation_id: raw.confirmation_id },
        continuationParentId: parentId,
      })
      return
    }
    const vv = (value || '').trim()
    if (vv && !sending.value) await sendFoundationTurn(vv)  // 重新说 = 一条新的请求
    return
  }

  // 开放式反问（改原文没定准）：取消/跳过 → 收起不动；说得更具体 → 当作一条新的修改请求重试。
  if (kind === 'ask') {
    const parentId = lastClarificationAssistantId()
    clarificationActive.value = null
    const vv = (value || '').trim()
    if (!vv || vv === '__CANCEL_EDIT__' || vv === '__SKIP__') {
      await sendFoundationTurn('取消这次操作', { clarificationCancel: true, continuationParentId: parentId })
      return
    }
    if (!sending.value) await sendFoundationTurn(vv)
    return
  }

  const seed = c?.pending
  // 续跑挂到"反问那条 assistant"之下 → 渲染成同一条思考。反问 = 当前最后一条 assistant 事件。
  const parentId = lastClarificationAssistantId()
  clarificationActive.value = null
  if (value === '__SKIP__') {
    await sendFoundationTurn('取消这次操作', {
      clarificationCancel: true,
      continuationParentId: parentId,
    })
    return
  }
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


function fndSyntheticEvent(role: 'user' | 'assistant', content: string, mode: string, meta: Record<string, any> = {}, attachments: VibeAttachment[] = []): VibeEvent {
  return {
    id: `fnd-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    attachments,
    created_at: new Date().toISOString(),
    mode,
    meta: { foundation: true, ...meta },
  } as unknown as VibeEvent
}

function attachmentName(file: Partial<VibeAttachment> | any) {
  return String(file?.name || file?.filename || '未命名文件')
}

function isMarkdownAttachment(file: Partial<VibeAttachment> | any) {
  const name = attachmentName(file).toLowerCase()
  const mime = String(file?.mime || '').toLowerCase()
  return mime.includes('markdown') || name.endsWith('.md') || name.endsWith('.markdown')
}

function displayAttachmentName(file: Partial<VibeAttachment> | any) {
  const name = attachmentName(file)
  if (name.length <= 34) return name
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 && name.length - dot <= 10 ? name.slice(dot) : ''
  const base = ext ? name.slice(0, dot) : name
  const head = base.slice(0, 16)
  const tail = base.slice(Math.max(16, base.length - 10))
  return `${head}...${tail}${ext}`
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

function eventAttachments(event: Partial<VibeEvent> | any): VibeAttachment[] {
  return Array.isArray(event?.attachments) ? event.attachments : []
}

const COLLAPSED_ATTACHMENT_LIMIT = 3

function areAttachmentsExpanded(eventId: string) {
  return expandedAttachmentEventIds.value.includes(String(eventId || ''))
}

function visibleEventAttachments(event: Partial<VibeEvent> | any): VibeAttachment[] {
  const files = eventAttachments(event)
  if (files.length <= COLLAPSED_ATTACHMENT_LIMIT || areAttachmentsExpanded(event?.id)) return files
  return files.slice(0, COLLAPSED_ATTACHMENT_LIMIT)
}

function hiddenAttachmentCount(event: Partial<VibeEvent> | any) {
  const files = eventAttachments(event)
  if (files.length <= COLLAPSED_ATTACHMENT_LIMIT) return 0
  return areAttachmentsExpanded(event?.id) ? files.length - COLLAPSED_ATTACHMENT_LIMIT : files.length - COLLAPSED_ATTACHMENT_LIMIT
}

function toggleAttachmentsExpanded(eventId: string) {
  const id = String(eventId || '')
  if (!id) return
  if (expandedAttachmentEventIds.value.includes(id)) {
    expandedAttachmentEventIds.value = expandedAttachmentEventIds.value.filter(item => item !== id)
  } else {
    expandedAttachmentEventIds.value = [...expandedAttachmentEventIds.value, id]
  }
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

function fndSerializeSteps(): any[] {
  return streamingProcess.steps
    .filter(s => s.kind === 'message')
    .map(s => ({ kind: 'message', text: (s as any).text }))
}

function isLikelyDeleteIntentText(text: string, applyEdit?: any) {
  const kind = String(applyEdit?.kind || '')
  if (kind === 'knowledge_change' && Array.isArray(applyEdit?.operations)) {
    return applyEdit.operations.some((item: any) => String(item?.op || item?.kind || '').startsWith('delete_'))
  }
  const t = String(text || '').trim()
  if (!t) return false
  return /(删除|删掉|移除|清除|去掉|撤掉).{0,80}(模块|分类|原文|原文块|整段|知识库|规则|内容)/.test(t)
}

function intentStepLabel(actions: string[], text: string, applyEdit?: any) {
  if (isLikelyDeleteIntentText(text, applyEdit) && actions.some(a => a === 'save' || a === 'candidate_save')) {
    return '意图：删除原文'
  }
  return actions.length
    ? `意图：${actions.map(a => FND_ACTION_LABELS[a] || a).join('＋')}`
    : '意图：待判断'
}

const FND_ACTION_LABELS: Record<string, string> = {
  save: '录入新知识',
  insert: '录入新知识',
  edit: '修改原文',
  update: '修改原文',
  move: '移动原文',
  delete: '删除原文',
  candidate_save: '疑似录入，待确认',
  overview: '盘点知识库',
  kb: '检索知识库',
  system: '使用向导',
  external: '库外问题（待接工具）',
  smalltalk: '寒暄/边界',
  needs_clarification: '待澄清',
}

async function sendFoundationTurn(overrideText?: string, opts?: { seedMessages?: any[]; continuationParentId?: string; documentContent?: string; documentMode?: boolean; filename?: string; attachments?: VibeAttachment[]; applyEdit?: any; clarificationCancel?: boolean; clarificationResponse?: { type: 'option' | 'input'; option_id?: string; text?: string } }) {
  const content = (overrideText ?? draft.value).trim()
  if (!content || sending.value) return
  const seedMessages = opts?.seedMessages  // 续跑：上一轮反问的挂起草稿，回传后端接着想
  const documentContent = opts?.documentContent  // 文件整篇录入：整篇原文走 document、text 只作干净消息
  const documentMode = !!opts?.documentMode
  const attachments = opts?.attachments || []
  const filename = opts?.filename || ''
  const applyEdit = opts?.applyEdit  // 改原文·确认：回传 diff 提案，后端确定性落库
  const clarificationCancel = !!opts?.clarificationCancel  // 取消反问/确认：写终态回执，避免刷新后旧反问复活
  // 续跑·视觉一体化：本轮(回答+续跑答案)挂到上一轮反问那条 assistant 之下，渲染成同一条思考。
  const contParent = opts?.continuationParentId && hasEvent(opts.continuationParentId) ? opts.continuationParentId : ''
  if (!vibeProject.value) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (!(await ensureComposerModelUsable())) return
  clarificationActive.value = null  // 发新一轮即收起上一轮的反问
  const project = String(vibeProject.value.id)
  const startedAt = Date.now()
  foundationBusy.value = true
  startElapsedTicker(startedAt)  // "已处理 Xs"前端秒表:整轮在途一直数,不听 process_done
  processExpanded.value = true
  clearStreamingAssistant()
  streamingAssistantEventId.value = ''
  streamingContinuationParentId.value = contParent  // 必须在 clearStreamingAssistant 之后（它会清空）
  resetProcessState(streamingProcess)
  streamingProcess.status = 'running'
  // 续跑轮：用户的回答=对反问的"选择回复"，挂到反问之下、不再单列成气泡。
  events.value.push(fndSyntheticEvent('user', content, 'entry',
    contParent ? { confirmation_reply: true, parent_event_id: contParent } : {},
    attachments))
  draft.value = ''
  resizeDraft()
  scrollBottom()

  let assistantContent = ''
  let actions: string[] = []
  let recallSources: any[] = []
  let recallVerification: any | null = null
  const answers: string[] = []
  let answerStreamText = ''
  let answerStreamDoneText = ''
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
      if (live) { consumeProcessEvent(streamingProcess, event); scrollBottomIfFollowing() }
      return
    }
    switch (String(event?.type || '')) {
      case 'turn_started':
        // T26：后端本轮令牌 id——停止按钮凭它调 cancel 接口
        activeTurnId.value = String(event.turn_id || '')
        break
      case 'cancelled':
        if (live) fndPushStep('已停止本轮处理')
        break
      case 'event_saved': {
        // 后端已把本轮消息写进会话历史。标志位无论是否在场都要置（兜底/重载判定要用）；
        // 只有【当前正看本轮会话】时才把服务器事件写进 events.value（避免串到别的会话）。
        const saved = event.event as VibeEvent
        if (event.role === 'user') {
          userEventSaved = true
          if (live) events.value = events.value.filter(e => !String(e.id).startsWith('fnd-user-'))
        } else if (event.role === 'assistant') {
          assistantEventSaved = true
          // 0704 防闪:持久化气泡即将插入列表,同帧清掉流式气泡——否则"流式份+持久份"双显一瞬,
          // finally 再清时肉眼看到答案闪一下/整块跳动。
          if (live) {
            streamingAssistantEventId.value = String(saved?.id || '')
            streamingAssistantContent.value = ''
            streamingSources.value = []
            streamingVerification.value = null
          }
        }
        if (live) upsertEvent(saved)
        break
      }
      case 'stage':
        if (live) fndPushStep(String(event.message || ''))
        break
      case 'intent':
        actions = (event.actions || []).map(String)
        if (live) fndPushStep(intentStepLabel(actions, content, applyEdit))
        break
      case 'answer_start':
        answerStreamText = ''
        answerStreamDoneText = ''
        if (live) streamingAssistantContent.value = ''
        break
      case 'answer_delta':
        answerStreamText += String(event.delta || '')
        if (live) streamingAssistantContent.value = answerStreamText
        break
      case 'answer_done':
        answerStreamDoneText = answerStreamText
        if (live && answerStreamDoneText) streamingAssistantContent.value = answerStreamDoneText
        break
      case 'answer': {
        const text = String(event.text || '')
        if (text && answers[answers.length - 1] !== text) answers.push(text)
        answerStreamDoneText = text || answerStreamDoneText
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
      case 'error':
        failed = String(event.detail || '执行失败')
        break
      default:
        break
    }
    if (live) scrollBottomIfFollowing()
  }

  try {
    try {
      sessionId = await ensureSession()
    } catch {
      sessionId = '' // 会话不可用：本轮退回无持久化的旧行为，不阻塞对话
    }
    turnSessionId = sessionId || activeSessionId.value  // 锚定本轮归属的会话（#2 切换查看用）
    await streamFoundationTurn({ project, text: content, session_id: sessionId, llm_provider_id: selectedLlmProviderId.value || undefined, seed_messages: seedMessages, continuation_parent_id: contParent || undefined, mode: (documentContent || documentMode) ? 'document' : undefined, document: documentContent || undefined, filename: filename || undefined, attachments: attachments.length ? attachments : undefined, apply_edit: applyEdit || undefined, clarification_cancel: clarificationCancel || undefined, clarification_response: opts?.clarificationResponse || undefined }, {
      onEvent,
      onError(message: string) { failed = failed || message },
    })
    if (!failed) {
      assistantContent = answers.join('\n\n') || answerStreamDoneText
    }
  } catch (error) {
    failed = failed || (error instanceof Error ? error.message : String(error))
  } finally {
    stopElapsedTicker()
    activeTurnId.value = ''
    cancelRequested.value = false
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
    streamingAssistantEventId.value = ''
    if (applyEdit?.kind === 'knowledge_change') loadKbStats()
    // 与 sendMessage 一致的服务器刷新；仅在两条都已持久化时做，否则会把仅存在于本地的合成兜底气泡刷掉
    if (sessionId && userEventSaved && assistantEventSaved && activeSessionId.value === sessionId) {
      try {
        await refreshState()
        // 0704 防闪:event_saved 已把本轮两条真实事件插进列表,全量替换会让整个回答区
        // v-html 重渲染闪一下——id 序列没变化就跳过替换。
        const fresh = sortEvents(await listVibeEvents(sessionId).catch(() => events.value))
        const sameIds = fresh.length === events.value.length
          && fresh.every((e, i) => e.id === events.value[i]?.id)
        if (!sameIds) events.value = fresh
      } catch { /* 刷新失败不影响本轮结果展示 */ }
    }
    await scrollBottomIfFollowing()
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

function buildConversationRailItems() {
  const visible = events.value.filter((event: any) => shouldRenderEvent(event)).sort(compareEvents)
  const users = visible.filter((event: any) =>
    event?.role === 'user'
    && !isConfirmationReplyEvent(event)
    && String(event?.content || '').trim())
  return users.slice(-MAX_CONVERSATION_RAIL_ITEMS).map((event: any) => ({
    id: String(event.id),
    question: conversationPreviewText(event.content, '未命名提问'),
    answer: conversationPreviewText(answerForUserEvent(event, visible), '暂无答案'),
  }))
}

function answerForUserEvent(userEvent: any, visibleEvents: any[]) {
  const userIndex = visibleEvents.findIndex((event: any) => event.id === userEvent.id)
  if (userIndex < 0) return ''
  const nextUserIndex = visibleEvents.findIndex((event: any, index: number) =>
    index > userIndex
    && event?.role === 'user'
    && !isConfirmationReplyEvent(event))
  const end = nextUserIndex >= 0 ? nextUserIndex : visibleEvents.length
  const candidates = visibleEvents
    .slice(userIndex + 1, end)
    .filter((event: any) => event?.role === 'assistant' && !isPackageActionEvent(event))
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    const event = candidates[i]
    if (isClarifyThreadRoot(event)) {
      const finalAnswer = threadFinalAnswer(event)
      if (finalAnswer) return finalAnswer
    }
    if (!isPendingClarification(event)) {
      const content = eventDisplayContent(event)
      if (content) return content
    }
  }
  const isLastUser = !visibleEvents.slice(userIndex + 1).some((event: any) =>
    event?.role === 'user' && !isConfirmationReplyEvent(event))
  return isLastUser ? streamingAssistantContent.value : ''
}

function conversationPreviewText(value: unknown, fallback = '') {
  const text = String(value || '')
    .replace(/```[\w-]*\n?([\s\S]*?)```/g, '$1 ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1 ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`[\]()|~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text || fallback
}

function renderMarkdown(content: string) {
  const html = marked.parse(normalizeCopyableMarkdownFence(content || '')) as string
  const sanitized = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  })
  return enhanceCopyableCodeBlocks(sanitized)
}

function normalizeCopyableMarkdownFence(content: string) {
  const raw = String(content || '')
  const stripped = raw.trim()
  if (!stripped.startsWith('```') || !stripped.endsWith('```')) return raw
  const firstNewline = stripped.indexOf('\n')
  if (firstNewline <= 0) return raw
  const opener = stripped.slice(0, firstNewline)
  const body = stripped.slice(firstNewline + 1, -3)
  if (!body.includes('```')) return raw
  const runs = body.match(/`{3,}/g) || ['```']
  const maxRun = Math.max(...runs.map((item) => item.length))
  const fence = '`'.repeat(maxRun + 1)
  const lang = opener.slice(3).trim()
  const normalized = `${fence}${lang}\n${body}${fence}`
  return `${raw.slice(0, raw.length - raw.trimStart().length)}${normalized}${raw.slice(raw.trimEnd().length)}`
}

function codeBlockLanguage(code: Element | null) {
  const className = String(code?.getAttribute('class') || '')
  const match = className.match(/(?:^|\s)language-([^\s]+)/)
  return (match?.[1] || 'text').toLowerCase()
}

function enhanceCopyableCodeBlocks(html: string) {
  if (!html || typeof document === 'undefined') return html
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  tpl.content.querySelectorAll('pre').forEach((pre) => {
    if (pre.closest('.copyable-code')) return
    const code = pre.querySelector('code')
    const language = codeBlockLanguage(code)
    const wrapper = document.createElement('div')
    wrapper.className = 'copyable-code'
    const header = document.createElement('div')
    header.className = 'copyable-code-head'
    const label = document.createElement('span')
    label.className = 'copyable-code-lang'
    label.textContent = language
    const button = document.createElement('button')
    button.className = 'copyable-code-copy'
    button.type = 'button'
    button.setAttribute('aria-label', '复制代码块内容')
    button.setAttribute('title', '复制')
    button.setAttribute('data-copy-code', '1')
    button.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
    header.append(label, button)
    pre.replaceWith(wrapper)
    wrapper.append(header, pre)
  })
  return tpl.innerHTML
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

function isBlockingClarificationEvent(event: any): boolean {
  return !!eventClarificationQuestion(event)
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
  timelineFollow.value = true
  await nextTick()
  const el = timelineEl.value
  if (el) el.scrollTop = el.scrollHeight
  isAtBottom.value = true
  updateActiveConversationRail()
}

// 是否已滚动到底部（用于控制"回到底部"悬浮按钮的显隐）
const isAtBottom = ref(true)
const timelineFollow = ref(true)

async function scrollBottomIfFollowing() {
  if (!timelineFollow.value) return
  await nextTick()
  if (!timelineFollow.value) return
  const el = timelineEl.value
  if (el) el.scrollTop = el.scrollHeight
  isAtBottom.value = true
  updateActiveConversationRail()
}

function isTimelineNearBottom(el: HTMLElement, threshold = 56) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
}

function handleTimelineScroll() {
  const el = timelineEl.value
  if (!el) return
  const nearBottom = isTimelineNearBottom(el)
  isAtBottom.value = nearBottom
  timelineFollow.value = nearBottom
  if (conversationRailRaf) cancelAnimationFrame(conversationRailRaf)
  conversationRailRaf = requestAnimationFrame(() => {
    conversationRailRaf = 0
    updateActiveConversationRail()
  })
}

function updateActiveConversationRail() {
  const items = conversationRailItems.value
  if (!items.length) {
    activeConversationEventId.value = ''
    return
  }
  const el = timelineEl.value
  if (el && isTimelineNearBottom(el, 96)) {
    activeConversationEventId.value = items[items.length - 1].id
    return
  }
  const topBase = el?.getBoundingClientRect().top ?? 0
  let candidate = items[items.length - 1].id
  let bestTop = Number.NEGATIVE_INFINITY
  for (const item of items) {
    const node = document.getElementById(`timeline-event-${item.id}`)
    if (!node) continue
    const top = node.getBoundingClientRect().top - topBase
    if (top <= 120 && top > bestTop) {
      candidate = item.id
      bestTop = top
    }
  }
  activeConversationEventId.value = candidate
}

function jumpToConversationTurn(id: string, index = -1) {
  activeConversationEventId.value = id
  timelineFollow.value = false
  const el = timelineEl.value
  if (index === 0 && el) {
    el.scrollTo({ top: 0, behavior: 'smooth' })
    isAtBottom.value = false
    return
  }
  document.getElementById(`timeline-event-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function conversationRailHoverDistance(index: number) {
  if (hoveredConversationRailIndex.value === null) return -1
  return Math.abs(hoveredConversationRailIndex.value - index)
}

function scrollBottomSmooth() {
  const el = timelineEl.value
  if (!el) return
  timelineFollow.value = true
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  isAtBottom.value = true
  activeConversationEventId.value = conversationRailItems.value.at(-1)?.id || ''
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

async function handleTimelineClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  const button = target?.closest?.('[data-copy-code="1"]') as HTMLButtonElement | null
  if (!button) return
  event.preventDefault()
  event.stopPropagation()
  const block = button.closest('.copyable-code')
  const text = block?.querySelector('pre code')?.textContent || ''
  if (!text) return
  try {
    await writeClipboardText(text)
    const previous = button.getAttribute('title') || '复制'
    button.classList.add('copied')
    button.setAttribute('title', '已复制')
    setTimeout(() => {
      button.classList.remove('copied')
      button.setAttribute('title', previous)
    }, 1100)
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
  if (event?.role === 'assistant' && isBlockingClarificationEvent(event)) return '确认'
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
    && isBlockingClarificationEvent(event)
    && event.id === lastAssistantId.value
    && parentContinuationResponses(event).length === 0
    && !isStreamingUnderEvent(event)
}

// ===== 反问续跑：把【反问→你的选择→继续思考→(可能再问→再选)→答案】合并成一条思考 =====
// 线程根 = 第一条反问(自己不是续跑子)，且已被回答(下面挂了续跑 或 正在流式续跑)。
function isClarifyThreadRoot(event: any): boolean {
  return event?.role === 'assistant'
    && isBlockingClarificationEvent(event)
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
      // 第四代小文档确认把整体 diff 作为思考的一环；大文档只保留摘要。
      const raw = n?.meta?.clarification?.raw
      if (raw && raw.kind === 'knowledge_change' && raw.old_body != null && raw.new_body != null
        && (String(raw.old_body).length > 0 || String(raw.new_body).length > 0)) {
        out.push({ kind: 'diff', key: `diff-${n.id}`, lines: diffLines(raw.old_body, raw.new_body) })
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
  return isStreamingUnderEvent(root) && procRunning.value
}

// 0703 第三态:线程收尾在反问/勾选上、后端已收工、等用户决定 → 头部显示"等你选择"
function threadAwaiting(root: any): boolean {
  if (threadRunning(root) || !clarificationActive.value) return false
  return clarifyThreadNodes(root).some((n: any) => n.id === lastAssistantId.value && isBlockingClarificationEvent(n))
}

function threadDurationMs(root: any): number {
  const base = clarifyThreadNodes(root).reduce((sum: number, n: any) => sum + (eventProcessDuration(n) || 0), 0)
  // 续跑轮在途:历史各段耗时 + 本轮前端秒表,让"已处理"一直数着(0704)。
  return threadRunning(root) ? base + streamingElapsedMs.value : base
}

// 线程的最终答案节点 = 最后一个【非反问】节点；若最后还是反问(还在问)则没有最终答案。
function threadFinalNode(root: any): any {
  const nodes = clarifyThreadNodes(root)
  const last = nodes[nodes.length - 1]
  return isBlockingClarificationEvent(last) ? null : last
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
  /* —— 全局 4 档灰阶 + 填充 token（左栏/主区共用）：颜色只从这里取，别再新造 —— */
  --ink-1: rgba(15, 15, 15, 0.9);    /* 主文字 */
  --ink-2: rgba(15, 15, 15, 0.68);   /* 次文字 */
  --ink-3: rgba(15, 15, 15, 0.42);   /* 弱文字/图标 */
  --hairline: rgba(15, 15, 15, 0.07);
  --fill-1: rgba(15, 15, 15, 0.045); /* hover 填充 */
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
  /* 侧栏收起：列宽动画（Chromium 支持 grid-template-columns 过渡） */
  transition: grid-template-columns 240ms ease;
}

.vibe-shell.side-collapsed {
  grid-template-columns: 0px minmax(0, 1fr);
}

/* 玻璃色底层：收起动画中 grid 轨道缩放会瞬间露出透明窗口（黑闪），
   垫一层与玻璃同色的底，任何缝隙都只会露出浅灰而不是黑。 */
.vibe-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--vibe-glass-bg);
  pointer-events: none;
}

/* 侧栏收起/展开按钮：钉在窗口左上拖拽条上（需 no-drag），mac 时让出红绿灯的位置 */
.side-toggle {
  position: fixed;
  top: 4px;
  left: 8px;
  z-index: 20;
  -webkit-app-region: no-drag;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;

  &:hover {
    background: rgba(15, 15, 15, 0.07);
    color: var(--ink-1);
  }
}

/* mac：红绿灯在 (12,12)、灯珠 12px（垂直中心 ≈18px）——按钮 28px 取 top 4 与其对中，左侧紧贴灯组 */
.side-toggle.mac {
  left: 72px;
  top: 4px;
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

/* Windows 窗口控制：钉在拖拽条右上，压在 drag 层之上。
   默认透明、hover 感应区才浮现；感应区比按钮大一圈（padding 扩出），并显式 no-drag——
   否则被 drag 区吞掉 mouse 事件，hover 永远不触发。 */
.win-ctl-zone {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 20;
  padding: 6px 8px 10px 16px;
  -webkit-app-region: no-drag;
  opacity: 0;
  transition: opacity 150ms ease;
}

.win-ctl-zone:hover {
  opacity: 1;
}

/* 组件自带 absolute 定位，这里改由感应区排版 */
.win-ctl {
  position: static;
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
  padding: 38px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  /* 高度自适应：side 自身不滚，由内部对话列表滚动——库再多也不外溢、项目卡常驻 */
  min-height: 0;
  overflow: hidden;
  transition: opacity 180ms ease, padding 240ms ease;
}

/* 收起动画期间内容保持固有宽度（282 - 左右 padding 24 = 258），只被裁切、不被挤压回流 */
.side > * {
  width: 258px;
  flex-shrink: 0;
  box-sizing: border-box;
}

.side-collapsed .side {
  padding-left: 0;
  padding-right: 0;
  opacity: 0;
  pointer-events: none;
}

.icon-btn,
.round-btn,
.ghost,
.primary-btn,
.send {
  border: 0;
  cursor: pointer;
  transition: background 150ms ease, transform 150ms ease, opacity 150ms ease;
}

.icon-btn,
.round-btn {
  height: 25px;
  min-width: 25px;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-3, rgba(15, 15, 15, 0.58));
}

.icon-btn:hover,
.round-btn:hover {
  background: var(--fill-1, rgba(255, 255, 255, 0.96));
  color: var(--ink-2, rgba(15, 15, 15, 0.72));
}

.icon-btn:disabled,
.round-btn:disabled,
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

  /* 触发器=项目卡：[知识库 icon] [项目名 / 段·模块] [caret]，高度自适应内容。
     左栏唯一的一张卡：平铺白、发丝线，不再叠渐变（多层半透明白是"浑浊感"来源）。 */
  :deep(.app-select-trigger) {
    width: 100%;
    min-width: 0;
    height: auto;
    min-height: 50px;
    padding: 8px 10px;
    gap: 10px;
    border-radius: 12px;
    border-color: var(--hairline);
    background: rgba(255, 255, 255, 0.78);
    color: var(--ink-2);
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
  border-radius: 8px;
  background: rgba(15, 15, 15, 0.06);
  color: var(--ink-1);
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
  color: var(--ink-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proj-kb {
  font-size: 12px;
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proj-caret {
  flex: 0 0 auto;
  color: var(--ink-3);
  transition: transform 150ms ease;
}
.proj-caret.open { transform: rotate(180deg); }

/* —— 重排后的左栏：项目卡 / 对话区 / 知识库概览 —— */
.proj-card {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 区块 label 全侧栏一个口径：11px / 600 / 0.04em / ink-3，左起 10px 基准线 */
.proj-label {
  padding: 0 10px;
  color: var(--ink-3);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.kb-browser-entry {
  flex: 0 0 auto;
  height: 38px;
  border: 1px solid color-mix(in srgb, var(--ink-1) 10%, transparent);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--ink-2);
  display: grid;
  grid-template-columns: 17px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  cursor: pointer;
  text-align: left;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
}

.kb-browser-entry svg {
  width: 16px;
  height: 16px;
}

.kb-browser-entry:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.96);
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  color: var(--ink-1);
}

.kb-browser-entry:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.kb-browser-entry span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 600;
}

.kb-browser-entry em {
  font-style: normal;
  font-size: 12px;
  color: var(--ink-3);
}


.side-user-card {
  flex: 0 0 auto;
  width: 100%;
  min-height: 64px;
  border: 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.64);
  color: var(--ink-1);
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: center;
  gap: 11px;
  padding: 10px 11px;
  cursor: pointer;
  text-align: left;
  transition: background 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}

.side-user-card:hover {
  background: rgba(255, 255, 255, 0.94);
  box-shadow: inset 0 0 0 1px var(--hairline), 0 8px 20px rgba(15, 15, 15, 0.06);
}

.side-user-avatar.avatar-container {
  position: relative;
  width: 32px;
  height: 32px;
  cursor: pointer;
}

.side-user-avatar .user-avatar {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 2px solid rgba(0, 0, 0, 0.08);
  will-change: transform;
}

.side-user-avatar .online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 9px;
  height: 9px;
  background: #10b981;
  border: 2px solid #fff;
  border-radius: 50%;
  animation: user-pulse 2s ease-in-out infinite;
}

.side-user-card:hover .side-user-avatar .user-avatar {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

@keyframes user-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0); }
}

.side-user-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.side-user-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-1);
  font-size: 15px;
  line-height: 1.35;
  font-weight: 650;
}

.side-user-main em {
  color: var(--ink-3);
  font-size: 13px;
  line-height: 1.3;
  font-style: normal;
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
  padding: 0 4px 0 10px;
  margin-bottom: 6px;
}

.convs-title {
  color: var(--ink-3);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
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
  border-radius: 8px;
  background: transparent;
  text-align: left;
  padding: 7px 9px;
  box-sizing: border-box;
  cursor: pointer;
  color: var(--ink-2, rgba(15, 15, 15, 0.72));
  font-size: 13px;
  transition: background 150ms ease;

  /* hover 只动背景不动文字色（扫过列表时明暗不跳）；active 是全侧栏唯一的强状态 */
  &:hover { background: var(--fill-1); }
  &.active {
    background: #fff;
    box-shadow: 0 1px 2px rgba(15, 15, 15, 0.05), inset 0 0 0 1px var(--hairline);
  }
  &:disabled {
    cursor: not-allowed;
  }
}

.session-row {
  position: relative;

  &.active .session-open {
    background: #fff;
    box-shadow: 0 1px 2px rgba(15, 15, 15, 0.05), inset 0 0 0 1px var(--hairline);
  }
}

.session-open {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  /* 去掉时间后变单行，行高收窄；左起对齐 10px 基准线 */
  min-height: 28px;
  padding: 5px 28px 5px 10px;
}

.session-ic {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  color: var(--ink-3);
  transition: color 150ms ease;
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
  font-size: 14px;
  line-height: 1.4;
  color: var(--ink-2);
  transition: color 150ms ease;
}

.session-body small {
  color: var(--ink-3);
  font-size: 11px;
}

/* 正在对话的实心闪烁点：压灰（比默认 icon 色更淡），hover/active 也只到中灰、不跟黑 */
.session-ic .dot-blink { color: rgba(15, 15, 15, 0.3); }

.dot-blink-core {
  transform-origin: 20px 20px;
  animation: dot-blink 1.35s ease-in-out infinite;
}

@keyframes dot-blink {
  0%, 100% { opacity: 0.38; transform: scale(0.88); }
  45% { opacity: 1; transform: scale(1); }
  68% { opacity: 0.72; transform: scale(0.94); }
}

@media (prefers-reduced-motion: reduce) {
  .dot-blink-core {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

/* 只有选中态加深（icon + 标题）；hover 不动文字色 */
.session-row.active .session-ic,
.session-row.active .session-title {
  color: var(--ink-1);
}

/* 选中行里的闪烁点也只到中灰，不跟标题变黑 */
.session-row.active .session-ic .dot-blink {
  color: rgba(15, 15, 15, 0.45);
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
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  opacity: 0;
  transition: opacity 150ms ease, background 150ms ease, color 150ms ease;

  &:hover {
    background: var(--fill-1);
    color: var(--ink-2);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.5;
  }
}

.muted {
  margin: 6px 10px;
  color: var(--ink-3);
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
  position: relative;
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

/* header 浮在滚动内容之上：无 border，靠近 header 的内容经背后毛玻璃渐隐——
   模糊层放 ::before（带渐变 mask），标题文字自身不受 mask 影响。 */
.main-head {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 6;
  height: 68px;
  flex-shrink: 0;
  padding: 0 20px;
  border-bottom: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none; /* 只是标题层，别挡住下面的滚动/悬停 */
  background: #fff; /* header 本体实底不透明 */

  /* 紧贴 header 下沿的柔边：纯白色渐隐（无 backdrop 模糊）——
     文字滚过时渐渐没入白底，像轻微化开，但始终清晰可读。 */
  &::before {
    content: '';
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    height: 14px;
    background: linear-gradient(to bottom, #fff, rgba(255, 255, 255, 0));
  }


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


.conversation-rail {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 8;
  width: 72px;
  max-height: min(500px, calc(100% - 112px));
  padding: 6px 0 8px 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  pointer-events: auto;
}

.conversation-rail-row {
  position: relative;
  width: 58px;
  min-height: 6px;
  border: 0;
  background: transparent;
  padding: 0;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.conversation-rail-line {
  width: 7px;
  height: 2px;
  border-radius: 999px;
  background: #d7d7d7;
  transition: width 140ms ease, height 140ms ease, background 140ms ease;
}

.conversation-rail-row.hover .conversation-rail-line {
  width: 28px;
  height: 2.5px;
  background: #111;
}

.conversation-rail-row.hover-near-1 .conversation-rail-line { width: 24px; }
.conversation-rail-row.hover-near-2 .conversation-rail-line { width: 18px; }
.conversation-rail-row.hover-near-3 .conversation-rail-line { width: 13px; }

.conversation-rail-row.active .conversation-rail-line {
  width: 14px;
  background: #111;
}

.conversation-rail-row.active.hover .conversation-rail-line {
  width: 28px;
  height: 2.5px;
}

.conversation-rail-card {
  position: absolute;
  left: 32px;
  top: 50%;
  transform: translateY(-50%);
  width: 320px;
  min-height: 104px;
  max-height: 130px;
  border: 1px solid rgba(15, 15, 15, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 44px rgba(15, 15, 15, 0.13);
  padding: 14px 16px;
  box-sizing: border-box;
  text-align: left;
  pointer-events: none;
  backdrop-filter: blur(12px);
}

.conversation-rail-card strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #171717;
  font-size: 15px;
  line-height: 1.35;
  font-weight: 700;
  letter-spacing: 0;
}

.conversation-rail-card p {
  margin: 8px 0 0;
  color: #8a8a8a;
  font-size: 13px;
  line-height: 1.55;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
  /* header 改为悬浮层后，顶部留出【header 高 + 下沿模糊带】：滚到顶时首条消息完整露出，
     只有滚动经过时才进模糊带 */
  padding: 60px max(28px, calc((100% - 760px) / 2)) 24px;
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
  color: var(--ink-3);
  text-align: center;
  animation: empty-rise 420ms ease both;

  strong { color: var(--ink-1); font-size: 16px; font-weight: 600; letter-spacing: 0.01em; }
  span { max-width: 420px; font-size: 13px; line-height: 1.7; color: var(--ink-3); }

  &.inline {
    margin: 40px auto;
  }
}

@keyframes empty-rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

/* 鲸鱼 → logo 动画：素材四周留白较多，负 margin 收紧与标题的视觉间距 */
.empty-video {
  width: 104px;
  height: 104px;
  margin-bottom: -4px;
  cursor: pointer;           /* 播完停在 logo，点击重播 */
  user-select: none;
  -webkit-user-drag: none;
}

.empty-hints {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.empty-hint {
  height: 30px;
  padding: 0 13px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  background: #fff;
  color: var(--ink-2);
  font-size: 12px;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease;

  &:hover:not(:disabled) {
    background: var(--fill-1);
    border-color: rgba(15, 15, 15, 0.12);
    color: var(--ink-1);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

@media (prefers-reduced-motion: reduce) {
  .empty { animation: none; }
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

.user-attachment-list {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 5px;
  margin: 0 0 7px;
  max-width: 100%;
  margin-left: auto;
  align-items: center;
  overflow: visible;
  padding: 1px;
  box-sizing: border-box;
}

.user-attachment-list.expanded {
  max-height: 152px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 3px;
}

.user-attachment-chip {
  width: auto;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(15, 15, 15, 0.1);
  border-radius: 9px;
  padding: 5px 8px 5px 5px;
  color: rgba(15, 15, 15, 0.78);
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 15, 15, 0.04);
  cursor: pointer;
  text-align: left;
  flex: 1 1 172px;
}

.user-attachment-list:not(.expanded) .user-attachment-chip {
  max-width: 248px;
}

.user-attachment-chip:hover {
  border-color: rgba(15, 15, 15, 0.18);
  background: #fafafa;
}

.user-attachment-icon {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  color: rgba(15, 15, 15, 0.68);
  background: #f3f4f6;
}

.user-attachment-icon.markdown {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  color: #fff;
  background: linear-gradient(135deg, rgba(37,99,235,.95), rgba(124,58,237,.92) 52%, rgba(22,163,74,.9));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.28), 0 5px 12px rgba(37,99,235,.18);
}

.user-attachment-icon svg {
  width: 15px;
  height: 15px;
}

.user-attachment-icon.markdown svg {
  width: 18px;
  height: 18px;
}

.user-attachment-main {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.user-attachment-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(15, 15, 15, 0.86);
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.25;
}

.user-attachment-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(15, 15, 15, 0.42);
  font-size: 11px;
  line-height: 1.2;
}

.user-attachment-more {
  height: 32px;
  min-width: 42px;
  flex: 0 0 auto;
  box-sizing: border-box;
  padding: 0 10px;
  border: 1px solid rgba(15, 15, 15, 0.1);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.94);
  color: rgba(15, 15, 15, 0.58);
  cursor: pointer;
  font-size: 12px;
  font-weight: 650;
  box-shadow: 0 1px 2px rgba(15, 15, 15, 0.035);
}

.user-attachment-more:hover {
  border-color: rgba(15, 15, 15, 0.18);
  color: rgba(15, 15, 15, 0.76);
  background: #fafafa;
}

@media (max-width: 760px) {
  .user-attachment-chip {
    flex-basis: 100%;
  }

  .user-attachment-list:not(.expanded) .user-attachment-chip {
    max-width: 100%;
  }
}

.user-message-bubble {
  width: fit-content;
  max-width: 100%;
  margin-left: auto;
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

  :deep(.copyable-code) {
    max-width: 100%;
    min-width: 0;
    margin: 10px 0 12px;
    overflow: hidden;
    border-radius: 12px;
    background: #ececec;
    box-shadow: inset 0 0 0 1px rgba(15, 15, 15, 0.035);
  }

  :deep(.copyable-code-head) {
    height: 38px;
    padding: 0 10px 0 13px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: rgba(15, 15, 15, 0.56);
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    line-height: 1;
  }

  :deep(.copyable-code-lang) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :deep(.copyable-code-copy) {
    width: 28px;
    height: 28px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: rgba(15, 15, 15, 0.48);
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease, transform 140ms ease;
  }

  :deep(.copyable-code-copy:hover),
  :deep(.copyable-code-copy.copied) {
    background: rgba(15, 15, 15, 0.07);
    color: rgba(15, 15, 15, 0.78);
  }

  :deep(.copyable-code-copy.copied) {
    transform: scale(0.94);
  }

  :deep(pre) {
    max-width: 100%;
    overflow: auto;
    margin: 8px 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: #ececec;
  }

  :deep(.copyable-code pre) {
    margin: 0;
    padding: 0 14px 14px;
    border-radius: 0;
    background: transparent;
  }

  :deep(pre code) {
    padding: 0;
    background: transparent;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
    color: rgba(15, 15, 15, 0.88);
    font-size: 13px;
    line-height: 1.7;
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
