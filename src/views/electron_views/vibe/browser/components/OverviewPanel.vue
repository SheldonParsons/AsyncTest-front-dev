<template>
  <div class="overview-grid">
    <section>
      <header><h2>模块分布</h2><span>{{ status.summary.module_count }} 个</span></header>
      <button v-for="item in status.summary.top_modules" :key="item.id" class="module-row" type="button" @click="$emit('open-module', item.path)">
        <div><strong>{{ item.path.join(' / ') }}</strong><small>{{ item.summary || '暂无摘要' }}</small></div>
        <i><b :style="{ width: `${moduleWidth(item.span_count)}%` }" /></i><em>{{ item.span_count }}</em>
      </button>
      <p v-if="!status.summary.top_modules.length" class="empty">尚无派生模块。</p>
    </section>

    <section>
      <header><h2>最近提交</h2><span>最近 {{ status.summary.recent_commits.length }} 条</span></header>
      <button v-for="item in status.summary.recent_commits" :key="item.id" class="commit-row" type="button" @click="$emit('open-commit', item.seq)">
        <span class="kind" :class="`is-${item.kind}`">{{ kindLabel(item.kind) }}</span>
        <div><strong>{{ item.reason || item.request_text || `提交 ${item.seq}` }}</strong><small>{{ item.actor_name || '未知用户' }} · {{ formatTime(item.created_at) }}</small></div>
        <em>#{{ item.seq }}</em>
      </button>
      <p v-if="!status.summary.recent_commits.length" class="empty">尚无知识提交。</p>
    </section>

    <section class="sources-section">
      <header><h2>最近来源</h2><span>{{ status.summary.source_count }} 份</span></header>
      <button v-for="item in sources" :key="item.id" class="source-row" type="button" @click="$emit('open-source', item.id)">
        <div><strong>{{ item.display_name || item.filename }}</strong><small>提交 #{{ item.commit_seq }} · {{ formatSize(item.chars) }} · {{ item.span_count }} 个索引跨度</small></div>
        <code>{{ item.content_hash.slice(0, 10) }}</code>
      </button>
      <p v-if="!sources.length" class="empty">尚无来源。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getKnowledgeSources, type KnowledgeSourceSummary, type KnowledgeStatus } from '../../api'

const props = defineProps<{ projectId: string; status: KnowledgeStatus }>()
defineEmits<{ 'open-source': [id: string]; 'open-commit': [seq: number]; 'open-module': [path: string[]] }>()
const sources = ref<KnowledgeSourceSummary[]>([])

watch(() => props.projectId, async (projectId) => {
  sources.value = projectId ? (await getKnowledgeSources(projectId, { limit: 8 })).items : []
}, { immediate: true })

function kindLabel(kind: string) {
  return ({ ingest: '录入', modify: '修改', delete: '删除', structure: '结构', rebuild: '重建' } as Record<string, string>)[kind] || kind
}

function moduleWidth(count: number) {
  const max = Math.max(1, ...props.status.summary.top_modules.map(item => item.span_count))
  return Math.max(5, Math.round(count / max * 100))
}

function formatTime(value: string) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '未知时间'
}

function formatSize(chars: number) {
  return chars > 1000 ? `${(chars / 1000).toFixed(1)}k 字符` : `${chars} 字符`
}
</script>

<style scoped lang="scss">
.overview-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 32px 44px; padding: 26px 30px 48px; }
section { min-width: 0; } .sources-section { grid-column: 1 / -1; }
header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #ececec; padding-bottom: 9px; }
h2 { margin: 0; font-size: 16px; font-weight: 650; } header span, small { color: #929292; font-size: 12px; }
button { width: 100%; border: 0; background: transparent; color: #202124; text-align: left; cursor: pointer; }
.module-row, .commit-row, .source-row { display: grid; align-items: center; min-height: 54px; padding: 8px 7px; border-bottom: 1px solid #f1f1f1; transition: background .16s ease; }
.module-row:hover, .commit-row:hover, .source-row:hover { background: #f6f6f6; }
.module-row { grid-template-columns: minmax(0, 1fr) 92px 30px; gap: 12px; }
.commit-row { grid-template-columns: 48px minmax(0, 1fr) 42px; gap: 10px; }
.source-row { grid-template-columns: minmax(0, 1fr) auto; gap: 16px; }
strong, small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
strong { font-size: 13px; font-weight: 600; } small { margin-top: 3px; }
.module-row i { height: 3px; overflow: hidden; background: #ececec; } .module-row i b { display: block; height: 100%; background: #242424; }
em { color: #8e8e8e; font-size: 11px; font-style: normal; text-align: right; }
.kind { justify-self: start; padding: 3px 6px; border-radius: 4px; background: #eee; color: #666; font-size: 11px; }
.kind.is-ingest { background: #eaf4ed; color: #397048; } .kind.is-delete { background: #f8eaea; color: #9a4848; } .kind.is-modify { background: #edf1f5; color: #506579; }
code { color: #999; font-size: 11px; } .empty { padding: 18px 6px; color: #999; font-size: 13px; }
@media (max-width: 760px) { .overview-grid { grid-template-columns: 1fr; padding: 20px 18px 40px; } .sources-section { grid-column: auto; } }
</style>
