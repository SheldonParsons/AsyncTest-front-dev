<template>
  <div :class="['debug-console', { 'debug-console-window': isDebugWindow }]">
    <aside class="debug-sidebar">
      <div class="debug-brand">
        <div class="debug-mark">
          <el-icon><Monitor /></el-icon>
        </div>
        <div>
          <h1>Admin Debug</h1>
          <p>Trace Console</p>
        </div>
      </div>

      <div class="debug-kb-filter">
        <label>知识库</label>
        <div class="debug-kb-row">
          <select v-model="selectedKbId">
            <option value="">全部 / 未选择</option>
            <option v-for="kb in kbOptions" :key="kb.id" :value="String(kb.id)">
              {{ kb.name }} · #{{ kb.id }}
            </option>
          </select>
          <button title="刷新" @click="refreshActive">
            <el-icon><Refresh /></el-icon>
          </button>
        </div>
      </div>

      <nav class="debug-nav">
        <div v-for="group in navGroups" :key="group.title" class="debug-nav-group">
          <span>{{ group.title }}</span>
          <button
            v-for="item in group.items"
            :key="item.key"
            :class="{ active: activeView === item.key }"
            @click="selectView(item.key)"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            {{ item.label }}
          </button>
        </div>
      </nav>
    </aside>

    <main class="debug-main">
      <header class="debug-header">
        <div>
          <p class="debug-eyebrow">{{ activeMeta.group }}</p>
          <h2>{{ activeMeta.label }}</h2>
        </div>
        <div class="debug-actions">
          <button :title="isDebugWindow ? '关闭调试窗口' : '返回上一个页面'" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            {{ isDebugWindow ? '关闭' : '返回' }}
          </button>
          <button @click="refreshActive">
            <el-icon><Refresh /></el-icon>
            刷新
          </button>
          <button v-if="isTraceView" class="danger-ghost" @click="handleClearTrace">
            <el-icon><Delete /></el-icon>
            清空日志
          </button>
        </div>
      </header>

      <section v-if="isTraceView" class="debug-trace-layout">
        <div class="trace-list">
          <div v-if="loading" class="debug-empty">加载中...</div>
          <div v-else-if="traceGroups.length === 0" class="debug-empty">暂无日志</div>
          <template v-else>
            <button
              v-for="group in traceGroups"
              :key="group.trace_id"
              :class="['trace-card', { active: selectedTraceId === group.trace_id }]"
              @click="selectedTraceId = group.trace_id"
            >
              <span class="trace-action">{{ group.action }}</span>
              <strong>{{ group.title }}</strong>
              <small>{{ group.events.length }} events · {{ formatTime(group.start) }} → {{ formatTime(group.latest) }}</small>
              <em>{{ formatDuration(group.durationMs) }}</em>
            </button>
          </template>
        </div>

        <div class="trace-detail">
          <div v-if="!selectedTrace" class="debug-empty">选择一条 trace 查看详情</div>
          <template v-else>
            <div class="trace-detail-head">
              <div>
                <p>{{ selectedTrace.action }}</p>
                <h3>{{ selectedTrace.trace_id }}</h3>
              </div>
              <button class="copy-btn" @click="copy(selectedTrace.trace_id)">复制 ID</button>
            </div>

            <div class="timeline">
              <article v-for="event in selectedTrace.events" :key="event.id" :class="['timeline-event', event.level]">
                <div class="timeline-dot" />
                <div class="timeline-body">
                  <div class="timeline-title">
                    <strong>{{ event.step }}</strong>
                    <span>{{ formatTime(event.created_at) }}</span>
                  </div>
                  <p>{{ event.message }}</p>

                  <div v-if="markdownPayload(event)" class="markdown-panel" v-html="renderMarkdown(markdownPayload(event) || '')" />
                  <pre v-else-if="hasPayload(event)" class="payload-json">{{ stringify(event.payload) }}</pre>
                </div>
              </article>
            </div>
          </template>
        </div>
      </section>

      <section v-else-if="activeView === 'llmConfig'" class="llm-config-layout">
        <aside class="llm-provider-list">
          <div class="llm-panel-head">
            <div>
              <h3>Provider</h3>
              <p>当前用户的 LLM 服务配置</p>
            </div>
            <button @click="startNewProvider">新增</button>
          </div>

          <div class="llm-template-actions">
            <button @click="applyProviderTemplate('gpt')">GPT 模板</button>
            <button @click="applyProviderTemplate('deepseek')">DeepSeek 模板</button>
          </div>

          <div v-if="loading" class="debug-empty">加载中...</div>
          <div v-else-if="llmProviders.length === 0" class="debug-empty">暂无 Provider，点击“新增”开始配置。</div>
          <button
            v-for="provider in llmProviders"
            :key="provider.id"
            :class="['llm-provider-card', { active: editingProvider?.id === provider.id }]"
            @click="selectProvider(provider)"
          >
            <span>
              <strong>{{ provider.name }}</strong>
              <em v-if="provider.is_active">当前启用</em>
            </span>
            <small>{{ provider.provider_type || 'openai-compatible' }}</small>
            <code>{{ provider.base_url || 'OpenAI SDK 默认地址' }}</code>
          </button>
        </aside>

        <div class="llm-editor">
          <div class="llm-panel-head">
            <div>
              <h3>配置编辑</h3>
              <p>{{ editingProvider?.id ? `#${editingProvider.id}` : '新建 Provider' }}</p>
            </div>
            <div class="tool-actions">
              <button @click="saveLLMProvider">保存</button>
              <button :disabled="!editingProvider?.id" @click="activateProvider">设为当前</button>
              <button :disabled="!editingProvider?.id" @click="testProvider">测试连接</button>
              <button :disabled="!editingProvider?.id" class="danger" @click="removeProvider">删除</button>
            </div>
          </div>
          <div v-if="llmTestStatus" :class="['llm-test-status', llmTestOk === false ? 'error' : llmTestOk === true ? 'success' : '']">
            {{ llmTestStatus }}
          </div>

          <div class="llm-form-grid">
            <label>
              <span>名称</span>
              <input v-model="providerDraft.name" placeholder="例如：GPT / DeepSeek" />
            </label>
            <label>
              <span>Provider 类型</span>
              <input v-model="providerDraft.provider_type" placeholder="openai-compatible" />
            </label>
            <label>
              <span>Base URL</span>
              <input v-model="providerDraft.base_url" placeholder="GPT 留空，DeepSeek 填 https://api.deepseek.com" />
            </label>
            <label>
              <span>Proxy URL</span>
              <input v-model="providerDraft.proxy_url" placeholder="可选，例如 http://127.0.0.1:7890" />
            </label>
            <label class="llm-form-wide">
              <span>API Key</span>
              <input v-model="providerDraft.api_key" placeholder="开发阶段完整显示，方便调试" />
            </label>
            <label>
              <span>最大重试次数</span>
              <input v-model.number="providerDraft.max_retries" type="number" min="0" />
            </label>
            <label v-for="key in timeoutKeys" :key="key">
              <span>Timeout {{ key }}</span>
              <input v-model.number="providerDraft.timeout_config[key]" type="number" min="1" />
            </label>
          </div>

          <div class="llm-model-map">
            <div class="llm-panel-head compact">
              <div>
                <h3>模型映射</h3>
                <p>不同业务场景可以使用不同模型，空值会走 mini 或 .env 兜底。</p>
              </div>
            </div>
            <div v-if="isDeepSeekDraft" class="llm-bulk-model">
              <label>
                <span>DeepSeek 批量模型</span>
                <select v-model="deepseekBulkModel" @change="applyDeepSeekBulkModel">
                  <option value="deepseek-v4-pro">deepseek-v4-pro</option>
                  <option value="deepseek-v4-flash">deepseek-v4-flash</option>
                </select>
              </label>
              <button @click="applyDeepSeekBulkModel">批量更新模型映射</button>
            </div>
            <div class="llm-model-grid">
              <label v-for="key in modelConfigKeys" :key="key">
                <span>{{ modelConfigLabel(key) }}</span>
                <input v-model="modelDraft[key]" placeholder="例如 gpt-5.4-mini / gpt-5.5 / deepseek-v4-pro" />
              </label>
            </div>
          </div>

          <div class="llm-runtime-panel">
            <h3>当前生效配置</h3>
            <pre class="payload-json">{{ llmRuntime ? stringify(llmRuntime) : '暂无运行时配置' }}</pre>
            <h3>最近保存请求</h3>
            <pre class="payload-json">{{ llmLastSavePayload || '暂无保存请求' }}</pre>
            <h3>测试结果</h3>
            <pre class="payload-json">{{ llmTestResult || '暂无测试结果' }}</pre>
          </div>
        </div>
      </section>

      <section v-else-if="activeView === 'maintenance'" class="maintenance-grid">
        <div class="tool-panel">
          <h3>清空 Phase 5 索引</h3>
          <p>只清理当前 KB 的自动索引和缓存。请先填写 KB ID。</p>
          <div class="tool-actions">
            <button :disabled="!kbId" @click="clearIndex('term')">清空 term</button>
            <button :disabled="!kbId" @click="clearIndex('ref')">清空 ref</button>
            <button :disabled="!kbId" @click="clearIndex('outline')">清空 outline cache</button>
            <button :disabled="!kbId" class="danger" @click="clearIndex('all')">清空全部</button>
          </div>
        </div>
        <div class="tool-panel">
          <h3>最近维护结果</h3>
          <pre class="payload-json">{{ maintenanceResult || '暂无操作' }}</pre>
        </div>
      </section>

      <section v-else class="data-panel">
        <div v-if="!kbId" class="debug-empty">请输入 KB ID 后查看数据表</div>
        <template v-else>
          <div class="data-table-wrap">
            <table>
              <thead>
                <tr>
                  <th v-for="col in tableColumns" :key="col">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in tableRows" :key="row.id || row.term || index" @click="selectedRow = row">
                  <td v-for="col in tableColumns" :key="col">{{ cell(row, col) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <aside class="row-inspector">
            <h3>详情</h3>
            <pre class="payload-json">{{ selectedRow ? stringify(selectedRow) : '选择一行查看 JSON' }}</pre>
          </aside>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import { ArrowLeft, Delete, Document, Files, Monitor, Refresh, Setting, Tickets, Tools, Warning } from '@element-plus/icons-vue'
import {
  activateLLMProvider,
  clearDebugEvents,
  clearDebugIndex,
  createLLMProvider,
  deleteLLMProvider,
  getLLMRuntimeConfig,
  listDebugEvents,
  listDebugOutlineCache,
  listDebugRefs,
  listDebugTermDict,
  listDebugTermIndex,
  listLLMProviders,
  testLLMProvider,
  updateLLMProvider,
  type DebugTraceEvent,
  type LLMProviderConfig,
  type LLMProviderPayload,
  type LLMRuntimeConfig,
} from './api'
import { listKB } from '@/views/electron_views/agent/knowledge/api'
import type { KnowledgeBase } from '@/types/knowledge'

type ViewKey = 'trace' | 'summary' | 'llm' | 'index' | 'refs' | 'termIndex' | 'termDict' | 'outline' | 'maintenance' | 'llmConfig'

const activeView = ref<ViewKey>('trace')
const route = useRoute()
const router = useRouter()
const selectedKbId = ref('')
const kbOptions = ref<KnowledgeBase[]>([])
const events = ref<DebugTraceEvent[]>([])
const tableRows = ref<any[]>([])
const selectedTraceId = ref('')
const selectedRow = ref<any | null>(null)
const loading = ref(false)
const maintenanceResult = ref('')
const llmProviders = ref<LLMProviderConfig[]>([])
const editingProvider = ref<LLMProviderConfig | null>(null)
const llmRuntime = ref<LLMRuntimeConfig | null>(null)
const llmTestResult = ref('')
const llmTestStatus = ref('')
const llmTestOk = ref<boolean | null>(null)
const llmLastSavePayload = ref('')
const deepseekBulkModel = ref('deepseek-v4-pro')
const timeoutKeys = ['connect', 'read', 'write', 'pool'] as const
const modelConfigKeys = [
  'mini',
  'strong',
  'chat',
  'kb_markdown_polish',
  'kb_mention_inventory',
  'kb_concept_candidate_build',
  'kb_concept_candidate_coverage_check',
  'kb_concept_chunk_score',
  'kb_concept_global_rerank',
  'kb_concept_impact',
  'kb_concept_quality_check',
  'kb_block_rewrite',
  'kb_concept_decision_apply',
  'kb_block_summary_routing',
  'kb_block_summary_generation',
  'kb_node_summary_routing',
  'kb_node_summary_generation',
  'kb_node_subtree_summary',
  'kb_summary',
  'kb_system_summary',
  'kb_chat_retrieval',
  'kb_chat_answer',
] as const
const providerDraft = ref<LLMProviderPayload>(newProviderDraft())
const modelDraft = ref<Record<typeof modelConfigKeys[number], string>>(emptyModelDraft())

const navGroups = [
  {
    title: '运行日志',
    items: [
      { key: 'trace', label: '行为追踪', icon: Document },
      { key: 'summary', label: 'Summary 日志', icon: Tickets },
      { key: 'llm', label: 'LLM 对话', icon: Files },
      { key: 'index', label: '索引执行', icon: Warning },
    ],
  },
  {
    title: '数据检查',
    items: [
      { key: 'refs', label: 'kb_block_ref', icon: Files },
      { key: 'termIndex', label: 'kb_term_index', icon: Files },
      { key: 'termDict', label: 'kb_term_dict', icon: Files },
      { key: 'outline', label: 'outline cache', icon: Files },
    ],
  },
  {
    title: '维护工具',
    items: [
      { key: 'maintenance', label: '清空索引', icon: Tools },
      { key: 'llmConfig', label: 'LLM 配置', icon: Setting },
    ],
  },
] as const

const kbId = computed(() => selectedKbId.value ? Number(selectedKbId.value) : null)
const windowKey = computed(() => String(route.query.windowKey || 'main'))
const isDebugWindow = computed(() => windowKey.value === 'admin-debug-console')
const isTraceView = computed(() => ['trace', 'summary', 'llm', 'index'].includes(activeView.value))
const isDeepSeekDraft = computed(() => (providerDraft.value.provider_type || '').trim().toLowerCase() === 'deepseek')
const activeMeta = computed(() => {
  for (const group of navGroups) {
    const item = group.items.find((it) => it.key === activeView.value)
    if (item) return { group: group.title, label: item.label }
  }
  return { group: '', label: '' }
})

const traceGroups = computed(() => {
  const map = new Map<string, DebugTraceEvent[]>()
  for (const event of events.value) {
    const list = map.get(event.trace_id) || []
    list.push(event)
    map.set(event.trace_id, list)
  }
  return Array.from(map.entries()).map(([trace_id, list]) => {
    const sorted = [...list].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    return {
      trace_id,
      events: sorted,
      action: sorted[0]?.action || '',
      title: sorted[0]?.message || trace_id,
      start: sorted[0]?.created_at,
      latest: sorted[sorted.length - 1]?.created_at,
      durationMs: diffMs(sorted[0]?.created_at, sorted[sorted.length - 1]?.created_at),
    }
  }).sort((a, b) => String(b.latest).localeCompare(String(a.latest)))
})

const selectedTrace = computed(() => traceGroups.value.find((group) => group.trace_id === selectedTraceId.value) || traceGroups.value[0])

const tableColumns = computed(() => {
  if (activeView.value === 'refs') return ['matched_term', 'status', 'confidence', 'source_node_id', 'source_block_id', 'target_node_id', 'updated_at']
  if (activeView.value === 'termIndex') return ['term', 'context', 'confidence', 'node_id', 'block_id', 'extractor', 'updated_at']
  if (activeView.value === 'termDict') return ['canonical', 'type', 'status', 'synonyms', 'updated_at']
  if (activeView.value === 'outline') return ['level', 'scope_type', 'scope_id', 'content_hash', 'compiled_at', 'updated_at']
  return []
})

onMounted(async () => {
  await loadKbOptions()
  await refreshActive()
})

async function loadKbOptions() {
  kbOptions.value = await listKB()
}

function selectView(key: ViewKey) {
  activeView.value = key
  selectedRow.value = null
  refreshActive()
}

function goBack() {
  if (isDebugWindow.value && window.electronAPI?.wm?.close) {
    window.electronAPI.wm.close(windowKey.value)
    return
  }
  if (window.history.state?.back) {
    router.back()
    return
  }
  router.push('/home')
}

async function refreshActive() {
  loading.value = true
  try {
    if (isTraceView.value) {
      const category = activeView.value === 'trace' ? undefined : activeView.value
      events.value = await listDebugEvents({ kb_id: kbId.value, category, limit: 500 })
      selectedTraceId.value = traceGroups.value[0]?.trace_id || ''
    } else if (activeView.value === 'llmConfig') {
      await loadLLMConfig()
    } else if (kbId.value && activeView.value === 'refs') {
      tableRows.value = await listDebugRefs(kbId.value)
    } else if (kbId.value && activeView.value === 'termIndex') {
      tableRows.value = await listDebugTermIndex(kbId.value)
    } else if (kbId.value && activeView.value === 'termDict') {
      tableRows.value = await listDebugTermDict(kbId.value)
    } else if (kbId.value && activeView.value === 'outline') {
      tableRows.value = await listDebugOutlineCache(kbId.value)
    }
  } finally {
    loading.value = false
  }
}

function newProviderDraft(): LLMProviderPayload {
  return {
    name: '',
    provider_type: 'openai-compatible',
    base_url: '',
    api_key: '',
    proxy_url: '',
    timeout_config: {
      connect: 30,
      read: 240,
      write: 60,
      pool: 30,
    },
    max_retries: 0,
    model_config: Object.fromEntries(modelConfigKeys.map((key) => [key, ''])),
    enabled: true,
  }
}

function emptyModelDraft() {
  return Object.fromEntries(modelConfigKeys.map((key) => [key, ''])) as Record<typeof modelConfigKeys[number], string>
}

function setModelDraft(modelConfig: Record<string, any> = {}) {
  modelDraft.value = Object.fromEntries(modelConfigKeys.map((key) => [key, String(modelConfig[key] || '')])) as Record<typeof modelConfigKeys[number], string>
}

function modelDraftPayload() {
  return Object.fromEntries(
    modelConfigKeys
      .map((key) => [key, String(modelDraft.value[key] || '').trim()])
      .filter(([, value]) => value),
  )
}

function providerToDraft(provider: LLMProviderConfig): LLMProviderPayload {
  return {
    name: provider.name || '',
    provider_type: provider.provider_type || 'openai-compatible',
    base_url: provider.base_url || '',
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
      ...Object.fromEntries(modelConfigKeys.map((key) => [key, ''])),
      ...(provider.model_config || {}),
    },
    enabled: provider.enabled !== false,
  }
}

async function loadLLMConfig() {
  const [providers, runtime] = await Promise.all([
    listLLMProviders(),
    getLLMRuntimeConfig(),
  ])
  llmProviders.value = providers
  llmRuntime.value = runtime
  if (!editingProvider.value && providers.length) {
    selectProvider(providers.find((item) => item.is_active) || providers[0])
  }
}

function selectProvider(provider: LLMProviderConfig) {
  editingProvider.value = provider
  providerDraft.value = providerToDraft(provider)
  setModelDraft(provider.model_config || {})
  syncDeepSeekBulkModelFromDraft()
}

function startNewProvider() {
  editingProvider.value = null
  providerDraft.value = newProviderDraft()
  setModelDraft({})
  llmTestResult.value = ''
  llmTestStatus.value = ''
  llmTestOk.value = null
}

function templateModelConfig(type: 'gpt' | 'deepseek') {
  const isDeepSeek = type === 'deepseek'
  return Object.fromEntries(modelConfigKeys.map((key) => {
    if (isDeepSeek) return [key, deepseekBulkModel.value || 'deepseek-v4-pro']
    const shouldUseStrongModel = key === 'strong'
      || key === 'chat'
      || key === 'kb_chat_answer'
      || key === 'kb_node_subtree_summary'
      || key === 'kb_summary'
      || key === 'kb_system_summary'
      || key.includes('global_rerank')
      || key.includes('quality_check')
    return [key, shouldUseStrongModel ? 'gpt-5.5' : 'gpt-5.4-mini']
  }))
}

function applyProviderTemplate(type: 'gpt' | 'deepseek') {
  const isDeepSeek = type === 'deepseek'
  const model_config = templateModelConfig(type)
  providerDraft.value = {
    ...providerDraft.value,
    name: isDeepSeek ? 'DeepSeek' : 'GPT',
    provider_type: isDeepSeek ? 'deepseek' : 'gpt',
    base_url: isDeepSeek ? 'https://api.deepseek.com' : '',
    model_config,
  }
  setModelDraft(model_config)
}

function applyDeepSeekBulkModel() {
  const model = String(deepseekBulkModel.value || 'deepseek-v4-pro')
  const model_config = Object.fromEntries(modelConfigKeys.map((key) => [key, model]))
  providerDraft.value = {
    ...providerDraft.value,
    model_config,
  }
  setModelDraft(model_config)
}

function syncDeepSeekBulkModelFromDraft() {
  if (!isDeepSeekDraft.value) return
  const values = Object.values(modelDraft.value || {})
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  if (values.includes('deepseek-v4-flash') && !values.includes('deepseek-v4-pro')) {
    deepseekBulkModel.value = 'deepseek-v4-flash'
  } else {
    deepseekBulkModel.value = 'deepseek-v4-pro'
  }
}

function modelConfigLabel(key: typeof modelConfigKeys[number]) {
  const labels: Record<typeof modelConfigKeys[number], string> = {
    mini: '默认轻量模型',
    strong: '默认强模型',
    chat: '聊天问答模型',
    kb_markdown_polish: '知识描述美化模型',
    kb_mention_inventory: '概念分析：提及项枚举模型',
    kb_concept_candidate_build: '概念分析：候选概念成型模型',
    kb_concept_candidate_coverage_check: '概念分析：候选完整性检查模型',
    kb_concept_chunk_score: '概念分析：概念库分片评分模型',
    kb_concept_global_rerank: '概念分析：全局精排模型',
    kb_concept_impact: '概念分析：影响决策模型',
    kb_concept_quality_check: '概念分析：质量检查模型',
    kb_block_rewrite: '概念分析：无损块重组模型',
    kb_concept_decision_apply: '概念决策：确认执行合并模型',
    kb_block_summary_routing: '块摘要：路由判断模型',
    kb_block_summary_generation: '块摘要：生成模型',
    kb_node_summary_routing: '节点摘要：路由判断模型',
    kb_node_summary_generation: '节点摘要：生成模型',
    kb_node_subtree_summary: '节点摘要：子树索引摘要生成模型',
    kb_summary: '知识库摘要：生成模型',
    kb_system_summary: '系统级摘要：生成模型',
    kb_chat_retrieval: '聊天 Agent：召回规划模型',
    kb_chat_answer: '聊天 Agent：正式回答模型',
  }
  return labels[key] || key
}

async function saveLLMProvider() {
  if (!providerDraft.value.name?.trim()) {
    window.alert('请填写 Provider 名称')
    return
  }
  const providerType = providerDraft.value.provider_type?.trim() || 'openai-compatible'
  const modelConfig = modelDraftPayload()
  const hasAnyModel = Object.values(modelConfig).some((value) => String(value || '').trim())
  if (!hasAnyModel && providerType === 'deepseek') {
    Object.assign(modelConfig, templateModelConfig('deepseek'))
  } else if (!hasAnyModel && providerType === 'gpt') {
    Object.assign(modelConfig, templateModelConfig('gpt'))
  }
  const payload = {
    ...providerDraft.value,
    name: providerDraft.value.name.trim(),
    provider_type: providerType,
    base_url: providerDraft.value.base_url?.trim() || '',
    proxy_url: providerDraft.value.proxy_url?.trim() || '',
    model_config: modelConfig,
    timeout_config: providerDraft.value.timeout_config || {},
  }
  llmLastSavePayload.value = stringify(payload)
  const saved = editingProvider.value?.id
    ? await updateLLMProvider(editingProvider.value.id, payload)
    : await createLLMProvider(payload)
  editingProvider.value = saved
  providerDraft.value = providerToDraft(saved)
  await loadLLMConfig()
}

async function activateProvider() {
  if (!editingProvider.value?.id) return
  await activateLLMProvider(editingProvider.value.id)
  await loadLLMConfig()
}

async function testProvider() {
  if (!editingProvider.value?.id) return
  llmTestOk.value = null
  llmTestStatus.value = '测试连接中...'
  llmTestResult.value = '测试中...'
  try {
    const model = String(modelDraft.value.chat || modelDraft.value.mini || deepseekBulkModel.value || '').trim()
    const result = await testLLMProvider(editingProvider.value.id, { model })
    llmTestResult.value = stringify(result)
    llmTestOk.value = !!result.ok
    llmTestStatus.value = result.ok
      ? `测试成功，模型 ${result.model}，耗时 ${result.elapsed_ms} ms`
      : `测试失败，模型 ${result.model}：${result.error || '未知错误'}`
  } catch (error: any) {
    llmTestOk.value = false
    llmTestStatus.value = `测试请求失败：${error?.message || String(error)}`
    llmTestResult.value = llmTestStatus.value
  }
}

async function removeProvider() {
  if (!editingProvider.value?.id) return
  if (!window.confirm(`确认删除 Provider「${editingProvider.value.name}」？`)) return
  await deleteLLMProvider(editingProvider.value.id)
  startNewProvider()
  await loadLLMConfig()
}

async function handleClearTrace() {
  await clearDebugEvents(kbId.value)
  await refreshActive()
}

async function clearIndex(target: 'term' | 'ref' | 'outline' | 'all') {
  if (!kbId.value) return
  if (!window.confirm(`确认清空 ${target}？`)) return
  const result = await clearDebugIndex(kbId.value, target)
  maintenanceResult.value = stringify(result)
  await refreshActive()
}

function cell(row: any, col: string) {
  const value = row[col]
  if (Array.isArray(value)) return value.join(', ')
  if (value && typeof value === 'object') return JSON.stringify(value)
  return value ?? ''
}

function stringify(value: any) {
  return JSON.stringify(value, null, 2)
}

function hasPayload(event: DebugTraceEvent) {
  return event.payload && Object.keys(event.payload).length > 0
}

function markdownPayload(event: DebugTraceEvent) {
  return event.payload?.response_markdown || event.payload?.prompt_markdown || ''
}

function renderMarkdown(src: string) {
  return marked.parse(src || '') as string
}

function formatTime(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

function diffMs(start?: string | null, end?: string | null) {
  if (!start || !end) return 0
  return Math.max(0, new Date(end).getTime() - new Date(start).getTime())
}

function formatDuration(ms: number) {
  if (!ms) return '0 ms'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

async function copy(text: string) {
  await navigator.clipboard?.writeText(text)
}
</script>

<style scoped lang="scss">
.debug-console {
  height: calc(100vh - 55px);
  min-height: 0;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  background: #f5f7fb;
  color: #172033;
  overflow: hidden;
}

.debug-console-window {
  height: 100vh;
}

.debug-sidebar {
  border-right: 1px solid #d8dee9;
  background: #111827;
  color: #e5e7eb;
  padding: 16px;
  overflow: auto;
}

.debug-brand {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 4px 18px;

  h1 {
    font-size: 17px;
    margin: 0;
  }

  p {
    margin: 2px 0 0;
    color: #9ca3af;
    font-size: 12px;
  }
}

.debug-mark {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: #0f766e;
}

.debug-kb-filter {
  label {
    font-size: 12px;
    color: #9ca3af;
  }
}

.debug-kb-row {
  display: grid;
  grid-template-columns: 1fr 34px;
  gap: 8px;
  margin-top: 6px;

  input,
  select,
  button {
    height: 34px;
    border-radius: 6px;
    border: 1px solid #374151;
    background: #1f2937;
    color: #f9fafb;
  }

  input,
  select {
    padding: 0 10px;
    min-width: 0;
  }
}

.debug-nav-group {
  margin-top: 20px;

  > span {
    display: block;
    font-size: 12px;
    color: #9ca3af;
    margin-bottom: 6px;
  }

  button {
    width: 100%;
    height: 36px;
    border: 0;
    border-radius: 6px;
    color: #cbd5e1;
    background: transparent;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    cursor: pointer;
    text-align: left;

    &.active,
    &:hover {
      background: #243244;
      color: #ffffff;
    }
  }
}

.debug-main {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.debug-header {
  height: 72px;
  padding: 0 22px;
  border-bottom: 1px solid #dde3ee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;

  h2 {
    margin: 0;
    font-size: 20px;
  }
}

.debug-console-window {
  .debug-header {
    -webkit-app-region: drag;
  }

  .debug-actions,
  .debug-actions button {
    -webkit-app-region: no-drag;
  }
}

.debug-eyebrow {
  margin: 0 0 4px;
  font-size: 12px;
  color: #64748b;
}

.debug-actions,
.tool-actions {
  display: flex;
  gap: 8px;

  button {
    height: 34px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    cursor: pointer;

    &.danger,
    &.danger-ghost {
      border-color: #fecaca;
      color: #b91c1c;
    }

    &:disabled {
      opacity: .45;
      cursor: not-allowed;
    }
  }
}

.debug-trace-layout {
  min-height: 0;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
}

.trace-list {
  border-right: 1px solid #dde3ee;
  padding: 14px;
  overflow: auto;
}

.trace-card {
  width: 100%;
  display: block;
  text-align: left;
  padding: 12px;
  border: 1px solid #dbe3ef;
  background: #ffffff;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;

  &.active {
    border-color: #0f766e;
    box-shadow: inset 3px 0 0 #0f766e;
  }

  strong,
  small,
  span {
    display: block;
  }

  small {
    color: #64748b;
    margin-top: 6px;
  }

  em {
    display: inline-block;
    margin-top: 6px;
    font-style: normal;
    color: #0f766e;
    font-size: 12px;
    font-weight: 700;
  }
}

.trace-action {
  color: #0f766e;
  font-size: 12px;
  margin-bottom: 4px;
}

.trace-detail {
  min-width: 0;
  overflow: auto;
  padding: 18px 24px;
}

.trace-detail-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;

  p,
  h3 {
    margin: 0;
  }

  p {
    color: #64748b;
    font-size: 12px;
  }

  h3 {
    font-size: 16px;
  }
}

.copy-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 6px;
  height: 30px;
  padding: 0 10px;
}

.timeline {
  position: relative;
}

.timeline-event {
  position: relative;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  margin-bottom: 14px;

  &.error .timeline-dot {
    background: #dc2626;
  }
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 9px;
  background: #0f766e;
}

.timeline-body {
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  padding: 12px;

  p {
    margin: 8px 0 0;
  }
}

.timeline-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.markdown-panel,
.payload-json {
  margin-top: 10px;
  padding: 12px;
  border-radius: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.markdown-panel {
  line-height: 1.6;

  :deep(pre) {
    overflow: auto;
    background: #111827;
    color: #e5e7eb;
    padding: 12px;
    border-radius: 6px;
  }
}

.payload-json {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  color: #334155;
}

.data-panel {
  min-height: 0;
  height: 100%;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 14px;
  padding: 14px;
  box-sizing: border-box;
}

.data-table-wrap {
  min-height: 0;
  height: 100%;
  max-height: calc(100vh - 55px - 72px - 28px);
  overflow: auto;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  overscroll-behavior: contain;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    border-bottom: 1px solid #e5e7eb;
    padding: 9px 10px;
    text-align: left;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  th {
    background: #f8fafc;
    color: #475569;
    position: sticky;
    top: 0;
  }

  tbody tr {
    cursor: pointer;

    &:hover {
      background: #f0fdfa;
    }
  }
}

.row-inspector,
.tool-panel {
  min-height: 0;
  height: 100%;
  max-height: calc(100vh - 55px - 72px - 28px);
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  padding: 14px;
  overflow: auto;
  box-sizing: border-box;
}

.debug-console-window {
  .data-table-wrap,
  .row-inspector,
  .tool-panel {
    max-height: calc(100vh - 72px - 28px);
  }
}

.row-inspector {
  display: flex;
  flex-direction: column;

  h3 {
    flex: 0 0 auto;
  }

  .payload-json {
    min-height: 0;
    flex: 1;
    overflow: auto;
  }
}

.maintenance-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, .8fr);
  gap: 14px;
  padding: 14px;
}

.llm-config-layout {
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
  overflow: hidden;
  box-sizing: border-box;
}

.llm-provider-list,
.llm-editor {
  min-height: 0;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  overflow: auto;
}

.llm-provider-list {
  padding: 14px;
}

.llm-editor {
  padding: 16px;
}

.llm-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  &.compact {
    margin-bottom: 8px;
  }

  h3,
  p {
    margin: 0;
  }

  h3 {
    font-size: 16px;
  }

  p {
    margin-top: 4px;
    color: #64748b;
    font-size: 12px;
  }

  > button {
    height: 32px;
    border-radius: 6px;
    border: 1px solid #0f766e;
    background: #0f766e;
    color: #fff;
    padding: 0 12px;
    cursor: pointer;
  }
}

