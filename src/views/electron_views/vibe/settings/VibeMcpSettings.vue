<template>
  <div class="mcp-settings">
    <section class="mcp-hero">
      <div>
        <h1>知识库 MCP</h1>
        <p>将项目知识连接到你的 Agent。</p>
      </div>
      <span class="status" :class="serviceStatusClass">
        <i />{{ serviceStatusText }}
      </span>
    </section>

    <div v-if="loading && !access" class="state-card">正在读取 MCP 配置…</div>
    <div v-else-if="error && !access" class="state-card error" role="alert">{{ error }} <button type="button" class="secondary-button" @click="load">重试</button></div>

    <template v-if="access">
      <section class="summary-grid" aria-label="连接信息">
        <article class="summary-card wide">
          <span>服务地址 <small>Streamable HTTP</small></span>
          <strong>{{ access.service.public_url || '尚未配置 MCP_PUBLIC_URL' }}</strong>
          <button v-if="access.service.public_url" type="button" @click="copy(access.service.public_url, '服务地址')">复制</button>
        </article>
        <article class="summary-card">
          <span>协议版本</span>
          <strong>{{ access.service.protocol_versions.join(' · ') }}</strong>
        </article>
        <article class="summary-card">
          <span>可访问项目</span>
          <strong>{{ access.projects.length }} 个项目</strong>
        </article>
      </section>

      <details class="panel project-panel">
        <summary>当前可访问项目 <span>{{ access.projects.length }} 个项目 · 权限随成员关系更新</span></summary>
        <header class="panel-head">
          <div>
            <p>项目成员关系实时生效，不写入 Token。退出项目后，原凭证会立即失去该项目权限。</p>
          </div>
          <button type="button" class="text-button" :disabled="loading" @click="load">刷新</button>
        </header>
        <div v-if="access.projects.length" class="project-list">
          <span v-for="project in access.projects" :key="project.id">
            {{ project.name }} <small>#{{ project.id }}</small>
          </span>
        </div>
        <p v-else class="empty">当前账号没有可访问的有效项目。</p>
      </details>

      <el-dialog
        v-model="createDialogOpen"
        class="mcp-credential-dialog"
        :title="created ? '保存凭证' : '创建凭证'"
        width="560px"
        append-to-body
        destroy-on-close
        :close-on-click-modal="false"
        :close-on-press-escape="!creating && !created"
        :show-close="!creating && !created"
        @closed="resetCreateDialog"
      >
      <div class="mcp-dialog-content">
      <form v-if="!created" class="create-panel" @submit.prevent="createCredential">
        <header class="panel-head">
          <div>
            <p>为设备或 Agent 创建独立凭证，按需设置访问权限。</p>
          </div>
        </header>
        <div class="form-grid">
          <label>
            <span>凭证名称</span>
            <input v-model.trim="draft.name" :disabled="creating" maxlength="100" autocomplete="off" placeholder="例如：Codex MacBook" />
          </label>
          <div class="expiry-field">
            <label for="mcp-credential-expiry">有效期</label>
            <el-select id="mcp-credential-expiry" v-model="draft.expiresInDays" :disabled="creating" :teleported="false" popper-class="mcp-expiry-options" aria-label="凭证有效期">
              <el-option v-for="option in expiryOptions" :key="option.value" :value="option.value" :label="option.label" />
            </el-select>
          </div>
        </div>
        <fieldset>
          <legend>权限</legend>
          <label v-for="option in scopeOptions" :key="option.value" class="scope-option" :class="{ selected: draft.scopes.includes(option.value) }">
            <input v-model="draft.scopes" :disabled="creating" type="checkbox" :value="option.value" />
            <span><strong>{{ option.label }}</strong><small>{{ option.description }}</small></span>
          </label>
        </fieldset>
        <p class="form-note">
          Token 仅显示一次，请及时保存。{{ draft.expiresInDays === 0 ? '永久凭证不会自动过期，不再使用时请撤销。' : '到期后需要重新创建凭证。' }}
        </p>
        <div class="create-actions">
          <span v-if="createError" class="inline-error" role="alert">{{ createError }}</span>
          <button type="button" class="secondary-button" :disabled="creating" @click="createDialogOpen = false">取消</button>
          <button
            type="submit"
            class="primary-button"
            :disabled="creating || !access.service.enabled || !draft.name || !draft.scopes.length"
          >{{ creating ? '正在创建…' : '创建凭证' }}</button>
        </div>
      </form>

      <section v-if="created" class="secret-panel" aria-live="polite">
        <header class="secret-head">
          <div>
            <h2>凭证已创建，请保存 Token</h2>
            <p>离开或刷新此页面后不能再次查看；遗失后只能撤销并重新创建。</p>
          </div>
        </header>
        <div class="token-row">
          <code>{{ created.token }}</code>
          <button type="button" @click="copy(created.token, 'Token')">复制 Token</button>
        </div>
        <p v-if="createError" class="inline-error" role="alert">{{ createError }}</p>
        <div class="create-actions"><button type="button" class="primary-button" :disabled="creating" @click="createDialogOpen = false">我已保存</button></div>
      </section>
      </div>
      </el-dialog>

      <section class="panel credentials-panel">
        <header class="panel-head">
          <div>
            <h2>当前凭证 <span class="count">{{ activeCredentials.length }}</span></h2>
            <p>管理 Agent 的访问权限与使用情况。</p>
          </div>
          <div class="panel-actions">
            <button type="button" class="secondary-button" :disabled="loading" @click="load">{{ loading ? '刷新中…' : '刷新' }}</button>
            <button type="button" class="primary-button" :disabled="loading || !access.service.enabled" @click="openCreateDialog"><span aria-hidden="true">＋</span> 创建凭证</button>
          </div>
        </header>
        <p v-if="error" class="inline-error" role="alert">{{ error }}</p>
        <div v-if="access.credentials.length" class="credential-list">
          <article v-for="credential in access.credentials" :key="credential.id" :class="{ revoked: !!credential.revoked_at }">
            <div class="credential-main">
              <strong>{{ credential.name }}</strong>
              <code>{{ credential.token_prefix }}…</code>
              <div class="badges">
                <span v-for="scope in credential.scopes" :key="scope">{{ scopeLabel(scope) }}</span>
                <span v-if="credential.revoked_at" class="revoked-badge">已撤销</span>
              </div>
            </div>
            <dl>
              <div><dt>有效期</dt><dd>{{ credential.permanent ? '永久' : formatTime(credential.expires_at) }}</dd></div>
              <div><dt>最近使用</dt><dd>{{ credential.last_used_at ? formatTime(credential.last_used_at) : '尚未使用' }}</dd></div>
              <div><dt>客户端</dt><dd>{{ clientText(credential) }}</dd></div>
              <div><dt>调用次数</dt><dd>{{ credential.call_count }}</dd></div>
            </dl>
            <button
              v-if="!credential.revoked_at"
              type="button"
              class="revoke-button"
              :disabled="revokingId !== null"
              @click="revoke(credential)"
            >{{ revokingId === credential.id ? '正在撤销…' : '撤销' }}</button>
          </article>
        </div>
        <p v-else class="empty">尚未创建 MCP 凭证。</p>
        <p class="credentials-note">仅显示凭证前缀。完整 Token 仅在创建时可见。</p>
      </section>
      <section class="panel connection-panel" aria-label="客户端连接配置">
        <header class="panel-head">
          <div>
            <h2>客户端连接配置</h2>
            <p>配置模板可随时复制。请将已保存的 Token 设置到对应环境变量中。</p>
          </div>
        </header>
        <p v-if="!access.service.public_url" class="form-note">服务地址尚未配置，配置模板暂不可用。</p>
        <template v-else>
        <div class="config-grid">
          <div class="config-tabs" role="tablist" aria-label="客户端配置">
            <button v-for="config in configs" :id="`mcp-tab-${config.key}`" :key="config.key" type="button" role="tab" :aria-selected="activeConfig === config.key" :aria-controls="`mcp-config-${config.key}`" :tabindex="activeConfig === config.key ? 0 : -1" @click="activeConfig = config.key" @keydown="navigateConfig($event, config.key)">{{ config.label }}</button>
          </div>
          <article v-for="config in configs" v-show="activeConfig === config.key" :id="`mcp-config-${config.key}`" :key="config.key" class="config-card" role="tabpanel" :aria-labelledby="`mcp-tab-${config.key}`" tabindex="0">
            <header><strong>{{ config.label }}</strong><span>{{ config.hint }}</span></header>
            <pre>{{ config.safe }}</pre>
            <footer>
              <button type="button" @click="copy(config.safe, `${config.label}安全配置`)">复制安全配置</button>
            </footer>
          </article>
        </div>
        </template>
      </section>
    </template>

    <p v-if="copied" class="copy-toast" role="status">已复制：{{ copied }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElDialog, ElSelect, ElOption, ElMessageBox } from 'element-plus'
