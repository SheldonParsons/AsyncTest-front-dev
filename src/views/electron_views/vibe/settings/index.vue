<template>
  <main class="vibe-settings-shell">
    <div class="settings-drag" />
    <div v-if="showWinControls" class="settings-win-ctl-zone">
      <VibeWindowControls
        class="settings-win-ctl"
        :maximized="winMaximized"
        @minimize="winControl('minimize')"
        @maximize-toggle="winControl('maximizeToggle')"
        @close="winControl('close')"
      />
    </div>
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
          <button class="nav-row" type="button" :class="{ active: activeKey === 'model' }" @click="activeKey = 'model'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3"/><path d="M12 18v3"/><path d="M4.8 6.8l2.1 2.1"/><path d="M17.1 17.1l2.1 2.1"/><path d="M3 12h3"/><path d="M18 12h3"/><circle cx="12" cy="12" r="3.4"/></svg>
            模型
          </button>
        </section>

        <section v-if="canViewAdminSettings" class="nav-section">
          <h2>Admin Settings</h2>
          <button class="nav-row" type="button" :class="{ active: activeKey === 'admin-model' }" @click="activeKey = 'admin-model'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M7 12h10"/><path d="M10 17h4"/></svg>
            默认模型
          </button>
          <button class="nav-row" type="button" :class="{ active: activeKey === 'admin-scenes' }" @click="activeKey = 'admin-scenes'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></svg>
            模型场景配置
          </button>
          <button class="nav-row" type="button" :class="{ active: activeKey === 'admin-config' }" @click="activeKey = 'admin-config'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/><path d="M19 5h1a1 1 0 0 1 1 1v3"/><path d="M5 5H4a1 1 0 0 0-1 1v3"/></svg>
            配置导入/导出
          </button>
          <button v-if="canViewSystemKnowledgeAdmin" class="nav-row" type="button" :class="{ active: activeKey === 'admin-system-knowledge' }" @click="activeKey = 'admin-system-knowledge'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2"/></svg>
            系统知识
          </button>
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
          <p>@{{ currentUsername }} · <em>{{ canViewTraceAudit ? '特权用户' : '用户' }}</em></p>
        </div>
        <div class="profile-stats">
          <div><strong>{{ formatUsageNumber(usageSummary.total_tokens) }}</strong><span>累计 Token 数</span></div>
          <div><strong>{{ formatUsageNumber(usageSummary.peak_tokens) }}</strong><span>峰值 Token 数</span></div>
          <div><strong>{{ formatUsageDuration(usageSummary.max_elapsed_ms) }}</strong><span>最长任务时长</span></div>
          <div><strong>{{ formatUsageNumber(usageSummary.dialogue_turns) }}</strong><span>总对话次数</span></div>
        </div>
      </section>

      <section v-else-if="activeKey === 'model'" class="model-panel">
        <VibeModelSettings embedded />
      </section>

      <section v-else-if="activeKey === 'admin-model' && canViewTraceAudit" class="admin-model-panel">
        <template v-if="adminModelMode === 'list'">
          <div class="admin-model-head">
            <button type="button" class="admin-model-add" :disabled="adminModelLoading || adminModelSaving" @click="startNewAdminProvider">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              <span>新增默认模型</span>
            </button>
            <button type="button" class="admin-model-refresh" :disabled="adminModelLoading || adminModelSaving" @click="loadAdminModelDefaults">刷新</button>
          </div>
          <div v-if="adminModelLoading && !adminModelProviders.length" class="admin-model-state">加载中...</div>
          <div v-else-if="!adminModelProviders.length" class="admin-model-state">新增默认模型后，可选择仅自己使用或开放给其他用户。</div>
          <div v-else class="admin-model-list" aria-label="默认模型列表">
            <article
              v-for="provider in adminModelProviders"
              :key="provider.id"
              class="admin-model-row"
              :class="{ enabled: isAdminSystemDefault(provider.id) }"
              @click="startEditAdminProvider(provider)"
            >
              <img v-if="isDeepSeekProvider(provider.provider_type)" class="admin-model-logo" :src="DEEPSEEK_LOGO" alt="DeepSeek" />
              <span v-else class="admin-model-generic-logo" aria-hidden="true">AI</span>
              <span class="admin-model-main">
                <strong>{{ provider.name || 'DeepSeek' }}</strong>
                <small>{{ provider.base_url || 'https://api.deepseek.com' }}</small>
              </span>
              <span class="admin-model-badges">
                <i v-if="isAdminSystemDefault(provider.id)">系统默认</i>
                <em v-else>未启用</em>
                <em class="visibility">{{ provider.available_to_all ? '其他用户可见' : '仅自己可见' }}</em>
              </span>
              <span class="admin-model-row-actions" @click.stop>
                <button type="button" class="admin-model-icon" title="编辑模型" aria-label="编辑模型" :disabled="adminModelSaving || adminModelLoading" @click="startEditAdminProvider(provider)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button
                  type="button"
                  class="admin-model-toggle"
                  :class="{ enabled: isAdminSystemDefault(provider.id) }"
                  :disabled="adminModelSaving || adminModelLoading"
                  @click="setAdminModelEnabled(provider.id, !isAdminSystemDefault(provider.id))"
                >{{ isAdminSystemDefault(provider.id) ? '禁用' : '启用' }}</button>
              </span>
            </article>
          </div>
        </template>

        <template v-else>
          <div class="admin-model-edit-head">
            <h1>{{ adminEditingProvider?.id ? '编辑默认模型' : '新增默认模型' }}</h1>
          </div>
          <section class="admin-model-form-card">
            <div class="admin-model-provider-picker">
              <span>模型服务</span>
              <AppSelect
                class="admin-provider-select"
                :model-value="adminDraft.provider_type"
                :options="adminProviderTypeOptions"
                dropdown-fit-content
                @change="setAdminProviderType"
              >
                <template #trigger="{ label, open }">
                  <span class="admin-provider-select-trigger" :class="{ open }">
                    <span>{{ label || '选择模型服务' }}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  </span>
                </template>
              </AppSelect>
            </div>
            <div class="admin-model-form-grid">
              <label>
                <span>模型名称</span>
                <input v-model="adminDraft.name" autocomplete="off" :placeholder="isDeepSeekProvider(adminDraft.provider_type) ? '例如 DeepSeek' : '例如 Grok'" @input="clearAdminStatus" />
              </label>
              <label>
                <span>Base Url</span>
                <input v-model="adminDraft.base_url" autocomplete="off" :placeholder="isDeepSeekProvider(adminDraft.provider_type) ? DEEPSEEK_BASE_URL : 'https://api.example.com/v1'" @input="clearAdminStatus" />
              </label>
              <label class="wide">
                <span>Api Key</span>
                <input v-model="adminDraft.api_key" autocomplete="off" spellcheck="false" placeholder="请输入 Api Key" @input="clearAdminStatus" />
              </label>
              <label>
                <span>增强模型</span>
                <input v-model="adminStrongModel" autocomplete="off" placeholder="例如 grok-4" @input="clearAdminStatus" />
              </label>
              <label>
                <span>轻量模型</span>
                <input v-model="adminLightModel" autocomplete="off" placeholder="例如 grok-3-mini" @input="clearAdminStatus" />
              </label>
              <label class="wide admin-model-visibility">
                <input v-model="adminDraft.available_to_all" type="checkbox" @change="clearAdminStatus" />
                <span class="admin-model-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
                </span>
                <span class="admin-model-visibility-copy">
                  <strong>开放给其他用户</strong>
                  <small>勾选后，其他用户可在自己的会话中选择并使用这个模型。</small>
                </span>
              </label>
            </div>
            <footer class="admin-model-edit-foot">
              <div class="admin-model-left-actions">
                <button v-if="adminEditingProvider?.id" type="button" class="admin-model-danger" :disabled="adminDeleting || adminModelSaving || adminTesting" @click="deleteAdminProvider">
                  {{ adminDeleting ? '删除中' : '删除' }}
                </button>
              </div>
              <span v-if="adminStatusText" :class="['admin-model-status', { ok: adminStatusKind === 'ok', error: adminStatusKind === 'error' }]">{{ adminStatusText }}</span>
              <div class="admin-model-right-actions">
                <button type="button" class="admin-model-secondary" :disabled="adminModelSaving || adminDeleting || adminTesting" @click="cancelAdminEdit">取消</button>
                <button type="button" class="admin-model-secondary" :disabled="adminTesting || adminModelSaving || adminDeleting" @click="testAdminProvider">{{ adminTesting ? '测试中' : '测试连接' }}</button>
                <button type="button" class="admin-model-primary" :disabled="adminModelSaving || adminDeleting" @click="saveAdminProvider">{{ adminModelSaving ? '保存中' : '保存' }}</button>
              </div>
            </footer>
          </section>
        </template>
      </section>

      <section v-else-if="activeKey === 'admin-scenes' && canViewTraceAudit" class="admin-scenes-panel">
        <div class="admin-scenes-head">
          <div>
            <strong>模型场景配置</strong>
            <span>每个场景只选择使用增强模型或轻量模型；具体模型名称来自当前会话选择的模型配置。</span>
          </div>
          <button type="button" :disabled="adminSceneLoading || adminSceneSaving" @click="saveAdminScenes">{{ adminSceneSaving ? '保存中' : '保存' }}</button>
        </div>
        <div v-if="adminSceneLoading && !adminScenes.length" class="admin-model-state">加载中...</div>
        <div v-else class="admin-scenes-list" aria-label="模型场景配置列表">
          <article v-for="scene in adminScenes" :key="scene.key" class="admin-scene-row">
            <span class="admin-scene-main">
              <strong>{{ scene.label }}</strong>
              <small>{{ scene.description || scene.key }}</small>
              <code>{{ scene.key }}</code>
            </span>
            <AppSelect
              class="admin-scene-select"
              :model-value="scene.strength"
              :options="sceneStrengthOptions"
              :disabled="adminSceneSaving"
              dropdown-fit-content
              @change="(value) => setSceneStrengthValue(scene.key, value)"
            >
              <template #trigger="{ label, open }">
                <span class="admin-scene-select-trigger" :class="{ open }">
                  <span>{{ label || '选择模型强度' }}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </span>
              </template>
            </AppSelect>
          </article>
        </div>
        <p v-if="adminSceneStatusText" :class="['admin-scenes-status', { ok: adminSceneStatusKind === 'ok', error: adminSceneStatusKind === 'error' }]">{{ adminSceneStatusText }}</p>
      </section>

      <section v-else-if="activeKey === 'admin-config' && canViewTraceAudit" class="admin-config-panel">
        <div class="admin-config-head">
          <div>
            <strong>配置导入/导出</strong>
            <span>第一期只处理系统默认模型和模型场景配置，用于上线后把当前环境的关键配置迁移到正式环境。</span>
          </div>
          <button type="button" :disabled="adminConfigExporting" @click="exportAdminConfig">{{ adminConfigExporting ? '导出中' : '导出 JSON' }}</button>
        </div>
        <div class="admin-config-grid">
          <section class="admin-config-card">
            <h3>导出内容</h3>
            <ul>
              <li>系统默认模型 Provider，包括 DeepSeek Base Url、Api Key、增强模型、轻量模型。</li>
              <li>模型场景配置，包括缺省模型、对话主脑/复杂编排、标题生成等场景强度。</li>
            </ul>
            <p>导出文件包含密钥，只用于可信环境迁移，不要发到公共群或代码仓库。</p>
          </section>
          <section class="admin-config-card import">
            <h3>导入配置</h3>
            <textarea v-model="adminConfigImportText" spellcheck="false" placeholder="粘贴导出的 JSON 配置..." />
            <div class="admin-config-actions">
              <button type="button" class="admin-model-secondary" :disabled="adminConfigImporting || !adminConfigImportText.trim()" @click="adminConfigImportText = ''">清空</button>
              <button type="button" class="admin-model-primary" :disabled="adminConfigImporting || !adminConfigImportText.trim()" @click="importAdminConfig">{{ adminConfigImporting ? '导入中' : '导入并覆盖' }}</button>
            </div>
            <p v-if="adminConfigStatusText" :class="['admin-config-status', { ok: adminConfigStatusKind === 'ok', error: adminConfigStatusKind === 'error' }]">{{ adminConfigStatusText }}</p>
          </section>
        </div>
      </section>

      <section v-else-if="activeKey === 'admin-system-knowledge' && canViewSystemKnowledgeAdmin" class="system-knowledge-panel">
        <template v-if="systemKnowledgeMode === 'list'">
          <div class="system-knowledge-head">
            <div>
              <strong>系统知识</strong>
              <span>维护平台用法、最佳实践、FAQ、更新日志、上线防坑等主对话可检索的系统材料。</span>
            </div>
            <div class="system-knowledge-actions">
              <button type="button" :disabled="systemKnowledgeLoading" @click="loadSystemKnowledge(true)">刷新</button>
              <button type="button" class="primary" :disabled="systemKnowledgeSaving" @click="startNewSystemKnowledge">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                新增
              </button>
            </div>
          </div>
          <div class="system-knowledge-filters">
            <input v-model.trim="systemKnowledgeQuery" placeholder="搜索标题、标签、正文..." @keyup.enter="loadSystemKnowledge(true)" />
            <AppSelect
              class="system-knowledge-select"
              :model-value="systemKnowledgeStatusFilter"
              :options="systemKnowledgeStatusOptions"
              dropdown-fit-content
              @change="(value) => { systemKnowledgeStatusFilter = String(value); loadSystemKnowledge(true) }"
            >
              <template #trigger="{ label, open }">
                <span class="admin-scene-select-trigger" :class="{ open }">
                  <span>{{ label || '全部状态' }}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </span>
              </template>
            </AppSelect>
            <button type="button" @click="loadSystemKnowledge(true)" :disabled="systemKnowledgeLoading">查询</button>
          </div>
          <div v-if="systemKnowledgeLoading && !systemKnowledgeItems.length" class="admin-model-state">加载中...</div>
          <div v-else-if="!systemKnowledgeItems.length" class="admin-model-state">暂无系统知识，先新增一条最佳实践、FAQ 或更新日志。</div>
          <div v-else class="system-knowledge-list">
            <article v-for="item in systemKnowledgeItems" :key="item.id" class="system-knowledge-row" :class="{ disabled: item.status !== 'enabled' }" @click="startEditSystemKnowledge(item)">
              <span class="system-knowledge-main">
                <strong>{{ item.title }}</strong>
                <small>{{ systemKnowledgeCategoryLabel(item.category) }} · {{ item.tags?.join(' / ') || '无标签' }}</small>
              </span>
              <span class="system-knowledge-meta">
                <i :class="{ off: item.status !== 'enabled' }">{{ item.status === 'enabled' ? '启用' : '禁用' }}</i>
                <code>#{{ item.id }}</code>
              </span>
            </article>
          </div>
        </template>
        <template v-else>
          <div class="system-knowledge-edit-head">
            <h1>{{ systemKnowledgeEditing?.id ? '编辑系统知识' : '新增系统知识' }}</h1>
            <span v-if="systemKnowledgeStatusText" :class="['system-knowledge-status', { ok: systemKnowledgeStatusKind === 'ok', error: systemKnowledgeStatusKind === 'error' }]">{{ systemKnowledgeStatusText }}</span>
          </div>
          <section class="system-knowledge-editor">
            <div class="system-knowledge-form">
              <label><span>标题</span><input v-model="systemKnowledgeDraft.title" autocomplete="off" @input="clearSystemKnowledgeStatus" /></label>
              <label><span>分类</span><input v-model="systemKnowledgeDraft.category" autocomplete="off" placeholder="best_practice / faq / changelog" @input="clearSystemKnowledgeStatus" /></label>
              <label><span>标签</span><input v-model="systemKnowledgeTagsText" autocomplete="off" placeholder="用逗号或空格分隔" @input="clearSystemKnowledgeStatus" /></label>
              <label><span>优先级</span><input v-model.number="systemKnowledgeDraft.priority" type="number" min="1" max="999" @input="clearSystemKnowledgeStatus" /></label>
              <label class="wide"><span>来源说明</span><input v-model="systemKnowledgeDraft.source_note" autocomplete="off" placeholder="可选" @input="clearSystemKnowledgeStatus" /></label>
              <label class="wide"><span>Markdown 正文</span><textarea v-model="systemKnowledgeDraft.content_markdown" spellcheck="false" @input="clearSystemKnowledgeStatus" /></label>
            </div>
            <div class="system-knowledge-preview">
              <strong>预览</strong>
              <div class="trace-markdown" v-html="renderMarkdown(systemKnowledgeDraft.content_markdown || '暂无内容')" />
            </div>
          </section>
          <footer class="system-knowledge-foot">
            <div>
              <button v-if="systemKnowledgeEditing?.id" type="button" class="admin-model-danger" :disabled="systemKnowledgeSaving" @click="removeSystemKnowledge">删除</button>
              <button v-if="systemKnowledgeEditing?.id" type="button" class="admin-model-secondary" :disabled="systemKnowledgeSaving" @click="toggleSystemKnowledgeStatus">{{ systemKnowledgeDraft.status === 'enabled' ? '禁用' : '启用' }}</button>
            </div>
            <div>
              <button type="button" class="admin-model-secondary" :disabled="systemKnowledgeSaving" @click="cancelSystemKnowledgeEdit">取消</button>
              <button type="button" class="admin-model-primary" :disabled="systemKnowledgeSaving" @click="saveSystemKnowledge">{{ systemKnowledgeSaving ? '保存中' : '保存' }}</button>
            </div>
          </footer>
        </template>
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
              <label class="trace-filter-field trace-marker-filter">
                <span>审计标识</span>
                <input
                  v-model.trim="traceAuditMarkerFilter"
                  type="text"
                  placeholder="DTA-XXXXXXXX"
                  spellcheck="false"
                  @keydown.enter.prevent="loadTraceRuns(true)"
                >
              </label>
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
              <button class="trace-filter-clear" type="button" :disabled="traceRunsLoading || (!traceAuditMarkerFilter && !traceProjectFilter && !traceUserFilter)" @click="clearTraceFilters">清空</button>
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

              <div v-if="traceFinalAnswer(selectedTrace)" class="trace-section">
                <div class="trace-section-title">最终结果</div>
                <div class="trace-markdown" v-html="renderMarkdown(traceFinalAnswer(selectedTrace))" />
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
                  <article v-for="event in traceTimelineEvents(selectedTrace)" :key="event.id || event.seq" class="trace-event">
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useRoute, useRouter } from 'vue-router'
import VibeModelSettings from '../VibeModelSettings.vue'
import VibeWindowControls from '../knowledge/components/VibeWindowControls.vue'
import AppSelect from '@/components/common/select/AppSelect.vue'
import { createVibeLLMProvider, createVibeSystemKnowledge, deleteVibeLLMProvider, deleteVibeSystemKnowledge, exportVibeAdminConfig, getVibeCapabilities, getVibeDialogueTraceDetail, getVibeLLMAdminModelDefaults, getVibeLLMAdminModelScenes, getVibeUsageSummary, importVibeAdminConfig, listVibeDialogueTraceRuns, listVibeSystemKnowledge, setVibeLLMAdminSystemDefaults, testVibeLLMProvider, updateVibeLLMAdminModelScenes, updateVibeLLMProvider, updateVibeSystemKnowledge, updateVibeTraceAuditConfig, type VibeAdminConfigTransferPayload, type VibeAttachment, type VibeCapabilityUser, type VibeDialogueTraceDetail, type VibeDialogueTraceEvent, type VibeDialogueTraceRun, type VibeFeatureConfig, type VibeLLMProviderConfig, type VibeLLMProviderPayload, type VibeLLMSceneConfig, type VibeSystemKnowledgeItem, type VibeSystemKnowledgePayload, type VibeUsageSummary } from '../api'