.llm-template-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;

  button {
    height: 32px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    cursor: pointer;
  }
}

.llm-test-status {
  margin: -2px 0 14px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  font-size: 13px;

  &.success {
    border-color: #99f6e4;
    background: #f0fdfa;
    color: #0f766e;
  }

  &.error {
    border-color: #fecaca;
    background: #fef2f2;
    color: #b91c1c;
  }
}

.llm-provider-card {
  width: 100%;
  text-align: left;
  border: 1px solid #dbe3ef;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: pointer;

  &.active {
    border-color: #0f766e;
    box-shadow: inset 3px 0 0 #0f766e;
  }

  span {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  strong,
  small,
  code {
    display: block;
  }

  em {
    font-size: 12px;
    font-style: normal;
    color: #0f766e;
    font-weight: 700;
  }

  small {
    color: #64748b;
    margin-top: 6px;
  }

  code {
    margin-top: 6px;
    color: #334155;
    font-size: 12px;
    word-break: break-all;
  }
}

.llm-form-grid,
.llm-model-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  label {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  span {
    color: #475569;
    font-size: 12px;
    font-weight: 700;
  }

  input {
    min-width: 0;
    height: 34px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 0 10px;
    outline: none;

    &:focus {
      border-color: #0f766e;
      box-shadow: 0 0 0 3px rgba(15, 118, 110, .12);
    }
  }
}

.llm-bulk-model {
  display: grid;
  grid-template-columns: minmax(220px, 320px) auto;
  gap: 10px;
  align-items: end;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #f8fafc;

  label {
    display: grid;
    gap: 6px;
  }

  span {
    color: #475569;
    font-size: 12px;
    font-weight: 700;
  }

  select,
  button {
    height: 34px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: #fff;
    padding: 0 10px;
  }

  button {
    border-color: #0f766e;
    color: #0f766e;
    cursor: pointer;
    font-weight: 700;
  }
}

.llm-form-wide {
  grid-column: 1 / -1;
}

.llm-model-map,
.llm-runtime-panel {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #e2e8f0;
}

.llm-model-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.llm-runtime-panel {
  h3 {
    margin: 12px 0 0;
    font-size: 14px;
  }
}

.debug-empty {
  color: #64748b;
  padding: 18px;
}
</style>
