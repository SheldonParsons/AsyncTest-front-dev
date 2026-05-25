<template>
  <main class="vibe-knowledge" :class="{ 'patch-drawer-closed': !patchDrawerOpen }" :style="{ '--inspector-w': inspectorWidth + 'px' }">
    <aside class="sidebar">
      <div class="sidebar-header">
        <button class="back-link" type="button" @click="goWorkbench" title="返回 AsyncTest Vibe" aria-label="返回 AsyncTest Vibe">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          <span>AsyncTest Vibe</span>
        </button>
      </div>

      <section class="project-box">
        <label>当前项目</label>
        <div class="project-select" :class="{ open: projectMenuOpen }">
          <button
            class="project-trigger"
            type="button"
            :disabled="booting || projects.length === 0"
            @click="projectMenuOpen = !projectMenuOpen"
          >
            <span>{{ currentProjectName }}</span>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 10l5 5 5-5" />
            </svg>
          </button>
          <div v-if="projectMenuOpen" class="project-menu">
            <button
              v-for="project in projects"
              :key="project.id"
              type="button"
              :class="{ active: String(project.id) === selectedProjectId }"
              @click="chooseProject(project)"
            >
              {{ project.name || project.project_name || `项目 ${project.id}` }}
            </button>
          </div>
        </div>
      </section>

      <section class="session-list" v-if="vibeProject">
        <div class="section-title">
          <span>Vibe 需求对话</span>
          <button
            class="icon-btn-sm"
            type="button"
            :disabled="isDraftSession"
            :title="isDraftSession ? '已有未发送的新对话' : '新建需求对话'"
            aria-label="新建需求对话"
            @click="createNewSession"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>

        <div v-if="!sessions.length && !isDraftSession" class="empty-small">
          暂无对话，输入需求后会自动创建
        </div>

        <div class="session-items">
          <button
            v-if="isDraftSession"
            type="button"
            :class="['session-item draft', { active: activePanel === 'entry' }]"
            @click="selectDraft"
          >
            <span class="session-name">{{ draftTitle || '新的需求对话' }}</span>
            <small class="session-meta">未发送</small>
          </button>
          <div
            v-for="session in sessions"
            :key="session.id"
            class="session-item-wrap"
          >
            <button
              type="button"
              :class="['session-item', { active: activePanel === 'entry' && !isDraftSession && activeSession?.id === session.id }]"
              @click="selectSession(session)"
            >
              <span class="session-name">{{ session.title || '未命名对话' }}</span>
              <small class="session-meta">{{ formatTime(session.last_event_at || session.updated_at || session.created_at) }}</small>
            </button>
            <button
              class="session-delete"
              type="button"
              :disabled="deletingSessionId === session.id"
              :title="deletingSessionId === session.id ? '删除中…' : '删除对话'"
              aria-label="删除对话"
              @click.stop="deleteSession(session)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 7l10 10" />
                <path d="M17 7L7 17" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <nav class="nav-list" aria-label="Vibe navigation">
        <section v-for="group in navGroups" :key="group.label" class="nav-section">
          <span class="nav-section-title">{{ group.label }}</span>
          <button
            v-for="item in group.items"
            :key="item.key"
            type="button"
            :class="[{ active: navigationActiveKey === item.key }, `nav-item-${item.key}`]"
            @click="selectPanel(item.key)"
          >
            <span>{{ item.label }}</span>
            <small v-if="item.count !== undefined">{{ item.count }}</small>
          </button>
        </section>
      </nav>

      <section class="fact-nav">
        <div class="section-title">
          <span>事实导航</span>
          <button class="icon-btn-sm" type="button" :disabled="loadingData" :title="loadingData ? '刷新中…' : '刷新'" aria-label="刷新" @click="refreshProjectState">
            <svg viewBox="0 0 24 24" :class="{ spinning: loadingData }" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-3.5-7.1L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </button>
        </div>

        <div v-if="groupedFacts.length === 0" class="empty-small">
          暂无正式事实
        </div>

        <div v-for="group in groupedFacts" :key="group.type" class="fact-group">
          <div class="fact-group-title">
            <span>{{ group.label }}</span>
            <small>{{ group.items.length }}</small>
          </div>
          <button
            v-for="fact in group.items"
            :key="fact.id"
            type="button"
            :class="{ active: selectedFactId === fact.id }"
            @click="selectFact(fact)"
          >
            <span>{{ fact.name || '未命名事实' }}</span>
            <small>{{ fact.summary || fact.content || '暂无摘要' }}</small>
          </button>
        </div>
      </section>
    </aside>

    <section class="workspace">
      <header class="workspace-header">
        <div class="header-copy">
          <h1>{{ headerTitle }}</h1>
        </div>
        <div v-if="activePanel === 'entry'" class="header-actions">
          <button
            class="icon-btn with-badge"
            :class="{ on: patchDrawerOpen }"
            type="button"
            :title="patchDrawerOpen ? '隐藏补丁面板' : (patches.length ? `展开补丁面板 · 待确认 ${patches.length}` : '展开补丁面板')"
            :aria-label="patchDrawerOpen ? '隐藏补丁面板' : '展开补丁面板'"
            :aria-pressed="patchDrawerOpen"
            @click="togglePatchDrawer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2.5" />
              <path d="M15 4v16" />
            </svg>
            <span v-if="patches.length" class="badge">{{ patches.length > 99 ? '99+' : patches.length }}</span>
          </button>
        </div>
      </header>

      <div v-if="booting" class="center-state">
        <span class="spinner" />
        <p>正在打开 Vibe 知识库</p>
      </div>

      <div v-else-if="projects.length === 0" class="center-state">
        <p class="state-title">请先加入一个项目</p>
        <p>Vibe 知识库需要绑定到 AsyncTest 项目。</p>
      </div>

      <div v-else class="event-shell" :class="{ hero: heroMode, 'panel-mode': activePanel !== 'entry' }">
        <template v-if="activePanel === 'baseline'">
          <section class="workspace-panel baseline-manager">
            <header class="workspace-panel-header">
              <div>
                <span>Project Baseline</span>
                <h2>项目基线</h2>
                <p>项目级认知底座，用来描述这个项目是什么、面向什么范围、后续应该从哪里继续补充。</p>
              </div>
              <div class="panel-toolbar">
                <button v-if="hasProjectBaseline && !baselineEdit.editing" type="button" @click="startEditBaseline">编辑基线</button>
                <button v-if="hasProjectBaseline && !baselineEdit.editing" class="danger-btn" type="button" @click="resetProjectBaseline">重建项目基线</button>
              </div>
            </header>

            <div v-if="!hasProjectBaseline && !baselineEdit.editing" class="empty-card baseline-empty">
              <strong>当前项目暂无基线</strong>
              <span>新建一个 Vibe 需求对话，在录入模式下介绍这个系统，系统会先生成项目基线建议。</span>
              <button type="button" class="primary-btn" @click="createNewSession">新建需求对话</button>
            </div>

            <section v-else-if="baselineEdit.editing" class="baseline-editor-card">
              <div class="editor-copy">
                <strong>编辑项目基线</strong>
                <span>这里管理项目级认知，不是录入具体需求。具体需求仍然通过 Vibe 需求对话进入。</span>
              </div>
              <div class="baseline-form-grid">
                <label>
                  <span>系统名称</span>
                  <input v-model="baselineEdit.system_name" placeholder="例如：统一用户管理平台" />
                </label>
                <label class="wide">
                  <span>系统目标</span>
                  <textarea v-model="baselineEdit.goal" rows="3" placeholder="这个系统主要解决什么问题，面向什么范围。" />
                </label>
                <label class="wide">
                  <span>摘要</span>
                  <textarea v-model="baselineEdit.summary" rows="4" placeholder="用几句话描述项目整体认知。" />
                </label>
              </div>
              <div v-if="baselineDomains.length || baselineStartPoints.length || baselineQuestions.length || baselineExternalDependencies.length" class="baseline-suggestion-note">
                <strong>以下内容是 LLM 给出的录入建议，不在这里手动编辑</strong>
                <span>业务域、建议起点、待澄清问题和外部依赖会随着后续录入继续由系统整理；真正的需求事实应通过 Vibe 需求对话进入。</span>
              </div>
              <footer>
                <button type="button" :disabled="baselineEdit.saving" @click="cancelEditBaseline">取消</button>
                <button type="button" class="primary-btn" :disabled="baselineEdit.saving" @click="saveBaselineEdit">
                  {{ baselineEdit.saving ? '保存中…' : '保存基线' }}
                </button>
              </footer>
            </section>

            <section v-else class="baseline-detail-grid">
              <article v-if="currentBaseline.system_name" class="baseline-field">
                <span>系统名称</span>
                <p>{{ currentBaseline.system_name }}</p>
              </article>
              <article v-if="currentBaseline.goal" class="baseline-field wide">
                <span>系统目标</span>
                <p>{{ currentBaseline.goal }}</p>
              </article>
              <article v-if="currentBaseline.summary" class="baseline-field wide">
                <span>摘要</span>
                <p>{{ currentBaseline.summary }}</p>
              </article>
              <article v-if="baselineDomains.length" class="baseline-field list-field">
                <span>业务域</span>
                <ul>
                  <li v-for="(item, index) in baselineDomains" :key="index">
                    <strong>{{ namedItemTitle(item) }}</strong>
                    <small v-if="namedItemDescription(item)">{{ namedItemDescription(item) }}</small>
                  </li>
                </ul>
              </article>
              <article v-if="baselineStartPoints.length" class="baseline-field list-field">
                <span>建议起点</span>
                <ul>
                  <li v-for="(item, index) in baselineStartPoints" :key="index">{{ stringifyBrief(item) }}</li>
                </ul>
              </article>
              <article v-if="baselineQuestions.length" class="baseline-field list-field wide">
                <span>待澄清问题</span>
                <ul>
                  <li v-for="(item, index) in baselineQuestions" :key="index">{{ stringifyBrief(item) }}</li>
                </ul>
              </article>
              <article v-if="baselineExternalDependencies.length" class="baseline-field list-field wide">
                <span>外部依赖</span>
                <ul>
                  <li v-for="(item, index) in baselineExternalDependencies" :key="index">
                    <strong>{{ namedItemTitle(item) }}</strong>
                    <small v-if="namedItemDescription(item)">{{ namedItemDescription(item) }}</small>
                  </li>
                </ul>
              </article>
            </section>
          </section>
        </template>

        <template v-else-if="activePanel === 'patches'">
          <section class="workspace-panel">
            <header class="workspace-panel-header">
              <div>
                <span>Pending Patches</span>
                <h2>待确认补丁</h2>
                <p>AI 根据录入内容生成的变更建议，只有确认后才会写入正式事实。</p>
              </div>
            </header>
            <div v-if="patches.length === 0" class="empty-card">
              <strong>暂无待确认补丁</strong>
              <span>选择一个 Vibe 需求对话并录入需求后，补丁会出现在这里。</span>
            </div>
            <div v-else class="main-card-list">
              <article v-for="patch in patches" :key="patch.id" class="patch-card main-card">
                <div class="patch-top">
                  <span class="patch-type-tag">{{ patchTypeLabel(patch.patch_type) }}</span>
                  <small>{{ patch.status }}</small>
                </div>
                <h3>{{ patch.title || '未命名补丁' }}</h3>
                <small v-if="patchSessionLabel(patch)" class="patch-source">来自：{{ patchSessionLabel(patch) }}</small>
                <p v-if="patch.reason">{{ patch.reason }}</p>
                <div v-if="patchSummary(patch)" class="patch-summary">{{ patchSummary(patch) }}</div>
                <div v-if="patchRisk(patch)" class="risk-line">{{ patchRisk(patch) }}</div>
                <div class="patch-actions">
                  <button type="button" class="primary-btn" :disabled="isPatchBusy(patch)" @click="confirmPatch(patch)">
                    {{ confirmingPatchId === patch.id ? '确认中' : '确认' }}
                  </button>
                  <button type="button" :disabled="isPatchBusy(patch)" @click="openEditPatch(patch)">编辑后确认</button>
                  <button type="button" :disabled="isPatchBusy(patch)" @click="ignorePatch(patch)">
                    {{ ignoringPatchId === patch.id ? '忽略中' : '忽略' }}
                  </button>
                </div>
              </article>
            </div>
          </section>
        </template>

        <template v-else-if="activePanel === 'facts'">
          <section class="workspace-panel">
            <header class="workspace-panel-header">
              <div>
                <span>Facts</span>
                <h2>业务事实</h2>
                <p>已经被确认写入的正式需求知识，按对象、能力、规则、链路等类型组织。</p>
              </div>
            </header>
            <div v-if="groupedFacts.length === 0" class="empty-card">
              <strong>暂无正式事实</strong>
              <span>确认待确认补丁后，事实会沉淀在这里。</span>
            </div>
            <div v-else class="fact-overview">
          <section v-for="group in groupedFacts" :key="group.type" class="fact-overview-group">
            <header>
              <h3>{{ group.label }}</h3>
              <small>{{ group.items.length }}</small>
            </header>
                <button v-for="fact in group.items" :key="fact.id" type="button" @click="selectFact(fact)">
                  <span>
                    <strong>{{ fact.name || '未命名事实' }}</strong>
                    <em>{{ fact.summary || fact.content || '暂无摘要' }}</em>
                  </span>
                  <small>查看</small>
                </button>
              </section>
            </div>
          </section>
        </template>

        <template v-else-if="activePanel === 'impact'">
          <section class="workspace-panel">
            <header class="workspace-panel-header">
              <div>
                <span>Relations & Impact</span>
                <h2>关系与影响</h2>
                <p>事实之间的关系和需求变更带来的影响记录，是后续测试建议和影响分析的基础。</p>
              </div>
            </header>
            <div v-if="displayRelations.length === 0 && displayImpacts.length === 0" class="empty-card">
              <strong>暂无关系与影响</strong>
              <span>确认补丁后，关系与影响记录会出现在这里。</span>
            </div>
            <div v-else class="main-card-list">
              <article v-for="relation in displayRelations" :key="relation.id" class="impact-card relation-card main-card">
                <div class="impact-card-head">
                  <span>{{ relation.relation_type || '事实关系' }}</span>
                  <button class="danger-btn compact ghost" type="button" :disabled="deletingRelationId === relation.id" @click="deleteRelationRecord(relation)">
                    {{ deletingRelationId === relation.id ? '删除中' : '删除' }}
                  </button>
                </div>
                <p>{{ relationFactName(relation.source_fact_id) }} → {{ relationFactName(relation.target_fact_id) }}</p>
                <div v-if="relation.description" class="patch-summary">{{ relation.description }}</div>
              </article>
              <article v-for="impact in displayImpacts" :key="impact.id" class="impact-card main-card">
                <div class="impact-card-head">
                  <span>{{ impact.impact_type || '影响记录' }}</span>
                  <button class="danger-btn compact ghost" type="button" :disabled="deletingImpactId === impact.id" @click="deleteImpactRecord(impact)">
                    {{ deletingImpactId === impact.id ? '删除中' : '删除' }}
                  </button>
                </div>
                <p>{{ impact.risk || '暂无风险说明' }}</p>
                <p v-if="impactAffectedFactNames(impact)" class="impact-meta">影响事实：{{ impactAffectedFactNames(impact) }}</p>
                <div v-if="impact.test_focus?.length" class="test-list">
                  <strong>测试关注</strong>
                  <span v-for="(item, index) in impact.test_focus.slice(0, 6)" :key="index">{{ stringifyBrief(item) }}</span>
                </div>
              </article>
            </div>
          </section>
        </template>

        <template v-else-if="heroMode">
          <div class="hero-stack">
            <PlantGrowth :key="plantKey" :size="168" class="hero-plant" />
            <section v-if="isProjectEmpty" class="baseline-guide hero-guide">
              <header>
                <span class="guide-tag">首次建模</span>
                <h2>从一次描述开始，搭起项目认知</h2>
                <p>这是一个空项目。先用一段话告诉系统它在做什么、关键能力是什么，Vibe 会整理出系统目标、业务域、外部依赖与起点建议供你确认。</p>
              </header>
              <div class="guide-cards">
                <button type="button" class="guide-card" @click="useGuidePrompt('system')">
                  <strong>介绍这个系统</strong>
                  <span>例如：这是一个企业级 API 测试平台，提供项目协作、接口管理和自动化执行。</span>
                </button>
                <button type="button" class="guide-card" @click="useGuidePrompt('capability')">
                  <strong>从一个核心能力开始</strong>
                  <span>例如：账号列表显示当前登录账号所属组织及子组织下的账号。</span>
                </button>
                <button type="button" class="guide-card" @click="useGuidePrompt('paste')">
                  <strong>粘贴现有需求</strong>
                  <span>把现成的 PRD / 需求段落粘贴进来，系统会自行提炼基线认知。</span>
                </button>
              </div>
            </section>
            <section v-else-if="hasBaselineWithoutFacts" class="baseline-guide hero-guide">
              <header>
                <span class="guide-tag neutral">项目基线已存在</span>
                <h2>这个项目已经保存过基线</h2>
                <p>忽略待确认补丁或删除需求对话不会清空项目基线。如果你想重新进行基线确认，可以先重建项目基线；如果只是继续补充账号、角色、权限等需求，直接录入即可。</p>
              </header>
              <div class="guide-actions">
                <button type="button" class="danger-btn large" @click="resetProjectBaseline">
                  重建项目基线
                </button>
              </div>
            </section>
            <div v-else class="welcome hero-welcome">
              <p>从一句话开始描述需求</p>
              <span>例如：账号列表显示当前登录账号所属组织及子组织下的账号。</span>
            </div>
            <form class="composer hero-composer" @submit.prevent="sendDemand">
              <div class="composer-shell">
                <div v-if="composerMode === 'entry'" class="composer-mode-chip" aria-label="当前为录入模式">
                  <span class="mode-dot" />
                  <span>录入</span>
                </div>
                <textarea
                  ref="draftInputRef"
                  v-model="draft"
                  rows="1"
                  :disabled="composerDisabled"
                  :placeholder="composerPlaceholder"
                  @input="resizeDraftInput"
                  @keydown.enter.exact.prevent="sendDemand"
                />
                <div class="composer-actions">
                  <div class="composer-menu-wrap">
                    <button
                      class="composer-plus"
                      type="button"
                      :class="{ active: composerMenuOpen }"
                      title="添加内容或切换模式"
                      aria-label="添加内容或切换模式"
                      @click.stop="toggleComposerMenu"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                    <div v-if="composerMenuOpen" class="composer-popover">
                      <button type="button" disabled>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <circle cx="9" cy="11" r="1.6" />
                          <path d="m21 17-5-5-7 7" />
                        </svg>
                        <span>添加照片</span>
                        <small>稍后支持</small>
                      </button>
                      <button type="button" disabled>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
                          <path d="M14 2v5h5" />
                        </svg>
                        <span>添加文件</span>
                        <small>稍后支持</small>
                      </button>
                      <div class="menu-separator" />
                      <button type="button" :class="{ selected: composerMode === 'chat' }" @click="setComposerMode('chat')">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                        </svg>
                        <span>对话模式</span>
                        <small>不写入需求库</small>
                      </button>
                      <button type="button" :class="{ selected: composerMode === 'entry' }" @click="setComposerMode('entry')">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                        <span>录入模式</span>
                        <small>生成待确认补丁</small>
                      </button>
                    </div>
                  </div>
                  <button class="send-btn" type="submit" :disabled="!canSend" :title="streaming ? '整理中…' : '发送 (Enter)'" :aria-label="streaming ? '整理中' : '发送'">
                    <span v-if="streaming" class="send-spinner" />
                    <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 19V5" />
                      <path d="M6.5 10.5 12 5l5.5 5.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </template>

        <template v-else>
          <div ref="timelineRef" class="timeline">
            <article v-for="entry in timeline" :key="entry.id" :class="['timeline-item', entry.role]">
              <div class="item-meta">
                <span>{{ entry.title }}</span>
                <time>{{ formatTime(entry.created_at) }}</time>
              </div>
              <div class="item-body">
                <pre>{{ entry.content }}</pre>
              </div>
            </article>

            <section v-if="baselineFlow.suggestion" class="baseline-confirm">
              <header>
                <span class="guide-tag">基线建议</span>
                <h3>请确认这次的项目认知</h3>
                <p>确认后会写入项目基线，并自动整理首批待确认补丁。</p>
              </header>
              <dl>
                <template v-if="baselineFlow.suggestion.system_name">
                  <dt>系统名称</dt><dd>{{ baselineFlow.suggestion.system_name }}</dd>
                </template>
                <template v-if="baselineFlow.suggestion.goal">
                  <dt>系统目标</dt><dd>{{ baselineFlow.suggestion.goal }}</dd>
                </template>
                <template v-if="baselineFlow.suggestion.summary">
                  <dt>摘要</dt><dd>{{ baselineFlow.suggestion.summary }}</dd>
                </template>
                <template v-if="(baselineFlow.suggestion.domains || []).length">
                  <dt>业务域</dt>
                  <dd>
                    <ul class="baseline-named-list">
                      <li v-for="(item, idx) in baselineFlow.suggestion.domains" :key="'d'+idx">
                        <strong>{{ namedItemTitle(item) }}</strong>
                        <span v-if="namedItemDescription(item)">{{ namedItemDescription(item) }}</span>
                      </li>
                    </ul>
                  </dd>
                </template>
                <template v-if="(baselineFlow.suggestion.external_dependencies || []).length">
                  <dt>外部依赖</dt>
                  <dd>
                    <ul class="baseline-named-list">
                      <li v-for="(item, idx) in baselineFlow.suggestion.external_dependencies" :key="'e'+idx">
                        <strong>{{ namedItemTitle(item) }}</strong>
                        <span v-if="namedItemDescription(item)">{{ namedItemDescription(item) }}</span>
                      </li>
                    </ul>
                  </dd>
                </template>
                <template v-if="(baselineFlow.suggestion.suggested_start_points || []).length">
                  <dt>建议起点</dt>
                  <dd>
                    <ul>
                      <li v-for="(item, idx) in baselineFlow.suggestion.suggested_start_points" :key="'s'+idx">{{ stringifyBrief(item) }}</li>
                    </ul>
                  </dd>
                </template>
                <template v-if="(baselineFlow.suggestion.questions || []).length">
                  <dt>待澄清问题</dt>
                  <dd>
                    <ul>
                      <li v-for="(item, idx) in baselineFlow.suggestion.questions" :key="'q'+idx">{{ stringifyBrief(item) }}</li>
                    </ul>
                  </dd>
                </template>
              </dl>
              <footer>
                <button type="button" class="primary-btn" :disabled="baselineFlow.confirming" @click="confirmBaseline">
                  {{ baselineFlow.confirming ? '写入中…' : '确认基线' }}
                </button>
                <button type="button" :disabled="baselineFlow.confirming" @click="discardBaseline">重新描述</button>
              </footer>
            </section>
          </div>

          <form class="composer" @submit.prevent="sendDemand">
            <div class="composer-shell">
              <div v-if="composerMode === 'entry'" class="composer-mode-chip" aria-label="当前为录入模式">
                <span class="mode-dot" />
                <span>录入</span>
              </div>
              <textarea
                ref="draftInputRef"
                v-model="draft"
                rows="1"
                :disabled="composerDisabled"
                :placeholder="composerPlaceholder"
                @input="resizeDraftInput"
                @keydown.enter.exact.prevent="sendDemand"
              />
              <div class="composer-actions">
                <div class="composer-menu-wrap">
                  <button
                    class="composer-plus"
                    type="button"
                    :class="{ active: composerMenuOpen }"
                    title="添加内容或切换模式"
                    aria-label="添加内容或切换模式"
                    @click.stop="toggleComposerMenu"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                  <div v-if="composerMenuOpen" class="composer-popover">
                    <button type="button" disabled>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <circle cx="9" cy="11" r="1.6" />
                        <path d="m21 17-5-5-7 7" />
                      </svg>
                      <span>添加照片</span>
                      <small>稍后支持</small>
                    </button>
                    <button type="button" disabled>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
                        <path d="M14 2v5h5" />
                      </svg>
                      <span>添加文件</span>
                      <small>稍后支持</small>
                    </button>
                    <div class="menu-separator" />
                    <button type="button" :class="{ selected: composerMode === 'chat' }" @click="setComposerMode('chat')">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                      </svg>
                      <span>对话模式</span>
                      <small>不写入需求库</small>
                    </button>
                    <button type="button" :class="{ selected: composerMode === 'entry' }" @click="setComposerMode('entry')">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                      <span>录入模式</span>
                      <small>生成待确认补丁</small>
                    </button>
                  </div>
                </div>
                <button class="send-btn" type="submit" :disabled="!canSend" :title="streaming ? '整理中…' : '发送 (Enter)'" :aria-label="streaming ? '整理中' : '发送'">
                  <span v-if="streaming" class="send-spinner" />
                  <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 19V5" />
                    <path d="M6.5 10.5 12 5l5.5 5.5" />
                  </svg>
                </button>
              </div>
            </div>
          </form>
        </template>
      </div>
    </section>

    <aside class="inspector" :class="{ collapsed: !patchDrawerOpen }">
      <template v-if="patchDrawerOpen">
        <header class="inspector-header">
          <div>
            <p>{{ inspectorTitle }}</p>
            <span v-if="inspectorPanel === 'patches'">{{ patches.length }} 条待处理</span>
          </div>
          <div class="inspector-actions">
            <button
              class="icon-btn-sm"
              type="button"
              title="在主内容区打开"
              aria-label="在主内容区打开"
              @click="openInspectorInMain"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 17 17 7" />
                <path d="M9 7h8v8" />
              </svg>
            </button>
            <button
              class="icon-btn-sm"
              type="button"
              :title="loadingData ? '刷新中…' : '刷新'"
              aria-label="刷新"
              :disabled="loadingData"
              @click="refreshProjectState"
            >
              <svg viewBox="0 0 24 24" :class="{ spinning: loadingData }" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-3.5-7.1L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
            <button class="icon-btn-sm" type="button" title="关闭面板" aria-label="关闭面板" @click="patchDrawerOpen = false">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </header>

        <section v-if="inspectorPanel === 'baseline'" class="panel-scroll">
          <div v-if="!hasProjectBaseline" class="empty-card">
            <strong>暂无项目基线</strong>
            <span>新建或选择一个 Vibe 需求对话，先用录入模式介绍项目。</span>
          </div>
          <article v-else class="fact-detail baseline-panel-detail">
            <span class="detail-type">Project Baseline</span>
            <h3>{{ currentBaseline.system_name || '项目基线' }}</h3>
            <section v-if="currentBaseline.goal" class="baseline-panel-section">
              <span>系统目标</span>
              <p>{{ currentBaseline.goal }}</p>
            </section>
            <section v-if="currentBaseline.summary" class="baseline-panel-section">
              <span>摘要</span>
              <p>{{ currentBaseline.summary }}</p>
            </section>
            <section v-if="baselineDomains.length" class="baseline-panel-section">
              <span>业务域</span>
              <ul>
                <li v-for="(item, index) in baselineDomains" :key="index">
                  <strong>{{ namedItemTitle(item) }}</strong>
                  <small v-if="namedItemDescription(item)">{{ namedItemDescription(item) }}</small>
                </li>
              </ul>
            </section>
            <section v-if="baselineStartPoints.length" class="baseline-panel-section">
              <span>建议起点</span>
              <ul>
                <li v-for="(item, index) in baselineStartPoints" :key="index">{{ stringifyBrief(item) }}</li>
              </ul>
            </section>
            <section v-if="baselineQuestions.length" class="baseline-panel-section">
              <span>待澄清问题</span>
              <ul>
                <li v-for="(item, index) in baselineQuestions" :key="index">{{ stringifyBrief(item) }}</li>
              </ul>
            </section>
            <section v-if="baselineExternalDependencies.length" class="baseline-panel-section">
              <span>外部依赖</span>
              <ul>
                <li v-for="(item, index) in baselineExternalDependencies" :key="index">
                  <strong>{{ namedItemTitle(item) }}</strong>
                  <small v-if="namedItemDescription(item)">{{ namedItemDescription(item) }}</small>
                </li>
              </ul>
            </section>
          </article>
        </section>

        <section v-else-if="inspectorPanel === 'patches'" class="panel-scroll">
          <div v-if="patches.length === 0" class="empty-card">
            <strong>暂无待确认补丁</strong>
            <span>录入需求后，系统会把变更整理为待确认补丁。</span>
          </div>

          <article v-for="patch in patches" :key="patch.id" class="patch-card">
            <div class="patch-top">
              <span class="patch-type-tag">{{ patchTypeLabel(patch.patch_type) }}</span>
              <small>{{ patch.status }}</small>
            </div>
            <h3>{{ patch.title || '未命名补丁' }}</h3>
            <small v-if="patchSessionLabel(patch)" class="patch-source">来自：{{ patchSessionLabel(patch) }}</small>
            <p v-if="patch.reason">{{ patch.reason }}</p>
            <div v-if="patchSummary(patch)" class="patch-summary">
              {{ patchSummary(patch) }}
            </div>
            <div v-if="patchRisk(patch)" class="risk-line">
              {{ patchRisk(patch) }}
            </div>
            <div v-if="patch.test_suggestions?.length" class="test-list">
              <strong>测试建议</strong>
              <span v-for="(item, index) in patch.test_suggestions.slice(0, 3)" :key="index">{{ stringifyBrief(item) }}</span>
            </div>
            <div class="patch-actions">
              <button type="button" class="primary-btn" :disabled="isPatchBusy(patch)" @click="confirmPatch(patch)">
                {{ confirmingPatchId === patch.id ? '确认中' : '确认' }}
              </button>
              <button type="button" :disabled="isPatchBusy(patch)" @click="openEditPatch(patch)">
                编辑后确认
              </button>
              <button type="button" :disabled="isPatchBusy(patch)" @click="ignorePatch(patch)">
                {{ ignoringPatchId === patch.id ? '忽略中' : '忽略' }}
              </button>
            </div>
          </article>
        </section>

        <section v-else-if="inspectorPanel === 'facts'" class="panel-scroll">
          <div v-if="!selectedFact" class="empty-card">
            <strong>选择一个事实</strong>
            <span>左侧事实导航会按对象、能力、规则、链路等类型聚合。</span>
          </div>
          <article v-else class="fact-detail">
            <div class="fact-detail-head">
              <span class="detail-type">{{ factTypeLabel(selectedFact.fact_type) }}</span>
              <button class="danger-btn compact" type="button" :disabled="deletingFactId === selectedFact.id" @click="deprecateSelectedFact">
                {{ deletingFactId === selectedFact.id ? '删除中' : '删除事实' }}
              </button>
            </div>
            <h3>{{ selectedFact.name }}</h3>
            <p v-if="selectedFact.summary">{{ selectedFact.summary }}</p>
            <pre>{{ selectedFact.content || stringifyPretty(selectedFact.structured_content) }}</pre>
          </article>
        </section>

        <section v-else-if="inspectorPanel === 'impact'" class="panel-scroll">
          <div v-if="displayRelations.length === 0 && displayImpacts.length === 0" class="empty-card">
            <strong>暂无影响记录</strong>
            <span>确认补丁后，关系和相关影响会沉淀在这里。</span>
          </div>
          <article v-for="relation in displayRelations" :key="relation.id" class="impact-card relation-card">
            <div class="impact-card-head">
              <span>{{ relation.relation_type || '事实关系' }}</span>
              <button class="danger-btn compact ghost" type="button" :disabled="deletingRelationId === relation.id" @click="deleteRelationRecord(relation)">
                {{ deletingRelationId === relation.id ? '删除中' : '删除' }}
              </button>
            </div>
            <p>{{ relationFactName(relation.source_fact_id) }} → {{ relationFactName(relation.target_fact_id) }}</p>
            <div v-if="relation.description" class="patch-summary">
              {{ relation.description }}
            </div>
          </article>
          <article v-for="impact in displayImpacts" :key="impact.id" class="impact-card">
            <div class="impact-card-head">
              <span>{{ impact.impact_type || '影响记录' }}</span>
              <button class="danger-btn compact ghost" type="button" :disabled="deletingImpactId === impact.id" @click="deleteImpactRecord(impact)">
                {{ deletingImpactId === impact.id ? '删除中' : '删除' }}
              </button>
            </div>
            <p>{{ impact.risk || '暂无风险说明' }}</p>
            <p v-if="impactAffectedFactNames(impact)" class="impact-meta">影响事实：{{ impactAffectedFactNames(impact) }}</p>
            <div v-if="impact.test_focus?.length" class="test-list">
              <strong>测试关注</strong>
              <span v-for="(item, index) in impact.test_focus.slice(0, 4)" :key="index">{{ stringifyBrief(item) }}</span>
            </div>
          </article>
        </section>

        <section v-else class="panel-scroll">
          <div class="empty-card">
            <strong>选择左侧内容</strong>
            <span>可以查看项目基线、待确认补丁、业务事实或关系与影响。</span>
          </div>
        </section>
      </template>
      <div v-if="patchDrawerOpen" class="inspector-resizer" @mousedown="onResizerMouseDown" aria-hidden="true" />
    </aside>

    <div v-if="editDialog.visible" class="modal-mask" @click.self="closeEditPatch">
      <section class="edit-modal">
        <header>
          <div>
            <p>编辑后确认</p>
            <h3>{{ editDialog.patch?.title || '补丁内容' }}</h3>
          </div>
          <button class="icon-btn-sm" type="button" title="关闭" aria-label="关闭" @click="closeEditPatch">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>
        <textarea v-model="editDialog.content" />
        <footer>
          <button type="button" @click="closeEditPatch">取消</button>
          <button class="primary-btn" type="button" :disabled="editDialog.saving" @click="confirmEditedPatch">
            {{ editDialog.saving ? '确认中' : '确认写入' }}
          </button>
        </footer>
      </section>
    </div>
    <VibeModelSettings />
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiGetJoinProjects } from '@/api/project/index'
import PlantGrowth from './PlantGrowth.vue'
import VibeModelSettings from '../VibeModelSettings.vue'
import {
  confirmVibePatch,
  createVibeSession,
  deleteVibeSession,
  forceDeleteVibeFact,
  forceDeleteVibeImpactRecord,
  forceDeleteVibeRelation,
  getVibeProjectByAsyncProject,
  ignoreVibePatch,
  initVibeProject,
  listVibeEvents,
  listVibeFacts,
  listVibeImpactRecords,
  listVibePatches,
  listVibeRelations,
  listVibeSessions,
  streamVibeBaseline,
  streamVibeEvent,
  updateVibeProject,
  type VibeEvent,
  type VibeFact,
  type VibeImpactRecord,
  type VibePatch,
  type VibeProject,
  type VibeRelation,
  type VibeSession,
} from '../api'

