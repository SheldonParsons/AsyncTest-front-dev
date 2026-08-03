<template>
  <section class="knowledge-api-settings">
    <header class="page-head">
      <div>
        <h1>{{ copy.title }}</h1>
        <p>{{ copy.description }}</p>
      </div>
      <button type="button" :disabled="loading || saving || !canSave" @click="save">
        {{ saving ? '保存中' : '保存' }}
      </button>
    </header>

    <article class="model-card" :aria-busy="loading">
      <div v-if="loading" class="loading-state">正在读取配置…</div>
      <template v-else>
        <label class="enable-row">
          <input v-model="draft.enabled" type="checkbox" :disabled="saving" />
          <span class="check" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
          </span>
          <span>
            <strong>启用远程 {{ copy.shortTitle }}</strong>
            <small>关闭后系统会明确报告不可用，不会切换到本地模型或其他模型。</small>
          </span>
        </label>

        <div class="form-grid">
          <label>
            <span>服务协议</span>
            <input :value="copy.protocolLabel" disabled />
          </label>
          <label>
            <span>模型</span>
            <input v-model.trim="draft.model" autocomplete="off" :placeholder="defaults.model" :disabled="saving" />
          </label>
          <label class="wide">
            <span>API 地址</span>
            <input v-model.trim="draft.endpoint" autocomplete="off" spellcheck="false" :placeholder="defaults.endpoint" :disabled="saving" />
          </label>
          <label class="wide secret-field">
            <span>API Key</span>
            <input
              v-model="apiKey"
              type="password"
              autocomplete="new-password"
              spellcheck="false"
              :placeholder="apiKeyConfigured ? '已配置；留空表示保持不变' : '请输入 DashScope API Key'"
              :disabled="saving"
            />
            <small>{{ apiKeyConfigured ? '密钥已配置，读取时不会回显。输入新值只会覆盖原密钥。' : '密钥尚未配置。' }}</small>
          </label>
          <label>
            <span>请求超时（秒）</span>
            <input v-model.number="draft.timeout_seconds" type="number" min="1" max="600" step="1" :disabled="saving" />
          </label>

          <template v-if="role === 'embedding'">
            <label>
              <span>向量维度</span>
              <input v-model.number="draft.dimension" type="number" min="64" max="2048" step="1" :disabled="saving" />
            </label>
            <label>
              <span>单批文本数量</span>
              <input v-model.number="draft.batch_size" type="number" min="1" max="10" step="1" :disabled="saving" />
              <small>DashScope 原生接口每批最多 10 条。</small>
            </label>
            <label class="wide">
              <span>查询向量指令（可选）</span>
              <textarea v-model="draft.query_instruct" rows="2" maxlength="500" :disabled="saving" placeholder="英文检索任务说明，建议默认留空" />
              <small>仅用于 text_type=query；填写英文检索任务说明，通常保持默认留空即可。</small>
            </label>
          </template>
        </div>

        <aside class="contract-note">
          <strong>{{ copy.noteTitle }}</strong>
          <p>{{ copy.note }}</p>
        </aside>

        <p v-if="status" :class="['status', statusKind]">{{ status }}</p>
      </template>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  getVibeKnowledgeApiModelConfig,
  updateVibeKnowledgeApiModelConfig,
  type VibeKnowledgeApiModelPayload,
  type VibeKnowledgeApiModelRole,
} from '../api'

const props = defineProps<{ role: VibeKnowledgeApiModelRole }>()

const DEFAULTS = {
  rerank: {
    endpoint: 'https://dashscope.aliyuncs.com/compatible-api/v1/reranks',
    model: 'qwen3-rerank',
    timeout_seconds: 30,
  },
  embedding: {
    endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding',
    model: 'text-embedding-v4',
    timeout_seconds: 60,
    dimension: 1024,
    batch_size: 10,
  },
} as const

