<template>
  <div v-if="list.length" class="src">
    <button
      class="src-toggle"
      type="button"
      :aria-expanded="open"
      :aria-controls="sourceListId"
      @click="open = !open"
    >
      <svg class="src-caret" :class="{ open }" width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span class="src-toggle-label">来源</span>
      <span class="src-toggle-count">{{ list.length }}</span>
    </button>

    <!-- 事件只展示轻量引用描述；正文在用户点击后由右侧 Viewer 按需读取。 -->
    <div :id="sourceListId" v-show="open" class="src-cards">
      <button
        v-for="(source, i) in list"
        :key="`${source.sourceId}:${source.spanId}:${i}`"
        class="src-card"
        type="button"
        :disabled="!source.canOpen"
        :title="source.canOpen ? `在 Viewer 中打开 ${source.label}` : '该来源暂时缺少可读取标识'"
        :aria-label="source.canOpen ? `打开来源：${source.label}` : `${source.label} 暂不可打开`"
        @click="emit('open-source', source)"
      >
        <span class="src-card-head">
          <span class="src-idx">{{ i + 1 }}</span>
          <span v-if="source.sourceKind" class="src-mod">{{ source.sourceKind }}</span>
          <span class="src-ttl">{{ source.label }}</span>
        </span>
        <span v-if="source.location && source.location !== source.label" class="src-path">{{ source.location }}</span>
        <span v-if="source.preview" class="src-preview">{{ source.preview }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, ref } from 'vue'
import {
  normalizeConversationSourceCitation,
  type ConversationSourceCitation,
} from '../sourceCitationPolicy'

const props = defineProps<{ items?: unknown[] }>()
const emit = defineEmits<{
  'open-source': [source: ConversationSourceCitation]
}>()

const open = ref(false)
const sourceListId = `conversation-source-list-${getCurrentInstance()?.uid ?? 0}`
const list = computed(() => (
  Array.isArray(props.items)
    ? props.items.filter(Boolean).map(normalizeConversationSourceCitation)
    : []
))
</script>

<style scoped>
.src { width: 100%; max-width: 100%; box-sizing: border-box; }

/* 极简：灰色文字 + 展开/收起 icon，去掉胶囊边框/背景 */
.src-toggle {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 0; border: none; background: none; cursor: pointer;
  color: rgba(15, 15, 15, 0.5); font-size: 12.5px; line-height: 1.5;
  transition: color .15s;
}
.src-toggle:hover { color: rgba(15, 15, 15, 0.82); }
.src-toggle:focus-visible { outline: 2px solid rgba(15, 15, 15, 0.32); outline-offset: 2px; border-radius: 3px; }
.src-toggle-label { white-space: nowrap; }
.src-toggle-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
  background: rgba(15, 15, 15, 0.07); color: rgba(15, 15, 15, 0.6);
  font-size: 11px; font-weight: 600;
}
.src-caret { transition: transform .18s ease; opacity: 0.6; }
.src-caret.open { transform: rotate(180deg); }

/* 全部平铺；单项保持轻量，正文交给 Viewer。 */
.src-cards {
  margin-top: 8px; display: flex; flex-direction: column; gap: 8px;
  width: 100%; box-sizing: border-box;
}

.src-card {
  display: block; width: 100%; text-align: left; font: inherit; cursor: pointer;
  border: 1px solid rgba(15, 15, 15, 0.08); border-radius: 11px;
  background: rgba(255, 255, 255, 0.6); padding: 10px 12px;
  min-width: 0; box-sizing: border-box;
  color: inherit;
  transition: background-color .15s ease, border-color .15s ease, transform .15s ease;
}
.src-card:hover:not(:disabled) { background: #fff; border-color: rgba(15, 15, 15, 0.15); }
.src-card:active:not(:disabled) { transform: translateY(1px); }
.src-card:focus-visible { outline: 2px solid rgba(15, 15, 15, 0.32); outline-offset: 2px; }
.src-card:disabled { cursor: default; opacity: .62; }

.src-card-head {
  display: flex; align-items: center; gap: 7px;
  flex-wrap: nowrap; min-width: 0;
}
.src-idx {
  flex: 0 0 auto; min-width: 17px; height: 17px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 5px; background: rgba(15, 15, 15, 0.82); color: #fff;
  font-size: 11px; font-weight: 600;
}
.src-mod {
  flex: 0 0 auto; padding: 1px 8px; border-radius: 999px;
  background: rgba(15, 15, 15, 0.06); color: rgba(15, 15, 15, 0.66);
  font-size: 11px; font-weight: 500; white-space: nowrap;
}
.src-ttl {
  flex: 1 1 0; min-width: 0; font-size: 13px; font-weight: 500;
  color: rgba(15, 15, 15, 0.9); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.src-path {
  display: block; margin: 5px 0 0 24px; font-size: 11.5px; color: rgba(15, 15, 15, 0.45);
  word-break: break-word; overflow-wrap: anywhere; line-height: 1.45;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.src-preview {
  display: -webkit-box; margin: 5px 0 0 24px;
  font-size: 11.5px; line-height: 1.5; color: rgba(15, 15, 15, .62);
  overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
  word-break: break-word; overflow-wrap: anywhere;
}
</style>
