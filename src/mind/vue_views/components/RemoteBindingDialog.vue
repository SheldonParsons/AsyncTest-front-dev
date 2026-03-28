<template>
  <el-dialog
    v-model="visible"
    width="1320px"
    :show-close="false"
    class="remote-binding-dialog"
    style="border-radius: 16px"
    @close="handleClose"
  >
    <template #header="{ close }">
      <div class="remote-binding-dialog__header">
        <div>
          <h3>绑定项目文件</h3>
          <p>选择一个远程 `.amind` 文件，或把当前脑图保存到选中的目录并建立绑定。</p>
        </div>
        <button class="remote-binding-dialog__close" type="button" @click="close">×</button>
      </div>
    </template>

    <div class="remote-binding-dialog__toolbar">
      <label class="remote-binding-dialog__project-field">
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

    <div class="remote-binding-dialog__body">
      <div class="remote-binding-dialog__explorer">
        <FilesPage
          ref="filesPageRef"
          :selectable="true"
          :sync-route="false"
          :project-id="selectedProjectId"
          :allowed-extensions="['amind']"
          :single-selection="true"
          @directoryChange="handleDirectoryChange"
        />
      </div>

      <aside class="remote-binding-dialog__side">
        <section class="binding-card binding-card--current" :class="{ 'is-invalid': !!invalidBinding }">
          <div class="binding-card__eyebrow">当前绑定</div>
          <div class="binding-card__status-row">
            <span class="binding-card__badge" :class="bindingStatus.className">{{ bindingStatus.label }}</span>
            <span class="binding-card__project">{{ bindingProjectLabel }}</span>
          </div>
          <div class="binding-card__path" :title="bindingPathText">{{ bindingPathText }}</div>
          <p class="binding-card__hint">{{ bindingHintText }}</p>
          <button
            v-if="binding"
            class="binding-card__inline-action"
            type="button"
            :disabled="submitting"
            @click="handleUnbind"
          >
            取消绑定
          </button>
        </section>

        <section class="binding-card binding-card--save">
          <div class="binding-card__eyebrow">保存到当前目录并绑定</div>
          <div class="binding-card__meta">
            <span>当前目录</span>
            <strong :title="currentDirectory.displayPath">{{ currentDirectory.displayPath }}</strong>
          </div>
          <div class="binding-card__meta">
            <span>将保存为</span>
            <strong class="binding-card__truncate" :title="normalizedDraftName">{{ normalizedDraftName }}</strong>
          </div>

          <label class="binding-card__input-group">
            <span>文件名</span>
            <input
              v-model="draftFileName"
              class="binding-card__input"
              type="text"
              maxlength="120"
              placeholder="请输入文件名"
              @input="handleDraftNameInput"
            />
          </label>

          <div v-if="nameConflict" class="binding-card__warning">
            <div class="binding-card__warning-title">当前目录已存在同名文件</div>
            <div class="binding-card__warning-path">{{ nameConflict.path }}</div>
            <p>你可以修改名称后重新绑定，或者再次点击“{{ saveDirectoryButtonLabel }}”来确认覆盖。</p>
          </div>

          <p class="binding-card__mini-tip">目录由左侧文件列表决定，切换目录后这里会自动同步。</p>
        </section>
      </aside>
    </div>

    <template #footer>
      <div class="remote-binding-dialog__footer">
        <button class="footer-btn footer-btn-light" type="button" :disabled="submitting" @click="handleClose">取消</button>
        <button
          class="footer-btn footer-btn-light"
          type="button"
          :disabled="submitting || !selectedProjectId"
          @click="handleSaveToDirectory"
        >
          {{ saveDirectoryButtonLabel }}
        </button>
        <button
          class="footer-btn footer-btn-primary"
          type="button"
          :disabled="submitting || !selectedProjectId"
          @click="handleBindSelectedFile"
        >
          绑定所选文件
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import { ApiCheckProjectFileExists, ApiGetProjects } from "@/api/project/index";
import FilesPage from "@/views/settings/source_management/files_child/files_index.vue";
import GeneratorDropdown from "@/views/generator/report/panels/GeneratorDropdown.vue";
import type { ReportSelectOption } from "@/views/generator/report/types";
import {
  buildRemoteBindingFilePath,
  buildRemoteBindingFromSelectedFile,
  buildRemoteBindingFromTarget,
  ensureAmindFileName,
  formatRemoteBindingPath,
  isSameRemoteBinding,
  type MindRemoteBinding,
} from "@/mind/vue_views/remoteBinding";

