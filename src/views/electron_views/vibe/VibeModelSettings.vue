<template>
  <div class="vibe-model-settings">
    <button class="vms-trigger" type="button" title="模型设置" aria-label="模型设置" @click="open = !open">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v3" />
        <path d="M12 18v3" />
        <path d="M4.8 6.8l2.1 2.1" />
        <path d="M17.1 17.1l2.1 2.1" />
        <path d="M3 12h3" />
        <path d="M18 12h3" />
        <path d="M4.8 17.2l2.1-2.1" />
        <path d="M17.1 6.9l2.1-2.1" />
        <circle cx="12" cy="12" r="3.4" />
      </svg>
    </button>

    <section v-if="open" class="vms-panel">
      <header class="vms-head">
        <div>
          <h2>Vibe 模型设置</h2>
          <p>{{ runtimeLabel }}</p>
        </div>
        <button type="button" class="vms-close" aria-label="关闭" @click="open = false">×</button>
      </header>

      <div class="vms-body">
        <aside class="vms-providers">
          <div class="vms-section-head">
            <span>Provider</span>
            <button type="button" @click="startNewProvider">新增</button>
          </div>
          <button
            v-for="provider in providers"
            :key="provider.id"
            type="button"
            :class="['vms-provider', { active: editingProvider?.id === provider.id }]"
            @click="selectProvider(provider)"
          >
            <strong>{{ provider.name }}</strong>
            <span>{{ provider.provider_type }} · {{ provider.base_url || 'OpenAI 默认地址' }}</span>
            <i v-if="provider.is_active">当前启用</i>
          </button>
          <p v-if="!providers.length" class="vms-empty">暂无配置，先新增一个 Provider。</p>
        </aside>

        <main class="vms-editor">
          <div class="vms-actions">
            <button type="button" @click="applyTemplate('gpt')">GPT 模板</button>
            <button type="button" @click="applyTemplate('deepseek')">DeepSeek 模板</button>
            <button type="button" :disabled="!editingProvider?.id" @click="activateProvider">设为当前</button>
            <button type="button" class="danger" :disabled="!editingProvider?.id" @click="removeProvider">删除</button>
          </div>

          <div class="vms-grid">
            <label>
              <span>名称</span>
              <input v-model="draft.name" placeholder="例如 GPT / DeepSeek" />
            </label>
            <label>
              <span>类型</span>
              <input v-model="draft.provider_type" placeholder="gpt / deepseek / custom" />
            </label>
            <label>
              <span>Base URL</span>
              <input v-model="draft.base_url" placeholder="GPT 留空，DeepSeek 填 https://api.deepseek.com" />
            </label>
            <label>
              <span>Proxy</span>
              <input v-model="draft.proxy_url" placeholder="可选，例如 http://127.0.0.1:7890" />
            </label>
            <label class="wide">
              <span>API Key</span>
              <input v-model="draft.api_key" spellcheck="false" placeholder="开发阶段完整保存和回显" />
            </label>
          </div>

          <div class="vms-timeouts">
            <label><span>Connect</span><input v-model.number="draft.timeout_config.connect" type="number" /></label>
            <label><span>Read</span><input v-model.number="draft.timeout_config.read" type="number" /></label>
            <label><span>Write</span><input v-model.number="draft.timeout_config.write" type="number" /></label>
            <label><span>Pool</span><input v-model.number="draft.timeout_config.pool" type="number" /></label>
            <label><span>Retries</span><input v-model.number="draft.max_retries" type="number" /></label>
            <label class="vms-check"><input v-model="draft.enabled" type="checkbox" />启用</label>
          </div>

          <div v-if="isDeepSeek" class="vms-bulk">
            <span>DeepSeek 批量模型</span>
            <select v-model="deepseekBulkModel">
              <option value="deepseek-v4-pro">deepseek-v4-pro</option>
              <option value="deepseek-v4-flash">deepseek-v4-flash</option>
            </select>
            <button type="button" @click="applyDeepSeekBulk">批量更新</button>
          </div>

          <section class="vms-models">
            <div class="vms-section-head">
              <span>模型映射</span>
              <small>按 Vibe 业务场景分别指定模型</small>
            </div>
            <div class="vms-model-grid">
              <label v-for="key in modelKeys" :key="key">
                <span>{{ modelLabel(key) }}</span>
                <input v-model="modelDraft[key]" :placeholder="runtime?.models?.[key] || '留空走默认'" />
              </label>
            </div>
          </section>

          <footer class="vms-footer">
            <span :class="['vms-status', { ok: testOk === true, error: testOk === false }]">{{ statusText }}</span>
            <div>
              <button type="button" :disabled="saving" @click="saveProvider">{{ saving ? '保存中…' : '保存' }}</button>
              <button type="button" :disabled="testing || !editingProvider?.id" @click="testProvider">{{ testing ? '测试中…' : '测试连接' }}</button>
            </div>
          </footer>
        </main>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  activateVibeLLMProvider,
  createVibeLLMProvider,
  deleteVibeLLMProvider,
  getVibeLLMRuntimeConfig,
  listVibeLLMProviders,
  testVibeLLMProvider,
  updateVibeLLMProvider,
  type VibeLLMProviderConfig,
  type VibeLLMProviderPayload,
  type VibeLLMRuntimeConfig,
} from './api'

