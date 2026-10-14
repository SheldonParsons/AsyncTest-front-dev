<template>
  <section class="log-panel" aria-label="报告生成日志">
    <div class="log-panel-head">
      <h3>过程日志</h3>
      <span class="log-panel-count">{{ logs.length }} 条</span>
    </div>
    <div v-if="!logs.length" class="log-empty">
      <Activity :size="20" />
      <strong>开始生成后，过程会显示在这里</strong>
      <p>包括数据读取、缺陷统计与文件导出。</p>
    </div>
    <TransitionGroup
      v-else
      name="log-row"
      tag="div"
      class="log-list"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div
        v-for="log in logs"
        :key="log.id"
        class="log-row"
        :class="`is-${log.level}`"
      >
        <span class="log-node">
          <CircleCheck v-if="log.level === 'success'" :size="12" />
          <CircleAlert
            v-else-if="log.level === 'error' || log.level === 'warning'"
            :size="12"
          />
          <span v-else class="log-dot" />
        </span>
        <div class="log-body">
          <div class="log-title">
            <strong>{{ log.title }}</strong>
            <time>{{ log.timestamp }}</time>
          </div>
          <p>{{ log.detail }}</p>
        </div>
      </div>
    </TransitionGroup>
  </section>
</template>

<script setup lang="ts">
import { Activity, CircleCheck, CircleAlert } from "@/components/icons/lucide";
import type { ReportLogEntry } from "../types";
defineProps<{ logs: ReportLogEntry[] }>();
</script>

<style lang="scss">
.log-panel {
  min-width: 0;
}
.log-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}
.log-panel-head h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  color: #1f1f1f;
}
.log-panel-count {
  font-size: 11px;
  color: #a0a0a0;
}
.log-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 34px 20px;
  text-align: center;
  color: #a0a0a0;
}
.log-empty strong {
  font-size: 12px;
  font-weight: 550;
  color: #6b6b6b;
}
.log-empty p {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
}
.log-list {
  display: flex;
  flex-direction: column;
  max-height: 268px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #d4d4d4 transparent;
}
.log-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  padding: 11px 0;
  border-top: 1px solid #f2f2f2;
}
.log-node {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  color: #a0a0a0;
  background: #f4f4f4;
  border-radius: 5px;
}
.log-row.is-success .log-node {
  color: #0b6b57;
  background: #e8f6f1;
}
.log-row.is-error .log-node {
  color: #b42318;
  background: #fdeceb;
}
.log-body {
  min-width: 0;
}
.log-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}
.log-title strong {
  font-size: 12px;
  font-weight: 600;
  color: #2b2b2b;
}
.log-title time {
  flex-shrink: 0;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: #b0b0b0;
}
.log-body p {
  margin: 3px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: #8a8a8a;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.log-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #b4b4b4;
}
.log-row-enter-active {
  transition:
    opacity 0.26s ease,
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.log-row-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.log-row-move {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  .log-row-enter-active,
  .log-row-move {
    transition: none;
  }
}
</style>