const route = useRoute()
const router = useRouter()
const activeKey = ref<'profile' | 'model' | 'admin-model' | 'admin-scenes' | 'admin-config' | 'admin-system-knowledge' | 'trace'>('profile')
const showWinControls = computed(() => !!window.electronAPI)
const winKey = computed(() => (route.query.windowKey as string) || 'vibe-workbench')
const winMaximized = ref(false)
let offMaximizeState: (() => void) | null = null
const capabilities = ref<Record<string, boolean>>({})
const featureConfigs = ref<Record<string, VibeFeatureConfig>>({})
const currentUser = ref<VibeCapabilityUser | null>(null)
const usageSummary = ref<VibeUsageSummary>({
  total_tokens: 0,
  peak_tokens: 0,
  max_elapsed_ms: 0,
  dialogue_turns: 0,
  latest_sent_at: null,
})
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
const traceAuditMarkerFilter = ref('')
const traceProjectFilter = ref('')
const traceUserFilter = ref('')
const adminModelProviders = ref<VibeLLMProviderConfig[]>([])
const adminSystemDefaultProviderIds = ref<string[]>([])
const adminModelLoading = ref(false)
const adminModelSaving = ref(false)
const adminModelMode = ref<'list' | 'edit'>('list')
const adminEditingProvider = ref<VibeLLMProviderConfig | null>(null)
const adminDeleting = ref(false)
const adminTesting = ref(false)
const adminStatusText = ref('')
const adminStatusKind = ref<'idle' | 'ok' | 'error'>('idle')
const adminScenes = ref<VibeLLMSceneConfig[]>([])
const adminSceneLoading = ref(false)
const adminSceneSaving = ref(false)
const adminSceneStatusText = ref('')
const adminSceneStatusKind = ref<'idle' | 'ok' | 'error'>('idle')
const adminConfigExporting = ref(false)
const adminConfigImporting = ref(false)
const adminConfigImportText = ref('')
const adminConfigStatusText = ref('')
const adminConfigStatusKind = ref<'idle' | 'ok' | 'error'>('idle')
const systemKnowledgeItems = ref<VibeSystemKnowledgeItem[]>([])
const systemKnowledgeLoading = ref(false)
const systemKnowledgeSaving = ref(false)
const systemKnowledgeMode = ref<'list' | 'edit'>('list')
const systemKnowledgeEditing = ref<VibeSystemKnowledgeItem | null>(null)
const systemKnowledgeQuery = ref('')
const systemKnowledgeStatusFilter = ref('')
const systemKnowledgeTagsText = ref('')
const systemKnowledgeStatusText = ref('')
const systemKnowledgeStatusKind = ref<'idle' | 'ok' | 'error'>('idle')
const DEEPSEEK_LOGO = 'https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/other_band_logo/deepseek_logo.svg'
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const DEEPSEEK_ENHANCED_MODEL = 'deepseek-v4-pro'
const DEEPSEEK_LIGHT_MODEL = 'deepseek-v4-flash'
const systemKnowledgeDraft = reactive<VibeSystemKnowledgePayload>({
  title: '',
  category: 'best_practice',
  content_markdown: '',
  status: 'enabled',
  priority: 100,
  tags: [],
  source_note: '',
})