import {
  createVibeMcpCredential,
  getVibeMcpAccess,
  revokeVibeMcpCredential,
  type VibeMcpAccess,
  type VibeMcpCredential,
  type VibeMcpCredentialCreated,
  type VibeMcpScope,
} from '../api'

const access = ref<VibeMcpAccess | null>(null)
const created = ref<VibeMcpCredentialCreated | null>(null)
const loading = ref(false)
const creating = ref(false)
const revokingId = ref<number | null>(null)
const error = ref('')
const createError = ref('')
const createDialogOpen = ref(false)
const activeConfig = ref('codex')
const expiryOptions = [
  { value: 0, label: '永久' },
  { value: 30, label: '30 天' },
  { value: 90, label: '90 天' },
  { value: 365, label: '365 天' },
]
const copied = ref('')
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const draft = reactive<{
  name: string
  expiresInDays: 0 | 30 | 90 | 365
  scopes: VibeMcpScope[]
}>({
  name: '',
  expiresInDays: 0,
  scopes: ['knowledge:read', 'knowledge:write', 'knowledge:audit:read'],
})

const scopeOptions: Array<{ value: VibeMcpScope; label: string; description: string }> = [
  { value: 'knowledge:read', label: '读取知识', description: '盘点、检索、分页读取和平台说明' },
  { value: 'knowledge:write', label: '发起变更', description: '生成新增、修改、删除预览；仍需逐次确认' },
  { value: 'knowledge:audit:read', label: '读取审计', description: '查看现有知识提交和回执' },
]