type DirectoryPayload = {
  path: string;
  displayPath: string;
  segments: string[];
};

type SaveDirectoryPayload = {
  binding: MindRemoteBinding;
  overwriteExisting: boolean;
  done: (success: boolean) => void | Promise<void>;
};

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    binding: MindRemoteBinding | null;
    invalidBinding: MindRemoteBinding | null;
    defaultFileName: string;
    preferredProjectId?: string;
  }>(),
  {
    preferredProjectId: "",
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  bind: [binding: MindRemoteBinding];
  saveToDirectory: [payload: SaveDirectoryPayload];
  unbind: [];
}>();

const filesPageRef = ref<any>(null);
const projectsLoading = ref(false);
const projects = ref<ReportSelectOption[]>([]);
const selectedProjectId = ref("");
const currentDirectory = ref<DirectoryPayload>({
  path: "",
  displayPath: "/",
  segments: [],
});
const draftFileName = ref("");
const submitting = ref(false);
const nameConflict = ref<{ path: string; key: string } | null>(null);

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

const bindingStatus = computed(() => {
  if (props.invalidBinding) {
    return {
      label: "绑定失效",
      className: "is-invalid",
    };
  }
  if (props.binding) {
    return {
      label: "已绑定",
      className: "is-bound",
    };
  }
  return {
    label: "未绑定",
    className: "is-empty",
  };
});

const bindingPathText = computed(() => {
  return formatRemoteBindingPath(props.binding ?? props.invalidBinding);
});

const bindingProjectLabel = computed(() => {
  const currentBinding = props.binding ?? props.invalidBinding;
  if (!currentBinding?.projectName) return "未选择项目";
  return currentBinding.projectName;
});

const bindingHintText = computed(() => {
  if (props.invalidBinding) {
    return "原绑定文件已不存在，当前仅保留提示信息，保存前需要重新选择目标文件。";
  }
  if (props.binding) {
    return "当前文档按 Ctrl+S 时会优先覆盖这个远程 amind 文件。";
  }
  return "当前文档还没有远程绑定，绑定后 Ctrl+S 会优先保存到远程。";
});

const normalizedDraftName = computed(() => ensureAmindFileName(draftFileName.value, props.defaultFileName));
const selectedProject = computed(() => {
  return projects.value.find((item) => item.value === selectedProjectId.value) ?? null;
});
const saveDirectoryButtonLabel = computed(() => {
  return nameConflict.value ? "覆盖同名文件并绑定" : "保存到当前目录并绑定";
});

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    resetDialogState();
    void loadProjects();
  }
);

watch(
  () => props.defaultFileName,
  () => {
    if (!props.modelValue) return;
    draftFileName.value = ensureAmindFileName(props.defaultFileName);
  }
);

function resetDialogState() {
  draftFileName.value = ensureAmindFileName(props.defaultFileName);
  nameConflict.value = null;
  currentDirectory.value = {
    path: "",
    displayPath: "/",
    segments: [],
  };
  const preferredProjectId = `${props.binding?.projectId ?? props.invalidBinding?.projectId ?? props.preferredProjectId ?? ""}`.trim();
  selectedProjectId.value = preferredProjectId;
  submitting.value = false;
}

async function loadProjects() {
  if (projectsLoading.value) return;
  projectsLoading.value = true;
  try {
    const response: any = await ApiGetProjects({
      page: 1,
      size: 200,
      name: "",
    });
    const items = Array.isArray(response?.results) ? response.results : [];
    projects.value = items
      .map((item: any) => {
        if (item?.id === undefined || item?.id === null || !item?.name) return null;
        return {
          value: `${item.id}`,
          label: `${item.name}`,
        };
      })
      .filter((item): item is ReportSelectOption => !!item);

    if (!selectedProjectId.value && projects.value.length) {
      selectedProjectId.value = projects.value[0].value;
    }
  } finally {
    projectsLoading.value = false;
  }
}

function handleProjectChange() {
  filesPageRef.value?.clean_select?.();
  nameConflict.value = null;
}

function handleDirectoryChange(payload: DirectoryPayload) {
  currentDirectory.value = payload;
  nameConflict.value = null;
}

function handleDraftNameInput() {
  nameConflict.value = null;
}

