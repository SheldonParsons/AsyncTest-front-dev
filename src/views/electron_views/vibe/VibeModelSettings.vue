<template>
  <div class="vibe-model-settings" :class="{ embedded }">
    <button v-if="!embedded" class="vms-trigger" type="button" title="模型设置" aria-label="模型设置" @click="open = !open">
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

    <section v-if="embedded || open" class="vms-panel">
      <template v-if="viewMode === 'list'">
        <main class="vms-list-shell">
          <header class="vms-page-head">
            <button type="button" class="vms-add-model" @click="startNewProvider">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              <span>新增模型</span>
            </button>
          </header>

          <section class="vms-model-list" aria-label="模型列表">
            <article
              v-for="provider in providers"
              :key="provider.id"
              class="vms-model-row"
              :class="{ readonly: !canEditProvider(provider) }"
              @click="canEditProvider(provider) && startEditProvider(provider)"
            >
              <img class="vms-logo" :src="DEEPSEEK_LOGO" alt="DeepSeek" />
              <span class="vms-row-main">
                <strong>{{ provider.name || 'DeepSeek' }}</strong>
                <small>{{ provider.base_url || DEEPSEEK_BASE_URL }}</small>
              </span>
              <span class="vms-badges">
                <i v-if="isSystemDefaultProvider(provider)">系统默认</i>
                <em v-else>个人模型</em>
              </span>
              <span class="vms-row-actions" @click.stop>
                <button v-if="canEditProvider(provider)" type="button" class="vms-icon-btn" title="编辑模型" aria-label="编辑模型" @click="startEditProvider(provider)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </span>
            </article>

            <p v-if="!providers.length" class="vms-empty-line">新增自己的模型，或等待管理员配置系统默认模型。</p>
          </section>

          <footer v-if="statusText" class="vms-list-foot">
            <span :class="['vms-status', { ok: statusKind === 'ok', error: statusKind === 'error' }]">{{ statusText }}</span>
          </footer>
        </main>
      </template>

      <template v-else>
        <main class="vms-edit-shell">
          <header class="vms-edit-head">
            <h1>{{ editingProvider?.id ? '编辑模型' : '新增模型' }}</h1>
          </header>

          <section class="vms-form-card">
            <div class="vms-provider-select">
              <span class="vms-field-label">选择模型</span>
              <button type="button" class="vms-provider-option active" aria-pressed="true">
                <img class="vms-logo" :src="DEEPSEEK_LOGO" alt="DeepSeek" />
                <span>
                  <strong>DeepSeek</strong>
                  <small>当前唯一可选模型服务</small>
                </span>
                <i>已选择</i>
              </button>
            </div>

            <div class="vms-form-grid">
              <label>
                <span>模型名称</span>
                <input v-model="draft.name" autocomplete="off" placeholder="例如 DeepSeek" @input="clearStatus" />
              </label>
              <label>
                <span>Base Url</span>
                <input v-model="draft.base_url" autocomplete="off" placeholder="https://api.deepseek.com" @input="clearStatus" />
              </label>
              <label class="wide">
                <span>Api Key</span>
                <input v-model="draft.api_key" autocomplete="off" spellcheck="false" placeholder="请输入 DeepSeek Api Key" @input="clearStatus" />
              </label>
              <label>
                <span>增强模型</span>
                <input :value="DEEPSEEK_ENHANCED_MODEL" readonly />
              </label>
              <label>
                <span>轻量模型</span>
                <input :value="DEEPSEEK_LIGHT_MODEL" readonly />
              </label>
            </div>

            <footer class="vms-edit-foot">
              <div class="vms-left-actions">
                <button v-if="editingProvider?.id" type="button" class="vms-danger" :disabled="deleting || saving || testingId === pendingTestId" @click="removeProvider">
                  {{ deleting ? '删除中' : '删除' }}
                </button>
              </div>
              <span v-if="statusText" :class="['vms-status', { ok: statusKind === 'ok', error: statusKind === 'error' }]">{{ statusText }}</span>
              <div class="vms-right-actions">
                <button type="button" class="vms-secondary" :disabled="saving || deleting || testingId === pendingTestId" @click="cancelEdit">取消</button>
                <button type="button" class="vms-secondary" :disabled="testingId === pendingTestId || saving || deleting" @click="testCurrentDraft">
                  {{ testingId === pendingTestId ? '测试中' : '测试连接' }}
                </button>
                <button type="button" class="vms-primary" :disabled="saving || deleting" @click="saveAndBack">
                  {{ saving ? '保存中' : '保存' }}
                </button>
              </div>
            </footer>
          </section>
        </main>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
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