type PanelKey = 'baseline' | 'entry' | 'patches' | 'facts' | 'impact'
type ComposerMode = 'chat' | 'entry'
type TimelineEntry = {
  id: string
  role: 'user' | 'system' | 'assistant' | 'error'
  title: string
  content: string
  created_at?: string
}

const router = useRouter()
const route = useRoute()
const electronAPI = window.electronAPI

const booting = ref(true)
const loadingData = ref(false)
const streaming = ref(false)
const deletingSessionId = ref<string | null>(null)
const projects = ref<any[]>([])
const selectedProjectId = ref('')
const projectMenuOpen = ref(false)
const vibeProject = ref<VibeProject | null>(null)
const sessions = ref<VibeSession[]>([])
const activeSession = ref<VibeSession | null>(null)
const isDraftSession = ref(false)
const draftTitle = ref('')
const events = ref<VibeEvent[]>([])
const patches = ref<VibePatch[]>([])
const facts = ref<VibeFact[]>([])
const relations = ref<VibeRelation[]>([])
const impacts = ref<VibeImpactRecord[]>([])
const timeline = ref<TimelineEntry[]>([])
const draft = ref('')
const composerMode = ref<ComposerMode>('chat')
const composerMenuOpen = ref(false)
const activePanel = ref<PanelKey>('entry')
const inspectorPanel = ref<Exclude<PanelKey, 'entry'>>('patches')
const patchDrawerOpen = ref(false)
const inspectorWidth = ref(380)
const selectedFactId = ref<string | null>(null)
const confirmingPatchId = ref<string | null>(null)
const ignoringPatchId = ref<string | null>(null)
const deletingFactId = ref<string | null>(null)
const deletingRelationId = ref<string | null>(null)
const deletingImpactId = ref<string | null>(null)
const timelineRef = ref<HTMLElement | null>(null)
const draftInputRef = ref<HTMLTextAreaElement | null>(null)

