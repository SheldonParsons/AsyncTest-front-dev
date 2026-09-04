<template>
  <main
    ref="shellRef"
    class="vibe-shell"
    :class="{
      'side-collapsed': sideCollapsed,
      'side-resizing': sideResizing,
      'workspace-resizing': workspaceWindowResizing,
    }"
    :style="workspaceWindowStyle"
    :data-trace-audit="canViewTraceAudit ? '1' : '0'"
  >
    <div class="window-drag" :class="{ 'reserve-info-toggle': currentView === 'conversation', 'workspace-open': workspaceWindowLayoutActive }" />
    <!-- 展开态：动效开关留在窗口左上；收起态实例移动到主对话标题左侧。 -->
    <CodexPanelToggleMirroredStatic
      v-if="!sideCollapsed"
      class="side-toggle"
      :class="{ mac: isMacPlatform }"
      :collapsed="sideCollapsed"
      @panel-toggle="setSideCollapsed"
    />
    <!-- 窗口级 header 只保留 Windows 三键；对话信息栏开关属于主对话 header。 -->
    <div v-if="showWinControls" class="window-actions">
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
        <button
          class="project-switch-trigger"
          type="button"
          :disabled="loading || projectListRefreshing || projectSwitchPhase === 'working'"
          aria-haspopup="dialog"
          :aria-expanded="projectSwitchDialogOpen"
          :aria-busy="projectSwitchPhase === 'working' ? 'true' : undefined"
          aria-controls="project-switch-dialog"
          @click="openProjectSwitchDialog"
        >
          <span class="proj-ic" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
          </span>
          <span class="proj-main">
            <span class="proj-name">{{ selectedProjectLabel || '选择项目' }}</span>
            <span class="proj-kb">{{ kbStats.documents }} 份文档</span>
          </span>
        </button>
      </section>
      <section class="convs">
        <div class="convs-head">
          <span class="convs-title">对话</span>
          <button class="round-btn" type="button" title="新建对话" @click="newConversation">
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
              <span class="session-body">
                <span class="session-title">{{ sessionDisplayTitle(item) }}</span>
              </span>
              <span
                v-if="sessionRuntimeState(item.id)"
                :class="['session-running', { 'waiting-user': sessionRuntimeState(item.id) === 'waiting_user' }]"
                :aria-label="sessionRuntimeLabel(item.id)"
                :title="sessionRuntimeLabel(item.id)"
              >
                <span v-if="sessionRuntimeState(item.id) === 'waiting_user'" aria-hidden="true">需要用户输入</span>
                <RingSpinner v-else />
              </span>
            </button>
            <button
              class="session-delete"
              type="button"
              title="删除"
              :disabled="!!deletingSessionId"
              @click.stop="deleteSession(item.id)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
            </button>
          </div>
          <p v-if="!sessions.length" class="muted">开始第一轮录入后，这里会出现对话记录。</p>
        </div>
      </section>

      <section class="side-user-card" aria-label="用户与知识库入口">
        <button class="side-user-profile" type="button" @click="openVibeSettings">
          <span class="side-user-avatar avatar-container">
            <el-avatar :key="currentUserAvatarRenderKey" :size="24" :src="currentUserAvatar" class="user-avatar">{{ userInitials }}</el-avatar>
          </span>
          <span class="side-user-main">
            <strong>{{ currentUserName }}</strong>
          </span>
        </button>
        <button
          class="side-user-kb"
          type="button"
          title="原文浏览"
          aria-label="打开原文浏览"
          :disabled="!vibeProject || loading"
          @click="openKbBrowser"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-library-big-icon lucide-library-big" aria-hidden="true"><rect width="8" height="18" x="3" y="3" rx="1"/><path d="M7 3v18"/><path d="M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z"/></svg>
        </button>
      </section>

    </aside>

    <ProjectSwitchDialog
      v-model="projectSwitchDialogOpen"
      :projects="projectOptions"
      :current-project-id="selectedProjectId"
      :target-project-id="projectSwitchTargetId"
      :target-project="projectSwitchTargetProject"
      :phase="projectSwitchPhase"
      :error="projectSwitchError"
      :projects-loading="projectListRefreshing"
      :project-list-error="projectListRefreshError"
      @select="handleProjectChange"
      @retry="retryProjectSwitch"
      @refresh="refreshProjectList"
      @close="closeProjectSwitchDialog"
    />

    <div
      ref="sideResizeHandleRef"
      class="side-resize-handle"
      role="separator"
      :tabindex="sideCollapsed ? -1 : 0"
      :aria-hidden="sideCollapsed ? 'true' : undefined"
      aria-label="调整侧栏宽度"
      aria-orientation="vertical"
      :aria-valuemin="sideWidthRange.min"
      :aria-valuemax="sideWidthRange.max"
      :aria-valuenow="sideWidthPx"
      :aria-valuetext="`侧栏宽度 ${sideWidthPx} 像素`"
      title="拖拽调整侧栏宽度；方向键微调"
      @pointerdown="beginSideResize"
      @pointermove="moveSideResize"
      @pointerup="finishSideResize"
      @pointercancel="finishSideResize"
      @lostpointercapture="finishSideResize"
      @keydown="handleSideResizeKeydown"
    >
      <span class="side-resize-grip" aria-hidden="true" />
    </div>

    <section class="main-frame">
      <section
        ref="mainRef"
        class="main"
        :class="{
          'workspace-open': workspaceWindowOpen,
          'workspace-layout-active': workspaceWindowLayoutActive,
        }"
      >
        <header
          class="main-head"
          :class="{ compact: !headKicker }"
        >
          <div class="main-head-leading">
            <CodexPanelToggleMirroredStatic
              v-if="sideCollapsed"
              class="main-head-side-toggle"
              :class="{ mac: isMacPlatform }"
              :collapsed="sideCollapsed"
              @panel-toggle="setSideCollapsed"
            />
            <div class="main-head-copy">
              <p v-if="headKicker">{{ headKicker }}</p>
              <h1>{{ headTitle }}</h1>
            </div>
          </div>
          <div v-if="currentView === 'conversation'" class="main-head-actions">
            <button
              class="info-rail-toggle"
              type="button"
              :title="infoRailCollapsed ? '展开信息栏' : '收起信息栏'"
              :aria-label="infoRailCollapsed ? '展开信息栏' : '收起信息栏'"
              :aria-expanded="!infoRailCollapsed"
              @click="toggleInfoRail"
            >
              <CodexListFilter />
            </button>
          </div>
        </header>

        <button
          v-if="currentView === 'conversation'"
          class="workspace-window-toggle window-toggle-anchor"
          :class="{ selected: workspaceWindowRequestedOpen }"
          type="button"
          :title="workspaceWindowRequestedOpen ? '收起窗口区域' : '打开窗口区域'"
          :aria-label="workspaceWindowRequestedOpen ? '收起窗口区域' : '打开窗口区域'"
          :aria-expanded="workspaceWindowOpen"
          :aria-busy="workspaceWindowRequestedOpen && !workspaceWindowOpen ? 'true' : undefined"
          aria-controls="conversation-workspace-window"
          :style="{ '--workspace-window-icon-color': workspaceWindowOpen ? '#191c1f' : '#88898a' }"
          @click="setWorkspaceWindowOpen(!workspaceWindowRequestedOpen)"
        >
          <!-- Panel 与 Viewer 同步更新，图标直接跟随本轮目标状态。 -->
          <CodexPanelToggle
            icon-only
            :is-open="workspaceWindowOpen || workspaceWindowRequestedOpen"
            :size="24"
            color="currentColor"
            aria-hidden="true"
          />
        </button>

        <div class="main-conversation-pane">
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
        <div
          ref="timelineEl"
          class="timeline"
          @scroll.passive="handleTimelineScroll"
          @wheel.passive="noteTimelineUserScrollIntent"
          @touchstart.passive="noteTimelineUserScrollIntent"
          @pointerdown="noteTimelineUserScrollIntent"
          @click="handleTimelineClick"
        >
          <div v-if="showConversationEmpty" class="empty">
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
            <template v-if="isInteractionThreadRoot(event)">
              <ProcessDisclosure
                v-if="mergedThreadSteps(event).length || threadRunning(event)"
                :steps="mergedThreadSteps(event)"
                :running="threadRunning(event)"
                :awaiting="threadAwaiting(event)"
                :duration-ms="threadDurationMs(event)"
                :render-markdown="renderStreamingMarkdown"
                @layout-change="syncTimelineNavigationAfterLayout"
              />
              <!-- 候选答案始终在思考竖线之外流式展示；工具调用旁白仍由
                   ProcessDisclosure 承载，assistant_end 会负责两者之间的归类。 -->
              <template v-if="isStreamingUnderEvent(event) && streamingAnswerPreview">
                <div
                  v-if="streamingAnswerHtml"
                  class="message-md streaming-answer"
                  v-html="streamingAnswerHtml"
                />
                <div v-else class="message-md streaming-answer streaming-answer-plain">{{ streamingAnswerPreview }}</div>
                <div v-if="streamingSources.length" class="answer-trust">
                  <SourceChips :items="streamingSources" @open-source="openConversationSource" />
                </div>
              </template>
              <TurnOutcomeNotice v-if="threadOutcomeNotice(event)" v-bind="threadOutcomeNotice(event)!" />
              <template v-if="threadOutsideAnswer(event)">
                <div class="message-md" v-html="renderMarkdown(threadOutsideAnswer(event))" />
                <div
                  v-if="threadSources(event).length"
                  class="answer-trust"
                >
                  <SourceChips :items="threadSources(event)" @open-source="openConversationSource" />
                </div>
                <AssistantActions
                  v-if="threadFinalNode(event) && eventCanUseAnswerActions(threadFinalNode(event))"
                  :time="formatTime(threadFinalNode(event).created_at)"
                  :content="threadOutsideAnswer(event)"
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
                :render-markdown="renderStreamingMarkdown"
                @layout-change="syncTimelineNavigationAfterLayout"
              /><!-- 0703:挂反问时后端已收工,是"等你选择"不是"正在思考"(两分支口径统一) -->
              <TurnOutcomeNotice v-if="eventOutcomeNotice(event)" v-bind="eventOutcomeNotice(event)!" />
              <div v-if="event.role !== 'assistant'" class="event-top">
                <span class="role">{{ eventRoleLabel(event) }}</span>
                <time v-if="event.created_at">{{ formatTime(event.created_at) }}</time>
              </div>
              <div
                v-if="event.role !== 'assistant'"
                class="user-message-wrap"
                :class="{
                  expanded: isUserMessageExpanded(event.id),
                  collapsible: shouldCollapseUserMessage(event),
                }"
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
                    @click.stop="openMessageAttachmentViewer(file, event)"
                  >
                    <span class="user-attachment-icon" :class="{ markdown: isMarkdownAttachment(file) }" aria-hidden="true">
                      <MarkdownFileIcon
                        v-if="isMarkdownAttachment(file)"
                        :size="18"
                        :font-size="7"
                        :radius="6"
                      />
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
                  <div
                    :id="userMessageContentId(event.id)"
                    v-user-message-overflow="event.id"
                    class="user-message-content user-message-markdown"
                    v-html="renderMarkdown(userMessageText(event))"
                  />
                  <button
                    v-if="shouldCollapseUserMessage(event)"
                    class="user-message-more"
                    type="button"
                    :aria-controls="userMessageContentId(event.id)"
                    :aria-expanded="isUserMessageExpanded(event.id)"
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
              <!-- 纯反问不显示正文；复合目标已经完成的只读答案必须在确认写入前正常显示。 -->
              <template v-else-if="shouldRenderStandaloneAssistantAnswer(event)">
                <div class="message-md" v-html="renderMarkdown(eventDisplayContent(event))" />
                <div v-if="eventSources(event).length" class="answer-trust">
                  <SourceChips :items="eventSources(event)" @open-source="openConversationSource" />
                </div>
                <AssistantActions v-if="eventCanUseAnswerActions(event)" :time="formatTime(event.created_at)" :content="eventDisplayContent(event)" :is-last="event.id === lastAssistantId" />
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
                    :render-markdown="renderStreamingMarkdown"
                    @layout-change="syncTimelineNavigationAfterLayout"
                  />
                  <TurnOutcomeNotice v-if="eventOutcomeNotice(responseEvent)" v-bind="eventOutcomeNotice(responseEvent)!" />
                  <template v-if="eventHasAnswerContent(responseEvent)">
                    <div class="message-md" v-html="renderMarkdown(eventDisplayContent(responseEvent))" />
                    <div v-if="eventSources(responseEvent).length" class="answer-trust">
                      <SourceChips :items="eventSources(responseEvent)" @open-source="openConversationSource" />
                    </div>
                    <AssistantActions v-if="eventCanUseAnswerActions(responseEvent)" :time="formatTime(responseEvent.created_at)" :content="eventDisplayContent(responseEvent)" :is-last="responseEvent.id === lastAssistantId" />
                  </template>
                </article>
              </div>
              <div v-if="isStreamingUnderEvent(event) && streamingTurnVisible" class="continuation-responses">
                <article class="continuation-response streaming-inline-response">
                  <ProcessDisclosure
                    v-if="streamingProcess.steps.length || procRunning"
                    :steps="streamingProcess.steps"
                    :running="procRunning"
                    :duration-ms="procDurationMs"
                    :render-markdown="renderStreamingMarkdown"
                    @layout-change="syncTimelineNavigationAfterLayout"
                  />
                  <TurnOutcomeNotice v-if="streamingOutcomeNotice" v-bind="streamingOutcomeNotice" />
                  <div
                    v-if="streamingAnswerPreview && streamingAnswerHtml"
                    class="message-md streaming-answer"
                    v-html="streamingAnswerHtml"
                  />
                  <div v-else-if="streamingAnswerPreview" class="message-md streaming-answer streaming-answer-plain">{{ streamingAnswerPreview }}</div>
                  <div v-if="streamingAnswerPreview && streamingSources.length" class="answer-trust">
                    <SourceChips :items="streamingSources" @open-source="openConversationSource" />
                  </div>
                </article>
              </div>
            </template>
          </article>
          <article
            v-if="pendingUserSubmissionVisible"
            class="event user-event pending-user-event"
            aria-label="正在发送的提问"
            aria-live="polite"
          >
            <div
              class="user-message-wrap"
              :class="{
                expanded: isUserMessageExpanded(PENDING_USER_MESSAGE_ID),
                collapsible: shouldCollapsePendingUserMessage,
              }"
            >
              <div class="user-message-bubble">
                <div
                  :id="userMessageContentId(PENDING_USER_MESSAGE_ID)"
                  v-user-message-overflow="PENDING_USER_MESSAGE_ID"
                  class="user-message-content user-message-markdown"
                  v-html="renderMarkdown(pendingUserSubmissionText)"
                />
                <button
                  v-if="shouldCollapsePendingUserMessage"
                  class="user-message-more"
                  type="button"
                  :aria-controls="userMessageContentId(PENDING_USER_MESSAGE_ID)"
                  :aria-expanded="isUserMessageExpanded(PENDING_USER_MESSAGE_ID)"
                  @click="toggleUserMessageExpanded(PENDING_USER_MESSAGE_ID)"
                >
                  {{ isUserMessageExpanded(PENDING_USER_MESSAGE_ID) ? '收起' : '显示更多' }}
                </button>
              </div>
            </div>
          </article>
          <article v-if="streamingAssistantStandaloneVisible" class="assistant-message streaming-message">
            <ProcessDisclosure
              v-if="streamingProcess.steps.length || procRunning"
              :steps="streamingProcess.steps"
              :running="procRunning"
              :duration-ms="procDurationMs"
              :render-markdown="renderStreamingMarkdown"
              @layout-change="syncTimelineNavigationAfterLayout"
            />
            <TurnOutcomeNotice v-if="streamingOutcomeNotice" v-bind="streamingOutcomeNotice" />
            <div
              v-if="streamingAnswerPreview && streamingAnswerHtml"
              class="message-md streaming-answer"
              v-html="streamingAnswerHtml"
            />
            <div v-else-if="streamingAnswerPreview" class="message-md streaming-answer streaming-answer-plain">{{ streamingAnswerPreview }}</div>
            <div v-if="streamingAnswerPreview && streamingSources.length" class="answer-trust">
              <SourceChips :items="streamingSources" @open-source="openConversationSource" />
            </div>
          </article>
          <Transition name="thinking-orb-status">
            <ThinkingOrbStatus v-if="thinkingOrbVisible" />
          </Transition>
        </div>

        <div class="composer-anchor">
          <transition name="fab-fade">
            <button
              v-show="events.length > 0 && !isAtBottom"
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
            ref="composerRef"
            v-model="composerDraft"
            :sending="sending"
            :stopping="cancelRequested"
            :uploading="preparingSend"
            :placeholder="composerPlaceholder"
            :question="composerQuestion"
            :local-account-id="String(currentUser?.id || '')"
            :attachment-storage-key="composerAttachmentStorageKey"
            :model-options="composerModelOptions"
            :model-value-id="selectedLlmProviderId"
            :model-disabled="modelConfigLoading"
            @model-open="refreshComposerModels"
            @model-change="handleComposerModelChange"
            @send="onComposerSend"
            @answer="onComposerAnswer"
            @stop="stopFoundationTurn"
            @notice="showComposerToast"
          />
        </footer>
          </section>
        </div>
      <div
        v-if="currentView === 'conversation'"
        class="conversation-info-rail-slot"
        :class="{
          collapsed: infoRailCollapsed,
          'viewer-open': workspaceWindowOpen,
          'viewer-transitioning': workspaceWindowLayoutActive,
        }"
      >
        <ConversationInfoRail
          :collapsed="infoRailCollapsed"
          :viewer-open="workspaceWindowOpen"
          :changes="recentKnowledgeChanges"
          :changes-loading="knowledgeChangesLoading"
          :changes-error="knowledgeChangesError"
          :files="recentSessionFiles"
          :files-loading="sessionFilesLoading"
          :files-error="sessionFilesError"
          :session-id="activeSessionId"
          @open-change="openInfoRailChange"
          @open-file="openInfoRailFile"
          @open-change-list="openInfoRailChangeList"
          @open-file-list="openInfoRailFileList"
        />
      </div>
      <Transition
        name="workspace-window"
        @after-enter="focusWorkspaceAfterEnter"
        @after-leave="finishWorkspaceWindowLeave"
        @leave-cancelled="keepWorkspaceWindowLayout"
      >
        <aside
          v-if="currentView === 'conversation' && workspaceWindowOpen"
          id="conversation-workspace-window"
          class="conversation-workspace-window"
          aria-label="窗口区域"
        >
          <div
            class="workspace-resize-handle"
            role="separator"
            tabindex="0"
            aria-label="调整 Viewer 宽度"
            aria-orientation="vertical"
            :aria-valuemin="workspaceWindowWidthRange.min"
            :aria-valuemax="workspaceWindowWidthRange.max"
            :aria-valuenow="workspaceWindowWidthPx"
            :aria-valuetext="`Viewer 宽度 ${workspaceWindowWidthPx} 像素`"
            title="拖拽调整 Viewer 宽度；方向键微调"
            @pointerdown="beginWorkspaceResize"
            @pointermove="moveWorkspaceResize"
            @pointerup="finishWorkspaceResize"
            @pointercancel="finishWorkspaceResize"
            @lostpointercapture="finishWorkspaceResize"
            @keydown="handleWorkspaceResizeKeydown"
          >
            <span class="workspace-resize-grip" aria-hidden="true" />
          </div>
          <ConversationWorkspace
            ref="workspaceRef"
            :tabs="workspaceTabs"
            :active-id="activeWorkspaceTabId"
            @select="selectWorkspaceTab"
            @close="closeWorkspaceTab"
            @open-source="openWorkspaceSource"
            @retry-file="retryWorkspaceFile"
            @retry-change="retryWorkspaceChange"
            @open-change-list-item="openWorkspaceChangeFromList"
            @load-more-change-list="loadMoreWorkspaceChangeList"
            @retry-change-list="retryWorkspaceChangeList"
            @open-file-list-item="openWorkspaceFileFromList"
            @load-more-file-list="loadMoreWorkspaceFileList"
            @retry-file-list="retryWorkspaceFileList"
          />
        </aside>
      </Transition>
      </section>
    </section>

  </main>
</template>

<script setup lang="ts">
import { computed, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, type Directive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { readLocalAuthToken } from '@/utils/authNavigation'
import whaleIntroUrl from './assets/whale-intro.webm'
import VibeWindowControls from './components/VibeWindowControls.vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ApiGetJoinProjects } from '@/api/project/index'
import ProcessDisclosure from './components/ProcessDisclosure.vue'
import ThinkingOrbStatus from './components/ThinkingOrbStatus.vue'
import ProjectSwitchDialog from './components/ProjectSwitchDialog.vue'
import {
  beginProjectSwitch,
  completeProjectSwitch,
  failProjectSwitch,
  isProjectSwitchCurrent,
  markProjectSwitchContentLoaded,
  markProjectSwitchSessionsLoaded,
  createProjectSwitchDialogState,
  projectSwitchRequest,
  closeProjectSwitchDialog as closeProjectSwitchDialogState,
  type ProjectSwitchDialogState,
  type ProjectSwitchRequest,
} from './projectSwitchDialogPolicy'
import {
  continuationParentEventId,
  eventThreadRootId as resolveEventThreadRootId,
  interactionReplyParentEventId,
  isResolvedInteractionThreadRoot,
  parentContinuationResponses as resolveParentContinuationResponses,
  resolvedInteractionRootAnswerText,
  shouldRenderStandaloneAssistantBody,
  shouldRenderThreadEvent,
  threadFinalAnswerText,
} from './conversationThreadPolicy'
import { nextTimelineFollow, timelineLayoutAction } from './timelineFollowPolicy'
import { shouldShowConversationEmptyState } from './conversationEmptyStatePolicy'
import ScrollDownIcon from './components/icons/ScrollDownIcon.vue'
import RingSpinner from './components/icons/RingSpinner.vue'
import CodexPanelToggleMirroredStatic from '@/assets/svg/common/CodexPanelToggleMirroredStatic.vue'
import CodexListFilter from '@/assets/svg/common/CodexListFilter.vue'
import CodexPanelToggle from '@/assets/svg/common/CodexPanelToggle.vue'
import MarkdownFileIcon from './components/icons/MarkdownFileIcon.vue'
import AssistantActions from './components/AssistantActions.vue'
import SourceChips from './components/SourceChips.vue'
import ChatComposer from './components/ChatComposer.vue'
import ConversationInfoRail from './components/ConversationInfoRail.vue'
import ConversationWorkspace from './components/ConversationWorkspace.vue'
import TurnOutcomeNotice from './components/TurnOutcomeNotice.vue'
import {
  createProcessState,
  resetProcessState,
  stepsFromMeta,
  durationFromMeta,
  type ProcessStep,
} from './composables/useProcessTurn'
import {
  applyTurnProtocolPacket,
  applyTurnProtocolEvents,
  createTurnProtocolState,
  hasTurnProtocolPacket,
  protocolEventsFromMeta,
  readSessionTurnPublic,
  readTurnProtocol,
  readTurnProtocolFromMeta,
  type TurnProtocolReadModel,
  type TurnProtocolOutcome,
  type TurnProtocolState,
} from './composables/turnProtocol'
import {
  localTurnPresentation,
  preferredProcessDuration,
  shouldShowMissingTerminalNotice,
} from './turnPresentationPolicy'
import {
  getVibeCapabilities,
  getVibeProjectByAsyncProject,
  initVibeProject,
  getVibeLLMModelPicker,
  getKnowledgeCommit,
  getKnowledgeCommits,
  getKnowledgeSource,
  streamKnowledgeActivity,
  getFoundationKnowledgeStatsMany,
  updateVibeProject,
  type FoundationAgentRun,
  type KnowledgeActivityEvent,
  type KnowledgeCommitSummary,
  type VibeAttachment,
  type VibeEvent,
  type VibeLLMModelPickerProvider,
  type VibeProject,
  type VibeSession,
} from '../api'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'
type VibeAgentEvent = Record<string, any>
import {
  collectKnowledgeStatsProjectIds,
  knowledgeStatsProjectId,
  readKnowledgeStats,
  writeKnowledgeStats,
  type KnowledgeStats,
} from './projectStatsPolicy'
import {
  advanceKnowledgeChangeCursor,
  attachmentIdentity,
  recentSessionFiles as deriveRecentSessionFiles,
  type RecentSessionFile,
} from './conversationInfoRailPolicy'
import { knowledgeChangeTitle } from '../browser/knowledgeChangePresentation'
import {
  closeViewerTab,
  deletedConversationIsStillActive,
  snapshotWorkspaceViewerConversation,
  upsertViewerTab,
  workspaceChangeViewerTabId,
  workspaceChangeListCanLoadMore,
  workspaceChangeListViewerTabId,
  workspaceFileListViewerTabId,
  workspaceFileListCanLoadMore,
  WORKSPACE_CHANGE_LIST_INITIAL_PAGE_SIZE,
  WORKSPACE_CHANGE_LIST_PAGE_SIZE,
  WORKSPACE_FILE_LIST_INITIAL_PAGE_SIZE,
  WORKSPACE_FILE_LIST_PAGE_SIZE,
  mergeKnowledgeChangeSummaries,
  WorkspaceViewerConversationStore,
  workspaceViewerConversationKey,
  workspaceFileLocatorSignature,
  workspaceFileViewerTabId,
  workspaceInlineFileContent,
  WorkspaceViewerRequestGate,
  workspaceViewerTabNeedsReload,
  type WorkspaceChangeViewerTab,
  type WorkspaceChangeListViewerTab,
  type WorkspaceFileListViewerTab,
  type WorkspaceFileViewerTab,
  type WorkspaceViewerRequestToken,
  type WorkspaceViewerTab,
} from './workspaceViewerPolicy'
import {
  requestWorkspaceViewerOpen,
  setWorkspacePanelPreference,
  workspacePanelCollapsed,
  type WorkspacePanelPreference,
  type WorkspacePanelViewerState,
} from './workspacePanelPolicy'
import {
  clampWorkspaceViewerWidth,
  defaultWorkspaceViewerWidth,
  draggedWorkspaceViewerWidth,
  WORKSPACE_VIEWER_DEFAULT_MAX_PX,
  WORKSPACE_VIEWER_KEYBOARD_STEP_PX,
  WORKSPACE_VIEWER_MAX_PX,
  WORKSPACE_VIEWER_MIN_PX,
  workspaceViewerWidthRange,
} from './workspaceResizePolicy'
import {
  clampVibeSideWidth,
  draggedVibeSideWidth,
  VIBE_SIDE_WIDTH_DEFAULT_PX,
  VIBE_SIDE_WIDTH_KEYBOARD_STEP_PX,
  vibeSideWidthRange,
} from './sideResizePolicy'
import {
  normalizeConversationSourceCitation,
  sourceCitationHasReadableRange,
  sourceCitationViewerIdentity,
  type ConversationSourceCitation,
} from './sourceCitationPolicy'
import {
  userMessageContentOverflows,
  userMessageLikelyOverflows,
} from './userMessagePresentationPolicy'

const projects = ref<any[]>([])
const selectedProject = ref<any | null>(null)
const selectedProjectId = ref<string | number | null>(null)
const vibeProject = ref<VibeProject | null>(null)
const projectSwitchDialogOpen = ref(false)
const projectSwitchState = ref<ProjectSwitchDialogState>(createProjectSwitchDialogState())
const projectSwitchRequestToken = ref<ProjectSwitchRequest | null>(null)
const projectSwitchTargetId = ref('')
const projectSwitchPhase = computed(() => projectSwitchState.value.phase)
const projectSwitchError = computed(() => projectSwitchState.value.error)
const projectSwitchTargetProject = computed(() => projectSwitchState.value.targetProject as any)
const projectListRefreshing = ref(false)
const projectListRefreshError = ref('')
let projectListRefreshEpoch = 0
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
const composerRef = ref<InstanceType<typeof ChatComposer> | null>(null)
const recentSessionFiles = computed(() => deriveRecentSessionFiles(events.value, activeSessionId.value))
// 会话事件接口目前返回完整历史，没有独立文件分页端点；列表页签从同一份
// 权威事件快照派生全量文件，再按 20 + 10 的稳定身份游标分页展示。
const allSessionFiles = computed(() => deriveRecentSessionFiles(
  events.value,
  activeSessionId.value,
  Number.MAX_SAFE_INTEGER,
))
const sessionFilesLoading = ref(false)
const sessionFilesError = ref('')
let sessionRequestEpoch = 0
const currentView = ref<'conversation' | 'baseline'>('conversation')
const loading = ref(false)
const vibeCapabilities = ref<Record<string, boolean>>({})
const canViewTraceAudit = computed(() => !!vibeCapabilities.value.trace_audit)
const {
  profile: currentUser,
  avatarUrl: currentUserAvatar,
  avatarRenderKey: currentUserAvatarRenderKey,
  fetchProfile,
  ensureProfileSync,
} = useCurrentUserProfile()
const currentUserName = computed(() => String(currentUser.value?.display_name || currentUser.value?.nick_name || currentUser.value?.username || '用户'))
function localAccountId(): string {
  const value = String(currentUser.value?.id || '').trim()
  if (!value) throw new Error('当前账号身份无效，请重新登录')
  return value
}
const llmProviders = ref<VibeLLMModelPickerProvider[]>([])
const selectedLlmProviderId = ref('')
const modelConfigLoading = ref(false)
let modelConfigRequestEpoch = 0
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
// Foundation 知识事实按外层 AsyncTest 数字项目 ID 隔离；Vibe UUID 只归属会话运行态。
const projectStatsMap = reactive<Record<string, KnowledgeStats>>({})
const recentKnowledgeChanges = ref<KnowledgeCommitSummary[]>([])
const knowledgeChangesLoading = ref(false)
const knowledgeChangesError = ref('')
const infoRailPreference = ref<WorkspacePanelPreference>({ collapsed: false, revision: 0 })
const workspacePanelViewerState = ref<WorkspacePanelViewerState>({
  requestedOpen: false,
  autoCollapsedPanelRevision: null,
})
const infoRailCollapsed = computed(() => workspacePanelCollapsed(
  infoRailPreference.value,
  workspacePanelViewerState.value,
))
const workspaceWindowOpen = ref(false)
const workspaceWindowRequestedOpen = computed(() => workspacePanelViewerState.value.requestedOpen)
const workspaceWindowLayoutActive = ref(false)
const shellRef = ref<HTMLElement | null>(null)
const mainRef = ref<HTMLElement | null>(null)
const SIDE_WIDTH_STORAGE_KEY = 'vibe_kb_side_width_px'
const initialShellWidthPx = typeof window !== 'undefined' ? Math.max(0, Math.round(window.innerWidth)) : 0
const storedSideWidth = Number(localStorage.getItem(SIDE_WIDTH_STORAGE_KEY))
const requestedSideWidth = Number.isFinite(storedSideWidth) && storedSideWidth > 0
  ? Math.round(storedSideWidth)
  : VIBE_SIDE_WIDTH_DEFAULT_PX
const shellWidthPx = ref(initialShellWidthPx)
const sideWidthPx = ref(clampVibeSideWidth(requestedSideWidth, initialShellWidthPx))
const sideWidthRange = computed(() => vibeSideWidthRange(shellWidthPx.value))
const sideResizeHandleRef = ref<HTMLElement | null>(null)
const sideResizing = ref(false)
type SideResizeSession = {
  pointerId: number
  startClientX: number
  startWidth: number
  moved: boolean
}
let sideResizeSession: SideResizeSession | null = null
let shellResizeObserver: ResizeObserver | null = null
let shellResizeFallbackRegistered = false
const WORKSPACE_WINDOW_WIDTH_STORAGE_KEY = 'vibe_conversation_workspace_width_px'
const storedWorkspaceWindowWidth = Number(localStorage.getItem(WORKSPACE_WINDOW_WIDTH_STORAGE_KEY))
const workspaceWindowPreferredWidthPx = ref(
  Number.isFinite(storedWorkspaceWindowWidth) && storedWorkspaceWindowWidth > 0
    ? Math.min(WORKSPACE_VIEWER_MAX_PX, Math.max(WORKSPACE_VIEWER_MIN_PX, Math.round(storedWorkspaceWindowWidth)))
    : 0,
)
const workspaceMainWidthPx = ref(0)
const workspaceWindowWidthRange = computed(() => workspaceViewerWidthRange(workspaceMainWidthPx.value))
const workspaceWindowWidthPx = computed(() => {
  if (!workspaceMainWidthPx.value) {
    return workspaceWindowPreferredWidthPx.value || WORKSPACE_VIEWER_DEFAULT_MAX_PX
  }
  const requested = workspaceWindowPreferredWidthPx.value
    || defaultWorkspaceViewerWidth(workspaceMainWidthPx.value)
  return clampWorkspaceViewerWidth(requested, workspaceMainWidthPx.value)
})
const workspaceWindowStyle = computed<Record<string, string>>(() => ({
  '--workspace-window-width': `${workspaceWindowWidthPx.value}px`,
  '--vibe-side-width': `${sideWidthPx.value}px`,
}))
const workspaceWindowResizing = ref(false)
type WorkspaceResizeSession = {
  pointerId: number
  startClientX: number
  startWidth: number
  moved: boolean
}
let workspaceResizeSession: WorkspaceResizeSession | null = null
let workspaceMainResizeObserver: ResizeObserver | null = null
let workspaceResizeFallbackRegistered = false
const workspaceTabs = ref<WorkspaceViewerTab[]>([])
const activeWorkspaceTabId = ref<string | null>(null)
const workspaceRef = ref<InstanceType<typeof ConversationWorkspace> | null>(null)
const workspaceConversationStore = new WorkspaceViewerConversationStore()
const workspaceRequestGate = new WorkspaceViewerRequestGate()
// 文件列表页签使用会话级快照，避免切换会话后把当前 events 当成旧会话数据。
const workspaceSessionFileSnapshots = new Map<string, RecentSessionFile[]>()
const workspaceFileListRequests = new Map<string, Promise<void>>()
const workspaceChangeListRequests = new Map<string, Promise<void>>()
const sessionEventsRequests = new Map<string, Promise<VibeEvent[]>>()
let workspaceFocusAfterEnter = false
let projectContextEpoch = 0
let knowledgeActivityEpoch = 0
let knowledgeActivityAbort: AbortController | null = null
let knowledgeActivityRetryTimer: ReturnType<typeof setTimeout> | null = null
let knowledgeActivityCursor = 0
let knowledgeChangesFetchedCursor = 0
let knowledgeChangesRequest: Promise<void> | null = null
let knowledgeChangesRequestKey = ''
let allKbStatsRequest: Promise<void> | null = null
const currentKbStatsRequests = new Map<string, Promise<void>>()
async function loadModelConfig(sessionId = activeSessionId.value, opts: { silent?: boolean } = {}) {
  const requestEpoch = ++modelConfigRequestEpoch
  if (!opts.silent) modelConfigLoading.value = true
  try {
    const picker = await getVibeLLMModelPicker()
    if (requestEpoch !== modelConfigRequestEpoch) return
    const providers = (picker.providers || []).filter((item) => item.enabled !== false)
    llmProviders.value = providers
    let localProviderId = String(sessions.value.find(item => item.id === sessionId)?.llm_provider_id || '')
    if (sessionId && !localProviderId) {
      const manifestRequest = electronAgentBridge()?.sessions?.manifest?.({
        sessionId,
        accountId: localAccountId(),
      })
      const manifest: any = manifestRequest ? await manifestRequest.catch(() => null) : null
      if (requestEpoch !== modelConfigRequestEpoch) return
      localProviderId = String(manifest?.provider_id || '')
    }
    // 本地绑定只有在账号当前仍可见时才生效；撤权或禁用后使用
    // 当前权威默认值，后续发送准入会把新选择写回本地 Session。
    const candidate = String(picker.selected_provider_id || '')
    const preferred = localProviderId && providers.some(item => item.id === localProviderId)
      ? localProviderId
      : candidate
    selectedLlmProviderId.value = providers.some((item) => item.id === preferred) ? preferred : (providers[0]?.id || '')
  } finally {
    if (requestEpoch === modelConfigRequestEpoch) modelConfigLoading.value = false
  }
}

function applySessionModel(sessionId: string, providerId: string) {
  sessions.value = sessions.value.map(item => item.id === sessionId ? { ...item, llm_provider_id: providerId } : item)
}

async function persistSessionModel(sessionId: string, providerId: string) {
  const api = electronAgentBridge()?.sessions
  if (!api?.update) throw new Error('本地会话存储不可用')
  return await api.update({ sessionId, accountId: localAccountId(), providerId })
}

async function refreshComposerModels() {
  await loadModelConfig(activeSessionId.value, { silent: true })
}

async function ensureComposerModelUsable(contextGuard?: () => boolean) {
  try {
    if (contextGuard && !contextGuard()) return false
    if (!llmProviders.value.length) await loadModelConfig(activeSessionId.value, { silent: true })
    if (contextGuard && !contextGuard()) return false
    let providers = llmProviders.value.filter((item) => item.enabled !== false)
    let selected = selectedLlmProviderId.value
    if (!selected || !providers.some((item) => item.id === selected)) {
      await loadModelConfig(activeSessionId.value, { silent: true })
      if (contextGuard && !contextGuard()) return false
      providers = llmProviders.value.filter((item) => item.enabled !== false)
      selected = selectedLlmProviderId.value
    }
    if (contextGuard && !contextGuard()) return false
    if (selected && providers.some((item) => item.id === selected)) {
      if (activeSessionId.value) {
        const current = sessions.value.find((item) => item.id === activeSessionId.value)
        if (current?.llm_provider_id !== selected) {
          if (contextGuard && !contextGuard()) return false
          const updated = await persistSessionModel(activeSessionId.value, selected)
          if (contextGuard && !contextGuard()) return false
          applySessionModel(activeSessionId.value, updated.llm_provider_id || updated.provider_id || selected)
        }
      }
      return true
    }
    if (!selected && providers[0]?.id) {
      selectedLlmProviderId.value = providers[0].id
      if (activeSessionId.value) {
        if (contextGuard && !contextGuard()) return false
        const updated = await persistSessionModel(activeSessionId.value, providers[0].id)
        if (contextGuard && !contextGuard()) return false
        applySessionModel(activeSessionId.value, updated.llm_provider_id || updated.provider_id || providers[0].id)
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
  const contextEpoch = projectContextEpoch
  const contextProjectId = String(selectedProjectId.value ?? '')
  selectedLlmProviderId.value = providerId
  if (!activeSessionId.value) return
  try {
    const updated = await persistSessionModel(activeSessionId.value, providerId)
    if (contextEpoch !== projectContextEpoch
      || contextProjectId !== String(selectedProjectId.value ?? '')) return
    applySessionModel(activeSessionId.value, updated.llm_provider_id || updated.provider_id || providerId)
  } catch (error: any) {
    if (contextEpoch !== projectContextEpoch
      || contextProjectId !== String(selectedProjectId.value ?? '')) return
    ElMessage.error(`模型切换失败：${error?.message || String(error)}`)
    await loadModelConfig(activeSessionId.value)
  }
}

function loadKbStats(): Promise<void> {
  if (allKbStatsRequest) return allKbStatsRequest
  const projectIds = collectKnowledgeStatsProjectIds(projects.value || [])
  if (!projectIds.length) return Promise.resolve()
  allKbStatsRequest = (async () => {
    try {
      const payload = await getFoundationKnowledgeStatsMany(projectIds)
      projectIds.forEach(projectId => writeKnowledgeStats(projectStatsMap, payload, projectId))
    } catch { /* 概览读取失败不阻塞主流程 */ }
  })()
  return allKbStatsRequest
}

function loadCurrentKbStats(projectValue = selectedProjectId.value): Promise<void> {
  const projectId = knowledgeStatsProjectId(projectValue)
  if (!projectId) return Promise.resolve()
  const existing = currentKbStatsRequests.get(projectId)
  if (existing) return existing
  const request = (async () => {
    try {
      const payload = await getFoundationKnowledgeStatsMany([projectId])
      writeKnowledgeStats(projectStatsMap, payload, projectId)
    } catch { /* 当前项目计数读取失败不阻塞对话 */ }
  })()
  currentKbStatsRequests.set(projectId, request)
  void request.finally(() => {
    if (currentKbStatsRequests.get(projectId) === request) currentKbStatsRequests.delete(projectId)
  })
  return request
}

function stopKnowledgeActivity() {
  knowledgeActivityEpoch += 1
  knowledgeActivityAbort?.abort()
  knowledgeActivityAbort = null
  if (knowledgeActivityRetryTimer) {
    clearTimeout(knowledgeActivityRetryTimer)
    knowledgeActivityRetryTimer = null
  }
  knowledgeChangesRequest = null
  knowledgeChangesRequestKey = ''
}

function waitForKnowledgeActivityRetry(signal: AbortSignal, delay = 1800): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) { resolve(); return }
    const finish = () => {
      if (knowledgeActivityRetryTimer) clearTimeout(knowledgeActivityRetryTimer)
      knowledgeActivityRetryTimer = null
      signal.removeEventListener('abort', finish)
      resolve()
    }
    knowledgeActivityRetryTimer = setTimeout(finish, delay)
    signal.addEventListener('abort', finish, { once: true })
  })
}