const DEEPSEEK_LOGO = 'https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/other_band_logo/deepseek_logo.svg'
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const DEEPSEEK_ENHANCED_MODEL = 'deepseek-v4-pro'
const DEEPSEEK_LIGHT_MODEL = 'deepseek-v4-flash'
const pendingTestId = '__draft__'

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const embedded = computed(() => !!props.embedded)
const open = ref(false)
const viewMode = ref<'list' | 'edit'>('list')
const saving = ref(false)
const deleting = ref(false)
const testingId = ref('')
const providers = ref<VibeLLMProviderConfig[]>([])
const editingProvider = ref<VibeLLMProviderConfig | null>(null)
const runtime = ref<VibeLLMRuntimeConfig | null>(null)
const modelKeys = ref<string[]>([])
const statusText = ref('')
const statusKind = ref<'idle' | 'ok' | 'error'>('idle')

const draft = reactive<VibeLLMProviderPayload>({
  name: 'DeepSeek',
  provider_type: 'deepseek',
  base_url: DEEPSEEK_BASE_URL,
  api_key: '',
  proxy_url: '',
  timeout_config: { connect: 30, read: 240, write: 60, pool: 30 },
  max_retries: 0,
  model_config: {},
  enabled: true,
})

watch(open, (value) => {
  if (value) loadConfig()
})

onMounted(loadConfig)

function resetDraft() {
  Object.assign(draft, {
    name: 'DeepSeek',
    provider_type: 'deepseek',
    base_url: DEEPSEEK_BASE_URL,
    api_key: '',
    proxy_url: '',
    timeout_config: { connect: 30, read: 240, write: 60, pool: 30 },
    max_retries: 0,
    model_config: fixedModelConfig(),
    enabled: true,
  })
}

function applyDraft(provider: VibeLLMProviderConfig) {
  Object.assign(draft, {
    name: provider.name || 'DeepSeek',
    provider_type: 'deepseek',
    base_url: provider.base_url || DEEPSEEK_BASE_URL,
    api_key: provider.api_key || '',
    proxy_url: provider.proxy_url || '',
    timeout_config: {
      connect: Number(provider.timeout_config?.connect ?? 30),
      read: Number(provider.timeout_config?.read ?? 240),
      write: Number(provider.timeout_config?.write ?? 60),
      pool: Number(provider.timeout_config?.pool ?? 30),
    },
    max_retries: Number(provider.max_retries ?? 0),
    model_config: fixedModelConfig(),
    enabled: provider.enabled !== false,
  })
}

function fixedModelConfig() {
  return {
    mini: DEEPSEEK_LIGHT_MODEL,
    strong: DEEPSEEK_ENHANCED_MODEL,
  }
}

async function loadConfig() {
  try {
    const [providerPayload, runtimeConfig] = await Promise.all([listVibeLLMProviders(), getVibeLLMRuntimeConfig()])
    providers.value = (providerPayload.providers || []).filter((provider) => String(provider.provider_type || '').toLowerCase() === 'deepseek')
    runtime.value = runtimeConfig
    modelKeys.value = ['mini', 'strong']
    if (viewMode.value === 'edit' && editingProvider.value?.id) {
      const latest = providers.value.find((provider) => provider.id === editingProvider.value?.id)
      if (latest && canEditProvider(latest)) {
        editingProvider.value = latest
        applyDraft(latest)
      }
    }
  } catch (error: any) {
    setStatus(`配置读取失败：${error?.message || String(error)}`, 'error')
  }
}

function canEditProvider(provider: VibeLLMProviderConfig) {
  return provider.editable !== false && provider.source !== 'system_default' && !provider.is_system_default
}

function isSystemDefaultProvider(provider: VibeLLMProviderConfig) {
  return provider.source === 'system_default' || !!provider.is_system_default
}

function startNewProvider() {
  editingProvider.value = null
  resetDraft()
  viewMode.value = 'edit'
  setStatus('', 'idle')
}

function startEditProvider(provider: VibeLLMProviderConfig) {
  if (!canEditProvider(provider)) return
  editingProvider.value = provider
  applyDraft(provider)
  viewMode.value = 'edit'
  setStatus('', 'idle')
}

function cancelEdit() {
  viewMode.value = 'list'
  editingProvider.value = null
  setStatus('', 'idle')
}

function clearStatus() {
  if (statusKind.value !== 'idle') setStatus('', 'idle')
}

function setStatus(text: string, kind: 'idle' | 'ok' | 'error') {
  statusText.value = text
  statusKind.value = kind
}

function validateDraft() {
  if (!String(draft.name || '').trim()) return '请填写模型名称'
  if (!String(draft.base_url || '').trim()) return '请填写 Base Url'
  if (!String(draft.api_key || '').trim()) return '请填写 Api Key'
  return ''
}

