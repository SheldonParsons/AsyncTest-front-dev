<template>
  <section class="review-panel">
    <div class="review-readiness">
      <button
        v-for="item in steps"
        :key="item.key"
        type="button"
        class="review-readiness-row"
        :class="{ 'has-issue': issueCount(item.key) > 0 }"
        @click="
          issueCount(item.key)
            ? emit('jump', firstIssue(item.key))
            : emit('jump-page', item.key)
        "
      >
        <span class="review-readiness-mark">
          <CircleAlert v-if="issueCount(item.key)" :size="14" />
          <Check v-else :size="13" />
        </span>
        <span class="review-readiness-copy">
          <strong>{{ item.title }}</strong>
          <small>{{ summaries[item.key] }}</small>
        </span>
        <span class="review-readiness-state">{{
          issueCount(item.key) ? `待完善 ${issueCount(item.key)} 项` : "已就绪"
        }}</span>
        <ChevronRight :size="14" class="review-readiness-arrow" />
      </button>
    </div>

    <div class="review-detail">
      <div class="review-switch" role="tablist" aria-label="生成与日志">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          class="review-switch-tab"
          :class="{ 'is-active': modelTab === tab.key }"
          :aria-selected="modelTab === tab.key"
          @click="$emit('update:tab', tab.key)"
        >
          <component :is="tab.icon" :size="14" />
          {{ tab.label }}
          <span v-if="tabCount(tab.key)" class="review-switch-count">{{
            tabCount(tab.key)
          }}</span>
        </button>
      </div>

      <div v-if="modelTab === 'config'" class="review-content">
        <div class="review-field-grid">
          <ReportField
            name="qualityResult"
            label="质检结果"
            v-model="state.customFields.qualityResult"
            placeholder="例如：通过"
          />
          <ReportField
            name="secrecyLevel"
            label="秘密级别"
            v-model="state.customFields.secrecyLevel"
            placeholder="例如：秘密▲"
          />
          <ReportField
            name="zendaoBugLimit"
            label="缺陷统计上限"
            type="number"
            v-model="state.customFields.zendaoBugLimit"
            hint="限制本次读取的缺陷数量"
          />
          <ReportField
            name="testTypes"
            label="测试类型"
            v-model="state.customFields.testTypes"
            placeholder="用顿号或逗号分隔"
          />
          <ReportField
            name="actualResult"
            label="实际结果"
            class="is-span-2"
            v-model="state.customFields.actualResult"
            multiline
            placeholder="填写本次测试的实际结果"
          />
        </div>
        <p class="review-note">
          <Info :size="13" />这些文字会写入报告正文，请结合实际测试结果核对。
        </p>
      </div>

      <div v-else class="review-content">
        <Transition name="report-swap" mode="out-in">
          <div
            v-if="state.generatingReport"
            key="busy"
            class="report-banner is-busy"
            role="status"
          >
            <LoaderCircle :size="18" class="spin" />
            <div>
              <strong>{{
                state.runningZendaoRun ? "正在刷新禅道数据" : "正在生成报告文件"
              }}</strong>
              <p>请保留当前工作台，完成后即可保存报告。</p>
            </div>
          </div>
          <div
            v-else-if="generationSucceeded"
            key="done"
            class="report-banner is-done"
          >
            <span class="report-ready-dot" />
            <div>
              <strong>报告已生成，可以交付了</strong>
              <p>{{ state.recentExports[0]?.fileName }}</p>
            </div>
            <button
              class="report-button solid"
              type="button"
              :disabled="!!state.savingRecentExportId"
              @click="emit('save-export', state.recentExports[0]?.id || '')"
            >
              <Download :size="14" />保存报告
            </button>
          </div>
        </Transition>
        <ReportLogPanel :logs="state.logs" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  Check,
  ChevronRight,
  CircleAlert,
  Download,
  Info,
  ListChecks,
  Activity,
  LoaderCircle,
} from "@/components/icons/lucide";
import ReportField from "./ReportField.vue";
import ReportLogPanel from "./ReportLogPanel.vue";
import type { ReportDraftState } from "../types";
import type { ReportIssue, ReportPage } from "../validation";

const props = defineProps<{
  state: ReportDraftState;
  issues: ReportIssue[];
  generationSucceeded: boolean;
  summaries: Record<string, string>;
}>();
const emit = defineEmits<{
  "save-export": [id: string];
  jump: [issue: ReportIssue];
  "jump-page": [key: ReportPage];
}>();
const modelTab = defineModel<string>("tab", { default: "config" });

const steps = [
  { key: "basic", title: "基础信息" },
  { key: "environments", title: "生成环境" },
  { key: "sources", title: "数据源" },
] as const;
const tabs = [
  { key: "config", label: "报告内容", icon: ListChecks },
  { key: "activity", label: "过程与结果", icon: Activity },
];
const issueCount = (key: string) =>
  props.issues.filter((issue) => issue.page === key).length;
const tabCount = (key: string) =>
  key === "config" ? props.issues.length : props.state.logs.length;
const firstIssue = (key: string) =>
  props.issues.find((issue) => issue.page === key) as ReportIssue;
</script>

<style lang="scss">
.review-panel {
  display: grid;
  grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}
.review-readiness {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.review-readiness-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.16s ease;
}
.review-readiness-row:hover {
  background: #f7f7f7;
}
.review-readiness-mark {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  color: #ffffff;
  background: #009879;
  border-radius: 6px;
}
.review-readiness-row.has-issue .review-readiness-mark {
  color: #b42318;
  background: #fdeceb;
}
.review-readiness-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.review-readiness-copy strong {
  font-size: 13px;
  font-weight: 600;
  color: #1f1f1f;
}
.review-readiness-copy small {
  font-size: 11px;
  color: #969696;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.review-readiness-state {
  flex-shrink: 0;
  font-size: 11px;
  color: #969696;
}
.review-readiness-row.has-issue .review-readiness-state {
  color: #b42318;
  font-weight: 500;
}
.review-readiness-arrow {
  flex-shrink: 0;
  color: #c4c4c4;
}
.review-detail {
  min-width: 0;
}
.review-switch {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: #f2f2f2;
  border-radius: 9px;
}
.review-switch-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 550;
  color: #7a7a7a;
  background: transparent;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
  transition:
    color 0.18s ease,
    background 0.18s ease;
}
.review-switch-tab.is-active {
  color: #171717;
  background: #ffffff;
  box-shadow: 0 1px 2px rgb(16 16 16 / 6%);
}
.review-switch-count {
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  color: #a0a0a0;
}
.review-content {
  margin-top: 20px;
  outline: none;
}
.review-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 24px;
}
.review-field-grid .is-span-2 {
  grid-column: 1 / -1;
}
.review-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 18px 0 0;
  font-size: 11px;
  color: #969696;
}
.report-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 20px;
  border-radius: 10px;
  border: 1px solid #e6e6e6;
  background: #fafafa;
}
.report-banner > div {
  flex: 1;
  min-width: 0;
}
.report-banner strong {
  font-size: 13px;
  font-weight: 600;
  color: #1f1f1f;
}
.report-banner p {
  margin: 3px 0 0;
  font-size: 11px;
  color: #8a8a8a;
  overflow-wrap: anywhere;
}
.report-banner.is-done {
  border-color: #cfe9e1;
  background: #f4fbf9;
}
@media (max-width: 900px) {
  .review-panel {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
  .review-field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .review-field-grid .is-span-2 {
    grid-column: auto;
  }
}
</style>
