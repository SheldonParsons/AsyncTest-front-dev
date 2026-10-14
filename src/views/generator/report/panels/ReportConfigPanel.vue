<template>
  <section class="basic-panel">
    <div class="basic-row">
      <div class="basic-block">
        <div class="basic-block-head">
          <h3>报告人员</h3>
        </div>
        <div class="basic-grid is-2">
          <ReportField
            name="reporter"
            label="报告人"
            v-model="form.reporter"
            placeholder="填写报告人姓名"
          />
          <ReportField
            name="reviewer"
            label="复审人"
            v-model="form.reviewer"
            placeholder="填写复审人姓名"
          />
        </div>
      </div>

      <div class="basic-block">
        <div class="basic-block-head">
          <h3>禅道连接</h3>
          <span class="basic-block-note">仅用于读取测试数据</span>
        </div>
        <div class="basic-grid is-2">
          <ReportField
            name="zentaoUsername"
            label="禅道账号"
            v-model="form.zentaoUsername"
            placeholder="输入禅道账号"
          />
          <ReportField
            name="zentaoPassword"
            label="禅道密码"
            v-model="form.zentaoPassword"
            type="password"
            :placeholder="passwordConfigured ? '密码已保存，输入以替换' : '输入禅道密码'"
          />
        </div>
        <div class="basic-inline">
          <button v-if="passwordConfigured" type="button" class="report-button ghost" @click="$emit('clear-password')">清除已保存密码</button>
          <button
            type="button"
            class="report-button outline tone-snug"
            :disabled="
              testingConnection ||
              !form.zentaoUsername.trim() ||
              (!form.zentaoPassword && !passwordConfigured)
            "
            @click="$emit('test-connection')"
          >
            <LoaderCircle v-if="testingConnection" class="spin" :size="14" />
            <CircleCheck v-else-if="connectionStatus.type === 'success'" :size="14" />
            <RefreshCw v-else :size="14" />
            {{ testingConnection ? "正在连接" : "测试连接" }}
          </button>
          <Transition name="report-swap" mode="out-in">
            <span
              :key="connectionStatus.message + connectionStatus.type"
              class="basic-inline-status"
              :class="`is-${connectionStatus.type}`"
              aria-live="polite"
            >
              <span
                v-if="connectionStatus.type === 'success'"
                class="report-ready-dot"
              />{{ connectionStatus.message }}
            </span>
          </Transition>
        </div>
      </div>
    </div>

    <div class="basic-block">
      <div class="basic-block-head">
        <h3>测试范围</h3>
        <span class="basic-block-note">下拉支持输入搜索</span>
      </div>
      <div class="basic-grid is-3">
        <ReportField name="productId" label="产品" v-slot="field">
          <GeneratorDropdown
            v-bind="field"
            v-model="form.productId"
            :options="zentaoOptions.products"
            :loading="zentaoLoading.products"
            :disabled="zentaoLoading.products"
            :placeholder="zentaoLoading.products ? '加载中…' : '选择或搜索产品'"
            @open="$emit('ensure-products')"
            @change="$emit('change-product')"
          />
        </ReportField>
        <ReportField name="projectId" label="项目" v-slot="field">
          <GeneratorDropdown
            v-bind="field"
            v-model="form.projectId"
            :options="zentaoOptions.projects"
            :loading="zentaoLoading.projects"
            :disabled="!form.productId || zentaoLoading.projects"
            :placeholder="
              zentaoLoading.projects
                ? '加载中…'
                : !form.productId
                  ? '先选择产品'
                  : '选择或搜索项目'
            "
            @open="$emit('ensure-projects')"
            @change="$emit('change-project')"
          />
        </ReportField>
        <ReportField name="executionId" label="执行" v-slot="field">
          <GeneratorDropdown
            v-bind="field"
            v-model="form.executionId"
            :options="zentaoOptions.executions"
            :loading="zentaoLoading.executions"
            :disabled="!form.projectId || zentaoLoading.executions"
            :placeholder="
              zentaoLoading.executions
                ? '加载中…'
                : !form.projectId
                  ? '先选择项目'
                  : '选择或搜索执行'
            "
            @open="$emit('ensure-executions')"
            @change="$emit('change-execution')"
          />
        </ReportField>
        <ReportField name="testTaskId" label="测试单" v-slot="field">
          <GeneratorDropdown
            v-bind="field"
            v-model="form.testTaskId"
            :options="zentaoOptions.testTasks"
            @open="$emit('ensure-test-tasks')"
            :loading="zentaoLoading.testTasks"
            :disabled="!form.productId || zentaoLoading.testTasks"
            :placeholder="
              zentaoLoading.testTasks
                ? '加载中…'
                : !form.productId
                  ? '先选择产品'
                  : '选择或搜索测试单'
            "
          />
        </ReportField>
        <ReportField
          name="buildId"
          label="所属执行版本"
          :required="versionRequired"
          :optional-badge="!versionRequired"
          :hint="
            versionRequired ? '按版本统计缺陷时需要选择' : '当前环境按执行统计'
          "
          v-slot="field"
        >
          <GeneratorDropdown
            v-bind="field"
            v-model="form.buildId"
            :options="zentaoOptions.builds"
            :loading="zentaoLoading.builds"
            :disabled="!form.executionId || zentaoLoading.builds"
            :placeholder="
              zentaoLoading.builds
                ? '加载中…'
                : !form.executionId
                  ? '先选择执行'
                  : '选择或搜索版本'
            "
            empty-text="该执行下没有版本，可在禅道中为执行创建版本后重试"
            @open="$emit('ensure-builds')"
          />
        </ReportField>
        <div class="basic-grid-note">
          <Transition name="report-swap" mode="out-in">
            <p
              :key="linkageStatus.message + linkageStatus.type"
              class="basic-linkage"
              :class="`is-${linkageStatus.type}`"
              aria-live="polite"
            >
              {{ linkageStatus.message }}
            </p>
          </Transition>
          <button
            v-if="linkageStatus.type === 'error'"
            type="button"
            class="report-button text-inline"
            @click="$emit('test-connection')"
          >
            <RefreshCw :size="13" />重新连接
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import GeneratorDropdown from "./GeneratorDropdown.vue";
import ReportField from "./ReportField.vue";
import {
  CircleCheck,
  LoaderCircle,
  RefreshCw,
} from "@/components/icons/lucide";
import type {
  ReportDraftState,
  ReportDraftForm,
  ReportStatusState,
} from "../types";

