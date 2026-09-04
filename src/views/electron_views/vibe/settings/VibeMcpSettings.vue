<template>
  <div class="mcp-settings">
    <section class="mcp-hero">
      <div>
        <p class="eyebrow">STREAMABLE HTTP</p>
        <h1>知识库 MCP</h1>
        <p>让 Codex、Claude Code 和其他 Agent 使用当前账号有权访问的项目知识。</p>
      </div>
      <span class="status" :class="serviceStatusClass">
        <i />{{ serviceStatusText }}
      </span>
    </section>

    <div v-if="loading && !access" class="state-card">正在读取 MCP 配置…</div>
    <div v-else-if="error && !access" class="state-card error">{{ error }}</div>

    <template v-if="access">
      <section class="summary-grid">
        <article class="summary-card wide">
          <span>服务地址</span>
          <strong>{{ access.service.public_url || '尚未配置 MCP_PUBLIC_URL' }}</strong>
          <button v-if="access.service.public_url" type="button" @click="copy(access.service.public_url, '服务地址')">复制</button>
        </article>
        <article class="summary-card">
          <span>协议版本</span>
          <strong>{{ access.service.protocol_versions.join(' · ') }}</strong>
        </article>
        <article class="summary-card">
          <span>动态项目权限</span>
          <strong>{{ access.projects.length }} 个项目</strong>
        </article>
      </section>

      <section class="panel project-panel">
        <header class="panel-head">
          <div>
            <h2>当前可访问项目</h2>
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
      </section>

      <section class="panel create-panel">
        <header class="panel-head">
          <div>
            <h2>创建专属凭证</h2>
            <p>Token 只显示一次。默认永久有效，建议按设备或 Agent 分开创建。</p>
          </div>
        </header>
        <div class="form-grid">
          <label>
            <span>凭证名称</span>
            <input v-model.trim="draft.name" maxlength="100" placeholder="例如：Codex MacBook" />
          </label>
          <label>
            <span>有效期</span>
            <select v-model.number="draft.expiresInDays">
              <option :value="0">永久（默认）</option>
              <option :value="30">30 天</option>
              <option :value="90">90 天</option>
              <option :value="365">365 天</option>
            </select>
          </label>
        </div>
        <fieldset>
          <legend>权限</legend>
          <label v-for="option in scopeOptions" :key="option.value" class="scope-option">
            <input v-model="draft.scopes" type="checkbox" :value="option.value" />
            <span><strong>{{ option.label }}</strong><small>{{ option.description }}</small></span>
          </label>
        </fieldset>
        <p v-if="draft.expiresInDays === 0" class="risk-note">
          永久凭证不会自动过期。请只保存在受信任设备，并在设备丢失或不再使用时立即撤销。
        </p>
        <div class="create-actions">
          <span v-if="error" class="inline-error">{{ error }}</span>
          <button
            type="button"
            class="primary-button"
            :disabled="creating || !access.service.enabled || !draft.name || !draft.scopes.length"
            @click="createCredential"
          >{{ creating ? '正在创建…' : '创建凭证' }}</button>
        </div>
      </section>

      <section v-if="created" class="panel secret-panel" aria-live="polite">
        <header class="secret-head">
          <div>
            <p class="eyebrow">ONLY SHOWN ONCE</p>
            <h2>请现在保存 Token</h2>
            <p>离开或刷新此页面后不能再次查看；遗失后只能撤销并重新创建。</p>
          </div>
          <button type="button" class="dismiss-button" @click="created = null">我已保存</button>
        </header>
        <div class="token-row">
          <code>{{ created.token }}</code>
          <button type="button" @click="copy(created.token, 'Token')">复制 Token</button>
        </div>
        <div class="config-grid">
          <article v-for="config in configs" :key="config.key" class="config-card">
            <header><strong>{{ config.label }}</strong><span>{{ config.hint }}</span></header>
            <pre>{{ config.safe }}</pre>
            <footer>
              <button type="button" @click="copy(config.safe, `${config.label}安全配置`)">复制安全配置</button>
              <button type="button" class="danger-copy" @click="copyFull(config.label, config.full)">复制完整配置</button>
            </footer>
          </article>
        </div>
      </section>

      <section class="panel credentials-panel">
        <header class="panel-head">
          <div>
            <h2>已有凭证</h2>
            <p>这里只显示前缀和使用摘要，不保存也不返回明文 Token。</p>
          </div>
          <span>{{ activeCredentials.length }} 个有效凭证</span>
        </header>
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
              :disabled="revokingId === credential.id"
              @click="revoke(credential)"
            >{{ revokingId === credential.id ? '正在撤销…' : '撤销' }}</button>
          </article>
        </div>
        <p v-else class="empty">尚未创建 MCP 凭证。</p>
      </section>
    </template>

    <p v-if="copied" class="copy-toast" role="status">已复制：{{ copied }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
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

function tomlString(value: string) {
  return JSON.stringify(value)
}

const configs = computed(() => {
  if (!created.value) return []
  const service = created.value.service
  const url = service.public_url
  const token = created.value.token
  const serverName = service.server_name
  const env = service.token_env_var || 'ASYNCTEST_MCP_TOKEN'
  const codexSafe = `[mcp_servers.${serverName}]\nurl = ${tomlString(url)}\nbearer_token_env_var = ${tomlString(env)}\ndefault_tools_approval_mode = "writes"\ntool_timeout_sec = 300`
  const codexFull = `[mcp_servers.${serverName}]\nurl = ${tomlString(url)}\nhttp_headers = { Authorization = ${tomlString(`Bearer ${token}`)} }\ndefault_tools_approval_mode = "writes"\ntool_timeout_sec = 300`
  const claudeSafe = JSON.stringify({
    mcpServers: {
      [serverName]: {
        type: 'http',
        url,
        headers: { Authorization: `Bearer \${${env}}` },
      },
    },
  }, null, 2)
  const claudeFull = JSON.stringify({
    mcpServers: {
      [serverName]: {
        type: 'http',
        url,
        headers: { Authorization: `Bearer ${token}` },
      },
    },
  }, null, 2)
  const genericSafe = `URL: ${url}\nAuthorization: Bearer \${${env}}\nTransport: Streamable HTTP`
  const genericFull = `URL: ${url}\nAuthorization: Bearer ${token}\nTransport: Streamable HTTP`
  return [
    { key: 'codex', label: 'Codex config.toml', hint: '推荐：环境变量', safe: codexSafe, full: codexFull },
    { key: 'claude', label: 'Claude .mcp.json', hint: 'HTTP MCP', safe: claudeSafe, full: claudeFull },
    { key: 'generic', label: '通用配置', hint: 'Streamable HTTP', safe: genericSafe, full: genericFull },
  ]
})

async function load() {
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
  if (!access.value?.service.enabled || !draft.name || !draft.scopes.length) return
  creating.value = true
  error.value = ''
  try {
    created.value = await createVibeMcpCredential({
      name: draft.name,
      scopes: [...draft.scopes],
      expires_in_days: draft.expiresInDays,
    })
    draft.name = ''
    access.value = await getVibeMcpAccess()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '创建 MCP 凭证失败'
  } finally {
    creating.value = false
  }
}

async function revoke(credential: VibeMcpCredential) {
  if (!window.confirm(`确定撤销“${credential.name}”吗？撤销后使用它的客户端会立即失去访问权限。`)) return
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
    error.value = '复制失败，请手动选择文本复制'
  }
}

