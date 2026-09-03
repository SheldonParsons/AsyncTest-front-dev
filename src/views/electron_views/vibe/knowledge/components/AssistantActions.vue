<!--
  回答区左下角操作栏：复制（仅最后回答正文，不含思考过程） + 点赞 + 点踩 + 时间。
  显隐规则（由父级 hover 控制，见 index.vue）：
    - 时间：始终 hover 才显示；
    - 复制/赞/踩：最后一条回复常驻显示，其余 hover 才显示。
  点赞/点踩暂无后端行为，仅本地视觉切换（TODO：后续接入后端）。
-->
<template>
  <div class="assistant-actions" :class="{ 'is-last': isLast }">
    <button class="aa-btn" type="button" title="复制回答" aria-label="复制回答内容" @click.stop="onCopy">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-copy-icon lucide-copy copy-icon"
        aria-hidden="true"
      >
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
    </button>
    <button
      class="aa-btn"
      :class="{ active: feedback === 'up' }"
      type="button"
      title="有帮助"
      aria-label="点赞"
      @click.stop="toggle('up')"
    >
      <ThumbsUp />
    </button>
    <button
      class="aa-btn"
      :class="{ active: feedback === 'down' }"
      type="button"
      title="待改进"
      aria-label="点踩"
      @click.stop="toggle('down')"
    >
      <ThumbsDown />
    </button>
    <time v-if="time" class="aa-time">{{ time }}</time>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ThumbsUp from './icons/ThumbsUp.vue'
import ThumbsDown from './icons/ThumbsDown.vue'

const props = defineProps<{ time?: string; content?: string; isLast?: boolean }>()

const feedback = ref<'up' | 'down' | null>(null)

async function onCopy() {
  const text = String(props.content || '').trim()
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    if (typeof window.$toast === 'function') {
      window.$toast({
        title: '复制成功',
        type: 'success',
        position: 'bottom-right',
        duration: 2500,
        actionText: '关闭',
      })
    }
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    let copied = false
    try {
      copied = document.execCommand('copy')
    } catch { /* ignore */ }
    document.body.removeChild(textarea)
    if (copied && typeof window.$toast === 'function') {
      window.$toast({
        title: '复制成功',
        type: 'success',
        position: 'bottom-right',
        duration: 2500,
        actionText: '关闭',
      })
    }
  }
}

// 暂无后端：仅本地切换视觉态，便于后续接入真实点赞/点踩接口。
function toggle(kind: 'up' | 'down') {
  feedback.value = feedback.value === kind ? null : kind
}
</script>

<style scoped lang="scss">
.assistant-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 5px;
  height: 20px;
  margin: 8px 0 0;
}

.aa-time {
  margin-left: 4px;
  color: rgba(15, 15, 15, 0.34);
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  opacity: 0;                     /* 时间：始终 hover 才显示 */
  transition: opacity 140ms ease;
}

.aa-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(15, 15, 15, 0.42);
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0;                     /* 默认隐藏，hover 显示 */
  pointer-events: none;
  transition: color 140ms ease, background 140ms ease, opacity 140ms ease;

  &:hover {
    color: rgba(15, 15, 15, 0.74);
    background: rgba(15, 15, 15, 0.055);
  }

  &.active {
    color: #111827;
  }
}

/* 最后一条回复：复制/赞/踩 常驻显示（时间仍 hover 才显示） */
.assistant-actions.is-last .aa-btn {
  opacity: 1;
  pointer-events: auto;
}

.copy-icon {
  width: 15px;
  height: 15px;
  display: block;
}
</style>
