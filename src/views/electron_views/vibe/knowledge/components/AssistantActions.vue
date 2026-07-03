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
      <svg class="copy-stack-pop" width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect class="copy-back" x="11" y="9" width="16" height="16" rx="3" stroke="currentColor" stroke-width="2.2" />
        <rect class="copy-front" x="14" y="14" width="16" height="16" rx="3" fill="#fff" stroke="currentColor" stroke-width="2.2" />
        <rect class="copy-flash" x="14" y="14" width="16" height="16" rx="3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
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
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try { document.execCommand('copy') } catch { /* ignore */ }
    document.body.removeChild(textarea)
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

/* 复制图标动画，与提问区一致 */
.copy-stack-pop { overflow: visible; }
.copy-stack-pop .copy-back,
.copy-stack-pop .copy-flash { transform-origin: 20px 20px; }
.copy-stack-pop .copy-flash {
  opacity: 0;
  stroke-dasharray: 18 82;
  stroke-dashoffset: 18;
}
.aa-btn:hover .copy-stack-pop .copy-back {
  animation: copy-back-pop 1200ms cubic-bezier(0.25, 0.1, 0.25, 1) both;
}
.aa-btn:hover .copy-stack-pop .copy-flash {
  animation: copy-flash-run 1200ms cubic-bezier(0.25, 0.1, 0.25, 1) both;
}

@keyframes copy-back-pop {
  0%, 100% { opacity: 0.5; transform: translate(0, 0); }
  42%, 64% { opacity: 0.82; transform: translate(5px, -5px); }
}
@keyframes copy-flash-run {
  0%, 20% { opacity: 0; stroke-dashoffset: 18; }
  34% { opacity: 0.9; }
  72% { opacity: 0.9; stroke-dashoffset: -58; }
  88%, 100% { opacity: 0; stroke-dashoffset: -82; }
}
</style>
