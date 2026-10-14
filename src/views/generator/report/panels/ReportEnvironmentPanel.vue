<template>
  <!-- TabsList / TabsTrigger 必须与 TabsContent 处于同一个 TabsRoot 内：
       之前它们在外层，触发的是整个工作台的页面切换，点击环境页签会把
       page 改成环境 id，于是渲染成空白页。 -->
  <TabsRoot
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', String($event))"
    class="environment-panel"
  >
    <div class="environment-rail">
      <TabsList class="environment-tabs" aria-label="选择生成环境">
        <TabsTrigger
          v-for="environment in environments"
          :key="environment.id"
          :value="environment.id"
          class="environment-tab"
        >
          <span
            class="environment-tab-dot"
            :class="{ 'is-on': environment.enabled }"
          />
          <span class="environment-tab-name">{{
            environment.name || "未命名环境"
          }}</span>
          <span
            v-if="environmentIssues(environment.id)"
            class="environment-tab-count"
            >{{ environmentIssues(environment.id) }}</span
          >
        </TabsTrigger>
      </TabsList>
      <button
        type="button"
        class="environment-add"
        aria-label="新增生成环境"
        @click="$emit('add')"
      >
        <Plus :size="14" />新增环境
      </button>
    </div>

    <div class="environment-body">
      <TabsContent
        v-for="environment in environments"
        :key="environment.id"
        :value="environment.id"
        class="environment-content"
      >
        <div class="environment-toolbar">
          <div class="environment-toolbar-copy">
            <h3>{{ environment.name || "新环境" }}</h3>
            <p>
              {{
                environment.enabled
                  ? "此环境会包含在本次报告中"
                  : "此环境已暂停，填写内容会保留"
              }}
            </p>
          </div>
          <div class="environment-toolbar-actions">
            <SwitchRoot
              :id="`enable-${environment.id}`"
              v-model="environment.enabled"
              class="report-switch"
              :aria-label="`启用${environment.name || '当前环境'}`"
            >
              <SwitchThumb class="report-switch-thumb" />
            </SwitchRoot>
            <label
              :for="`enable-${environment.id}`"
              class="report-switch-label"
              >{{ environment.enabled ? "已启用" : "未启用" }}</label
            >
            <button
              v-if="environment.kind === 'custom'"
              class="report-icon-button is-danger"
              type="button"
              aria-label="删除此环境"
              @click="$emit('remove', environment.id)"
            >
              <Trash2 :size="15" />
            </button>
          </div>
        </div>

        <fieldset
          :disabled="!environment.enabled"
          class="environment-fields"
          :class="{ 'is-paused': !environment.enabled }"
        >
          <div class="environment-field-grid">
            <ReportField
              :name="`env-${environment.id}-name`"
              label="环境名称"
              v-model="environment.name"
              :disabled="environment.kind !== 'custom'"
              placeholder="例如 UAT、灰度环境"
              :hint="
                environment.kind !== 'custom' ? '默认环境名称保持固定' : ''
              "
            />
            <ReportField
              :name="`env-${environment.id}-bugRange`"
              label="缺陷统计范围"
              v-slot="field"
            >
              <GeneratorDropdown
                v-bind="field"
                v-model="environment.bugRange"
                :disabled="!environment.enabled"
                :options="[
                  { value: 'version', label: '按版本统计' },
                  { value: 'execution', label: '按执行统计' },
                ]"
                placeholder="选择统计范围"
              />
            </ReportField>
            <ReportField
              :name="`env-${environment.id}-envUrl`"
              label="环境地址"
              v-model="environment.envUrl"
              placeholder="https://example.com"
            />
            <ReportField
              :name="`env-${environment.id}-gitlabUrl`"
              label="GitLab 地址"
              v-model="environment.gitlabUrl"
              placeholder="https://gitlab.example.com/project"
            />
            <ReportField
              :name="`env-${environment.id}-conclusion`"
              label="测试结论"
              v-model="environment.conclusion"
              multiline
              placeholder="填写本环境的测试结论"
            />
            <ReportField
              :name="`env-${environment.id}-projectRisk`"
              label="项目风险"
              v-model="environment.projectRisk"
              multiline
              placeholder="填写已知风险，无风险可填写暂无"
            />
          </div>

          <CollapsibleRoot
            v-model:open="advancedOpen"
            class="report-disclosure"
          >
            <CollapsibleTrigger class="disclosure-trigger">
              <span class="disclosure-trigger-copy">
                <Settings2 :size="14" />缺陷过滤与报告日期
                <span v-if="advancedDirty" class="disclosure-badge"
                  >已自定义</span
                >
              </span>
              <ChevronDown :size="15" class="disclosure-chevron" />
            </CollapsibleTrigger>
            <CollapsibleContent class="disclosure-content">
              <div class="disclosure-inner">
                <div class="environment-field-grid">
                  <ReportField
                    :name="`env-${environment.id}-bugFilterKeyword`"
                    label="标题包含"
                    v-model="environment.bugFilterKeyword"
                    :required="false"
                    optional-badge
                    placeholder="多个关键词用逗号分隔"
                  />
                  <ReportField
                    :name="`env-${environment.id}-bugExcludeKeyword`"
                    label="标题排除"
                    v-model="environment.bugExcludeKeyword"
                    :required="false"
                    optional-badge
                    placeholder="不统计包含这些词的缺陷"
                  />
                </div>
                <div class="environment-toggles">
                  <label class="report-check">
                    <input
                      v-model="environment.filterBugWithoutSolution"
                      type="checkbox"
                    />
                    <span>过滤没有解决方案的 BUG</span>
                  </label>
                  <label class="report-check">
                    <input v-model="environment.includeDate" type="checkbox" />
                    <span
                      >自定义报告日期<i
                        >未启用时沿用测试单周期或当天日期</i
                      ></span
                    >
                  </label>
                </div>
                <Transition name="report-reveal">
                  <div
                    v-if="environment.includeDate"
                    class="environment-date-grid"
                  >
                    <ReportField
                      :name="`env-${environment.id}-reportDate`"
                      label="报告日期"
                      v-model="environment.reportDate"
                      placeholder="2026-10-01 或 2026-10-01 ~ 2026-10-13"
                      hint="支持单个日期或起止日期范围，格式 YYYY-MM-DD"
                    />
                  </div>
                </Transition>
              </div>
            </CollapsibleContent>
          </CollapsibleRoot>
        </fieldset>
      </TabsContent>
    </div>
  </TabsRoot>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
  SwitchRoot,
  SwitchThumb,
  CollapsibleRoot,
  CollapsibleTrigger,
  CollapsibleContent,
} from "reka-ui";
import { Plus, Trash2, Settings2, ChevronDown } from "@/components/icons/lucide";
import GeneratorDropdown from "./GeneratorDropdown.vue";
import ReportField from "./ReportField.vue";
import type { ReportEnvironmentConfig } from "../types";
import type { ReportIssue } from "../validation";

