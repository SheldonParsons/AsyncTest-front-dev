<template>
  <div class="source-reader">
    <aside>
      <div class="aside-head"><strong>来源</strong><span>{{ sourceItems.length }}</span></div>
      <div class="source-list" @scroll.passive="loadMoreOnScroll">
        <button v-for="item in sourceItems" :key="item.id" type="button" :class="{ active: detail?.id === item.id }" @click="selectSource(item.id)">
          <strong>{{ item.display_name || item.filename }}</strong>
          <small>{{ item.display_kind }} · 提交 #{{ item.commit_seq }} · {{ formatChars(item.chars) }} 字</small>
        </button>
        <p v-if="sourceLoading" class="muted">读取来源…</p>
      </div>
      <div class="aside-head structure-head"><strong>当前来源结构</strong><span>{{ outline.length }} 标题</span></div>
      <div class="outline-list">
        <button v-for="item in outline" :key="item.key" type="button" @click="jumpToOffset(item.offset)">
          <i :style="{ marginLeft: `${Math.max(0, item.level - 1) * 12}px` }" />
          <span>{{ item.label }}</span>
        </button>
        <template v-if="detail && !outline.length">
          <button class="whole-source" type="button" @click="jumpToOffset(0)"><i /><span>整段原文</span></button>
          <p class="outline-note">原文没有使用 Markdown 标题，内容仍已完整保存并建立检索跨度。</p>
        </template>
      </div>
    </aside>

    <section class="document-area">
      <header v-if="detail">
        <div><strong>{{ detail.display_name || detail.filename }}</strong><span>{{ detail.display_kind }} · 提交 #{{ detail.commit_seq }} · {{ detail.mime_type }} · {{ detail.content_hash.slice(0, 10) }}</span></div>
        <button type="button" aria-label="下载原文" title="下载原文" @click="downloadSource">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </header>
      <div ref="scrollEl" class="document-scroll" @scroll.passive="syncActiveSpan">
        <article v-if="detail && isMarkdown" class="markdown-body" v-html="renderedContent" />
        <article v-else-if="detail" class="plain-body">{{ detail.content }}</article>
        <p v-else class="empty">尚无来源。录入后的完整原文会显示在这里。</p>
      </div>

      <nav v-if="minimap.length" class="minimap" aria-label="原文位置预览" @mouseleave="hoverIndex = null">
        <button v-for="(item, index) in minimap" :key="item.id" type="button" :class="minimapClass(index)" @mouseenter="hoverIndex = index" @focus="hoverIndex = index" @blur="hoverIndex = null" @click="jumpToOffset(item.start_offset)">
          <i />
          <div v-if="hoverIndex === index" class="preview">
            <strong>{{ spanTitle(item) }}</strong><p>{{ item.text.slice(0, 150) }}</p>
          </div>
        </button>
      </nav>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { getKnowledgeSource, getKnowledgeSources, type KnowledgeSourceDetail, type KnowledgeSourceSpan, type KnowledgeSourceSummary } from '../../api'

const props = defineProps<{ projectId: string; requestedSourceId?: string; requestedPath?: string[]; requestedOffset?: number }>()
const sourceItems = ref<KnowledgeSourceSummary[]>([])
const sourceCursor = ref<number | null>(null)
const sourceLoading = ref(false)
const detail = ref<KnowledgeSourceDetail | null>(null)
const scrollEl = ref<HTMLElement | null>(null)
const hoverIndex = ref<number | null>(null)
const activeSpan = ref(0)

const isMarkdown = computed(() => /markdown|md$/i.test(detail.value?.mime_type || detail.value?.filename || ''))
const renderedContent = computed(() => DOMPurify.sanitize(String(marked.parse(detail.value?.content || '')), { USE_PROFILES: { html: true } }))
const outline = computed(() => {
  const seen = new Set<string>()
  return (detail.value?.spans || []).flatMap((span) => {
    const path = span.title_path || []
    const key = path.join('\u0000')
    if (!path.length || seen.has(key)) return []
    seen.add(key)
    return [{ key, label: path[path.length - 1], level: path.length, offset: span.start_offset }]
  })
})
const minimap = computed(() => sample(detail.value?.spans || [], 40))

watch(() => props.projectId, async () => reset(), { immediate: true })
watch(() => props.requestedSourceId, async (id) => { if (id && id !== detail.value?.id) await selectSource(id) })
watch(() => props.requestedPath, async (path) => {
  if (!path?.length || !detail.value) return
  const span = detail.value.spans.find(item => path.every((part, index) => item.title_path[index] === part))
  if (span) await nextTick(() => jumpToOffset(span.start_offset))
}, { deep: true })
watch(() => props.requestedOffset, async (offset) => { if (offset && detail.value) await nextTick(() => jumpToOffset(offset)) })