function handleClose() {
  filesPageRef.value?.clean_select?.();
  emit("update:modelValue", false);
}

async function confirmReplaceBinding(nextBinding: MindRemoteBinding) {
  if (!props.binding || isSameRemoteBinding(props.binding, nextBinding)) return true;
  try {
    await ElMessageBox.confirm(
      `当前已绑定 ${formatRemoteBindingPath(props.binding)}，是否解除原绑定并改为新的绑定目标？`,
      "替换绑定",
      {
        confirmButtonText: "确认替换",
        cancelButtonText: "取消",
        type: "warning",
      }
    );
    return true;
  } catch {
    return false;
  }
}

async function handleBindSelectedFile() {
  if (!selectedProjectId.value) {
    window.$toast({ title: "请先选择项目", type: "warning" });
    return;
  }

  const selectedFiles = filesPageRef.value?.get_select?.() ?? [];
  const selectedFile = selectedFiles[selectedFiles.length - 1];
  const nextBinding = buildRemoteBindingFromSelectedFile(selectedFile, selectedProject.value);
  if (!nextBinding) {
    window.$toast({ title: "请先选择一个 amind 文件", type: "warning" });
    return;
  }
  if (props.binding && isSameRemoteBinding(props.binding, nextBinding)) {
    window.$toast({ title: "当前已绑定该文件", type: "info" });
    handleClose();
    return;
  }

  const canContinue = await confirmReplaceBinding(nextBinding);
  if (!canContinue) return;
  emit("bind", nextBinding);
  filesPageRef.value?.clean_select?.();
  emit("update:modelValue", false);
}

async function handleSaveToDirectory() {
  if (!selectedProjectId.value) {
    window.$toast({ title: "请先选择项目", type: "warning" });
    return;
  }

  const directory = filesPageRef.value?.get_current_directory?.() ?? currentDirectory.value;
  currentDirectory.value = directory;
  const fileName = ensureAmindFileName(draftFileName.value, props.defaultFileName);
  draftFileName.value = fileName;

  submitting.value = true;
  try {
    const response: any = await ApiCheckProjectFileExists({
      project: selectedProjectId.value,
      folder: directory.path,
      name: fileName,
    });
    if (response?.result === 0) {
      window.$toast({ title: response?.data || response?.msg || "校验文件是否存在失败", type: "error" });
      return;
    }

    const targetBinding = buildRemoteBindingFromTarget({
      projectId: selectedProjectId.value,
      projectName: selectedProject.value?.label ?? "",
      folder: response?.data?.folder ?? directory.path,
      fileId: response?.data?.id ?? null,
      fileName: response?.data?.name ?? fileName,
      filePath: response?.data?.path ?? buildRemoteBindingFilePath(directory.path, fileName),
    });
    if (!targetBinding) {
      window.$toast({ title: "无法生成绑定目标", type: "error" });
      return;
    }

    const conflictKey = `${selectedProjectId.value}::${directory.path}::${fileName}`;
    if (response?.data?.exists && nameConflict.value?.key !== conflictKey) {
      nameConflict.value = {
        key: conflictKey,
        path: `/${response?.data?.path ?? buildRemoteBindingFilePath(directory.path, fileName)}`,
      };
      return;
    }

    const canContinue = await confirmReplaceBinding(targetBinding);
    if (!canContinue) return;

    emit("saveToDirectory", {
      binding: targetBinding,
      overwriteExisting: !!response?.data?.exists,
      done: async (success: boolean) => {
        if (!success) return;
        nameConflict.value = null;
        await filesPageRef.value?.refresh_directory?.();
        filesPageRef.value?.clean_select?.();
        emit("update:modelValue", false);
      },
    });
  } finally {
    submitting.value = false;
  }
}

function handleUnbind() {
  emit("unbind");
  emit("update:modelValue", false);
}
</script>

<style scoped lang="scss">
.remote-binding-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 26px 26px 0;

  h3 {
    margin: 0;
    color: #0f172a;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  p {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.6;
  }
}

.remote-binding-dialog__close {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 10px;
  background: #f8fafc;
  color: #0f172a;
  font-size: 18px;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.remote-binding-dialog__close:hover {
  transform: translateY(-1px);
  background: #eef2f7;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
}

.remote-binding-dialog__toolbar {
  padding: 18px 26px 14px;
}

.remote-binding-dialog__project-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  span {
    color: #334155;
    font-size: 12px;
    font-weight: 700;
  }
}

