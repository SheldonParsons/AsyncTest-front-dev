<template>
  <section class="recent-export-panel">
    <header class="recent-export-panel-head">
      <div>
        <h3>最近生成</h3>
        <p>仅保留最近 10 次成功生成的报告，点击即可手动保存到本地目录。</p>
      </div>
    </header>

    <div class="recent-export-list">
      <button
        v-for="record in records"
        :key="record.id"
        class="recent-export-card"
        type="button"
        :disabled="savingId === record.id"
        @click="$emit('save', record.id)"
      >
        <div class="recent-export-main">
          <strong>{{ record.fileName }}</strong>
          <p>{{ record.title }}</p>
          <div class="recent-export-meta">
            <span>{{ formatTime(record.createdAt) }}</span>
            <span>{{ formatSize(record.size) }}</span>
          </div>
          <div v-if="record.envNames.length" class="recent-export-tags">
            <span v-for="envName in record.envNames" :key="`${record.id}-${envName}`">{{ envName }}</span>
          </div>
        </div>
        <span class="recent-export-action">{{ savingId === record.id ? "保存中..." : "保存到本地" }}</span>
      </button>

      <div v-if="records.length === 0" class="recent-export-empty">生成成功后，最近记录会显示在这里。</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ReportRecentExportRecord } from "../types";

defineProps<{
  records: ReportRecentExportRecord[];
  savingId: string;
}>();

defineEmits<{
  save: [id: string];
}>();

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(size: number) {
  if (!size) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
</script>

<style scoped lang="scss">
.recent-export-panel {
  padding: 22px;
}

.recent-export-panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;

  h3 {
    margin: 0;
    color: #0f172a;
    font-size: 20px;
  }

  p {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.6;
  }
}

.recent-export-panel-count {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
}

.recent-export-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-export-card {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.96));
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.recent-export-card:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(59, 130, 246, 0.28);
  box-shadow: 0 10px 18px rgba(59, 130, 246, 0.08);
}

.recent-export-card:disabled {
  cursor: wait;
  opacity: 0.72;
}

.recent-export-main strong {
  display: block;
  color: #0f172a;
  font-size: 14px;
}

.recent-export-main p {
  margin: 6px 0 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.7;
}

.recent-export-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.recent-export-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;

  span {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.06);
    color: #334155;
    font-size: 11px;
    font-weight: 700;
  }
}

.recent-export-action {
  align-self: center;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.recent-export-empty {
  padding: 18px;
  border-radius: 18px;
  background: #fafafa;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}
</style>