const baselineFlow = reactive<{
  suggestion: Record<string, any> | null
  sourceContent: string
  streaming: boolean
  confirming: boolean
}>({
  suggestion: null,
  sourceContent: '',
  streaming: false,
  confirming: false,
})

const editDialog = reactive<{
  visible: boolean
  saving: boolean
  patch: VibePatch | null
  content: string
}>({
  visible: false,
  saving: false,
  patch: null,
  content: '',
})

const baselineEdit = reactive<{
  editing: boolean
  saving: boolean
  system_name: string
  goal: string
  summary: string
}>({
  editing: false,
  saving: false,
  system_name: '',
  goal: '',
  summary: '',
})

const factTypeMap: Record<string, string> = {
  business_object: '业务对象',
  capability: '业务能力',
  rule: '业务规则',
  workflow: '业务流程',
  business_chain: '业务链路',
  interface_behavior: '接口行为',
  data_scope: '数据口径',
  concept: '概念',
  presentation_clue: '表现线索',
  external_dependency: '外部依赖',
}

const patchTypeMap: Record<string, string> = {
  add_fact: '新增事实',
  create_fact: '新增事实',
  update_fact: '更新事实',
  deprecate_fact: '废弃事实',
  replace_fact: '替换事实',
  add_relation: '新增关系',
  create_relation: '新增关系',
  remove_relation: '删除关系',
  ask_question: '需要追问',
  question: '需要追问',
  generate_test_suggestion: '测试建议',
}