const open = ref(false)
const saving = ref(false)
const testing = ref(false)
const providers = ref<VibeLLMProviderConfig[]>([])
const editingProvider = ref<VibeLLMProviderConfig | null>(null)
const runtime = ref<VibeLLMRuntimeConfig | null>(null)
const modelKeys = ref<string[]>([])
const modelDraft = ref<Record<string, string>>({})
const deepseekBulkModel = ref('deepseek-v4-pro')
const statusText = ref('就绪')
const testOk = ref<boolean | null>(null)

const draft = reactive<VibeLLMProviderPayload>({
  name: '',
  provider_type: 'openai-compatible',
  base_url: '',
  api_key: '',
  proxy_url: '',
  timeout_config: { connect: 30, read: 240, write: 60, pool: 30 },
  max_retries: 0,
  model_config: {},
  enabled: true,
})

const normalizedProviderType = computed(() => String(draft.provider_type || '').trim().toLowerCase())
const isDeepSeek = computed(() => normalizedProviderType.value === 'deepseek')
const runtimeLabel = computed(() => {
  if (!runtime.value) return '读取当前运行时配置'
  const provider = runtime.value.provider
  if (!provider) return '当前使用环境变量兜底'
  return `当前启用：${provider.name || '未命名'} · ${provider.base_url || 'OpenAI 默认地址'}`
})

watch(open, (value) => {
  if (value) loadConfig()
})

onMounted(loadConfig)

function resetDraft() {
  Object.assign(draft, {
    name: '',
    provider_type: 'openai-compatible',
    base_url: '',
    api_key: '',
    proxy_url: '',
    timeout_config: { connect: 30, read: 240, write: 60, pool: 30 },
    max_retries: 0,
    model_config: {},
    enabled: true,
  })
  modelDraft.value = Object.fromEntries(modelKeys.value.map((key) => [key, '']))
}

function applyDraft(provider: VibeLLMProviderConfig) {
  Object.assign(draft, {
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
    enabled: provider.enabled !== false,
  })
  modelDraft.value = Object.fromEntries(modelKeys.value.map((key) => [key, String(provider.model_config?.[key] || '')]))
  syncDeepSeekBulk()
}

async function loadConfig() {
  try {
    const [providerPayload, runtimeConfig] = await Promise.all([listVibeLLMProviders(), getVibeLLMRuntimeConfig()])
    providers.value = providerPayload.providers || []
    runtime.value = runtimeConfig
    modelKeys.value = providerPayload.model_config_keys?.length
      ? providerPayload.model_config_keys
      : Object.keys(providerPayload.default_model_config || runtimeConfig.models || {})
    if (!editingProvider.value && providers.value.length) {
      selectProvider(providers.value.find((item) => item.is_active) || providers.value[0])
    } else if (!providers.value.length) {
      resetDraft()
    }
  } catch (error: any) {
    statusText.value = `配置读取失败：${error?.message || String(error)}`
    testOk.value = false
  }
}

function selectProvider(provider: VibeLLMProviderConfig) {
  editingProvider.value = provider
  applyDraft(provider)
  statusText.value = '就绪'
  testOk.value = null
}

function startNewProvider() {
  editingProvider.value = null
  resetDraft()
  statusText.value = '新 Provider'
  testOk.value = null
}

function template(type: 'gpt' | 'deepseek') {
  const strongKeys = new Set(['strong', 'vibe_project_baseline', 'vibe_input_router', 'vibe_modeling_intent', 'vibe_candidate_inventory', 'vibe_candidate_disposition', 'vibe_modeling_package', 'vibe_coverage_quality_gate', 'vibe_patch_generate', 'vibe_project_summary', 'vibe_system_summary', 'vibe_retrieval_sufficiency'])
  return Object.fromEntries(modelKeys.value.map((key) => {
    if (type === 'deepseek') return [key, deepseekBulkModel.value]
    return [key, strongKeys.has(key) ? 'gpt-5.5' : 'gpt-5.4-mini']
  }))
}

