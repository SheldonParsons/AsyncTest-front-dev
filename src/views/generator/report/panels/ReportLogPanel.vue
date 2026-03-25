<template>
  <section class="report-log-panel">
    <header class="report-log-panel-head">
      <div>
        <h3>过程日志</h3>
      </div>
      <span class="report-log-panel-count">{{ logs.length }} 条</span>
    </header>

    <div class="log-list">
      <article v-for="log in logs" :key="log.id" class="log-card" :class="`is-${log.level}`">
        <div class="log-meta">
          <span>{{ log.timestamp }}</span>
          <span>{{ stepLabelMap[log.step] }}</span>
        </div>
        <strong>{{ log.title }}</strong>
        <p>{{ log.detail }}</p>
      </article>

      <div v-if="logs.length === 0" class="log-empty">点击“生成 DOCX”后，显示过程日志。</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ReportLogEntry, ReportStepKey } from "../types";

defineProps<{
  logs: ReportLogEntry[];
}>();

const stepLabelMap: Record<ReportStepKey, string> = {
  draft: "草稿",
  sources: "数据源",
  parse: "解析",
  generate: "生成",
};
</script>

<style scoped lang="scss">
.report-log-panel {
  padding: 22px;
}

.report-log-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.report-log-panel-kicker,
.report-log-panel-count {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.1);
  color: #166534;
  font-size: 11px;
  font-weight: 700;
}

.report-log-panel-head h3 {
  margin: 10px 0 0;
  color: #0f172a;
  font-size: 22px;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 520px;
  overflow: auto;
  padding-right: 4px;
}

.log-card {
  padding: 16px 18px;
  border-radius: 20px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #fafafa;
}

.log-card.is-success {
  border-color: rgba(34, 197, 94, 0.28);
}

.log-card.is-warning {
  border-color: rgba(245, 158, 11, 0.28);
  background: linear-gradient(180deg, rgba(255, 251, 235, 0.96), rgba(255, 255, 255, 0.96));
}

.log-card.is-error {
  border-color: rgba(239, 68, 68, 0.28);
  background: linear-gradient(180deg, rgba(254, 242, 242, 0.96), rgba(255, 255, 255, 0.96));
}

.log-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.log-card strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-size: 14px;
}

.log-card p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.8;
}

.log-empty {
  padding: 18px;
  border-radius: 18px;
  background: #fafafa;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}
</style>