const activeCredentials = computed(() => access.value?.credentials.filter(item => !item.revoked_at) || [])
const serviceStatusText = computed(() => {
  if (access.value?.service.status === 'enabled') return '已启用'
  if (access.value?.service.status === 'misconfigured') return '配置不完整'
  return '未启用'
})
const serviceStatusClass = computed(() => access.value?.service.enabled ? 'enabled' : 'disabled')

function openCreateDialog() {
  createError.value = ''
  createDialogOpen.value = true
}

function resetCreateDialog() {
  created.value = null
  createError.value = ''
  draft.name = ''
  draft.expiresInDays = 0
  draft.scopes = scopeOptions.map(option => option.value)
}

function navigateConfig(event: KeyboardEvent, key: string) {
  const keys = configs.value.map(config => config.key)
  const index = keys.indexOf(key)
  let next = index
  if (event.key === 'ArrowRight') next = (index + 1) % keys.length
  else if (event.key === 'ArrowLeft') next = (index - 1 + keys.length) % keys.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = keys.length - 1
  else return
  event.preventDefault()
  activeConfig.value = keys[next]
  void nextTick(() => document.getElementById(`mcp-tab-${activeConfig.value}`)?.focus())
}

function tomlString(value: string) {
  return JSON.stringify(value)
}