function applyTemplate(type: 'gpt' | 'deepseek') {
  draft.name = type === 'gpt' ? 'GPT' : 'DeepSeek'
  draft.provider_type = type
  draft.base_url = type === 'gpt' ? '' : 'https://api.deepseek.com'
  modelDraft.value = template(type)
}

function applyDeepSeekBulk() {
  modelDraft.value = Object.fromEntries(modelKeys.value.map((key) => [key, deepseekBulkModel.value]))
}

function syncDeepSeekBulk() {
  const values = Object.values(modelDraft.value).filter(Boolean)
  deepseekBulkModel.value = values.includes('deepseek-v4-flash') && !values.includes('deepseek-v4-pro')
    ? 'deepseek-v4-flash'
    : 'deepseek-v4-pro'
}

function compactModelConfig() {
  return Object.fromEntries(Object.entries(modelDraft.value).filter(([, value]) => String(value || '').trim()).map(([key, value]) => [key, String(value).trim()]))
}

async function saveProvider() {
  if (!draft.name?.trim()) {
    statusText.value = '请填写 Provider 名称'
    testOk.value = false
    return
  }
  saving.value = true
  try {
    const payload = {
      ...draft,
      name: draft.name.trim(),
      provider_type: normalizedProviderType.value || 'openai-compatible',
      base_url: draft.base_url?.trim() || '',
      proxy_url: draft.proxy_url?.trim() || '',
      model_config: compactModelConfig(),
    }
    const saved = editingProvider.value?.id
      ? await updateVibeLLMProvider(editingProvider.value.id, payload)
      : await createVibeLLMProvider(payload)
    editingProvider.value = saved
    statusText.value = '已保存'
    testOk.value = true
    await loadConfig()
  } catch (error: any) {
    statusText.value = `保存失败：${error?.message || String(error)}`
    testOk.value = false
  } finally {
    saving.value = false
  }
}

async function activateProvider() {
  if (!editingProvider.value?.id) return
  await activateVibeLLMProvider(editingProvider.value.id)
  statusText.value = '已设为当前'
  testOk.value = true
  await loadConfig()
}

async function removeProvider() {
  if (!editingProvider.value?.id) return
  if (!window.confirm(`确认删除 Provider「${editingProvider.value.name}」？`)) return
  await deleteVibeLLMProvider(editingProvider.value.id)
  editingProvider.value = null
  statusText.value = '已删除'
  testOk.value = null
  await loadConfig()
}

async function testProvider() {
  if (!editingProvider.value?.id) return
  testing.value = true
  statusText.value = '测试连接中…'
  testOk.value = null
  try {
    let model = modelDraft.value.vibe_project_baseline || modelDraft.value.mini || ''
    if (isDeepSeek.value && (!model || !model.startsWith('deepseek-'))) {
      model = deepseekBulkModel.value || 'deepseek-v4-pro'
    }
    if (normalizedProviderType.value === 'gpt' && model.startsWith('deepseek-')) {
      model = 'gpt-5.5'
    }
    const result = await testVibeLLMProvider(editingProvider.value.id, { model })
    testOk.value = !!result.ok
    statusText.value = result.ok
      ? `测试成功 · ${result.model} · ${result.elapsed_ms}ms`
      : `测试失败 · ${result.model} · ${result.error || '未知错误'}`
  } catch (error: any) {
    testOk.value = false
    statusText.value = `测试失败：${error?.message || String(error)}`
  } finally {
    testing.value = false
  }
}

function modelLabel(key: string) {
  const labels: Record<string, string> = {
    mini: '默认轻量模型',
    strong: '默认强模型',
    vibe_project_baseline: '项目基线生成',
    vibe_event_understand: '需求输入理解',
    vibe_input_router: '对话输入路由',
    vibe_modeling_intent: '建模意图识别',
    vibe_candidate_inventory: '候选枚举',
    vibe_candidate_disposition: '候选处置',
    vibe_modeling_package: '建模方案包生成',
    vibe_coverage_quality_gate: '覆盖率质量门',
    vibe_patch_generate: '待确认补丁生成',
    vibe_fact_summary: '事实摘要生成',
    vibe_project_summary: '项目摘要生成',
    vibe_system_summary: '跨项目系统摘要生成',
    vibe_query_understand: '召回问题理解',
    vibe_retrieval_sufficiency: '召回满足度判断',
  }
  return labels[key] || key
}
</script>

