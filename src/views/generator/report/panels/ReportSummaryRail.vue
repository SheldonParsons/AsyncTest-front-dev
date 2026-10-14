<template>
  <aside class="report-rail" aria-label="本步摘要">
    <div class="report-rail-head">
      <span class="report-rail-title">本步摘要</span>
      <span class="report-rail-count">{{ filled }} / {{ rows.length }}</span>
    </div>
    <dl class="report-rail-list">
      <div
        v-for="row in rows"
        :key="row.label"
        class="report-rail-row"
        :class="{ 'is-missing': !row.value }"
      >
        <dt>{{ row.label }}</dt>
        <dd :class="row.tone ? `is-${row.tone}` : ''">
          <span v-if="row.tone === 'ready'" class="report-rail-dot" />{{
            row.value || "待填写"
          }}
        </dd>
      </div>
    </dl>
    <p class="report-rail-note">{{ note }}</p>
  </aside>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  rows: { label: string; value: string; tone?: string }[];
  note: string;
}>();
const filled = computed(() => props.rows.filter((row) => row.value).length);
</script>

<style lang="scss">
/* 摘要在宽屏下占一列，把「一屏一步」留下的纵向空白变成实时可读的配置概览。 */
.report-rail {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 14px 15px 13px;
  background: var(--rw-surface-sunken);
  border: 1px solid var(--rw-line);
  border-radius: 12px;
  overflow-y: auto;
  scrollbar-width: none;
}
.report-rail::-webkit-scrollbar {
  display: none;
}
.report-rail-head {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--rw-line);
}
.report-rail-title {
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.02em;
  color: #3f3f3f;
}
.report-rail-count {
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: var(--rw-muted-2);
}
.report-rail-list {
  flex: 0 0 auto;
  margin: 0;
  padding: 10px 0 0;
}
.report-rail-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
}
.report-rail-row dt {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--rw-muted-2);
}
.report-rail-row dd {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  margin: 0;
  font-size: 11px;
  font-weight: 550;
  text-align: right;
  color: var(--rw-ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.report-rail-row.is-missing dd {
  font-weight: 500;
  color: var(--rw-muted-3);
}
.report-rail-row dd.is-ready {
  color: var(--rw-ready-ink);
}
.report-rail-dot {
  flex-shrink: 0;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--rw-ready);
}
.report-rail-note {
  flex-shrink: 0;
  margin: 0;
  padding-top: 10px;
  font-size: 10px;
  line-height: 1.6;
  color: var(--rw-muted-3);
  border-top: 1px solid var(--rw-line);
}
</style>