const adminDraft = reactive<VibeLLMProviderPayload>({
  name: 'DeepSeek',
  provider_type: 'deepseek',
  base_url: DEEPSEEK_BASE_URL,
  api_key: '',
  proxy_url: '',
  timeout_config: { connect: 30, read: 240, write: 60, pool: 30 },
  max_retries: 0,
  model_config: {},
  enabled: true,
  available_to_all: false,
})

const traceFilterOptions = ref<{
  projects: Array<{ project_id: string; project_name: string; count: number }>
  users: Array<{ user_id?: number; account?: string; username?: string; user_display_name?: string; label: string; count: number }>
}>({ projects: [], users: [] })

const canViewTraceAudit = computed(() => !!capabilities.value.trace_audit)
const canViewSystemKnowledgeAdmin = computed(() => !!capabilities.value.system_knowledge_admin)
const canViewAdminSettings = computed(() => canViewTraceAudit.value || canViewSystemKnowledgeAdmin.value)
const traceAuditEnabled = computed(() => featureConfigs.value.trace_audit?.enabled !== false)
const currentUserName = computed(() => String(currentUser.value?.display_name || currentUser.value?.nick_name || currentUser.value?.username || '用户'))
const currentUsername = computed(() => String(currentUser.value?.username || 'user'))
const currentUserAvatar = computed(() => String(currentUser.value?.avatar_url || ''))
const userInitials = computed(() => {
  const text = currentUserName.value.trim() || 'U'
  const letters = Array.from(text).slice(0, 2).join('')
  return /^[a-z0-9]+$/i.test(letters) ? letters.toUpperCase() : letters
})
const activeTitle = computed(() => ({ profile: '个人资料', model: '模型', 'admin-model': '默认模型', 'admin-scenes': '模型场景配置', 'admin-config': '配置导入/导出', 'admin-system-knowledge': '系统知识', trace: '对话链路审计' }[activeKey.value]))
const allVisibleTraceSelected = computed(() => {
  const ids = traceRuns.value.map((item) => item.trace_id).filter(Boolean)
  return !!ids.length && ids.every((id) => selectedTraceIds.value.has(id))
})
const sceneStrengthOptions = [
  { value: 'mini', label: '轻量模型' },
  { value: 'strong', label: '增强模型' },
]
const adminProviderTypeOptions = [
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'openai-compatible', label: '其他 OpenAI 兼容模型' },
]
const adminStrongModel = computed({
  get: () => String(adminDraft.model_config?.strong || ''),
  set: (value: string) => {
    adminDraft.model_config = { ...(adminDraft.model_config || {}), strong: value }
  },
})
const adminLightModel = computed({
  get: () => String(adminDraft.model_config?.mini || ''),
  set: (value: string) => {
    adminDraft.model_config = { ...(adminDraft.model_config || {}), mini: value }
  },
})
const systemKnowledgeStatusOptions = [
  { value: '', label: '全部状态' },
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '禁用' },
]

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