<style scoped lang="scss">
.vibe-model-settings {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 80;
  color: #1d1d1f;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
}

.vms-trigger {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(15, 15, 15, 0.1);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(18px);
  cursor: pointer;

  svg {
    width: 18px;
    height: 18px;
    stroke: #242426;
    stroke-width: 1.8;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

.vms-panel {
  position: absolute;
  right: 0;
  bottom: 48px;
  width: min(920px, calc(100vw - 44px));
  height: min(720px, calc(100vh - 84px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(15, 15, 15, 0.08);
  border-radius: 18px;
  background: rgba(250, 250, 249, 0.96);
  box-shadow: 0 22px 80px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(24px) saturate(140%);
}

.vms-head,
.vms-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(15, 15, 15, 0.07);

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 650;
  }

  p {
    margin: 4px 0 0;
    font-size: 12px;
    color: rgba(15, 15, 15, 0.55);
  }
}

.vms-close,
.vms-actions button,
.vms-section-head button,
.vms-footer button,
.vms-bulk button {
  border: 1px solid rgba(15, 15, 15, 0.1);
  border-radius: 9px;
  background: #fff;
  color: #1d1d1f;
  font-size: 12px;
  height: 30px;
  padding: 0 10px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.vms-close {
  width: 30px;
  padding: 0;
  font-size: 18px;
}

.vms-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
}

.vms-providers {
  min-width: 0;
  padding: 12px;
  overflow: auto;
  border-right: 1px solid rgba(15, 15, 15, 0.07);
}

.vms-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;

  span {
    font-size: 12px;
    font-weight: 650;
  }

  small {
    font-size: 11px;
    color: rgba(15, 15, 15, 0.48);
  }
}

.vms-provider {
  width: 100%;
  text-align: left;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  padding: 10px;
  margin-bottom: 6px;
  cursor: pointer;

  strong,
  span,
  i {
    display: block;
  }

  strong {
    font-size: 12.5px;
    font-style: normal;
    margin-bottom: 4px;
  }

  span {
    font-size: 11px;
    color: rgba(15, 15, 15, 0.55);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  i {
    margin-top: 6px;
    font-size: 10px;
    color: #2f7441;
    font-style: normal;
  }

  &:hover,
  &.active {
    background: #fff;
    border-color: rgba(15, 15, 15, 0.08);
  }
}

.vms-empty {
  margin: 20px 4px;
  color: rgba(15, 15, 15, 0.42);
  font-size: 12px;
  line-height: 1.6;
}

.vms-editor {
  min-width: 0;
  padding: 14px;
  overflow: auto;
}

.vms-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;

  .danger {
    color: #b42318;
  }
}

.vms-grid,
.vms-model-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

label {
  min-width: 0;

  span {
    display: block;
    margin: 0 0 5px;
    font-size: 11px;
    color: rgba(15, 15, 15, 0.55);
  }

  input,
  select {
    width: 100%;
    height: 32px;
    box-sizing: border-box;
    border: 1px solid rgba(15, 15, 15, 0.1);
    border-radius: 9px;
    background: #fff;
    padding: 0 9px;
    color: #1d1d1f;
    font-size: 12px;
    outline: none;

    &:focus {
      border-color: rgba(47, 116, 65, 0.46);
      box-shadow: 0 0 0 3px rgba(47, 116, 65, 0.08);
    }
  }
}

.wide {
  grid-column: 1 / -1;
}

.vms-timeouts {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  margin: 12px 0;
}

.vms-check {
  display: flex;
  align-items: end;
  gap: 6px;
  height: 51px;
  font-size: 12px;
  color: rgba(15, 15, 15, 0.68);

  input {
    width: 15px;
    height: 15px;
  }
}

.vms-bulk {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid rgba(15, 15, 15, 0.07);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.58);

  span {
    font-size: 12px;
    font-weight: 600;
  }

  select {
    height: 30px;
    border-radius: 8px;
    border: 1px solid rgba(15, 15, 15, 0.1);
    background: #fff;
    font-size: 12px;
    padding: 0 8px;
  }
}

.vms-models {
  padding-top: 10px;
  border-top: 1px solid rgba(15, 15, 15, 0.07);
}

.vms-footer {
  border-top: 1px solid rgba(15, 15, 15, 0.07);
  border-bottom: 0;

  > div {
    display: flex;
    gap: 8px;
  }
}

.vms-status {
  min-width: 0;
  color: rgba(15, 15, 15, 0.55);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.ok { color: #2f7441; }
  &.error { color: #b42318; }
}
</style>