const navItems = computed(() => [
  { key: 'baseline' as PanelKey, label: '项目基线', count: hasProjectBaseline.value ? 1 : undefined },
  { key: 'patches' as PanelKey, label: '待确认补丁', count: patches.value.length },
  { key: 'facts' as PanelKey, label: '业务事实', count: facts.value.length },
  { key: 'impact' as PanelKey, label: '关系与影响', count: impactNavCount.value },
])
const navGroups = computed(() => [
  { label: '处理队列', items: navItems.value.filter(item => item.key === 'patches') },
  { label: '知识资产', items: navItems.value.filter(item => item.key === 'baseline' || item.key === 'facts' || item.key === 'impact') },
])

const panelTitle = computed(() => navItems.value.find(item => item.key === activePanel.value)?.label || '详情')
const inspectorTitle = computed(() => navItems.value.find(item => item.key === inspectorPanel.value)?.label || '详情')
const navigationActiveKey = computed<PanelKey | ''>(() => {
  if (activePanel.value === 'entry') return patchDrawerOpen.value ? inspectorPanel.value : ''
  return activePanel.value
})
const currentProjectName = computed(() => {
  const project = projects.value.find(item => String(item.id) === String(selectedProjectId.value))
  return project?.name || project?.project_name || (selectedProjectId.value ? `项目 ${selectedProjectId.value}` : '选择项目')
})

const canSend = computed(() => Boolean(draft.value.trim()) && !streaming.value && Boolean(vibeProject.value) && !baselineFlow.streaming && !baselineFlow.confirming)
const projectBaselineKeys = computed(() => Object.keys(vibeProject.value?.baseline || {}))
const hasProjectBaseline = computed(() => projectBaselineKeys.value.length > 0)
const currentBaseline = computed<Record<string, any>>(() => vibeProject.value?.baseline || {})
const baselineDomains = computed(() => normalizeArray<any>(currentBaseline.value.domains))
const baselineExternalDependencies = computed(() => normalizeArray<any>(currentBaseline.value.external_dependencies))
const baselineStartPoints = computed(() => normalizeArray<any>(currentBaseline.value.suggested_start_points))
const baselineQuestions = computed(() => normalizeArray<any>(currentBaseline.value.questions))
const hasBaselineWithoutFacts = computed(() => Boolean(vibeProject.value) && facts.value.length === 0 && hasProjectBaseline.value)
const isProjectEmpty = computed(() => {
  if (!vibeProject.value) return false
  return facts.value.length === 0 && !hasProjectBaseline.value
})

const headerTitle = computed(() => {
  if (activePanel.value !== 'entry') return panelTitle.value
  if (isDraftSession.value) return draftTitle.value || '新的需求对话'
  return activeSession.value?.title || '开始新的需求录入'
})

const composerDisabled = computed(() => streaming.value || !vibeProject.value || baselineFlow.streaming || baselineFlow.confirming)

const heroMode = computed(() => {
  return (
    activePanel.value === 'entry' &&
    timeline.value.length === 0 &&
    !baselineFlow.streaming &&
    !baselineFlow.suggestion &&
    Boolean(vibeProject.value)
  )
})

const plantKey = ref(0)
watch(heroMode, (entering) => {
  if (entering) plantKey.value += 1
})

const composerPlaceholder = computed(() => {
  if (!vibeProject.value) return '请先加入项目'
  if (baselineFlow.streaming) return '正在分析项目基线…'
  if (baselineFlow.suggestion) return '请先确认上方基线建议'
  if (composerMode.value === 'chat') return '询问需求状态、确认遗漏，或和 Vibe 简单讨论...'
  if (isProjectEmpty.value) return '用一段话告诉系统：这个系统在做什么、关键能力是什么'
  if (hasBaselineWithoutFacts.value) return '继续录入具体需求，或先点击“重建项目基线”重新确认项目认知'
  return '描述新增、修改或需要澄清的需求...'
})

const groupedFacts = computed(() => {
  const groups = new Map<string, VibeFact[]>()
  facts.value.forEach((fact) => {
    const type = fact.fact_type || 'concept'
    if (!groups.has(type)) groups.set(type, [])
    groups.get(type)!.push(fact)
  })
  return Array.from(groups.entries()).map(([type, items]) => ({
    type,
    label: factTypeLabel(type),
    items: items.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hans-CN')),
  }))
})

const selectedFact = computed(() => facts.value.find(fact => fact.id === selectedFactId.value) || null)
const displayRelations = computed(() => relations.value.filter((relation) => {
  return Boolean(
    relation.relation_type
    || relation.description
    || relation.source_fact_id
    || relation.target_fact_id,
  )
}))
const displayImpacts = computed(() => impacts.value.filter((impact) => {
  return Boolean(
    impact.impact_type
    || impact.risk
    || normalizeArray(impact.test_focus).length
    || normalizeArray(impact.affected_fact_ids).length
    || normalizeArray(impact.affected_relation_ids).length
    || normalizeArray(impact.affected_interface_bindings).length,
  )
}))
const impactNavCount = computed(() => displayRelations.value.length + displayImpacts.value.length)

onMounted(() => {
  document.documentElement.classList.add('vk-transparent-window')
  document.body.classList.add('vk-transparent-window')
  document.addEventListener('pointerdown', handleGlobalOutsidePointerDown)
  bootstrap()
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('vk-transparent-window')
  document.body.classList.remove('vk-transparent-window')
  document.removeEventListener('pointerdown', handleGlobalOutsidePointerDown)
})

async function bootstrap() {
  booting.value = true
  try {
    const response: any = await ApiGetJoinProjects({})
    projects.value = Array.isArray(response) ? response : (response?.results || [])
    if (projects.value.length === 0) return

    const savedProjectId = await readStore('vibe_project_source_project_id')
    const target = projects.value.find(project => String(project.id) === String(savedProjectId)) || projects.value[0]
    selectedProjectId.value = String(target.id)
    await loadVibeProjectFor(target)
  } catch (error: any) {
    showToast(error?.message || '打开 Vibe 知识库失败', 'error')
  } finally {
    booting.value = false
  }
}

async function chooseProject(project: any) {
  projectMenuOpen.value = false
  if (!project || String(project.id) === selectedProjectId.value) return
  selectedProjectId.value = String(project.id)
  await loadVibeProjectFor(project)
}

async function loadVibeProjectFor(project: any) {
  loadingData.value = true
  try {
    await writeStore('vibe_project_source_project_id', project.id)
    vibeProject.value = await getOrInitVibeProject(project)
    await loadProjectState()
  } catch (error: any) {
    showToast(error?.message || '读取 Vibe 项目失败', 'error')
  } finally {
    loadingData.value = false
  }
}

async function getOrInitVibeProject(project: any) {
  try {
    return await getVibeProjectByAsyncProject(Number(project.id))
  } catch {
    return await initVibeProject(Number(project.id), {
      name: project.name || project.project_name || `项目 ${project.id}`,
      description: project.description || '',
      baseline: {},
    })
  }
}

async function loadProjectState() {
  if (!vibeProject.value) return
  sessions.value = normalizeArray<VibeSession>(await listVibeSessions(vibeProject.value.id))
  activePanel.value = 'entry'
  patchDrawerOpen.value = false
  if (sessions.value.length) {
    activeSession.value = sessions.value[0]
    isDraftSession.value = false
    draftTitle.value = ''
  } else {
    activeSession.value = null
    isDraftSession.value = false
    draftTitle.value = ''
  }
  events.value = []
  timeline.value = []
  await Promise.all([loadEvents(), refreshProjectState()])
}

async function loadEvents() {
  if (!activeSession.value) {
    events.value = []
    timeline.value = []
    return
  }
  events.value = normalizeArray<VibeEvent>(await listVibeEvents(activeSession.value.id))
  timeline.value = events.value.map(eventToTimeline)
  await scrollTimelineBottom()
}

async function refreshSessionList() {
  if (!vibeProject.value) return
  const latest = normalizeArray<VibeSession>(await listVibeSessions(vibeProject.value.id))
  sessions.value = latest
  if (activeSession.value) {
    const match = latest.find(item => item.id === activeSession.value?.id)
    if (match) activeSession.value = match
  }
}

async function refreshProjectState() {
  if (!vibeProject.value) return
  loadingData.value = true
  try {
    const [patchData, factData, relationData, impactData] = await Promise.all([
      listVibePatches(vibeProject.value.id, 'pending'),
      listVibeFacts(vibeProject.value.id, { status: 'active' }),
      listVibeRelations(vibeProject.value.id),
      listVibeImpactRecords(vibeProject.value.id),
    ])
    patches.value = normalizeArray<VibePatch>(patchData)
    facts.value = normalizeArray<VibeFact>(factData)
    relations.value = normalizeArray<VibeRelation>(relationData)
    impacts.value = normalizeArray<VibeImpactRecord>(impactData)
    if (!selectedFactId.value && facts.value[0]) selectedFactId.value = facts.value[0].id
  } catch (error: any) {
    showToast(error?.message || '刷新数据失败', 'error')
  } finally {
    loadingData.value = false
  }
}

function createNewSession() {
  if (!vibeProject.value || isDraftSession.value) return
  activePanel.value = 'entry'
  patchDrawerOpen.value = false
  activeSession.value = null
  isDraftSession.value = true
  draftTitle.value = ''
  events.value = []
  timeline.value = []
  draft.value = ''
  composerMenuOpen.value = false
  resizeDraftInput()
}

function selectDraft() {
  if (!isDraftSession.value) return
  activePanel.value = 'entry'
  patchDrawerOpen.value = false
}

async function selectSession(session: VibeSession) {
  if (!session) return
  if (activeSession.value?.id === session.id && !isDraftSession.value && activePanel.value === 'entry') return
  activePanel.value = 'entry'
  patchDrawerOpen.value = false
  isDraftSession.value = false
  draftTitle.value = ''
  activeSession.value = session
  events.value = []
  timeline.value = []
  draft.value = ''
  composerMenuOpen.value = false
  resizeDraftInput()
  await loadEvents()
}

async function deleteSession(session: VibeSession) {
  if (!session || deletingSessionId.value) return
  if (!window.confirm(`确认隐藏对话「${session.title || '未命名对话'}」？正式知识不会受影响。`)) return
  deletingSessionId.value = session.id
  try {
    await deleteVibeSession(session.id)
    const remaining = sessions.value.filter(item => item.id !== session.id)
    sessions.value = remaining
    if (activeSession.value?.id === session.id) {
      if (remaining.length) {
        await selectSession(remaining[0])
      } else {
        activeSession.value = null
        isDraftSession.value = false
        draftTitle.value = ''
        events.value = []
        timeline.value = []
      }
    }
  } catch (error: any) {
    showToast(error?.message || '删除对话失败', 'error')
  } finally {
    deletingSessionId.value = null
  }
}