async function loadUsageSummary() {
  try {
    const res = await getVibeUsageSummary()
    usageSummary.value = {
      total_tokens: Number(res?.total_tokens || 0),
      peak_tokens: Number(res?.peak_tokens || 0),
      max_elapsed_ms: Number(res?.max_elapsed_ms || 0),
      dialogue_turns: Number(res?.dialogue_turns || 0),
      latest_sent_at: res?.latest_sent_at || null,
      scope: res?.scope,
      rule: res?.rule,
    }
  } catch {
    usageSummary.value = {
      total_tokens: 0,
      peak_tokens: 0,
      max_elapsed_ms: 0,
      dialogue_turns: 0,
      latest_sent_at: null,
    }
  }
}


async function loadAdminModelDefaults() {
  if (!canViewTraceAudit.value || adminModelLoading.value) return
  adminModelLoading.value = true
  try {
    const res = await getVibeLLMAdminModelDefaults()
    adminModelProviders.value = res?.providers || []
    adminSystemDefaultProviderIds.value = res?.system_default_provider_ids || []
  } finally {
    adminModelLoading.value = false
  }
}

async function loadAdminModelScenes() {
  if (!canViewTraceAudit.value || adminSceneLoading.value) return
  adminSceneLoading.value = true
  try {
    const res = await getVibeLLMAdminModelScenes()
    adminScenes.value = res?.scenes || []
  } finally {
    adminSceneLoading.value = false
  }
}

function setSceneStrength(key: string, strength: 'mini' | 'strong') {
  adminScenes.value = adminScenes.value.map((item) => item.key === key ? { ...item, strength } : item)
  adminSceneStatusText.value = ''
  adminSceneStatusKind.value = 'idle'
}

function setSceneStrengthValue(key: string, value: string | number) {
  setSceneStrength(key, String(value) === 'strong' ? 'strong' : 'mini')
}

async function saveAdminScenes() {
  if (adminSceneSaving.value) return
  adminSceneSaving.value = true
  try {
    const res = await updateVibeLLMAdminModelScenes(adminScenes.value.map((item) => ({ key: item.key, strength: item.strength })))
    adminScenes.value = res?.scenes || []
    adminSceneStatusText.value = '已保存'
    adminSceneStatusKind.value = 'ok'
  } catch (error: any) {
    adminSceneStatusText.value = `保存失败：${error?.message || String(error)}`
    adminSceneStatusKind.value = 'error'
  } finally {
    adminSceneSaving.value = false
  }
}

function isAdminSystemDefault(providerId: string) {
  return adminSystemDefaultProviderIds.value.includes(providerId)
}

function adminFixedModelConfig() {
  return {
    mini: DEEPSEEK_LIGHT_MODEL,
    strong: DEEPSEEK_ENHANCED_MODEL,
  }
}

function isDeepSeekProvider(providerType: string | undefined) {
  return String(providerType || '').toLowerCase() === 'deepseek'
}

function setAdminProviderType(value: string | number) {
  const next = String(value) === 'deepseek' ? 'deepseek' : 'openai-compatible'
  const previous = String(adminDraft.provider_type || '')
  adminDraft.provider_type = next
  if (next === 'deepseek' && previous !== 'deepseek') {
    adminDraft.name = 'DeepSeek'
    adminDraft.base_url = DEEPSEEK_BASE_URL
    adminDraft.model_config = adminFixedModelConfig()
  } else if (next !== 'deepseek' && previous === 'deepseek') {
    adminDraft.name = ''
    adminDraft.base_url = ''
    adminDraft.model_config = { mini: '', strong: '' }
  }
  clearAdminStatus()
}

function setAdminStatus(text: string, kind: 'idle' | 'ok' | 'error') {
  adminStatusText.value = text
  adminStatusKind.value = kind
}

function clearAdminStatus() {
  if (adminStatusKind.value !== 'idle') setAdminStatus('', 'idle')
}

function resetAdminDraft() {
  Object.assign(adminDraft, {
    name: 'DeepSeek',
    provider_type: 'deepseek',
    base_url: DEEPSEEK_BASE_URL,
    api_key: '',
    proxy_url: '',
    timeout_config: { connect: 30, read: 240, write: 60, pool: 30 },
    max_retries: 0,
    model_config: adminFixedModelConfig(),
    enabled: true,
    available_to_all: false,
  })
}

function applyAdminDraft(provider: VibeLLMProviderConfig) {
  Object.assign(adminDraft, {
    name: provider.name || (isDeepSeekProvider(provider.provider_type) ? 'DeepSeek' : ''),
    provider_type: isDeepSeekProvider(provider.provider_type) ? 'deepseek' : 'openai-compatible',
    base_url: provider.base_url || (isDeepSeekProvider(provider.provider_type) ? DEEPSEEK_BASE_URL : ''),
    api_key: provider.api_key || '',
    proxy_url: provider.proxy_url || '',
    timeout_config: {
      connect: Number(provider.timeout_config?.connect ?? 30),
      read: Number(provider.timeout_config?.read ?? 240),
      write: Number(provider.timeout_config?.write ?? 60),
      pool: Number(provider.timeout_config?.pool ?? 30),
    },
    max_retries: Number(provider.max_retries ?? 0),
    model_config: {
      mini: String(provider.model_config?.mini || ''),
      strong: String(provider.model_config?.strong || ''),
    },
    enabled: provider.enabled !== false,
    available_to_all: provider.available_to_all === true,
  })
}

function startNewAdminProvider() {
  adminEditingProvider.value = null
  resetAdminDraft()
  adminModelMode.value = 'edit'
  setAdminStatus('', 'idle')
}

function startEditAdminProvider(provider: VibeLLMProviderConfig) {
  adminEditingProvider.value = provider
  applyAdminDraft(provider)
  adminModelMode.value = 'edit'
  setAdminStatus('', 'idle')
}

function cancelAdminEdit() {
  adminModelMode.value = 'list'
  adminEditingProvider.value = null
  setAdminStatus('', 'idle')
}

function validateAdminDraft() {
  if (!String(adminDraft.name || '').trim()) return '请填写模型名称'
  if (!String(adminDraft.base_url || '').trim()) return '请填写 Base Url'
  if (!String(adminDraft.api_key || '').trim()) return '请填写 Api Key'
  if (!adminLightModel.value.trim()) return '请填写轻量模型'
  if (!adminStrongModel.value.trim()) return '请填写增强模型'
  return ''
}

function buildAdminPayload(): VibeLLMProviderPayload {
  return {
    name: String(adminDraft.name || '').trim(),
    provider_type: String(adminDraft.provider_type || 'deepseek'),
    base_url: String(adminDraft.base_url || '').trim(),
    api_key: String(adminDraft.api_key || '').trim(),
    proxy_url: String(adminDraft.proxy_url || '').trim(),
    timeout_config: adminDraft.timeout_config,
    max_retries: Number(adminDraft.max_retries || 0),
    model_config: {
      mini: adminLightModel.value.trim(),
      strong: adminStrongModel.value.trim(),
    },
    enabled: true,
    available_to_all: adminDraft.available_to_all === true,
  }
}

async function persistAdminProvider() {
  const error = validateAdminDraft()
  if (error) {
    setAdminStatus(error, 'error')
    return null
  }
  const wasNew = !adminEditingProvider.value?.id
  const provider = adminEditingProvider.value?.id
    ? await updateVibeLLMProvider(adminEditingProvider.value.id, buildAdminPayload())
    : await createVibeLLMProvider(buildAdminPayload())
  if (wasNew && provider?.id) {
    const next = Array.from(new Set([...adminSystemDefaultProviderIds.value, provider.id]))
    const res = await setVibeLLMAdminSystemDefaults(next)
    adminModelProviders.value = res?.providers || []
    adminSystemDefaultProviderIds.value = res?.system_default_provider_ids || []
  } else {
    await loadAdminModelDefaults()
  }
  adminEditingProvider.value = provider
  return provider
}

