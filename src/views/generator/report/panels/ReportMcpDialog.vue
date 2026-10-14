<template>
  <Teleport to="body">
    <dialog ref="dialog" class="report-mcp-dialog" aria-labelledby="report-mcp-title" @close="emit('close')" @click="backdrop">
      <div class="report-mcp-shell">
        <header><div><small>ASYNCTEST · LOCAL MCP</small><h2 id="report-mcp-title">让 Agent 接着做报告</h2></div><button class="mcp-icon" aria-label="关闭 MCP 接入" @click="dialog?.close()"><X :size="18" /></button></header>
        <nav aria-label="MCP 接入内容"><button v-for="item in tabs" :key="item.key" :aria-current="tab === item.key ? 'page' : undefined" :class="{ active: tab === item.key }" @click="tab = item.key">{{ item.label }}</button></nav>
        <Transition name="mcp-page" mode="out-in">
          <section :key="tab" class="mcp-page">
            <template v-if="tab === 'status'">
              <div class="mcp-service"><span class="mcp-dot" :class="{ online: config?.connection.applicationAvailable && !config?.connection.stopped }" /><strong>asynctest-report</strong><span>{{ config ? `v${config.version}` : '桌面服务未连接' }}</span></div>
              <div class="mcp-state-grid"><div><small>桌面应用</small><b>{{ config?.connection.applicationAvailable ? '可用' : '不可用' }}</b></div><div><small>Agent 连接</small><b>{{ config?.connection.connectedAgents ? `${config.connection.connectedAgents} 个已连接` : '尚未连接' }}</b></div><div><small>报告控制</small><b>{{ config?.connection.stopped ? '已停止' : config ? '可接入' : '不可用' }}</b></div></div>
              <p>保持 AsyncTest 桌面运行即可。报告页面可以关闭，Agent 与桌面共用已保存的设置、草稿和文件。</p>
              <p v-if="config" class="mcp-muted">当前为{{ config.runtime === 'packaged' ? '正式安装包' : '开发版' }}，配置绑定这份安装及当前用户数据。连接状态来自实际进程，不随复制配置改变。</p>
              <p v-else class="mcp-notice">请在包含报告 MCP 的 AsyncTest 桌面版本打开此页面。浏览器预览不能启动本机报告服务。</p>
              <p v-if="config?.connection.restoreRequested" class="mcp-notice">Agent 已申请恢复控制，请在这里恢复。</p>
              <footer><button @click="load">刷新状态</button><button v-if="config" :disabled="busy" class="mcp-primary" @click="control">{{ config.connection.stopped || config.connection.restoreRequested ? '恢复 MCP 控制' : '停止 MCP 控制' }}</button></footer>
            </template>
            <template v-else-if="tab === 'config'">
              <div class="mcp-config-head"><div class="mcp-format"><button :class="{ active: format === 'codex' }" @click="format = 'codex'">Codex</button><button :class="{ active: format === 'json' }" @click="format = 'json'">通用 stdio JSON</button></div><button :disabled="!config" @click="copyConfig"><Check v-if="copied" :size="14" /><Copy v-else :size="14" />{{ copied ? '已复制' : '复制配置' }}</button></div>
              <pre>{{ config ? (format === 'codex' ? config.codexToml : config.stdioJsonText) : '请在 AsyncTest 桌面中获取当前实例配置。' }}</pre>
              <p>将配置加入客户端的 MCP 设置。Codex 使用 <code>config.toml</code> 的 MCP 配置；保存后重新连接服务器或新开会话。</p><p class="mcp-muted">命令路径由当前应用生成，无需手填。这里不会改写你的客户端配置文件，配置也不包含账号、密码或 token。</p>
            </template>
            <template v-else>
              <ol><li>启动 AsyncTest，完成首次配置迁移。</li><li>在“连接配置”复制并加入 Agent 的 MCP 设置。</li><li>让 Agent 调用 <code>report_get_context</code>。本页“Agent 连接”会显示实际连接数。</li></ol>
              <div class="mcp-examples"><button v-for="example in examples" :key="example" @click="copyText(example)">{{ example }}<Copy :size="13" /></button></div>
              <p>说“报告人改成李博”会保存为共享默认；说“这份报告人用李博”只覆盖当前草稿。只查看产品或项目不会改变已选范围。</p>
              <p class="mcp-muted">停止控制会取消正在运行的报告作业；恢复需要在桌面操作。连接异常时先确认桌面仍在运行，再重新复制当前安装的配置。</p>
            </template>
          </section>
        </Transition>
        <p v-if="message" class="mcp-feedback" role="status">{{ message }}</p>
      </div>
    </dialog>
  </Teleport>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { X, Copy, Check } from '@/components/icons/lucide';
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>(); const config = ref<any>(null); const tab = ref('status'); const format = ref('codex'); const copied = ref(false); const busy = ref(false); const message = ref('');
const tabs = [{ key: 'status', label: '服务状态' }, { key: 'config', label: '连接配置' }, { key: 'guide', label: '开始使用' }];
const examples = ['当前报告人是谁？', '查看当前草稿', '列出 CRM 产品下的项目', '这份报告最后加一段未解决问题'];
let removeListener: (() => void) | undefined;
async function load() { try { config.value = await window.electronAPI?.report?.getMcpConfig(); } catch { config.value = null; message.value = '无法读取桌面服务状态，请确认应用正在运行'; } }
async function control() { busy.value = true; try { await window.electronAPI.report.control(config.value.connection.stopped || config.value.connection.restoreRequested ? 'restore' : 'stop'); await load(); } finally { busy.value = false; } }
async function copyText(value: string) { try { await navigator.clipboard.writeText(value); message.value = '已复制'; } catch { message.value = '复制失败，请手动选择文本复制'; } }
async function copyConfig() { await copyText(format.value === 'codex' ? config.value.codexToml : config.value.stdioJsonText); copied.value = message.value === '已复制'; setTimeout(() => { copied.value = false; }, 2000); }
function backdrop(event: MouseEvent) { if (event.target === dialog.value) dialog.value?.close(); }
onMounted(async () => { dialog.value?.showModal(); await load(); removeListener = window.electronAPI?.report?.onChanged(() => void load()); });
onBeforeUnmount(() => { removeListener?.(); dialog.value?.close(); });
</script>
<style scoped lang="scss">
.report-mcp-dialog { width: min(780px, calc(100vw - 32px)); max-height: calc(100vh - 40px); border: 1px solid #d8d8d8; border-radius: 18px; padding: 0; background: #fff; color: #222; overflow: auto; scrollbar-width: none; box-shadow: 0 28px 90px #0002; &::-webkit-scrollbar { display: none; } &::backdrop { background: #1117; backdrop-filter: blur(4px); } &[open] { animation: mcp-in 180ms ease-out; } }
.report-mcp-shell { padding: 28px; font: 14px/1.65 inherit; header { display: flex; justify-content: space-between; align-items: flex-start; small { color: #858585; font-size: 10px; letter-spacing: 2px; } h2 { margin: 6px 0 24px; font-size: 24px; font-weight: 550; letter-spacing: -.6px; } } button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid #dedede; border-radius: 7px; padding: 8px 12px; color: #333; background: #fff; cursor: pointer; font: inherit; font-size: 12px; transition: background .15s; &:hover { background: #f3f3f3; } &:disabled { opacity: .4; cursor: default; } &:focus-visible { outline: 2px solid #333; outline-offset: 3px; } } .mcp-icon { border: 0; padding: 5px; } nav { display: flex; gap: 24px; border-bottom: 1px solid #eee; button { border: 0; border-radius: 0; padding: 10px 0; color: #888; &.active { border-bottom: 2px solid #222; color: #222; } } } }
.mcp-page { min-height: 340px; padding-top: 24px; p { font-size: 13px; line-height: 1.85; } ol { padding-left: 20px; line-height: 2.5; font-size: 13px; } footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; .mcp-primary { background: #222; color: #fff; border-color: #222; } } }
.mcp-service { display: flex; align-items: center; gap: 9px; strong { font: 16px ui-monospace, monospace; } > span:last-child { margin-left: auto; color: #888; font-size: 11px; } }
.mcp-dot { width: 7px; height: 7px; border: 1px solid #888; border-radius: 50%; &.online { background: #333; border-color: #333; } }
.mcp-state-grid { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #e7e7e7; border-radius: 9px; margin: 24px 0; > div { padding: 16px; border-right: 1px solid #eee; &:last-child { border: 0; } small, b { display: block; } small { color: #888; font-size: 11px; margin-bottom: 6px; } b { font-size: 15px; font-weight: 500; } } }
.mcp-muted { color: #888; }.mcp-notice { background: #f5f5f5; padding: 12px; border-radius: 7px; }.mcp-config-head { display: flex; justify-content: space-between; gap: 8px; }.mcp-format { display: flex; gap: 5px; .active { background: #eee; border-color: #bbb; } }
pre { font: 11px/1.65 ui-monospace, monospace; background: #f6f6f6; padding: 16px; border-radius: 9px; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 260px; overflow: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
.mcp-examples { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 20px 0; button { justify-content: space-between; text-align: left; } }.mcp-feedback { color: #666; font-size: 12px; margin: 8px 0 0; }.mcp-page-enter-active,.mcp-page-leave-active { transition: opacity .13s, transform .13s; }.mcp-page-enter-from,.mcp-page-leave-to { opacity: 0; transform: translateY(5px); }@keyframes mcp-in { from { opacity: 0; transform: translateY(8px); } }@media(prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }@media(max-width: 600px) { .report-mcp-shell { padding: 18px; }.mcp-examples { grid-template-columns: 1fr; }.mcp-state-grid > div { padding: 10px; } }
</style>