const configs = computed(() => {
  const service = access.value?.service
  if (!service?.public_url) return []
  const url = service.public_url
  const serverName = service.server_name
  const env = service.token_env_var || 'ASYNCTEST_MCP_TOKEN'
  const codexSafe = `[mcp_servers.${serverName}]\nurl = ${tomlString(url)}\nbearer_token_env_var = ${tomlString(env)}\ndefault_tools_approval_mode = "writes"\ntool_timeout_sec = 300`
  const claudeSafe = JSON.stringify({
    mcpServers: {
      [serverName]: {
        type: 'http',
        url,
        headers: { Authorization: `Bearer \${${env}}` },
      },
    },
  }, null, 2)
  const genericSafe = `URL: ${url}\nAuthorization: Bearer \${${env}}\nTransport: Streamable HTTP`
  return [
    { key: 'codex', label: 'Codex config.toml', hint: '推荐：环境变量', safe: codexSafe },
    { key: 'claude', label: 'Claude .mcp.json', hint: 'HTTP MCP', safe: claudeSafe },
    { key: 'generic', label: '通用配置', hint: 'Streamable HTTP', safe: genericSafe },
  ]
})

async function load() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    access.value = await getVibeMcpAccess()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '读取 MCP 配置失败'
  } finally {
    loading.value = false
  }
}

async function createCredential() {
  if (creating.value || created.value || !access.value?.service.enabled || !draft.name || !draft.scopes.length) return
  creating.value = true
  createError.value = ''
  try {
    created.value = await createVibeMcpCredential({
      name: draft.name,
      scopes: [...draft.scopes],
      expires_in_days: draft.expiresInDays,
    })
    draft.name = ''
  } catch (reason) {
    createError.value = reason instanceof Error ? reason.message : '创建 MCP 凭证失败'
  } finally {
    creating.value = false
  }
  // 刷新失败不能把已创建凭证误报为创建失败，也不能丢失仅显示一次的 Token。
  if (created.value) await load()
}

async function revoke(credential: VibeMcpCredential) {
  if (revokingId.value !== null) return
  try {
    await ElMessageBox.confirm(`撤销后，使用“${credential.name}”的客户端将立即失去访问权限。`, '撤销凭证', { confirmButtonText: '撤销', cancelButtonText: '取消', customClass: 'mcp-confirm-dialog' })
  } catch { return }
  revokingId.value = credential.id
  error.value = ''
  try {
    await revokeVibeMcpCredential(credential.id)
    access.value = await getVibeMcpAccess()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '撤销 MCP 凭证失败'
  } finally {
    revokingId.value = null
  }
}

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    copied.value = label
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = '' }, 1800)
  } catch {
    if (createDialogOpen.value) createError.value = '复制失败，请手动选择文本复制'
    else error.value = '复制失败，请手动选择文本复制'
  }
}

function scopeLabel(scope: VibeMcpScope) {
  return scopeOptions.find(item => item.value === scope)?.label || scope
}

function formatTime(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

function clientText(credential: VibeMcpCredential) {
  if (!credential.last_client_name) return '尚未记录'
  return [credential.last_client_name, credential.last_client_version].filter(Boolean).join(' ')
}

onMounted(load)
onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})
</script>