async function saveAdminProvider() {
  if (adminModelSaving.value) return
  adminModelSaving.value = true
  try {
    const provider = await persistAdminProvider()
    if (!provider) return
    adminModelMode.value = 'list'
    adminEditingProvider.value = null
    setAdminStatus('', 'idle')
  } catch (error: any) {
    setAdminStatus(`保存失败：${error?.message || String(error)}`, 'error')
  } finally {
    adminModelSaving.value = false
  }
}

async function testAdminProvider() {
  if (adminTesting.value || adminModelSaving.value) return
  adminTesting.value = true
  try {
    const provider = await persistAdminProvider()
    if (!provider?.id) return
    const result = await testVibeLLMProvider(provider.id, { model: adminLightModel.value.trim() })
    setAdminStatus(
      result.ok ? `测试成功 · ${result.model} · ${result.elapsed_ms}ms` : `测试失败 · ${result.model} · ${result.error || '未知错误'}`,
      result.ok ? 'ok' : 'error',
    )
  } catch (error: any) {
    setAdminStatus(`测试失败：${error?.message || String(error)}`, 'error')
  } finally {
    adminTesting.value = false
  }
}

async function deleteAdminProvider() {
  if (!adminEditingProvider.value?.id || adminDeleting.value) return
  if (!window.confirm(`确认删除默认模型「${adminEditingProvider.value.name || 'DeepSeek'}」？`)) return
  adminDeleting.value = true
  try {
    const providerId = adminEditingProvider.value.id
    if (isAdminSystemDefault(providerId)) {
      await setVibeLLMAdminSystemDefaults(adminSystemDefaultProviderIds.value.filter((id) => id !== providerId))
    }
    await deleteVibeLLMProvider(providerId)
    await loadAdminModelDefaults()
    adminModelMode.value = 'list'
    adminEditingProvider.value = null
    setAdminStatus('', 'idle')
  } catch (error: any) {
    setAdminStatus(`删除失败：${error?.message || String(error)}`, 'error')
  } finally {
    adminDeleting.value = false
  }
}