function loadRecentKnowledgeChanges(projectId: string, epoch: number): Promise<void> {
  if (!projectId || epoch !== knowledgeActivityEpoch) return Promise.resolve()
  const key = `${epoch}:${projectId}`
  if (knowledgeChangesRequest && knowledgeChangesRequestKey === key) return knowledgeChangesRequest
  knowledgeChangesLoading.value = true
  knowledgeChangesError.value = ''
  const request = (async () => {
    try {
      const page = await getKnowledgeCommits(projectId, { limit: 5 })
      if (epoch !== knowledgeActivityEpoch || projectId !== knowledgeStatsProjectId(selectedProjectId.value)) return
      recentKnowledgeChanges.value = Array.isArray(page.items) ? page.items.slice(0, 5) : []
      knowledgeChangesFetchedCursor = Math.max(
        0,
        ...recentKnowledgeChanges.value.map(item => Number(item.seq || 0)),
      )
      knowledgeActivityCursor = Math.max(knowledgeActivityCursor, knowledgeChangesFetchedCursor)
    } catch (reason) {
      if (epoch !== knowledgeActivityEpoch) return
      knowledgeChangesError.value = reason instanceof Error ? reason.message : String(reason)
    } finally {
      if (epoch === knowledgeActivityEpoch) knowledgeChangesLoading.value = false
    }
  })()
  knowledgeChangesRequest = request
  knowledgeChangesRequestKey = key
  void request.finally(() => {
    if (knowledgeChangesRequest === request) {
      knowledgeChangesRequest = null
      knowledgeChangesRequestKey = ''
    }
  })
  return request
}

function acceptKnowledgeActivity(event: KnowledgeActivityEvent, projectId: string, epoch: number): boolean {
  if (epoch !== knowledgeActivityEpoch) return false
  const advanced = advanceKnowledgeChangeCursor(knowledgeActivityCursor, projectId, event)
  if (!advanced.changed) return false
  knowledgeActivityCursor = advanced.cursor
  void loadRecentKnowledgeChanges(projectId, epoch)
  void loadCurrentKbStats(projectId)
  return true
}

async function runKnowledgeActivity(
  projectId: string,
  epoch: number,
  controller: AbortController,
  initialRequest: Promise<void>,
) {
  await initialRequest
  while (epoch === knowledgeActivityEpoch && !controller.signal.aborted) {
    let opened = false
    let receivedChange = false
    try {
      await streamKnowledgeActivity(projectId, knowledgeActivityCursor, controller.signal, {
        onOpen: () => { opened = true },
        onEvent: (event) => {
          if (acceptKnowledgeActivity(event as KnowledgeActivityEvent, projectId, epoch)) {
            receivedChange = true
          }
        },
      })
    } catch {
      if (controller.signal.aborted || epoch !== knowledgeActivityEpoch) return
    }
    if (controller.signal.aborted || epoch !== knowledgeActivityEpoch) return
    // 只有真正连上后又断开的连接才补拉一次摘要；Redis 不可用时不会退化成轮询。
    if (opened && (!receivedChange || knowledgeChangesFetchedCursor < knowledgeActivityCursor)) {
      await loadRecentKnowledgeChanges(projectId, epoch)
    }
    await waitForKnowledgeActivityRetry(controller.signal)
  }
}

function startKnowledgeActivity(projectValue: unknown): void {
  stopKnowledgeActivity()
  recentKnowledgeChanges.value = []
  knowledgeChangesError.value = ''
  knowledgeChangesLoading.value = false
  knowledgeActivityCursor = 0
  knowledgeChangesFetchedCursor = 0
  const projectId = knowledgeStatsProjectId(projectValue)
  if (!projectId) return
  const epoch = ++knowledgeActivityEpoch
  const controller = new AbortController()
  knowledgeActivityAbort = controller
  const initialRequest = loadRecentKnowledgeChanges(projectId, epoch)
  void runKnowledgeActivity(projectId, epoch, controller, initialRequest)
}

function initializeInfoRail() {
  const stored = localStorage.getItem('vibe_conversation_info_rail_collapsed')
  infoRailPreference.value = {
    collapsed: stored == null
      ? window.matchMedia('(max-width: 1180px)').matches
      : stored === '1',
    revision: 0,
  }
}

function setInfoRailCollapsed(collapsed: boolean) {
  // 只有显式操作写入全局偏好；修订号同时使其他会话里的旧恢复标记失效。
  infoRailPreference.value = setWorkspacePanelPreference(infoRailPreference.value, collapsed)
  workspacePanelViewerState.value = {
    ...workspacePanelViewerState.value,
    autoCollapsedPanelRevision: null,
  }
  localStorage.setItem('vibe_conversation_info_rail_collapsed', collapsed ? '1' : '0')
}

function toggleInfoRail() {
  setInfoRailCollapsed(!infoRailCollapsed.value)
}

function updateShellWidth(): void {
  const measuredWidth = shellRef.value?.getBoundingClientRect().width || 0
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0
  const nextWidth = Math.max(0, Math.round(measuredWidth || viewportWidth))
  shellWidthPx.value = nextWidth

  const nextSideWidth = clampVibeSideWidth(sideWidthPx.value, nextWidth)
  if (nextSideWidth !== sideWidthPx.value) sideWidthPx.value = nextSideWidth
}

function startShellResizeObserver(): void {
  updateShellWidth()
  if (typeof ResizeObserver !== 'undefined' && shellRef.value) {
    shellResizeObserver = new ResizeObserver(updateShellWidth)
    shellResizeObserver.observe(shellRef.value)
    return
  }
  window.addEventListener('resize', updateShellWidth)
  shellResizeFallbackRegistered = true
}

function stopShellResizeObserver(): void {
  shellResizeObserver?.disconnect()
  shellResizeObserver = null
  if (!shellResizeFallbackRegistered) return
  window.removeEventListener('resize', updateShellWidth)
  shellResizeFallbackRegistered = false
}

function persistSideWidth(): void {
  localStorage.setItem(SIDE_WIDTH_STORAGE_KEY, String(sideWidthPx.value))
}

function beginSideResize(event: PointerEvent): void {
  if (sideCollapsed.value || sideResizeSession || !event.isPrimary || event.button !== 0) return
  const handle = event.currentTarget as HTMLElement
  sideResizeSession = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startWidth: sideWidthPx.value,
    moved: false,
  }
  sideResizing.value = true
  handle.setPointerCapture(event.pointerId)
  event.preventDefault()
  event.stopPropagation()
}

function moveSideResize(event: PointerEvent): void {
  const session = sideResizeSession
  if (!session || session.pointerId !== event.pointerId) return
  if (event.clientX !== session.startClientX) session.moved = true
  sideWidthPx.value = draggedVibeSideWidth({
    startWidth: session.startWidth,
    startClientX: session.startClientX,
    clientX: event.clientX,
    containerWidth: shellWidthPx.value,
  })
  event.preventDefault()
}

function finishSideResize(event: PointerEvent): void {
  const session = sideResizeSession
  if (!session || session.pointerId !== event.pointerId) return
  sideResizeSession = null
  sideResizing.value = false
  const handle = event.currentTarget as HTMLElement
  if (handle.hasPointerCapture?.(session.pointerId)) {
    handle.releasePointerCapture(session.pointerId)
  }
  if (session.moved) persistSideWidth()
}

function handleSideResizeKeydown(event: KeyboardEvent): void {
  let requestedWidth: number | null = null
  if (event.key === 'ArrowLeft') {
    requestedWidth = sideWidthPx.value - VIBE_SIDE_WIDTH_KEYBOARD_STEP_PX
  } else if (event.key === 'ArrowRight') {
    requestedWidth = sideWidthPx.value + VIBE_SIDE_WIDTH_KEYBOARD_STEP_PX
  } else if (event.key === 'Home') {
    requestedWidth = sideWidthRange.value.min
  } else if (event.key === 'End') {
    requestedWidth = sideWidthRange.value.max
  }
  if (requestedWidth == null) return
  event.preventDefault()
  sideWidthPx.value = clampVibeSideWidth(requestedWidth, shellWidthPx.value)
  persistSideWidth()
}

function cancelSideResize(): void {
  sideResizeSession = null
  sideResizing.value = false
}

function updateWorkspaceMainWidth(): void {
  workspaceMainWidthPx.value = Math.max(
    0,
    Math.round(mainRef.value?.getBoundingClientRect().width || 0),
  )
}

function startWorkspaceMainWidthObserver(): void {
  updateWorkspaceMainWidth()
  if (typeof ResizeObserver !== 'undefined' && mainRef.value) {
    workspaceMainResizeObserver = new ResizeObserver(updateWorkspaceMainWidth)
    workspaceMainResizeObserver.observe(mainRef.value)
    return
  }
  window.addEventListener('resize', updateWorkspaceMainWidth)
  workspaceResizeFallbackRegistered = true
}

function stopWorkspaceMainWidthObserver(): void {
  workspaceMainResizeObserver?.disconnect()
  workspaceMainResizeObserver = null
  if (!workspaceResizeFallbackRegistered) return
  window.removeEventListener('resize', updateWorkspaceMainWidth)
  workspaceResizeFallbackRegistered = false
}

function persistWorkspaceWindowWidth(): void {
  localStorage.setItem(
    WORKSPACE_WINDOW_WIDTH_STORAGE_KEY,
    String(workspaceWindowWidthPx.value),
  )
}

function beginWorkspaceResize(event: PointerEvent): void {
  if (workspaceResizeSession || !event.isPrimary || event.button !== 0) return
  const handle = event.currentTarget as HTMLElement
  workspaceResizeSession = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startWidth: workspaceWindowWidthPx.value,
    moved: false,
  }
  workspaceWindowResizing.value = true
  handle.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function moveWorkspaceResize(event: PointerEvent): void {
  const session = workspaceResizeSession
  if (!session || session.pointerId !== event.pointerId) return
  if (event.clientX !== session.startClientX) session.moved = true
  workspaceWindowPreferredWidthPx.value = draggedWorkspaceViewerWidth({
    startWidth: session.startWidth,
    startClientX: session.startClientX,
    clientX: event.clientX,
    containerWidth: workspaceMainWidthPx.value,
  })
  event.preventDefault()
}

function finishWorkspaceResize(event: PointerEvent): void {
  const session = workspaceResizeSession
  if (!session || session.pointerId !== event.pointerId) return
  workspaceResizeSession = null
  workspaceWindowResizing.value = false
  const handle = event.currentTarget as HTMLElement
  if (handle.hasPointerCapture?.(session.pointerId)) {
    handle.releasePointerCapture(session.pointerId)
  }
  if (session.moved) persistWorkspaceWindowWidth()
}

function handleWorkspaceResizeKeydown(event: KeyboardEvent): void {
  let requestedWidth: number | null = null
  if (event.key === 'ArrowLeft') {
    requestedWidth = workspaceWindowWidthPx.value + WORKSPACE_VIEWER_KEYBOARD_STEP_PX
  } else if (event.key === 'ArrowRight') {
    requestedWidth = workspaceWindowWidthPx.value - WORKSPACE_VIEWER_KEYBOARD_STEP_PX
  } else if (event.key === 'Home') {
    requestedWidth = workspaceWindowWidthRange.value.min
  } else if (event.key === 'End') {
    requestedWidth = workspaceWindowWidthRange.value.max
  }
  if (requestedWidth == null) return
  event.preventDefault()
  workspaceWindowPreferredWidthPx.value = clampWorkspaceViewerWidth(
    requestedWidth,
    workspaceMainWidthPx.value,
  )
  persistWorkspaceWindowWidth()
}

function mountWorkspaceWindow(): void {
  if (!workspaceWindowRequestedOpen.value) return
  workspaceWindowLayoutActive.value = true
  workspaceWindowOpen.value = true
}

function shouldMoveFocusToWorkspace(): boolean {
  const activeElement = document.activeElement
  return activeElement instanceof HTMLElement
    && Boolean(activeElement.closest('.conversation-info-rail, .user-attachment-chip'))
}

function focusWorkspaceAfterEnter(): void {
  if (!workspaceFocusAfterEnter || !workspaceWindowRequestedOpen.value) return
  workspaceFocusAfterEnter = false
  const conversationKey = workspaceConversationStore.currentKey
  void nextTick(() => {
    if (workspaceWindowRequestedOpen.value && workspaceConversationStore.currentKey === conversationKey) {
      workspaceRef.value?.focusActiveViewer()
    }
  })
}

function applyWorkspaceWindowState(state: WorkspacePanelViewerState): void {
  const wasOpen = workspaceWindowOpen.value
  workspacePanelViewerState.value = state
  if (state.requestedOpen) {
    mountWorkspaceWindow()
    return
  }

  workspaceFocusAfterEnter = false
  workspaceWindowOpen.value = false
  // 同一 tick 内打开又关闭时，Viewer 尚未挂载，不会收到 after-leave。
  if (wasOpen && !workspaceRef.value) workspaceWindowLayoutActive.value = false
}

function setWorkspaceWindowOpen(open: boolean) {
  const wasOpen = workspaceWindowOpen.value
  if (open && shouldMoveFocusToWorkspace()) workspaceFocusAfterEnter = true
  // 统一按逻辑开合边沿转换。Panel 收起与 Viewer 挂载在同一轮 Vue 更新中开始，
  // 已打开时新增/激活页签只保持当前状态，不重新收起用户展开的 Panel。
  applyWorkspaceWindowState(requestWorkspaceViewerOpen(
    workspacePanelViewerState.value,
    infoRailPreference.value,
    open,
  ))
  if (open && wasOpen) focusWorkspaceAfterEnter()
}

function finishWorkspaceWindowLeave(): void {
  if (workspaceWindowRequestedOpen.value) return
  workspaceWindowLayoutActive.value = false
}

function keepWorkspaceWindowLayout(): void {
  if (workspaceWindowRequestedOpen.value) workspaceWindowLayoutActive.value = true
}

function workspaceTabById(id: string): WorkspaceViewerTab | null {
  return workspaceTabs.value.find(item => item.id === id) || null
}

function replaceWorkspaceTab(
  id: string,
  update: (tab: WorkspaceViewerTab) => WorkspaceViewerTab,
): boolean {
  const index = workspaceTabs.value.findIndex(item => item.id === id)
  if (index < 0) return false
  const next = [...workspaceTabs.value]
  next[index] = update(next[index])
  workspaceTabs.value = next
  return true
}

function applyWorkspaceTabsState(state: { tabs: WorkspaceViewerTab[]; activeTabId: string | null }): void {
  workspaceTabs.value = state.tabs
  activeWorkspaceTabId.value = state.activeTabId
}

function selectWorkspaceTab(id: string): void {
  if (workspaceTabs.value.some(item => item.id === id)) activeWorkspaceTabId.value = id
}

function closeWorkspaceTab(id: string): void {
  workspaceRequestGate.invalidate(id)
  workspaceChangeListRequests.delete(id)
  workspaceFileListRequests.delete(id)
  const nextState = closeViewerTab(workspaceTabs.value, activeWorkspaceTabId.value, id)
  applyWorkspaceTabsState(nextState)

  // 手动关闭最后一个页签时，空的 Viewer 没有继续展示的意义；沿用窗口级
  // 开合流程收起它，同时清掉 requestedOpen，避免后续会话快照恢复空窗口。
  if (!nextState.tabs.length) setWorkspaceWindowOpen(false)
}

function workspaceProjectContextId(value: unknown = selectedProjectId.value): string {
  return String(value ?? '').trim()
}

function resumeWorkspaceConversationRequests(): void {
  for (const tab of workspaceTabs.value) {
    if (!workspaceViewerTabNeedsReload(tab)) continue
    if (tab.kind === 'change') {
      void loadWorkspaceChange(tab.id, tab.projectId, tab.commitSeq)
      continue
    }
    if (tab.kind === 'change-list') {
      const resumeMore = tab.loadingMore
      if (resumeMore) {
        replaceWorkspaceTab(tab.id, current => current.kind === 'change-list'
          ? { ...current, loading: false, loadingMore: false }
          : current)
      }
      void loadWorkspaceChangeList(tab.id, tab.projectId, !resumeMore)
      continue
    }
    if (tab.kind === 'file-list') {
      const resumeMore = tab.loadingMore
      if (resumeMore) {
        replaceWorkspaceTab(tab.id, current => current.kind === 'file-list'
          ? { ...current, loading: false, loadingMore: false }
          : current)
      }
      void loadWorkspaceFileList(tab.id, tab.sessionId, !resumeMore)
      continue
    }
    void loadWorkspaceFile(tab.id)
  }
}

function activateWorkspaceConversation(projectId: unknown, sessionId: unknown): void {
  const nextKey = workspaceViewerConversationKey(projectId, sessionId)
  const activation = workspaceConversationStore.activate(
    nextKey,
    snapshotWorkspaceViewerConversation(
      workspaceTabs.value,
      activeWorkspaceTabId.value,
      workspaceWindowRequestedOpen.value,
      workspacePanelViewerState.value.autoCollapsedPanelRevision,
    ),
  )
  if (!activation.changed) return

  workspaceFocusAfterEnter = false
  workspaceRequestGate.invalidateAll()
  workspaceChangeListRequests.clear()
  workspaceFileListRequests.clear()
  const restored = activation.state
  applyWorkspaceTabsState(restored)

  // 会话恢复不是新一轮打开：连同本轮自动收起标记还原，不重跑开窗规则。
  applyWorkspaceWindowState({
    requestedOpen: restored.requestedOpen,
    autoCollapsedPanelRevision: restored.autoCollapsedPanelRevision,
  })
  resumeWorkspaceConversationRequests()
}

function adoptWorkspaceDraftForSession(projectId: unknown, sessionId: string): void {
  const draftKey = workspaceViewerConversationKey(projectId, '')
  const sessionKey = workspaceViewerConversationKey(projectId, sessionId)
  if (!sessionKey || workspaceConversationStore.currentKey !== draftKey) return
  // 首轮发送只是把当前草稿会话赋予真实 id，不应触发 Viewer 闪烁或重载。
  workspaceRequestGate.migrateConversation(draftKey, sessionKey)
  // If the user opened the empty file-list state before sending the first
  // message, carry that tab onto the newly created session instead of leaving
  // an orphan `file-list:` tab in the draft conversation.
  const draftFileList = workspaceTabs.value.find(item => item.kind === 'file-list' && !item.sessionId)
  if (draftFileList?.kind === 'file-list') {
    const sessionTabId = workspaceFileListViewerTabId(sessionId)
    const existingSessionTab = workspaceTabs.value.find(item => item.id === sessionTabId)
    const migrated = existingSessionTab?.kind === 'file-list'
      ? existingSessionTab
      : {
          ...draftFileList,
          id: sessionTabId,
          sessionId,
          loading: true,
          loadingMore: false,
          error: '',
          nextCursor: 0,
          hasMore: true,
        }
    const draftIndex = workspaceTabs.value.findIndex(item => item.id === draftFileList.id)
    const nextTabs = workspaceTabs.value
      .filter(item => item.id !== draftFileList.id && item.id !== sessionTabId)
    nextTabs.splice(Math.max(0, Math.min(draftIndex, nextTabs.length)), 0, migrated)
    workspaceTabs.value = nextTabs
    if (activeWorkspaceTabId.value === draftFileList.id) activeWorkspaceTabId.value = sessionTabId
    workspaceRequestGate.invalidate(draftFileList.id)
  }
  workspaceConversationStore.adoptActiveDraft(draftKey, sessionKey)
}

function discardWorkspaceConversation(projectId: unknown, sessionId: string): void {
  const key = workspaceViewerConversationKey(projectId, sessionId)
  workspaceConversationStore.drop(key)
}

function beginWorkspaceRequest(tabId: string): WorkspaceViewerRequestToken {
  return workspaceRequestGate.begin(tabId, workspaceConversationStore.currentKey)
}

function workspaceRequestIsCurrent(tabId: string, token: WorkspaceViewerRequestToken): boolean {
  return workspaceRequestGate.isCurrent(tabId, token, workspaceConversationStore.currentKey)
    && workspaceTabs.value.some(item => item.id === tabId)
}

function workspaceErrorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message ? reason.message : fallback
}

function openInfoRailChange(item: KnowledgeCommitSummary): void {
  openWorkspaceChange(item)
}

function openInfoRailFile(file: RecentSessionFile): void {
  openWorkspaceFile(file, activeSessionId.value)
}

/** 打开当前项目的独立知识变更列表页签；同一项目始终复用同一个页签。 */
function openInfoRailChangeList(): void {
  const projectId = workspaceProjectContextId(knowledgeStatsProjectId(selectedProjectId.value))
  if (!projectId) {
    window.$toast({ title: '当前项目身份无效，无法读取知识变更' })
    return
  }
  const id = workspaceChangeListViewerTabId(projectId)
  const existing = workspaceTabById(id)
  if (existing?.kind === 'change-list') {
    activeWorkspaceTabId.value = id
    setWorkspaceWindowOpen(true)
    if (existing.loading) void loadWorkspaceChangeList(id, projectId, true)
    else if (existing.error) void loadWorkspaceChangeList(id, projectId, existing.items.length === 0)
    return
  }
  const tab: WorkspaceChangeListViewerTab = {
    id,
    kind: 'change-list',
    title: '知识变更列表',
    loading: true,
    loadingMore: false,
    error: '',
    projectId,
    items: [],
    nextCursor: null,
    hasMore: true,
  }
  applyWorkspaceTabsState(upsertViewerTab(workspaceTabs.value, tab))
  setWorkspaceWindowOpen(true)
  void loadWorkspaceChangeList(id, projectId, true)
}

/** 打开当前会话的独立文件列表页签；页签身份包含会话，避免跨会话串列表。 */
function openInfoRailFileList(): void {
  const sessionId = String(activeSessionId.value || '').trim()
  if (!sessionId) {
    const id = workspaceFileListViewerTabId('')
    const existing = workspaceTabById(id)
    if (existing?.kind === 'file-list') {
      activeWorkspaceTabId.value = id
    } else {
      applyWorkspaceTabsState(upsertViewerTab(workspaceTabs.value, {
        id,
        kind: 'file-list',
        title: '当前会话文件',
        loading: false,
        loadingMore: false,
        error: '',
        sessionId: '',
        items: [],
        nextCursor: null,
        hasMore: false,
      }))
    }
    setWorkspaceWindowOpen(true)
    return
  }
  const id = workspaceFileListViewerTabId(sessionId)
  const existing = workspaceTabById(id)
  if (existing?.kind === 'file-list') {
    activeWorkspaceTabId.value = id
    setWorkspaceWindowOpen(true)
    if (existing.loading) void loadWorkspaceFileList(id, sessionId, true)
    else if (existing.error) void loadWorkspaceFileList(id, sessionId, existing.items.length === 0)
    return
  }
  const tab: WorkspaceFileListViewerTab = {
    id,
    kind: 'file-list',
    title: '当前会话文件',
    loading: true,
    loadingMore: false,
    error: '',
    sessionId,
    items: [],
    nextCursor: 0,
    hasMore: true,
  }
  applyWorkspaceTabsState(upsertViewerTab(workspaceTabs.value, tab))
  setWorkspaceWindowOpen(true)
  void loadWorkspaceFileList(id, sessionId, true)
}

function normalizeKnowledgeListCursor(value: unknown): number | null {
  const cursor = Number(value)
  return Number.isSafeInteger(cursor) && cursor > 0 ? cursor : null
}

function openWorkspaceChangeFromList(item: KnowledgeCommitSummary): void {
  const listTab = workspaceTabById(activeWorkspaceTabId.value || '')
  const itemProjectId = String(item?.project_id || '').trim()
  if (
    listTab?.kind === 'change-list'
    && itemProjectId
    && itemProjectId !== listTab.projectId
  ) return
  if (listTab?.kind === 'change-list' && !itemProjectId) {
    item = { ...item, project_id: listTab.projectId }
  }
  openWorkspaceChange(item)
}

function loadMoreWorkspaceChangeList(tabId: string): void {
  const tab = workspaceTabById(tabId)
  if (!tab || tab.kind !== 'change-list') return
  void loadWorkspaceChangeList(tabId, tab.projectId, false)
}

function retryWorkspaceChangeList(tabId: string): void {
  const tab = workspaceTabById(tabId)
  if (!tab || tab.kind !== 'change-list') return
  // Keep already loaded pages when a continuation request failed; only an
  // initial-page failure needs a full reset.
  void loadWorkspaceChangeList(tabId, tab.projectId, tab.items.length === 0)
}

/**
 * Knowledge commits use the backend's sequence cursor (`before`). The first
 * request is 20 rows; later requests are 10 rows. Cursor overlap is filtered
 * by sequence and a non advancing cursor closes the list to prevent loops.
 */