async function ensureSessionForSend(content: string): Promise<VibeSession | null> {
  if (activeSession.value && !isDraftSession.value) return activeSession.value
  if (!vibeProject.value) return null
  const title = composerMode.value === 'entry' && isProjectEmpty.value ? '项目基线建模' : buildSessionTitle(content)
  try {
    const session = await createVibeSession(vibeProject.value.id, { title })
    sessions.value = [session, ...sessions.value]
    activeSession.value = session
    isDraftSession.value = false
    draftTitle.value = ''
    return session
  } catch (error: any) {
    showToast(error?.message || '新建对话失败', 'error')
    return null
  }
}

function buildSessionTitle(content: string) {
  const trimmed = (content || '').trim().replace(/\s+/g, ' ')
  if (!trimmed) return '新的需求对话'
  return trimmed.length > 24 ? `${trimmed.slice(0, 24)}…` : trimmed
}

function useGuidePrompt(kind: 'system' | 'capability' | 'paste') {
  composerMode.value = 'entry'
  composerMenuOpen.value = false
  const presets: Record<string, string> = {
    system: '这是一个 ',
    capability: '',
    paste: '',
  }
  draft.value = presets[kind] || ''
  nextTick(() => {
    draftInputRef.value?.focus()
    resizeDraftInput()
  })
}

async function sendDemand() {
  if (!canSend.value) return
  const content = draft.value.trim()
  const mode = composerMode.value
  draft.value = ''
  composerMenuOpen.value = false
  resizeDraftInput()

  if (mode === 'entry' && isProjectEmpty.value && !baselineFlow.suggestion) {
    await runBaselineFlow(content)
    return
  }

  const session = await ensureSessionForSend(content)
  if (!session) return

  streaming.value = true
  if (mode === 'entry') {
    inspectorPanel.value = 'patches'
    patchDrawerOpen.value = true
  }
  appendTimeline('user', '你', content)
  appendTimeline('system', mode === 'entry' ? '处理过程' : '对话过程', '保存对话内容')

  try {
    await streamVibeEvent(session.id, {
      content,
      interaction_mode: mode,
      meta: { interaction_mode: mode },
    }, {
      onEvent: (event: any) => handleStreamEvent(event),
      onChunk: (chunk: string) => {
        if (chunk.trim()) appendTimeline('system', '模型输出', chunk.trim())
      },
      onError: (message: string) => {
        appendTimeline('error', '错误', message)
      },
      onDone: async () => {
        appendTimeline('system', '完成', mode === 'entry' ? '本次需求已整理为待确认内容' : '本次对话已保存，不会生成待确认补丁')
        await refreshSessionList()
        await refreshProjectState()
      },
    })
  } catch (error: any) {
    appendTimeline('error', '错误', error?.message || '处理失败')
    showToast(error?.message || '处理失败', 'error')
  } finally {
    streaming.value = false
    await scrollTimelineBottom()
  }
}

async function runBaselineFlow(content: string) {
  if (!vibeProject.value) return
  const session = await ensureSessionForSend(content)
  if (!session) return
  baselineFlow.streaming = true
  baselineFlow.sourceContent = content
  baselineFlow.suggestion = null
  appendTimeline('user', '你', content)
  appendTimeline('system', '基线分析', '正在解析项目基础认知…')
  try {
    await streamVibeBaseline(vibeProject.value.id, { content }, {
      onEvent: (event: any) => {
        const type = event?.type || event?.event
        if (type === 'result') {
          const suggestion = event?.result?.baseline_suggestion || event?.result || null
          if (suggestion) baselineFlow.suggestion = suggestion
          appendTimeline('assistant', '基线建议', withLlmMeta('已生成项目基线建议，请在下方确认', event?.result?.llm))
          return
        }
        if (type === 'done') return
        if (event?.error || type === 'error') {
          appendTimeline('error', '错误', event?.detail || event?.error || '基线分析失败')
          return
        }
        const title = event?.title || type || '基线分析'
        const text = event?.message || event?.detail || event?.content || ''
        if (text) appendTimeline('system', title, String(text))
      },
      onError: (message: string) => {
        appendTimeline('error', '错误', message)
      },
      onDone: () => {
        if (!baselineFlow.suggestion) {
          appendTimeline('system', '基线分析', '未生成建议，请补充更多上下文后重试')
        }
      },
    })
  } catch (error: any) {
    appendTimeline('error', '错误', error?.message || '基线分析失败')
    showToast(error?.message || '基线分析失败', 'error')
  } finally {
    baselineFlow.streaming = false
    await scrollTimelineBottom()
  }
}

async function confirmBaseline() {
  if (!vibeProject.value || !baselineFlow.suggestion || baselineFlow.confirming) return
  baselineFlow.confirming = true
  try {
    const updated = await updateVibeProject(vibeProject.value.id, {
      baseline: baselineFlow.suggestion,
    })
    vibeProject.value = updated
    const sourceContent = baselineFlow.sourceContent
    baselineFlow.suggestion = null
    baselineFlow.sourceContent = ''
    appendTimeline('system', '基线已写入', '项目基线已保存，接下来录入更具体的需求即可')

    const session = await ensureSessionForSend(sourceContent || '项目基线建模')
    if (session && sourceContent) {
      streaming.value = true
      try {
        await streamVibeEvent(session.id, { content: sourceContent, meta: { purpose: 'project_baseline_followup' } }, {
          onEvent: (event: any) => handleStreamEvent(event),
          onChunk: (chunk: string) => {
            if (chunk.trim()) appendTimeline('system', '模型输出', chunk.trim())
          },
          onError: (message: string) => {
            appendTimeline('error', '错误', message)
          },
          onDone: async () => {
            appendTimeline('system', '完成', '已整理首批待确认补丁')
            await refreshSessionList()
            await refreshProjectState()
          },
        })
      } finally {
        streaming.value = false
      }
    }
    await refreshProjectState()
  } catch (error: any) {
    showToast(error?.message || '写入基线失败', 'error')
  } finally {
    baselineFlow.confirming = false
    await scrollTimelineBottom()
  }
}

function discardBaseline() {
  if (baselineFlow.confirming) return
  baselineFlow.suggestion = null
  baselineFlow.sourceContent = ''
  appendTimeline('system', '已放弃基线建议', '可以重新描述系统再来一次')
}

function startEditBaseline() {
  const baseline = currentBaseline.value || {}
  baselineEdit.system_name = String(baseline.system_name || '')
  baselineEdit.goal = String(baseline.goal || '')
  baselineEdit.summary = String(baseline.summary || '')
  baselineEdit.editing = true
}

function cancelEditBaseline() {
  if (baselineEdit.saving) return
  baselineEdit.editing = false
  clearBaselineEdit()
}

async function saveBaselineEdit() {
  if (!vibeProject.value || baselineEdit.saving) return
  const parsed: Record<string, any> = {
    ...currentBaseline.value,
    system_name: baselineEdit.system_name.trim(),
    goal: baselineEdit.goal.trim(),
    summary: baselineEdit.summary.trim(),
  }
  baselineEdit.saving = true
  try {
    const updated = await updateVibeProject(vibeProject.value.id, { baseline: parsed })
    vibeProject.value = updated
    baselineEdit.editing = false
    clearBaselineEdit()
    showToast('项目基线已保存', 'success')
  } catch (error: any) {
    showToast(error?.message || '保存项目基线失败', 'error')
  } finally {
    baselineEdit.saving = false
  }
}

async function resetProjectBaseline() {
  if (!vibeProject.value || baselineFlow.confirming || baselineFlow.streaming || streaming.value) return
  if (facts.value.length > 0) {
    showToast('当前项目已有正式事实，暂不支持直接重建基线', 'warning')
    return
  }
  if (!window.confirm('确认清空当前项目基线？清空后，下一次录入会重新进入基线确认；正式事实不会被删除。')) return
  try {
    const updated = await updateVibeProject(vibeProject.value.id, { baseline: {} })
    vibeProject.value = updated
    baselineEdit.editing = false
    clearBaselineEdit()
    baselineFlow.suggestion = null
    baselineFlow.sourceContent = ''
    appendTimeline('system', '项目基线已重置', '下一次录入会重新进入基线确认')
    showToast('项目基线已重置', 'success')
  } catch (error: any) {
    showToast(error?.message || '重置项目基线失败', 'error')
  }
}

function patchSessionLabel(patch: VibePatch): string {
  if (!patch?.session_id) return ''
  const match = sessions.value.find(item => item.id === patch.session_id)
  return match?.title || ''
}

function handleStreamEvent(event: any) {
  const type = event?.type || event?.event || event?.stage
  if (type === 'event_saved') {
    appendTimeline('system', event?.mode === 'entry' ? '需求事件' : '对话事件', event?.mode === 'entry' ? '已保存原始输入' : '已保存对话输入')
    return
  }
  if (type === 'chat_saved') {
    appendTimeline('assistant', '对话模式', withLlmMeta(event?.message || '当前为对话模式，不生成待确认补丁', event?.llm))
    return
  }
  if (type === 'patches_generated') {
    const count = Array.isArray(event.patches) ? event.patches.length : (event.count ?? 0)
    appendTimeline('assistant', '待确认补丁', withLlmMeta(`生成 ${count} 条待确认补丁`, event?.llm))
    return
  }
  if (type === 'question') {
    appendTimeline('assistant', '需要补充', stringifyBrief(event.question || event))
    return
  }
  if (type === 'done') {
    return
  }
  if (event?.error) {
    appendTimeline('error', '错误', String(event.error))
    return
  }
  const title = event?.title || event?.label || event?.stage || '处理过程'
  const content = event?.message || event?.content || event?.detail || stringifyBrief(event)
  if (content) appendTimeline('system', title, content)
}

function clearBaselineEdit() {
  baselineEdit.system_name = ''
  baselineEdit.goal = ''
  baselineEdit.summary = ''
}

function withLlmMeta(content: string, llm?: any) {
  const lines = formatLlmMetaLines(llm)
  if (!lines.length) return content
  return `${content}\n${lines.join('\n')}`
}

function formatLlmMetaLines(llm?: any): string[] {
  if (!llm || typeof llm !== 'object') return []
  const rows: Array<{ label: string; meta: any }> = []
  const pushMeta = (label: string, meta: any) => {
    if (meta && typeof meta === 'object' && meta.model) rows.push({ label, meta })
  }
  pushMeta('LLM', llm)
  pushMeta('需求理解', llm.understand_meta)
  pushMeta('补丁生成', llm.patch_meta)
  pushMeta('问题理解', llm.query_understand_meta)
  pushMeta('召回满足度', llm.sufficiency_meta)
  pushMeta('事实摘要', llm.fact_summary_meta)
  pushMeta('项目摘要', llm.project_summary_meta)
  pushMeta('系统摘要', llm.system_summary_meta)
  if (llm.used_fallback && !rows.length) {
    return [`模型返回不可用，已使用兜底结果${llm.error ? `：${llm.error}` : ''}`]
  }
  const lines = rows.map(({ label, meta }) => {
    const bits = [`${label}：${meta.model}`]
    if (meta.use_case) bits.push(`场景：${modelUseCaseLabel(meta.use_case)}`)
    if (meta.provider_name && meta.provider_name !== 'env') bits.push(`Provider：${meta.provider_name}`)
    if (meta.elapsed_ms != null) bits.push(`耗时：${meta.elapsed_ms}ms`)
    if (meta.used_fallback) bits.push('已兜底')
    return bits.join(' · ')
  })
  if (llm.used_fallback) {
    lines.push(`模型返回不可用，已使用兜底结果${llm.error ? `：${llm.error}` : ''}`)
  }
  return lines
}

function modelUseCaseLabel(useCase?: string) {
  const labels: Record<string, string> = {
    vibe_project_baseline: '项目基线生成',
    vibe_event_understand: '需求输入理解',
    vibe_patch_generate: '待确认补丁生成',
    vibe_patch_impact: '变更影响分析',
    vibe_fact_summary: '事实摘要生成',
    vibe_project_summary: '项目摘要生成',
    vibe_system_summary: '跨项目系统摘要生成',
    vibe_query_understand: '召回问题理解',
    vibe_cross_project_retrieve: '跨知识库候选选择',
    vibe_fact_retrieve: '事实召回判断',
    vibe_relation_expand: '关系扩展判断',
    vibe_retrieval_sufficiency: '召回满足度判断',
    vibe_answer_grounding: '回答 Grounding',
    vibe_question_generate: '追问生成',
    vibe_state_render: '状态渲染',
    vibe_test_suggestion: '测试建议生成',
  }
  return labels[useCase || ''] || useCase || ''
}