async function setAdminModelEnabled(providerId: string, enabled: boolean) {
  if (!providerId || adminModelSaving.value) return
  const previous = [...adminSystemDefaultProviderIds.value]
  const next = enabled
    ? Array.from(new Set([...adminSystemDefaultProviderIds.value, providerId]))
    : adminSystemDefaultProviderIds.value.filter((id) => id !== providerId)
  adminSystemDefaultProviderIds.value = next
  adminModelSaving.value = true
  try {
    const res = await setVibeLLMAdminSystemDefaults(next)
    adminModelProviders.value = res?.providers || []
    adminSystemDefaultProviderIds.value = res?.system_default_provider_ids || []
  } catch {
    adminSystemDefaultProviderIds.value = previous
  } finally {
    adminModelSaving.value = false
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

function downloadJson(filename: string, payload: VibeAdminConfigTransferPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function exportAdminConfig() {
  if (adminConfigExporting.value) return
  adminConfigExporting.value = true
  adminConfigStatusText.value = ''
  adminConfigStatusKind.value = 'idle'
  try {
    const payload = await exportVibeAdminConfig()
    downloadJson(`vibe-admin-config-${exportStamp()}.json`, payload)
    adminConfigStatusText.value = '已导出配置文件'
    adminConfigStatusKind.value = 'ok'
  } catch (error: any) {
    adminConfigStatusText.value = `导出失败：${error?.message || String(error)}`
    adminConfigStatusKind.value = 'error'
  } finally {
    adminConfigExporting.value = false
  }
}

async function importAdminConfig() {
  if (adminConfigImporting.value || !adminConfigImportText.value.trim()) return
  adminConfigImporting.value = true
  adminConfigStatusText.value = ''
  adminConfigStatusKind.value = 'idle'
  try {
    const config = JSON.parse(adminConfigImportText.value)
    const res = await importVibeAdminConfig(config)
    adminConfigStatusText.value = `导入完成：默认模型 ${res.imported?.providers || 0} 个，场景配置 ${res.imported?.scenes || 0} 项`
    adminConfigStatusKind.value = 'ok'
    adminConfigImportText.value = ''
    await Promise.all([
      loadAdminModelDefaults(),
      loadAdminModelScenes(),
    ])
  } catch (error: any) {
    adminConfigStatusText.value = `导入失败：${error?.message || String(error)}`
    adminConfigStatusKind.value = 'error'
  } finally {
    adminConfigImporting.value = false
  }
}


function clearSystemKnowledgeStatus() {
  if (systemKnowledgeStatusKind.value !== 'idle') {
    systemKnowledgeStatusText.value = ''
    systemKnowledgeStatusKind.value = 'idle'
  }
}

function resetSystemKnowledgeDraft() {
  Object.assign(systemKnowledgeDraft, {
    title: '',
    category: 'best_practice',
    content_markdown: '',
    status: 'enabled',
    priority: 100,
    tags: [],
    source_note: '',
  })
  systemKnowledgeTagsText.value = ''
}

function applySystemKnowledgeDraft(item: VibeSystemKnowledgeItem) {
  Object.assign(systemKnowledgeDraft, {
    title: item.title || '',
    category: item.category || 'general',
    content_markdown: item.content_markdown || '',
    status: item.status === 'disabled' ? 'disabled' : 'enabled',
    priority: Number(item.priority || 100),
    tags: item.tags || [],
    source_note: item.source_note || '',
  })
  systemKnowledgeTagsText.value = (item.tags || []).join('，')
}

function systemKnowledgeTags() {
  return String(systemKnowledgeTagsText.value || '')
    .split(/[，,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function systemKnowledgePayload(): VibeSystemKnowledgePayload {
  return {
    title: String(systemKnowledgeDraft.title || '').trim(),
    category: String(systemKnowledgeDraft.category || 'general').trim() || 'general',
    content_markdown: String(systemKnowledgeDraft.content_markdown || '').trim(),
    status: systemKnowledgeDraft.status === 'disabled' ? 'disabled' : 'enabled',
    priority: Number(systemKnowledgeDraft.priority || 100),
    tags: systemKnowledgeTags(),
    source_note: String(systemKnowledgeDraft.source_note || '').trim(),
  }
}

function systemKnowledgeCategoryLabel(category?: string) {
  const value = String(category || 'general')
  const labels: Record<string, string> = {
    best_practice: '最佳实践',
    guide: '使用指引',
    answer_contract: '答案约定',
    faq: 'FAQ',
    changelog: '更新日志',
    launch_guard: '上线防坑',
    general: '通用',
  }
  return labels[value] || value
}

async function loadSystemKnowledge(reset = false) {
  if (!canViewSystemKnowledgeAdmin.value || systemKnowledgeLoading.value) return
  systemKnowledgeLoading.value = true
  try {
    const res = await listVibeSystemKnowledge({
      q: systemKnowledgeQuery.value,
      status: systemKnowledgeStatusFilter.value,
      limit: 100,
      cursor: reset ? 0 : 0,
    })
    systemKnowledgeItems.value = res?.items || []
  } finally {
    systemKnowledgeLoading.value = false
  }
}

function startNewSystemKnowledge() {
  systemKnowledgeEditing.value = null
  resetSystemKnowledgeDraft()
  systemKnowledgeMode.value = 'edit'
  systemKnowledgeStatusText.value = ''
  systemKnowledgeStatusKind.value = 'idle'
}

function startEditSystemKnowledge(item: VibeSystemKnowledgeItem) {
  systemKnowledgeEditing.value = item
  applySystemKnowledgeDraft(item)
  systemKnowledgeMode.value = 'edit'
  systemKnowledgeStatusText.value = ''
  systemKnowledgeStatusKind.value = 'idle'
}

function cancelSystemKnowledgeEdit() {
  systemKnowledgeMode.value = 'list'
  systemKnowledgeEditing.value = null
  systemKnowledgeStatusText.value = ''
  systemKnowledgeStatusKind.value = 'idle'
}

async function saveSystemKnowledge() {
  if (systemKnowledgeSaving.value) return
  const payload = systemKnowledgePayload()
  if (!payload.title) {
    systemKnowledgeStatusText.value = '请填写标题'
    systemKnowledgeStatusKind.value = 'error'
    return
  }
  if (!payload.content_markdown) {
    systemKnowledgeStatusText.value = '请填写 Markdown 正文'
    systemKnowledgeStatusKind.value = 'error'
    return
  }
  systemKnowledgeSaving.value = true
  try {
    const res = systemKnowledgeEditing.value?.id
      ? await updateVibeSystemKnowledge(systemKnowledgeEditing.value.id, payload)
      : await createVibeSystemKnowledge(payload)
    if (res?.item) systemKnowledgeEditing.value = res.item
    await loadSystemKnowledge(true)
    systemKnowledgeMode.value = 'list'
    systemKnowledgeStatusText.value = ''
    systemKnowledgeStatusKind.value = 'idle'
  } catch (error: any) {
    systemKnowledgeStatusText.value = `保存失败：${error?.message || String(error)}`
    systemKnowledgeStatusKind.value = 'error'
  } finally {
    systemKnowledgeSaving.value = false
  }
}

async function toggleSystemKnowledgeStatus() {
  systemKnowledgeDraft.status = systemKnowledgeDraft.status === 'enabled' ? 'disabled' : 'enabled'
  await saveSystemKnowledge()
}

async function removeSystemKnowledge() {
  if (!systemKnowledgeEditing.value?.id || systemKnowledgeSaving.value) return
  if (!window.confirm(`确认删除系统知识「${systemKnowledgeEditing.value.title}」？`)) return
  systemKnowledgeSaving.value = true
  try {
    await deleteVibeSystemKnowledge(systemKnowledgeEditing.value.id)
    await loadSystemKnowledge(true)
    systemKnowledgeMode.value = 'list'
    systemKnowledgeEditing.value = null
  } catch (error: any) {
    systemKnowledgeStatusText.value = `删除失败：${error?.message || String(error)}`
    systemKnowledgeStatusKind.value = 'error'
  } finally {
    systemKnowledgeSaving.value = false
  }
}

async function loadTraceRuns(reset = false) {
  if (!canViewTraceAudit.value || traceRunsLoading.value) return
  traceRunsLoading.value = true
  try {
    const res = await listVibeDialogueTraceRuns({
      limit: 30,
      cursor: reset ? '' : traceNextCursor.value,
      q: traceAuditMarkerFilter.value,
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
  traceAuditMarkerFilter.value = ''
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
    lines.push(mdFence(traceFinalAnswer(trace) || '-', 'markdown'))
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

const HIDDEN_TRACE_EVENT_TYPES = new Set([
  'sse.answer_start',
  'sse.answer_delta',
  'sse.answer_done',
  'sse.ping',
])

function traceTimelineEvents(trace?: Partial<VibeDialogueTraceDetail> | null) {
  return (trace?.events || []).filter((event: any) => !HIDDEN_TRACE_EVENT_TYPES.has(String(event?.event_type || '')))
}

function traceFinalAnswer(trace?: Partial<VibeDialogueTraceDetail> | null) {
  const events = trace?.events || []
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event: any = events[i]
    const payload = event?.payload || {}
    if (event?.event_type === 'sse.answer' && typeof payload.text === 'string' && payload.text.trim()) {
      return payload.text
    }
    if (event?.event_type === 'sse.event_saved' && payload.role === 'assistant') {
      const content = payload.event?.content
      if (typeof content === 'string' && content.trim()) return content
    }
    if (event?.event_type === 'answer.finished' && typeof payload.answer === 'string' && payload.answer.trim()) {
      return payload.answer
    }
  }
  return String(trace?.summary || '')
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
  const raw = normalizeCopyableMarkdownFence(String(text || '')).trim()
  if (!raw) return '<span class="trace-empty-text">-</span>'
  return DOMPurify.sanitize(marked.parse(raw, { async: false }) as string, {
    USE_PROFILES: { html: true },
  })
}

function normalizeCopyableMarkdownFence(text: string) {
  const raw = String(text || '')
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
  'request.free_text_continuation_resolved': '自由文本承接已解析',
  'clarification.cancelled': '用户取消反问/确认',
  'clarification.resolved': '反问/确认已解决',
  'confirmation_guard.created': '确认卡已绑定知识库版本',
  'confirmation_guard.checked': '确认卡版本校验通过',
  'confirmation_guard.claimed': '确认卡版本已原子认领',
  'confirmation_guard.rejected': '确认卡已过期或被拒绝',
  'write_transaction.started': '统一写入开始',
  'write_transaction.committed': '统一写入完成',
  'write_transaction.failed': '统一写入失败',
  'structure.reviewed': '结构重审完成',
  'structure.review_failed': '结构重审失败（正文已提交）',
  'post_commit.delivery_registered': '跨库交付已登记',
  'post_commit.delivery_pending': '跨库交付待补偿',
  'post_commit.delivery_completed': '跨库交付完成',
  'trace.config_resolved': '审计配置已解析',
  'session.loaded': '会话上下文已加载',
  'session.load_failed': '会话上下文加载失败',
  'llm.call_started': 'LLM 调用开始',
  'llm.call_finished': 'LLM 调用完成',
  'llm.transport_retry': '模型连接瞬时失败后重试',
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
  'sse.answer_start': '答案流开始',
  'sse.answer': '答案输出',
  'sse.answer_delta': '答案流式输出',
  'sse.answer_done': '答案流结束',
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
  answer_start: '答案流开始',
  answer: '答案输出',
  answer_delta: '答案流式输出',
  answer_done: '答案流结束',
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
  confirmation_guard: '确认并发保护',
  write_transaction: '统一写入事务',
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
  const eventType = String(event?.event_type || '')
  if (eventType.startsWith('llm.call_')) {
    const lines: string[] = []
    if (payload.model) lines.push(`**模型**：${payload.model}`)
    if (payload.provider_name) lines.push(`**服务**：${payload.provider_name}`)
    if (payload.use_case) lines.push(`**场景**：${payload.use_case}${payload.strength ? `（${payload.strength}）` : ''}`)
    if (payload.purpose) lines.push(`**用途**：${payload.purpose}`)
    if (payload.elapsed_ms !== undefined && payload.elapsed_ms !== null) lines.push(`**耗时**：${formatDuration(payload.elapsed_ms)}`)
    if (payload.error) lines.push(`**错误**：${payload.error}`)
    if (lines.length) return lines.join('\n')
  }
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

function formatUsageNumber(value?: number | null) {
  const n = Number(value || 0)
  if (!Number.isFinite(n) || n <= 0) return '0'
  if (n >= 100000000) return `${(n / 100000000).toFixed(n >= 1000000000 ? 1 : 2)}亿`
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 1 : 2)}万`
  return String(Math.round(n))
}

function formatUsageDuration(ms?: number | null) {
  const n = Number(ms || 0)
  if (!Number.isFinite(n) || n <= 0) return '0s'
  if (n < 1000) return `${Math.round(n)}ms`
  const seconds = n / 1000
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return rest ? `${minutes}分${rest}秒` : `${minutes}分`
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

function winControl(action: 'minimize' | 'maximizeToggle' | 'close') {
  window.electronAPI?.wm?.control(winKey.value, action)
}

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

watch(canViewTraceAudit, (allowed) => {
  if (!allowed && activeKey.value === 'trace') activeKey.value = 'profile'
})

watch(activeKey, (key) => {
  if (key === 'profile') loadUsageSummary()
  if (key === 'trace' && canViewTraceAudit.value && !traceRuns.value.length) loadTraceRuns(true)
  if (key === 'admin-model' && canViewTraceAudit.value && !adminModelProviders.value.length) loadAdminModelDefaults()
  if (key === 'admin-scenes' && canViewTraceAudit.value && !adminScenes.value.length) loadAdminModelScenes()
  if (key === 'admin-system-knowledge' && canViewSystemKnowledgeAdmin.value && !systemKnowledgeItems.value.length) loadSystemKnowledge(true)
})

onMounted(async () => {
  trackMaximizeState()
  syncRouteTab()
  await Promise.all([
    loadCapabilities(),
    loadUsageSummary(),
  ])
  if (!canViewTraceAudit.value && activeKey.value === 'trace') activeKey.value = 'profile'
  if (!canViewSystemKnowledgeAdmin.value && activeKey.value === 'admin-system-knowledge') activeKey.value = 'profile'
  if (activeKey.value === 'trace' && canViewTraceAudit.value) {
    await loadTraceRuns(true)
    const targetTraceId = String(route.query.trace_id || '').trim()
    if (targetTraceId && targetTraceId !== selectedTraceId.value) await selectTrace(targetTraceId)
  }
  if (activeKey.value === 'admin-model' && canViewTraceAudit.value) await loadAdminModelDefaults()
  if (activeKey.value === 'admin-scenes' && canViewTraceAudit.value) await loadAdminModelScenes()
  if (activeKey.value === 'admin-system-knowledge' && canViewSystemKnowledgeAdmin.value) await loadSystemKnowledge(true)
})

onBeforeUnmount(() => {
  offMaximizeState?.()
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

.settings-win-ctl-zone {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 20;
  padding: 6px 8px 10px 16px;
  -webkit-app-region: no-drag;
  opacity: 0;
  transition: opacity 150ms ease;
}

.settings-win-ctl-zone:hover {
  opacity: 1;
}

.settings-win-ctl {
  position: static;
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
.model-panel,
.admin-model-panel,
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

.model-panel {
  max-width: none;
  width: 100%;
  margin: 0;
  padding: 0;
}

.admin-model-panel {
  max-width: 760px;
  margin-top: 24px;
}

.admin-model-head { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-bottom: 18px; }
.admin-model-refresh,
.admin-model-add { height: 34px; border: 0; border-radius: 10px; background: #f4f4f4; color: var(--ink-1); padding: 0 12px; cursor: pointer; }
.admin-model-refresh:hover,
.admin-model-add:hover { background: #ececec; }
.admin-model-refresh:disabled,
.admin-model-add:disabled { opacity: .45; cursor: not-allowed; }
.admin-model-add { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500; }
.admin-model-add svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.admin-model-list { display: grid; gap: 10px; }
.admin-model-row { width: 100%; min-height: 72px; display: grid; grid-template-columns: 44px minmax(0, 1fr) auto auto; align-items: center; gap: 13px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 14px; background: #fff; cursor: pointer; }
.admin-model-row:hover { background: #fcfcfc; }
.admin-model-row.enabled { border-color: rgba(47, 107, 61, .18); background: #fbfdfb; }
.admin-model-logo { width: 38px; height: 38px; border-radius: 12px; object-fit: cover; }
.admin-model-generic-logo { width: 38px; height: 38px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; background: #18181b; color: #fff; font-size: 12px; font-weight: 650; }
.admin-model-main { min-width: 0; display: grid; gap: 4px; }
.admin-model-main strong { color: var(--ink-1); font-size: 14px; font-weight: 560; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.admin-model-main small { color: var(--ink-3); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.admin-model-badges { display: flex; justify-content: flex-end; gap: 5px; }
.admin-model-badges i,
.admin-model-badges em { height: 24px; display: inline-flex; align-items: center; padding: 0 9px; border-radius: 999px; font-size: 11px; font-style: normal; font-weight: 500; white-space: nowrap; }
.admin-model-badges i { background: #f0f7f1; color: #2f6b3d; }
.admin-model-badges em { background: #f6f6f6; color: var(--ink-3); }
.admin-model-badges em.visibility { background: #f2f2f2; color: rgba(29,29,31,.62); }
.admin-model-row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
.admin-model-icon { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 9px; background: transparent; color: rgba(29, 29, 31, .72); padding: 0; cursor: pointer; }
.admin-model-icon:hover { background: #f1f1f1; }
.admin-model-icon svg { width: 16px; height: 16px; }
.admin-model-toggle { height: 32px; border: 0; border-radius: 9px; background: #f1f1f1; color: var(--ink-1); padding: 0 12px; font-size: 12px; cursor: pointer; }
.admin-model-toggle:hover { background: #e9e9e9; }
.admin-model-toggle.enabled { background: #fff2f2; color: #a33a32; }
.admin-model-toggle.enabled:hover { background: #ffe8e8; }
.admin-model-toggle:disabled,
.admin-model-icon:disabled { opacity: .45; cursor: not-allowed; }
.admin-model-state { color: var(--ink-3); font-size: 13px; }
.admin-model-edit-head { margin-bottom: 14px; }
.admin-model-edit-head h1 { margin: 0; font-size: 18px; font-weight: 560; }
.admin-model-form-card { border: 1px solid var(--line); border-radius: 18px; background: #fff; padding: 18px; box-shadow: 0 14px 38px rgba(0,0,0,.045); }
.admin-model-provider-option { width: 100%; min-height: 66px; display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; align-items: center; gap: 13px; padding: 12px; border: 1px solid rgba(15,15,15,.1); border-radius: 14px; background: #fafafa; margin-bottom: 16px; }
.admin-model-provider-option strong,
.admin-model-provider-option small { display: block; }
.admin-model-provider-option strong { margin-bottom: 3px; font-size: 14px; font-weight: 560; }
.admin-model-provider-option small { color: var(--ink-3); font-size: 12px; }
.admin-model-provider-option i { font-size: 12px; font-style: normal; color: #2f6b3d; }
.admin-model-provider-picker { display: grid; grid-template-columns: 90px minmax(0, 1fr); align-items: center; gap: 12px; margin-bottom: 16px; }
.admin-model-provider-picker > span { color: var(--ink-3); font-size: 12px; }
.admin-provider-select { width: 100%; }
.admin-provider-select-trigger { width: 100%; height: 38px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 8px; border: 1px solid rgba(15,15,15,.1); border-radius: 10px; background: #fff; color: var(--ink-1); padding: 0 11px; font-size: 13px; }
.admin-provider-select-trigger.open { border-color: rgba(29,29,31,.34); box-shadow: 0 0 0 3px rgba(15,15,15,.06); }
.admin-model-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
.admin-model-form-grid label { min-width: 0; }
.admin-model-form-grid label.wide { grid-column: 1 / -1; }
.admin-model-form-grid label span { display: block; margin-bottom: 7px; color: var(--ink-3); font-size: 12px; }
.admin-model-form-grid input { width: 100%; height: 38px; box-sizing: border-box; border: 1px solid rgba(15,15,15,.1); border-radius: 10px; background: #fff; color: var(--ink-1); padding: 0 11px; font-size: 13px; outline: none; }
.admin-model-form-grid input:focus { border-color: rgba(29,29,31,.34); box-shadow: 0 0 0 3px rgba(15,15,15,.06); }
.admin-model-form-grid input[readonly] { background: #f6f6f6; color: rgba(29,29,31,.62); }
.admin-model-form-grid .admin-model-visibility { min-height: 58px; display: grid; grid-template-columns: 18px minmax(0, 1fr); align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid rgba(15,15,15,.08); border-radius: 10px; cursor: pointer; }
.admin-model-form-grid .admin-model-visibility > input { position: absolute; opacity: 0; pointer-events: none; }
.admin-model-check { width: 18px; height: 18px; margin: 0; display: inline-flex !important; align-items: center; justify-content: center; border: 1px solid rgba(15,15,15,.2); border-radius: 5px; background: #fff; color: transparent; }
.admin-model-check svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
.admin-model-visibility > input:checked + .admin-model-check { background: #1d1d1f; border-color: #1d1d1f; color: #fff; }
.admin-model-visibility-copy { display: grid !important; gap: 3px; margin: 0 !important; }
.admin-model-visibility-copy strong { color: var(--ink-1); font-size: 13px; font-weight: 560; }
.admin-model-visibility-copy small { color: var(--ink-3); font-size: 11px; line-height: 1.4; }
.admin-model-edit-foot { display: grid; grid-template-columns: minmax(72px, auto) minmax(0, 1fr) auto; align-items: center; gap: 14px; margin-top: 18px; }
.admin-model-left-actions,
.admin-model-right-actions { display: flex; gap: 8px; }
.admin-model-right-actions { justify-content: flex-end; }
.admin-model-primary,
.admin-model-secondary,
.admin-model-danger { height: 34px; border-radius: 10px; padding: 0 14px; font-size: 13px; cursor: pointer; }
.admin-model-primary { border: 1px solid #1d1d1f; background: #1d1d1f; color: #fff; }
.admin-model-secondary { border: 1px solid var(--line); background: #fff; color: var(--ink-1); }
.admin-model-danger { border: 1px solid rgba(180,35,24,.16); background: #fff; color: #b42318; }
.admin-model-primary:disabled,
.admin-model-secondary:disabled,
.admin-model-danger:disabled { opacity: .5; cursor: not-allowed; }
.admin-model-status { min-width: 0; color: var(--ink-3); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.admin-model-status.ok { color: #2f6b3d; }
.admin-model-status.error { color: #b42318; }

.admin-scenes-panel {
  height: calc(100vh - 56px);
  overflow: auto;
  padding: 22px 40px 34px;
}
.admin-scenes-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}
.admin-scenes-head div { display: grid; gap: 5px; }
.admin-scenes-head strong { font-size: 18px; font-weight: 560; }
.admin-scenes-head span { color: var(--ink-3); font-size: 12px; line-height: 1.6; }
.admin-scenes-head button {
  height: 32px;
  border: 1px solid #1d1d1f;
  border-radius: 10px;
  background: #1d1d1f;
  color: #fff;
  padding: 0 14px;
  font-size: 13px;
  cursor: pointer;
}
.admin-scenes-head button:disabled { opacity: .45; cursor: not-allowed; }
.admin-scenes-list { display: grid; gap: 8px; }
.admin-scene-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  min-height: 72px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
}
.admin-scene-main { min-width: 0; display: grid; gap: 4px; }
.admin-scene-main strong { font-size: 13px; font-weight: 560; color: var(--ink-1); }
.admin-scene-main small { color: var(--ink-2); font-size: 12px; line-height: 1.5; }
.admin-scene-main code { width: fit-content; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink-3); background: #f5f5f5; border-radius: 6px; padding: 2px 6px; font-size: 11px; }
.admin-scene-select { width: 138px; }
.admin-scene-select :deep(.app-select-trigger) { width: 100%; height: 32px; padding: 0; border: 0; background: transparent; }
.admin-scene-select-trigger {
  width: 100%;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px 0 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: var(--ink-1);
  font-size: 12px;
  box-sizing: border-box;
}
.admin-scene-select-trigger.open,
.admin-scene-select-trigger:hover { background: #f7f7f7; border-color: #d6d6d6; }
.admin-scene-select-trigger svg { flex: 0 0 auto; color: var(--ink-3); }
.admin-scenes-status { margin: 12px 0 0; color: var(--ink-3); font-size: 12px; }
.admin-scenes-status.ok { color: #2f6b3d; }
.admin-scenes-status.error { color: #b42318; }

.admin-config-panel {
  height: calc(100vh - 56px);
  overflow: auto;
  padding: 22px 40px 34px;
}
.admin-config-head {
  max-width: 920px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}
.admin-config-head div { display: grid; gap: 5px; }
.admin-config-head strong { font-size: 18px; font-weight: 560; }
.admin-config-head span { color: var(--ink-3); font-size: 12px; line-height: 1.6; }
.admin-config-head button {
  height: 32px;
  flex: 0 0 auto;
  border: 1px solid #1d1d1f;
  border-radius: 10px;
  background: #1d1d1f;
  color: #fff;
  padding: 0 14px;
  font-size: 13px;
  cursor: pointer;
}
.admin-config-head button:disabled { opacity: .45; cursor: not-allowed; }
.admin-config-grid {
  max-width: 920px;
  display: grid;
  grid-template-columns: minmax(260px, .78fr) minmax(360px, 1.22fr);
  gap: 14px;
}
.admin-config-card {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
  padding: 16px;
}
.admin-config-card h3 { margin: 0 0 12px; font-size: 14px; font-weight: 560; }
.admin-config-card ul {
  margin: 0;
  padding-left: 17px;
  color: var(--ink-2);
  font-size: 12px;
  line-height: 1.8;
}
.admin-config-card p {
  margin: 14px 0 0;
  color: #9a3412;
  font-size: 12px;
  line-height: 1.7;
}
.admin-config-card.import { display: grid; gap: 12px; }
.admin-config-card textarea {
  width: 100%;
  min-height: 240px;
  resize: vertical;
  border: 1px solid rgba(15,15,15,.1);
  border-radius: 12px;
  background: #fbfbfb;
  color: var(--ink-1);
  padding: 12px;
  font-size: 12px;
  line-height: 1.6;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  outline: none;
}
.admin-config-card textarea:focus {
  border-color: rgba(29,29,31,.34);
  box-shadow: 0 0 0 3px rgba(15,15,15,.06);
}
.admin-config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.admin-config-status {
  margin: 0 !important;
  color: var(--ink-3) !important;
  font-size: 12px;
}
.admin-config-status.ok { color: #2f6b3d !important; }
.admin-config-status.error { color: #b42318 !important; }


.system-knowledge-panel {
  width: min(1120px, calc(100vw - 310px));
  margin: 0 auto;
  padding: 18px 0 42px;
}
.system-knowledge-head,
.system-knowledge-edit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}
.system-knowledge-head div { display: grid; gap: 5px; }
.system-knowledge-head strong,
.system-knowledge-edit-head h1 { margin: 0; font-size: 18px; font-weight: 560; }
.system-knowledge-head span { color: var(--ink-3); font-size: 12px; }
.system-knowledge-actions { display: flex; align-items: center; gap: 8px; }
.system-knowledge-actions button,
.system-knowledge-filters button { height: 34px; border: 0; border-radius: 10px; background: #f4f4f4; color: var(--ink-1); padding: 0 12px; font-size: 13px; cursor: pointer; }
.system-knowledge-actions button.primary { display: inline-flex; align-items: center; gap: 5px; background: #1d1d1f; color: #fff; }
.system-knowledge-actions button svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.system-knowledge-actions button:hover,
.system-knowledge-filters button:hover { background: #ececec; }
.system-knowledge-actions button.primary:hover { background: #111; }
.system-knowledge-filters { display: grid; grid-template-columns: minmax(0, 1fr) 150px auto; align-items: center; gap: 8px; margin-bottom: 14px; }
.system-knowledge-filters input { width: 100%; height: 36px; box-sizing: border-box; border: 1px solid rgba(15,15,15,.1); border-radius: 10px; padding: 0 11px; outline: none; font-size: 13px; }
.system-knowledge-filters input:focus { border-color: rgba(29,29,31,.34); box-shadow: 0 0 0 3px rgba(15,15,15,.06); }
.system-knowledge-list { display: grid; gap: 9px; }
.system-knowledge-row { min-height: 68px; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 14px; background: #fff; cursor: pointer; }
.system-knowledge-row:hover { background: #fcfcfc; }
.system-knowledge-row.disabled { opacity: .62; }
.system-knowledge-main { display: grid; min-width: 0; gap: 5px; }
.system-knowledge-main strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink-1); font-size: 14px; font-weight: 560; }
.system-knowledge-main small { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink-3); font-size: 12px; }
.system-knowledge-meta { display: inline-flex; align-items: center; gap: 8px; }
.system-knowledge-meta i { height: 24px; display: inline-flex; align-items: center; padding: 0 9px; border-radius: 999px; background: #f0f7f1; color: #2f6b3d; font-size: 11px; font-style: normal; font-weight: 500; }
.system-knowledge-meta i.off { background: #f6f6f6; color: var(--ink-3); }
.system-knowledge-meta code { color: var(--ink-3); font-size: 12px; }
.system-knowledge-editor { display: grid; grid-template-columns: minmax(0, 1.02fr) minmax(320px, .98fr); gap: 14px; }
.system-knowledge-form,
.system-knowledge-preview { border: 1px solid var(--line); border-radius: 16px; background: #fff; padding: 16px; }
.system-knowledge-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.system-knowledge-form label { min-width: 0; }
.system-knowledge-form label.wide { grid-column: 1 / -1; }
.system-knowledge-form label span { display: block; margin-bottom: 7px; color: var(--ink-3); font-size: 12px; }
.system-knowledge-form input,
.system-knowledge-form textarea { width: 100%; box-sizing: border-box; border: 1px solid rgba(15,15,15,.1); border-radius: 10px; background: #fff; color: var(--ink-1); padding: 0 11px; font-size: 13px; outline: none; }
.system-knowledge-form input { height: 38px; }
.system-knowledge-form textarea { min-height: 390px; resize: vertical; padding: 11px; line-height: 1.6; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.system-knowledge-form input:focus,
.system-knowledge-form textarea:focus { border-color: rgba(29,29,31,.34); box-shadow: 0 0 0 3px rgba(15,15,15,.06); }
.system-knowledge-preview { min-width: 0; max-height: 560px; overflow: auto; }
.system-knowledge-preview > strong { display: block; margin-bottom: 10px; font-size: 13px; font-weight: 560; }
.system-knowledge-foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 14px; }
.system-knowledge-foot > div { display: flex; gap: 8px; }
.system-knowledge-status { color: var(--ink-3); font-size: 12px; }
.system-knowledge-status.ok { color: #2f6b3d; }
.system-knowledge-status.error { color: #b42318; }

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

.trace-marker-filter {
  grid-column: 1 / -1;
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
.trace-run-row.active,
.trace-run-row.active.checked {
  background: rgba(18, 18, 18, 0.075);
  box-shadow: inset 3px 0 0 #111;
}
.trace-run-row.checked { background: rgba(18, 18, 18, 0.026); }
.trace-run-row.active .trace-row-title { font-weight: 620; }
.trace-run-row.active .trace-audit-marker {
  border-color: rgba(18, 18, 18, 0.24);
  background: #fff;
  color: rgba(18, 18, 18, 0.76);
}

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