async function loadWorkspaceChangeList(
  tabId: string,
  projectId: string,
  resetList = false,
): Promise<void> {
  const current = workspaceTabById(tabId)
  if (!current || current.kind !== 'change-list' || current.projectId !== projectId) return
  if (!resetList && !workspaceChangeListCanLoadMore(current)) return
  const existingRequest = workspaceChangeListRequests.get(tabId)
  if (existingRequest) return existingRequest

  const limit = resetList
    ? WORKSPACE_CHANGE_LIST_INITIAL_PAGE_SIZE
    : WORKSPACE_CHANGE_LIST_PAGE_SIZE
  const previousCursor = current.nextCursor
  const token = beginWorkspaceRequest(tabId)
  replaceWorkspaceTab(tabId, tab => tab.kind === 'change-list'
    ? {
        ...tab,
        loading: resetList,
        loadingMore: !resetList,
        error: '',
      }
    : tab)

  let request: Promise<void> = Promise.resolve()
  request = (async () => {
    try {
      const page = await getKnowledgeCommits(projectId, {
        limit,
        before: resetList ? undefined : (previousCursor || undefined),
      })
      if (!workspaceRequestIsCurrent(tabId, token)) return
      if (!page || !Array.isArray(page.items)) throw new Error('知识变更列表响应无效')
      const latest = workspaceTabById(tabId)
      if (!latest || latest.kind !== 'change-list') return
      const incoming = Array.isArray(page?.items) ? page.items : []
      const merged = resetList
        ? mergeKnowledgeChangeSummaries([], incoming)
        : mergeKnowledgeChangeSummaries(latest.items, incoming)
      const explicitCursor = page?.next_cursor !== undefined
      let nextCursor = normalizeKnowledgeListCursor(page?.next_cursor)
      // Older deployments may omit next_cursor. A full page can still be
      // advanced safely with its last sequence; a short page is terminal.
      if (!explicitCursor && incoming.length >= limit) {
        nextCursor = normalizeKnowledgeListCursor(incoming[incoming.length - 1]?.seq)
      }
      const cursorDidAdvance = resetList
        || (nextCursor !== null && (previousCursor === null || nextCursor < previousCursor))
      const hasMore = incoming.length > 0 && nextCursor !== null && cursorDidAdvance
      replaceWorkspaceTab(tabId, tab => tab.kind === 'change-list'
        ? {
            ...tab,
            items: merged,
            loading: false,
            loadingMore: false,
            error: '',
            nextCursor: hasMore ? nextCursor : null,
            hasMore,
          }
        : tab)
    } catch (reason) {
      if (!workspaceRequestIsCurrent(tabId, token)) return
      replaceWorkspaceTab(tabId, tab => tab.kind === 'change-list'
        ? {
            ...tab,
            loading: false,
            loadingMore: false,
            error: workspaceErrorMessage(reason, '知识变更列表读取失败，请稍后重试。'),
          }
        : tab)
    }
  })()
  workspaceChangeListRequests.set(tabId, request)
  const clearChangeListRequest = () => {
    if (workspaceChangeListRequests.get(tabId) === request) workspaceChangeListRequests.delete(tabId)
  }
  void request.then(clearChangeListRequest, clearChangeListRequest)
  await request
}

function workspaceFileListCacheKey(sessionId: string, projectId = workspaceProjectContextId()): string {
  return `${String(projectId || '').trim()}::${String(sessionId || '').trim()}`
}

/** Share an in-flight local journal request between the conversation loader
 * and the file-list tab so opening "查看全部" cannot duplicate it. */
function requestSessionEvents(sessionId: string, options: { includePrivate?: boolean } = {}): Promise<VibeEvent[]> {
  const normalizedSessionId = String(sessionId || '').trim()
  if (!normalizedSessionId) return Promise.resolve([])
  const cacheKey = `${normalizedSessionId}:${options.includePrivate ? 'private' : 'public'}`
  const existing = sessionEventsRequests.get(cacheKey)
  if (existing) return existing
  const request = (async () => {
    const eventsApi = electronAgentBridge()?.sessions?.events
    if (!eventsApi) throw new Error('本地会话存储不可用')
    const rows = await eventsApi({
      sessionId: normalizedSessionId,
      accountId: localAccountId(),
      limit: 100000,
    })
    const localRows: any[] = Array.isArray(rows) ? rows : []
    const localEvents: VibeEvent[] = localRows
      .filter((row: any) => options.includePrivate
        || !new Set(['context_checkpoint', 'language_repair']).has(String(row?.meta?.purpose || '')))
      .map((row: any) => {
        // Live local runs use a stable run/role identity. Reuse it when reading
        // the persisted journal so switching sessions or reloading the window
        // does not add a second copy of the same user/assistant message.
        const persistedRunId = String(row.meta?.run_id || '').trim()
        const persistedRole = String(row.role || 'assistant')
        const persistedKey = String(row.meta?.local_event_key || '').trim()
        const roleKey = `${persistedRunId}:${persistedRole}`
        const stableSuffix = persistedKey === `${persistedRunId}:cancelled`
          ? 'cancelled'
          : persistedKey === roleKey || persistedKey === 'assistant:final'
            ? persistedRole
            : (persistedKey || persistedRole)
        const stableId = persistedRunId
          ? `local:${persistedRunId}:${stableSuffix}`
          : `local:${normalizedSessionId}:${row.sequence}`
        return ({
          id: persistedRunId ? stableId : String(row.event_id || stableId),
          session_id: normalizedSessionId,
          vibe_project_id: String(row.project_id || ''),
          user_id: Number(currentUser.value?.id || 0),
          role: String(row.role || 'assistant'),
          input_type: 'text',
          content: String(row.content || ''),
          attachments: Array.isArray(row.attachments) ? row.attachments : [],
          event_order: Number(row.sequence || 0),
          mode: 'local_pi',
          meta: row.meta && typeof row.meta === 'object' ? row.meta : {},
          created_at: row.created_at,
        })
      })
    return sortEvents(localEvents)
  })()
  sessionEventsRequests.set(cacheKey, request)
  const clear = () => {
    if (sessionEventsRequests.get(cacheKey) === request) {
      sessionEventsRequests.delete(cacheKey)
    }
  }
  void request.then(clear, clear)
  return request
}

function openWorkspaceFileFromList(file: RecentSessionFile, sessionId: string): void {
  openWorkspaceFile(file, sessionId)
}

function loadMoreWorkspaceFileList(tabId: string): void {
  const tab = workspaceTabById(tabId)
  if (!tab || tab.kind !== 'file-list') return
  void loadWorkspaceFileList(tabId, tab.sessionId, false)
}

function retryWorkspaceFileList(tabId: string): void {
  const tab = workspaceTabById(tabId)
  if (!tab || tab.kind !== 'file-list') return
  void loadWorkspaceFileList(tabId, tab.sessionId, tab.items.length === 0)
}

/**
 * Session events currently have no server-side file cursor. We cache the
 * authoritative full event projection per session, expose the first 20 files,
 * then append 10 unseen identities. Identity de-duplication keeps repeated
 * events and renamed attachments from producing duplicate rows.
 */
async function loadWorkspaceFileList(
  tabId: string,
  sessionId: string,
  resetList = false,
): Promise<void> {
  const current = workspaceTabById(tabId)
  if (!current || current.kind !== 'file-list' || current.sessionId !== sessionId) return
  if (!resetList && !workspaceFileListCanLoadMore(current)) return
  const existingRequest = workspaceFileListRequests.get(tabId)
  if (existingRequest) return existingRequest
  const token = beginWorkspaceRequest(tabId)
  replaceWorkspaceTab(tabId, tab => tab.kind === 'file-list'
    ? {
        ...tab,
        loading: resetList,
        loadingMore: !resetList,
        error: '',
      }
    : tab)

  let request: Promise<void> = Promise.resolve()
  request = (async () => {
    try {
      const projectId = workspaceProjectContextId()
      const cacheKey = workspaceFileListCacheKey(sessionId, projectId)
      const activeSnapshotAvailable = activeSessionId.value === sessionId
        && workspaceProjectContextId() === projectId
        && !sessionFilesLoading.value
        && !sessionFilesError.value
      let allFiles = workspaceSessionFileSnapshots.get(cacheKey) || []
      if (activeSnapshotAvailable) {
        // Reuse the events projection already loaded by openSession. This is
        // both fresher and avoids a duplicate GET when the user opens the list.
        allFiles = allSessionFiles.value
        workspaceSessionFileSnapshots.set(cacheKey, allFiles)
      } else if (resetList || !workspaceSessionFileSnapshots.has(cacheKey)) {
        const loadedEvents = await requestSessionEvents(sessionId)
        if (!Array.isArray(loadedEvents)) throw new Error('会话文件列表响应无效')
        const normalizedEvents = loadedEvents
        allFiles = deriveRecentSessionFiles(normalizedEvents, sessionId, Number.MAX_SAFE_INTEGER)
        workspaceSessionFileSnapshots.set(cacheKey, allFiles)
        // Keep the main panel's event projection in sync when this is still
        // the active session; stale sessions never overwrite current events.
        if (activeSnapshotAvailable || (activeSessionId.value === sessionId && workspaceProjectContextId() === projectId)) {
          events.value = sortEvents(normalizedEvents)
          sessionFilesLoading.value = false
          sessionFilesError.value = ''
        }
      }
      if (!workspaceRequestIsCurrent(tabId, token)) return
      const latest = workspaceTabById(tabId)
      if (!latest || latest.kind !== 'file-list') return
      const pageSize = resetList ? WORKSPACE_FILE_LIST_INITIAL_PAGE_SIZE : WORKSPACE_FILE_LIST_PAGE_SIZE
      // Use identities as the continuation boundary instead of trusting a
      // raw offset: a newly uploaded file can appear at the front of the
      // snapshot while the user is reading, and offset-only paging would then
      // repeat one row and skip another.
      const loadedIdentities = new Set(latest.items.map(item => String(item.identity || '').trim()))
      const page = resetList
        ? allFiles.slice(0, pageSize)
        : allFiles.filter(item => !loadedIdentities.has(String(item.identity || '').trim())).slice(0, pageSize)
      const merged = resetList
        ? page
        : mergeSessionFileListItems(latest.items, page)
      const mergedIdentities = new Set(merged.map(item => String(item.identity || '').trim()))
      const hasMore = allFiles.some(item => !mergedIdentities.has(String(item.identity || '').trim()))
      const nextOffset = merged.length
      replaceWorkspaceTab(tabId, tab => tab.kind === 'file-list'
        ? {
            ...tab,
            items: merged,
            loading: false,
            loadingMore: false,
            error: '',
            nextCursor: hasMore ? nextOffset : null,
            hasMore,
          }
        : tab)
    } catch (reason) {
      if (!workspaceRequestIsCurrent(tabId, token)) return
      replaceWorkspaceTab(tabId, tab => tab.kind === 'file-list'
        ? {
            ...tab,
            loading: false,
            loadingMore: false,
            error: workspaceErrorMessage(reason, '会话文件列表读取失败，请稍后重试。'),
          }
        : tab)
    }
  })()
  workspaceFileListRequests.set(tabId, request)
  const clearFileListRequest = () => {
    if (workspaceFileListRequests.get(tabId) === request) workspaceFileListRequests.delete(tabId)
  }
  void request.then(clearFileListRequest, clearFileListRequest)
  await request
}

function mergeSessionFileListItems(
  existing: readonly RecentSessionFile[],
  incoming: readonly RecentSessionFile[],
): RecentSessionFile[] {
  const result: RecentSessionFile[] = []
  const seen = new Set<string>()
  for (const item of [...existing, ...incoming]) {
    const identity = String(item?.identity || '').trim()
    if (!identity || seen.has(identity)) continue
    seen.add(identity)
    result.push(item)
  }
  return result
}

/** Keep an already-open file list current when the active conversation gains
 * a new event/attachment, while preserving the number of rows the user has
 * already paged through. */
function syncActiveWorkspaceFileList(): void {
  const sessionId = String(activeSessionId.value || '').trim()
  const projectId = workspaceProjectContextId()
  // Keep the restored tab snapshot intact while a new session's authoritative
  // events are still loading (or failed); an empty transient `events=[]`
  // must never erase the previous page state.
  if (!sessionId || !projectId || sessionFilesLoading.value || sessionFilesError.value) return
  const snapshot = allSessionFiles.value
  const cacheKey = workspaceFileListCacheKey(sessionId, projectId)
  workspaceSessionFileSnapshots.set(cacheKey, snapshot)
  const tab = workspaceTabById(workspaceFileListViewerTabId(sessionId))
  if (!tab || tab.kind !== 'file-list' || tab.loading || tab.loadingMore) return
  const snapshotByIdentity = new Map(snapshot.map(item => [String(item.identity || '').trim(), item]))
  const known = new Set(tab.items.map(item => String(item.identity || '').trim()))
  // Preserve every row the user has already loaded, update its latest file
  // metadata, and put newly discovered identities ahead of the old page.
  const additions = snapshot.filter(item => !known.has(String(item.identity || '').trim()))
  const retained = tab.items
    .map(item => snapshotByIdentity.get(String(item.identity || '').trim()) || item)
    .filter(item => snapshotByIdentity.has(String(item.identity || '').trim()))
  const items = [...additions, ...retained]
  const loaded = new Set(items.map(item => String(item.identity || '').trim()))
  const hasMore = snapshot.some(item => !loaded.has(String(item.identity || '').trim()))
  replaceWorkspaceTab(tab.id, current => current.kind === 'file-list'
    ? {
        ...current,
        items,
        nextCursor: hasMore ? items.length : null,
        hasMore,
        error: '',
      }
    : current)
}

watch(
  () => [activeSessionId.value, events.value, sessionFilesLoading.value, sessionFilesError.value] as const,
  () => { syncActiveWorkspaceFileList() },
)

// The rail is refreshed by the knowledge activity stream. Merge its newest
// summaries into an already-open list without resetting the user's scroll or
// discarding older pages; the existing backend cursor remains the boundary.
watch(recentKnowledgeChanges, (changes) => {
  const projectId = knowledgeStatsProjectId(selectedProjectId.value)
  if (!projectId || !changes.length) return
  const tab = workspaceTabById(workspaceChangeListViewerTabId(projectId))
  if (!tab || tab.kind !== 'change-list' || tab.loading || tab.loadingMore) return
  const merged = mergeKnowledgeChangeSummaries(changes, tab.items)
  if (merged.length === tab.items.length
    && merged.every((item, index) => item === tab.items[index])) return
  replaceWorkspaceTab(tab.id, current => current.kind === 'change-list'
    ? { ...current, items: merged }
    : current)
})

function openWorkspaceChange(
  item: KnowledgeCommitSummary,
): void {
  const projectId = String(item.project_id || knowledgeStatsProjectId(selectedProjectId.value) || '').trim()
  const commitSeq = Math.max(0, Number(item.seq) || 0)
  if (!projectId || !commitSeq) {
    window.$toast({ title: '该变更缺少可读取的提交标识' })
    return
  }
  const id = workspaceChangeViewerTabId(projectId, commitSeq)
  const existing = workspaceTabById(id)
  if (existing) {
    activeWorkspaceTabId.value = id
    setWorkspaceWindowOpen(true)
    if (existing.kind === 'change' && !existing.loading && !existing.detail) {
      void loadWorkspaceChange(id, projectId, commitSeq)
    }
    return
  }
  const tab: WorkspaceChangeViewerTab = {
    id,
    kind: 'change',
    title: knowledgeChangeTitle(item),
    loading: true,
    error: '',
    projectId,
    commitSeq,
    summary: item,
    detail: null,
  }
  applyWorkspaceTabsState(upsertViewerTab(workspaceTabs.value, tab))
  setWorkspaceWindowOpen(true)
  void loadWorkspaceChange(id, projectId, commitSeq)
}

async function loadWorkspaceChange(tabId: string, projectId: string, commitSeq: number): Promise<void> {
  const token = beginWorkspaceRequest(tabId)
  replaceWorkspaceTab(tabId, tab => tab.kind === 'change'
    ? { ...tab, loading: true, error: '' }
    : tab)
  try {
    const payload = await getKnowledgeCommit(projectId, commitSeq)
    if (!workspaceRequestIsCurrent(tabId, token)) return
    replaceWorkspaceTab(tabId, tab => tab.kind === 'change'
      ? {
          ...tab,
          title: knowledgeChangeTitle(payload.commit),
          loading: false,
          error: '',
          detail: payload.commit,
        }
      : tab)
  } catch (reason) {
    if (!workspaceRequestIsCurrent(tabId, token)) return
    replaceWorkspaceTab(tabId, tab => tab.kind === 'change'
      ? {
          ...tab,
          loading: false,
          error: workspaceErrorMessage(reason, '变更详情读取失败，请稍后重试。'),
          detail: null,
        }
      : tab)
  }
}

function retryWorkspaceChange(tabId: string): void {
  const tab = workspaceTabById(tabId)
  if (!tab || tab.kind !== 'change') return
  void loadWorkspaceChange(tabId, tab.projectId, tab.commitSeq)
}

function openWorkspaceFile(
  file: RecentSessionFile,
  ownerSessionId = activeSessionId.value,
): void {
  const sessionId = String(ownerSessionId || '').trim()
  const id = workspaceFileViewerTabId(sessionId, file.identity)
  const existing = workspaceTabById(id)
  const inlineContent = workspaceInlineFileContent(file)
  if (existing?.kind === 'file') {
    const locatorChanged = workspaceFileLocatorSignature(existing.sessionId, existing.file)
      !== workspaceFileLocatorSignature(sessionId, file)
    const shouldReload = inlineContent === null && (locatorChanged || (!existing.loading && Boolean(existing.error)))
    if (inlineContent !== null || locatorChanged) workspaceRequestGate.invalidate(id)
    replaceWorkspaceTab(id, tab => tab.kind === 'file'
      ? {
          ...tab,
          title: file.filename || tab.title,
          sessionId,
          file: {
            ...tab.file,
            ...file,
            filename: file.filename || tab.file.filename,
          },
          content: inlineContent !== null ? inlineContent : (locatorChanged ? '' : tab.content),
          loading: inlineContent !== null ? false : (locatorChanged ? true : tab.loading),
          error: inlineContent !== null || locatorChanged ? '' : tab.error,
        }
      : tab)
    activeWorkspaceTabId.value = id
    setWorkspaceWindowOpen(true)
    if (shouldReload) void loadWorkspaceFile(id)
    return
  }

  const tab: WorkspaceFileViewerTab = {
    id,
    kind: 'file',
    title: file.filename,
    loading: inlineContent === null,
    error: '',
    sessionId,
    file: { ...file },
    content: inlineContent ?? '',
  }
  applyWorkspaceTabsState(upsertViewerTab(workspaceTabs.value, tab))
  setWorkspaceWindowOpen(true)
  if (inlineContent === null) void loadWorkspaceFile(id)
}

async function loadWorkspaceFile(tabId: string): Promise<void> {
  const current = workspaceTabById(tabId)
  if (!current || current.kind !== 'file') return
  if (String(current.file.kind || '') === 'knowledge-citation') {
    const sourceId = String(current.file.source_ref_id || '').trim()
    const source = normalizeConversationSourceCitation({
      source_id: sourceId,
      display_name: current.file.filename,
      mime_type: current.file.mime,
      locator: {
        start_offset: current.file.citation_start_offset,
        end_offset: current.file.citation_end_offset,
      },
    }, 0)
    if (source.canOpen) {
      await loadWorkspaceCitationSource(tabId, source)
    } else {
      replaceWorkspaceTab(tabId, tab => tab.kind === 'file'
        ? { ...tab, loading: false, error: '该引用缺少可读取的来源标识。' }
        : tab)
    }
    return
  }
  if (String(current.file.kind || '') === 'knowledge-source') {
    const sourceId = String(current.file.source_ref_id || '').trim()
    if (sourceId && workspaceProjectContextId()) {
      await loadWorkspaceKnowledgeSource(tabId, sourceId)
    } else {
      replaceWorkspaceTab(tabId, tab => tab.kind === 'file'
        ? { ...tab, loading: false, error: '该来源缺少项目或来源标识，无法读取。' }
        : tab)
    }
    return
  }
  if (String(current.file.kind || '') === 'local-file') {
    const refId = String(current.file.ref_id || current.file.resource_id || '').trim()
    const localFiles = electronAgentBridge()?.localFiles
    if (!refId || !localFiles?.preview) {
      replaceWorkspaceTab(tabId, tab => tab.kind === 'file'
        ? { ...tab, loading: false, error: '本机文件引用已失效，无法预览。' }
        : tab)
      return
    }
    const token = beginWorkspaceRequest(tabId)
    replaceWorkspaceTab(tabId, tab => tab.kind === 'file'
      ? { ...tab, loading: true, error: '' }
      : tab)
    try {
      const result = await localFiles.preview({ refId, accountId: localAccountId() })
      if (!workspaceRequestIsCurrent(tabId, token)) return
      const suffix = result?.truncated ? '\n\n[文件较大，此处只显示前 512KiB；Agent 可用本机文件工具继续读取。]' : ''
      replaceWorkspaceTab(tabId, tab => tab.kind === 'file'
        ? {
            ...tab,
            title: String(result?.name || tab.title),
            loading: false,
            error: '',
            content: `${String(result?.text || '')}${suffix}`,
            file: {
              ...tab.file,
              filename: String(result?.name || tab.file.filename),
              mime: String(result?.mime || tab.file.mime),
              body_omitted: Boolean(result?.truncated),
            },
          }
        : tab)
    } catch (reason) {
      if (!workspaceRequestIsCurrent(tabId, token)) return
      replaceWorkspaceTab(tabId, tab => tab.kind === 'file'
        ? { ...tab, loading: false, error: workspaceErrorMessage(reason, '本机文件读取失败。') }
        : tab)
    }
    return
  }
  // Unknown local identities are legacy references from before native
  // local_file_ref support.  They have no safe server download route; keep
  // the historical tab visible but fail closed before attempting a request.
  if (String(current.file.kind || '').startsWith('local-')) {
    replaceWorkspaceTab(tabId, tab => tab.kind === 'file'
      ? { ...tab, loading: false, error: '此本机文件引用已失效，请重新选择原文件。' }
      : tab)
    return
  }
  // Server-side session attachment storage was retired.  A legacy row may
  // still contain only metadata; never turn that metadata into a network
  // download request.  Users can reselect the original local file when they
  // need its contents again.  Inline historical content was handled above by
  // `workspaceInlineFileContent` and remains readable without this branch.
  replaceWorkspaceTab(tabId, tab => tab.kind === 'file'
    ? { ...tab, loading: false, error: '历史附件已不再从服务器读取，请重新选择本机文件。' }
    : tab)
}

function retryWorkspaceFile(tabId: string): void {
  void loadWorkspaceFile(tabId)
}

function openMessageAttachmentViewer(file: Partial<VibeAttachment> | any, event: Partial<VibeEvent> | any): void {
  const attachments = eventAttachments(event)
  const locatedIndex = attachments.indexOf(file as VibeAttachment)
  const attachmentIndex = locatedIndex >= 0 ? locatedIndex : 0
  const eventId = String(event?.id || '').trim()
  const identity = attachmentIdentity(file) || `event:${eventId || 'unknown'}:${attachmentIndex}`
  const projected: RecentSessionFile = {
    ...file,
    identity,
    filename: attachmentName(file),
    event_id: eventId,
    attachment_index: attachmentIndex,
    last_event_order: Number(event?.event_order || 0),
    last_seen_at: String(event?.created_at || ''),
  }
  openWorkspaceFile(projected, String(event?.session_id || activeSessionId.value || ''))
}

function openConversationSource(source: ConversationSourceCitation): void {
  const sessionId = String(activeSessionId.value || '').trim()
  const identity = sourceCitationViewerIdentity(source)
  if (!sessionId || !identity) return
  workspaceFocusAfterEnter = true
  const id = workspaceFileViewerTabId(sessionId, identity)
  const existing = workspaceTabById(id)
  if (existing) {
    activeWorkspaceTabId.value = id
    setWorkspaceWindowOpen(true)
    if (existing.kind === 'file' && !existing.loading && existing.error) {
      void loadWorkspaceCitationSource(id, source)
    }
    return
  }
  const file: RecentSessionFile = {
    identity,
    filename: source.label,
    source_ref_id: source.sourceId,
    citation_span_id: source.spanId,
    citation_start_offset: source.startOffset,
    citation_end_offset: source.endOffset,
    source_label: source.label,
    source_location: source.location,
    kind: 'knowledge-citation',
    mime: source.mimeType || 'text/plain',
    event_id: '',
    attachment_index: 0,
    last_event_order: 0,
    last_seen_at: '',
  }
  const tab: WorkspaceFileViewerTab = {
    id,
    kind: 'file',
    title: source.label,
    loading: true,
    error: '',
    sessionId,
    file,
    content: '',
  }
  applyWorkspaceTabsState(upsertViewerTab(workspaceTabs.value, tab))
  setWorkspaceWindowOpen(true)
  void loadWorkspaceCitationSource(id, source)
}

async function loadWorkspaceCitationSource(
  tabId: string,
  source: ConversationSourceCitation,
): Promise<void> {
  if (
    sourceCitationHasReadableRange(source)
    && source.startOffset !== null
    && source.endOffset !== null
  ) {
    await loadWorkspaceSourceFragment(
      tabId,
      source.sourceId,
      source.startOffset,
      source.endOffset,
    )
    return
  }
  await loadWorkspaceKnowledgeSource(tabId, source.sourceId)
}

function sliceUnicodeCodePoints(value: string, startOffset: number, endOffset: number): string {
  let offset = 0
  let result = ''
  for (const character of value) {
    if (offset >= endOffset) break
    if (offset >= startOffset) result += character
    offset += 1
  }
  return result
}

async function loadWorkspaceSourceFragment(
  tabId: string,
  sourceId: string,
  startOffset: number,
  endOffset: number,
): Promise<void> {
  const token = beginWorkspaceRequest(tabId)
  replaceWorkspaceTab(tabId, tab => tab.kind === 'file'
    ? { ...tab, loading: true, error: '' }
    : tab)
  try {
    const projectId = workspaceProjectContextId()
    if (!projectId) throw new Error('当前项目身份无效')
    const payload = await getKnowledgeSource(projectId, sourceId)
    if (!workspaceRequestIsCurrent(tabId, token)) return
    const source = payload.source
    replaceWorkspaceTab(tabId, tab => tab.kind === 'file'
      ? {
          ...tab,
          title: source.display_name || tab.title,
          loading: false,
          error: '',
          content: sliceUnicodeCodePoints(String(source.content || ''), startOffset, endOffset),
          file: {
            ...tab.file,
            filename: source.display_name || tab.file.filename,
            mime: source.mime_type || tab.file.mime,
            content_hash: source.content_hash,
          },
        }
      : tab)
  } catch (reason) {
    if (!workspaceRequestIsCurrent(tabId, token)) return
    replaceWorkspaceTab(tabId, tab => tab.kind === 'file'
      ? {
          ...tab,
          loading: false,
          error: workspaceErrorMessage(reason, '引用片段读取失败，请稍后重试。'),
        }
      : tab)
  }
}

function openWorkspaceSource(source: string | ConversationSourceCitation): void {
  const selectedTab = workspaceTabById(activeWorkspaceTabId.value || '')
  const sourceSummary = typeof source === 'string' && selectedTab?.kind === 'change'
    ? selectedTab.detail?.sources.find(item => String(item.id || '').trim() === source.trim())
    : null
  const reference = typeof source === 'string'
    ? normalizeConversationSourceCitation({
        ...sourceSummary,
        source_id: source,
      }, 0)
    : source
  const normalizedSourceId = reference.sourceId
  const projectId = workspaceProjectContextId()
  if (!projectId) {
    ElMessage.warning('当前项目身份无效，无法读取来源。')
    return
  }
  if (!normalizedSourceId) return
  const identity = sourceCitationViewerIdentity(reference)
  if (!identity) return
  workspaceFocusAfterEnter = true
  const id = workspaceFileViewerTabId(projectId, identity)
  const existing = workspaceTabById(id)
  if (existing) {
    activeWorkspaceTabId.value = id
    setWorkspaceWindowOpen(true)
    if (existing.kind === 'file' && !existing.loading && existing.error) {
      void loadWorkspaceKnowledgeSource(id, normalizedSourceId)
    }
    return
  }
  const file: RecentSessionFile = {
    identity,
    filename: reference.label || '知识来源',
    source_ref_id: normalizedSourceId,
    citation_span_id: reference.spanId,
    source_label: reference.label,
    source_location: reference.location,
    kind: 'knowledge-source',
    mime: reference.mimeType || 'text/plain',
    event_id: '',
    attachment_index: 0,
    last_event_order: 0,
    last_seen_at: '',
  }
  const tab: WorkspaceFileViewerTab = {
    id,
    kind: 'file',
    title: file.filename,
    loading: true,
    error: '',
    sessionId: String(activeSessionId.value || '').trim(),
    file,
    content: '',
  }
  applyWorkspaceTabsState(upsertViewerTab(workspaceTabs.value, tab))
  setWorkspaceWindowOpen(true)
  void loadWorkspaceKnowledgeSource(id, normalizedSourceId)
}

async function loadWorkspaceKnowledgeSource(
  tabId: string,
  sourceId: string,
): Promise<void> {
  const token = beginWorkspaceRequest(tabId)
  replaceWorkspaceTab(tabId, tab => tab.kind === 'file'
    ? { ...tab, loading: true, error: '' }
    : tab)
  try {
    const projectId = workspaceProjectContextId()
    if (!projectId) throw new Error('当前项目身份无效')
    const payload = await getKnowledgeSource(projectId, sourceId)
    if (!workspaceRequestIsCurrent(tabId, token)) return
    const source = payload.source
    replaceWorkspaceTab(tabId, tab => tab.kind === 'file'
      ? {
          ...tab,
          title: source.display_name || tab.title,
          loading: false,
          error: '',
          content: source.content || '',
          file: {
            ...tab.file,
            filename: source.display_name || tab.file.filename,
            mime: source.mime_type || tab.file.mime,
            content_hash: source.content_hash,
          },
        }
      : tab)
  } catch (reason) {
    if (!workspaceRequestIsCurrent(tabId, token)) return
    replaceWorkspaceTab(tabId, tab => tab.kind === 'file'
      ? {
          ...tab,
          loading: false,
          error: workspaceErrorMessage(reason, '知识来源读取失败，请稍后重试。'),
        }
      : tab)
  }
}

// 当前项目读数（项目卡 + 底部概览卡共用）：按外层 AsyncTest project.id 取。
const kbStats = computed(() => readKnowledgeStats(projectStatsMap, selectedProjectId.value))
type LocalSessionRunState = 'queued' | 'running' | 'waiting_user'
const localSessionRunStates = ref<Record<string, LocalSessionRunState>>({})
function sessionRuntimeState(id: string): LocalSessionRunState | '' {
  const local = localSessionRunStates.value[id]
  if (local) return local
  return sendingSessionIds.value.includes(id) || runningSessionIds.value.includes(id) ? 'running' : ''
}
function sessionRuntimeLabel(id: string): string {
  const state = sessionRuntimeState(id)
  if (state === 'queued') return '任务排队中'
  if (state === 'waiting_user') return '需要用户输入'
  return state === 'running' ? '对话运行中' : ''
}
const preparingSend = ref(false)
const sendingSessionIds = ref<string[]>([])
// 输入草稿按项目 + 会话隔离。空 session 代表“尚未发送并创建会话的新对话”，
// 因而切换 A/B 或从已有会话切到新对话时，都只切换草稿而不会清空其他会话的内容。
const sessionDrafts = reactive<Record<string, string>>({})
function sessionDraftKey(sessionId = activeSessionId.value) {
  if (sessionId) return `session:${sessionId}`
  const projectId = String(selectedProjectId.value || 'pending')
  return `new:${projectId}`
}
function setDraftByKey(key: string, value: string) {
  if (value) sessionDrafts[key] = value
  else delete sessionDrafts[key]
}
function clearSessionDraft(sessionId: string) {
  if (sessionId) delete sessionDrafts[sessionDraftKey(sessionId)]
}
const activeDraftKey = computed(() => sessionDraftKey())
const draft = computed<string>({
  get: () => sessionDrafts[activeDraftKey.value] || '',
  set: (value) => { setDraftByKey(activeDraftKey.value, value) },
})
// foundation 新管线（知识库前端唯一管线，不再有灰度开关）
const foundationBusy = ref(false)
const runningSessionIds = ref<string[]>([])
// 临时过程区必须有明确会话所有者。窗口级 busy 只表示本窗口有请求，不能决定当前会话显示什么。
const streamingOwnerSessionId = ref('')
// 仅用于 event_saved 前的本地展示，不写入 events，也不参与 Canonical reducer。
const pendingUserSubmissionText = ref('')
// Candidate assistant text is intentionally separate from the persisted
// Canonical answer. It can stream outside the process rail, then be replaced
// atomically by the saved assistant event when the Goal completes.
const streamingLiveAnswerContent = ref('')
const streamingAnswerHtml = ref('')
const streamingAnswerHtmlSource = ref('')
let streamingAnswerRenderTimer: ReturnType<typeof setTimeout> | null = null
let streamingAnswerRenderEpoch = 0
let electronDeltaProjectionTimer: ReturnType<typeof setTimeout> | null = null
let electronDeltaProjectionContext: ElectronAgentRunContext | null = null
const ELECTRON_DELTA_PROJECTION_DELAY_MS = 50
let runningTurnPollTimer: ReturnType<typeof setTimeout> | null = null
let runningTurnPollInFlight = false
const RUNNING_POLL_ACTIVE_MS = 1500
const RUNNING_POLL_IDLE_MS = 3500
// T26 停止：本轮后端令牌 id（turn_started 事件带来）+ 防连点
const activeTurnId = ref('')
const activeTurnSessionId = ref('')
const cancelRequested = ref(false)
type ClarificationSubmission = {
  sessionId: string
  turnId: string
  runId: string
  pendingId: string
}
// A submitted choice is no longer an unanswered card, but the child may take
// a few seconds to acknowledge it. Keep the process disclosure open during
// that hand-off instead of making the conversation appear to have vanished.
const clarificationSubmittingBySession = ref<Record<string, ClarificationSubmission>>({})
function clarificationSubmissionForSession(sessionId = activeSessionId.value): ClarificationSubmission | null {
  const key = String(sessionId || '').trim()
  return key ? clarificationSubmittingBySession.value[key] || null : null
}
const clarificationSubmittingVisible = computed(() => {
  const current = clarificationSubmissionForSession()
  if (!current || current.sessionId !== String(activeSessionId.value || '').trim()) return false
  if (current.turnId && activeTurnId.value && current.turnId !== activeTurnId.value) return false
  return true
})
interface ElectronAgentRunContext {
  run: FoundationAgentRun
  protocolState: TurnProtocolState
  state: string
  ephemeralText: string
  // The current Provider message starts life as a candidate.  Until Pi tells
  // us whether it contains tool calls we show it as a live answer preview;
  // a tool-bearing message is moved back into the process rail at
  // assistant_end.  This keeps the UI responsive without guessing from prose.
  liveAnswerText: string
  assistantStreamMode: 'candidate' | 'process' | 'answer' | 'private'
  assistantStreamPurpose: string
  processEphemeralSteps: ProcessStep[]
  providerCallSequence: number
  startedAt: number
  acceptCanonical?: (model: TurnProtocolReadModel) => void
  localUserEventId?: string
  localAssistantEventId?: string
  localDescriptor?: any
  localCold?: boolean
  localInteractionEventId?: string
}
const electronAgentRuns = new Map<string, ElectronAgentRunContext>()
const electronAgentWaiters = new Map<string, {
  resolve: (event: VibeAgentEvent) => void
  reject: (reason: Error) => void
}>()
let offVibeAgentEvent: (() => void) | null = null

