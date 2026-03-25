<template>
  <section class="report-config-panel">
    <header class="report-config-panel-head">
      <div>
        <h3>报告基础信息</h3>
      </div>
    </header>

    <div class="form-grid">
      <label class="field">
        <span>报告人</span>
        <input v-model="form.reporter" type="text" placeholder="请输入报告人" />
      </label>

      <label class="field">
        <span>复审人</span>
        <input v-model="form.reviewer" type="text" placeholder="请输入复审人" />
      </label>

      <label class="field">
        <span>禅道账号</span>
        <input v-model="form.zentaoUsername" type="text" placeholder="请输入禅道账号" />
      </label>

      <label class="field">
        <span>禅道密码</span>
        <input v-model="form.zentaoPassword" type="password" placeholder="请输入禅道密码" />
      </label>
    </div>

    <div class="config-actions">
      <button class="test-btn" type="button" :disabled="testingConnection" @click="$emit('test-connection')">
        {{ testingConnection ? "连接中..." : "测试连接" }}
      </button>
      <span class="status-text" :class="`is-${connectionStatus.type}`">{{ connectionStatus.message }}</span>
    </div>

    <div class="linked-grid">
      <label class="field">
        <span>产品</span>
        <GeneratorDropdown
          v-model="form.productId"
          :options="zentaoOptions.products"
          :placeholder="zentaoLoading.products ? '加载中...' : '请选择产品'"
          trigger-label="选项"
          @open="$emit('ensure-products')"
          @change="$emit('change-product')"
        />
      </label>

      <label class="field">
        <span>项目</span>
        <GeneratorDropdown
          v-model="form.projectId"
          :options="zentaoOptions.projects"
          :placeholder="zentaoLoading.projects ? '加载中...' : '请选择项目'"
          :disabled="!form.productId || zentaoLoading.projects"
          trigger-label="选项"
          @change="$emit('change-project')"
        />
      </label>

      <label class="field">
        <span>执行</span>
        <GeneratorDropdown
          v-model="form.executionId"
          :options="zentaoOptions.executions"
          :placeholder="zentaoLoading.executions ? '加载中...' : '请选择执行'"
          :disabled="!form.projectId || zentaoLoading.executions"
          trigger-label="选项"
          @change="$emit('change-execution')"
        />
      </label>

      <label class="field">
        <span>测试单</span>
        <GeneratorDropdown
          v-model="form.testTaskId"
          :options="zentaoOptions.testTasks"
          :placeholder="zentaoLoading.testTasks ? '加载中...' : '请选择测试单'"
          :disabled="!form.productId || zentaoLoading.testTasks"
          trigger-label="选项"
        />
      </label>

      <label class="field field-span-2">
        <span>所属执行版本</span>
        <GeneratorDropdown
          v-model="form.buildId"
          :options="zentaoOptions.builds"
          :placeholder="zentaoLoading.builds ? '加载中...' : '请选择版本'"
          :disabled="!form.executionId || zentaoLoading.builds"
          trigger-label="选项"
        />
      </label>
    </div>

    <div class="status-text linkage-status" :class="`is-${linkageStatus.type}`">
      {{ linkageStatus.message }}
    </div>

    <div class="environment-head">
      <div>
        <h4>生成环境</h4>
        <p>默认保留测试环境和生产环境；新增其他环境后，后续会额外生成对应环境的测试报告。</p>
      </div>
      <button class="small-action-btn" type="button" @click="$emit('add-environment')">新增环境</button>
    </div>

    <div class="environment-list">
      <article v-for="(environment, index) in environments" :key="environment.id" class="environment-card">
        <div class="environment-card-head">
          <div class="environment-card-title">
            <label class="toggle-field">
              <input v-model="environment.enabled" type="checkbox" />
              <span>{{ environment.name || `环境 ${index + 1}` }} 启用</span>
            </label>
            <span v-if="isFixedEnvironment(environment)" class="fixed-tag">固定环境</span>
          </div>
          <button
            v-if="!isFixedEnvironment(environment)"
            class="small-action-btn small-action-btn-danger"
            type="button"
            @click="$emit('remove-environment', environment.id)"
          >
            删除
          </button>
        </div>

        <div class="environment-grid">
          <label class="field">
            <span>环境名称</span>
            <input
              v-model="environment.name"
              type="text"
              :disabled="isFixedEnvironment(environment)"
              :placeholder="isFixedEnvironment(environment) ? '' : '例如：UAT / 灰度环境'"
            />
            <small v-if="isFixedEnvironment(environment)" class="field-hint">固定环境名称，不可修改。</small>
          </label>

          <label class="field">
            <span>缺陷名称包含字符</span>
            <input v-model="environment.bugFilterKeyword" type="text" placeholder="用于后续过滤缺陷名称" />
            <small class="field-hint">可以通过逗号分隔，设置多个缺陷标题中包含的字符。</small>
          </label>

          <label class="field">
            <span>缺陷标题中不包含的字符</span>
            <input v-model="environment.bugExcludeKeyword" type="text" placeholder="用于排除缺陷标题" />
            <small class="field-hint">可以通过逗号分隔，设置多个缺陷标题中不包含的字符。</small>
          </label>

          <label class="field">
            <span>环境地址</span>
            <input v-model="environment.envUrl" type="text" placeholder="请输入环境地址" />
          </label>

          <label class="field">
            <span>GitLab 地址</span>
            <input v-model="environment.gitlabUrl" type="text" placeholder="请输入 GitLab 地址" />
          </label>

          <label class="field">
            <span>缺陷统计范围</span>
            <GeneratorDropdown
              v-model="environment.bugRange"
              :options="[
                { value: 'version', label: '按版本统计' },
                { value: 'execution', label: '按执行统计' },
              ]"
              placeholder="请选择统计范围"
              trigger-label="选项"
            />
            <small class="field-hint">按版本统计会使用当前选择的“所属执行版本”，按执行统计会使用当前执行。</small>
          </label>

          <label class="field field-span-2 checkbox-panel">
            <span>缺陷过滤策略</span>
            <label class="toggle-field">
              <input v-model="environment.filterBugWithoutSolution" type="checkbox" />
              <span>过滤不存在解决方案的 BUG</span>
            </label>
          </label>

          <label class="field field-span-2 checkbox-panel">
            <span>日期</span>
            <div class="date-row">
              <label class="toggle-field">
                <input v-model="environment.includeDate" type="checkbox" />
                <span>启用日期</span>
              </label>
              <input
                class="date-text-input"
                v-model="environment.reportDate"
                type="text"
                :disabled="!environment.includeDate"
                placeholder="例如：2026-03-24 或 2026-03-01 ~ 2026-03-24"
              />
            </div>
            <small class="field-hint">{{ getDateHint(environment) }}</small>
          </label>

          <label class="field field-span-2">
            <span>测试结论</span>
            <input v-model="environment.conclusion" type="text" placeholder="测试通过" />
          </label>

          <label class="field field-span-2">
            <span>项目风险</span>
            <input v-model="environment.projectRisk" type="text" placeholder="暂无" />
          </label>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import GeneratorDropdown from "./GeneratorDropdown.vue";
