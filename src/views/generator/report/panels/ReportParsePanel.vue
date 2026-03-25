<template>
  <section class="panel">
    <header class="panel-head">
      <div>
        <span class="panel-kicker">Pipeline</span>
        <h3>解析与生成流程</h3>
      </div>
      <span class="panel-current">当前：{{ activeStepTitle }}</span>
    </header>

    <div class="step-list">
      <article v-for="step in steps" :key="step.key" class="step-card" :class="`is-${step.status}`">
        <div class="step-header">
          <strong>{{ step.title }}</strong>
          <span>{{ statusTextMap[step.status] }}</span>
        </div>
        <p>{{ step.description }}</p>
      </article>
    </div>

    <div class="result-list">
      <article v-for="item in parseItems" :key="item.id" class="result-card" :class="`is-${item.status}`">
        <div class="result-top">
          <strong>{{ item.title }}</strong>
          <span>{{ item.value }}</span>
        </div>
        <p>{{ item.detail }}</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ParseStatus, ReportParseItem, ReportStep, ReportStepKey } from "../types";

const props = defineProps<{
  steps: ReportStep[];
  parseItems: ReportParseItem[];
  activeStep: ReportStepKey;
}>();

const statusTextMap: Record<ParseStatus, string> = {
  idle: "未开始",
  ready: "已准备",
  pending: "进行中",
  success: "已完成",
  warning: "待接线",
};

const activeStepTitle = computed(() => {
  return props.steps.find((step) => step.key === props.activeStep)?.title ?? "未开始";
});
</script>

<style scoped lang="scss">
.panel {
  padding: 22px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.panel-kicker,
.panel-current {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.1);
  color: #0369a1;
  font-size: 11px;
  font-weight: 700;
}

.panel-head h3 {
  margin: 10px 0 0;
  color: #0f172a;
  font-size: 22px;
}

.step-list,
.result-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-list {
  margin-top: 18px;
}

.step-card,
.result-card {
  padding: 16px 18px;
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.96));
}

.step-card.is-pending,
.result-card.is-pending {
  border-color: rgba(14, 165, 233, 0.3);
}

.step-card.is-warning,
.result-card.is-warning {
  border-color: rgba(245, 158, 11, 0.3);
  background: linear-gradient(180deg, rgba(255, 251, 235, 0.96), rgba(255, 255, 255, 0.96));
}

.step-card.is-success,
.result-card.is-success {
  border-color: rgba(34, 197, 94, 0.28);
}

.step-header,
.result-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.step-header strong,
.result-top strong {
  color: #0f172a;
  font-size: 14px;
}

.step-header span,
.result-top span {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.step-card p,
.result-card p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.7;
}
</style>