defineProps<{
  form: ReportDraftForm;
  passwordConfigured?: boolean;
  zentaoOptions: ReportDraftState["zentaoOptions"];
  zentaoLoading: ReportDraftState["zentaoLoading"];
  testingConnection: boolean;
  connectionStatus: ReportStatusState;
  linkageStatus: ReportStatusState;
  versionRequired: boolean;
}>();
defineEmits<{
  "clear-password": [];
  "test-connection": [];
  "ensure-products": [];
  "ensure-projects": [];
  "ensure-executions": [];
  "ensure-test-tasks": [];
  "ensure-builds": [];
  "change-product": [];
  "change-project": [];
  "change-execution": [];
}>();
</script>

<style lang="scss">
.basic-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.basic-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 28px;
  align-items: start;
}
.basic-block {
  min-width: 0;
}
.basic-block-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.basic-block-head h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0.01em;
  color: #1f1f1f;
}
.basic-block-note {
  font-size: 11px;
  color: #a0a0a0;
}
.basic-grid {
  display: grid;
  gap: 2px 20px;
}
.basic-grid.is-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.basic-grid.is-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.basic-grid-note {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 18px;
  padding-top: 5px;
}
.basic-linkage {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: #969696;
}
.basic-linkage.is-error {
  color: #b42318;
}
.basic-inline {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 30px;
  margin-top: 6px;
}
.basic-inline-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #969696;
}
.basic-inline-status.is-success {
  color: #0b6b57;
}
.basic-inline-status.is-error {
  color: #b42318;
}
@media (max-width: 1100px) {
  .basic-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }
  .basic-grid.is-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 680px) {
  .basic-grid.is-2,
  .basic-grid.is-3 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