async function copyFull(label: string, value: string) {
  if (!window.confirm('完整配置包含明文 Token。只应粘贴到受信任设备的本地配置文件，确定继续复制吗？')) return
  await copy(value, `${label}完整配置`)
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
</script>

<style scoped>
.mcp-settings {
  width: min(1050px, 100%);
  margin: 0 auto;
  padding: 38px 46px 80px;
  color: rgba(18, 18, 18, 0.9);
}

.mcp-hero,
.panel-head,
.secret-head,
.create-actions,
.token-row,
.config-card header,
.config-card footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.mcp-hero { margin-bottom: 24px; }
.mcp-hero h1 { margin: 3px 0 8px; font-size: 28px; letter-spacing: -0.03em; }
.mcp-hero p, .panel-head p, .secret-head p { margin: 0; color: rgba(18,18,18,.52); line-height: 1.55; }
.eyebrow { font-size: 11px; font-weight: 750; letter-spacing: .12em; color: rgba(18,18,18,.4) !important; }

.status { display: inline-flex; align-items: center; gap: 8px; flex: none; padding: 8px 12px; border: 1px solid rgba(18,18,18,.1); border-radius: 999px; font-size: 13px; font-weight: 650; background: #fff; }
.status i { width: 8px; height: 8px; border-radius: 50%; background: #a8a8a8; }
.status.enabled i { background: #2ea66a; box-shadow: 0 0 0 4px rgba(46,166,106,.12); }

.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.summary-card, .panel, .state-card { border: 1px solid rgba(18,18,18,.08); border-radius: 18px; background: rgba(255,255,255,.94); box-shadow: 0 10px 32px rgba(18,18,18,.045); }
.summary-card { position: relative; min-width: 0; padding: 16px 18px; }
.summary-card.wide { grid-column: 1 / -1; padding-right: 78px; }
.summary-card span { display: block; margin-bottom: 7px; font-size: 12px; color: rgba(18,18,18,.44); }
.summary-card strong { display: block; overflow: hidden; font-size: 14px; white-space: nowrap; text-overflow: ellipsis; }
.summary-card button { position: absolute; top: 15px; right: 16px; }

.panel { margin-top: 12px; padding: 22px; }
.panel-head { align-items: flex-start; margin-bottom: 18px; }
.panel-head h2, .secret-head h2 { margin: 0 0 5px; font-size: 17px; }
.panel-head p, .secret-head p { font-size: 13px; }
.panel-head > span { color: rgba(18,18,18,.45); font-size: 12px; }
.text-button, .summary-card button, .dismiss-button { border: 0; background: transparent; color: rgba(18,18,18,.58); cursor: pointer; }

.project-list { display: flex; flex-wrap: wrap; gap: 8px; }
.project-list span, .badges span { border: 1px solid rgba(18,18,18,.08); border-radius: 999px; background: #f6f6f6; }
.project-list span { padding: 7px 10px; font-size: 13px; }
.project-list small { color: rgba(18,18,18,.38); }
.empty { margin: 8px 0 0; color: rgba(18,18,18,.4); font-size: 13px; }

.form-grid { display: grid; grid-template-columns: minmax(220px, 1fr) 190px; gap: 12px; }
.form-grid label > span, fieldset legend { display: block; margin-bottom: 8px; font-size: 12px; font-weight: 650; color: rgba(18,18,18,.6); }
.form-grid input, .form-grid select { width: 100%; height: 42px; padding: 0 12px; border: 1px solid rgba(18,18,18,.11); border-radius: 11px; outline: none; background: #fafafa; color: inherit; }
.form-grid input:focus, .form-grid select:focus { border-color: rgba(18,18,18,.34); box-shadow: 0 0 0 3px rgba(18,18,18,.05); }
fieldset { display: flex; flex-wrap: wrap; gap: 10px; margin: 18px 0 0; padding: 0; border: 0; }
fieldset legend { width: 100%; }
.scope-option { display: flex; align-items: flex-start; gap: 9px; flex: 1 1 220px; padding: 12px; border: 1px solid rgba(18,18,18,.08); border-radius: 12px; cursor: pointer; }
.scope-option input { margin-top: 2px; accent-color: #171b22; }
.scope-option strong, .scope-option small { display: block; }
.scope-option strong { margin-bottom: 3px; font-size: 13px; }
.scope-option small { color: rgba(18,18,18,.45); line-height: 1.4; }
.risk-note { margin: 14px 0 0; padding: 11px 13px; border: 1px solid rgba(185,121,22,.18); border-radius: 11px; background: rgba(255,244,222,.65); color: #815715; font-size: 12px; line-height: 1.5; }
.create-actions { margin-top: 16px; justify-content: flex-end; }
.inline-error { margin-right: auto; color: #b93a39; font-size: 12px; }
.primary-button { min-width: 118px; height: 39px; padding: 0 17px; border: 0; border-radius: 11px; background: #171b22; color: #fff; font-weight: 650; cursor: pointer; }
.primary-button:disabled { opacity: .38; cursor: not-allowed; }

.secret-panel { border-color: rgba(45,139,91,.22); background: linear-gradient(145deg, rgba(242,252,247,.96), #fff 55%); }
.secret-head { align-items: flex-start; }
.dismiss-button { flex: none; padding: 7px 0; }
.token-row { margin-top: 18px; padding: 11px 12px; border: 1px solid rgba(18,18,18,.09); border-radius: 12px; background: #15191f; }
.token-row code { overflow: hidden; color: #f4f6f8; font-size: 12px; white-space: nowrap; text-overflow: ellipsis; }
.token-row button { flex: none; border: 0; border-radius: 8px; padding: 7px 10px; background: #fff; color: #171b22; cursor: pointer; }
.config-grid { display: grid; gap: 12px; margin-top: 14px; }
.config-card { overflow: hidden; border: 1px solid rgba(18,18,18,.08); border-radius: 13px; background: #fff; }
.config-card header, .config-card footer { padding: 11px 13px; }
.config-card header span { color: rgba(18,18,18,.42); font-size: 11px; }
.config-card pre { max-height: 220px; margin: 0; padding: 14px; overflow: auto; background: #f6f6f6; color: #252a31; font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
.config-card footer { justify-content: flex-end; border-top: 1px solid rgba(18,18,18,.06); }
.config-card footer button { border: 1px solid rgba(18,18,18,.1); border-radius: 8px; padding: 7px 10px; background: #fff; cursor: pointer; }
.config-card footer .danger-copy { color: #9b3b35; }

.credential-list { display: grid; gap: 9px; }
.credential-list article { display: grid; grid-template-columns: minmax(200px, 1.15fr) minmax(390px, 2fr) auto; align-items: center; gap: 18px; padding: 14px; border: 1px solid rgba(18,18,18,.075); border-radius: 13px; }
.credential-list article.revoked { opacity: .55; }
.credential-main strong, .credential-main code { display: block; }
.credential-main code { margin-top: 4px; color: rgba(18,18,18,.45); font-size: 11px; }
.badges { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.badges span { padding: 3px 7px; font-size: 10px; }
.badges .revoked-badge { color: #a33432; background: #fff0ef; }
dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; margin: 0; }
dl div { min-width: 0; }
dt { margin-bottom: 4px; color: rgba(18,18,18,.38); font-size: 10px; }
dd { margin: 0; overflow: hidden; font-size: 11px; white-space: nowrap; text-overflow: ellipsis; }
.revoke-button { border: 0; background: transparent; color: #a33432; cursor: pointer; }

.state-card { padding: 30px; text-align: center; color: rgba(18,18,18,.5); }
.state-card.error { color: #b93a39; }
.copy-toast { position: fixed; right: 26px; bottom: 26px; z-index: 20; margin: 0; padding: 10px 14px; border-radius: 10px; background: #171b22; color: #fff; font-size: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.18); }

@media (max-width: 900px) {
  .mcp-settings { padding: 28px 24px 60px; }
  .credential-list article { grid-template-columns: 1fr; }
  dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .revoke-button { justify-self: start; }
}

@media (max-width: 620px) {
  .mcp-hero, .panel-head, .secret-head { align-items: flex-start; flex-direction: column; }
  .summary-grid, .form-grid { grid-template-columns: 1fr; }
  .summary-card.wide { grid-column: auto; }
}
</style>