function toggleComposerMenu() {
  composerMenuOpen.value = !composerMenuOpen.value
}

function handleGlobalOutsidePointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement | null
  if (composerMenuOpen.value && !target?.closest('.composer-menu-wrap')) {
    composerMenuOpen.value = false
  }
  if (projectMenuOpen.value && !target?.closest('.project-select')) {
    projectMenuOpen.value = false
  }
}

function setComposerMode(mode: ComposerMode) {
  composerMode.value = mode
  composerMenuOpen.value = false
  nextTick(() => draftInputRef.value?.focus())
}

async function confirmPatch(patch: VibePatch) {
  if (isPatchBusy(patch)) return
  confirmingPatchId.value = patch.id
  try {
    await confirmVibePatch(patch.id)
    appendTimeline('system', '补丁确认', `已确认：${patch.title || patchTypeLabel(patch.patch_type)}`)
    await refreshProjectState()
  } catch (error: any) {
    showToast(error?.message || '确认补丁失败', 'error')
  } finally {
    confirmingPatchId.value = null
  }
}

async function ignorePatch(patch: VibePatch) {
  if (isPatchBusy(patch)) return
  ignoringPatchId.value = patch.id
  try {
    await ignoreVibePatch(patch.id)
    appendTimeline('system', '补丁忽略', `已忽略：${patch.title || patchTypeLabel(patch.patch_type)}`)
    await refreshProjectState()
  } catch (error: any) {
    showToast(error?.message || '忽略补丁失败', 'error')
  } finally {
    ignoringPatchId.value = null
  }
}

function openEditPatch(patch: VibePatch) {
  editDialog.visible = true
  editDialog.patch = patch
  editDialog.content = stringifyPretty(patch.new_value || {})
}

function closeEditPatch() {
  if (editDialog.saving) return
  editDialog.visible = false
  editDialog.patch = null
  editDialog.content = ''
}

async function confirmEditedPatch() {
  if (!editDialog.patch || editDialog.saving) return
  editDialog.saving = true
  try {
    let newValue: Record<string, any>
    try {
      newValue = JSON.parse(editDialog.content)
    } catch {
      newValue = { content: editDialog.content }
    }
    await confirmVibePatch(editDialog.patch.id, { new_value: newValue })
    appendTimeline('system', '补丁确认', `已编辑并确认：${editDialog.patch.title || patchTypeLabel(editDialog.patch.patch_type)}`)
    closeEditPatch()
    await refreshProjectState()
  } catch (error: any) {
    showToast(error?.message || '编辑确认失败', 'error')
  } finally {
    editDialog.saving = false
  }
}

function selectFact(fact: VibeFact) {
  selectedFactId.value = fact.id
  inspectorPanel.value = 'facts'
  patchDrawerOpen.value = true
}

async function deprecateSelectedFact() {
  if (!vibeProject.value || !selectedFact.value) return
  const fact = selectedFact.value
  const ok = window.confirm(`确认强制删除业务事实「${fact.name || '未命名事实'}」？\n\n这是临时物理删除，会同步删除它的事实摘要、接口绑定和相关事实关系，并从影响记录里移除这个事实引用。`)
  if (!ok) return
  deletingFactId.value = fact.id
  try {
    await forceDeleteVibeFact(vibeProject.value.id, fact.id)
    selectedFactId.value = null
    await refreshProjectState()
    showToast('业务事实已强制删除，可以重新录入生成', 'success')
  } catch (error: any) {
    showToast(error?.message || '删除业务事实失败', 'error')
  } finally {
    deletingFactId.value = null
  }
}

async function deleteRelationRecord(relation: VibeRelation) {
  if (!vibeProject.value) return
  const ok = window.confirm(`确认强制删除这条关系？\n\n${relationFactName(relation.source_fact_id)} → ${relationFactName(relation.target_fact_id)}`)
  if (!ok) return
  deletingRelationId.value = relation.id
  try {
    await forceDeleteVibeRelation(vibeProject.value.id, relation.id)
    await refreshProjectState()
    showToast('关系已强制删除', 'success')
  } catch (error: any) {
    showToast(error?.message || '删除关系失败', 'error')
  } finally {
    deletingRelationId.value = null
  }
}

async function deleteImpactRecord(impact: VibeImpactRecord) {
  if (!vibeProject.value) return
  const ok = window.confirm(`确认强制删除这条影响记录？\n\n${impact.impact_type || '影响记录'}`)
  if (!ok) return
  deletingImpactId.value = impact.id
  try {
    await forceDeleteVibeImpactRecord(vibeProject.value.id, impact.id)
    await refreshProjectState()
    showToast('影响记录已强制删除', 'success')
  } catch (error: any) {
    showToast(error?.message || '删除影响记录失败', 'error')
  } finally {
    deletingImpactId.value = null
  }
}

function selectPanel(panel: PanelKey) {
  if (panel === 'entry') {
    activePanel.value = 'entry'
    patchDrawerOpen.value = false
    return
  }
  if (activePanel.value === 'entry' && patchDrawerOpen.value) {
    inspectorPanel.value = panel
    return
  }
  activePanel.value = panel
  patchDrawerOpen.value = false
}

function togglePatchDrawer() {
  if (patchDrawerOpen.value) {
    patchDrawerOpen.value = false
    return
  }
  if (activePanel.value !== 'entry') {
    inspectorPanel.value = activePanel.value
  }
  patchDrawerOpen.value = true
}

function openInspectorInMain() {
  activePanel.value = inspectorPanel.value
  patchDrawerOpen.value = false
}

function goWorkbench() {
  router.push({ name: 'vibeWorkbench', query: route.query })
}

function eventToTimeline(event: VibeEvent): TimelineEntry {
  const role = event.role === 'user' ? 'user' : event.role === 'assistant' ? 'assistant' : 'system'
  return {
    id: event.id,
    role,
    title: role === 'user' ? '你' : role === 'assistant' ? '系统整理' : '记录',
    content: event.content || stringifyBrief(event.meta || {}),
    created_at: event.created_at,
  }
}

function appendTimeline(role: TimelineEntry['role'], title: string, content: string) {
  timeline.value.push({ id: makeId(), role, title, content, created_at: new Date().toISOString() })
  scrollTimelineBottom()
}

async function scrollTimelineBottom() {
  await nextTick()
  const el = timelineRef.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
}