<style scoped lang="scss">
.mcp-settings,
.mcp-dialog-content {
  --mcp-ink: #242426;
  --mcp-muted: #77777d;
  --mcp-line: rgba(28, 28, 32, .09);
  color: var(--mcp-ink);
  font-family: inherit;
  *, *::before, *::after { box-sizing: border-box; }
  button, input { font: inherit; }
  button { transition: background .18s ease, border-color .18s ease, box-shadow .18s ease; }
  button:disabled { opacity: .42; cursor: not-allowed; }
  button:focus-visible, summary:focus-visible {
    outline: 2px solid #73737b;
    outline-offset: 3px;
  }
}
.mcp-settings {
  box-sizing: border-box;
  width: min(100%, 1080px);
  margin: 0 auto;
  padding: 24px 32px 56px;
  animation: mcp-arrive .24s ease both;
}
.mcp-hero, .panel-head, .panel-actions, .secret-head, .create-actions,
.token-row, .config-card header, .config-card footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.mcp-hero { margin-bottom: 20px; }
.mcp-hero h1 { margin: 0 0 6px; font-size: 24px; font-weight: 650; letter-spacing: -.035em; }
.mcp-hero p, .panel-head p, .secret-head p {
  margin: 0;
  color: var(--mcp-muted);
  font-size: 12px;
  line-height: 1.65;
}
.status {
  display: inline-flex; align-items: center; gap: 7px; flex: none;
  padding: 6px 10px; border: 1px solid var(--mcp-line); border-radius: 99px;
  background: #f9f9fa; font-size: 12px;
}
.status i { width: 6px; height: 6px; border-radius: 50%; background: #a4a4aa; }
.status.enabled i { background: #32956a; }
.summary-grid, .panel {
  border: 1px solid var(--mcp-line);
  background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(245,245,247,.7));
  box-shadow: 0 6px 24px rgba(20,20,25,.035), inset 0 1px 0 #fff;
  border-radius: 16px;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.summary-grid { display: grid; grid-template-columns: minmax(0, 1fr) auto; padding: 16px 18px; gap: 14px 28px; }
.summary-card { min-width: 0; }
.summary-card.wide { grid-column: 1 / -1; position: relative; padding: 0 68px 14px 0; border-bottom: 1px solid var(--mcp-line); }
.summary-card span { display: block; margin-bottom: 5px; font-size: 11px; color: var(--mcp-muted); }
.summary-card small { margin-left: 8px; font-size: 10px; color: #8c8c92; }
.summary-card strong { display: block; font-size: 12px; font-weight: 550; overflow-wrap: anywhere; }
.summary-card.wide strong { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
.summary-card button { position: absolute; right: 0; top: 8px; }
.panel { margin-top: 12px; padding: 18px; }
.project-panel { padding-block: 12px; }
.project-panel summary { cursor: pointer; font-size: 12px; font-weight: 550; }
.project-panel summary > span { margin-left: 12px; color: var(--mcp-muted); font-size: 11px; font-weight: 400; }
.project-panel .panel-head { margin: 12px 0; }
.project-list { display: flex; flex-wrap: wrap; gap: 6px; max-height: 160px; overflow: auto; }
.project-list > span { padding: 5px 9px; border-radius: 7px; background: rgba(28,28,32,.04); font-size: 12px; overflow-wrap: anywhere; }
.project-list small { color: var(--mcp-muted); }
.credentials-panel { margin-top: 20px; padding: 0; overflow: hidden; background: rgba(255,255,255,.86); }
.credentials-panel > .panel-head { padding: 18px; margin: 0; }
.panel-head h2, .secret-head h2 { margin: 0 0 5px; font-size: 15px; font-weight: 650; }
.count { display: inline-flex; margin-left: 5px; padding: 2px 7px; border-radius: 6px; background: #f0f0f2; color: #68686e; font-size: 11px; vertical-align: middle; }
.panel-actions { flex: none; gap: 8px; }
.primary-button, .secondary-button, .summary-card button, .text-button, .config-card footer button, .revoke-button {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-height: 34px; padding: 0 12px; border: 1px solid var(--mcp-line);
  border-radius: 9px; background: rgba(255,255,255,.8); color: var(--mcp-ink);
  font-size: 12px !important; font-weight: 550; white-space: nowrap; cursor: pointer;
}
.primary-button { background: #242426; color: #fff; border-color: #242426; box-shadow: 0 2px 4px rgba(0,0,0,.08); }
.primary-button:hover:not(:disabled) { background: #080809; box-shadow: 0 4px 10px rgba(0,0,0,.14); }
.secondary-button:hover:not(:disabled), .summary-card button:hover, .text-button:hover:not(:disabled), .config-card footer button:hover { background: #ededf0; border-color: #d3d3d8; }
.credential-list article {
  display: grid; grid-template-columns: minmax(180px, 1fr) minmax(0, 1.4fr) auto;
  align-items: center; gap: 18px; padding: 16px 18px; border-top: 1px solid var(--mcp-line);
  transition: background .18s ease;
}
.credential-list article:hover { background: #f8f8fa; }
.credential-list article.revoked { background: #fafafa; color: #77777d; }
.credential-main { min-width: 0; }
.credential-main strong { display: block; font-size: 13px; font-weight: 600; overflow-wrap: anywhere; }
.credential-main code { display: block; margin-top: 4px; font-size: 11px; color: var(--mcp-muted); }
.badges { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.badges span { font-size: 10px; padding: 2px 6px; border-radius: 5px; background: #f0f0f2; color: #68686e; }
.badges .revoked-badge { color: #8a5555; }
dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; margin: 0; }
dl div { min-width: 0; }
dt { color: var(--mcp-muted); font-size: 10px; margin-bottom: 3px; }
dd { margin: 0; font-size: 11px; overflow-wrap: anywhere; }
.revoke-button { color: #8c4949; background: transparent; border-color: transparent; }
.revoke-button:hover:not(:disabled) { background: #f7eded; border-color: #ead9d9; }
.empty { padding: 36px 18px; margin: 0; color: var(--mcp-muted); font-size: 12px; text-align: center; }
.project-panel .empty { padding: 12px 0; text-align: left; }
.credentials-note { border-top: 1px solid var(--mcp-line); margin: 0; padding: 11px 18px; font-size: 11px; color: var(--mcp-muted); }
.state-card { border: 1px solid var(--mcp-line); border-radius: 12px; padding: 24px; color: var(--mcp-muted); font-size: 13px; text-align: center; }
.state-card.error, .inline-error { color: #ac4848; }
.inline-error { font-size: 12px; line-height: 1.6; margin: 0; }
.credentials-panel > .inline-error { padding: 0 18px 12px; }
.mcp-dialog-content { --el-color-primary: #242426; --el-border-radius-base: 9px; }
.create-panel .panel-head { margin-bottom: 20px; }
.form-grid { display: grid; grid-template-columns: minmax(0, 1fr) 144px; gap: 14px; }
.form-grid label > span, .expiry-field > label, fieldset legend { display: block; margin-bottom: 8px; color: #55555d; font-size: 12px; font-weight: 550; }
.form-grid input {
  width: 100%; height: 40px; padding: 0 12px; border: 1px solid #dcdce1;
  border-radius: 9px; background: #f9f9fb; color: #242426; outline: none; font-size: 13px;
  transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
}
.form-grid input:hover:not(:disabled) { border-color: #bdbdc6; }
.form-grid input:focus { border-color: #85858f; background: #fff; box-shadow: 0 0 0 3px rgba(60,60,70,.08); }
.form-grid input::placeholder { color: #9898a0; }
.expiry-field { min-width: 0; }
.expiry-field :deep(.el-select) { width: 100%; }
.expiry-field :deep(.el-select__wrapper) { min-height: 40px; background: #f9f9fb; border-radius: 9px; box-shadow: 0 0 0 1px #dcdce1 inset; }
.expiry-field :deep(.el-select__wrapper.is-focused) { box-shadow: 0 0 0 1px #85858f inset, 0 0 0 3px rgba(60,60,70,.08); }
fieldset { display: grid; gap: 8px; margin: 20px 0 0; padding: 0; border: 0; min-width: 0; }
.scope-option { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border: 1px solid var(--mcp-line); border-radius: 10px; cursor: pointer; background: #fafafa; transition: border-color .18s, background .18s; }
.scope-option.selected { background: #f3f3f5; border-color: #cfcfd5; }
.scope-option:hover { border-color: #adadb7; }
.scope-option:focus-within { outline: 2px solid #85858f; outline-offset: 2px; }
.scope-option input { width: 15px; height: 15px; margin: 2px 0 0; accent-color: #242426; flex: none; }
.scope-option strong, .scope-option small { display: block; }
.scope-option strong { font-size: 12px; font-weight: 550; }
.scope-option small { margin-top: 3px; color: var(--mcp-muted); font-size: 11px; line-height: 1.5; }
.form-note { margin: 14px 0 0; font-size: 11px; color: var(--mcp-muted); line-height: 1.7; }
.create-actions { justify-content: flex-end; flex-wrap: wrap; padding-top: 18px; margin-top: 18px; border-top: 1px solid var(--mcp-line); }
.create-actions .inline-error { flex-basis: 100%; }
.secret-head { align-items: flex-start; }
.token-row { margin-top: 16px; padding: 12px; border: 1px solid #dcdce1; border-radius: 10px; background: #f5f5f7; align-items: flex-start; }
.token-row code { min-width: 0; overflow-wrap: anywhere; font: 12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace; user-select: text; }
.token-row button { flex: none; border: 0; padding: 5px 7px; border-radius: 6px; color: #fff; background: #242426; cursor: pointer; font-size: 11px; }
.config-grid { margin-top: 20px; }
.connection-panel .config-grid { margin-top: 14px; }
.connection-panel h2 { margin-bottom: 5px; }
.connection-panel .config-tabs { width: fit-content; max-width: 100%; }
.connection-panel .config-tabs button { padding-inline: 14px; }
.config-tabs { display: flex; gap: 3px; padding: 4px; border-radius: 10px; background: #eeeef1; }
.config-tabs button { flex: 1; min-width: 0; padding: 8px 5px; border: 0; border-radius: 7px; color: #73737a; background: transparent; cursor: pointer; font-size: 11px; }
.config-tabs button[aria-selected="true"] { background: #fff; color: #242426; box-shadow: 0 1px 4px rgba(0,0,0,.07); }
.config-card { margin-top: 10px; border: 1px solid var(--mcp-line); border-radius: 10px; overflow: hidden; }
.config-card header, .config-card footer { padding: 10px 12px; font-size: 11px; }
.config-card header span { color: var(--mcp-muted); }
.config-card pre { max-height: 210px; margin: 0; padding: 12px; background: #f6f6f8; font: 11px/1.65 ui-monospace, SFMono-Regular, Menlo, monospace; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; }
.config-card footer { justify-content: flex-end; flex-wrap: wrap; }
.config-card footer button { min-height: 30px; font-size: 11px !important; }
.copy-toast { position: fixed; right: 24px; bottom: 24px; z-index: 4000; padding: 10px 14px; border-radius: 10px; background: #242426; color: #fff; font-size: 12px; box-shadow: 0 6px 20px rgba(0,0,0,.15); }
@keyframes mcp-arrive { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 900px) {
  .mcp-settings { padding: 20px 20px 40px; }
  .credential-list article { grid-template-columns: minmax(0, 1fr) auto; }
  .credential-list dl { grid-column: 1; grid-row: 2; }
  .revoke-button { grid-column: 2; grid-row: 1; }
}
@media (max-width: 560px) {
  .mcp-settings { padding: 16px 12px 32px; }
  .mcp-hero { align-items: flex-start; }
  .credentials-panel > .panel-head { align-items: flex-start; flex-direction: column; }
  .project-panel summary > span { display: block; margin: 5px 0 0; }
  .summary-grid, .form-grid { grid-template-columns: minmax(0, 1fr); }
  .summary-card.wide { grid-column: auto; }
  .token-row { flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) {
  .mcp-settings { animation: none; }
  .mcp-settings *, .mcp-dialog-content * { transition: none !important; }
}
</style>

<style lang="scss">
.el-message-box.mcp-confirm-dialog {
  --el-color-primary: #242426;
  --el-color-primary-light-3: #45454a;
  --el-color-primary-dark-2: #111113;
  border-radius: 16px;
  padding: 22px;
}
.el-dialog.mcp-credential-dialog {
  --el-color-primary: #242426;
  --el-dialog-padding-primary: 24px;
  --el-dialog-border-radius: 18px;
  width: min(560px, calc(100vw - 32px));
  margin-top: 8vh;
  padding: 24px;
  border: 1px solid rgba(255,255,255,.9);
  background: linear-gradient(145deg, rgba(255,255,255,.96), rgba(246,246,249,.92));
  box-shadow: 0 28px 90px rgba(20,20,30,.2), inset 0 1px 0 #fff;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  .el-dialog__header { padding: 0 28px 18px 0; }
  .el-dialog__title { font-size: 18px; font-weight: 650; letter-spacing: -.025em; color: #242426; }
  .el-dialog__body { max-height: 76vh; overflow-y: auto; padding: 2px; }
  .mcp-expiry-options { --el-color-primary: #242426; }
}
@media (prefers-reduced-motion: reduce) {
  .dialog-fade-enter-active:has(.mcp-credential-dialog),
  .dialog-fade-leave-active:has(.mcp-credential-dialog) { animation: none !important; transition: none !important; }
}
</style>