async function reset() {
  sourceItems.value = []
  sourceCursor.value = null
  detail.value = null
  if (!props.projectId) return
  await loadSources(true)
  const target = props.requestedSourceId || sourceItems.value[0]?.id
  if (target) await selectSource(target)
}

async function loadSources(resetList = false) {
  if (!props.projectId || sourceLoading.value || (!resetList && sourceCursor.value === null)) return
  sourceLoading.value = true
  try {
    const page = await getKnowledgeSources(props.projectId, { limit: 50, cursor: resetList ? 0 : sourceCursor.value || 0 })
    sourceItems.value = resetList ? page.items : [...sourceItems.value, ...page.items]
    sourceCursor.value = page.next_cursor ?? null
  } finally { sourceLoading.value = false }
}

async function selectSource(id: string) {
  if (!props.projectId) return
  detail.value = (await getKnowledgeSource(props.projectId, id)).source
  activeSpan.value = 0
  await nextTick(() => {
    if (props.requestedOffset) jumpToOffset(props.requestedOffset)
    else scrollEl.value?.scrollTo({ top: 0 })
  })
}

async function loadMoreOnScroll(event: Event) {
  const el = event.currentTarget as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) await loadSources(false)
}

function jumpToOffset(offset: number) {
  const el = scrollEl.value
  const contentLength = Math.max(1, detail.value?.content.length || 1)
  if (!el) return
  el.scrollTo({ top: Math.max(0, el.scrollHeight - el.clientHeight) * offset / contentLength, behavior: 'smooth' })
}

function syncActiveSpan() {
  const el = scrollEl.value
  const spans = minimap.value
  if (!el || !spans.length) return
  const progress = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
  const offset = progress * Math.max(1, detail.value?.content.length || 1)
  activeSpan.value = spans.reduce((best, item, index) => Math.abs(item.start_offset - offset) < Math.abs(spans[best].start_offset - offset) ? index : best, 0)
}

function minimapClass(index: number) {
  const distance = hoverIndex.value === null ? -1 : Math.abs(hoverIndex.value - index)
  return { active: hoverIndex.value === null && activeSpan.value === index, hover: hoverIndex.value === index, near1: distance === 1, near2: distance === 2, near3: distance === 3 }
}