.remote-binding-dialog__body {
  flex: 0 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
  padding: 8px 26px 10px;
  overflow: visible;
}

.remote-binding-dialog__explorer {
  min-width: 0;
  min-height: 0;
  height: min(620px, calc(100vh - 190px));
  overflow: hidden;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12);
}

.remote-binding-dialog__side {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 6px 8px 10px 2px;
  overflow: visible;
}

.binding-card {
  position: relative;
  overflow: visible;
  padding: 18px;
  border-radius: 18px;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 38%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94));
  box-shadow:
    inset 0 0 0 1px rgba(148, 163, 184, 0.12),
    0 18px 32px rgba(15, 23, 42, 0.08);
}

.binding-card--current.is-invalid {
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.18), transparent 42%),
    linear-gradient(180deg, rgba(255, 251, 235, 0.98), rgba(255, 247, 237, 0.96));
}

.binding-card__eyebrow {
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.binding-card__status-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.binding-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.binding-card__badge.is-bound {
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
}

.binding-card__badge.is-empty {
  background: rgba(148, 163, 184, 0.12);
  color: #475569;
}

.binding-card__badge.is-invalid {
  background: rgba(245, 158, 11, 0.16);
  color: #92400e;
}

.binding-card__project {
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.binding-card__path {
  margin-top: 14px;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.6;
  word-break: break-all;
}

.binding-card__hint {
  margin: 10px 0 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.7;
}

.binding-card__inline-action {
  margin-top: 14px;
  border: 1px solid rgba(245, 158, 11, 0.24);
  min-height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  background: rgba(255, 251, 235, 0.92);
  color: #92400e;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.binding-card__inline-action:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgba(255, 247, 237, 1);
  border-color: rgba(245, 158, 11, 0.3);
}

.binding-card__inline-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.binding-card__meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 14px;

  span {
    color: #64748b;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  strong {
    color: #0f172a;
    font-size: 13px;
    line-height: 1.5;
    word-break: break-all;
  }
}

.binding-card__truncate {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.binding-card__input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  width: 100%;
  min-width: 0;

  span {
    color: #334155;
    font-size: 12px;
    font-weight: 700;
  }
}

.binding-card__input {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 42px;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 12px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  font-size: 13px;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;
}

.binding-card__input:focus {
  border-color: rgba(15, 23, 42, 0.3);
  box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.06);
  background: #fff;
}

.binding-card__warning {
  margin-top: 14px;
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 251, 235, 0.95), rgba(255, 247, 237, 0.98));
  border: 1px solid rgba(245, 158, 11, 0.22);
  color: #92400e;

  p {
    margin: 8px 0 0;
    font-size: 12px;
    line-height: 1.7;
  }
}

.binding-card__warning-title {
  font-size: 13px;
  font-weight: 700;
}

.binding-card__warning-path {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
}

.binding-card__mini-tip {
  margin: 12px 0 0;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.7;
}

.remote-binding-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 26px 26px;
}

.footer-btn {
  border: 1px solid rgba(15, 23, 42, 0.12);
  min-height: 38px;
  padding: 0 16px;
  border-radius: 12px;
  background: #fff;
  color: #111827;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.footer-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(15, 23, 42, 0.18);
  background: #f8fafc;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
}

.footer-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  box-shadow: none;
}

.footer-btn-warning {
  color: #92400e;
  border-color: rgba(245, 158, 11, 0.24);
  background: rgba(255, 251, 235, 0.92);
}

.footer-btn-warning:hover:not(:disabled) {
  background: rgba(255, 247, 237, 1);
  border-color: rgba(245, 158, 11, 0.3);
}

.footer-btn-primary {
  border-color: #111827;
  background: #111827;
  color: #fff;
}

.footer-btn-primary:hover:not(:disabled) {
  background: #000;
  border-color: #000;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.18);
}
</style>

<style lang="scss">
.remote-binding-dialog {
  &.el-dialog {
    display: flex;
    flex-direction: column;
    margin: 40px auto 0 !important;
    max-height: calc(100vh - 40px);
    overflow: hidden;
  }

  .el-dialog__header {
    padding: 0;
  }

  .el-dialog__body {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0;
    overflow: auto;
  }

  .el-dialog__footer {
    padding: 0;
  }

  .files-page {
    height: 100%;
  }
}
</style>
