<template>
  <section class="global-control">
    <header>
      <div>
        <h1>全局控制</h1>
        <p>控制所有普通用户是否可以发起对话；管理员账号 a80646 始终可用。</p>
      </div>
      <button v-if="!loaded && !loading" type="button" :disabled="saving" @click="load">
        重新读取
      </button>
      <button v-else type="button" :disabled="loading || saving || !canSave" @click="save">
        {{ saving ? '保存中' : '保存' }}
      </button>
    </header>

    <article class="control-card">
      <p v-if="!loaded" role="status">{{ loading ? '正在读取对话状态…' : '对话状态未知，请重新读取。' }}</p>
      <label v-if="loaded" class="control-toggle">
        <input v-model="draft.disabled" type="checkbox" :disabled="loading || saving" />
        <span class="check" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
        </span>
        <span>
          <strong>禁用对话</strong>
          <small>开启后，普通用户不会进入对话、模型或知识检索链。</small>
        </span>
      </label>

      <label v-if="loaded && draft.disabled" class="reply-field">
        <span>返回给用户的内容</span>
        <textarea
          v-model="draft.message"
          maxlength="500"
          rows="4"
          placeholder="系统维护中，请稍后再试"
          :disabled="loading || saving"
        />
        <small>{{ draft.message.length }}/500</small>
      </label>

      <p v-if="status" :class="['status', statusKind]">{{ status }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { getVibeConversationControl, updateVibeConversationControl } from '../api'

const DEFAULT_MESSAGE = '系统维护中，请稍后再试'
const loading = ref(true)
const loaded = ref(false)
const saving = ref(false)
const status = ref('')
const statusKind = ref<'ok' | 'error'>('ok')
const draft = reactive({
  disabled: false,
  message: DEFAULT_MESSAGE,
})
const canSave = computed(() => loaded.value && (!draft.disabled || !!draft.message.trim()))

// 未知或异常配置不能当作“未禁用”，读取和保存响应使用同一校验。
function applyConfig(item: unknown) {
  if (!item || typeof item !== 'object'
    || !('disabled' in item) || typeof item.disabled !== 'boolean'
    || !('message' in item) || typeof item.message !== 'string') {
    throw new Error('服务端返回的对话配置无效')
  }
  draft.disabled = item.disabled
  draft.message = item.message || DEFAULT_MESSAGE
  loaded.value = true
}

async function load() {
  if (saving.value) return
  loading.value = true
  loaded.value = false
  status.value = ''
  try {
    const response = await getVibeConversationControl()
    applyConfig(response?.item)
  } catch (error: any) {
    status.value = `加载失败：${error?.message || String(error)}`
    statusKind.value = 'error'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (loading.value || saving.value || !canSave.value) return
  saving.value = true
  status.value = ''
  try {
    const response = await updateVibeConversationControl({
      disabled: draft.disabled,
      message: draft.message.trim() || DEFAULT_MESSAGE,
    })
    if (response?.ok !== true) throw new Error('服务端未确认保存成功')
    applyConfig(response.item)
    status.value = '已保存'
    statusKind.value = 'ok'
  } catch (error: any) {
    loaded.value = false
    status.value = `未能确认保存结果，请重新读取：${error?.message || String(error)}`
    statusKind.value = 'error'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.global-control { display: grid; gap: 18px; max-width: 760px; }
.global-control header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.global-control h1 { margin: 0; font-size: 22px; font-weight: 600; }
.global-control p { margin: 7px 0 0; color: rgba(18, 18, 18, .52); font-size: 13px; line-height: 1.6; }
.global-control header button { border: 0; border-radius: 9px; padding: 9px 18px; color: #fff; background: #171717; cursor: pointer; }
.global-control header button:disabled { opacity: .45; cursor: not-allowed; }
.control-card { border: 1px solid rgba(18, 18, 18, .09); border-radius: 14px; padding: 20px; background: #fff; box-shadow: 0 8px 30px rgba(18, 18, 18, .04); }
.control-toggle { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; }
.control-toggle input { position: absolute; opacity: 0; pointer-events: none; }
.check { width: 20px; height: 20px; flex: 0 0 auto; display: grid; place-items: center; border: 1px solid #c7c7c7; border-radius: 6px; background: #fff; }
.check svg { width: 14px; height: 14px; fill: none; stroke: #fff; stroke-width: 2.2; opacity: 0; }
.control-toggle input:checked + .check { border-color: #171717; background: #171717; }
.control-toggle input:checked + .check svg { opacity: 1; }
.control-toggle strong, .control-toggle small { display: block; }
.control-toggle strong { font-size: 15px; font-weight: 580; }
.control-toggle small { margin-top: 5px; color: rgba(18, 18, 18, .48); font-size: 12px; line-height: 1.5; }
.reply-field { display: grid; gap: 8px; margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(18, 18, 18, .07); }
.reply-field > span { font-size: 13px; font-weight: 550; }
.reply-field textarea { width: 100%; resize: vertical; border: 1px solid rgba(18, 18, 18, .14); border-radius: 10px; padding: 11px 12px; color: #181818; font: inherit; line-height: 1.6; outline: none; }
.reply-field textarea:focus { border-color: rgba(18, 18, 18, .4); box-shadow: 0 0 0 3px rgba(18, 18, 18, .05); }
.reply-field small { justify-self: end; color: rgba(18, 18, 18, .4); font-size: 11px; }
.status { margin-top: 14px !important; font-size: 12px !important; }
.status.ok { color: #2f6b3d !important; }
.status.error { color: #b42318 !important; }
</style>
