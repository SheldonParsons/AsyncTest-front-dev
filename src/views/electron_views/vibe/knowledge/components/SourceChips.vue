<template>
  <div v-if="list.length" class="src">
    <button class="src-toggle" type="button" :aria-expanded="open" @click="open = !open">
      <svg class="src-caret" :class="{ open }" width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span class="src-toggle-label">来源</span>
      <span class="src-toggle-count">{{ list.length }}</span>
    </button>

    <!-- 展开：全部平铺、不滚动、原文直接完整展开 -->
    <div v-show="open" class="src-cards">
      <article v-for="(s, i) in list" :key="i" class="src-card">
        <header class="src-card-head">
          <span class="src-idx">{{ i + 1 }}</span>
          <span v-if="s.module" class="src-mod">{{ s.module }}</span>
          <span class="src-ttl">{{ s.title || tail(s.path) }}</span>
        </header>
        <p v-if="s.path" class="src-path" :title="s.path">{{ s.path }}</p>
        <div v-if="bodyText(s)" class="src-md" v-html="renderMd(bodyText(s))" />
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface Src { path?: string; module?: string; title?: string; snippet?: string; text?: string }
const props = defineProps<{ items?: Src[] }>()

const open = ref(false)
const list = computed(() => (Array.isArray(props.items) ? props.items.filter(Boolean) : []))

// 完整原文（text）优先；后端没回填时退回 snippet。直接整段展开，不再有"查看原文"二次点击。
function bodyText(s: Src) { return (s.text || s.snippet || '').trim() }
function tail(path?: string) { return (path || '').split('>').pop()?.trim() || path || '来源' }
function renderMd(md: string) {
  const html = marked.parse(md || '') as string
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}
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
.src-toggle-label { white-space: nowrap; }
.src-toggle-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
  background: rgba(15, 15, 15, 0.07); color: rgba(15, 15, 15, 0.6);
  font-size: 11px; font-weight: 600;
}
.src-caret { transition: transform .18s ease; opacity: 0.6; }
.src-caret.open { transform: rotate(180deg); }

/* 全部平铺、不滚动 */
.src-cards {
  margin-top: 8px; display: flex; flex-direction: column; gap: 8px;
  width: 100%; box-sizing: border-box;
}

.src-card {
  border: 1px solid rgba(15, 15, 15, 0.08); border-radius: 11px;
  background: rgba(255, 255, 255, 0.6); padding: 10px 12px;
  min-width: 0; box-sizing: border-box;
}

.src-card-head { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
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
  flex: 1 1 auto; min-width: 0; font-size: 13px; font-weight: 500;
  color: rgba(15, 15, 15, 0.9); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.src-path {
  margin: 5px 0 0; font-size: 11.5px; color: rgba(15, 15, 15, 0.45);
  word-break: break-word; overflow-wrap: anywhere; line-height: 1.45;
}

/* 原文：整段完整展开，不设高度上限、不滚动 */
.src-md {
  margin: 8px 0 2px; padding: 9px 11px;
  background: rgba(248, 249, 251, 0.85); border: 1px solid rgba(15, 15, 15, 0.06);
  border-radius: 8px; font-size: 12.5px; line-height: 1.65; color: rgba(15, 15, 15, 0.82);
  word-break: break-word; overflow-wrap: anywhere;
}
.src-md :deep(*) { max-width: 100%; }
.src-md :deep(p) { margin: 0 0 7px; }
.src-md :deep(p:last-child) { margin-bottom: 0; }
.src-md :deep(h1), .src-md :deep(h2), .src-md :deep(h3), .src-md :deep(h4) { font-size: 13px; font-weight: 600; margin: 8px 0 5px; }
.src-md :deep(ul), .src-md :deep(ol) { margin: 5px 0 7px 18px; padding: 0; }
.src-md :deep(li) { margin: 2px 0; }
.src-md :deep(code) { background: rgba(15, 15, 15, 0.06); padding: 1px 4px; border-radius: 4px; font-size: 11.5px; }
.src-md :deep(table) { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 11.5px; }
.src-md :deep(th), .src-md :deep(td) { border: 1px solid rgba(15, 15, 15, 0.12); padding: 4px 7px; text-align: left; vertical-align: top; }
.src-md :deep(th) { background: rgba(15, 15, 15, 0.04); font-weight: 600; }
</style>