function electronAgentBridge() {
  return window.electronAPI?.vibeAgent
}

function electronRunForTurn(turnId: string, sessionId = ''): ElectronAgentRunContext | null {
  const normalizedTurnId = String(turnId || '')
  const normalizedSessionId = String(sessionId || '')
  for (const context of electronAgentRuns.values()) {
    if (normalizedTurnId && context.run.turn_id !== normalizedTurnId) continue
    if (normalizedSessionId && context.run.session_id !== normalizedSessionId) continue
    return context
  }
  return null
}

function electronPresentationOwnedBy(context: ElectronAgentRunContext): boolean {
  return activeSessionId.value === context.run.session_id
    && (!activeTurnId.value || activeTurnId.value === context.run.turn_id)
}

function canonicalDeltaEvents(delta: any): any[] {
  if (Array.isArray(delta?.events)) return delta.events
  if (Array.isArray(delta?.journal?.events)) return delta.journal.events
  return []
}

function registerElectronAgentRun(run: FoundationAgentRun): ElectronAgentRunContext {
  const existing = electronAgentRuns.get(run.run_id)
  if (existing) {
    existing.run = { ...existing.run, ...run }
    return existing
  }
  const context: ElectronAgentRunContext = {
    run,
    protocolState: createTurnProtocolState(),
    state: String(run.state || 'queued'),
    ephemeralText: '',
    liveAnswerText: '',
    assistantStreamMode: 'candidate',
    assistantStreamPurpose: 'main_agent',
    processEphemeralSteps: [],
    providerCallSequence: 0,
    startedAt: Date.now(),
  }
  electronAgentRuns.set(run.run_id, context)
  return context
}

function applyElectronAgentCanonical(context: ElectronAgentRunContext, delta: any) {
  const rows = canonicalDeltaEvents(delta)
  if (!rows.length) return
  cancelElectronDeltaProjection(context)
  context.ephemeralText = ''
  const previousState = context.state
  const model = applyTurnProtocolEvents(context.protocolState, rows)
  context.state = model.state
  const live = electronPresentationOwnedBy(context)
  context.acceptCanonical?.(model)
  if (!live) return
  streamingOwnerSessionId.value = context.run.session_id
  activeTurnId.value = context.run.turn_id
  activeTurnSessionId.value = context.run.session_id
  setSessionRunning(context.run.session_id, !model.terminal)
  if (previousState === 'waiting_user' && model.state === 'running') startElapsedTicker(Date.now())
  applyCanonicalReadModel(model)
  // A journal delta can arrive between two Provider frames. Keep any
  // renderer-only commentary that has not reached the journal yet, and keep
  // the candidate answer in its own presentation lane.
  streamingProcess.steps = mergeElectronProcessSteps(context)
  streamingLiveAnswerContent.value = (context.assistantStreamPurpose === 'main_agent'
    && ['candidate', 'answer'].includes(context.assistantStreamMode))
    || (context.assistantStreamMode === 'private' && !!context.liveAnswerText)
    ? context.liveAnswerText
    : ''
  if (!streamingLiveAnswerContent.value) clearStreamingAnswerHtml()
  else if (streamingAnswerHtmlSource.value !== streamingLiveAnswerContent.value) scheduleStreamingAnswerRender()
  scrollBottomIfFollowing()
}

function mergeElectronProcessSteps(context: ElectronAgentRunContext): ProcessStep[] {
  const canonicalSteps = readTurnProtocol(context.protocolState).process
  const canonicalKeys = new Set(canonicalSteps.map(step => String(step.key || '')))
  const pending = context.processEphemeralSteps.filter(step => !canonicalKeys.has(String(step.key || '')))
  return [...canonicalSteps, ...pending]
}

function projectElectronAgentProgress(context: ElectronAgentRunContext) {
  if (!electronPresentationOwnedBy(context)) return
  streamingOwnerSessionId.value = context.run.session_id
  activeTurnId.value = context.run.turn_id
  activeTurnSessionId.value = context.run.session_id
  processExpanded.value = true
  streamingProcess.status = 'running'
  const partial: ProcessStep[] = context.assistantStreamMode === 'process' && context.ephemeralText ? [{
    kind: 'message',
    key: `electron-agent-delta:${context.run.run_id}`,
    text: context.ephemeralText,
    phase: 'commentary',
    source: 'model',
    authority: 'ephemeral',
    streaming: true,
  }] : []
  streamingProcess.steps = [
    ...mergeElectronProcessSteps(context),
    ...partial,
  ]
  streamingLiveAnswerContent.value = (context.assistantStreamPurpose === 'main_agent'
    && ['candidate', 'answer'].includes(context.assistantStreamMode))
    || (context.assistantStreamMode === 'private' && !!context.liveAnswerText)
    ? context.liveAnswerText
    : ''
  if (!streamingLiveAnswerContent.value) clearStreamingAnswerHtml()
  else if (streamingAnswerHtmlSource.value !== streamingLiveAnswerContent.value) scheduleStreamingAnswerRender()
}

function cancelElectronDeltaProjection(context?: ElectronAgentRunContext): void {
  if (context && electronDeltaProjectionContext && electronDeltaProjectionContext !== context) return
  if (electronDeltaProjectionTimer) clearTimeout(electronDeltaProjectionTimer)
  electronDeltaProjectionTimer = null
  electronDeltaProjectionContext = null
}

function flushElectronDeltaProjection(): void {
  const context = electronDeltaProjectionContext
  electronDeltaProjectionTimer = null
  electronDeltaProjectionContext = null
  if (!context || !electronAgentRuns.has(context.run.run_id)) return
  projectElectronAgentProgress(context)
  if (electronPresentationOwnedBy(context)) void scrollBottomIfFollowing()
}

function scheduleElectronDeltaProjection(context: ElectronAgentRunContext): void {
  electronDeltaProjectionContext = context
  if (electronDeltaProjectionTimer) return
  electronDeltaProjectionTimer = setTimeout(
    flushElectronDeltaProjection,
    ELECTRON_DELTA_PROJECTION_DELAY_MS,
  )
}

function showElectronAgentDelta(context: ElectronAgentRunContext, text: string) {
  if (!text) return
  // Keep the partial while another session is open, then re-project it when
  // the user returns. It remains ephemeral and never enters session history.
  context.ephemeralText = (context.ephemeralText + text).slice(-2_000_000)
  if (context.assistantStreamPurpose === 'main_agent'
    && ['candidate', 'answer'].includes(context.assistantStreamMode)) {
    context.liveAnswerText = context.ephemeralText
  }
  if (electronPresentationOwnedBy(context)) scheduleElectronDeltaProjection(context)
}

function handleElectronAgentPiFrame(context: ElectronAgentRunContext, event: VibeAgentEvent): void {
  const frameType = String(event.frameType || '').trim()
  const payload = event.payload && typeof event.payload === 'object' ? event.payload as Record<string, any> : {}
  if (frameType === 'provider_payload') {
    cancelElectronDeltaProjection(context)
    context.providerCallSequence += 1
    const purpose = String(payload.purpose || 'main_agent')
    // Official context compaction is an internal continuation of the same
    // turn. Its summarization request must not erase or restyle the answer
    // that has already streamed from the main Agent call.
    if (purpose === 'compaction') return
    const preserveAnswer = purpose === 'session_title'
      && context.assistantStreamMode === 'answer'
      && !!context.liveAnswerText
    context.assistantStreamPurpose = purpose
    context.assistantStreamMode = purpose === 'main_agent' ? 'candidate' : 'private'
    context.ephemeralText = ''
    if (!preserveAnswer) context.liveAnswerText = ''
    if (electronPresentationOwnedBy(context) && !preserveAnswer) {
      streamingLiveAnswerContent.value = ''
      streamingAssistantContent.value = ''
    }
    projectElectronAgentProgress(context)
    return
  }
  if (frameType === 'assistant_end') {
    cancelElectronDeltaProjection(context)
    const purpose = String(payload.purpose || context.assistantStreamPurpose || 'main_agent')
    const text = String(payload.text ?? context.ephemeralText ?? '')
    const hasToolCalls = payload.has_tool_calls === true
      || (Array.isArray(payload.tool_calls) && payload.tool_calls.length > 0)
    context.assistantStreamPurpose = purpose
    if (purpose !== 'main_agent') {
      const preserveAnswer = purpose === 'session_title' && !!context.liveAnswerText
      context.assistantStreamMode = 'private'
      context.ephemeralText = ''
      if (!preserveAnswer) {
        context.liveAnswerText = ''
        if (electronPresentationOwnedBy(context)) streamingAssistantContent.value = ''
      }
    } else if (hasToolCalls) {
      // This provider message is narration for a tool wave, not the final
      // answer. Freeze it as a normal process step before the next call.
      if (text) {
        const callId = String(payload.call_id || `call-${context.providerCallSequence}`)
        const key = `electron-agent-commentary:${context.run.run_id}:${callId}`
        if (!context.processEphemeralSteps.some(step => step.key === key)) {
          context.processEphemeralSteps.push({
            kind: 'message',
            key,
            text,
            phase: 'commentary',
            source: 'model',
            authority: 'ephemeral',
            streaming: false,
          })
        }
      }
      context.assistantStreamMode = 'process'
      context.ephemeralText = ''
      context.liveAnswerText = ''
      if (electronPresentationOwnedBy(context)) streamingAssistantContent.value = ''
    } else {
      // No tool calls means this is the answer candidate. Keep rendering it
      // outside the process rail while the protocol performs final checks.
      context.assistantStreamMode = 'answer'
      context.ephemeralText = ''
      context.liveAnswerText = text
    }
    projectElectronAgentProgress(context)
    if (electronPresentationOwnedBy(context) && purpose === 'main_agent' && !hasToolCalls) {
      commitStreamingAnswerHtml(text, true)
    }
    return
  }
  if (frameType === 'candidate_final') {
    cancelElectronDeltaProjection(context)
    const text = String(payload.text ?? '')
    context.assistantStreamPurpose = String(payload.purpose || 'main_agent')
    context.assistantStreamMode = context.assistantStreamPurpose === 'main_agent' ? 'answer' : 'private'
    context.ephemeralText = ''
    context.liveAnswerText = context.assistantStreamPurpose === 'main_agent' ? text : ''
    projectElectronAgentProgress(context)
    if (electronPresentationOwnedBy(context) && context.assistantStreamPurpose === 'main_agent') {
      commitStreamingAnswerHtml(text, true)
    }
  }
}

function settleElectronAgentRun(context: ElectronAgentRunContext, event: VibeAgentEvent) {
  cancelElectronDeltaProjection(context)
  const waiting = String(event.state || context.state) === 'waiting_user'
  const terminalState = String(event.state || context.state)
  if (event.type === 'terminal'
    && (terminalState === 'cancelled' || terminalState === 'aborted')
    && (terminalState === 'cancelled' || cancelRequested.value)) {
    const receipt = localCancellationEvent(context, String(event.code || 'user_cancelled'))
    if (receipt && electronPresentationOwnedBy(context)) upsertEvent(receipt)
  }
  if (!waiting) {
    context.ephemeralText = ''
    context.liveAnswerText = ''
    context.processEphemeralSteps = []
    if (electronPresentationOwnedBy(context)) {
      streamingLiveAnswerContent.value = ''
      clearStreamingAnswerHtml()
    }
  }
  context.state = String(event.state || context.state)
  const waiter = electronAgentWaiters.get(context.run.run_id)
  if (event.type === 'error') {
    waiter?.reject(new Error(event.code || 'Electron Agent 运行失败'))
  } else {
    waiter?.resolve(event)
  }
  electronAgentWaiters.delete(context.run.run_id)
  if (electronPresentationOwnedBy(context)) {
    if (waiting) {
      stopElapsedTicker()
      streamingProcess.status = 'done'
      streamingProcess.durationMs = Math.max(streamingProcess.durationMs, streamingElapsedMs.value)
    } else {
      streamingProcess.steps = readTurnProtocol(context.protocolState).process
    }
  }
  if (event.type === 'error') endClarificationSubmission(context.run.session_id, clarificationSubmissionForSession(context.run.session_id)?.pendingId || '', true, context.run.turn_id)
  if (event.type === 'terminal') {
    endClarificationSubmission(context.run.session_id, clarificationSubmissionForSession(context.run.session_id)?.pendingId || '', true, context.run.turn_id)
    const replacement = [...electronAgentRuns.values()].some(other =>
      other.run.run_id !== context.run.run_id
      && other.run.session_id === context.run.session_id
      && !electronAgentStateIsTerminal(other.state),
    )
    if (!replacement) {
      setLocalSessionRuntimeState(context.run.session_id, 'terminal')
      setSessionRunning(context.run.session_id, false)
    }
    if (electronPresentationOwnedBy(context)) cancelRequested.value = false
    void finalizeElectronAgentPresentation(context)
    electronAgentRuns.delete(context.run.run_id)
  }
}

async function finalizeElectronAgentPresentation(context: ElectronAgentRunContext) {
  if (!electronPresentationOwnedBy(context)
    || streamingOwnerSessionId.value !== context.run.session_id) return
  stopElapsedTicker()
  foundationBusy.value = false
  if (activeTurnId.value === context.run.turn_id) activeTurnId.value = ''
  if (activeTurnSessionId.value === context.run.session_id) activeTurnSessionId.value = ''
  streamingOwnerSessionId.value = ''
  clearStreamingAssistant()
  resetProcessState(streamingProcess)
}

function electronAgentStateIsTerminal(state: unknown): boolean {
  return ['cancelled', 'completed', 'succeeded', 'failed', 'interrupted'].includes(String(state || ''))
}

function consumeElectronAgentStatus(context: ElectronAgentRunContext, status: any) {
  if (!status || typeof status !== 'object') return
  if (Number.isFinite(Number(status.startedAt)) && Number(status.startedAt) > 0) {
    context.startedAt = Number(status.startedAt)
  }
  if (typeof status.assistantPartialText === 'string') {
    context.ephemeralText = status.assistantPartialText.slice(-2_000_000)
    context.assistantStreamPurpose = 'main_agent'
    context.assistantStreamMode = String(status.state || status.runtime_state || '') === 'waiting_user'
      ? 'process'
      : 'candidate'
    context.liveAnswerText = context.assistantStreamMode === 'candidate' ? context.ephemeralText : ''
  }
  if (status.journalDelta) applyElectronAgentCanonical(context, status.journalDelta)
  else if (status.journal_delta) applyElectronAgentCanonical(context, status.journal_delta)
  const state = String(status.state || status.runtime_state || '')
  if (state) context.state = state
  if (['queued', 'connecting', 'running', 'cancelling'].includes(state || context.state)) {
    projectElectronAgentProgress(context)
    if (activeSessionId.value === context.run.session_id && !_elapsedTimer) {
      startElapsedTicker(context.startedAt)
    }
  }
  if (electronAgentStateIsTerminal(state)) {
    handleVibeAgentEvent({
      schema: 'vibe_agent_event.v1',
      runId: context.run.run_id,
      turnId: context.run.turn_id,
      sessionId: context.run.session_id,
      type: 'terminal',
      state,
    })
  } else if (state === 'waiting_user') {
    handleVibeAgentEvent({
      schema: 'vibe_agent_event.v1',
      runId: context.run.run_id,
      turnId: context.run.turn_id,
      sessionId: context.run.session_id,
      type: 'interaction',
      state,
    })
  }
}

function localEventId(context: ElectronAgentRunContext, role: string): string {
  return `local:${context.run.run_id}:${role}`
}

// 取消是一个终态回执，不是模型答案。保留和 Main 本地 journal 相同的
// 独立 identity/key，Renderer 可以先即时展示，随后由持久化历史无缝接管。
const LOCAL_CANCELLATION_RECEIPT = '已停止本轮处理，本轮未产生任何录入或改动。'

function localCancellationEvent(context: ElectronAgentRunContext, reason = 'user_cancelled'): VibeEvent {
  return localDisplayEvent(context, 'assistant', LOCAL_CANCELLATION_RECEIPT, {
    // This row is a receipt for the lifecycle outcome, not an answer that
    // should be sent back to Pi as conversational history.
    message_kind: 'status',
    outcome: 'cancelled',
    stop_reason: String(reason || 'user_cancelled'),
    committed: false,
    local_event_key: `${context.run.run_id}:cancelled`,
  }, [], 'cancelled')
}

function localDisplayEvent(
  context: ElectronAgentRunContext,
  role: string,
  content: string,
  meta: Record<string, any> = {},
  attachments: any[] = [],
  identity = role,
): VibeEvent {
  const eventId = localEventId(context, identity)
  const existing = events.value.find((item: any) => item.id === eventId)
  const nextOrder = existing?.event_order || Math.max(0, ...events.value.map((item: any) => Number(item.event_order || 0))) + 1
  return {
    id: eventId,
    session_id: context.run.session_id,
    vibe_project_id: String(context.run.project_id || context.run.project || ''),
    user_id: Number(currentUser.value?.id || 0),
    role,
    input_type: 'text',
    content,
    attachments: Array.isArray(attachments) ? attachments : [],
    event_order: nextOrder,
    mode: 'local_pi',
    meta: { local_agent: true, run_id: context.run.run_id, trace_id: (context.run as any).trace_id || '', ...meta },
    created_at: new Date().toISOString(),
  }
}

function localInteractionEventId(runId: string, pendingId: string): string {
  const run = String(runId || '').trim()
  const pending = String(pendingId || '').trim()
  return run && pending ? `local:${run}:interaction:${pending}` : ''
}

function localInteractionPendingId(payload: any): string {
  const source = payload?.payload && typeof payload.payload === 'object' && !payload.kind
    ? payload.payload
    : payload
  return String(source?.confirmation_id || source?.interaction_id || '').trim()
}

async function materializeLocalWaitingRun(context: ElectronAgentRunContext, payload?: any): Promise<string> {
  const sessionId = String(context.run.session_id || '')
  const pendingId = localInteractionPendingId(payload)
  const predictedId = localInteractionEventId(context.run.run_id, pendingId)
  if (predictedId) context.localInteractionEventId = predictedId
  const epoch = sessionRequestEpoch
  // Capture the submission generation before the asynchronous history read.
  // A late read from the original interaction must not resurrect a card that
  // the user has already submitted.
  const submissionSerial = clarificationSubmissionSerialBySession.get(sessionId) || 0
  const fresh = await requestSessionEvents(sessionId).catch(() => null)
  if (!fresh || epoch !== sessionRequestEpoch || activeSessionId.value !== sessionId) return predictedId
  events.value = sortEvents(fresh)
  if (submissionSerial === (clarificationSubmissionSerialBySession.get(sessionId) || 0)) restoreClarificationFromEvents()
  const persisted = events.value.find((event: any) => (
    event?.role === 'assistant'
    && event?.meta?.local_agent === true
    && String(event?.meta?.run_id || '') === context.run.run_id
    && (!pendingId || String(
      event?.meta?.clarification?.raw?.confirmation_id
      || event?.meta?.clarification?.raw?.interaction_id
      || '',
    ) === pendingId)
  ))
  if (persisted?.id) context.localInteractionEventId = String(persisted.id)
  if (persisted && eventProcessSteps(persisted).length && context.state === 'waiting_user'
    && !clarificationSubmissionMatches(sessionId, '', pendingId)) {
    // The Main-owned journal now renders the same process. Release only the
    // duplicate ephemeral overlay; the logical Run context remains parked.
    context.ephemeralText = ''
    streamingProcess.steps = []
    streamingProcess.status = 'done'
  }
  await scrollBottomIfFollowing()
  return String(context.localInteractionEventId || predictedId)
}

function showLocalInteraction(context: ElectronAgentRunContext, payload: any) {
  context.state = 'waiting_user'
  if (activeSessionId.value !== context.run.session_id) return
  const source = payload?.payload && typeof payload.payload === 'object' && !payload.kind
    ? payload.payload
    : payload
  const kind = String(source?.kind || '')
  const question = String(source?.question_to_user || source?.description || (kind === 'knowledge_confirmation' ? '请确认是否执行这项知识变更。' : '请补充这项操作所需的信息。'))
  const preview = source?.preview && typeof source.preview === 'object' ? source.preview : {}
  const sourceOptions = Array.isArray(source?.options) ? source.options : []
  const pendingId = String(source?.confirmation_id || source?.interaction_id || '')
  context.localInteractionEventId = localInteractionEventId(context.run.run_id, pendingId)
  const raw: any = kind === 'knowledge_confirmation'
    ? {
        schema: 'clarification.v2',
        kind: 'confirm',
        decision_type: 'confirmation',
        run_id: context.run.run_id,
        turn_id: context.run.turn_id,
        goal_turn_id: context.run.turn_id,
        confirmation_id: pendingId,
        title: question,
        question,
        description: String(source?.description || ''),
        options: sourceOptions.length ? sourceOptions : [
          { id: 'apply', label: '确认执行', action: 'apply' },
          { id: 'cancel', label: '先不处理', is_cancel: true, action: 'cancel' },
        ],
        ...(source?.input && typeof source.input === 'object' ? { input: source.input } : {}),
        ...(source?.old_body !== undefined || preview?.old_body !== undefined
          ? { old_body: String(source?.old_body ?? preview.old_body ?? '') } : {}),
        ...(source?.new_body !== undefined || preview?.new_body !== undefined
          ? { new_body: String(source?.new_body ?? preview.new_body ?? '') } : {}),
        ...(source?.preview_truncated !== undefined || preview?.preview_truncated !== undefined
          ? { preview_truncated: Boolean(source?.preview_truncated ?? preview.preview_truncated) } : {}),
        ...(source?.preview_excerpt !== undefined || preview?.preview_excerpt !== undefined
          ? { preview_excerpt: String(source?.preview_excerpt ?? preview.preview_excerpt ?? '') } : {}),
        preview,
      }
    : {
        schema: 'clarification.v2',
        kind: 'ask',
        run_id: context.run.run_id,
        turn_id: context.run.turn_id,
        goal_turn_id: context.run.turn_id,
        interaction_id: pendingId,
        title: question,
        question,
        description: String(source?.description || ''),
        options: sourceOptions,
        ...(source?.input && typeof source.input === 'object' ? { input: source.input } : {}),
      }
  clarificationActive.value = { question, raw, pending: [] }
  setSessionRunning(context.run.session_id, true)
}

function localAgentErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || '')
  const messages: Record<string, string> = {
    vibe_agent_host_busy: '本机当前已有 5 个任务在运行，请等待其中一个结束后再试。',
    vibe_agent_session_busy: '这个会话已有一个任务正在运行或等你选择，请先完成或取消它。',
    vibe_agent_session_releasing: '这个会话正在关闭。',
    vibe_agent_runtime_snapshot_invalid: '服务端返回的模型运行配置无效，请检查配置。',
    vibe_agent_runtime_snapshot_contract_invalid: '服务端返回的模型运行配置不完整，请稍后重试。',
    vibe_agent_runtime_snapshot_manifest_invalid: '服务端工具配置版本不匹配，请更新客户端。',
    vibe_agent_runtime_snapshot_identity_drift: '本轮运行身份已变化，请重新发送。',
    vibe_agent_runtime_snapshot_binding_identity_drift: '本轮运行身份已变化，请重新发送。',
    vibe_agent_runtime_snapshot_skill_invalid: '本地能力配置无效，请更新客户端。',
    vibe_agent_runtime_snapshot_skill_hash_invalid: '本地能力配置校验失败，请更新客户端。',
    vibe_agent_runtime_snapshot_provider_key_missing: '当前模型没有可用凭据，请检查 Provider 配置。',
    authentication_required: '登录状态已失效，请重新登录。',
    account_not_found: '当前登录账号不存在，请重新登录。',
    account_disabled: '当前账号已停用，不能启动对话。',
    conversation_maintenance: '对话服务正在维护，暂时不能启动新任务。',
    project_not_found: '当前项目不存在或已被删除。',
    project_membership_required: '你已不再是当前项目成员。',
    account_identity_mismatch: '登录账号在启动过程中发生变化，请重新登录。',
    vibe_agent_account_unbound: '本机运行身份尚未确认，请先发起一次本机对话。',
    vibe_agent_account_binding_conflict: '本机运行身份已变化，请重启客户端后重新登录。',
    vibe_agent_account_drift: '登录账号在本机运行过程中发生变化，请重启客户端后重新登录。',
    pi_agent_not_entitled: '当前账号暂未开放本机运行。',
    electron_agent_not_entitled: '当前账号暂未开放本机运行。',
    provider_unavailable: '当前模型服务暂时不可用。',
    provider_disabled: '当前模型已停用，请重新选择。',
    provider_identity_invalid: '当前 Provider 配置身份无效。',
    provider_key_missing: '当前 Provider 缺少有效凭据。',
    provider_base_url_invalid: '当前 Provider 服务地址无效。',
    provider_proxy_url_invalid: '当前 Provider 代理地址无效。',
    provider_strong_model_invalid: '当前 Provider 没有可用的增强模型。',
    provider_protocol_unsupported: '当前 Provider 不支持客户端对话协议。',
    provider_config_drift: '模型配置在本轮处理中发生变化，请重新发起。',
    model_call_budget_exhausted: '本轮模型调用次数已达到安全上限。',
    context_budget_exhausted: '本轮上下文已达到安全上限。',
    total_token_budget_exhausted: '本轮模型用量已达到安全上限。',
    wall_clock_exhausted: '本轮计算时间已达到安全上限。',
    step_timeout: '模型服务等待超时，本轮未产生结果。',
    provider_outcome_unknown: '模型请求结果无法确认，请查看 Trace 后再决定是否重试。',
    tool_outcome_unknown: '工具执行结果无法确认，请查看 Trace 后再决定是否重试。',
    runner_interrupted: '本机任务已中断，请查看 Trace。',
    vibe_agent_attachment_authored_body_too_large: '本地整理后的 Markdown 超过当前 4,000,000 字符上限，请缩小范围后再录入。',
    vibe_agent_attachment_source_changed: '本地附件在读取期间发生变化，请重新选择后再试。',
    vibe_agent_attachment_binding_required: '本地附件缺少当前 Run 绑定，请重新选择附件。',
    vibe_agent_local_file_ref_invalid: '本机文件引用已失效，请重新选择文件。',
    vibe_agent_local_file_refs_invalid: '本机文件引用无效，请重新选择文件。',
    vibe_agent_local_file_invalid: '本机文件不可读取，请重新选择文件。',
    vibe_agent_local_file_name_invalid: '本机文件名不可用，请重新选择文件。',
    vibe_agent_local_file_changed: '本机文件在发送前发生了变化，请重新选择文件。',
    vibe_agent_local_file_owner_invalid: '本机文件选择状态已失效，请重新选择文件。',
    vibe_agent_local_file_count_invalid: '本轮最多选择 10 个本机文件。',
    vibe_agent_local_start_payload_invalid: '本轮输入准备失败，请重新发送。',
    vibe_agent_local_start_payload_missing: '本轮输入准备失败，请重新发送。',
    vibe_agent_local_start_renderer_field_forbidden: '本轮输入包含不支持的字段，请重新发送。',
    vibe_agent_runtime_snapshot_binding_invalid: '当前模型运行配置无效，请重新登录后重试。',
    vibe_agent_runtime_snapshot_auth_missing: '当前登录状态无法领取模型配置，请重新登录。',
    vibe_agent_runner_ready_timeout: '本机运行组件启动超时，请重启客户端后重试。',
    vibe_agent_knowledge_payload_too_large: '知识库录入正文超过当前传输上限，请缩小范围后再录入。',
    invalid_markdown_chunks: 'Markdown 分块校验失败，请重新整理附件后再试。',
    pi_dependency_version_mismatch: '本机运行组件版本不兼容，请更新客户端。',
    node_version_unsupported: '本地运行环境版本不兼容，请更新客户端。',
  }
  if (messages[raw]) return messages[raw]
  // Electron prefixes an ipcRenderer.invoke rejection with the channel name
  // (for example "Error invoking remote method ...: vibe_agent_session_busy").
  // Recover the stable code so Main admission/identity failures remain
  // actionable instead of becoming the generic failure toast.
  const wrappedCode = Object.keys(messages)
    .sort((left, right) => right.length - left.length)
    .find(code => raw.includes(code))
  if (wrappedCode) return messages[wrappedCode]
  if (/(?:failed to fetch|fetch failed|networkerror|network request failed|econnrefused)/i.test(raw)) {
    return '暂时无法连接服务，请确认服务已启动后重试。'
  }
  if (/(?:could not be cloned|structured clone|not serializable|serializ)/i.test(raw)) {
    return '附件引用准备失败，请重新选择文件。'
  }
  // Main/服务端的内部实现名、协议名和错误码只进入 Trace。只有不含
  // 内部术语的中文 public message 才允许直接展示。
  if (/[一-鿿]/.test(raw) && !/(?:\bpi\b|electron|agent|runner)/i.test(raw)) return raw
  return '本轮处理失败，请稍后重试；如问题持续，请查看 Trace。'
}

function handleVibeAgentEvent(event: VibeAgentEvent) {
  if (event?.schema !== 'vibe_agent_event.v1' || !event.runId) return
  const context = electronAgentRuns.get(event.runId)
  if (!context || event.turnId !== context.run.turn_id || event.sessionId !== context.run.session_id) return
  const previousState = context.state
  if (event.type === 'state') {
    const nextState = String(event.state || context.state)
    setLocalSessionRuntimeState(context.run.session_id, nextState)
    const ownsPresentation = electronPresentationOwnedBy(context)
    if (['queued', 'connecting', 'running'].includes(nextState) && ownsPresentation) {
      endClarificationSubmission(context.run.session_id, clarificationSubmissionForSession(context.run.session_id)?.pendingId || '', false, context.run.turn_id)
      streamingOwnerSessionId.value = context.run.session_id
      activeTurnId.value = context.run.turn_id
      activeTurnSessionId.value = context.run.session_id
      processExpanded.value = true
      if (previousState === 'waiting_user') {
        context.ephemeralText = ''
        context.liveAnswerText = ''
        context.assistantStreamMode = 'candidate'
        context.assistantStreamPurpose = 'main_agent'
        if (electronPresentationOwnedBy(context)) {
          streamingLiveAnswerContent.value = ''
          clearStreamingAnswerHtml()
        }
        context.startedAt = Date.now()
        startElapsedTicker(context.startedAt)
      }
      streamingProcess.status = 'running'
      void scrollBottomIfFollowing()
    } else if (nextState === 'waiting_user' && ownsPresentation) {
      stopElapsedTicker()
      streamingProcess.status = 'done'
      streamingProcess.durationMs = Math.max(streamingProcess.durationMs, streamingElapsedMs.value)
    }
  }
  if (event.journalDelta) applyElectronAgentCanonical(context, event.journalDelta)
  if (event.type === 'pi_frame') handleElectronAgentPiFrame(context, event)
  if (event.type === 'assistant_delta') showElectronAgentDelta(context, String(event.text || ''))
  if (event.type === 'session_title') {
    const title = String(event.title || '').trim()
    if (title) applySessionTitle(context.run.session_id, title)
  }
  if (event.type === 'interaction_request') {
    // Main emits a waiting state before the detailed request while it writes
    // the durable checkpoint. Render/register the real card first; only then
    // may the sender promise settle. Otherwise the context can be removed by
    // sendLocalPiTurn before this request arrives, dropping the card entirely.
    if (electronPresentationOwnedBy(context)) {
      endClarificationSubmission(context.run.session_id, clarificationSubmissionForSession(context.run.session_id)?.pendingId || '', false, context.run.turn_id)
      showLocalInteraction(context, event.payload)
    }
    setLocalSessionRuntimeState(context.run.session_id, 'waiting_user')
    settleElectronAgentRun(context, { ...event, state: 'waiting_user' })
    void materializeLocalWaitingRun(context, event.payload)
  }
  if (event.type === 'done') {
    const payload: any = event.payload || {}
    context.state = String(payload.status || context.state)
    if ((payload.status === 'aborted' || payload.status === 'cancelled')
      && (payload.status === 'cancelled' || cancelRequested.value || payload.code === 'user_stop_all')) {
      const receipt = localCancellationEvent(context, String(payload.code || 'user_cancelled'))
      if (receipt && electronPresentationOwnedBy(context)) upsertEvent(receipt)
    }
    if (payload.status === 'waiting_user') {
      endClarificationSubmission(context.run.session_id, clarificationSubmissionForSession(context.run.session_id)?.pendingId || '', false, context.run.turn_id)
    }
    if (payload.text && payload.status === 'completed') {
      const assistant = localDisplayEvent(context, 'assistant', String(payload.text), { stop_reason: 'stop' })
      context.localAssistantEventId = assistant.id
      if (electronPresentationOwnedBy(context)) {
        // `done(completed)` is the final durable handoff. Candidate text may
        // already have streamed outside the process rail; the persisted event
        // now replaces that preview atomically.
        stopElapsedTicker()
        streamingProcess.status = 'done'
        streamingProcess.durationMs = Math.max(streamingProcess.durationMs, streamingElapsedMs.value)
        context.ephemeralText = ''
        context.liveAnswerText = ''
        context.processEphemeralSteps = []
        streamingLiveAnswerContent.value = ''
        clearStreamingAnswerHtml()
        streamingAssistantEventId.value = assistant.id
        upsertEvent(assistant)
      }
    }
    if (payload.status === 'waiting_user') {
      // `done` is only a lifecycle marker in the local protocol and normally
      // carries no question/preview. The preceding interaction_request owns
      // the actual card; rendering this bare status as a new card would
      // replace its identity and lose the user's pending choices.
      const hasInteractionIdentity = Boolean(
        String(payload.interaction_id || payload.confirmation_id || '').trim(),
      )
      const hasInteractionDetail = Boolean(
        String(payload.question_to_user || payload.description || '').trim()
        || Array.isArray(payload.options)
        || (payload.preview && typeof payload.preview === 'object'),
      )
      if (hasInteractionIdentity && hasInteractionDetail) {
        const currentId = String(
          clarificationActive.value?.raw?.interaction_id
          || clarificationActive.value?.raw?.confirmation_id
          || '',
        ).trim()
        if (!currentId || currentId !== String(payload.interaction_id || payload.confirmation_id || '').trim()) {
          showLocalInteraction(context, payload)
        }
      }
    }
  }
  if (event.type === 'state' || event.type === 'interaction') {
    context.state = String(event.state || context.state)
    setSessionRunning(context.run.session_id, true)
    // `state=running` is emitted as soon as the child reaches `ready`; it is
    // only a progress notification, not completion of the logical Run. Settle
    // the sender promise at a real waiting checkpoint (or explicit interaction)
    // so the renderer cannot tear down its owner while Pi is still running.
    if (event.type === 'interaction') {
      settleElectronAgentRun(context, event)
    }
  }
  if (event.type === 'error' || event.type === 'terminal') settleElectronAgentRun(context, event)
}

