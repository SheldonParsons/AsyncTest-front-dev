<template>
  <section class="report-log-panel">
    <header class="report-log-panel-head">
      <div>
        <h3>过程日志</h3>
      </div>
      <div class="report-log-panel-actions">
        <span class="report-log-panel-count">{{ logs.length }} 条</span>
        <button class="report-log-generate-button" type="button" @click="emit('generate-docx')">生成 DOCX</button>
      </div>
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

const emit = defineEmits<{
  "generate-docx": [];
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
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  padding: 22px;
  background: #ffffff;
  isolation: isolate;
}

.report-log-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.report-log-panel-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
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
  margin: 0;
  color: #0f172a;
  font-size: 22px;
}

.report-log-generate-button {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid #111827;
  border-radius: 10px;
  background: #111827;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.report-log-generate-button:hover {
  transform: translateY(-1px);
  border-color: #000000;
  background: #000000;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.18);
}

.report-log-generate-button:focus-visible {
  outline: 3px solid rgba(16, 185, 129, 0.32);
  outline-offset: 3px;
}

.report-log-generate-button:active {
  transform: translateY(0) scale(0.97);
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  max-width: 100%;
  max-height: 520px;
  overflow: auto;
  overscroll-behavior: contain;
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
