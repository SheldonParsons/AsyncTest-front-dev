<template>
  <div v-if="state && state.checked" class="vrf">
    <button
      class="vrf-toggle"
      :class="{ 'is-flagged': !clean }"
      type="button"
      :disabled="clean"
      :aria-expanded="open"
      @click="!clean && (open = !open)"
    >
      <svg v-if="clean" class="vrf-ic ok" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 6.5 9.2 17.3 4 12.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <svg v-else class="vrf-ic warn" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 8.5v5M12 16.4h.01M10.3 3.9 2.5 18a1.6 1.6 0 0 0 1.4 2.4h16.2a1.6 1.6 0 0 0 1.4-2.4L13.7 3.9a1.6 1.6 0 0 0-2.8 0Z"
          stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="vrf-label">{{ clean ? '已核验' : '存疑' }}</span>
      <span v-if="!clean" class="vrf-count">{{ state.issues.length }}</span>
      <svg v-if="!clean" class="vrf-caret" :class="{ open }" width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>

    <transition name="vrf-expand">
      <ul v-show="open && !clean" class="vrf-list">
        <li v-for="(it, i) in state.issues" :key="i" class="vrf-item">
          <span class="vrf-dot" aria-hidden="true"></span>
          <span class="vrf-text">{{ it }}</span>
        </li>
      </ul>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ state?: { checked: boolean; clean: boolean; issues: string[] } | null }>()
const open = ref(false)
const clean = computed(() => !!props.state?.clean && !(props.state?.issues?.length))
</script>

<style scoped>
/* 与「来源」一致：容器整宽，展开列表在下方铺满 —— 徽章本身宽度不随展开变化。 */
.vrf { width: 100%; max-width: 100%; box-sizing: border-box; }

.vrf-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  max-width: 100%; padding: 4px 11px;
  border: 1px solid rgba(15, 15, 15, 0.1); border-radius: 999px;
  background: rgba(255, 255, 255, 0.55); color: rgba(15, 15, 15, 0.62);
  font-size: 12px; line-height: 1.5; cursor: default;
  transition: background .15s, border-color .15s, color .15s;
}
.vrf-toggle.is-flagged { cursor: pointer; }
.vrf-toggle.is-flagged:hover { background: rgba(255, 255, 255, 0.92); color: rgba(15, 15, 15, 0.92); border-color: rgba(15, 15, 15, 0.18); }
.vrf-ic.ok { color: #1f9d57; }
.vrf-ic.warn { color: #d08700; }
.vrf-label { white-space: nowrap; }
.vrf-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
  background: rgba(208, 135, 0, 0.14); color: #9a6207; font-size: 11px; font-weight: 600;
}
.vrf-caret { margin-left: 1px; transition: transform .18s ease; opacity: 0.55; }
.vrf-caret.open { transform: rotate(180deg); }

/* 明细：与来源卡同款中性卡片（不再是棕底米黄），左侧一个琥珀小点点题 */
.vrf-list {
  list-style: none; margin: 8px 0 0; padding: 9px 11px;
  max-height: 220px; overflow-y: auto; overscroll-behavior: auto;
  border: 1px solid rgba(15, 15, 15, 0.08); border-radius: 11px; background: rgba(255, 255, 255, 0.6);
  box-sizing: border-box; width: 100%;
  display: flex; flex-direction: column; gap: 8px;
}
.vrf-item {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 12.5px; line-height: 1.55; color: rgba(15, 15, 15, 0.74);
  word-break: break-word; overflow-wrap: anywhere;
}
.vrf-dot { flex: 0 0 auto; width: 6px; height: 6px; margin-top: 6px; border-radius: 50%; background: #d08700; }
.vrf-text { flex: 1 1 auto; min-width: 0; }

.vrf-expand-enter-active, .vrf-expand-leave-active { transition: opacity .16s ease; }
.vrf-expand-enter-from, .vrf-expand-leave-to { opacity: 0; }
</style>