async function resizeDraftInput() {
  await nextTick()
  const el = draftInputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 156)}px`
}

function isPatchBusy(patch: VibePatch) {
  return confirmingPatchId.value === patch.id || ignoringPatchId.value === patch.id
}

function patchTypeLabel(type?: string) {
  return patchTypeMap[type || ''] || type || '补丁'
}

function factTypeLabel(type?: string) {
  return factTypeMap[type || ''] || type || '其他事实'
}

function relationFactName(factId?: string) {
  return facts.value.find(fact => fact.id === factId)?.name || factId || '未知事实'
}

function impactAffectedFactNames(impact: VibeImpactRecord) {
  const names = normalizeArray<string>(impact.affected_fact_ids)
    .map(id => relationFactName(id))
    .filter(Boolean)
  return names.slice(0, 4).join('、')
}

function patchSummary(patch: VibePatch) {
  const value: any = patch.new_value || {}
  return value.summary || value.name || value.content || value.definition || value.description || ''
}

function patchRisk(patch: VibePatch) {
  const impact: any = patch.impact || {}
  return impact.risk || impact.reason || patch.questions?.[0]?.question || ''
}

function stringifyBrief(value: any) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function namedItemTitle(value: any) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return String(value.name || value.title || value.label || value.system_name || '未命名')
}

function namedItemDescription(value: any) {
  if (!value || typeof value !== 'object') return ''
  return String(value.description || value.summary || value.reason || value.content || '').trim()
}

function stringifyPretty(value: any) {
  if (!value || typeof value !== 'object') return String(value || '')
  return JSON.stringify(value, null, 2)
}

function normalizeArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.results)) return value.results
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.data)) return value.data
  return []
}

function formatTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const pick = (type: string) => parts.find(part => part.type === type)?.value || ''
  return `${pick('month')}/${pick('day')} ${pick('hour')}:${pick('minute')}`
}

async function readStore(key: string) {
  try {
    if (electronAPI?.harness?.storeGet) return await electronAPI.harness.storeGet(key)
  } catch {}
  return window.localStorage.getItem(key)
}

async function writeStore(key: string, value: any) {
  try {
    if (electronAPI?.harness?.storeSet) {
      await electronAPI.harness.storeSet(key, value)
      return
    }
  } catch {}
  window.localStorage.setItem(key, String(value))
}

function showToast(title: string, type: string = 'info') {
  window.$toast?.({ title, type })
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function onResizerMouseDown(e: MouseEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startW = inspectorWidth.value
  const minW = 300
  const maxW = Math.min(720, Math.floor(window.innerWidth * 0.6))

  const onMove = (ev: MouseEvent) => {
    const delta = startX - ev.clientX
    const next = Math.max(minW, Math.min(maxW, startW + delta))
    inspectorWidth.value = next
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}
</script>


<style scoped lang="scss">
/* ============================================================
   Vibe Knowledge — Codex-style workbench
   Layout: sidebar (240) + workspace (white) + floating inspector
   ============================================================ */

.vibe-knowledge {
  --sidebar-w: 320px;
  --inspector-w: 380px;
  --inspector-gap: 12px;
  --window-radius: 12px;
  --page-bg: #f3f3f3;
  --sidebar-bg: #f3f3f3;
  --workspace-bg: #ffffff;
  --panel-bg: #ffffff;
  --border: rgba(15, 15, 15, 0.08);
  --border-strong: rgba(15, 15, 15, 0.14);
  --hairline: rgba(15, 15, 15, 0.06);
  --text-primary: #1f1f1f;
  --text-secondary: #545454;
  --text-muted: #8b8b8b;
  --accent: #18181b;
  --accent-hover: #2a2a2e;
  --danger: #dc2626;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-pop: 0 8px 24px rgba(15, 15, 15, 0.08);
  --shadow-drawer: 0 12px 36px rgba(15, 15, 15, 0.12);

  position: relative;
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  min-height: 100vh;
  background: var(--page-bg);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
}

.vibe-knowledge::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--page-bg);
  pointer-events: none;
}

.vibe-drag-region { display: none; }

/* ===== Sidebar ===== */
.sidebar {
  position: relative;
  z-index: 1;
  background: var(--sidebar-bg);
  background-clip: padding-box;
  border-right: none;
  box-shadow: none;
  padding: 7px 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100vh;
  overflow: hidden;
  -webkit-app-region: drag;

  > * { -webkit-app-region: no-drag; }
}

.sidebar-header {
  height: 24px;
  display: flex;
  align-items: center;
  padding: 0 4px 0 58px;
  -webkit-app-region: drag;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transform: translateY(1px);
  background: transparent;
  border: none;
  height: 22px;
  padding: 0 6px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  -webkit-app-region: no-drag;

  svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
    stroke-width: 1.8;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &:hover {
    background: rgba(15, 15, 15, 0.05);
    color: var(--text-primary);
  }
}

.project-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 4px;

  label {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
}

.project-select {
  position: relative;
}

.project-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 7px 10px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;

  span {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  svg {
    width: 14px;
    height: 14px;
    stroke: var(--text-muted);
    stroke-width: 1.8;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.15s;
  }

  &:hover:not(:disabled) {
    border-color: var(--border-strong);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.project-select.open .project-trigger svg {
  transform: rotate(180deg);
}

.project-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-pop);
  padding: 4px;
  z-index: 20;
  max-height: 240px;
  overflow-y: auto;

  button {
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 12.5px;
    color: var(--text-primary);
    cursor: pointer;

    &:hover {
      background: rgba(15, 15, 15, 0.05);
    }

    &.active {
      background: var(--accent);
      color: #fff;
    }
  }
}

.session-list {
  padding: 0 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-bottom: 1px solid var(--hairline);
  padding-bottom: 10px;
}

.session-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 200px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(15, 15, 15, 0.12); border-radius: 999px; }
}

.session-item-wrap {
  position: relative;
  display: flex;
  align-items: stretch;

  &:hover .session-delete,
  &:focus-within .session-delete {
    opacity: 1;
    pointer-events: auto;
  }
}

.session-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  background: transparent;
  border: none;
  text-align: left;
  padding: 7px 28px 7px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;

  .session-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.3;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .session-meta {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.3;
  }

  &:hover { background: rgba(15, 15, 15, 0.05); }
  &.active {
    background: rgba(15, 15, 15, 0.08);
  }
  &.draft {
    .session-meta { color: var(--accent); font-weight: 500; }
  }
}

.session-delete {
  position: absolute;
  right: 5px;
  top: 5px;
  width: auto;
  height: 20px;
  min-width: 20px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s, background 0.15s, color 0.15s, min-width 0.15s;

  &::after {
    content: '';
    max-width: 0;
    overflow: hidden;
    font-size: 11px;
    line-height: 1;
    white-space: nowrap;
    transition: max-width 0.15s, margin-left 0.15s;
  }

  svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
    stroke-width: 1.8;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &:hover:not(:disabled) {
    background: rgba(220, 50, 47, 0.1);
    color: var(--danger);

    &::after {
      content: '删除';
      max-width: 28px;
      margin-left: 3px;
    }
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 4px;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-section-title {
  display: block;
  padding: 0 8px 2px;
  font-size: 10.5px;
  line-height: 1.2;
  color: rgba(90, 90, 90, 0.72);
  letter-spacing: 0.02em;
  user-select: none;
}

.nav-list {

  button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: transparent;
    border: none;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    small {
      font-size: 11px;
      color: var(--text-muted);
      background: rgba(15, 15, 15, 0.06);
      padding: 1px 6px;
      border-radius: 999px;
    }

    &:hover {
      background: rgba(15, 15, 15, 0.05);
      color: var(--text-primary);
    }

    &.active {
      background: rgba(15, 15, 15, 0.08);
      color: var(--text-primary);
    }

    &.nav-item-patches {
      &.active {
        background: rgba(15, 15, 15, 0.08);
        color: var(--text-primary);
      }
    }
  }
}

.fact-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(15, 15, 15, 0.12); border-radius: 999px; }
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 4px 0;

  button {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 11px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;

    &:hover:not(:disabled) {
      background: rgba(15, 15, 15, 0.05);
      color: var(--text-primary);
    }

    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
}

.empty-small {
  font-size: 12px;
  color: var(--text-muted);
  padding: 8px;
}

.fact-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fact-group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
  padding: 2px 4px;

  small {
    color: var(--text-muted);
  }
}

.fact-group button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  background: transparent;
  border: none;
  text-align: left;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;

  span {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.3;
  }

  small {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &:hover {
    background: rgba(15, 15, 15, 0.05);
  }

  &.active {
    background: rgba(15, 15, 15, 0.08);
  }
}

/* ===== Workspace ===== */
.workspace {
  position: relative;
  z-index: 1;
  background: var(--workspace-bg);
  background-clip: padding-box;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
  border-top-left-radius: var(--window-radius);
  border-bottom-left-radius: var(--window-radius);
  transition: padding-right 0.25s ease;
}

.vibe-knowledge:not(.patch-drawer-closed) .workspace {
  padding-right: calc(var(--inspector-w) + var(--inspector-gap) * 2);
}

.workspace-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: transparent;
  padding: 4px 16px;
  min-height: 32px;
  border-bottom: 1px solid var(--hairline);
  -webkit-app-region: drag;
}

.header-copy {
  min-width: 0;
  flex: 1;

  h1 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  -webkit-app-region: no-drag;
}

.header-actions .divider {
  width: 1px;
  height: 18px;
  background: var(--border);
  margin: 0 4px;
}

/* Icon button (header) */
.icon-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;

  svg {
    width: 22px;
    height: 22px;
    stroke: currentColor;
    stroke-width: 2;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &:hover:not(:disabled) {
    background: rgba(15, 15, 15, 0.06);
    color: var(--text-primary);
  }

  &.on {
    background: var(--accent);
    color: #fff;
  }

  &.on:hover:not(:disabled) {
    background: var(--accent-hover);
    color: #fff;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.icon-btn .badge {
  position: absolute;
  top: -2px;
  right: -4px;
  min-width: 13px;
  height: 13px;
  padding: 0 3px;
  border-radius: 999px;
  background: var(--danger);
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  line-height: 13px;
  text-align: center;
  pointer-events: none;
  box-shadow: 0 0 0 1.5px var(--panel-bg);
  transform: translate(15%, 0);
}

/* Small icon button (inspector / modal) */
.icon-btn-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
    stroke-width: 1.7;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  svg.spinning {
    animation: vk-spin 1s linear infinite;
  }

  &:hover:not(:disabled) {
    background: rgba(15, 15, 15, 0.06);
    color: var(--text-primary);
  }

  &:disabled { opacity: 0.45; cursor: not-allowed; }
}

.icon-btn svg.spinning {
  animation: vk-spin 1s linear infinite;
}

@keyframes vk-spin {
  to { transform: rotate(360deg); }
}

/* ===== Center / empty states ===== */
.center-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 12.5px;

  .state-title {
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
  }
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(15, 15, 15, 0.15);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: vk-spin 0.8s linear infinite;
}

/* ===== Event shell / timeline ===== */
.event-shell {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
  overflow: hidden;
}

.event-shell.hero {
  align-items: stretch;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
}

.event-shell.panel-mode {
  background: #fff;
  overflow: auto;

  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-thumb { background: rgba(15, 15, 15, 0.12); border-radius: 999px; }
}

.workspace-panel {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fff;
}

.workspace-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--hairline);

  span {
    display: block;
    margin-bottom: 4px;
    font-size: 10.5px;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 620;
    color: var(--text-primary);
    letter-spacing: 0;
  }

  p {
    margin: 6px 0 0;
    max-width: 720px;
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--text-secondary);
  }
}

.panel-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;

  button {
    height: 30px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: #fff;
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.12s ease;

    &:hover {
      background: rgba(15, 15, 15, 0.04);
      border-color: var(--border-strong);
    }

    &:active {
      transform: translateY(1px);
    }
  }

  .danger-btn {
    border-color: rgba(220, 38, 38, 0.32);
    background: rgba(254, 242, 242, 0.86);
    color: #b91c1c;

    &:hover {
      background: #fee2e2;
      border-color: rgba(220, 38, 38, 0.5);
      color: #991b1b;
    }
  }
}

.baseline-empty {
  align-items: center;

  .primary-btn {
    margin-top: 8px;
    padding: 8px 14px;
    border: 1px solid var(--accent);
  }
}

.baseline-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  max-width: 1080px;
}

.baseline-field {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: #fff;

  &.wide {
    grid-column: 1 / -1;
  }

  > span {
    display: block;
    margin-bottom: 8px;
    font-size: 11px;
    color: var(--text-muted);
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-primary);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  li {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-primary);
  }

  small {
    color: var(--text-secondary);
    line-height: 1.45;
  }
}

.baseline-editor-card {
  max-width: 980px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: #fff;

  .editor-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;

    strong {
      font-size: 13px;
      color: var(--text-primary);
    }

    span {
      font-size: 12px;
      color: var(--text-muted);
    }
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;

    button {
      min-height: 30px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: 7px;
      background: #fff;
      font-size: 12px;
      color: var(--text-primary);
      cursor: pointer;
    }
  }
}

.baseline-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  label {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;

    &.wide {
      grid-column: 1 / -1;
    }

    span {
      font-size: 11.5px;
      color: var(--text-muted);
    }
  }

  input,
  textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fafaf9;
    color: var(--text-primary);
    font: inherit;
    font-size: 12.5px;
    line-height: 1.55;
    outline: none;
    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;

    &:focus {
      border-color: var(--border-strong);
      background: #fff;
      box-shadow: 0 0 0 3px rgba(15, 15, 15, 0.035);
    }
  }

  input {
    height: 34px;
    padding: 0 10px;
  }

  textarea {
    min-height: auto;
    resize: vertical;
    padding: 9px 10px;
  }
}

.baseline-suggestion-note {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid rgba(15, 15, 15, 0.08);
  border-radius: 8px;
  background: #fafaf9;

  strong {
    font-size: 12.5px;
    font-weight: 560;
    color: var(--text-primary);
  }

  span {
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-secondary);
  }
}

.main-card-list {
  display: grid;
  grid-template-columns: minmax(0, 980px);
  gap: 12px;
}

.main-card {
  width: 100%;
  box-sizing: border-box;
}

.fact-overview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.fact-overview-group {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: #fff;

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    h3 {
      margin: 0;
      font-size: 13px;
      font-weight: 620;
      color: var(--text-primary);
    }

    small {
      color: var(--text-muted);
      font-size: 11px;
    }
  }

  button {
    width: 100%;
    text-align: left;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    padding: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    transition: background 0.15s ease;

    &:hover {
      background: rgba(15, 15, 15, 0.045);
    }

    span {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    strong {
      font-size: 12.5px;
      color: var(--text-primary);
      font-weight: 560;
    }

    em {
      font-style: normal;
      font-size: 11.5px;
      color: var(--text-secondary);
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    small {
      flex-shrink: 0;
      font-size: 11px;
      color: var(--text-muted);
    }
  }
}

.retrieval-main-body {
  max-width: 980px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.retrieval-composer.inline {
  padding: 0;
  background: transparent;
}

.main-log {
  max-height: none;
}

.hero-stack {
  margin: auto;
  width: 100%;
  max-width: 1013px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.hero-plant {
  width: 100%;
  pointer-events: none;
  flex-shrink: 0;
}

.hero-guide {
  margin: 0;
  width: 100%;
}

.hero-welcome {
  margin: 0;
}

.hero-composer {
  width: 100%;
  padding: 0;
}

.timeline {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;

  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-thumb { background: rgba(15, 15, 15, 0.12); border-radius: 999px; }
}

.welcome {
  max-width: 560px;
  margin: 48px auto;
  text-align: center;

  p {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 500;
    color: var(--text-primary);
  }
  span {
    font-size: 12.5px;
    color: var(--text-muted);
  }
}

.baseline-guide {
  width: 100%;
  max-width: 760px;
  margin: 32px auto 0;
  background: #fafaf8;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;

  > header {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .guide-tag {
      align-self: flex-start;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #fff;
      background: var(--accent);
      padding: 2px 8px;
      border-radius: 999px;

      &.neutral {
        color: var(--text-secondary);
        background: #f0f0ee;
      }
    }
    h2 { margin: 0; font-size: 18px; font-weight: 600; color: var(--text-primary); }
    p { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.55; }
  }
}

.guide-actions {
  display: flex;
  justify-content: flex-start;
  gap: 10px;

  .primary-btn {
    min-height: 34px;
    padding: 7px 14px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 560;
    box-shadow:
      0 1px 1px rgba(15, 15, 15, 0.08),
      0 6px 16px rgba(15, 15, 15, 0.08);

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow:
        0 1px 1px rgba(15, 15, 15, 0.12),
        0 9px 20px rgba(15, 15, 15, 0.12);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow:
        0 1px 1px rgba(15, 15, 15, 0.1),
        0 3px 10px rgba(15, 15, 15, 0.1);
    }
  }
}

.guide-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.guide-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;

  strong { font-size: 13.5px; color: var(--text-primary); font-weight: 600; }
  span { font-size: 12px; color: var(--text-muted); line-height: 1.5; }

  &:hover {
    border-color: var(--border-strong);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(15, 15, 15, 0.06);
  }
}

.baseline-confirm {
  width: 100%;
  max-width: 760px;
  margin: 16px auto 24px;
  background: #fff;
  border: 1px solid var(--accent);
  border-radius: 12px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 6px 20px rgba(15, 15, 15, 0.06);

  > header {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .guide-tag {
      align-self: flex-start;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #fff;
      background: var(--accent);
      padding: 2px 8px;
      border-radius: 999px;
    }
    h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); }
    p { margin: 0; font-size: 12.5px; color: var(--text-muted); }
  }

  dl {
    display: grid;
    grid-template-columns: 92px 1fr;
    gap: 10px 16px;
    margin: 0;
    font-size: 13px;

    dt {
      color: var(--text-muted);
      font-weight: 500;
    }

    dd {
      margin: 0;
      color: var(--text-primary);
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;

      ul {
        margin: 0;
        padding-left: 18px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .baseline-named-list {
        padding-left: 0;
        list-style: none;
        gap: 8px;

        li {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px 10px;
          border: 1px solid rgba(15, 15, 15, 0.07);
          border-radius: 8px;
          background: rgba(15, 15, 15, 0.025);
        }

        strong {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        span {
          font-size: 12.5px;
          color: var(--text-muted);
          line-height: 1.45;
        }
      }

      .chip {
        display: inline-block;
        margin: 0 6px 4px 0;
        padding: 2px 8px;
        font-size: 12px;
        background: rgba(15, 15, 15, 0.05);
        color: var(--text-secondary);
        border-radius: 999px;
      }
    }
  }

  > footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;

    button {
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: #fff;
      font-size: 13px;
      cursor: pointer;
      color: var(--text-primary);
      transition: background 0.15s, border-color 0.15s;

      &:hover:not(:disabled) { background: rgba(15, 15, 15, 0.04); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }

      &.primary-btn {
        background: var(--accent);
        border-color: var(--accent);
        color: #fff;
        &:hover:not(:disabled) { background: var(--accent-hover); }
      }
    }
  }
}

.patch-source {
  display: inline-block;
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--text-muted);
  background: rgba(15, 15, 15, 0.05);
  padding: 1px 8px;
  border-radius: 999px;
}

.timeline-item {
  width: 100%;
  max-width: 760px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-item.user {
  align-self: flex-end;
  align-items: flex-end;
  max-width: 620px;
}

.item-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 11px;
  color: var(--text-muted);

  time { color: var(--text-muted); }
}

.item-body {
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.6;

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
  }
}

.timeline-item.user .item-body {
  background: var(--accent);
  color: #fff;
  border-radius: 14px 14px 4px 14px;
}

.timeline-item.assistant .item-body,
.timeline-item.system .item-body {
  background: #fafaf9;
  color: var(--text-primary);
  border: 1px solid var(--hairline);
}

/* ===== Composer ===== */
.composer {
  flex-shrink: 0;
  padding: 0 24px 20px;
  background: var(--panel-bg);
}

.composer-shell {
  margin: 0 auto 0 0;
  max-width: 1013px;
  background: #fff;
  border: 1px solid rgba(15, 15, 15, 0.1);
  border-radius: 16px;
  padding: 12px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow:
    0 1px 2px rgba(15, 15, 15, 0.04),
    0 6px 20px rgba(15, 15, 15, 0.06);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;

  &:hover {
    border-color: rgba(15, 15, 15, 0.18);
    box-shadow:
      0 1px 2px rgba(15, 15, 15, 0.05),
      0 10px 28px rgba(15, 15, 15, 0.08);
  }

  &:focus-within {
    border-color: rgba(15, 15, 15, 0.28);
    box-shadow:
      0 1px 2px rgba(15, 15, 15, 0.06),
      0 12px 32px rgba(15, 15, 15, 0.1);
  }

  textarea {
    width: 100%;
    border: none;
    outline: none;
    resize: none;
    background: transparent;
    font-size: 13.5px;
    font-weight: 500;
    line-height: 1.55;
    letter-spacing: 0.01em;
    color: var(--text-primary);
    font-family: inherit;
    min-height: 24px;
    max-height: 220px;
    padding: 4px 6px 0;
    overflow-y: auto;
    caret-color: var(--accent);

    &::placeholder {
      color: rgba(15, 15, 15, 0.38);
      font-weight: 400;
    }

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-thumb { background: rgba(15, 15, 15, 0.12); border-radius: 999px; }
  }
}

.composer-actions {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.composer-mode-chip {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 -2px 4px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(15, 15, 15, 0.06);
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.mode-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #111;
  box-shadow: 0 0 0 3px rgba(15, 15, 15, 0.08);
}

.composer-menu-wrap {
  position: relative;
  display: inline-flex;
}

.composer-plus {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.1s ease;

  svg {
    width: 15px;
    height: 15px;
    stroke: currentColor;
    stroke-width: 2;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &:hover,
  &.active {
    background: rgba(15, 15, 15, 0.06);
    border-color: rgba(15, 15, 15, 0.08);
    color: var(--text-primary);
  }

  &:active {
    transform: scale(0.96);
  }
}

.composer-popover {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  width: 236px;
  padding: 6px;
  background: #fff;
  border: 1px solid rgba(15, 15, 15, 0.1);
  border-radius: 12px;
  box-shadow: 0 18px 48px rgba(15, 15, 15, 0.14);
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 3px;

  button {
    width: 100%;
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 8px 9px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-primary);
    text-align: left;
    cursor: pointer;
    transition: background 0.14s ease, color 0.14s ease;

    svg {
      width: 16px;
      height: 16px;
      stroke: currentColor;
      stroke-width: 1.8;
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
      color: var(--text-secondary);
    }

    span {
      min-width: 0;
      font-size: 12.5px;
      font-weight: 500;
    }

    small {
      color: var(--text-muted);
      font-size: 11px;
      white-space: nowrap;
    }

    &:hover:not(:disabled),
    &.selected {
      background: rgba(15, 15, 15, 0.06);
    }

    &.selected {
      span { font-weight: 650; }
      small { color: var(--text-primary); }
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
  }
}

.menu-separator {
  height: 1px;
  margin: 6px 4px;
  background: rgba(15, 15, 15, 0.08);
}

.send-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, opacity 0.15s;

  svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
    stroke-width: 2;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  &:active:not(:disabled) {
    transform: scale(0.94);
  }

  &:disabled {
    background: rgba(15, 15, 15, 0.2);
    cursor: not-allowed;
  }
}

.send-spinner {
  width: 12px;
  height: 12px;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: vk-spin 0.8s linear infinite;
}

/* ===== Inspector (floating drawer) ===== */
.inspector {
  position: fixed;
  top: var(--inspector-gap);
  right: var(--inspector-gap);
  bottom: var(--inspector-gap);
  width: var(--inspector-w);
  height: auto;
  background: var(--panel-bg);
  border: 1px solid var(--hairline);
  border-radius: 12px;
  box-shadow: var(--shadow-drawer);
  display: flex;
  flex-direction: column;
  z-index: 30;
  transform: translateX(0);
  transition: transform 0.25s ease, opacity 0.2s ease;
  overflow: hidden;
}

.inspector.collapsed {
  transform: translateX(calc(100% + var(--inspector-gap) + 8px));
  box-shadow: none;
  pointer-events: none;
  opacity: 0;
}

.inspector-resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 2;
  background: transparent;
  transition: background 0.15s;

  &:hover { background: rgba(15, 15, 15, 0.06); }
  &:active { background: rgba(15, 15, 15, 0.12); }
}

.inspector-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px 10px 18px;
  border-bottom: 1px solid var(--hairline);

  div:first-child {
    min-width: 0;
    flex: 1;

    p {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }
    span {
      font-size: 11px;
      color: var(--text-muted);
    }
  }
}

.inspector-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.panel-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(15, 15, 15, 0.12); border-radius: 999px; }
}

/* ===== Cards & empty states ===== */
.empty-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  text-align: center;
  background: #fafaf9;

  strong {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-primary);
  }
  span {
    font-size: 11.5px;
    color: var(--text-muted);
    line-height: 1.5;
  }
}

.patch-card,
.impact-card,
.fact-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.patch-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);

  small { color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
}

.patch-type-tag {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 21px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid rgba(15, 15, 15, 0.08);
  background: rgba(15, 15, 15, 0.045);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 560;
  line-height: 1;
}

.patch-card h3,
.fact-detail h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.patch-card p,
.impact-card p,
.fact-detail p,
.patch-summary,
.risk-line {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.impact-card .impact-meta {
  color: var(--text-muted);
  font-size: 11.5px;
}

.patch-summary {
  background: #fafaf9;
  border-radius: var(--radius-sm);
  padding: 6px 8px;
}

.risk-line {
  color: var(--danger);
  font-size: 11.5px;
}

.baseline-panel-detail {
  gap: 10px;
}

.baseline-panel-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--hairline);

  > span {
    font-size: 11px;
    color: var(--text-muted);
  }

  p {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  li {
    min-width: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--text-primary);
    word-break: break-word;

    strong {
      display: block;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-primary);
    }

    small {
      display: block;
      margin-top: 2px;
      font-size: 11.5px;
      line-height: 1.45;
      color: var(--text-muted);
    }
  }
}

.test-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11.5px;

  strong {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  span { color: var(--text-secondary); }
}

.patch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 4px;

  button {
    flex: 1;
    min-width: 0;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 5px 10px;
    font-size: 12px;
    color: var(--text-primary);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;

    &:hover:not(:disabled) {
      background: rgba(15, 15, 15, 0.04);
      border-color: var(--border-strong);
    }

    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.12s ease,
    opacity 0.15s ease;
  background: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #fff !important;

  &:hover:not(:disabled) {
    background: var(--accent-hover) !important;
    border-color: var(--accent-hover) !important;
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.danger-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid rgba(220, 38, 38, 0.32);
  border-radius: 7px;
  background: rgba(254, 242, 242, 0.86);
  color: #b91c1c;
  font-size: 12px;
  font-weight: 520;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    transform 0.12s ease;

  &:hover:not(:disabled) {
    background: #fee2e2;
    border-color: rgba(220, 38, 38, 0.5);
    color: #991b1b;
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &.large {
    min-height: 34px;
    padding: 0 14px;
  }

  &.compact {
    min-height: 26px;
    padding: 0 9px;
    font-size: 11.5px;
  }

  &.ghost {
    min-height: 24px;
    border-color: transparent;
    background: transparent;
  }
}

.fact-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.impact-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.impact-card-head > span {
  min-width: 0;
}

.detail-type {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.fact-detail pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-size: 11.5px;
  background: #fafaf9;
  border-radius: var(--radius-sm);
  padding: 8px;
  color: var(--text-primary);
  max-height: 320px;
  overflow-y: auto;
}

.impact-card span {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.relation-card { background: #fafaf9; }

/* ===== Retrieval panel (chat-like layout) ===== */
.retrieval-panel {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.retrieval-content {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 16px 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(15, 15, 15, 0.12); border-radius: 999px; }
}

.retrieval-composer {
  flex-shrink: 0;
  padding: 6px 14px 12px;
  background: var(--panel-bg);

  .composer-actions {
    justify-content: flex-end;
  }
}

.retrieval-log {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  > div {
    background: #fafaf9;
    border: 1px solid var(--hairline);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
    min-width: 0;
    overflow: hidden;
  }
  span {
    display: block;
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11.5px;
    color: var(--text-primary);
    max-width: 100%;
  }
}

/* ===== Modal ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 15, 15, 0.36);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 80;
  padding: 24px;
}

.edit-modal {
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  background: #fff;
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 60px rgba(15, 15, 15, 0.24);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--hairline);

    div {
      min-width: 0;
      p {
        margin: 0 0 2px;
        font-size: 11px;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
      }
    }
  }

  textarea {
    flex: 1;
    min-height: 220px;
    border: none;
    outline: none;
    resize: none;
    padding: 14px 16px;
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--text-primary);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--hairline);
    background: #fafaf9;

    button {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 6px 14px;
      font-size: 12.5px;
      color: var(--text-primary);
      cursor: pointer;
      transition: background 0.15s;

      &:hover:not(:disabled) { background: rgba(15, 15, 15, 0.04); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
  }
}

/* ===== Responsive ===== */
@media (max-width: 1240px) {
  .vibe-knowledge {
    --inspector-w: 320px;
  }
  .vibe-knowledge:not(.patch-drawer-closed) .workspace {
    padding-right: 0;
  }
  .inspector { box-shadow: 0 -12px 32px rgba(15, 15, 15, 0.12); }
}

@media (max-width: 960px) {
  .vibe-knowledge {
    --sidebar-w: 240px;
  }
  .timeline, .composer { padding-left: 16px; padding-right: 16px; }
  .workspace-header { padding-left: 16px; padding-right: 16px; }
}
</style>

<style lang="scss">
html.vk-transparent-window,
body.vk-transparent-window,
html.vk-transparent-window #app,
body.vk-transparent-window #app,
html.vk-transparent-window .main-router,
body.vk-transparent-window .main-router,
html.vk-transparent-window #app > div,
body.vk-transparent-window #app > div {
  background: transparent !important;
}
</style>