import type {
  ReportDraftForm,
  ReportEnvironmentConfig,
  ReportSelectOption,
  ReportStatusState,
} from "../types";

defineProps<{
  form: ReportDraftForm;
  environments: ReportEnvironmentConfig[];
  zentaoOptions: {
    products: ReportSelectOption[];
    projects: ReportSelectOption[];
    executions: ReportSelectOption[];
    testTasks: ReportSelectOption[];
    builds: ReportSelectOption[];
  };
  zentaoLoading: {
    products: boolean;
    projects: boolean;
    executions: boolean;
    testTasks: boolean;
    builds: boolean;
  };
  testingConnection: boolean;
  connectionStatus: ReportStatusState;
  linkageStatus: ReportStatusState;
}>();

defineEmits<{
  "test-connection": [];
  "ensure-products": [];
  "change-product": [];
  "change-project": [];
  "change-execution": [];
  "add-environment": [];
  "remove-environment": [id: string];
}>();

function isFixedEnvironment(environment: ReportEnvironmentConfig) {
  return environment.kind === "test" || environment.kind === "production";
}

function getDateHint(environment: ReportEnvironmentConfig) {
  if (environment.kind === "test") {
    return "测试环境：如果不填写将使用测试单的周期时间，否则使用该值作为报告的测试时间。";
  }

  if (environment.kind === "production") {
    return "生产环境：如果不填写将使用当天时间，否则使用该值作为报告的测试时间。";
  }

  return "其他环境：如果不填写将使用当天时间，否则使用该值作为报告的测试时间。";
}
</script>

<style scoped lang="scss">
.report-config-panel {
  padding: 22px;
}

.report-config-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.report-config-panel-kicker,
.report-config-panel-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.1);
  color: #166534;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.report-config-panel-head h3 {
  margin: 10px 0 0;
  color: #0f172a;
  font-size: 20px;
}

.form-grid,
.linked-grid,
.environment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span {
  color: #334155;
  font-size: 12px;
  font-weight: 700;
}

.field input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
  background: #ffffff;
  color: #0f172a;
  font-size: 14px;
  outline: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.field input:focus {
  border-color: rgba(34, 197, 94, 0.45);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
}

.field-span-2 {
  grid-column: 1 / -1;
}

.config-actions {
  margin-top: 14px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.test-btn,
.small-action-btn {
  border: 1px solid rgba(15, 23, 42, 0.1);
  min-height: 30px;
  padding: 0 12px;
  border-radius: 10px;
  background: #ffffff;
  color: #111827;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.test-btn {
  border-color: #111827;
  background: #111827;
  color: #ffffff;
}

.test-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #000000;
  border-color: #000000;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.2);
}

.small-action-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(15, 23, 42, 0.18);
  background: #f8fafc;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
}

.test-btn:disabled {
  cursor: wait;
  opacity: 0.72;
}

.linked-grid {
  margin-top: 16px;
}

.status-text {
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.linkage-status {
  margin-top: 12px;
}

.status-text.is-success {
  color: #15803d;
}

.status-text.is-error,
.small-action-btn-danger {
  color: #b91c1c;
}

.small-action-btn-danger:hover {
  border-color: rgba(185, 28, 28, 0.22);
  background: rgba(254, 242, 242, 0.96);
  box-shadow: 0 10px 18px rgba(127, 29, 29, 0.12);
}

.environment-head {
  margin-top: 18px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.environment-head h4 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
}

.environment-head p {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.6;
}

.environment-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.environment-card {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #fafafa;
}

.environment-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.environment-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.fixed-tag {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: #475569;
  font-size: 11px;
  font-weight: 600;
}

.toggle-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.toggle-field input {
  width: 14px;
  height: 14px;
  accent-color: #111827;
  cursor: pointer;
}

.checkbox-panel {
  padding: 10px 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 10px;
  background: #ffffff;
}

.date-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.date-text-input {
  max-width: 280px;
}

.field-hint {
  color: #6b7280;
  font-size: 11px;
  line-height: 1.6;
}

@media (max-width: 720px) {
  .form-grid,
  .linked-grid,
  .environment-grid {
    grid-template-columns: 1fr;
  }

  .field-span-2 {
    grid-column: auto;
  }

  .environment-head,
  .environment-card-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .date-text-input {
    max-width: none;
  }
}
</style>
