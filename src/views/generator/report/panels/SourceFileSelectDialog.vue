<template>
  <el-dialog
    v-model="visible"
    width="1240px"
    :show-close="false"
    class="source-file-dialog"
    style="border-radius: 12px"
    @close="handleClose"
  >
    <template #header="{ close }">
      <div class="source-file-dialog-header">
        <div>
          <h3>{{ title }}</h3>
          <p>{{ description }}</p>
        </div>
        <button class="dialog-close" type="button" @click="close">×</button>
      </div>
    </template>

    <div class="source-file-dialog-toolbar">
      <label class="project-field">
        <span>所属项目</span>
        <GeneratorDropdown
          v-model="selectedProjectId"
          :options="projects"
          :disabled="projectsLoading"
          :placeholder="projectsLoading ? '正在加载项目...' : '请选择项目'"
          trigger-label="选项"
          @change="handleProjectChange"
        />
      </label>
    </div>

    <div class="source-file-dialog-body">
      <FilesPage
        ref="filesPageRef"
        :selectable="true"
        :sync-route="false"
        :project-id="selectedProjectId"
        :allowed-extensions="allowedExtensions"
        :single-selection="singleSelection"
      />
    </div>

    <template #footer>
      <div class="source-file-dialog-footer">
        <button class="footer-btn footer-btn-light" type="button" @click="handleClose">取消</button>
        <button class="footer-btn footer-btn-primary" type="button" @click="submitSelection">{{ confirmLabel }}</button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import FilesPage from "@/views/settings/source_management/files_child/files_index.vue";
import GeneratorDropdown from "./GeneratorDropdown.vue";
import type { ReportSelectOption } from "../types";

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    projects: ReportSelectOption[];
    projectsLoading: boolean;
    projectId: string;
    title: string;
    description: string;
    allowedExtensions: string[];
    confirmLabel?: string;
    singleSelection?: boolean;
    emptySelectionMessage?: string;
  }>(),
  {
    confirmLabel: "加入当前列表",
    singleSelection: false,
    emptySelectionMessage: "请至少选择一个文件",
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "update:projectId": [value: string];
  confirm: [files: any[], project: ReportSelectOption | null];
}>();

const filesPageRef = ref<any>(null);
const selectedProjectId = ref(props.projectId);

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

watch(
  () => props.projectId,
  (value) => {
    selectedProjectId.value = value;
  }
);

function handleProjectChange() {
  emit("update:projectId", selectedProjectId.value);
  filesPageRef.value?.clean_select?.();
}

function handleClose() {
  filesPageRef.value?.clean_select?.();
  emit("update:modelValue", false);
}

function submitSelection() {
  if (!selectedProjectId.value) {
    window.$toast({ title: "请先选择项目", type: "warning" });
    return;
  }

  const selectedFiles = filesPageRef.value?.get_select?.() ?? [];
  if (!selectedFiles.length) {
    window.$toast({ title: props.emptySelectionMessage, type: "warning" });
    return;
  }

  const project = props.projects.find((item) => item.value === selectedProjectId.value) ?? null;
  const nextFiles = props.singleSelection ? selectedFiles.slice(-1) : selectedFiles;
  emit("confirm", nextFiles, project);
  filesPageRef.value?.clean_select?.();
  emit("update:modelValue", false);
}
</script>

<style scoped lang="scss">
.source-file-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 24px 0;

  h3 {
    margin: 0;
    color: #0f172a;
    font-size: 18px;
  }

  p {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 12px;
  }
}

.dialog-close {
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #f8fafc;
  color: #0f172a;
  font-size: 18px;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.dialog-close:hover {
  transform: translateY(-1px);
  background: #eef2f7;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
}

.source-file-dialog-toolbar {
  display: flex;
  align-items: end;
  gap: 12px;
  padding: 16px 24px 12px 0;
}

.project-field {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;

  span {
    color: #334155;
    font-size: 12px;
    font-weight: 700;
  }
}

.source-file-dialog-body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.source-file-dialog-footer {
  padding: 10px 24px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.footer-btn {
  border: 1px solid rgba(15, 23, 42, 0.1);
  min-height: 34px;
  padding: 0 14px;
  border-radius: 10px;
  background: #fff;
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

.footer-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(15, 23, 42, 0.18);
  background: #f8fafc;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
}

.footer-btn-primary {
  border-color: #111827;
  background: #111827;
  color: #ffffff;
}

.footer-btn-primary:hover {
  background: #000000;
  border-color: #000000;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.2);
}
</style>

<style lang="scss">
.source-file-dialog {
  .el-dialog {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 64px);
    overflow: hidden;
  }

  .el-dialog__header {
    padding: 0;
  }

  .el-dialog__body {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0 24px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .el-dialog__footer {
    padding: 0;
  }

  .files-page {
    padding: 0;
    height: 100%;
  }

  .files-shell {
    height: 100%;
  }

  .files-table-card {
    min-height: 0;
  }

  .el-checkbox {
    cursor: pointer;
  }

  .el-checkbox__input .el-checkbox__inner,
  .el-table__header .el-checkbox__input .el-checkbox__inner {
    border-color: rgba(15, 23, 42, 0.22);
    border-radius: 4px;
  }

  .el-checkbox__input.is-checked .el-checkbox__inner,
  .el-checkbox__input.is-indeterminate .el-checkbox__inner {
    border-color: #111827;
    background: #111827;
  }

  .el-checkbox__input:not(.is-disabled):hover .el-checkbox__inner {
    border-color: #111827;
  }
}
</style>