const props = defineProps<{
  environments: ReportEnvironmentConfig[];
  modelValue: string;
  issues: ReportIssue[];
  revealField: string;
}>();
defineEmits<{
  add: [];
  remove: [id: string];
  "update:modelValue": [value: string];
}>();

const advancedOpen = ref(false);
const activeEnvironment = computed(() =>
  props.environments.find((env) => env.id === props.modelValue),
);
const advancedDirty = computed(() => {
  const env = activeEnvironment.value;
  if (!env) return false;
  return (
    !!env.bugFilterKeyword.trim() ||
    !!env.bugExcludeKeyword.trim() ||
    env.includeDate ||
    !env.filterBugWithoutSolution
  );
});
function environmentIssues(id: string) {
  return props.issues.filter((issue) => issue.environmentId === id).length;
}
watch(
  () => props.revealField,
  (field) => {
    if (field.endsWith("-reportDate")) advancedOpen.value = true;
  },
  { immediate: true },
);
</script>

<style lang="scss">
.environment-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  outline: none;
}
.environment-rail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ededed;
}
.environment-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.environment-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 7px 11px;
  font-size: 12px;
  font-weight: 550;
  color: #7a7a7a;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease;
}
.environment-tab:hover {
  color: #3d3d3d;
  background: #f5f5f5;
}
.environment-tab[data-state="active"] {
  color: #171717;
  background: #ffffff;
  border-color: #e2e2e2;
  box-shadow: 0 1px 2px rgb(16 16 16 / 5%);
}
.environment-tab-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d0d0d0;
  transition: background 0.24s ease;
}
.environment-tab-dot.is-on {
  background: #009879;
}
.environment-tab-count {
  padding: 0 5px;
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #b42318;
  background: #fdeceb;
  border-radius: 4px;
}
.environment-add {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 550;
  color: #5c5c5c;
  background: #ffffff;
  border: 1px solid #e2e2e2;
  border-radius: 8px;
  cursor: pointer;
  transition:
    color 0.16s ease,
    border-color 0.16s ease,
    background 0.16s ease;
}
.environment-add:hover {
  color: #171717;
  border-color: #b4b4b4;
  background: #fafafa;
}
.environment-body {
  min-width: 0;
}
.environment-content {
  outline: none;
}
.environment-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.environment-toolbar-copy h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f1f1f;
}
.environment-toolbar-copy p {
  margin: 3px 0 0;
  font-size: 11px;
  color: #969696;
}
.environment-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.report-switch-label {
  font-size: 11px;
  color: #969696;
  cursor: pointer;
  user-select: none;
}
.environment-fields {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
  transition: opacity 0.24s ease;
}
.environment-fields.is-paused {
  opacity: 0.45;
}
.environment-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
}
.environment-field-grid .is-span-2 {
  grid-column: 1 / -1;
}
/* 结论与风险并排，短文本不必各自占满一整行。 */
.environment-field-grid > .report-field:has(> textarea) textarea {
  min-height: 66px;
}
.report-check {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: #555555;
  cursor: pointer;
  user-select: none;
}
.report-check input {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  margin: 2px 0 0;
  accent-color: #171717;
}
.report-check i {
  display: block;
  margin-top: 2px;
  font-style: normal;
  font-size: 11px;
  color: #a0a0a0;
}
.environment-toggles {
  display: flex;
  align-items: flex-start;
  gap: 28px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.environment-date-grid {
  margin-top: 14px;
  max-width: 420px;
}
.report-disclosure {
  margin-top: 18px;
  border-top: 1px solid #ededed;
}
.disclosure-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 0;
  font-size: 12px;
  font-weight: 550;
  color: #5c5c5c;
  background: none;
  border: 0;
  cursor: pointer;
  transition: color 0.16s ease;
}
.disclosure-trigger:hover {
  color: #171717;
}
.disclosure-trigger-copy {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.disclosure-badge {
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 500;
  color: #0b6b57;
  background: #e8f6f1;
  border-radius: 4px;
}
.disclosure-chevron {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.disclosure-trigger[data-state="open"] .disclosure-chevron {
  transform: rotate(180deg);
}
.disclosure-content {
  overflow: hidden;
}
.disclosure-content[data-state="open"] {
  animation: report-expand 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.disclosure-content[data-state="closed"] {
  animation: report-collapse 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
.disclosure-inner {
  padding: 2px 0 14px;
}
@media (max-width: 900px) {
  .environment-field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .environment-field-grid .is-span-2 {
    grid-column: auto;
  }
  .environment-rail {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
}
</style>