function downloadSource() {
  if (!detail.value) return
  const url = URL.createObjectURL(new Blob([detail.value.content], { type: detail.value.mime_type || 'text/plain' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = detail.value.source_kind === 'text' ? `${detail.value.display_name || '对话输入'}.txt` : detail.value.filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function sample<T>(items: T[], max: number) {
  if (items.length <= max) return items
  return Array.from({ length: max }, (_, index) => items[Math.round(index * (items.length - 1) / (max - 1))])
}
function spanTitle(span: KnowledgeSourceSpan) { return span.title_path[span.title_path.length - 1] || detail.value?.display_name || detail.value?.filename || '原文片段' }
function formatChars(chars: number) { return chars > 1000 ? `${(chars / 1000).toFixed(1)}k` : String(chars) }
</script>

<style scoped lang="scss">
.source-reader { display: grid; grid-template-columns: 272px minmax(0, 1fr); height: 100%; min-height: 0; overflow: hidden; }
aside { display: grid; grid-template-rows: auto minmax(110px, .44fr) auto minmax(120px, .56fr); min-height: 0; overflow: hidden; border-right: 1px solid #e3e3e3; background: #fff; }
.aside-head { display: flex; align-items: center; justify-content: space-between; min-height: 42px; padding: 0 14px; } .aside-head strong { font-size: 12px; font-weight: 650; } .aside-head span { color: #929292; font-size: 10px; }
.structure-head { border-top: 1px solid #e7e7e7; }
.source-list, .outline-list { min-width: 0; min-height: 0; overflow-x: hidden; overflow-y: auto; padding: 0 7px 9px; }
.source-list button, .outline-list button { width: 100%; border: 0; background: transparent; color: #333; text-align: left; cursor: pointer; }
.source-list button { position: relative; display: block; min-height: 48px; padding: 7px 10px 7px 12px; border-radius: 4px; } .source-list button::before { position: absolute; top: 8px; bottom: 8px; left: 0; width: 2px; border-radius: 1px; background: transparent; content: ''; } .source-list button:hover { background: #f5f5f5; } .source-list button.active { background: #f0f0f0; } .source-list button.active::before { background: #1b1b1b; }
.source-list strong, .source-list small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .source-list strong { font-size: 12px; font-weight: 600; } .source-list small { margin-top: 3px; color: #999; font-size: 9px; }
.outline-list button { display: flex; align-items: center; gap: 7px; min-height: 30px; padding: 4px 9px; border-radius: 3px; color: #5f5f5f; font-size: 11px; } .outline-list button:hover { color: #111; background: #f4f4f4; } .outline-list button i { width: 4px; height: 4px; flex: 0 0 auto; border-radius: 50%; background: #bdbdbd; } .outline-list button span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.outline-note { margin: 4px 10px 0 20px; color: #999; font-size: 10px; line-height: 1.55; }
.document-area { position: relative; display: grid; grid-template-rows: auto minmax(0, 1fr); min-width: 0; min-height: 0; overflow: hidden; }
.document-area > header { display: flex; align-items: center; justify-content: space-between; min-height: 52px; padding: 7px 18px; border-bottom: 1px solid #e8e8e8; }
.document-area header strong, .document-area header span { display: block; } .document-area header strong { font-size: 13px; } .document-area header span { margin-top: 2px; color: #999; font-size: 10px; }
.document-area header button { display: grid; width: 30px; height: 30px; place-items: center; border: 0; border-radius: 5px; background: transparent; cursor: pointer; } .document-area header button:hover { background: #eee; }
.document-scroll { min-width: 0; overflow: auto; padding: 28px 68px 80px 70px; overscroll-behavior: contain; }
.markdown-body, .plain-body { width: min(1040px, 100%); margin: 0; color: #232323; font-size: 14px; line-height: 1.78; letter-spacing: 0; overflow-wrap: anywhere; }
.plain-body { white-space: pre-wrap; }
.markdown-body :deep(h1) { margin: 0 0 20px; padding-bottom: 11px; border-bottom: 1px solid #ddd; font-size: 24px; line-height: 1.35; }
.markdown-body :deep(h2) { margin: 30px 0 11px; padding-left: 10px; border-left: 2px solid #222; font-size: 19px; line-height: 1.4; }
.markdown-body :deep(h3) { margin: 23px 0 9px; font-size: 16px; line-height: 1.45; }
.markdown-body :deep(p), .markdown-body :deep(li) { margin-block: 8px; } .markdown-body :deep(code) { padding: 2px 5px; border-radius: 3px; background: #f1f1f1; }
.markdown-body :deep(pre) { padding: 15px; border: 1px solid #dedede; border-radius: 5px; background: #f7f7f7; overflow: auto; }
.markdown-body :deep(table) { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; } .markdown-body :deep(th), .markdown-body :deep(td) { padding: 7px 10px; border: 1px solid #ddd; text-align: left; vertical-align: top; }
.minimap { position: absolute; z-index: 4; top: 50%; left: 13px; display: flex; flex-direction: column; gap: 9px; transform: translateY(-50%); }
.minimap button { position: relative; width: 28px; height: 4px; padding: 0; border: 0; background: transparent; cursor: pointer; } .minimap i { position: absolute; left: 0; top: 1px; width: 7px; height: 2px; background: #c8c8c8; transition: width .12s ease, height .12s ease, background .12s ease; }
.minimap button.hover i { width: 23px; height: 2px; background: #1d1d1d; } .minimap button.near1 i { width: 17px; } .minimap button.near2 i { width: 13px; } .minimap button.near3 i { width: 10px; } .minimap button.active i { width: 18px; background: #222; }
.preview { position: absolute; left: 30px; top: 50%; width: 320px; height: 130px; transform: translateY(-50%); overflow: hidden; padding: 14px 16px; border: 1px solid #ddd; border-radius: 7px; background: #fff; box-shadow: 0 10px 28px rgba(0,0,0,.1); text-align: left; }
.preview strong { display: block; overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; } .preview p { display: -webkit-box; margin: 8px 0 0; overflow: hidden; color: #777; font-size: 12px; line-height: 1.55; -webkit-line-clamp: 4; -webkit-box-orient: vertical; }
.muted, .empty { color: #999; font-size: 12px; } .muted { padding: 9px; } .empty { padding: 40px; text-align: left; }
@media (max-width: 760px) { .source-reader { grid-template-columns: 1fr; grid-template-rows: 150px minmax(0, 1fr); } aside { grid-template-columns: 1fr 1fr; grid-template-rows: auto 1fr; border-right: 0; border-bottom: 1px solid #ddd; } .structure-head { border-top: 0; } .document-scroll { padding: 24px 20px 60px 38px; } .preview { width: 250px; } }
</style>