function ensureVibeAgentEventListener() {
  if (offVibeAgentEvent || !electronAgentBridge()?.onEvent) return
  offVibeAgentEvent = electronAgentBridge()!.onEvent(handleVibeAgentEvent)
}

async function recoverElectronAgentRunUnsafe(sessionId: string) {
  const bridge = electronAgentBridge()
  if (!bridge || !sessionId) return
  ensureVibeAgentEventListener()
  let context = electronRunForTurn('', sessionId)
  if (context && !context.localCold && bridge.status) {
    const liveStatus = await bridge.status({ runId: context.run.run_id, accountId: localAccountId() }).catch(() => null)
    if (!liveStatus && bridge.recoverableLocal) {
      const recoverable = bridge.recoverableLocal({ accountId: localAccountId() })
      const descriptors: any = recoverable ? await recoverable.catch(() => []) : []
      const descriptor = (Array.isArray(descriptors) ? descriptors : []).find((item: any) =>
        String(item?.run_id || item?.run?.run_id || '') === context!.run.run_id)
      if (descriptor) {
        context.localDescriptor = descriptor
        context.localCold = true
      }
    }
  }
  if (!context) {
    const listed: any = await bridge.list({ accountId: localAccountId() }).catch(() => null)
    const runs = Array.isArray(listed)
      ? listed
      : Array.isArray(listed?.runs)
        ? listed.runs
        : Array.isArray(listed?.items)
          ? listed.items
          : []
    let run = runs.find((item: any) =>
      item?.execution_host === 'electron'
      && String(item?.session_id || item?.sessionId || '') === sessionId
      && !electronAgentStateIsTerminal(item?.state || item?.runtime_state))
    let descriptor: any = null
    if (!run && bridge.recoverableLocal) {
      const descriptors: any = await bridge.recoverableLocal({ accountId: localAccountId() }).catch(() => [])
      descriptor = (Array.isArray(descriptors) ? descriptors : []).find((item: any) =>
        String(item?.run?.session_id || item?.run?.sessionId || item?.session_id || '') === sessionId
        && ['waiting_user', 'resume_ready'].includes(String(item?.phase || item?.state || '')))
      if (descriptor?.run) {
        run = {
          ...descriptor.run,
          execution_host: 'electron',
          execution_mode: 'local',
          state: 'waiting_user',
          run_id: String(descriptor.run.run_id || descriptor.run.runId || descriptor.run_id || ''),
          turn_id: String(descriptor.run.turn_id || descriptor.run.turnId || ''),
          session_id: String(descriptor.run.session_id || descriptor.run.sessionId || sessionId),
          project_id: String(descriptor.run.project_id || descriptor.run.projectId || descriptor.run.project || ''),
        }
      }
    }
    if (!run?.run_id && !run?.runId) return
    context = registerElectronAgentRun({
      ...run,
      run_id: String(run.run_id || run.runId),
      turn_id: String(run.turn_id || run.turnId),
      session_id: String(run.session_id || run.sessionId),
    } as FoundationAgentRun)
    if (descriptor) {
      context.localDescriptor = descriptor
      context.localCold = true
    }
  }
  streamingOwnerSessionId.value = sessionId
  activeTurnId.value = context.run.turn_id
  activeTurnSessionId.value = sessionId
  setSessionRunning(sessionId, true)
  setLocalSessionRuntimeState(sessionId, String((context as any).state || 'running'))
  if (context.localCold) {
    setLocalSessionRuntimeState(sessionId, 'waiting_user')
    const pending = context.localDescriptor?.pending
    if (pending) showLocalInteraction(context, pending)
    return
  }
  await bridge.attach({ runId: context.run.run_id, accountId: localAccountId() }).catch(() => null)
  const status: any = await bridge.status({ runId: context.run.run_id, accountId: localAccountId() }).catch(() => null)
  consumeElectronAgentStatus(context, status)
}

// Opening a session and answering a just-restored card can race during a
// renderer reload. Serialize recovery per session so two callers cannot both
// attach/restart the same logical Pi Run.
const electronRecoveryInFlight = new Map<string, Promise<void>>()
function recoverElectronAgentRun(sessionId: string): Promise<void> {
  const key = String(sessionId || '').trim()
  if (!key) return Promise.resolve()
  const existing = electronRecoveryInFlight.get(key)
  if (existing) return existing
  const task = recoverElectronAgentRunUnsafe(key).finally(() => {
    if (electronRecoveryInFlight.get(key) === task) electronRecoveryInFlight.delete(key)
  })
  electronRecoveryInFlight.set(key, task)
  return task
}

type ComposerToastNotice = {
  title: string
  type?: 'success' | 'info' | 'error'
  duration?: number
}

function showComposerToast(notice: ComposerToastNotice): void {
  const title = String(notice?.title || '').trim()
  if (!title || typeof window.$toast !== 'function') return
  window.$toast({
    title,
    type: notice.type || 'info',
    position: 'bottom-right',
    duration: notice.duration ?? 3000,
    actionText: '关闭',
  })
}

watch(cancelRequested, (stopping, wasStopping) => {
  if (!stopping || wasStopping) return
  showComposerToast({ title: '正在停止本轮…', type: 'info', duration: 3000 })
})

async function stopFoundationTurn() {
  const visibleRun = electronRunForTurn('', activeSessionId.value)
  const targetTurnId = visibleRun?.run.turn_id
    || (activeTurnSessionId.value === activeSessionId.value ? activeTurnId.value : '')
  if (!targetTurnId || cancelRequested.value) return
  cancelRequested.value = true
  try {
    const electronRun = electronRunForTurn(
      targetTurnId,
      activeSessionId.value,
    )
    if (electronRun) {
      const bridge = electronAgentBridge()
      try {
        if (!bridge) throw new Error('Electron Agent 桥不可用')
        const result: any = await bridge.cancel({
          runId: electronRun.run.run_id,
          accountId: localAccountId(),
          turnId: electronRun.run.turn_id,
          sessionId: electronRun.run.session_id,
        })
        if (!result?.accepted) throw new Error(
          result?.unknown ? 'Electron Agent 取消结果尚未确认' : 'Electron Agent 未接受取消请求',
        )
      } catch {
        // Local Pi has no server-side Turn owner. Sending its identity to the
        // legacy cancel endpoint cannot stop the child and would reintroduce a
        // runtime server dependency; let the user retry once Main is reachable.
        cancelRequested.value = false
        ElMessage.error('本地 Agent 暂时无法连接，请稍后重试停止。')
        return
      }
      return
    }
    // Local Pi has no server-side Turn owner. If the local Run disappeared
    // between the button press and this check, keep the identity unconfirmed
    // instead of sending it to the retired server cancel endpoint.
    cancelRequested.value = false
    ElMessage.error('本地 Agent 状态暂时不可用，请稍后重试停止。')
  } catch { cancelRequested.value = false /* 失败允许再点 */ }
}
// “已处理”计时由 Canonical 业务生命周期驱动，不使用旧 process_done，也不以 SSE 关闭代替 terminal。
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
// 思考态只看 Canonical 业务状态；SSE 是否仍连接不能把已 terminal 的本轮继续标成运行中。
const visibleStreamingOwner = computed(() =>
  !!activeSessionId.value && streamingOwnerSessionId.value === activeSessionId.value,
)
const pendingUserSubmissionVisible = computed(() =>
  visibleStreamingOwner.value && !!pendingUserSubmissionText.value,
)
const procRunning = computed(() => visibleStreamingOwner.value
  && (streamingProcess.status === 'running' || clarificationSubmittingVisible.value))
// Orb 只代表“答案开始前的思考阶段”。正式 assistant item 一出现就退出，不能等整轮 terminal。
const thinkingOrbVisible = computed(() => procRunning.value
  && !(streamingCanonicalModel.value?.answers.length)
  && !streamingAnswerPreview.value
  && !streamingAssistantEventId.value)
const procDurationMs = computed(() =>
  procRunning.value ? streamingElapsedMs.value : streamingProcess.durationMs)
const processExpanded = ref(false)
const streamingProcess = createProcessState()
// 历史事件渲染（eventDisplayContent）仍需读取方案包状态展示，保留只读覆盖表
const packageStatusOverrides = ref<Record<string, string>>({})
const sessionTitleOverrides = ref<Record<string, string>>({})
const expandedUserMessageIds = ref<string[]>([])
const overflowingUserMessageIds = ref<string[]>([])
const measuredUserMessageIds = ref<string[]>([])
const PENDING_USER_MESSAGE_ID = 'pending-user-submission'
const userMessageOverflowElements = new Map<HTMLElement, string>()
let userMessageOverflowObserver: ResizeObserver | null = null
let userMessageOverflowRaf = 0
let userMessageOverflowWindowResizeRegistered = false
const vUserMessageOverflow: Directive<HTMLElement, string | undefined> = {
  mounted(element, binding) {
    bindUserMessageOverflowElement(element, binding.value)
  },
  updated(element, binding) {
    if (binding.value !== binding.oldValue) {
      unbindUserMessageOverflowElement(element)
      bindUserMessageOverflowElement(element, binding.value)
      return
    }
    scheduleUserMessageOverflowMeasurements()
  },
  beforeUnmount(element) {
    unbindUserMessageOverflowElement(element)
  },
}
const expandedAttachmentEventIds = ref<string[]>([])
const deletingSessionId = ref('')
const streamingAssistantContent = ref('')
// assistant event_saved 到达后，正式事件接管过程与答案渲染；避免临时思考块落到答案下方。
const streamingAssistantEventId = ref('')
const streamingSources = ref<any[]>([])        // T1 溯源：本轮答案的来源段（流式渲染用）
const streamingVerification = ref<any | null>(null) // T8 核验：{checked, issues, clean}
const streamingCanonicalModel = ref<TurnProtocolReadModel | null>(null)
type TurnTransportNotice = {
  kind: 'connection' | 'protocol'
  title: string
  detail: string
  reason?: string
}
type TurnOutcomeNoticeModel = {
  kind: 'failed' | 'cancelled' | 'interrupted' | 'partial' | 'connection' | 'protocol'
  title: string
  detail?: string
  reason?: string
  partial?: boolean
}
const streamingTransportNotice = ref<TurnTransportNotice | null>(null)
const streamingContinuationParentId = ref('')
const hoveredConversationRailIndex = ref<number | null>(null)
const activeConversationEventId = ref('')
const timelineEl = ref<HTMLElement | null>(null)
let timelineUserScrollIntentUntil = 0
const processBodyEl = ref<HTMLElement | null>(null)
const draftEl = ref<HTMLTextAreaElement | null>(null)
const MAX_CONVERSATION_RAIL_ITEMS = 40
let conversationRailRaf = 0
const baselineDraft = reactive<{ system_name: string; summary: string; system_goals: { name: string; description: string }[] }>({ system_name: '', summary: '', system_goals: [] })
const composerDraft = computed({
  get: () => draft.value,
  set: (value: string) => { draft.value = value },
})
function composerAttachmentStorageKeyFor(sessionId = activeSessionId.value, projectId = workspaceProjectContextId()) {
  const account = String(currentUser.value?.id || 'anonymous').trim() || 'anonymous'
  const project = String(projectId || '').trim() || 'pending'
  const session = String(sessionId || '').trim() || `new:${project}`
  // Keep account/project/session boundaries explicit while making the value
  // safe to use as a localStorage key in every deployment.
  return [account, project, session].map(value => encodeURIComponent(value)).join(':')
}
const composerAttachmentStorageKey = computed(() => composerAttachmentStorageKeyFor())
const localDraftPersistTimers = new Map<string, ReturnType<typeof setTimeout>>()
watch([composerDraft, activeSessionId], ([value, sessionId]) => {
  const key = String(sessionId || '')
  if (!key) return
  const current = localDraftPersistTimers.get(key)
  if (current) clearTimeout(current)
  const accountId = localAccountId()
  const timer = setTimeout(() => {
    localDraftPersistTimers.delete(key)
    void electronAgentBridge()?.sessions?.update?.({
      sessionId: key,
      accountId,
      draft: value,
    }).catch(() => undefined)
  }, 300)
  localDraftPersistTimers.set(key, timer)
})

const projectOptions = computed(() => projects.value.map(project => {
  const projectId = knowledgeStatsProjectId(project.id)
  const st = projectId ? projectStatsMap[projectId] : undefined
  return {
    value: String(project.id),
    label: project.name || project.project_name || `项目 ${project.id}`,
    // 项目入口只展示权威现行文档数，不再泄漏已经退役的章节/模块投影。
    hint: st ? `${st.documents} 份文档` : (project.description || project.owner_name || project.creator_name || ''),
  }
}))
const selectedProjectLabel = computed(() => {
  const id = String(selectedProjectId.value ?? '')
  const option = projectOptions.value.find(item => String(item.value) === id)
  return option?.label || selectedProject.value?.name || selectedProject.value?.project_name || ''
})
const projectSwitchTarget = computed(() => projects.value.find(item =>
  String(item.id) === String(projectSwitchTargetId.value),
) || null)
const activeSessionHasUnresolvedTurn = computed(() =>
  !!activeSessionId.value
  && streamingOwnerSessionId.value === activeSessionId.value
  && !!streamingTransportNotice.value
  && !streamingCanonicalModel.value?.terminal,
)
const activeSessionSending = computed(() =>
  !!activeSessionId.value && (
    !!sessionRuntimeState(activeSessionId.value)
    || activeSessionHasUnresolvedTurn.value
  ),
)
const conversationRailItems = computed(() => buildConversationRailItems())
const activeConversationRailIndex = computed(() => {
  const items = conversationRailItems.value
  if (!items.length) return -1
  const index = items.findIndex(item => item.id === activeConversationEventId.value)
  return index >= 0 ? index : Math.max(0, items.length - 1)
})
const sending = computed(() =>
  projectSwitchPhase.value === 'working'
  || preparingSend.value
  || foundationBusy.value
  || sendingSessionIds.value.length > 0
  || activeSessionSending.value,
)
const composerPlaceholder = computed(() => '随心输入')
// 询问模式（Codex 反问）：后端 ask_clarification（录入纪律"这段要不要记进知识库"拿不准时）→ 输入框变选项
// pending = 后端反问挂起时的"思考草稿"；用户回答时原样回传 → 续跑同一思考（不另起新轮）。
const clarificationActive = ref<{ question: string; raw?: any; pending?: any[] } | null>(null)
const clarificationSubmissionSerialBySession = new Map<string, number>()

function clarificationOptionIdentity(item: any): string {
  if (typeof item === 'string') return item.trim()
  if (!item || typeof item !== 'object' || Array.isArray(item)) return ''
  for (const key of ['id', 'option_id', 'value', 'label']) {
    const value = String(item[key] ?? '').trim()
    if (value) return value
  }
  return ''
}

function clarificationSubmissionMatches(
  sessionId: string,
  turnId = '',
  pendingId = '',
): boolean {
  const current = clarificationSubmissionForSession(sessionId)
  if (!current || current.sessionId !== String(sessionId || '').trim()) return false
  if (turnId && current.turnId && current.turnId !== String(turnId)) return false
  if (pendingId && current.pendingId && current.pendingId !== String(pendingId)) return false
  return true
}

function beginClarificationSubmission(
  sessionId: string,
  turnId: string,
  pendingId: string,
  runId = '',
): void {
  const normalizedSessionId = String(sessionId || '').trim()
  const normalizedPendingId = String(pendingId || '').trim()
  if (!normalizedSessionId || !normalizedPendingId) return
  clarificationSubmittingBySession.value = {
    ...clarificationSubmittingBySession.value,
    [normalizedSessionId]: {
      sessionId: normalizedSessionId,
      turnId: String(turnId || '').trim(),
      runId: String(runId || '').trim(),
      pendingId: normalizedPendingId,
    },
  }
  if (activeSessionId.value !== normalizedSessionId) return
  streamingOwnerSessionId.value = normalizedSessionId
  if (turnId) activeTurnId.value = String(turnId)
  activeTurnSessionId.value = normalizedSessionId
  processExpanded.value = true
  streamingProcess.status = 'running'
  if (!_elapsedTimer) startElapsedTicker(Date.now())
  void scrollBottomIfFollowing()
}

function updateClarificationSubmissionRun(runId: string, turnId = ''): void {
  const current = clarificationSubmissionForSession()
  if (!current) return
  const next = { ...current }
  if (runId) next.runId = String(runId)
  if (turnId) next.turnId = String(turnId)
  clarificationSubmittingBySession.value = {
    ...clarificationSubmittingBySession.value,
    [current.sessionId]: next,
  }
}