const COPY = {
  rerank: {
    title: 'ReRank API 模型配置',
    shortTitle: '重排模型',
    protocolLabel: 'DashScope OpenAI-compatible API',
    description: '配置知识检索唯一使用的远程重排模型，与默认对话模型完全独立。',
    noteTitle: '使用边界',
    note: '检索候选只会发送给这里配置的 DashScope 重排接口。调用失败时不会使用默认模型或本地 BGE 兜底。',
  },
  embedding: {
    title: 'Embedding API 模型配置',
    shortTitle: '向量模型',
    protocolLabel: 'DashScope 原生 API',
    description: '配置知识入库和查询唯一使用的远程向量模型。',
    noteTitle: '重要说明',
    note: '修改模型、维度或指令后，已有项目需要重新生成 Current View。系统不会继续使用本地向量模型。',
  },
} as const

const role = computed(() => props.role)
const defaults = computed(() => DEFAULTS[role.value])
const copy = computed(() => COPY[role.value])
const loading = ref(false)
const saving = ref(false)
const status = ref('')
const statusKind = ref<'ok' | 'error'>('ok')
const apiKey = ref('')
const apiKeyConfigured = ref(false)
const draft = reactive({
  enabled: false,
  endpoint: '',
  model: '',
  timeout_seconds: 30,
  dimension: 1024,
  batch_size: 10,
  query_instruct: '',
})

const canSave = computed(() => {
  if (!draft.endpoint.trim() || !draft.model.trim()) return false
  if (draft.timeout_seconds < 1 || draft.timeout_seconds > 600) return false
  if (role.value === 'embedding' && (draft.batch_size < 1 || draft.batch_size > 10)) return false
  if (role.value === 'embedding' && (draft.dimension < 64 || draft.dimension > 2048)) return false
  return !draft.enabled || apiKeyConfigured.value || !!apiKey.value.trim()
})

function resetToDefaults() {
  const value = role.value === 'embedding' ? DEFAULTS.embedding : DEFAULTS.rerank
  Object.assign(draft, {
    enabled: false,
    endpoint: value.endpoint,
    model: value.model,
    timeout_seconds: value.timeout_seconds,
    dimension: role.value === 'embedding' ? DEFAULTS.embedding.dimension : 1024,
    batch_size: role.value === 'embedding' ? DEFAULTS.embedding.batch_size : 10,
    query_instruct: '',
  })
  apiKey.value = ''
  apiKeyConfigured.value = false
}

async function load() {
  loading.value = true
  status.value = ''
  resetToDefaults()
  try {
    const response = await getVibeKnowledgeApiModelConfig(role.value)
    const item = response.item
    Object.assign(draft, {
      enabled: item.enabled === true,
      endpoint: String(item.endpoint || defaults.value.endpoint),
      model: String(item.model || defaults.value.model),
      timeout_seconds: Number(item.timeout_seconds || defaults.value.timeout_seconds),
      dimension: Number(item.dimension || (role.value === 'embedding' ? DEFAULTS.embedding.dimension : 1024)),
      batch_size: Number(item.batch_size || (role.value === 'embedding' ? DEFAULTS.embedding.batch_size : 10)),
      query_instruct: String(item.query_instruct || ''),
    })
    apiKeyConfigured.value = item.api_key_configured === true
  } catch (error: any) {
    status.value = `加载失败：${error?.message || String(error)}`
    statusKind.value = 'error'
  } finally {
    loading.value = false
  }
}

function buildPayload(): VibeKnowledgeApiModelPayload {
  const payload: VibeKnowledgeApiModelPayload = {
    provider_type: 'dashscope',
    enabled: draft.enabled,
    endpoint: draft.endpoint.trim(),
    model: draft.model.trim(),
    timeout_seconds: Number(draft.timeout_seconds),
  }
  if (apiKey.value.trim()) payload.api_key = apiKey.value.trim()
  if (role.value === 'embedding') {
    payload.dimension = Number(draft.dimension)
    payload.batch_size = Number(draft.batch_size)
    payload.query_instruct = draft.query_instruct.trim()
  }
  return payload
}

async function save() {
  if (saving.value || !canSave.value) return
  saving.value = true
  status.value = ''
  try {
    const response = await updateVibeKnowledgeApiModelConfig(role.value, buildPayload())
    const item = response.item
    draft.enabled = item.enabled === true
    apiKeyConfigured.value = item.api_key_configured === true
    apiKey.value = ''
    status.value = '已保存'
    statusKind.value = 'ok'
  } catch (error: any) {
    status.value = `保存失败：${error?.message || String(error)}`
    statusKind.value = 'error'
  } finally {
    saving.value = false
  }
}