function buildPayload(): VibeLLMProviderPayload {
  return {
    name: String(draft.name || '').trim(),
    provider_type: 'deepseek',
    base_url: String(draft.base_url || DEEPSEEK_BASE_URL).trim(),
    api_key: String(draft.api_key || '').trim(),
    proxy_url: '',
    timeout_config: { connect: 30, read: 240, write: 60, pool: 30 },
    max_retries: 0,
    model_config: fixedModelConfig(),
    enabled: true,
  }
}

async function persistDraft() {
  const validation = validateDraft()
  if (validation) {
    setStatus(validation, 'error')
    return null
  }
  saving.value = true
  try {
    const payload = buildPayload()
    const saved = editingProvider.value?.id
      ? await updateVibeLLMProvider(editingProvider.value.id, payload)
      : await createVibeLLMProvider(payload)
    editingProvider.value = saved
    await loadConfig()
    setStatus('已保存', 'ok')
    return saved
  } catch (error: any) {
    setStatus(`保存失败：${error?.message || String(error)}`, 'error')
    return null
  } finally {
    saving.value = false
  }
}

async function saveAndBack() {
  const saved = await persistDraft()
  if (!saved) return
  viewMode.value = 'list'
  editingProvider.value = null
}

async function removeProvider() {
  if (!editingProvider.value?.id || deleting.value) return
  if (!window.confirm(`确认删除模型「${editingProvider.value.name || 'DeepSeek'}」？`)) return
  deleting.value = true
  try {
    await deleteVibeLLMProvider(editingProvider.value.id)
    editingProvider.value = null
    viewMode.value = 'list'
    await loadConfig()
    setStatus('已删除', 'ok')
  } catch (error: any) {
    setStatus(`删除失败：${error?.message || String(error)}`, 'error')
  } finally {
    deleting.value = false
  }
}

async function testCurrentDraft() {
  testingId.value = pendingTestId
  try {
    const provider = await persistDraft()
    if (!provider?.id) return
    await runProviderTest(provider)
  } finally {
    testingId.value = ''
  }
}

async function runProviderTest(provider: VibeLLMProviderConfig) {
  setStatus('测试连接中...', 'idle')
  try {
    const result = await testVibeLLMProvider(provider.id, { model: DEEPSEEK_LIGHT_MODEL })
    setStatus(
      result.ok ? `测试成功 · ${result.model} · ${result.elapsed_ms}ms` : `测试失败 · ${result.model} · ${result.error || '未知错误'}`,
      result.ok ? 'ok' : 'error',
    )
  } catch (error: any) {
    setStatus(`测试失败：${error?.message || String(error)}`, 'error')
  }
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

.vibe-model-settings.embedded {
  position: static;
  right: auto;
  bottom: auto;
  z-index: auto;
  width: 100%;
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
  width: min(760px, calc(100vw - 44px));
  max-height: min(720px, calc(100vh - 84px));
  overflow: hidden;
  border: 1px solid rgba(15, 15, 15, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 22px 80px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(24px) saturate(140%);
}

.vibe-model-settings.embedded .vms-panel {
  position: relative;
  right: auto;
  bottom: auto;
  width: 100%;
  max-height: none;
  min-height: calc(100vh - 96px);
  border: 0;
  border-radius: 0;
  box-shadow: none;
  background: #fff;
  backdrop-filter: none;
}

.vms-list-shell,
.vms-edit-shell {
  width: min(760px, calc(100% - 48px));
  min-height: calc(100vh - 116px);
  margin: 0 auto;
  padding: 24px 0 40px;
  box-sizing: border-box;
}

.vms-list-shell,
.vms-edit-shell {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.vms-page-head,
.vms-edit-head {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 24px;
  margin-bottom: 18px;

  h1 {
    margin: 0 0 7px;
    font-size: 24px;
    font-weight: 560;
    letter-spacing: 0;
  }

  p {
    max-width: 540px;
    margin: 0;
    color: rgba(29, 29, 31, 0.52);
    font-size: 13px;
    line-height: 1.7;
  }
}

.vms-edit-head {
  display: block;
}

.vms-model-list {
  display: grid;
  gap: 10px;
}

.vms-model-row {
  width: 100%;
  min-width: 0;
  min-height: 72px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 13px;
  padding: 12px 14px;
  border: 1px solid rgba(15, 15, 15, 0.08);
  border-radius: 14px;
  background: #fff;
  text-align: left;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.04);
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;

  &:not(.readonly) { cursor: pointer; }

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(15, 15, 15, 0.16);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.07);
  }
}

.vms-logo,
.vms-empty-logo {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  flex: 0 0 auto;
}

.vms-row-main {
  min-width: 0;
  display: grid;
  gap: 4px;

  strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #1d1d1f;
    font-size: 14px;
    font-weight: 560;
  }

  small {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgba(29, 29, 31, 0.46);
    font-size: 12px;
  }
}

