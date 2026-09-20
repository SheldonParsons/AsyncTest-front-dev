<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="fit-content"
    append-to-body
    align-center
    class="file-action-dialog"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="!locked"
    :before-close="requestClose"
    @closed="settleClosed"
  >
    <template #header>
      <div class="file-action-header">
        <h3>{{ title }}</h3>
        <button type="button" :disabled="locked" :aria-label="`关闭${title}窗口`" @click="close">
          <X :size="18" :stroke-width="1.8" />
        </button>
      </div>
    </template>
    <slot />
    <template #footer>
      <div class="file-action-footer">
        <button type="button" :disabled="locked" @click="close">取消</button>
        <button type="button" class="primary" :disabled="locked" @click="confirm">{{ confirmTitle }}</button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { ElDialog, ElMessage } from 'element-plus'
import { X } from '@/components/icons/lucide'

const props = defineProps<{
  title: string
  confirmTitle: string
  busy?: boolean
  beforeConfirm: () => boolean | Promise<boolean>
}>()
const visible = ref(false)
const confirming = ref(false)
const locked = computed(() => confirming.value || props.busy === true)
let closed: Promise<void> | null = null
let resolveClosed: (() => void) | null = null

function open(): Promise<void> {
  if (closed) return closed
  closed = new Promise(resolve => { resolveClosed = resolve })
  visible.value = true
  return closed
}

function close() {
  if (!locked.value) visible.value = false
}

function requestClose(done: () => void) {
  if (!locked.value) done()
}

function settleClosed() {
  resolveClosed?.()
  resolveClosed = null
  closed = null
}

async function confirm() {
  if (locked.value) return
  confirming.value = true
  try {
    if (await props.beforeConfirm()) visible.value = false
  } catch (reason) {
    ElMessage.error(reason instanceof Error ? reason.message : '操作失败，请重试')
  } finally {
    confirming.value = false
  }
}

onBeforeUnmount(settleClosed)
defineExpose({ open, close })
</script>

<style scoped lang="scss">
.file-action-header, .file-action-footer { display: flex; align-items: center; gap: 10px; }
.file-action-header { justify-content: space-between; }
.file-action-header h3 { margin: 0; font-size: 16px; color: #111827; }
.file-action-header button { display: grid; place-items: center; width: 28px; height: 28px; padding: 0; }
.file-action-footer { justify-content: flex-end; }
button { border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 12px; background: #fff; color: #334155; cursor: pointer; }
button:hover:not(:disabled) { background: #f1f5f9; }
button:focus-visible { outline: 2px solid #64748b; outline-offset: 2px; }
button:disabled { opacity: .5; cursor: not-allowed; }
button.primary { background: #111827; color: #fff; border-color: #111827; }
button.primary:hover:not(:disabled) { background: #000; }
</style>

<style lang="scss">
.el-dialog.file-action-dialog {
  max-width: calc(100vw - 40px);
  border-radius: 14px;
  padding: 20px;
  .el-dialog__body { max-height: calc(100dvh - 180px); overflow: auto; }
}
</style>