watch(role, load, { immediate: true })
</script>

<style scoped>
.knowledge-api-settings { display: grid; gap: 18px; max-width: 840px; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.page-head h1 { margin: 0; color: rgba(18, 18, 18, .92); font-size: 22px; font-weight: 620; }
.page-head p { margin: 7px 0 0; color: rgba(18, 18, 18, .52); font-size: 13px; line-height: 1.6; }
.page-head button { min-width: 76px; border: 0; border-radius: 9px; padding: 9px 18px; color: #fff; background: #171717; cursor: pointer; }
.page-head button:disabled { opacity: .45; cursor: not-allowed; }
.model-card { border: 1px solid rgba(18, 18, 18, .09); border-radius: 14px; padding: 20px; background: #fff; box-shadow: 0 8px 30px rgba(18, 18, 18, .04); }
.loading-state { padding: 34px 0; color: rgba(18, 18, 18, .48); font-size: 13px; text-align: center; }
.enable-row { display: flex; align-items: flex-start; gap: 12px; padding-bottom: 20px; border-bottom: 1px solid rgba(18, 18, 18, .07); cursor: pointer; }
.enable-row input { position: absolute; opacity: 0; pointer-events: none; }
.check { width: 20px; height: 20px; flex: 0 0 auto; display: grid; place-items: center; border: 1px solid #c7c7c7; border-radius: 6px; background: #fff; }
.check svg { width: 14px; height: 14px; fill: none; stroke: #fff; stroke-width: 2.2; opacity: 0; }
.enable-row input:focus-visible + .check { outline: 2px solid rgba(18, 18, 18, .35); outline-offset: 2px; }
.enable-row input:checked + .check { border-color: #171717; background: #171717; }
.enable-row input:checked + .check svg { opacity: 1; }
.enable-row strong, .enable-row small { display: block; }
.enable-row strong { color: rgba(18, 18, 18, .9); font-size: 15px; font-weight: 580; }
.enable-row small { margin-top: 5px; color: rgba(18, 18, 18, .48); font-size: 12px; line-height: 1.5; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 17px 18px; margin-top: 20px; }
.form-grid label { display: grid; align-content: start; gap: 7px; }
.form-grid label.wide { grid-column: 1 / -1; }
.form-grid label > span { color: rgba(18, 18, 18, .72); font-size: 12px; font-weight: 560; }
.form-grid input, .form-grid textarea { width: 100%; border: 1px solid rgba(18, 18, 18, .14); border-radius: 9px; padding: 10px 11px; color: #181818; background: #fff; font: inherit; font-size: 13px; line-height: 1.45; outline: none; }
.form-grid textarea { resize: vertical; }
.form-grid input:focus, .form-grid textarea:focus { border-color: rgba(18, 18, 18, .4); box-shadow: 0 0 0 3px rgba(18, 18, 18, .05); }
.form-grid input:disabled { color: rgba(18, 18, 18, .5); background: rgba(18, 18, 18, .035); }
.form-grid label > small { color: rgba(18, 18, 18, .42); font-size: 11px; line-height: 1.45; }
.secret-field input { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.contract-note { margin-top: 20px; border-radius: 10px; padding: 12px 14px; color: rgba(18, 18, 18, .62); background: rgba(18, 18, 18, .035); }
.contract-note strong { display: block; color: rgba(18, 18, 18, .76); font-size: 12px; }
.contract-note p { margin: 5px 0 0; font-size: 12px; line-height: 1.6; }
.status { margin: 14px 0 0; font-size: 12px; }
.status.ok { color: #2f6b3d; }
.status.error { color: #b42318; }
@media (max-width: 720px) {
  .page-head { align-items: stretch; flex-direction: column; gap: 14px; }
  .page-head button { align-self: flex-start; }
  .form-grid { grid-template-columns: 1fr; }
  .form-grid label.wide { grid-column: auto; }
}
</style>