function endClarificationSubmission(
  sessionId: string,
  pendingId = '',
  failed = false,
  turnId = '',
): void {
  if (!clarificationSubmissionMatches(sessionId, turnId, pendingId)) return
  const key = String(sessionId || '').trim()
  const next = { ...clarificationSubmittingBySession.value }
  delete next[key]
  clarificationSubmittingBySession.value = next
  if (failed && activeSessionId.value === String(sessionId || '').trim()) {
    stopElapsedTicker()
    streamingProcess.status = 'done'
    streamingProcess.durationMs = Math.max(streamingProcess.durationMs, streamingElapsedMs.value)
  }
}
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
          description: String(item.description || (raw.decision_type === 'confirmation' ? item.effect || '' : '')),
          value: `__CLARIFICATION_OPTION__:${clarificationOptionIdentity(item)}`,
        })),
        ...(input.enabled ? [{
          type: 'input' as const,
          placeholder: String(input.placeholder),
          required: Boolean(input.required),
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
  if (clarificationSubmissionForSession(activeSessionId.value)) {
    // A response was already submitted locally. The durable event still has
    // the old pending card until Main records the resumed turn; do not flash
    // that stale card while the same logical Goal is being continued.
    clarificationActive.value = null
    return
  }
  if (last && last.role === 'assistant') {
    const q = eventClarificationQuestion(last)
    const clar = eventClarificationData(last)
    // 可选连锁候选仍允许恢复到输入区处理，但不会触发消息头“等你选择”。
    clarificationActive.value = q
      ? { question: q, raw: clar?.raw, pending: Array.isArray(clar?.pending) ? clar.pending : [] }
      : null
  } else {
    clarificationActive.value = null
  }
}
const streamingOutcomeNotice = computed<TurnOutcomeNoticeModel | null>(() => {
  return outcomeNoticeProps(streamingCanonicalModel.value?.outcome)
    || streamingTransportNotice.value
})
const streamingAnswerPreview = computed(() => {
  if (streamingLiveAnswerContent.value) return streamingLiveAnswerContent.value
  const context = electronRunForTurn(activeTurnId.value, activeSessionId.value)
  if (context && ['process', 'private'].includes(context.assistantStreamMode)
    && !context.liveAnswerText) return ''
  return streamingAssistantContent.value
})
const streamingTurnVisible = computed(() =>
  visibleStreamingOwner.value
  && !streamingAssistantEventId.value
  && (
    !!streamingAnswerPreview.value
    || !!streamingOutcomeNotice.value
    || procRunning.value
    || streamingProcess.steps.length > 0
  ),
)
const currentSessionStreamingPending = computed(() =>
  visibleStreamingOwner.value
  && (
    activeSessionSending.value
    || streamingProcess.status === 'running'
    || streamingTurnVisible.value
  ),
)
const showConversationEmpty = computed(() => shouldShowConversationEmptyState({
  eventCount: events.value.length,
  activeSessionId: activeSessionId.value,
  streamingOwnerSessionId: streamingOwnerSessionId.value,
  streamingPending: currentSessionStreamingPending.value,
}))
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

function setSideCollapsed(collapsed: boolean) {
  if (collapsed) cancelSideResize()
  sideCollapsed.value = collapsed
  localStorage.setItem(SIDE_COLLAPSED_KEY, collapsed ? '1' : '0')
}

// ===== Windows 窗口控制：关闭 / 最大化切换 / 最小化 =====
// Windows 三键占用 mac 红绿灯的左上位置；macOS 使用原生红绿灯，不重复渲染。
// windowKey 随 route.query 传递（dashboard 开 vibe 窗口时带 vibe-workbench，workbench→knowledge 跳转保留 query）。
const route = useRoute()
const router = useRouter()
const showWinControls = computed(() => !!window.electronAPI && !isMacPlatform)
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
  for (const timer of localDraftPersistTimers.values()) clearTimeout(timer)
  localDraftPersistTimers.clear()
  projectListRefreshEpoch += 1
  projectListRefreshing.value = false
  projectSwitchRequestToken.value = null
  projectSwitchDialogOpen.value = false
  offMaximizeState?.()
  offVibeAgentEvent?.()
  offVibeAgentEvent = null
  stopUserMessageOverflowObservation()
  stopShellResizeObserver()
  cancelSideResize()
  stopWorkspaceMainWidthObserver()
  workspaceResizeSession = null
  workspaceWindowResizing.value = false
  projectContextEpoch += 1
  sessionRequestEpoch += 1
  stopKnowledgeActivity()
  workspaceRequestGate.invalidateAll()
  workspaceChangeListRequests.clear()
  workspaceFileListRequests.clear()
  sessionEventsRequests.clear()
  workspaceSessionFileSnapshots.clear()
  stopElapsedTicker()
  clearStreamingAnswerHtml()
  stopRunningTurnPolling()
  runningTurnPollInFlight = false
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
  } catch {
    vibeCapabilities.value = {}
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

onMounted(() => {
  ensureProfileSync()
  initializeInfoRail()
  startShellResizeObserver()
  startWorkspaceMainWidthObserver()
  const authToken = readLocalAuthToken()
  void (async () => {
    if (authToken) await fetchProfile().catch(() => undefined)
    if (localPiAgentEnabled() && !String(currentUser.value?.id || '').trim()) {
      ElMessage.error('当前账号身份无法确认，请重新登录。')
      return
    }
    await bootstrap()
    if (authToken && currentUser.value?.id) {
      const resumeTraces = electronAgentBridge()?.trace?.resume?.({
        accountId: localAccountId(),
        baseUrl: localKnowledgeBaseUrl(),
        headers: { Authorization: `token=${authToken}` },
      })
      if (resumeTraces) void resumeTraces.catch(() => undefined)
    }
  })()
  loadVibeCapabilities()
  trackMaximizeState()
  ensureVibeAgentEventListener()
})

watch(
  () => [events.value.length, streamingAssistantContent.value],
  async () => { await nextTick(updateActiveConversationRail) },
)

async function bootstrap() {
  loading.value = true
  try {
    const response: any = await ApiGetJoinProjects({})
    projects.value = Array.isArray(response) ? response : (response?.results || [])
    void loadKbStats()
    if (projects.value.length) {
      const saved = localStorage.getItem('vibe_project_source_project_id')
      const target = projects.value.find(item => String(item.id) === String(saved)) || projects.value[0]
      await selectProject(target, { refreshStats: false })
    }
  } finally {
    loading.value = false
  }
}

type LoadedProjectSwitchContext = {
  project: any
  vibeProject: VibeProject
  sessions: VibeSession[]
  firstSessionId: string
  firstEvents: VibeEvent[] | null
}

function projectSwitchRequestIsActive(request = projectSwitchRequestToken.value): boolean {
  return !!request && isProjectSwitchCurrent(projectSwitchState.value, request)
}

function joinedProjectRows(payload: any): any[] | null {
  if (Array.isArray(payload)) return payload
  return Array.isArray(payload?.results) ? payload.results : null
}

function projectListRefreshFailure(reason: unknown): string {
  const value = reason as any
  const detail = String(value?.message || value?.msg || value?.detail || '').trim()
  return detail
    ? `项目列表刷新失败，可重试：${detail}`
    : '项目列表刷新失败，可重试。'
}

function refreshProjectOptionStats(rows: any[], requestEpoch: number): void {
  const contextEpoch = projectContextEpoch
  const projectIds = collectKnowledgeStatsProjectIds(rows)
  if (!projectIds.length) return
  void getFoundationKnowledgeStatsMany(projectIds)
    .then((payload) => {
      if (requestEpoch !== projectListRefreshEpoch || contextEpoch !== projectContextEpoch) return
      projectIds.forEach(projectId => writeKnowledgeStats(projectStatsMap, payload, projectId))
    })
    .catch(() => { /* 计数刷新失败不影响项目列表 */ })
}

async function refreshProjectList() {
  if (projectListRefreshing.value || projectSwitchState.value.phase === 'working') return
  const requestEpoch = ++projectListRefreshEpoch
  projectListRefreshing.value = true
  projectListRefreshError.value = ''
  try {
    const response: any = await ApiGetJoinProjects({})
    if (requestEpoch !== projectListRefreshEpoch || !projectSwitchDialogOpen.value) return
    if (response?.result === 0) throw new Error(String(response?.msg || response?.detail || '请求失败'))
    const nextProjects = joinedProjectRows(response)
    if (!nextProjects) throw new Error(String(response?.msg || response?.detail || '响应格式无效'))
    projects.value = nextProjects
    const current = nextProjects.find(item => String(item.id) === String(selectedProjectId.value ?? ''))
    if (current) selectedProject.value = current
    refreshProjectOptionStats(nextProjects, requestEpoch)
  } catch (reason) {
    if (requestEpoch !== projectListRefreshEpoch || !projectSwitchDialogOpen.value) return
    projectListRefreshError.value = projectListRefreshFailure(reason)
  } finally {
    if (requestEpoch === projectListRefreshEpoch) projectListRefreshing.value = false
  }
}

function openProjectSwitchDialog() {
  if (loading.value || projectListRefreshing.value || projectSwitchState.value.phase === 'working') return
  projectSwitchTargetId.value = ''
  projectListRefreshError.value = ''
  projectSwitchState.value = {
    ...projectSwitchState.value,
    open: true,
    phase: 'idle',
    targetProjectId: '',
    targetProject: null,
    error: '',
  }
  projectSwitchDialogOpen.value = true
  void refreshProjectList()
}

function closeProjectSwitchDialog() {
  if (projectSwitchState.value.phase === 'working') return
  projectListRefreshEpoch += 1
  projectListRefreshing.value = false
  projectListRefreshError.value = ''
  projectSwitchDialogOpen.value = false
  projectSwitchState.value = {
    ...closeProjectSwitchDialogState(projectSwitchState.value),
    targetProjectId: '',
    targetProject: null,
    error: '',
  }
  projectSwitchRequestToken.value = null
}

async function loadProjectSwitchContext(
  project: any,
  request: ProjectSwitchRequest,
): Promise<LoadedProjectSwitchContext | null> {
  const numericProjectId = Number(project?.id)
  if (!Number.isSafeInteger(numericProjectId) || numericProjectId <= 0) {
    throw new Error('当前项目身份无效，请重新选择项目。')
  }

  let resolvedProject: VibeProject
  try {
    resolvedProject = await getVibeProjectByAsyncProject(numericProjectId)
  } catch (reason) {
    if (!projectSwitchRequestIsActive(request)) return null
    // Keep the established resolver fallback for projects created before the
    // Vibe record existed; an init failure still surfaces in the dialog.
    resolvedProject = await initVibeProject(numericProjectId, {
      name: project.name || project.project_name || `项目 ${project.id}`,
    })
  }
  if (!projectSwitchRequestIsActive(request)) return null
  if (!resolvedProject?.id) throw new Error('项目初始化响应无效，请重试。')

  const loadedSessions = await localSessionsForProject(String(project.id))
  if (!projectSwitchRequestIsActive(request)) return null
  projectSwitchState.value = markProjectSwitchSessionsLoaded(
    projectSwitchState.value,
    request,
    { sessions: loadedSessions, count: loadedSessions.length, empty: loadedSessions.length === 0 },
  )
  if (!projectSwitchRequestIsActive(request)) return null

  const firstSessionId = String(loadedSessions[0]?.id || '').trim()
  if (loadedSessions.length && !firstSessionId) {
    throw new Error('首个会话身份无效，请重试。')
  }
  let firstEvents: VibeEvent[] | null = null
  if (firstSessionId) {
    const loaded = await requestSessionEvents(firstSessionId)
    if (!projectSwitchRequestIsActive(request)) return null
    if (!Array.isArray(loaded)) throw new Error('首个会话内容响应无效，请重试。')
    firstEvents = loaded
    projectSwitchState.value = markProjectSwitchContentLoaded(
      projectSwitchState.value,
      request,
      firstSessionId,
    )
  }
  return {
    project,
    vibeProject: resolvedProject,
    sessions: loadedSessions,
    firstSessionId,
    firstEvents,
  }
}

function resetProjectConversationState() {
  sessionRequestEpoch += 1
  activeSessionId.value = ''
  sessions.value = []
  events.value = []
  sessionFilesLoading.value = false
  sessionFilesError.value = ''
  processExpanded.value = false
  clarificationActive.value = null
  stopElapsedTicker()
  stopRunningTurnPolling()
  runningTurnPollInFlight = false
  streamingOwnerSessionId.value = ''
  activeTurnId.value = ''
  activeTurnSessionId.value = ''
  cancelRequested.value = false
  clearPendingUserSubmission()
  clearStreamingAssistant()
  resetProcessState(streamingProcess)
  foundationBusy.value = false
  sendingSessionIds.value = []
  runningSessionIds.value = []
  localSessionRunStates.value = {}
  currentView.value = 'conversation'
}

interface ProjectContextSnapshot {
  project: any | null
  projectId: string | number | null
  vibeProject: VibeProject | null
  sessions: VibeSession[]
  activeSessionId: string
  events: VibeEvent[]
  sessionFilesLoading: boolean
  sessionFilesError: string
  currentView: 'conversation' | 'baseline'
  processExpanded: boolean
  clarificationActive: { question: string; raw?: any; pending?: any[] } | null
  clarificationSubmitting: Record<string, ClarificationSubmission>
  baseline: { system_name: string; summary: string; system_goals: { name: string; description: string }[] }
  packageStatusOverrides: Record<string, string>
  sessionTitleOverrides: Record<string, string>
  selectedLlmProviderId: string
  llmProviders: VibeLLMModelPickerProvider[]
  sendingSessionIds: string[]
  runningSessionIds: string[]
  foundationBusy: boolean
  activeTurnId: string
  activeTurnSessionId: string
  streamingOwnerSessionId: string
  cancelRequested: boolean
  pendingUserSubmissionText: string
  streamingAssistantEventId: string
  streamingAssistantContent: string
  streamingLiveAnswerContent: string
  streamingSources: any[]
  streamingVerification: any | null
  streamingCanonicalModel: TurnProtocolReadModel | null
  streamingTransportNotice: TurnTransportNotice | null
  streamingContinuationParentId: string
  streamingElapsedMs: number
  process: {
    status: 'idle' | 'running' | 'done'
    steps: ProcessStep[]
    startedAt: string
    durationMs: number
    summary: string
    stats: Record<string, any>
  }
  localStorageProjectId: string | null
}

function captureProjectContextSnapshot(): ProjectContextSnapshot {
  return {
    project: selectedProject.value,
    projectId: selectedProjectId.value,
    vibeProject: vibeProject.value,
    sessions: [...sessions.value],
    activeSessionId: activeSessionId.value,
    events: [...events.value],
    sessionFilesLoading: sessionFilesLoading.value,
    sessionFilesError: sessionFilesError.value,
    currentView: currentView.value,
    processExpanded: processExpanded.value,
    clarificationActive: clarificationActive.value
      ? {
          ...clarificationActive.value,
          pending: Array.isArray(clarificationActive.value.pending)
            ? [...clarificationActive.value.pending]
            : clarificationActive.value.pending,
        }
      : null,
    clarificationSubmitting: Object.fromEntries(
      Object.entries(clarificationSubmittingBySession.value).map(([key, value]) => [key, { ...value }]),
    ),
    baseline: {
      system_name: baselineDraft.system_name,
      summary: baselineDraft.summary,
      system_goals: baselineDraft.system_goals.map(goal => ({ ...goal })),
    },
    packageStatusOverrides: { ...packageStatusOverrides.value },
    sessionTitleOverrides: { ...sessionTitleOverrides.value },
    selectedLlmProviderId: selectedLlmProviderId.value,
    llmProviders: [...llmProviders.value],
    sendingSessionIds: [...sendingSessionIds.value],
    runningSessionIds: [...runningSessionIds.value],
    foundationBusy: foundationBusy.value,
    activeTurnId: activeTurnId.value,
    activeTurnSessionId: activeTurnSessionId.value,
    streamingOwnerSessionId: streamingOwnerSessionId.value,
    cancelRequested: cancelRequested.value,
    pendingUserSubmissionText: pendingUserSubmissionText.value,
    streamingAssistantEventId: streamingAssistantEventId.value,
    streamingAssistantContent: streamingAssistantContent.value,
    streamingLiveAnswerContent: streamingLiveAnswerContent.value,
    streamingSources: [...streamingSources.value],
    streamingVerification: streamingVerification.value,
    streamingCanonicalModel: streamingCanonicalModel.value,
    streamingTransportNotice: streamingTransportNotice.value,
    streamingContinuationParentId: streamingContinuationParentId.value,
    streamingElapsedMs: streamingElapsedMs.value,
    process: {
      status: streamingProcess.status,
      steps: [...streamingProcess.steps],
      startedAt: streamingProcess.startedAt,
      durationMs: streamingProcess.durationMs,
      summary: streamingProcess.summary,
      stats: { ...streamingProcess.stats },
    },
    localStorageProjectId: localStorage.getItem('vibe_project_source_project_id'),
  }
}

function restoreProjectContextSnapshot(snapshot: ProjectContextSnapshot): void {
  // Keep epochs monotonic: restoring data must not make a stale callback look
  // current again.
  ++projectContextEpoch
  sessionRequestEpoch += 1
  stopKnowledgeActivity()
  stopRunningTurnPolling()
  runningTurnPollInFlight = false
  stopElapsedTicker()
  clearStreamingAnswerHtml()

  selectedProject.value = snapshot.project
  selectedProjectId.value = snapshot.projectId
  vibeProject.value = snapshot.vibeProject
  sessions.value = [...snapshot.sessions]
  activeSessionId.value = snapshot.activeSessionId
  events.value = [...snapshot.events]
  sessionFilesLoading.value = snapshot.sessionFilesLoading
  sessionFilesError.value = snapshot.sessionFilesError
  currentView.value = snapshot.currentView
  processExpanded.value = snapshot.processExpanded
  clarificationActive.value = snapshot.clarificationActive
    ? {
        ...snapshot.clarificationActive,
        pending: Array.isArray(snapshot.clarificationActive.pending)
          ? [...snapshot.clarificationActive.pending]
          : snapshot.clarificationActive.pending,
      }
    : null
  clarificationSubmittingBySession.value = Object.fromEntries(
    Object.entries(snapshot.clarificationSubmitting || {}).map(([key, value]) => [key, { ...value }]),
  )
  baselineDraft.system_name = snapshot.baseline.system_name
  baselineDraft.summary = snapshot.baseline.summary
  baselineDraft.system_goals = snapshot.baseline.system_goals.map(goal => ({ ...goal }))
  packageStatusOverrides.value = { ...snapshot.packageStatusOverrides }
  sessionTitleOverrides.value = { ...snapshot.sessionTitleOverrides }
  selectedLlmProviderId.value = snapshot.selectedLlmProviderId
  llmProviders.value = [...snapshot.llmProviders]
  sendingSessionIds.value = [...snapshot.sendingSessionIds]
  runningSessionIds.value = [...snapshot.runningSessionIds]
  foundationBusy.value = snapshot.foundationBusy
  activeTurnId.value = snapshot.activeTurnId
  activeTurnSessionId.value = snapshot.activeTurnSessionId
  streamingOwnerSessionId.value = snapshot.streamingOwnerSessionId
  cancelRequested.value = snapshot.cancelRequested
  pendingUserSubmissionText.value = snapshot.pendingUserSubmissionText
  streamingAssistantEventId.value = snapshot.streamingAssistantEventId
  streamingAssistantContent.value = snapshot.streamingAssistantContent
  streamingLiveAnswerContent.value = snapshot.streamingLiveAnswerContent || ''
  if (streamingLiveAnswerContent.value) scheduleStreamingAnswerRender()
  streamingSources.value = [...snapshot.streamingSources]
  streamingVerification.value = snapshot.streamingVerification
  streamingCanonicalModel.value = snapshot.streamingCanonicalModel
  streamingTransportNotice.value = snapshot.streamingTransportNotice
  streamingContinuationParentId.value = snapshot.streamingContinuationParentId
  streamingElapsedMs.value = snapshot.streamingElapsedMs
  streamingProcess.status = snapshot.process.status
  streamingProcess.steps = [...snapshot.process.steps]
  streamingProcess.startedAt = snapshot.process.startedAt
  streamingProcess.durationMs = snapshot.process.durationMs
  streamingProcess.summary = snapshot.process.summary
  streamingProcess.stats = { ...snapshot.process.stats }
  if (snapshot.streamingOwnerSessionId && snapshot.foundationBusy) {
    startElapsedTicker(Math.max(0, Date.now() - snapshot.streamingElapsedMs))
  }

  const projectId = workspaceProjectContextId(snapshot.projectId)
  activateWorkspaceConversation(projectId, snapshot.activeSessionId)
  if (snapshot.localStorageProjectId == null) {
    localStorage.removeItem('vibe_project_source_project_id')
  } else {
    localStorage.setItem('vibe_project_source_project_id', snapshot.localStorageProjectId)
  }
  if (projectId) {
    void startKnowledgeActivity(projectId)
    void refreshProjectRunningTurns().catch(() => {})
  }
}

async function commitLoadedProjectSwitch(
  context: LoadedProjectSwitchContext,
  request: ProjectSwitchRequest,
): Promise<boolean> {
  if (!projectSwitchRequestIsActive(request)) return false

  // The staged resolver/list/events work above has not touched the visible
  // project. Commit the complete context in one guarded boundary.
  ++projectContextEpoch
  selectedProject.value = context.project
  selectedProjectId.value = String(context.project.id)
  vibeProject.value = context.vibeProject
  // Activating the target draft snapshots the current Viewer/Panel state and
  // restores the target project's own tabs without clearing any draft map.
  activateWorkspaceConversation(context.project.id, '')
  resetProjectConversationState()
  packageStatusOverrides.value = {}
  sessionTitleOverrides.value = {}
  syncBaselineDraft()
  sessions.value = context.sessions
  localStorage.setItem('vibe_project_source_project_id', String(context.project.id))
  void startKnowledgeActivity(context.project.id)
  void loadCurrentKbStats(context.project.id)

  if (context.firstSessionId) {
    const opened = await openSession(context.firstSessionId, context.firstEvents || [])
    if (!projectSwitchRequestIsActive(request)) return false
    if (opened === false) {
      throw new Error('首个会话尚未完成加载，请重试。')
    }
    await nextTick()
  } else {
    // An authoritative empty list is a complete, renderable conversation
    // state. Provider/running snapshots remain background refreshes.
    void loadModelConfig('').catch(() => {})
    void refreshProjectRunningTurns().catch(() => {})
    await nextTick()
  }
  return projectSwitchRequestIsActive(request)
}

async function switchProjectWithDialog(project: any) {
  if (!project) return
  if (String(project.id) === String(selectedProjectId.value ?? '')) {
    closeProjectSwitchDialog()
    return
  }
  const nextState = beginProjectSwitch(projectSwitchState.value, project)
  projectSwitchState.value = nextState
  projectSwitchTargetId.value = String(project.id)
  projectSwitchDialogOpen.value = true
  const request = projectSwitchRequest(nextState)
  projectSwitchRequestToken.value = request
  const previousContext = captureProjectContextSnapshot()
  let commitStarted = false
  try {
    const context = await loadProjectSwitchContext(project, request)
    if (!context || !projectSwitchRequestIsActive(request)) return
    commitStarted = true
    const committed = await commitLoadedProjectSwitch(context, request)
    if (!committed || !projectSwitchRequestIsActive(request)) return
    const completed = completeProjectSwitch(projectSwitchState.value, request)
    projectSwitchState.value = completed
    if (!completed.open) {
      projectSwitchDialogOpen.value = false
      projectSwitchRequestToken.value = null
    }
  } catch (reason) {
    if (!projectSwitchRequestIsActive(request)) return
    if (commitStarted) restoreProjectContextSnapshot(previousContext)
    projectSwitchState.value = failProjectSwitch(projectSwitchState.value, request, reason)
    projectSwitchDialogOpen.value = true
  }
}

function handleProjectDialogSelect(value: string | number) {
  if (projectListRefreshing.value || projectSwitchState.value.phase === 'working') return
  const project = projects.value.find(item => String(item.id) === String(value))
  if (project) void switchProjectWithDialog(project)
}

function retryProjectSwitch() {
  if (projectSwitchState.value.phase === 'working') return
  const project = projectSwitchTarget.value
    || (projectSwitchState.value.targetProject as any)
  if (project) void switchProjectWithDialog(project)
}

async function selectProject(project: any, options: { refreshStats?: boolean } = {}) {
  const epoch = ++projectContextEpoch
  selectedProject.value = project
  selectedProjectId.value = String(project.id)
  if (!activeSessionId.value) activateWorkspaceConversation(project.id, '')
  void startKnowledgeActivity(project.id)
  if (options.refreshStats !== false) void loadCurrentKbStats(project.id)
  packageStatusOverrides.value = {}
  sessionTitleOverrides.value = {}
  localStorage.setItem('vibe_project_source_project_id', String(project.id))
  let resolvedProject: VibeProject
  try {
    resolvedProject = await getVibeProjectByAsyncProject(Number(project.id))
  } catch {
    if (epoch !== projectContextEpoch) return
    resolvedProject = await initVibeProject(Number(project.id), { name: project.name || project.project_name || `项目 ${project.id}` })
  }
  if (epoch !== projectContextEpoch) return
  vibeProject.value = resolvedProject
  syncBaselineDraft()
  await refreshState({ autoOpenLatest: true }, epoch)
}

async function handleProjectChange(value: string | number) {
  handleProjectDialogSelect(value)
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

function applySessionTitle(sessionId: string, title: string) {
  if (!title) return
  sessionTitleOverrides.value = { ...sessionTitleOverrides.value, [sessionId]: title }
  sessions.value = sessions.value.map(item => item.id === sessionId ? { ...item, title } : item)
}

async function localSessionsForProject(projectId: string): Promise<VibeSession[]> {
  const api = electronAgentBridge()?.sessions
  if (!api?.list) throw new Error('本地会话存储不可用')
  const rows: any[] = await api.list({ accountId: localAccountId(), projectId, limit: 1000 })
  rows.forEach((row) => {
    if (row?.session_id && typeof row?.draft === 'string') setDraftByKey(sessionDraftKey(String(row.session_id)), row.draft)
  })
  return rows.filter(row => row && row.session_id).map(row => ({
    id: String(row.session_id),
    title: String(row.title || '新的需求对话'),
    vibe_project_id: String(row.project_id || projectId),
    llm_provider_id: String(row.provider_id || '') || selectedLlmProviderId.value || undefined,
    status: String(row.status || 'active'),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

function addBaselineGoal() {
  baselineDraft.system_goals.push({ name: '', description: '' })
}

function removeBaselineGoal(idx: number) {
  baselineDraft.system_goals.splice(idx, 1)
}

async function refreshState(
  options: { autoOpenLatest?: boolean } = {},
  contextEpoch = projectContextEpoch,
) {
  const projectId = workspaceProjectContextId()
  if (!projectId || !vibeProject.value?.id) return
  const loadedSessions = await localSessionsForProject(projectId)
  if (contextEpoch !== projectContextEpoch || workspaceProjectContextId() !== projectId) return
  sessions.value = loadedSessions
  if (options.autoOpenLatest && !activeSessionId.value && sessions.value.length) {
    await openSession(sessions.value[0].id)
    return
  }
  await Promise.all([
    loadModelConfig(activeSessionId.value).catch(() => {}),
    refreshProjectRunningTurns(),
  ])
}

async function openSession(sessionId: string, preloadedEvents: VibeEvent[] | null = null) {
  // #2：答题进行中也允许切到别的会话【只读查看】（本轮 UI 由 turnSessionId 守住、不串会话）。
  const epoch = ++sessionRequestEpoch
  const contextEpoch = projectContextEpoch
  resetTimelineNavigation()
  const switchingConversation = activeSessionId.value !== sessionId
  activeSessionId.value = sessionId
  if (switchingConversation) {
    activateWorkspaceConversation(workspaceProjectContextId(), sessionId)
  }
  events.value = []
  sessionFilesLoading.value = true
  sessionFilesError.value = ''
  currentView.value = 'conversation'
  processExpanded.value = false
  stopElapsedTicker()
  streamingOwnerSessionId.value = ''
  clearStreamingAssistant()
  resetProcessState(streamingProcess)
  const currentSession = sessions.value.find(item => item.id === sessionId)
  selectedLlmProviderId.value = currentSession?.llm_provider_id || selectedLlmProviderId.value
  void loadModelConfig(sessionId).catch(() => {})
  try {
    // Local Agent status and history are both client-owned; refresh them in
    // parallel while the session event projection loads.
    const runningRefresh = refreshLocalAgentStatuses().catch(() => {})
    const electronRecovery = recoverElectronAgentRun(sessionId).catch(() => {})
    const loadedEvents = preloadedEvents || await requestSessionEvents(sessionId)
    if (epoch !== sessionRequestEpoch || contextEpoch !== projectContextEpoch || activeSessionId.value !== sessionId) return false
    events.value = sortEvents(loadedEvents)
    workspaceSessionFileSnapshots.set(
      workspaceFileListCacheKey(sessionId),
      deriveRecentSessionFiles(events.value, sessionId, Number.MAX_SAFE_INTEGER),
    )
    restoreClarificationFromEvents()  // #4：进会话时若有未答反问 → 还原选项框
    await Promise.all([runningRefresh, electronRecovery])
    if (epoch !== sessionRequestEpoch || contextEpoch !== projectContextEpoch || activeSessionId.value !== sessionId) return false
    await scrollBottom()
  } catch (reason) {
    if (epoch !== sessionRequestEpoch || contextEpoch !== projectContextEpoch || activeSessionId.value !== sessionId) return false
    sessionFilesError.value = reason instanceof Error ? reason.message : String(reason)
    throw reason
  } finally {
    if (epoch === sessionRequestEpoch && contextEpoch === projectContextEpoch && activeSessionId.value === sessionId) {
      sessionFilesLoading.value = false
      syncActiveWorkspaceFileList()
      // 进会话即把光标放到输入框。放在 finally 是刻意的：
      // restoreClarificationFromEvents 已经跑完，composerQuestion 已定，
      // 所以带未答反问的会话不会被抢焦点（focusInput 内部自己判断）。
      composerRef.value?.focusInput()
    }
  }
  return true
}

function stopRunningTurnPolling() {
  if (runningTurnPollTimer) {
    clearTimeout(runningTurnPollTimer)
    runningTurnPollTimer = null
  }
}

function scheduleRunningTurnPolling(delay?: number) {
  stopRunningTurnPolling()
  if (!vibeProject.value?.id) return
  runningTurnPollTimer = setTimeout(() => {
    refreshProjectRunningTurns().catch(() => {})
  }, delay ?? (runningSessionIds.value.length ? RUNNING_POLL_ACTIVE_MS : RUNNING_POLL_IDLE_MS))
}

function setSessionRunning(sessionId: string, running: boolean) {
  if (!sessionId) return
  setLocalSessionRuntimeState(sessionId, running ? 'running' : 'terminal')
}

function setLocalSessionRuntimeState(sessionId: string, state: string) {
  const id = String(sessionId || '').trim()
  if (!id) return
  const next = { ...localSessionRunStates.value }
  if (['queued', 'connecting'].includes(state)) next[id] = 'queued'
  else if (state === 'waiting_user') next[id] = 'waiting_user'
  else if (['running', 'cancelling'].includes(state)) next[id] = 'running'
  else delete next[id]
  localSessionRunStates.value = next
}

async function refreshLocalAgentStatuses() {
  const bridge = electronAgentBridge()
  if (!bridge?.list) return
  const result: any = await bridge.list({ accountId: localAccountId() })
  const rows = Array.isArray(result)
    ? result
    : Array.isArray(result?.items) ? result.items : Array.isArray(result?.runs) ? result.runs : []
  const projectId = String(knowledgeStatsProjectId(selectedProjectId.value) || '')
  const next: Record<string, LocalSessionRunState> = {}
  for (const item of rows) {
    if (String(item?.execution_mode || item?.executionMode || '') !== 'local') continue
    if (projectId && String(item?.project_id || item?.projectId || '') !== projectId) continue
    const sessionId = String(item?.session_id || item?.sessionId || '')
    const lifecycle = String(item?.lifecycle || item?.state || '')
    if (!sessionId || lifecycle === 'terminal' || electronAgentStateIsTerminal(item?.state)) continue
    if (lifecycle === 'waiting_user' || String(item?.state || '') === 'waiting_user') next[sessionId] = 'waiting_user'
    else if (lifecycle === 'queued' || ['queued', 'connecting'].includes(String(item?.state || ''))) next[sessionId] = 'queued'
    else next[sessionId] = 'running'
  }
  localSessionRunStates.value = next
}

function applyCanonicalReadModel(model: TurnProtocolReadModel) {
  streamingCanonicalModel.value = model
  streamingTransportNotice.value = null
  streamingProcess.steps = model.process
  streamingProcess.status = ['queued', 'running', 'cancelling'].includes(model.state) ? 'running' : 'done'
  streamingProcess.durationMs = Number(model.processSummary?.duration_ms || streamingProcess.durationMs || 0)
  streamingProcess.summary = String(model.processSummary?.summary || '')
  streamingProcess.stats = model.processSummary?.stats && typeof model.processSummary.stats === 'object'
    ? model.processSummary.stats
    : {}
  streamingAssistantContent.value = model.content
  streamingSources.value = model.sources
  streamingVerification.value = model.verification
  clarificationActive.value = model.clarification?.question
    ? {
        question: model.clarification.question,
        raw: model.clarification.raw,
        pending: model.clarification.pending,
      }
    : null
}

async function refreshProjectRunningTurns() {
  if (!vibeProject.value?.id) {
    runningSessionIds.value = []
    return
  }
  if (runningTurnPollInFlight) return
  runningTurnPollInFlight = true
  const contextEpoch = projectContextEpoch
  try {
    await refreshLocalAgentStatuses()
    if (contextEpoch === projectContextEpoch) runningSessionIds.value = []
  } catch {
    // 短暂 Main/IPC 失败时保留上一帧，避免运行图标闪烁消失。
  } finally {
    runningTurnPollInFlight = false
    if (contextEpoch === projectContextEpoch) scheduleRunningTurnPolling()
  }
}

function newConversation() {
  sessionRequestEpoch += 1
  resetTimelineNavigation()
  const leavingSession = activeSessionId.value
  activeSessionId.value = ''
  if (leavingSession) activateWorkspaceConversation(workspaceProjectContextId(), '')
  events.value = []
  sessionFilesLoading.value = false
  sessionFilesError.value = ''
  processExpanded.value = false
  clarificationActive.value = null
  stopElapsedTicker()
  streamingOwnerSessionId.value = ''
  clearStreamingAssistant()
  resetProcessState(streamingProcess)
  currentView.value = 'conversation'
  resizeDraft()
}

async function deleteSession(sessionId: string) {
  if (!sessionId || deletingSessionId.value) return
  const targetSession = sessions.value.find(item => item.id === sessionId)
  const targetTitle = targetSession ? sessionDisplayTitle(targetSession) : '这个会话'
  const targetRuntime = sessionRuntimeState(sessionId)
  try {
    await ElMessageBox.confirm(h('div', { class: 'vibe-delete-dialog-copy' }, [
      h('p', { class: 'vibe-delete-dialog-session', title: targetTitle }, targetTitle),
      h('p', { class: 'vibe-delete-dialog-hint' }, targetRuntime
        ? '该会话的当前任务会先自动取消，然后删除全部本机数据；已经完成的知识变更不会回滚。'
        : '删除后会清空该会话的全部本机数据，且无法恢复。'),
    ]), '删除这个会话？', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      customClass: 'vibe-delete-dialog',
      modalClass: 'vibe-delete-dialog-overlay',
      confirmButtonClass: 'vibe-delete-confirm',
      cancelButtonClass: 'vibe-delete-cancel',
      showClose: false,
      closeOnClickModal: false,
      distinguishCancelAndClose: true,
    })
  } catch {
    return
  }
  deletingSessionId.value = sessionId
  const deletionProjectId = workspaceProjectContextId()
  const attachmentStorageKey = composerAttachmentStorageKeyFor(sessionId, deletionProjectId)
  try {
    const localRemove = electronAgentBridge()?.sessions?.remove
    if (!localRemove) throw new Error('本地会话存储不可用')
    await localRemove({ sessionId, accountId: localAccountId() })
    const draftTimer = localDraftPersistTimers.get(sessionId)
    if (draftTimer) clearTimeout(draftTimer)
    localDraftPersistTimers.delete(sessionId)
    clearSessionDraft(sessionId)
    composerRef.value?.clearAttachmentDraft?.(attachmentStorageKey)
    setLocalSessionRuntimeState(sessionId, 'terminal')
    sendingSessionIds.value = sendingSessionIds.value.filter(id => id !== sessionId)
    runningSessionIds.value = runningSessionIds.value.filter(id => id !== sessionId)
    const nextSubmissions = { ...clarificationSubmittingBySession.value }
    delete nextSubmissions[sessionId]
    clarificationSubmittingBySession.value = nextSubmissions
    clarificationSubmissionSerialBySession.delete(sessionId)
    const nextTitles = { ...sessionTitleOverrides.value }
    delete nextTitles[sessionId]
    sessionTitleOverrides.value = nextTitles
    electronRecoveryInFlight.delete(sessionId)
    for (const [runId, context] of electronAgentRuns) {
      if (String(context.run.session_id || '') !== sessionId) continue
      electronAgentWaiters.delete(runId)
      electronAgentRuns.delete(runId)
    }
    for (const key of [...sessionEventsRequests.keys()]) {
      if (key.startsWith(`${sessionId}:`)) sessionEventsRequests.delete(key)
    }
    workspaceSessionFileSnapshots.delete(workspaceFileListCacheKey(sessionId, deletionProjectId))
    sessions.value = sessions.value.filter(item => item.id !== sessionId)
    const currentDeletionProjectId = workspaceProjectContextId()
    const deletingCurrentProject = currentDeletionProjectId === deletionProjectId
    const deletingCurrentSession = deletedConversationIsStillActive(
      deletionProjectId,
      currentDeletionProjectId,
      sessionId,
      activeSessionId.value,
    )
    if (deletingCurrentSession) {
      sessionRequestEpoch += 1
      activeSessionId.value = ''
      activateWorkspaceConversation(deletionProjectId, '')
      events.value = []
      sessionFilesLoading.value = false
      sessionFilesError.value = ''
      processExpanded.value = false
      clarificationActive.value = null
      stopElapsedTicker()
      streamingOwnerSessionId.value = ''
      activeTurnId.value = ''
      activeTurnSessionId.value = ''
      cancelRequested.value = false
      clearPendingUserSubmission()
      clearStreamingAssistant()
      resetProcessState(streamingProcess)
      currentView.value = 'conversation'
    }
    discardWorkspaceConversation(deletionProjectId, sessionId)
    // 删除期间若已切到别的项目，旧请求只能清理旧项目缓存，不能刷新或改写新项目 UI。
    if (!deletingCurrentProject) return
    const refreshContextEpoch = projectContextEpoch
    await refreshState({ autoOpenLatest: deletingCurrentSession }, refreshContextEpoch)
  } catch (reason) {
    ElMessage.error(`删除会话失败：${localAgentErrorMessage(reason)}`)
  } finally {
    deletingSessionId.value = ''
  }
}

/** Keep a small renderer projection of the Electron-owned session manifest. */
async function ensureLocalSession(): Promise<string> {
  const currentId = String(activeSessionId.value || '')
  const current = sessions.value.find(item => String(item.id) === currentId)
  if (currentId && current
    && String(current.vibe_project_id || workspaceProjectContextId()) === String(workspaceProjectContextId())) {
    return currentId
  }
  const sessionsApi = electronAgentBridge()?.sessions
  if (!sessionsApi?.create) throw new Error('本地会话存储不可用')
  const projectId = workspaceProjectContextId()
  const created: any = await sessionsApi.create({
    sessionId: localId('session'),
    accountId: localAccountId(),
    projectId,
    title: '新的需求对话',
    providerId: selectedLlmProviderId.value || '',
    draft: draft.value,
  })
  const sessionId = String(created?.session_id || '')
  if (!sessionId) throw new Error('本地会话身份无效')
  const projected: VibeSession = {
    id: sessionId,
    title: String(created.title || '新的需求对话'),
    vibe_project_id: projectId,
    llm_provider_id: selectedLlmProviderId.value || undefined,
    status: 'active',
    created_at: created.created_at,
    updated_at: created.updated_at,
  }
  sessions.value.unshift(projected)
  adoptWorkspaceDraftForSession(projectId, sessionId)
  activeSessionId.value = sessionId
  activateWorkspaceConversation(projectId, sessionId)
  const migratedFileList = workspaceTabById(workspaceFileListViewerTabId(sessionId))
  if (migratedFileList?.kind === 'file-list' && migratedFileList.loading) {
    void loadWorkspaceFileList(migratedFileList.id, sessionId, true)
  }
  return sessionId
}

async function send() {
  await sendFoundationTurn()
}

// 本机文件只携带受控引用交给 Electron Main；不创建服务端附件资源。
// 不通过关键词决定录入/总结/问答，输入框仍是目的轴心。
function restoreComposerAttachments(files: File[]) {
  const snapshot = [...files]
  // emit('send') 的父处理器与子组件清空动作处于同一调用栈；延后一拍才能保证
  // 同步校验失败时，恢复发生在子组件的立即清空之后。
  void nextTick(() => composerRef.value?.restoreAttachments(snapshot))
}

async function onComposerSend({ text, files }: { text: string; files: File[] }) {
  const base = (text || '').trim()
  const fileList = [...(files || [])]
  if (sending.value) {
    // ChatComposer clears a plain text submission before emitting it.  A
    // stale same-tick running flag must therefore restore the text as well as
    // any attachment chips instead of silently dropping the user's request.
    if (base) {
      setDraftByKey(activeDraftKey.value, base)
      resizeDraft()
    }
    restoreComposerAttachments(fileList)
    return
  }
  // An attachment-only message is a valid local Pi goal.  The local Agent
  // receives a small synthetic user instruction and decides whether to read,
  // summarize, ingest, or ask what the user wants; the renderer must not
  // silently discard the selected file before Pi can make that decision.
  if (!base && !fileList.length) return
  try {
    const outcome = await sendFoundationTurn(base, { localFiles: fileList })
    if (outcome?.failed) restoreComposerAttachments(fileList)
  } catch (reason) {
    const message = localAgentErrorMessage(reason)
    ElMessage.error(message)
    restoreComposerAttachments(fileList)
  }
}

// 询问模式（clarification）选项被选/提交：把答案续跑到同一个本机 Goal。
async function respondToLiveGoal(raw: any, payload: {
  interaction_id?: string
  confirmation_id?: string
  action?: 'apply' | 'cancel' | 'stop_all'
  clarification_response?: { type: 'option' | 'input'; option_id?: string; text?: string }
}) {
  // Hide the submitted card before any recovery/status request.  The response
  // may take a while (especially after a renderer reload), but the user's
  // choice is already locally accepted.  Restore it only when the same
  // interaction cannot be delivered and no newer card replaced it.
  const submittedCard = clarificationActive.value
  const submittedSessionId = String(
    activeSessionId.value || activeTurnSessionId.value || '',
  ).trim()
  clarificationSubmissionSerialBySession.set(
    submittedSessionId,
    (clarificationSubmissionSerialBySession.get(submittedSessionId) || 0) + 1,
  )
  const submittedPendingId = String(
    payload.confirmation_id || payload.interaction_id
    || raw?.confirmation_id || raw?.interaction_id || '',
  ).trim()
  const turnId = String(
    raw?.goal_turn_id
    || raw?.runtime_turn_id
    || raw?.turn_id
    || activeTurnId.value
    || streamingCanonicalModel.value?.turnId
    || '',
  )
  const sessionId = String(activeSessionId.value || activeTurnSessionId.value || '')
  const submittedParentId = lastClarificationAssistantId()
  const currentPendingId = () => String(
    clarificationActive.value?.raw?.confirmation_id
    || clarificationActive.value?.raw?.interaction_id || '',
  ).trim()
  const hideSubmittedCard = () => {
    if (submittedSessionId && String(activeSessionId.value || '').trim() !== submittedSessionId) return
    const current = currentPendingId()
    if (
      clarificationActive.value === submittedCard
      || (submittedPendingId && current === submittedPendingId)
      || (!current && submittedPendingId)
    ) clarificationActive.value = null
  }
  const restoreSubmittedCard = () => {
    if (
      (!submittedSessionId || String(activeSessionId.value || '').trim() === submittedSessionId)
      && !currentPendingId()
      && submittedCard
    ) clarificationActive.value = submittedCard
  }
  hideSubmittedCard()
  let electronRun = electronRunForTurn(turnId, sessionId)
  // Do this before the first await. The choice is already accepted by the
  // renderer, so the existing process rail must stay open while Main performs
  // history/recovery and the child receives the response.
  beginClarificationSubmission(sessionId, turnId, submittedPendingId, electronRun?.run.run_id || '')
  if (electronRun) projectElectronAgentProgress(electronRun)
  if (submittedParentId) streamingContinuationParentId.value = submittedParentId
  // Renderer 重载/切回会话时，先向 Main 重新挂接本地 Run，再决定是否需要
  // 走后端 cold continuation；不能因为本地 Map 暂时为空就提示用户重复操作。
  if (!electronRun && electronAgentBridge() && turnId && sessionId) {
    try {
      await recoverElectronAgentRun(sessionId)
    } catch (error) {
      restoreSubmittedCard()
      endClarificationSubmission(sessionId, submittedPendingId, true, turnId)
      ElMessage.error(`本地 Agent 恢复失败：${localAgentErrorMessage(error)}`)
      return true
    }
    hideSubmittedCard()
    electronRun = electronRunForTurn(turnId, sessionId)
    updateClarificationSubmissionRun(electronRun?.run.run_id || '', electronRun?.run.turn_id || turnId)
  }
  if (electronRun && !electronRun.localCold && electronAgentBridge()?.status) {
    const liveStatus = await electronAgentBridge()!.status({ runId: electronRun.run.run_id, accountId: localAccountId() }).catch(() => null)
    if (!liveStatus) {
      const recoverable = electronAgentBridge()?.recoverableLocal?.({ accountId: localAccountId() })
      const descriptors: any = recoverable ? await recoverable.catch(() => []) : []
      const descriptor = (Array.isArray(descriptors) ? descriptors : []).find((item: any) =>
        String(item?.run_id || item?.run?.run_id || '') === electronRun!.run.run_id)
      if (descriptor) {
        electronRun.localDescriptor = descriptor
        electronRun.localCold = true
      }
      hideSubmittedCard()
    }
  }
  if (electronRun) {
    updateClarificationSubmissionRun(electronRun.run.run_id, electronRun.run.turn_id)
    const materializedParent = await materializeLocalWaitingRun(electronRun, raw)
    hideSubmittedCard()
    const parentId = materializedParent
      || lastClarificationAssistantId()
      || electronRun.localInteractionEventId
      || localInteractionEventId(electronRun.run.run_id, String(payload.confirmation_id || payload.interaction_id || ''))
    if (parentId) streamingContinuationParentId.value = parentId
  }
  if (electronRun?.localCold) {
    const bridge = electronAgentBridge()
    const pendingId = String(payload.confirmation_id || payload.interaction_id || '')
    if (!bridge?.recoverLocal || !pendingId) {
      restoreSubmittedCard()
      endClarificationSubmission(sessionId, pendingId, true, turnId)
      ElMessage.error('当前本地 Agent 冷恢复信息不完整，请重新打开会话')
      return true
    }
    try {
      const descriptorContext = electronRun.localDescriptor?.local_context || {}
      const authToken = readLocalAuthToken()
      if (!authToken) throw new Error('本机运行需要有效的登录状态')
      // The submitted card was removed before the first asynchronous wait. If
      // the continuation immediately asks a new question, its event handler
      // installs that newer card and the guarded cleanup leaves it visible.
      hideSubmittedCard()
      await bridge.recoverLocal({
        runId: electronRun.run.run_id,
        accountId: localAccountId(),
        projectId: String(electronRun.run.project_id || electronRun.run.project || ''),
        sessionId,
        response: payload,
        local_context: {
          ...descriptorContext,
          account_id: localAccountId(),
          auth_token: authToken,
          knowledge_base_url: localKnowledgeBaseUrl(),
          trace_upload_base_url: localKnowledgeBaseUrl(),
        },
      })
      electronRun.localCold = false
      const currentPendingId = String((clarificationActive.value as any)?.raw?.confirmation_id
        || (clarificationActive.value as any)?.raw?.interaction_id || '')
      if (!currentPendingId || currentPendingId === pendingId) clarificationActive.value = null
      setSessionRunning(sessionId, true)
      endClarificationSubmission(sessionId, pendingId, false, turnId)
    } catch (error) {
      restoreSubmittedCard()
      endClarificationSubmission(sessionId, pendingId, true, turnId)
      ElMessage.error(`本地 Agent 冷恢复失败：${localAgentErrorMessage(error)}`)
    }
    return true
  }
  if (electronRun) {
    const pendingId = String(payload.confirmation_id || payload.interaction_id || '')
    const bridge = electronAgentBridge()
    if (!bridge || !pendingId) {
      restoreSubmittedCard()
      endClarificationSubmission(sessionId, pendingId, true, turnId)
      ElMessage.error('当前 Electron Agent 交互状态不完整，请等待会话恢复')
      return true
    }
    try {
      const result: any = await bridge.respond({
        runId: electronRun.run.run_id,
        accountId: localAccountId(),
        pendingId,
        response: payload,
      })
      if (result?.accepted) {
        hideSubmittedCard()
        // Main has completed the idempotent response transaction. Keep the
        // normal running state as the source of truth, but release the
        // short-lived submission marker so it cannot linger if a state event
        // was lost during an IPC reconnect.
        endClarificationSubmission(sessionId, pendingId, false, turnId)
      } else if (result?.unknown) {
        hideSubmittedCard()
        ElMessage.warning('交互响应正在由后端核对，请勿重复提交')
        void recoverElectronAgentRun(sessionId)
      } else {
        restoreSubmittedCard()
        endClarificationSubmission(sessionId, pendingId, true, turnId)
        ElMessage.error('交互响应未被后端接受，请保留当前选择并稍后重试')
      }
    } catch (error) {
      restoreSubmittedCard()
      endClarificationSubmission(sessionId, pendingId, true, turnId)
      ElMessage.error(`交互响应失败：${localAgentErrorMessage(error)}`)
    }
    // Electron 已拥有本轮后，任何交互失败都不能用服务端另起同一轮。
    return true
  }
  // A local interaction must never be re-issued through the retired server
  // turn/input endpoint. Keep the card visible so the user can retry after
  // Main has recovered the owning Run.
  if (!turnId || !sessionId) {
    restoreSubmittedCard()
    endClarificationSubmission(sessionId, submittedPendingId, true, turnId)
    ElMessage.error('本地 Agent 交互身份不可用，请重新打开会话')
  } else {
    restoreSubmittedCard()
    endClarificationSubmission(sessionId, submittedPendingId, true, turnId)
    ElMessage.warning('本地 Agent 交互状态正在恢复，请稍后重试')
  }
  return true
}

async function onComposerAnswer(value: string) {
  const c = clarificationActive.value
  const raw: any = c?.raw
  const kind = raw && typeof raw === 'object' ? raw.kind : null
  if (raw?.schema === 'clarification.v2') {
    const parentId = lastClarificationAssistantId()
    const optionPrefix = '__CLARIFICATION_OPTION__:'
    if (value.startsWith(optionPrefix)) {
      const optionId = value.slice(optionPrefix.length)
      const selected = (Array.isArray(raw.options) ? raw.options : [])
        .find((item: any) => clarificationOptionIdentity(item) === optionId)
      if (!selected) return
      const selectedAction = selected.is_cancel
        ? 'cancel'
        : String(selected.action || '')
      const liveHandled = raw.confirmation_id
        ? await respondToLiveGoal(raw, {
            confirmation_id: String(raw.confirmation_id),
            action: selectedAction === 'stop_all'
              ? 'stop_all'
              : selectedAction === 'cancel'
                ? 'cancel'
                : 'apply',
          })
        : await respondToLiveGoal(raw, {
            interaction_id: String(raw.interaction_id || ''),
            clarification_response: { type: 'option', option_id: optionId },
          })
      if (liveHandled) return
      if (sending.value) {
        ElMessage.warning('交互运行态正在恢复，请稍后再试')
        return
      }
      clarificationActive.value = null
      await sendFoundationTurn(String(selected.label || ''), {
        continuationParentId: parentId,
        clarificationResponse: { type: 'option', option_id: optionId },
      })
      return
    }
    const inputText = String(value || '').trim()
    if (!inputText) return
    if (await respondToLiveGoal(raw, {
      interaction_id: String(raw.interaction_id || ''),
      clarification_response: { type: 'input', text: inputText },
    })) return
    if (sending.value) {
      ElMessage.warning('交互运行态正在恢复，请稍后再试')
      return
    }
    clarificationActive.value = null
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
    if (value === '__CANCEL_EDIT__' || value === '__SKIP__') {
      if (await respondToLiveGoal(raw, {
        confirmation_id: String(raw.confirmation_id || ''),
        action: 'cancel',
      })) return
      clarificationActive.value = null
      await sendFoundationTurn('取消这次操作', { clarificationCancel: true, continuationParentId: parentId })
      return
    }
    if (value === '__APPLY_EDIT__') {
      if (await respondToLiveGoal(raw, {
        confirmation_id: String(raw.confirmation_id || ''),
        action: 'apply',
      })) return
      if (sending.value) return
      clarificationActive.value = null
      await sendFoundationTurn('就这么改', {
        applyEdit: { kind: 'knowledge_change', confirmation_id: raw.confirmation_id },
        continuationParentId: parentId,
      })
      return
    }
    const vv = (value || '').trim()
    if (vv && !sending.value) {
      clarificationActive.value = null
      await sendFoundationTurn(vv)  // 重新说 = 一条新的请求
    }
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

// ===== foundation 正式对话通道 =====
// event_saved 是会话消息的唯一入口；过程、答案、来源和终态只由 Canonical Journal 投影。

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
  return parts.filter(Boolean).join(' · ') || '点击查看'
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

interface SendFoundationTurnOptions {
  continuationParentId?: string
  modelValidated?: boolean
  onUserEventSaved?: () => void
  applyEdit?: any
  clarificationCancel?: boolean
  clarificationResponse?: { type: 'option' | 'input'; option_id?: string; text?: string }
  localFiles?: File[]
}

function localPiAgentEnabled(): boolean {
  return !!window.electronAPI?.vibeAgent?.startLocal
}

function localKnowledgeBaseUrl(): string {
  const env = String((import.meta as any).env?.VITE_VIBE_KNOWLEDGE_BASE_URL
    || (import.meta as any).env?.VITE_API_URL || '').trim()
  if (env) return env.replace(/\/$/, '')
  if ((import.meta as any).env?.DEV) return 'http://127.0.0.1:6001'
  return window.location.origin
}

function localId(prefix: string): string {
  const random = typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now()}${Math.random().toString(16).slice(2)}`
  return `${prefix}_${random}`
}

function localTraceId(): string {
  const random = typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now()}${Math.random().toString(16).slice(2)}`
  return random.slice(0, 32).padEnd(32, '0')
}

async function sendLocalPiTurn(content: string, opts: SendFoundationTurnOptions = {}): Promise<any> {
  const bridge = electronAgentBridge()
  if (!bridge?.startLocal) throw new Error('当前客户端不支持本机运行，请更新客户端')
  if (!vibeProject.value) throw new Error('请先选择项目')
  const project = knowledgeStatsProjectId(selectedProjectId.value)
  if (!project) throw new Error('当前项目身份无效，请重新选择项目')
  const localFiles = [...(opts.localFiles || [])]
  // Validate the opaque native references before creating a session or
  // clearing any composer state. A stale/partial chip must fail locally with
  // an actionable message and remain retryable.
  const localFileRefs = localFiles.map((file: any) => {
    const source = file?.local_file_ref || file?.localFileRef
    if (!source || typeof source !== 'object') return null
    // `selectedFiles` is a Vue ref, so nested values can be reactive Proxy
    // objects. Electron IPC's structured-clone boundary rejects those
    // proxies; copy only the native reference ABI into a plain JSON object.
    const refId = String(source.ref_id || '').trim()
    if (!refId) return null
    return {
      schema: 'local_file_ref.v1',
      ref_id: refId,
      name: String(source.name || file?.name || ''),
      mime: String(source.mime || file?.type || 'application/octet-stream'),
      size: Number(source.size || file?.size || 0),
      last_modified: Number(source.last_modified || file?.lastModified || 0),
    }
  })
  if (localFileRefs.some((item: any) => !item?.ref_id)
    || localFileRefs.length !== localFiles.length) {
    throw new Error('vibe_agent_local_file_ref_invalid')
  }
  clarificationActive.value = null
  processExpanded.value = true
  clearStreamingAssistant()
  resetProcessState(streamingProcess)
  const sessionId = await ensureLocalSession()
  let admitted: any = []
  try {
    admitted = await Promise.race([
      Promise.resolve(bridge.list?.({ accountId: localAccountId() })),
      // This is only an advisory UI preflight. Main repeats the check
      // atomically, so a slow diagnostic enumeration must not hold the
      // composer hostage.
      new Promise(resolve => setTimeout(() => resolve([]), 1000)),
    ])
  } catch {
    // Main performs the authoritative atomic slot/session admission. A stale
    // diagnostic list must not prevent a new Goal from reaching that check;
    // any genuine rejection is returned by startLocal with its stable code.
    admitted = []
  }
  const liveRuns = (Array.isArray(admitted) ? admitted : Array.isArray(admitted?.items) ? admitted.items : [])
    .filter((item: any) => !electronAgentStateIsTerminal(item?.state) && item?.lifecycle !== 'terminal')
  if (liveRuns.some((item: any) => String(item?.session_id || item?.sessionId || '') === sessionId)) {
    throw new Error('vibe_agent_session_busy')
  }
  if (liveRuns.filter((item: any) => ['queued', 'running'].includes(String(item?.lifecycle || item?.state || ''))).length >= 5) {
    throw new Error('vibe_agent_host_busy')
  }
  // Main keeps the authoritative local transcript even when the renderer was
  // detached during the previous run. Load it before constructing Pi history
  // so assistant tool calls and their results remain paired on the next turn.
  const persistedHistory = await requestSessionEvents(sessionId, { includePrivate: true })
  if (persistedHistory.length && activeSessionId.value === sessionId) {
    events.value = sortEvents(persistedHistory)
  }
  const authToken = readLocalAuthToken()
  if (!authToken) throw new Error('本机运行需要有效的登录状态')
  // A previous app/network interruption may have left completed local Trace
  // bundles with an unfinished upload.json. Resume those in the background
  // once the current authenticated Main context is available.
  void bridge.trace?.resume?.({
    accountId: localAccountId(),
    baseUrl: localKnowledgeBaseUrl(),
    headers: { Authorization: `token=${authToken}` },
  }).catch(() => undefined)
  const runId = localId('lpr')
  const turnId = localId('lt')
  const requestId = localId('lreq')
  const traceId = localTraceId()
  const localFileEventRefs = localFileRefs.map((item: any) => ({
    schema: 'local_file_ref.v1',
    id: String(item.ref_id || ''),
    resource_id: String(item.ref_id || ''),
    ref_id: String(item.ref_id || ''),
    name: String(item.name || ''),
    filename: String(item.name || ''),
    mime: String(item.mime || 'application/octet-stream'),
    size: Number(item.size || 0),
    kind: 'local-file',
    run_id: runId,
    session_id: sessionId,
    account_id: localAccountId(),
  }))
  // A file-only submission still needs one user message for the Provider
  // protocol.  This sentence is only a transport seed; Pi remains free to
  // ask what the user wants instead of assuming “ingest”.  Keep the visible
  // user event empty so the UI/history reflects the actual user input.
  const agentPrompt = content || '本轮只选择了本机文件，请先判断需要如何处理；如果目的不明确，请向我提问。'
  // Renderer supplies only turn-local data. Electron Main performs exactly
  // one authenticated runtime-snapshot exchange and injects the system
  // prompt, tools, frozen strong model/options and Provider credential.
  const startPayload = {
    execution_mode: 'local',
    user_text: content,
    prompt: agentPrompt,
  }
  const run: any = {
    schema: 'electron_agent_run.v1',
    execution_host: 'electron',
    execution_mode: 'local',
    account_id: localAccountId(),
    run_id: runId,
    turn_id: turnId,
    request_id: requestId,
    session_id: sessionId,
    project_id: String(project),
    trace_id: traceId,
    goal_id: turnId,
    host_id: 'electron-main',
    protocol_version: 3,
  }
  registerElectronAgentRun(run)
  const context = electronAgentRuns.get(runId)!
  context.localUserEventId = localEventId(context, 'user')
  if (activeSessionId.value === sessionId) {
    upsertEvent(localDisplayEvent(context, 'user', content, {}, localFileEventRefs))
  }
  const completed = new Promise<VibeAgentEvent>((resolve, reject) => {
    electronAgentWaiters.set(runId, { resolve, reject })
  })
  ensureVibeAgentEventListener()
  if (activeSessionId.value === sessionId) {
    streamingOwnerSessionId.value = sessionId
    activeTurnId.value = turnId
    activeTurnSessionId.value = sessionId
    foundationBusy.value = true
    startElapsedTicker(Date.now())
    streamingProcess.status = 'running'
    setSessionRunning(sessionId, true)
    setDraftByKey(activeDraftKey.value, '')
    composerRef.value?.clearInput?.()
  }
  let localStartAccepted = false
  let settledEvent: VibeAgentEvent | null = null
  try {
    await bridge.startLocal({
      run,
      start_payload: startPayload,
      provider_id: String(selectedLlmProviderId.value || ''),
      local_file_refs: localFileRefs,
      local_context: {
        account_id: localAccountId(),
        auth_token: authToken,
        knowledge_base_url: localKnowledgeBaseUrl(),
        trace_upload_base_url: localKnowledgeBaseUrl(),
        request_text: content,
      },
    })
    localStartAccepted = true
    // The native reference is now owned by the accepted Run. Clear the
    // composer chip only at this boundary; failed preflight/admission keeps
    // the original selection available for an immediate retry.
    if (localFiles.length) composerRef.value?.clearAttachments?.()
    const terminal = await completed
    settledEvent = terminal
    if (String(terminal.state || '') === 'waiting_user') {
      await materializeLocalWaitingRun(context, terminal.payload)
    }
    return {
      userEventSaved: true,
      failed: terminal.type === 'error',
      unresolved: false,
      attachmentSelectionReusable: true,
    }
  } catch (error) {
    // This was only an optimistic renderer projection. Main writes the real
    // user event after local capacity and backend admission succeed, so a
    // rejected start must remove the unsent bubble as well as restore draft.
    if (!localStartAccepted && activeSessionId.value === sessionId) {
      events.value = events.value.filter(item => item.id !== context.localUserEventId)
    }
    const failure: any = error instanceof Error ? error : new Error(String(error))
    failure.attachmentSelectionReusable = true
    throw failure
  } finally {
    const waiting = context.state === 'waiting_user' || String(settledEvent?.state || '') === 'waiting_user'
    electronAgentWaiters.delete(runId)
    if (!waiting) {
      electronAgentRuns.delete(runId)
      context.ephemeralText = ''
    }
    if (!localStartAccepted || electronAgentStateIsTerminal(context.state)) {
      setLocalSessionRuntimeState(sessionId, 'terminal')
    }
    if (activeSessionId.value === sessionId && streamingOwnerSessionId.value === sessionId) {
      stopElapsedTicker()
      foundationBusy.value = false
      if (waiting) {
        setLocalSessionRuntimeState(sessionId, 'waiting_user')
        streamingProcess.status = 'done'
        streamingProcess.durationMs = Math.max(streamingProcess.durationMs, streamingElapsedMs.value)
      } else {
        setSessionRunning(sessionId, false)
        streamingOwnerSessionId.value = ''
        activeTurnId.value = ''
        activeTurnSessionId.value = ''
        resetProcessState(streamingProcess)
      }
    }
  }
}

async function sendFoundationTurn(overrideText?: string, opts?: SendFoundationTurnOptions) {
  const content = (overrideText ?? draft.value).trim()
  const hasAttachments = Boolean(Array.isArray(opts?.localFiles) && opts.localFiles.length)
  if ((!content && !hasAttachments) || sending.value) return
  // Set the composer preflight flag only after the guard above has admitted
  // this call. `onComposerSend` may be invoked before Vue flushes the
  // previous input update; setting it in the caller made `sending` true and
  // caused this very guard to drop the new request as a no-op.
  preparingSend.value = true
  try {
    return await sendLocalPiTurn(content, opts || {})
  } catch (error) {
    const message = localAgentErrorMessage(error)
    ElMessage.error(message)
    setDraftByKey(activeDraftKey.value, content)
    resizeDraft()
    return {
      failed: true,
      unresolved: false,
      attachmentSelectionReusable: (error as any)?.attachmentSelectionReusable !== false,
    }
  } finally {
    preparingSend.value = false
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
  streamingAssistantEventId.value = ''
  streamingAssistantContent.value = ''
  streamingLiveAnswerContent.value = ''
  clearStreamingAnswerHtml()
  streamingSources.value = []
  streamingVerification.value = null
  streamingCanonicalModel.value = null
  streamingTransportNotice.value = null
  streamingContinuationParentId.value = ''
}

function clearPendingUserSubmission() {
  pendingUserSubmissionText.value = ''
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
    if (isInteractionThreadRoot(event)) {
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
  return isLastUser
    ? (streamingLiveAnswerContent.value || streamingAssistantContent.value)
    : ''
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

// 输入框每次变更都会让会话视图重新 patch。历史消息本身没有变化时，重复跑
// marked + DOMPurify 会把解析成本直接放到键盘事件的同一帧里，长会话尤其明显。
// 用有界 LRU 缓存复用稳定正文；缓存只在 Renderer 内存中存在，不改变事件数据。
const MARKDOWN_RENDER_CACHE_MAX_ENTRIES = 128
const MARKDOWN_RENDER_CACHE_MAX_CHARS = 8 * 1024 * 1024
const markdownRenderCache = new Map<string, { html: string; chars: number }>()
let markdownRenderCacheChars = 0

// The live answer changes for every Provider delta. Render a lightweight
// Markdown projection at most once per 80ms, and leave the copy-code controls
// to the final render. This keeps incremental output formatted without
// putting DOM work on every token or keyboard event.
const STREAMING_MARKDOWN_RENDER_DELAY_MS = 80
const STREAMING_MARKDOWN_RENDER_MAX_CHARS = 128 * 1024

function cancelStreamingAnswerRender(): void {
  if (streamingAnswerRenderTimer) {
    clearTimeout(streamingAnswerRenderTimer)
    streamingAnswerRenderTimer = null
  }
  streamingAnswerRenderEpoch += 1
}

function clearStreamingAnswerHtml(): void {
  cancelStreamingAnswerRender()
  streamingAnswerHtml.value = ''
  streamingAnswerHtmlSource.value = ''
}

function renderStreamingMarkdown(content: string): string {
  const html = marked.parse(normalizeCopyableMarkdownFence(String(content || ''))) as string
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  })
}

function scheduleStreamingAnswerRender(): void {
  const source = streamingLiveAnswerContent.value || streamingAssistantContent.value
  if (!source || source.length > STREAMING_MARKDOWN_RENDER_MAX_CHARS) {
    if (streamingAnswerRenderTimer) cancelStreamingAnswerRender()
    streamingAnswerHtml.value = ''
    streamingAnswerHtmlSource.value = ''
    return
  }
  if (streamingAnswerRenderTimer) return
  const epoch = streamingAnswerRenderEpoch
  streamingAnswerRenderTimer = setTimeout(() => {
    streamingAnswerRenderTimer = null
    if (epoch !== streamingAnswerRenderEpoch) return
    const current = streamingLiveAnswerContent.value || streamingAssistantContent.value
    if (!current || current.length > STREAMING_MARKDOWN_RENDER_MAX_CHARS) {
      streamingAnswerHtml.value = ''
      streamingAnswerHtmlSource.value = ''
      return
    }
    streamingAnswerHtml.value = renderStreamingMarkdown(current)
    streamingAnswerHtmlSource.value = current
  }, STREAMING_MARKDOWN_RENDER_DELAY_MS)
}

function commitStreamingAnswerHtml(content: string, complete = false): void {
  const source = String(content || '')
  if (!source) {
    clearStreamingAnswerHtml()
    return
  }
  cancelStreamingAnswerRender()
  streamingAnswerHtml.value = complete
    ? renderMarkdown(source)
    : renderStreamingMarkdown(source)
  streamingAnswerHtmlSource.value = source
}

function renderMarkdown(content: string) {
  const source = String(content || '')
  const cached = markdownRenderCache.get(source)
  if (cached) {
    // Refresh recency so active/current messages survive a long conversation.
    markdownRenderCache.delete(source)
    markdownRenderCache.set(source, cached)
    return cached.html
  }
  const html = marked.parse(normalizeCopyableMarkdownFence(source)) as string
  const sanitized = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  })
  const result = enhanceCopyableCodeBlocks(sanitized)
  const chars = source.length + result.length
  // Do not retain a single giant answer or unboundedly grow memory. Such
  // entries are rare; parsing them once per parent render is preferable to
  // keeping another large copy in the Renderer heap.
  if (chars <= MARKDOWN_RENDER_CACHE_MAX_CHARS) {
    markdownRenderCache.set(source, { html: result, chars })
    markdownRenderCacheChars += chars
    while (markdownRenderCache.size > MARKDOWN_RENDER_CACHE_MAX_ENTRIES
      || markdownRenderCacheChars > MARKDOWN_RENDER_CACHE_MAX_CHARS) {
      const oldest = markdownRenderCache.entries().next().value
      if (!oldest) break
      markdownRenderCache.delete(oldest[0])
      markdownRenderCacheChars = Math.max(0, markdownRenderCacheChars - Number(oldest[1]?.chars || 0))
    }
  }
  return result
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

function comparableMessageText(value: any): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

const turnProtocolMetaCache = new WeakMap<object, { signature: string; model: TurnProtocolReadModel }>()

function eventTurnProtocol(event: any): TurnProtocolReadModel | null {
  const local = localTurnPresentation(event)
  if (local) return local.model
  const compact = readSessionTurnPublic(event)
  if (compact) return compact
  const meta = event?.meta
  const rows = meta?.turn_protocol?.events
  if (!meta || typeof meta !== 'object' || !Array.isArray(rows) || !rows.length) return null
  const last = rows[rows.length - 1]
  const signature = `${rows.length}:${String(last?.event_id || '')}:${String(last?.event_type || '')}`
  const cached = turnProtocolMetaCache.get(meta)
  if (cached?.signature === signature) return cached.model
  const model = readTurnProtocolFromMeta(meta)
  if (model) turnProtocolMetaCache.set(meta, { signature, model })
  return model
}

function outcomeNoticeProps(outcome?: TurnProtocolOutcome | null): TurnOutcomeNoticeModel | null {
  if (!outcome) return null
  return {
    kind: outcome.kind,
    title: outcome.title,
    detail: outcome.detail,
    reason: outcome.reason,
    partial: outcome.partial,
  }
}

function eventOutcomeNotice(event: any): TurnOutcomeNoticeModel | null {
  const local = localTurnPresentation(event)
  const model = eventTurnProtocol(event)
  const canonical = outcomeNoticeProps(model?.outcome)
  if (canonical) return canonical
  if (event?.role === 'assistant' && event?.meta?.outcome === 'cancelled') {
    return {
      kind: 'cancelled',
      title: '本轮已取消',
      detail: String(event?.content || LOCAL_CANCELLATION_RECEIPT),
    }
  }
  if (shouldShowMissingTerminalNotice(model, local, eventTurnIsStillActive(event, model))) {
    return {
      kind: 'protocol',
      title: '本轮结果尚未确认',
      detail: '会话记录中没有正式 terminal；本条已有内容不能视为完整成功答案。',
    }
  }
  if (event?.role === 'assistant' && (event?.meta?.failed === true || event?.meta?.message_kind === 'error')) {
    return {
      kind: 'failed',
      title: '本轮处理失败',
      detail: String(event?.content || ''),
      reason: String(event?.meta?.failure_reason || ''),
    }
  }
  return null
}

function eventTurnIsStillActive(event: any, model: TurnProtocolReadModel | null): boolean {
  const sessionId = String(event?.session_id || '')
  const turnId = String(model?.turnId || '')
  if (!sessionId || !turnId || sessionId !== activeSessionId.value) return false
  if (streamingOwnerSessionId.value !== sessionId || activeTurnSessionId.value !== sessionId) return false
  const sameTurn = [
    activeTurnId.value,
    streamingCanonicalModel.value?.turnId,
  ].some(value => String(value || '') === turnId)
  if (!sameTurn) return false
  return foundationBusy.value
    || sendingSessionIds.value.includes(sessionId)
    || runningSessionIds.value.includes(sessionId)
    || streamingProcess.status === 'running'
}

function threadOutcomeNotice(root: any): TurnOutcomeNoticeModel | null {
  const nodes = interactionThreadNodes(root)
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const outcome = eventOutcomeNotice(nodes[index])
    if (outcome) return outcome
  }
  return null
}

function eventIndependentAnswerText(event: any): string {
  const canonical = eventTurnProtocol(event)
  if (canonical) return canonical.content
  if (event?.meta?.outcome === 'cancelled') return ''
  if (event?.meta?.failed === true || event?.meta?.message_kind === 'error') return ''
  const content = String(event?.content || '')
  const answerCard = answerCards(event).find((card: any) => card?.type === 'answer' && card?.answer_text)
  const answerText = String(event?.meta?.answer?.answer_text || answerCard?.answer_text || '')
  const preferred = event?.role === 'assistant' && answerText && answerText.length > content.length
    ? answerText
    : (content || answerText || event?.meta?.package?.summary || '')
  const clarification = comparableMessageText(eventClarificationQuestion(event))
  if (!clarification || comparableMessageText(preferred) !== clarification) return preferred

  // 纯反问的 content 通常就是 clarification.question，不是最终答案。
  // 复合目标可能同时带独立 answer_text；只有与问题不同的内容才算已完成回答。
  return [answerText, content]
    .find((candidate) => comparableMessageText(candidate)
      && comparableMessageText(candidate) !== clarification) || ''
}

// 已确认的预览会在历史中保留原始展示正文，但它不是最终答案。
// 复合请求若确实先完成了只读回答，会有正式 answer 投影；只保留该投影，
// 不从普通 content 猜测，避免把“请确认是否提交”重新显示在完成结果里。
function eventFormalIndependentAnswerText(event: any): string {
  const canonical = eventTurnProtocol(event)
  return resolvedInteractionRootAnswerText(event, canonical?.answers || [])
}

function eventDisplayContent(event: any) {
  const base = eventIndependentAnswerText(event)
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

function eventHasAnswerContent(event: any): boolean {
  return !!eventIndependentAnswerText(event).trim()
}

function eventCanUseAnswerActions(event: any): boolean {
  const canonical = eventTurnProtocol(event)
  if (canonical) return canonical.state === 'succeeded'
  if (event?.meta?.outcome === 'cancelled') return false
  return event?.meta?.failed !== true && event?.meta?.message_kind !== 'error'
}

function answerCards(event: any) {
  const cards = event?.meta?.answer?.cards
  return Array.isArray(cards) ? cards : []
}

function eventClarificationQuestion(event: any) {
  const canonical = eventClarificationData(event)
  if (canonical?.question) return canonical.question
  const direct = event?.meta?.clarification?.question
  if (direct) return String(direct)
  const clarifyCard = answerCards(event).find((card: any) => card?.type === 'clarify' && card?.question)
  return clarifyCard?.question ? String(clarifyCard.question) : ''
}

function eventClarificationData(event: any): { question: string; raw?: any; pending?: any[] } | null {
  const canonical = eventTurnProtocol(event)?.clarification
  if (canonical?.question) return canonical
  const legacy = event?.meta?.clarification
  return legacy?.question ? legacy : null
}

function isBlockingClarificationEvent(event: any): boolean {
  return !!eventClarificationQuestion(event)
}

const LOCAL_TOOL_ACTION_TITLES: Record<string, string> = {
  search_knowledge: '检索知识库',
  search_vibe_platform_docs: '检索平台资料',
  read_knowledge: '读取知识文档',
  get_knowledge_overview: '盘点知识库',
  add_knowledge: '准备新增知识预览',
  edit_knowledge: '准备修改知识预览',
  delete_knowledge: '准备删除知识预览',
  move_knowledge_section: '准备移动知识章节预览',
  ask_clarification: '准备补充信息',
}

function localRunProcessRows(event: any): any[] {
  const runId = String(event?.meta?.run_id || '')
  if (!runId || event?.meta?.local_agent !== true) return []
  const limit = Number(event?.event_order || event?.sequence || Number.MAX_SAFE_INTEGER)
  return events.value
    .filter((item: any) => item?.meta?.local_agent === true
      && String(item?.meta?.run_id || '') === runId
      && Number(item?.event_order || item?.sequence || 0) <= limit)
    .sort(compareEvents)
}

function localRunProcessSteps(event: any): ProcessStep[] {
  if (event?.role !== 'assistant' || event?.meta?.local_agent !== true) return []
  const rows = localRunProcessRows(event)
  const toolResults = new Map(rows
    .filter((item: any) => item?.role === 'tool' && item?.meta?.tool_call_id)
    .map((item: any) => [String(item.meta.tool_call_id), item]))
  const seenMessages = new Set<string>()
  const actionBySignature = new Map<string, ProcessStep>()
  const steps: ProcessStep[] = []
  for (const row of rows) {
    const calls = Array.isArray(row?.meta?.tool_calls) ? row.meta.tool_calls : []
    if (row?.role !== 'assistant' || !calls.length) continue
    const text = String(row?.content || '').trim()
    if (text && !seenMessages.has(text)) {
      seenMessages.add(text)
      steps.push({
        kind: 'message',
        key: `local-process-message:${row.id}`,
        text,
        phase: 'commentary',
        source: 'model',
        authority: 'persisted',
      })
    }
    for (const call of calls) {
      const name = String(call?.name || '')
      const signature = `${name}:${JSON.stringify(call?.arguments || {})}`
      if (actionBySignature.has(signature)) continue
      const result: any = toolResults.get(String(call?.id || ''))
      const status: 'success' | 'error' | 'unknown' = result
        ? (result?.meta?.is_error ? 'error' : 'success')
        : 'unknown'
      const step: ProcessStep = {
        kind: 'action',
        key: `local-process-action:${row.id}:${call?.id || name}`,
        actionId: String(call?.id || ''),
        actionType: name || 'tool_call',
        title: LOCAL_TOOL_ACTION_TITLES[name] || '执行任务步骤',
        summary: status === 'error' ? '该步骤执行失败。' : '',
        status,
        phase: 'tool',
        source: 'runtime',
        authority: 'persisted',
      }
      actionBySignature.set(signature, step)
      steps.push(step)
    }
  }
  return steps
}

function eventProcessSteps(event: any): ProcessStep[] {
  const canonical = eventTurnProtocol(event)
  if (canonical) return canonical.process
  const persisted = stepsFromMeta(event?.meta)
  return persisted.length ? persisted : localRunProcessSteps(event)
}

// T1 溯源：历史消息从 meta.sources 复原；兼容 answer cards 里附带的 sources。
function eventSources(event: any): any[] {
  const canonical = eventTurnProtocol(event)
  if (canonical) return canonical.sources
  const fromMeta = event?.meta?.sources
  if (Array.isArray(fromMeta) && fromMeta.length) return fromMeta
  const card = answerCards(event).find((c: any) => c?.type === 'sources' && Array.isArray(c?.items))
  return Array.isArray(card?.items) ? card.items : []
}

// T8 核验：历史消息从 meta.verification 复原。
function eventVerification(event: any): any | null {
  const canonical = eventTurnProtocol(event)
  if (canonical) return canonical.verification
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
  const canonical = eventTurnProtocol(event)
  const projected = preferredProcessDuration(
    canonical?.processSummary?.duration_ms,
    durationFromMeta(event?.meta),
    localTurnPresentation(event)?.observedDurationMs,
  )
  if (projected > 0) return projected
  const rows = localRunProcessRows(event)
  if (rows.length < 2) return 0
  const started = new Date(rows[0]?.created_at || '').getTime()
  const ended = new Date(rows[rows.length - 1]?.created_at || '').getTime()
  return Number.isFinite(started) && Number.isFinite(ended) ? Math.max(0, ended - started) : 0
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

function resetTimelineNavigation() {
  isAtBottom.value = true
  timelineFollow.value = true
  activeConversationEventId.value = ''
  hoveredConversationRailIndex.value = null
  if (conversationRailRaf) {
    cancelAnimationFrame(conversationRailRaf)
    conversationRailRaf = 0
  }
}

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
  timelineFollow.value = nextTimelineFollow({
    following: timelineFollow.value,
    nearBottom,
    userScrollIntent: Date.now() <= timelineUserScrollIntentUntil,
  })
  if (conversationRailRaf) cancelAnimationFrame(conversationRailRaf)
  conversationRailRaf = requestAnimationFrame(() => {
    conversationRailRaf = 0
    updateActiveConversationRail()
  })
}

function noteTimelineUserScrollIntent() {
  timelineUserScrollIntentUntil = Date.now() + 1000
}

async function syncTimelineNavigationAfterLayout() {
  const action = timelineLayoutAction(timelineFollow.value)
  await nextTick()
  const el = timelineEl.value
  if (!el) return
  if (action === 'scroll-bottom') {
    el.scrollTop = el.scrollHeight
    isAtBottom.value = true
  } else {
    isAtBottom.value = isTimelineNearBottom(el)
  }
  updateActiveConversationRail()
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
  const contextEpoch = projectContextEpoch
  const contextVibeProjectId = vibeProject.value.id
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
  const updatedProject = await updateVibeProject(contextVibeProjectId, {
    baseline: {
      system_name: baselineDraft.system_name,
      summary: baselineDraft.summary,
      system_goals: goals,
    },
  })
  if (contextEpoch !== projectContextEpoch || vibeProject.value?.id !== contextVibeProjectId) return
  vibeProject.value = updatedProject
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
  return shouldCollapseUserMessageText(event.id, userMessageText(event))
}

const shouldCollapsePendingUserMessage = computed(() =>
  shouldCollapseUserMessageText(PENDING_USER_MESSAGE_ID, pendingUserSubmissionText.value),
)

function shouldCollapseUserMessageText(eventId: string | undefined, content: unknown): boolean {
  if (!eventId) return false
  if (measuredUserMessageIds.value.includes(eventId)) {
    return overflowingUserMessageIds.value.includes(eventId)
  }
  return userMessageLikelyOverflows(content)
}

function userMessageContentId(eventId?: string) {
  return eventId ? `user-message-content-${eventId}` : undefined
}

function setUserMessageOverflow(eventId: string, overflows: boolean): void {
  if (!measuredUserMessageIds.value.includes(eventId)) {
    measuredUserMessageIds.value = [...measuredUserMessageIds.value, eventId]
  }
  const currentlyOverflows = overflowingUserMessageIds.value.includes(eventId)
  if (currentlyOverflows === overflows) return
  overflowingUserMessageIds.value = overflows
    ? [...overflowingUserMessageIds.value, eventId]
    : overflowingUserMessageIds.value.filter(id => id !== eventId)
}

function clearUserMessageOverflowMeasurement(eventId: string): void {
  measuredUserMessageIds.value = measuredUserMessageIds.value.filter(id => id !== eventId)
  overflowingUserMessageIds.value = overflowingUserMessageIds.value.filter(id => id !== eventId)
}

function measureUserMessageOverflow(element: HTMLElement, eventId: string): void {
  if (userMessageOverflowElements.get(element) !== eventId) return
  const lineHeight = Number.parseFloat(window.getComputedStyle(element).lineHeight)
  setUserMessageOverflow(eventId, userMessageContentOverflows({
    scrollHeight: element.scrollHeight,
    lineHeight,
    viewportHeight: window.innerHeight,
  }))
}

function scheduleUserMessageOverflowMeasurements(): void {
  if (userMessageOverflowRaf) return
  userMessageOverflowRaf = requestAnimationFrame(() => {
    userMessageOverflowRaf = 0
    userMessageOverflowElements.forEach((eventId, element) => {
      measureUserMessageOverflow(element, eventId)
    })
  })
}

function ensureUserMessageOverflowObservation(): void {
  if (!userMessageOverflowObserver && typeof ResizeObserver !== 'undefined') {
    userMessageOverflowObserver = new ResizeObserver(() => {
      scheduleUserMessageOverflowMeasurements()
    })
  }
  if (userMessageOverflowWindowResizeRegistered) return
  window.addEventListener('resize', scheduleUserMessageOverflowMeasurements)
  userMessageOverflowWindowResizeRegistered = true
}

function bindUserMessageOverflowElement(element: HTMLElement, eventId?: string): void {
  if (!eventId) return
  userMessageOverflowElements.set(element, eventId)
  ensureUserMessageOverflowObservation()
  userMessageOverflowObserver?.observe(element)
  measureUserMessageOverflow(element, eventId)
}

function unbindUserMessageOverflowElement(element: HTMLElement): void {
  const eventId = userMessageOverflowElements.get(element)
  userMessageOverflowObserver?.unobserve(element)
  userMessageOverflowElements.delete(element)
  if (eventId) clearUserMessageOverflowMeasurement(eventId)
}

function stopUserMessageOverflowObservation(): void {
  userMessageOverflowObserver?.disconnect()
  userMessageOverflowObserver = null
  userMessageOverflowElements.clear()
  if (userMessageOverflowRaf) cancelAnimationFrame(userMessageOverflowRaf)
  userMessageOverflowRaf = 0
  if (!userMessageOverflowWindowResizeRegistered) return
  window.removeEventListener('resize', scheduleUserMessageOverflowMeasurements)
  userMessageOverflowWindowResizeRegistered = false
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
  void syncTimelineNavigationAfterLayout()
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
    if (typeof window.$toast === 'function') {
      window.$toast({
        title: '复制成功',
        type: 'success',
        position: 'bottom-right',
        duration: 2500,
        actionText: '关闭',
      })
    }
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
    if (typeof window.$toast === 'function') {
      window.$toast({
        title: '复制成功',
        type: 'success',
        position: 'bottom-right',
        duration: 2500,
        actionText: '关闭',
      })
    }
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

function shouldRenderEvent(event: any) {
  return shouldRenderThreadEvent(events.value, event)
}

function parentContinuationResponses(event: any): VibeEvent[] {
  return resolveParentContinuationResponses(events.value, event) as VibeEvent[]
}

// 取挂在这条反问下的"选择回复"内容（confirmation_reply 的 user 事件），插进思考里作"你的选择"那一环。
function clarificationReplyContent(event: any): string {
  const id = String(event?.id || '')
  if (!id) return ''
  const reply = (events.value as any[]).find(e =>
    e?.role === 'user' && interactionReplyParentEventId(events.value, e) === id)
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

// ===== 待处理交互续跑：把【预览/反问→你的选择→继续处理→答案】合并成一条思考 =====
// 活跃交互仍以 clarification 标识；确认完成后 clarification 会被正确清理，
// 此时改用 confirmation_reply + continuation_context 的持久父子身份归根。
function isInteractionThreadRoot(event: any): boolean {
  const hasContinuation = parentContinuationResponses(event).length > 0 || isStreamingUnderEvent(event)
  return event?.role === 'assistant'
    && !continuationParentEventId(events.value, event)
    && hasContinuation
    && (
      isBlockingClarificationEvent(event)
      || isResolvedInteractionThreadRoot(events.value, event)
    )
}

// 顺着续跑链把所有节点(assistant)按思考顺序取出来。
// parentContinuationResponses(root) 已按【最终根】聚合 + 时间排序，含【任意层级】的续跑子（A→B→C 全在内）——
// 所以直接拼接即可，别再"只跟 kids[0] 逐级下钻"（那样多级续跑会漏掉第 3 层，导致末轮答案不显示）。
function interactionThreadNodes(root: any): any[] {
  return [root, ...parentContinuationResponses(root)]
}

// 合并所有节点的过程步；每个"反问节点"后插一个"你的选择"气泡；流式续跑时把 live 过程步接到末尾。
// 改原文：行级局部 diff（共同前缀/后缀外的中段 = 删/增），供"思考里看 diff"。
function diffLines(oldT?: string, newT?: string): { t: 'ctx' | 'del' | 'add'; text: string }[] {
  const oldText = String(oldT || '')
  const newText = String(newT || '')
  if (!oldText) return newText ? newText.split('\n').map(text => ({ t: 'add', text })) : []
  const a = oldText.split('\n'); const b = newText.split('\n')
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
  for (const n of interactionThreadNodes(root)) {
    for (const s of eventProcessSteps(n)) out.push(s)
    if (eventClarificationQuestion(n)) {
      // 第四代小文档确认把整体 diff 作为思考的一环；大文档只保留摘要。
      const raw = eventClarificationData(n)?.raw
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
  return interactionThreadNodes(root).some((n: any) => n.id === lastAssistantId.value && isBlockingClarificationEvent(n))
}

function threadDurationMs(root: any): number {
  const base = interactionThreadNodes(root).reduce((sum: number, n: any) => sum + (eventProcessDuration(n) || 0), 0)
  // 续跑轮在途:历史各段耗时 + 本轮前端秒表,让"已处理"一直数着(0704)。
  return threadRunning(root) ? base + streamingElapsedMs.value : base
}

function threadNodeDisplayContent(root: any, node: any): string {
  if (String(node?.id || '') === String(root?.id || '')
    && isResolvedInteractionThreadRoot(events.value, root)) {
    return eventFormalIndependentAnswerText(node)
  }
  return eventHasAnswerContent(node) ? eventDisplayContent(node).trim() : ''
}

function threadAnswerNodes(root: any): any[] {
  return interactionThreadNodes(root).filter((node: any) => !!threadNodeDisplayContent(root, node))
}

// 一个复合目标可以在写入确认前已完成只读回答；最后节点不能覆盖前面已经完成的答案。
function threadFinalNode(root: any): any {
  const nodes = threadAnswerNodes(root)
  return nodes[nodes.length - 1] || null
}

function threadPersistedAnswer(root: any): string {
  return threadFinalAnswerText(
    events.value,
    root,
    (node: any) => threadNodeDisplayContent(root, node),
  )
}

function threadFinalAnswer(root: any): string {
  const answer = threadPersistedAnswer(root)
  if (answer) return answer
  return isStreamingUnderEvent(root) ? (streamingAssistantContent.value || '') : ''
}

function threadOutsideAnswer(root: any): string {
  return threadPersistedAnswer(root) || (threadRunning(root) ? '' : threadFinalAnswer(root))
}

function shouldRenderStandaloneAssistantAnswer(event: any): boolean {
  return shouldRenderStandaloneAssistantBody(event, eventHasAnswerContent(event))
}

function threadSources(root: any): any[] {
  const seen = new Set<string>()
  const sources: any[] = []
  for (const node of threadAnswerNodes(root)) {
    for (const source of eventSources(node)) {
      const normalized = normalizeConversationSourceCitation(source, sources.length)
      const key = sourceCitationViewerIdentity(normalized)
        || String(normalized.spanId || normalized.sourceId || JSON.stringify(source))
      if (!key || seen.has(key)) continue
      seen.add(key)
      sources.push(source)
    }
  }
  return sources
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
  return resolveEventThreadRootId(events.value, event)
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
  --vibe-side-width: 282px;
  --workspace-window-width: 760px;
  --vibe-glass-bg:
    linear-gradient(180deg, rgba(248, 248, 247, 0.9), rgba(242, 242, 240, 0.82)),
    rgba(245, 245, 244, 0.76);
  --vibe-sidebar-bg: rgb(252, 252, 252);
  --vibe-conversation-bg: rgb(255, 255, 255);
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
  grid-template-columns: var(--vibe-side-width) minmax(0, 1fr);
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

.vibe-shell.side-resizing {
  transition: none;
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

/* 展开态开关：沿用现有左上位置，仅向下微调 3px。 */
.side-toggle {
  position: fixed;
  top: 9px;
  left: 98px;
  z-index: 20;
  -webkit-app-region: no-drag;
  width: 22.4px;
  height: 22.4px;
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

/* mac：继续位于原生红绿灯右侧，并同步下移。 */
.side-toggle.mac {
  left: 72px;
  top: 9px;
}

:global(.main-router.vibe-shell),
:global(.main-router:has(.vibe-shell)) {
  background: transparent !important;
}

.window-drag {
  position: fixed;
  inset: 0 0 auto 0;
  left: 140px;
  height: 42px;
  -webkit-app-region: drag;
  z-index: 10;
}

/* Electron 原生拖拽命中不完全遵循普通 z-index；给右侧两枚 header 按钮留出非拖拽区域。 */
.window-drag.reserve-info-toggle {
  right: 84px;
}

/* 分屏后 Settings2 位于主对话 header 右缘；拖拽层在它之前收口，避免吞掉按钮上半区。 */
.window-drag.reserve-info-toggle.workspace-open {
  right: calc(var(--workspace-window-width) + 56px);
}

/* Windows 三键放在 mac 红绿灯对应的左上位置；macOS 不渲染本组件。 */
.window-actions {
  position: fixed;
  top: 5px;
  left: 8px;
  right: auto;
  z-index: 20;
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
}

.win-ctl {
  position: static;
}

.main-head-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 34px;
  transform: translateY(3px);
  pointer-events: auto;
  -webkit-app-region: no-drag;
  transition: margin-right 320ms cubic-bezier(.22, 1, .36, 1);
}

.main.workspace-open .main-head-actions {
  margin-right: 0;
}

.info-rail-toggle {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: rgba(15, 15, 15, .5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  pointer-events: auto;
  -webkit-app-region: no-drag;
  transition: background 150ms ease, color 150ms ease;
}

.info-rail-toggle:hover:not(:disabled),
.info-rail-toggle[aria-expanded='true']:not(:disabled) {
  background: rgba(15, 15, 15, .065);
  color: rgba(15, 15, 15, .82);
}

.info-rail-toggle:disabled {
  cursor: default;
  opacity: .46;
}

.info-rail-toggle:focus-visible {
  outline: 2px solid rgba(15, 15, 15, .28);
  outline-offset: 2px;
}

.info-rail-toggle svg {
  width: 17px;
  height: 17px;
}

.workspace-window-toggle {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--workspace-window-icon-color, var(--ink-3));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  pointer-events: auto;
  -webkit-app-region: no-drag;
  transition: background 150ms ease, color 150ms ease;
}

.workspace-window-toggle:hover {
  background: rgba(15, 15, 15, 0.065);
  color: var(--ink-1);
}

.workspace-window-toggle.selected {
  background: rgba(15, 15, 15, 0.065);
}

.window-toggle-anchor {
  position: absolute;
  top: 1px;
  right: 20px;
  z-index: 25;
}

.workspace-window-toggle:focus {
  outline: none;
  box-shadow: none;
}

.workspace-window-toggle:focus-visible {
  outline: 2px solid rgba(15, 15, 15, 0.28);
  outline-offset: 2px;
}

.side,
.main-frame {
  position: relative;
  z-index: 1;
  min-width: 0;
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
  background: var(--vibe-sidebar-bg);
  transition: opacity 180ms ease, padding 240ms ease;
}

/* 主对话区左边缘的阴影向左投进菜单栏，靠分界处最深。 */
.side::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 9;
  width: 8px;
  background: linear-gradient(
    to left,
    rgba(15, 15, 15, 0.05) 0%,
    rgba(15, 15, 15, 0.014) 45%,
    rgba(15, 15, 15, 0) 100%
  );
  pointer-events: none;
  opacity: 1;
  transition: opacity 160ms ease;
}

/* 收起动画期间内容保持侧栏内宽，只被裁切、不被挤压回流；宽度随侧栏轨道联动。 */
.side > * {
  width: max(0px, calc(var(--vibe-side-width) - 24px));
  flex-shrink: 0;
  box-sizing: border-box;
}

.side-collapsed .side {
  padding-left: 0;
  padding-right: 0;
  opacity: 0;
  pointer-events: none;
}

.side-collapsed .side::after {
  opacity: 0;
}

/*
 * The separator is intentionally transparent: the existing sidebar/main
 * boundary remains visually unchanged while the larger hit area makes the
 * affordance easy to grab.  Only hover/focus/drag feedback is added.
 */
.side-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--vibe-side-width);
  z-index: 30;
  width: 14px;
  transform: translateX(-7px);
  border: 0;
  outline: none;
  padding: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  touch-action: none;
  -webkit-app-region: no-drag;
  transition: left 240ms ease, opacity 160ms ease;
}

.side-resize-grip {
  width: 2px;
  height: 44px;
  border-radius: 999px;
  background: rgba(15, 15, 15, 0.3);
  opacity: 0;
  transition: opacity 150ms ease, background 150ms ease, box-shadow 150ms ease;
}

.side-resize-handle:hover .side-resize-grip,
.side-resize-handle:focus-visible .side-resize-grip,
.side-resizing .side-resize-grip {
  background: rgba(15, 15, 15, 0.52);
  opacity: 0.72;
}

.side-resize-handle:focus-visible .side-resize-grip {
  box-shadow: 0 0 0 3px rgba(15, 15, 15, 0.1);
}

.vibe-shell.side-collapsed .side-resize-handle {
  left: 0;
  opacity: 0;
  pointer-events: none;
}

.vibe-shell.side-resizing .side-resize-handle {
  transition: none;
}

.vibe-shell.side-resizing,
.vibe-shell.side-resizing * {
  cursor: col-resize !important;
  user-select: none !important;
}

.vibe-shell.side-resizing .main-head,
.vibe-shell.side-resizing .conversation-workspace-window {
  transition: none !important;
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

.round-btn {
  width: 25px;
  min-width: 25px;
  height: 25px;
  box-sizing: border-box;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.round-btn svg {
  display: block;
  flex: 0 0 auto;
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

/* 项目入口保持原有左栏位置与信息层级；它只负责打开选择弹窗。 */
.project-switch-trigger {
  width: 100%;
  min-width: 0;
  min-height: 50px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--ink-2);
  text-align: left;
  cursor: pointer;
  -webkit-app-region: no-drag;
  transition: background 150ms ease, border-color 150ms ease, box-shadow 180ms ease, color 150ms ease;
}

.project-switch-trigger:hover:not(:disabled) {
  border-color: rgba(15, 15, 15, 0.14);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 5px 14px rgba(15, 15, 15, 0.06);
  color: var(--ink-1);
}

.project-switch-trigger:focus-visible {
  outline: 2px solid rgba(15, 15, 15, 0.34);
  outline-offset: 2px;
  box-shadow: 0 4px 12px rgba(15, 15, 15, 0.06);
}

.project-switch-trigger[aria-expanded='true'] {
  border-color: rgba(15, 15, 15, 0.18);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 5px 16px rgba(15, 15, 15, 0.07);
}

.project-switch-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.58;
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
  font-weight: 450;
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

.side-user-card {
  flex: 0 0 auto;
  width: calc(100% + 24px);
  min-height: 52px;
  margin: 0 -12px -12px;
  border: 0;
  border-top: 1px solid var(--hairline);
  border-radius: 0;
  background: var(--vibe-sidebar-bg);
  color: var(--ink-1);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  box-sizing: border-box;
  transition: background 150ms ease;
}

.side-user-card:hover {
  background: var(--vibe-sidebar-bg);
}

.side-user-profile {
  min-width: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 9px;
  cursor: pointer;
  text-align: left;
  transition: background 140ms ease;
}

.side-user-profile:hover {
  background: var(--fill-1);
}

.side-user-kb {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #8f8f8f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}

.side-user-kb:hover:not(:disabled) {
  background: var(--fill-1);
  color: #777;
}

.side-user-kb:disabled {
  cursor: not-allowed;
  opacity: .4;
}

.side-user-avatar.avatar-container {
  position: relative;
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.side-user-avatar .user-avatar {
  border: 0;
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
  font-size: 14px;
  line-height: 1.35;
  font-weight: 600;
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

.session-title { font-weight: 450; }

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

  &:hover .session-open,
  &:focus-within .session-open,
  &.active .session-open {
    background: rgba(15, 15, 15, 0.055);
    box-shadow: none;
  }

  &:hover .session-title,
  &:focus-within .session-title,
  &.active .session-title {
    color: var(--ink-1);
  }
}

.session-open {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  /* 去掉时间后变单行，行高收窄；左起对齐 10px 基准线 */
  min-height: 32px;
  border-radius: 12px;
  padding: 6px 28px 6px 12px;
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


.session-running {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);

  &.waiting-user {
    flex-basis: auto;
    width: auto;
    height: 20px;
    padding: 0 7px;
    border-radius: 6px;
    background: #e8f1ff;
    color: #4c7ee8;
    font-size: 11px;
    font-weight: 650;
    line-height: 20px;
    white-space: nowrap;
  }
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
  z-index: auto;
  left: -1px;
  margin: 0;
  padding: 10px;
  border-radius: 0 16px 16px 0;
  display: flex;
  overflow: hidden;
  width: calc(100% + 1px);
  background: var(--vibe-conversation-bg);
}

.main {
  --conversation-info-rail-width: 324px;
  --conversation-info-rail-gutter: 10px;
  --conversation-info-rail-outer-width: calc(
    var(--conversation-info-rail-width)
    + var(--conversation-info-rail-gutter)
    + var(--conversation-info-rail-gutter)
  );
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  width: auto;
  height: 100%;
  background: var(--vibe-conversation-bg);
  border-radius: 14px;
  overflow: visible;
  display: flex;
  flex-direction: row;
  box-shadow: none;
}

/* 主 header 脱离信息栏的 flex 收缩；仅在独立窗口打开时收口到主对话区域。 */
.main.workspace-open .main-head {
  right: var(--workspace-window-width);
}

.main-conversation-pane {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: var(--vibe-conversation-bg);
}

/*
 * slot 只负责为始终 absolute 的 Panel 保留布局宽度。Viewer 离场时它同步扩展，
 * Panel 自身只改变 right；动画结束后不会再发生 absolute → flex 的定位交接。
 */
.conversation-info-rail-slot {
  flex: 0 0 var(--conversation-info-rail-outer-width);
  width: var(--conversation-info-rail-outer-width);
  min-width: 0;
  height: 100%;
  overflow: visible;
  transition:
    flex-basis 220ms ease,
    width 220ms ease;
}

.conversation-info-rail-slot.viewer-transitioning {
  transition:
    flex-basis 320ms cubic-bezier(.22, 1, .36, 1),
    width 320ms cubic-bezier(.22, 1, .36, 1);
}

.conversation-info-rail-slot.viewer-open {
  flex-basis: 0;
  width: 0;
}

.conversation-info-rail-slot.collapsed {
  flex-basis: 0;
  width: 0;
}

.conversation-workspace-window {
  position: relative;
  flex: 0 0 var(--workspace-window-width);
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--vibe-conversation-bg);
  border-left: 0;
  box-sizing: border-box;
}

.conversation-workspace-window::before {
  content: '';
  position: absolute;
  top: -10px;
  bottom: -10px;
  left: 0;
  z-index: 22;
  border-left: 1px solid rgba(15, 15, 15, 0.08);
  pointer-events: none;
}

.workspace-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -7px;
  z-index: 30;
  width: 14px;
  border: 0;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  touch-action: none;
  -webkit-app-region: no-drag;
}

.workspace-resize-grip {
  width: 3px;
  height: 44px;
  border-radius: 999px;
  background: rgba(15, 15, 15, 0.34);
  opacity: 0.28;
  transition: opacity 150ms ease, background 150ms ease, box-shadow 150ms ease;
}

.workspace-resize-handle:hover .workspace-resize-grip,
.workspace-resize-handle:focus-visible .workspace-resize-grip,
.workspace-resizing .workspace-resize-grip {
  background: rgba(15, 15, 15, 0.58);
  opacity: 0.82;
}

.workspace-resize-handle:focus-visible .workspace-resize-grip {
  box-shadow: 0 0 0 3px rgba(15, 15, 15, 0.12);
}

/* Keep both separators interactive while hiding their visible grips. */
.side-resize-grip,
.workspace-resize-grip {
  display: none;
}

.vibe-shell.workspace-resizing,
.vibe-shell.workspace-resizing * {
  cursor: col-resize !important;
  user-select: none !important;
}

.vibe-shell.workspace-resizing .main-head,
.vibe-shell.workspace-resizing .conversation-workspace-window {
  transition: none !important;
}

.workspace-window-enter-active,
.workspace-window-leave-active {
  // 仅裁剪，避免 focus / scrollIntoView 在动画期间横向滚动外壳。
  overflow: clip;
  transition:
    flex-basis 320ms cubic-bezier(.22, 1, .36, 1),
    opacity 220ms ease;
}

.workspace-window-leave-active {
  pointer-events: none;
}

.workspace-window-enter-from,
.workspace-window-leave-to {
  flex-basis: 0;
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .workspace-window-enter-active,
  .workspace-window-leave-active,
  .main-head,
  .main-head-actions,
  .conversation-info-rail-slot,
  .side-resize-handle,
  .side-resize-grip {
    transition: none !important;
  }
}

@media (max-width: 1180px) {
  .main {
    --conversation-info-rail-width: 300px;
  }
}

/* header 浮在滚动内容之上：无 border，靠近 header 的内容经背后毛玻璃渐隐——
   模糊层放 ::before（带渐变 mask），标题文字自身不受 mask 影响。 */
.main-head {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 21;
  height: 68px;
  flex-shrink: 0;
  padding: 0 20px;
  border-bottom: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none; /* 只是标题层，别挡住下面的滚动/悬停 */
  background: var(--vibe-conversation-bg); /* header 本体实底不透明 */
  transition: right 320ms cubic-bezier(.22, 1, .36, 1);

  /* 紧贴 header 下沿的柔边：surface 色渐隐（无 backdrop 模糊）——
     文字滚过时渐渐没入背景，像轻微化开，但始终清晰可读。 */
  &::before {
    content: '';
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    height: 14px;
    background: linear-gradient(to bottom, rgb(255, 255, 255), rgba(255, 255, 255, 0));
  }


  p {
    margin: 0 0 4px;
    color: rgba(15, 15, 15, 0.42);
    font-size: 12px;
  }

  h1 {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
  }

  &.compact {
    height: 25px;
  }
}

.main-head-leading {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  gap: 2px;
}

.main-head-copy {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.main-head-copy h1 {
  overflow: hidden;
  white-space: nowrap;
}

/* 只让超出边界前的少量字形渐隐；不叠加玻璃层，也不模糊整块内容。 */
.main-head.compact .main-head-copy h1 {
  -webkit-mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 18px), transparent 100%);
  mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 18px), transparent 100%);
}

.main-head-side-toggle {
  flex: 0 0 auto;
  width: 22.4px;
  height: 22.4px;
  border-radius: 8px;
  background: transparent;
  pointer-events: auto;
  -webkit-app-region: no-drag;
}

.main-head-side-toggle.mac {
  // 主标题已有 20px 左内边距；再补 52px，与展开态的 72px macOS 安全起点对齐。
  margin-left: 52px;
}

.main-head-side-toggle:hover {
  background: rgba(15, 15, 15, 0.07);
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
  background: var(--vibe-conversation-bg);
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
  padding: 4px;
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
  /* header 高度 68px + 下沿渐隐 14px，再留少量呼吸空间，首条消息不会贴住标题层。 */
  padding:
    84px
    max(28px, calc((100% - 760px) / 2))
    24px
    max(52px, calc((100% - 760px) / 2));
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: var(--vibe-conversation-bg);
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

/* 临时提问尚无复制/时间操作栏；预留正式 user event 的同等空间，避免 event_saved 接管时下方内容跳动。 */
.pending-user-event .user-message-wrap {
  padding-bottom: 23px;
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
  grid-template-columns: 18px minmax(0, 1fr);
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
  width: 18px;
  height: 18px;
  border-radius: 6px;
}

.user-attachment-icon svg {
  width: 15px;
  height: 15px;
}

.user-attachment-icon.markdown :deep(.markdown-file-icon) {
  width: 100%;
  height: 100%;
  color: #fff;
  -webkit-text-fill-color: #fff;
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
  background: #000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: 5px 10px;
  box-sizing: border-box;
}

.user-message-bubble .user-message-content {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.68;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

.user-message-bubble .user-message-markdown {
  white-space: normal;

  :deep(p) {
    margin: 0;
    white-space: pre-wrap;
  }

  :deep(p + p) {
    margin-top: 7px;
  }

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    margin: 0 0 6px;
    color: #fff;
    font-size: 1.08em;
    line-height: 1.35;
    font-weight: 600;
  }

  :deep(ul),
  :deep(ol) {
    margin: 4px 0 6px 18px;
    padding: 0;
  }

  :deep(li) {
    margin: 2px 0;
    white-space: pre-wrap;
  }

  :deep(strong) {
    color: #fff;
    font-weight: 600;
  }

  :deep(em) {
    color: rgba(255, 255, 255, 0.88);
  }

  :deep(blockquote) {
    margin: 6px 0;
    padding: 2px 0 2px 9px;
    border-left: 2px solid rgba(255, 255, 255, 0.32);
    color: rgba(255, 255, 255, 0.8);
  }

  :deep(a) {
    color: #c7ddff;
    text-decoration: underline;
    word-break: break-all;
  }

  :deep(code) {
    padding: 1px 4px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9em;
  }

  :deep(pre) {
    max-width: 100%;
    margin: 6px 0;
    padding: 8px 10px;
    overflow: auto;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.12);
  }

  :deep(pre code) {
    padding: 0;
    background: transparent;
    color: #fff;
    white-space: pre;
  }

  :deep(.copyable-code) {
    max-width: 100%;
    margin: 6px 0;
    overflow: hidden;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.12);
  }

  :deep(.copyable-code-head) {
    height: 28px;
    padding: 0 8px 0 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: rgba(255, 255, 255, 0.68);
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
  }

  :deep(.copyable-code-copy) {
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: rgba(255, 255, 255, 0.68);
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  :deep(.copyable-code-copy:hover),
  :deep(.copyable-code-copy.copied) {
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
  }

  :deep(.copyable-code pre) {
    margin: 0;
    padding: 0 10px 10px;
    background: transparent;
  }

  :deep(hr) {
    margin: 8px 0;
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.22);
  }

  :deep(table) {
    display: block;
    max-width: 100%;
    margin: 6px 0;
    overflow: auto;
    border-collapse: collapse;
  }

  :deep(th),
  :deep(td) {
    padding: 4px 6px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    white-space: nowrap;
  }
}

:global(.vibe-shell .user-message-bubble .user-message-content::selection),
:global(.vibe-shell .user-message-bubble .user-message-content *::selection) {
  background-color: rgba(148, 148, 148, 0.72) !important;
  color: #fff !important;
}

:global(.vibe-shell .user-message-bubble .user-message-content::-moz-selection),
:global(.vibe-shell .user-message-bubble .user-message-content *::-moz-selection) {
  background-color: rgba(148, 148, 148, 0.72) !important;
  color: #fff !important;
}

/* 回答区统一使用浅灰选区；覆盖回答正文、思考和过程旁白的所有文本节点。 */
:global(.vibe-shell .assistant-message::selection),
:global(.vibe-shell .assistant-message *::selection) {
  background-color: rgba(148, 148, 148, 0.38) !important;
  color: #171717 !important;
}

:global(.vibe-shell .assistant-message::-moz-selection),
:global(.vibe-shell .assistant-message *::-moz-selection) {
  background-color: rgba(148, 148, 148, 0.38) !important;
  color: #171717 !important;
}

.user-message-wrap.collapsible:not(.expanded) .user-message-content {
  max-height: 18lh;
  max-height: min(18lh, 52dvh);
  overflow: hidden;
}

.user-message-wrap.expanded .user-message-content {
  max-height: none;
  overflow: visible;
}

.user-message-more {
  margin-top: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.66);
  font-size: 12px;
  cursor: pointer;

  &:hover {
    color: rgba(255, 255, 255, 0.94);
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
    background: #000;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.14),
      0 4px 12px rgba(0, 0, 0, 0.12);
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
    color: rgba(255, 255, 255, 0.94);
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
  font-weight: 450;
  line-height: 1.75;

  strong {
    display: inline;
    color: rgba(15, 15, 15, 0.72);
    font-size: inherit;
    font-weight: 550;
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
  font-weight: 450;
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
    font-weight: 600;
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

/* If the throttled streaming projection is not ready for the newest token,
 * briefly keep the safe text fallback; the next scheduled render replaces it
 * with Markdown without waiting for the whole answer. */
.streaming-answer-plain {
  white-space: pre-wrap;
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
  margin: 0 auto 10px;
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

/* 会话删除确认框：沿用 Vibe 的中性卡片层级，仅在最终危险动作上使用克制红色。 */
:global(.vibe-delete-dialog-overlay) {
  background: rgba(20, 20, 22, 0.28);
  -webkit-backdrop-filter: blur(5px) saturate(110%);
  backdrop-filter: blur(5px) saturate(110%);
}

:global(.vibe-delete-dialog.el-message-box) {
  width: 420px;
  max-width: calc(100vw - 32px);
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.88), rgba(246, 246, 245, 0.68));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 28px 72px rgba(15, 15, 15, 0.2);
  -webkit-backdrop-filter: blur(28px) saturate(155%);
  backdrop-filter: blur(28px) saturate(155%);
}

:global(.vibe-delete-dialog .el-message-box__header) {
  padding: 0;
}

:global(.vibe-delete-dialog .el-message-box__title) {
  color: rgba(15, 15, 15, 0.94);
  font-size: 19px;
  font-weight: 650;
  line-height: 1.35;
}

:global(.vibe-delete-dialog .el-message-box__content) {
  padding: 16px 0 22px;
}

:global(.vibe-delete-dialog .el-message-box__container) {
  display: block;
}

:global(.vibe-delete-dialog .el-message-box__status) {
  display: none;
}

:global(.vibe-delete-dialog .el-message-box__message) {
  width: 100%;
  margin: 0;
}

:global(.vibe-delete-dialog-copy) {
  display: grid;
  gap: 9px;
}

:global(.vibe-delete-dialog-session) {
  min-width: 0;
  margin: 0;
  padding: 11px 13px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.68);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 1px 4px rgba(15, 15, 15, 0.045);
  color: rgba(15, 15, 15, 0.82);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.vibe-delete-dialog-hint) {
  margin: 0;
  color: rgba(15, 15, 15, 0.5);
  font-size: 13px;
  line-height: 1.6;
}

:global(.vibe-delete-dialog .el-message-box__btns) {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 0;
}

:global(.vibe-delete-dialog .el-message-box__btns .el-button) {
  min-width: 86px;
  height: 38px;
  margin: 0;
  border-radius: 11px;
  font-size: 13px;
  font-weight: 600;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease, transform 120ms ease;
}

:global(.vibe-delete-dialog .vibe-delete-cancel.el-button) {
  border-color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.48);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.68);
  color: rgba(15, 15, 15, 0.66);
}

:global(.vibe-delete-dialog .vibe-delete-cancel.el-button:hover),
:global(.vibe-delete-dialog .vibe-delete-cancel.el-button:focus-visible) {
  border-color: rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.66);
  color: rgba(15, 15, 15, 0.86);
}

:global(.vibe-delete-dialog .vibe-delete-confirm.el-button) {
  border-color: rgba(153, 27, 20, 0.5);
  background: linear-gradient(180deg, rgba(190, 52, 43, 0.96), rgba(168, 35, 27, 0.96));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 5px 14px rgba(180, 35, 24, 0.18);
  color: #fff;
}

:global(.vibe-delete-dialog .vibe-delete-confirm.el-button:hover),
:global(.vibe-delete-dialog .vibe-delete-confirm.el-button:focus-visible) {
  border-color: rgba(132, 24, 18, 0.62);
  background: linear-gradient(180deg, rgba(174, 42, 34, 0.98), rgba(145, 29, 22, 0.98));
  color: #fff;
}

:global(.vibe-delete-dialog .el-message-box__btns .el-button:active) {
  transform: translateY(1px);
}
</style>
