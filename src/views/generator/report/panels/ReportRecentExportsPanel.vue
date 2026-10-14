<template>
  <section class="history-panel">
    <Transition name="report-fade" mode="out-in">
      <div v-if="!records.length" key="empty" class="history-empty">
        <span class="history-empty-mark"><History :size="22" /></span>
        <strong>还没有生成记录</strong>
        <p>完成报告配置并生成后，最近 10 份报告会保存在这里。</p>
        <button
          type="button"
          class="report-button solid"
          @click="$emit('configure')"
        >
          回到基础信息<ArrowRight :size="14" />
        </button>
      </div>
      <TransitionGroup v-else key="list" name="history-row" tag="div" class="history-list">
        <article
          v-for="record in records"
          :key="record.id"
          class="history-row"
        >
          <span class="history-mark"><FileText :size="16" /></span>
          <div class="history-copy">
            <h3>{{ record.fileName }}</h3>
            <p>
              <span>{{ formatTime(record.createdAt) }}</span>
              <i />
              <span>{{ formatSize(record.size) }}</span>
              <i />
              <span>{{ record.envNames.length }} 个环境</span>
            </p>
          </div>
          <div class="history-chips">
            <span v-for="name in record.envNames" :key="name">{{
              name
            }}</span>
          </div>
          <button
            class="report-button outline tone-snug"
            type="button"
            :disabled="!!savingId"
            @click="$emit('save', record.id)"
          >
            <LoaderCircle v-if="savingId === record.id" :size="13" class="spin" />
            <Download v-else :size="13" />
            {{ savingId === record.id ? "保存中…" : "保存到本地" }}
          </button>
        </article>
      </TransitionGroup>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import {
  History,
  FileText,
  Download,
  LoaderCircle,
  ArrowRight,
} from "@/components/icons/lucide";
import type { ReportRecentExportRecord } from "../types";
defineProps<{ records: ReportRecentExportRecord[]; savingId: string }>();
defineEmits<{ save: [id: string]; configure: [] }>();
function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}
function formatSize(size: number) {
  return size < 1024 * 1024
    ? `${(size / 1024).toFixed(1)} KB`
    : `${(size / 1024 / 1024).toFixed(2)} MB`;
}
</script>

<style lang="scss">
.history-panel {
  min-width: 0;
}
.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 320px;
  padding: 40px 24px;
  text-align: center;
  border: 1px dashed #e2e2e2;
  border-radius: 12px;
  background: #fcfcfc;
}
.history-empty-mark {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  color: #6b6b6b;
  background: #f2f2f2;
  border-radius: 12px;
}
.history-empty strong {
  font-size: 13px;
  font-weight: 600;
  color: #1f1f1f;
}
.history-empty p {
  max-width: 340px;
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: #969696;
}
.history-empty .report-button {
  margin-top: 8px;
}
.history-list {
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #d4d4d4 transparent;
}
.history-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 2px;
  border-bottom: 1px solid #f0f0f0;
}
.history-row:first-child {
  border-top: 1px solid #f0f0f0;
}
.history-mark {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 40px;
  color: #5c5c5c;
  background: #f6f6f6;
  border: 1px solid #ededed;
  border-radius: 9px;
}
.history-copy {
  flex: 1;
  min-width: 0;
}
.history-copy h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.history-copy p {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 3px 0 0;
  font-size: 11px;
  color: #a0a0a0;
}
.history-copy i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #d4d4d4;
}
.history-chips {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  max-width: 260px;
}
.history-chips span {
  padding: 2px 7px;
  font-size: 10px;
  color: #7a7a7a;
  background: #f6f6f6;
  border-radius: 5px;
}
.history-row-enter-active {
  transition:
    opacity 0.28s ease,
    transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}
.history-row-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.history-row-move {
  transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}
@media (max-width: 900px) {
  .history-chips {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .history-row-enter-active,
  .history-row-move {
    transition: none;
  }
}
</style>