.vms-badges {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;

  i,
  em,
  b {
    display: inline-flex;
    height: 24px;
    align-items: center;
    padding: 0 9px;
    border-radius: 999px;
    font-size: 11px;
    font-style: normal;
    font-weight: 500;
    white-space: nowrap;
  }

  i {
    background: #f1f1f1;
    color: rgba(29, 29, 31, 0.72);
  }

  em {
    background: #f6f6f6;
    color: rgba(29, 29, 31, 0.48);
  }

}

.vms-row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.vms-icon-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: rgba(29, 29, 31, 0.72);
  padding: 0;
  cursor: pointer;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: #f1f1f1;
  }
}

.vms-empty-line {
  margin: 10px 2px;
  color: rgba(29, 29, 31, 0.48);
  font-size: 13px;
}

.vms-empty-state {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 1px solid rgba(15, 15, 15, 0.08);
  border-radius: 18px;
  background: #fff;

  .vms-empty-logo {
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
  }

  h2 {
    margin: 0 0 7px;
    font-size: 18px;
    font-weight: 560;
  }

  p {
    width: min(360px, 80%);
    margin: 0 0 18px;
    color: rgba(29, 29, 31, 0.5);
    font-size: 13px;
    line-height: 1.7;
  }
}

.vms-list-foot {
  min-height: 26px;
  display: flex;
  align-items: center;
  margin-top: 14px;
}

.vms-form-card {
  border: 1px solid rgba(15, 15, 15, 0.08);
  border-radius: 18px;
  background: #fff;
  padding: 18px;
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.045);
}

.vms-provider-select {
  margin-bottom: 16px;
}

.vms-field-label,
.vms-form-grid label span {
  display: block;
  margin-bottom: 7px;
  color: rgba(29, 29, 31, 0.54);
  font-size: 12px;
}

.vms-provider-option {
  width: 100%;
  min-height: 66px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  padding: 12px;
  border: 1px solid rgba(15, 15, 15, 0.1);
  border-radius: 14px;
  background: #fafafa;
  text-align: left;

  strong,
  small {
    display: block;
  }

  strong {
    margin-bottom: 3px;
    font-size: 14px;
    font-weight: 560;
  }

  small {
    color: rgba(29, 29, 31, 0.48);
    font-size: 12px;
  }

  i {
    font-size: 12px;
    font-style: normal;
    color: #2f6b3d;
  }
}

.vms-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px;
}

.vms-form-grid label {
  min-width: 0;

  &.wide { grid-column: 1 / -1; }

  input {
    width: 100%;
    height: 38px;
    box-sizing: border-box;
    border: 1px solid rgba(15, 15, 15, 0.1);
    border-radius: 10px;
    background: #fff;
    color: #1d1d1f;
    padding: 0 11px;
    font-size: 13px;
    outline: none;

    &:focus {
      border-color: rgba(29, 29, 31, 0.34);
      box-shadow: 0 0 0 3px rgba(15, 15, 15, 0.06);
    }

    &[readonly] {
      background: #f6f6f6;
      color: rgba(29, 29, 31, 0.62);
    }
  }
}

.vms-edit-foot {
  display: grid;
  grid-template-columns: minmax(72px, auto) minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
}

.vms-left-actions,
.vms-right-actions {
  display: flex;
  gap: 8px;
}

.vms-right-actions {
  justify-content: flex-end;
}

.vms-add-model {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px 0 10px;
  border: 0;
  border-radius: 12px;
  background: #f4f4f4;
  color: #1d1d1f;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: background 0.16s ease, transform 0.16s ease;

  svg {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &:hover {
    background: #ececec;
  }

  &:active {
    transform: translateY(1px);
  }
}

.vms-primary,
.vms-secondary,
.vms-danger {
  height: 34px;
  border-radius: 10px;
  padding: 0 14px;
  font-size: 13px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.vms-primary {
  border: 1px solid #1d1d1f;
  background: #1d1d1f;
  color: #fff;
}

.vms-secondary {
  border: 1px solid rgba(15, 15, 15, 0.1);
  background: #fff;
  color: #1d1d1f;
}

.vms-danger {
  border: 1px solid rgba(180, 35, 24, 0.16);
  background: #fff;
  color: #b42318;
}

.vms-status {
  min-width: 0;
  color: rgba(29, 29, 31, 0.5);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.ok { color: #2f6b3d; }
  &.error { color: #b42318; }
}

@media (max-width: 760px) {
  .vms-list-shell,
  .vms-edit-shell {
    width: calc(100% - 28px);
    padding-top: 20px;
  }

  .vms-page-head,
  .vms-edit-foot {
    align-items: stretch;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .vms-model-row {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .vms-badges,
  .vms-row-actions {
    grid-column: 2;
    justify-content: flex-start;
  }

  .vms-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
