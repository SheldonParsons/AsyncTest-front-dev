<template>
  <section class="files-page">
    <div class="files-shell">
      <div class="files-hero">
        <div class="files-hero-copy">
          <h2 class="files-title">{{ selectable ? "选择项目文件" : "项目文件管理" }}</h2>
        </div>
        <div class="files-hero-tools">
          <div class="files-toolbar-actions">
            <el-button class="files-tool-btn" plain @click="openCreateDirectoryDialog">
              <el-icon><FolderAdd /></el-icon>
              <span>新建目录</span>
            </el-button>
            <el-button class="files-tool-btn files-tool-btn-primary" type="primary" @click="openUploadDialog">
              <el-icon><UploadFilled /></el-icon>
              <span>上传文件</span>
            </el-button>
          </div>
        </div>
      </div>

      <div class="files-nav-card">
        <div class="files-nav-main">
          <div class="files-nav-caption">当前目录</div>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>
              <button class="crumb-button" type="button" @click="navigateToSegments([])">
                根目录
              </button>
            </el-breadcrumb-item>
            <el-breadcrumb-item
              v-for="(segment, index) in currentDirectorySegments"
              :key="`${segment}-${index}`"
            >
              <button
                class="crumb-button"
                type="button"
                @click="navigateToSegments(currentDirectorySegments.slice(0, index + 1))"
              >
                {{ segment }}
              </button>
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="files-stats">
          <span>{{ directoryCount }} 个目录</span>
          <span>{{ fileCount }} 个文件</span>
        </div>
      </div>

      <div v-if="selectable" class="files-picker-bar">
        <div class="files-picker-copy">
          <span class="files-picker-title">文件选择模式</span>
          <span class="files-picker-desc">仅文件可勾选，目录用于继续进入下一级。</span>
        </div>
        <div class="files-picker-actions">
          <span class="files-picker-count">{{ selectedEntries.length }} 个已选文件</span>
          <button
            class="picker-clear-btn"
            type="button"
            :disabled="selectedEntries.length === 0"
            @click="clean_select"
          >
            清空选择
          </button>
        </div>
      </div>

      <div
        class="files-table-card"
        :class="{ 'is-drag-over': isDragOver }"
        v-loading="loading"
        @dragenter.prevent="onDropZoneDragEnter"
        @dragover.prevent="onDropZoneDragOver"
        @dragleave.prevent="onDropZoneDragLeave"
        @drop.prevent="onDropZoneDrop"
      >
        <div class="files-drop-overlay" v-if="isDragOver">
          <div class="files-drop-overlay-card">
            <el-icon class="files-drop-overlay-icon"><UploadFilled /></el-icon>
            <div class="files-drop-overlay-title">松手即可上传到当前目录</div>
            <div class="files-drop-overlay-path">{{ currentDirectoryDisplayPath }}</div>
          </div>
        </div>
        <el-table
          ref="multipleTableRef"
          :data="sortedEntries"
          class="files-table"
          height="100%"
          style="width: 100%"
          :row-key="getRowKey"
          :header-cell-style="headerCellStyle"
          @selection-change="handleSelectionChange"
          @row-click="handleRowClick"
        >
          <template #empty>
            <div class="files-empty-state">
              <el-empty :description="emptyDescription">
                <div v-if="!loading" class="files-empty-actions">
                  <el-button class="files-tool-btn" plain @click="openCreateDirectoryDialog">
                    <el-icon><FolderAdd /></el-icon>
                    <span>新建目录</span>
                  </el-button>
                  <el-button class="files-tool-btn files-tool-btn-primary" type="primary" @click="openUploadDialog">
                    <el-icon><UploadFilled /></el-icon>
                    <span>上传文件</span>
                  </el-button>
                </div>
              </el-empty>
            </div>
          </template>

          <el-table-column
            v-if="selectable"
            type="selection"
            width="52"
            reserve-selection
            :selectable="canSelectRow"
          />

          <el-table-column label="名称" min-width="460">
            <template #default="{ row }">
              <div class="entry-cell">
                <button
                  v-if="row.kind === 'directory'"
                  class="entry-main entry-main-button"
                  type="button"
                  @click.stop="enterDirectory(row)"
                >
                  <span class="entry-icon entry-icon-folder">
                    <el-icon><FolderOpened /></el-icon>
                  </span>
                  <span class="entry-copy">
                    <span class="entry-title">{{ row.name }}</span>
                    <span class="entry-subtitle">目录</span>
                  </span>
                </button>

                <div v-else class="entry-main">
                  <span class="entry-icon" :class="row.iconSrc ? 'entry-icon-amind' : 'entry-icon-file'">
                    <img
                      v-if="row.iconSrc"
                      class="entry-icon-image"
                      :src="row.iconSrc"
                      :alt="`${row.extensionLabel} 文件图标`"
                    />
                    <el-icon v-else><Document /></el-icon>
                  </span>
                  <span class="entry-copy">
                    <span class="entry-title">{{ row.name }}</span>
                    <span class="entry-subtitle">{{ row.extensionLabel }}</span>
                  </span>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="修改时间" width="168">
            <template #default="{ row }">
              <span class="entry-meta">{{ formatEntryTime(row.updatedAt) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="大小" width="88">
            <template #default="{ row }">
              <span class="entry-meta">{{ formatEntrySize(row.size, row.kind) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="上传者" width="112">
            <template #default="{ row }">
              <span class="entry-meta">{{ row.createdBy || "—" }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="152" fixed="right" align="left" header-align="left">
            <template #default="{ row }">
              <div class="entry-actions">
                <button
                  v-if="row.kind === 'directory'"
                  class="entry-action-chip"
                  type="button"
                  @click.stop="enterDirectory(row)"
                >
                  进入
                </button>

                <button
                  v-else-if="row.downloadUrl"
                  class="entry-action-chip entry-action-chip-link"
                  type="button"
                  :disabled="downloadingEntryKey === row.selectionKey"
                  @click.stop="downloadEntry(row)"
                >
                  <span>{{ downloadingEntryKey === row.selectionKey ? "下载中" : "下载" }}</span>
                </button>

                <span v-else class="entry-action-placeholder">无下载链接</span>

                <button
                  class="entry-action-chip entry-action-chip-danger"
                  type="button"
                  :disabled="deletingEntryKey === row.selectionKey"
                  @click.stop="confirmDeleteEntry(row)"
                >
                  {{ deletingEntryKey === row.selectionKey ? "删除中" : "删除" }}
                </button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <DialogAnimation
      ref="createDirectoryDialogRef"
      title="新建目录"
      cancel_title="取消"
      :confirm_title="creatingDirectory ? '创建中...' : '创建'"
      :showCancel="!creatingDirectory"
      :before_comfirm="createDirectory"
      :bgtype="'white'"
      :topMove="'0% !important'"
      :z-index="2600"
    >
      <div class="files-dialog-panel files-dialog-panel-compact">
        <div class="files-dialog-block">
          <label class="files-dialog-label">目录名称</label>
          <el-input
            v-model="newDirectoryName"
            maxlength="100"
            show-word-limit
            placeholder="请输入目录名称"
            @keyup.enter="handleCreateDirectoryEnter"
          />
        </div>
      </div>
    </DialogAnimation>

    <DialogAnimation
      ref="uploadDialogRef"
      title="上传文件"
      cancel_title="取消"
      :confirm_title="uploadingFiles ? '上传中...' : '开始上传'"
      :showCancel="!uploadingFiles"
      :before_comfirm="submitUploadFiles"
      :bgtype="'white'"
      :topMove="'0% !important'"
      :z-index="2600"
    >
      <div class="files-dialog-panel files-dialog-panel-upload">
        <div class="files-dialog-block files-dialog-block-upload">
          <el-upload
            ref="uploadRef"
            drag
            multiple
            class="files-upload"
            :auto-upload="false"
            :show-file-list="true"
            :file-list="pendingUploadList"
            @change="handleUploadChange"
            @remove="handleUploadRemove"
          >
            <el-icon class="files-upload-icon"><UploadFilled /></el-icon>
            <div class="files-upload-text">拖拽文件到这里，或 <em>点击选择文件</em></div>
            <template #tip>
              <div class="files-upload-tip">也可以直接把文件拖到主列表区域，自动上传到当前目录。</div>
            </template>
          </el-upload>
        </div>
      </div>
    </DialogAnimation>
  </section>
</template>

<script lang="ts" setup>
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, ref, watch, withDefaults } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessageBox } from "element-plus";
import type { UploadInstance } from "element-plus";
import DialogAnimation from "@/components/common/general/dialog.vue";
import {
  Document,
  FolderAdd,
  FolderOpened,
  UploadFilled,
} from "@element-plus/icons-vue";
import {
  ApiCreateProjectDirectory,
  ApiDeleteProjectDirectory,
  ApiDeleteProjectEntry,
  ApiListProjectEntries,
  ApiUploadProjectEntries,
} from "@/api/project/index";
import amindFileIcon from "@/assets/img/amind.png";
import tools from "@/utils/tools";
import { HttpClass } from "@/utils/http";

type FileManagerEntryKind = "directory" | "file";

type FileManagerEntry = {
  id: number | string;
  selectionKey: string;
  kind: FileManagerEntryKind;
  name: string;
  path: string;
  pathSegments: string[];
  size: number | null;
  updatedAt: string | number | null;
  createdBy: string;
  downloadUrl: string;
  extensionLabel: string;
  iconSrc: string | null;
  raw: Record<string, any>;
};

const props = withDefaults(
  defineProps<{
    selectable?: boolean;
    syncRoute?: boolean;
    projectId?: string | number;
    allowedExtensions?: string[];
    singleSelection?: boolean;
  }>(),
  {
    selectable: false,
    syncRoute: true,
    projectId: "",
    allowedExtensions: () => [],
    singleSelection: false,
  }
);

const { proxy }: any = getCurrentInstance();
const route = useRoute();
const router = useRouter();

const createDirectoryDialogRef = ref<any>(null);
const uploadDialogRef = ref<any>(null);
const multipleTableRef = ref<any>(null);
const uploadRef = ref<UploadInstance | null>(null);

const loading = ref(false);
const creatingDirectory = ref(false);
const uploadingFiles = ref(false);
const deletingEntryKey = ref<string | null>(null);
const downloadingEntryKey = ref<string | null>(null);
const isDragOver = ref(false);
const entries = ref<FileManagerEntry[]>([]);
const selectedEntries = ref<FileManagerEntry[]>([]);
const newDirectoryName = ref("");
const pendingUploadList = ref<any[]>([]);
const localDirectorySegments = ref<string[]>([]);

let listCancelTokenSource: any = null;
let loadRequestId = 0;
let isSyncingTableSelection = false;

const headerCellStyle = {
  color: "#0f172a",
  fontSize: "12px",
  fontWeight: 700,
  background: "#f8fafc",
};

const normalizedAllowedExtensions = computed(() =>
  (props.allowedExtensions ?? []).map((item) => `${item ?? ""}`.trim().replace(/^\./, "").toLowerCase()).filter((item) => !!item)
);

const projectId = computed(() => {
  const propProjectId = `${props.projectId ?? ""}`.trim();
  if (propProjectId) return propProjectId;
  const value = route.params.project;
  return Array.isArray(value) ? `${value[0] ?? ""}` : `${value ?? ""}`;
});

const routeDirectorySegments = computed(() => normalizePathSegments(route.params.pathMatch));
const currentDirectorySegments = computed(() =>
  props.syncRoute ? routeDirectorySegments.value : localDirectorySegments.value
);
const currentDirectoryPath = computed(() => currentDirectorySegments.value.join("/"));
const currentDirectoryDisplayPath = computed(() =>
  currentDirectoryPath.value ? `/${currentDirectoryPath.value}` : "/"
);

const sortedEntries = computed(() => {
  return [...entries.value].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "directory" ? -1 : 1;
    }
    return left.name.localeCompare(right.name, "zh-CN", {
      numeric: true,
      sensitivity: "base",
    });
  });
});

const directoryCount = computed(
  () => entries.value.filter((entry) => entry.kind === "directory").length
);
const fileCount = computed(() => entries.value.filter((entry) => entry.kind === "file").length);
const emptyDescription = computed(() => "当前目录还没有文件或目录");

defineExpose({
  get_select,
  clean_select,
});

watch(
  () => [projectId.value, currentDirectoryPath.value],
  () => {
    loadDirectory();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (listCancelTokenSource) {
    listCancelTokenSource.cancel("组件卸载");
  }
});

function normalizePathSegments(input: unknown): string[] {
  const rawSegments = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split("/")
      : [];
  return rawSegments
    .flatMap((segment) => `${segment}`.split("/"))
    .map((segment) => segment.trim())
    .filter((segment) => !!segment && segment !== "." && segment !== "..");
}

function joinSegments(input: unknown): string {
  return normalizePathSegments(input).join("/");
}

function resolveEntryKind(raw: Record<string, any>): FileManagerEntryKind {
  const typeText = `${raw.kind ?? raw.type ?? raw.entry_type ?? raw.resource_type ?? raw.__kind ?? ""}`.toLowerCase();
  if (
    typeText === "directory" ||
    typeText === "dir" ||
    typeText === "folder" ||
    raw.is_dir === true ||
    raw.is_directory === true ||
    raw.is_folder === true
  ) {
    return "directory";
  }
  return "file";
}

function resolveEntryName(raw: Record<string, any>): string {
  return `${raw.name ?? raw.filename ?? raw.file_name ?? raw.dirname ?? raw.folder_name ?? raw.title ?? ""}`.trim();
}

function resolveEntryPath(raw: Record<string, any>, name: string, fallbackSegments: string[]): string {
  if (typeof raw.folder === "string") {
    return raw.folder ? joinSegments(`${raw.folder}/${name}`) : name;
  }
  const pathValue =
    raw.path ??
    raw.full_path ??
    raw.relative_path ??
    raw.file_path ??
    raw.dir_path ??
    raw.directory_path;
  if (typeof pathValue === "string" && pathValue.trim()) {
    return joinSegments(pathValue);
  }
  return joinSegments([...fallbackSegments, name]);
}

function resolveDownloadUrl(raw: Record<string, any>, kind: FileManagerEntryKind): string {
  if (kind === "directory") return "";
  const url = raw.download_url ?? raw.url ?? raw.href ?? raw.key ?? raw.file_url ?? raw.src;
  return typeof url === "string" ? url : "";
}

function stripUuidPrefix(value: string): string {
  const normalizedValue = value.trim();
  if (!normalizedValue) return "";
  const uuidPrefixPatterns = [
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[-_ ]+/i,
    /^[0-9a-f]{32}[-_ ]+/i,
  ];
  for (const pattern of uuidPrefixPatterns) {
    if (pattern.test(normalizedValue)) {
      return normalizedValue.replace(pattern, "");
    }
  }
  return normalizedValue;
}

function resolveDownloadFileName(entry: FileManagerEntry): string {
  const raw = entry.raw ?? {};
  const candidates = [
    raw.original_name,
    raw.origin_name,
    raw.real_name,
    raw.display_name,
    raw.source_name,
    raw.file_name,
    raw.filename,
    entry.name,
  ];
  for (const candidate of candidates) {
    const cleanName = stripUuidPrefix(`${candidate ?? ""}`);
    if (cleanName) return cleanName;
  }
  return "download";
}

function resolveExtensionLabel(name: string, kind: FileManagerEntryKind, raw: Record<string, any>): string {
  if (kind === "directory") return "目录";
  if (typeof raw.extension === "string" && raw.extension.trim()) {
    return raw.extension.trim().slice(0, 8).toUpperCase();
  }
  const segments = name.split(".");
  if (segments.length <= 1) return "文件";
  return segments[segments.length - 1].slice(0, 8).toUpperCase();
}

function isAmindFile(name: string, raw: Record<string, any>): boolean {
  const rawExtension = typeof raw.extension === "string" ? raw.extension.trim().replace(/^\./, "") : "";
  if (rawExtension.toLowerCase() === "amind") return true;
  const segments = name.split(".");
  return segments.length > 1 && segments[segments.length - 1].toLowerCase() === "amind";
}

function resolveEntryIconSrc(name: string, kind: FileManagerEntryKind, raw: Record<string, any>): string | null {
  if (kind === "directory") return null;
  return isAmindFile(name, raw) ? amindFileIcon : null;
}

function resolveEntrySize(raw: Record<string, any>, kind: FileManagerEntryKind): number | null {
  if (kind === "directory") return null;
  const rawSize = raw.size ?? raw.file_size ?? raw.bytes;
  if (rawSize === null || rawSize === undefined || rawSize === "") return null;
  const size = Number(rawSize);
  return Number.isFinite(size) ? size : null;
}

function resolveEntryUpdatedAt(raw: Record<string, any>): string | number | null {
  return raw.updated_at ?? raw.update_time ?? raw.modify_time ?? raw.add_time ?? raw.create_time ?? raw.mtime ?? null;
}

function resolveEntryCreatedBy(raw: Record<string, any>): string {
  return `${raw.create_by ?? raw.creator ?? raw.updated_by ?? ""}`.trim();
}

function extractRawEntries(response: any): Record<string, any>[] {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.list)) return payload.list;

  const directories = Array.isArray(payload?.directories)
    ? payload.directories
    : Array.isArray(payload?.dirs)
      ? payload.dirs
      : Array.isArray(payload?.folders)
        ? payload.folders
        : [];
  const files = Array.isArray(payload?.files) ? payload.files : [];

  if (directories.length || files.length) {
    return [
      ...directories.map((item: Record<string, any>) => ({ ...item, __kind: "directory" })),
      ...files.map((item: Record<string, any>) => ({ ...item, __kind: "file" })),
    ];
  }
  return [];
}

function normalizeEntry(raw: Record<string, any>, fallbackSegments: string[]): FileManagerEntry | null {
  const kind = resolveEntryKind(raw);
  const name = resolveEntryName(raw);
  if (!name) return null;

  const path = resolveEntryPath(raw, name, fallbackSegments);
  const id = raw.id ?? `${kind}:${path || name}`;
  return {
    id,
    selectionKey: `${kind}:${id}:${path}`,
    kind,
    name,
    path,
    pathSegments: normalizePathSegments(path),
    size: resolveEntrySize(raw, kind),
    updatedAt: resolveEntryUpdatedAt(raw),
    createdBy: resolveEntryCreatedBy(raw),
    downloadUrl: resolveDownloadUrl(raw, kind),
    extensionLabel: resolveExtensionLabel(name, kind, raw),
    iconSrc: resolveEntryIconSrc(name, kind, raw),
    raw,
  };
}

function normalizeEntries(response: any, fallbackSegments: string[]): FileManagerEntry[] {
  return extractRawEntries(response)
    .map((raw) => normalizeEntry(raw, fallbackSegments))
    .filter((entry): entry is FileManagerEntry => !!entry);
}

function normalizeDateValue(value: string | number | null): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const timestamp = value < 1_000_000_000_000 ? value * 1000 : value;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (/^\d+$/.test(value)) {
    const timestamp = Number(value) < 1_000_000_000_000 ? Number(value) * 1000 : Number(value);
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatEntryTime(value: string | number | null) {
  const date = normalizeDateValue(value);
  if (!date) return "—";
  return tools.getLocaleDateTime(date.toISOString(), false);
}

function formatEntrySize(size: number | null, kind: FileManagerEntryKind) {
  if (kind === "directory" || size === null) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size >= 10 * 1024 ? 0 : 1)} KB`;
  if (size < 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(size >= 100 * 1024 * 1024 ? 0 : 2)} MB`;
  }
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function ensureApiSuccess(response: any, fallbackMessage: string) {
  if (response?.result === 0) {
    if (response?.msg === "cancel") return false;
    tools.message(response?.data || response?.msg || fallbackMessage, proxy, "error");
    return false;
  }
  return true;
}

function getRowKey(row: FileManagerEntry) {
  return row.selectionKey;
}

function canSelectRow(row: FileManagerEntry) {
  if (row.kind !== "file") return false;
  if (!normalizedAllowedExtensions.value.length) return true;
  const extension = `${row.raw?.extension ?? row.name.split(".").pop() ?? ""}`.trim().replace(/^\./, "").toLowerCase();
  return normalizedAllowedExtensions.value.includes(extension);
}

function resolveEntryFolder(entry: FileManagerEntry): string {
  if (typeof entry.raw?.folder === "string") {
    return joinSegments(entry.raw.folder);
  }
  return joinSegments(entry.pathSegments.slice(0, -1));
}

function serializeSelectedEntry(entry: FileManagerEntry) {
  return {
    ...(entry.raw ?? {}),
    id: entry.raw?.id ?? entry.id,
    name: entry.raw?.name ?? entry.name,
    key: entry.raw?.key ?? entry.downloadUrl,
    download_url: entry.raw?.download_url ?? entry.downloadUrl,
    downloadUrl: entry.downloadUrl,
    path: entry.raw?.path ?? entry.path,
    folder: resolveEntryFolder(entry),
    kind: entry.kind,
    size: entry.raw?.size ?? entry.size,
    create_by: entry.raw?.create_by ?? entry.createdBy,
    add_time: entry.raw?.add_time ?? entry.updatedAt,
    extension: entry.raw?.extension ?? entry.name.split(".").pop() ?? "",
  };
}

function get_select() {
  return selectedEntries.value.map((entry) => serializeSelectedEntry(entry));
}

async function syncTableSelectionFromCache() {
  if (!props.selectable) return;
  isSyncingTableSelection = true;
  await nextTick();
  const table = multipleTableRef.value;
  if (!table) {
    isSyncingTableSelection = false;
    return;
  }
  const selectedKeySet = new Set(selectedEntries.value.map((entry) => entry.selectionKey));
  table.clearSelection();
  entries.value.forEach((entry) => {
    if (entry.kind === "file" && selectedKeySet.has(entry.selectionKey)) {
      table.toggleRowSelection(entry, true);
    }
  });
  await nextTick();
  isSyncingTableSelection = false;
}

async function clean_select() {
  selectedEntries.value = [];
  if (!props.selectable) return;
  isSyncingTableSelection = true;
  await nextTick();
  multipleTableRef.value?.clearSelection();
  await nextTick();
  isSyncingTableSelection = false;
}

function removeEntryFromSelection(entry: FileManagerEntry) {
  if (entry.kind === "directory") {
    const pathPrefix = entry.path;
    selectedEntries.value = selectedEntries.value.filter((selectedEntry) => {
      return selectedEntry.path !== pathPrefix && !selectedEntry.path.startsWith(`${pathPrefix}/`);
    });
    return;
  }
  selectedEntries.value = selectedEntries.value.filter(
    (selectedEntry) => selectedEntry.selectionKey !== entry.selectionKey
  );
}

function buildDirectorySegments(entry: FileManagerEntry) {
  if (entry.pathSegments.length) return entry.pathSegments;
  return [...currentDirectorySegments.value, entry.name];
}

async function navigateToSegments(segments: string[]) {
  const nextSegments = normalizePathSegments(segments);
  if (joinSegments(nextSegments) === currentDirectoryPath.value) return;
  if (props.syncRoute) {
    await router.push({
      name: "settings_source_files",
      params: {
        project: projectId.value,
        pathMatch: nextSegments,
      },
    });
    return;
  }
  localDirectorySegments.value = nextSegments;
}

function enterDirectory(entry: FileManagerEntry) {
  if (entry.kind !== "directory") return;
  navigateToSegments(buildDirectorySegments(entry));
}

async function loadDirectory() {
  if (!projectId.value) {
    entries.value = [];
    await syncTableSelectionFromCache();
    return;
  }

  const requestId = ++loadRequestId;
  if (listCancelTokenSource) {
    listCancelTokenSource.cancel("取消重复请求");
  }

  listCancelTokenSource = HttpClass.createCancelToken();
  loading.value = true;

  try {
    const response: any = await ApiListProjectEntries({
      params: {
        project: projectId.value,
        folder: currentDirectoryPath.value,
      },
      cancelToken: listCancelTokenSource.token,
    });

    if (requestId !== loadRequestId || response?.msg === "cancel") return;
    if (!ensureApiSuccess(response, "获取目录失败")) {
      entries.value = [];
      await syncTableSelectionFromCache();
      return;
    }

    entries.value = normalizeEntries(response, currentDirectorySegments.value);
    await syncTableSelectionFromCache();
  } catch (error) {
    console.log(error);
    tools.message("获取目录失败", proxy, "error");
  } finally {
    if (requestId === loadRequestId) {
      loading.value = false;
    }
  }
}

function openCreateDirectoryDialog() {
  newDirectoryName.value = "";
  createDirectoryDialogRef.value?.open();
}

async function createDirectory() {
  if (creatingDirectory.value) return false;
  const name = newDirectoryName.value.trim();
  if (!name) {
    tools.message("请输入目录名称", proxy, "info");
    return false;
  }
  if (name.includes("/") || name.includes("\\") || name.includes(".")) {
    tools.message("目录名称不能包含 /、\\、.", proxy, "warning");
    return false;
  }

  creatingDirectory.value = true;
  try {
    const response: any = await ApiCreateProjectDirectory({
      folder: currentDirectoryPath.value,
      name,
    }, {
      project: projectId.value,
    });
    if (!ensureApiSuccess(response, "创建目录失败")) return false;
    tools.message("目录创建成功", proxy, "success");
    newDirectoryName.value = "";
    await loadDirectory();
    return true;
  } finally {
    creatingDirectory.value = false;
  }
}

async function handleCreateDirectoryEnter() {
  const success = await createDirectory();
  if (success) {
    createDirectoryDialogRef.value?.close();
  }
}

async function confirmDeleteEntry(entry: FileManagerEntry) {
  const isDirectory = entry.kind === "directory";
  const confirmText = isDirectory
    ? `确认删除目录“${entry.name}”吗？该目录下的所有子目录和文件都会一起删除。`
    : `确认删除文件“${entry.name}”吗？`;

  try {
    await ElMessageBox.confirm(confirmText, isDirectory ? "删除目录" : "删除文件", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      confirmButtonClass: "el-button--danger",
    });
  } catch {
    return;
  }

  deletingEntryKey.value = entry.selectionKey;
  try {
    const response: any =
      entry.kind === "directory"
        ? await ApiDeleteProjectDirectory(
            entry.raw?.id
              ? { id: entry.raw.id }
              : {
                  project: projectId.value,
                  folder: entry.raw?.folder ?? currentDirectoryPath.value,
                  name: entry.name,
                }
          )
        : await ApiDeleteProjectEntry(entry.raw?.id ?? entry.id);
    if (!ensureApiSuccess(response, entry.kind === "directory" ? "删除目录失败" : "删除文件失败")) return;
    tools.message(entry.kind === "directory" ? "目录删除成功" : "文件删除成功", proxy, "success");
    removeEntryFromSelection(entry);
    await loadDirectory();
  } finally {
    deletingEntryKey.value = null;
  }
}

async function downloadEntry(entry: FileManagerEntry) {
  if (entry.kind !== "file" || !entry.downloadUrl || downloadingEntryKey.value) return;
  downloadingEntryKey.value = entry.selectionKey;
  const fileName = resolveDownloadFileName(entry);
  let objectUrl = "";
  try {
    const response = await fetch(entry.downloadUrl);
    if (!response.ok) {
      throw new Error(`download failed: ${response.status}`);
    }
    const blob = await response.blob();
    objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.log(error);
    tools.message("文件下载失败", proxy, "error");
  } finally {
    if (objectUrl) {
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);
    }
    downloadingEntryKey.value = null;
  }
}

function openUploadDialog() {
  pendingUploadList.value = [];
  uploadDialogRef.value?.open();
  nextTick(() => {
    uploadRef.value?.clearFiles();
  });
}

function handleUploadChange(_uploadFile: any, uploadFiles: any[]) {
  pendingUploadList.value = uploadFiles.slice();
}

function handleUploadRemove(_uploadFile: any, uploadFiles: any[]) {
  pendingUploadList.value = uploadFiles.slice();
}

function collectPendingRawFiles() {
  return pendingUploadList.value
    .map((item) => item.raw)
    .filter((file): file is File => typeof File !== "undefined" && file instanceof File);
}

async function submitUploadFiles() {
  if (uploadingFiles.value) return false;
  const rawFiles = collectPendingRawFiles();
  return await uploadFilesToCurrentDirectory(rawFiles);
}

async function uploadFilesToCurrentDirectory(rawFiles: File[]) {
  if (uploadingFiles.value) return false;
  if (!rawFiles.length) {
    tools.message("请至少选择一个文件", proxy, "info");
    return false;
  }

  const formData = new FormData();
  rawFiles.forEach((file) => {
    formData.append("files", file);
  });

  uploadingFiles.value = true;
  try {
    const response: any = await ApiUploadProjectEntries(formData, {
      project: projectId.value,
      folder: currentDirectoryPath.value,
    });
    if (!ensureApiSuccess(response, "上传文件失败")) return false;
    tools.message("文件上传完成", proxy, "success");
    pendingUploadList.value = [];
    uploadRef.value?.clearFiles();
    await loadDirectory();
    return true;
  } finally {
    uploadingFiles.value = false;
  }
}

function onDropZoneDragEnter(event: DragEvent) {
  if (!event.dataTransfer?.types?.includes("Files")) return;
  isDragOver.value = true;
}

function onDropZoneDragOver(event: DragEvent) {
  if (!event.dataTransfer?.types?.includes("Files")) return;
  event.dataTransfer.dropEffect = "copy";
  isDragOver.value = true;
}

function onDropZoneDragLeave(event: DragEvent) {
  const target = event.currentTarget as HTMLElement | null;
  const relatedTarget = event.relatedTarget as Node | null;
  if (target && relatedTarget && target.contains(relatedTarget)) return;
  isDragOver.value = false;
}

async function onDropZoneDrop(event: DragEvent) {
  isDragOver.value = false;
  const files = Array.from(event.dataTransfer?.files ?? []).filter(
    (file): file is File => typeof File !== "undefined" && file instanceof File
  );
  if (!files.length) return;
  await uploadFilesToCurrentDirectory(files);
}

function handleSelectionChange(rows: FileManagerEntry[]) {
  if (!props.selectable || isSyncingTableSelection) return;
  const nextRows = props.singleSelection ? rows.slice(-1) : rows;
  if (props.singleSelection && rows.length > 1) {
    selectedEntries.value = nextRows.filter((entry) => entry.kind === "file");
    void syncTableSelectionFromCache();
    return;
  }
  const visibleFileKeys = new Set(
    entries.value
      .filter((entry) => entry.kind === "file")
      .map((entry) => entry.selectionKey)
  );
  selectedEntries.value = [
    ...selectedEntries.value.filter((entry) => !visibleFileKeys.has(entry.selectionKey)),
    ...nextRows.filter((entry) => entry.kind === "file"),
  ];
}

function handleRowClick(row: FileManagerEntry, _column: any, event: Event) {
  const target = event.target as HTMLElement | null;
  if (target?.closest("button") || target?.closest("a") || target?.closest(".el-checkbox")) {
    return;
  }

  if (row.kind === "directory") {
    enterDirectory(row);
    return;
  }

  if (props.selectable) {
    if (!canSelectRow(row)) return;
    if (props.singleSelection) {
      selectedEntries.value = [row];
      void syncTableSelectionFromCache();
      return;
    }
    multipleTableRef.value?.toggleRowSelection(row);
  }
}
</script>

<style scoped lang="scss">
.files-page {
  padding: 16px 20px 14px;
  height: 100%;
  box-sizing: border-box;
}

.files-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 0;
}

.files-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.04);
}

.files-title {
  margin: 0;
  color: #0f172a;
  font-size: 19px;
  font-weight: 700;
  line-height: 1.2;
}

.files-hero-tools {
  display: flex;
  align-items: center;
}

.files-toolbar-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.files-tool-btn {
  height: 32px;
  border-radius: 9px;
  font-weight: 600;
}

.files-tool-btn-primary {
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
}

.files-nav-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  background: rgba(255, 255, 255, 0.96);
}

.files-nav-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.files-nav-caption {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.crumb-button {
  all: unset;
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.16s ease;
}

.crumb-button:hover {
  color: #0284c7;
}

.files-path-pill {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 24px;
  max-width: 100%;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid rgba(191, 219, 254, 0.8);
  background: rgba(239, 246, 255, 0.95);
  color: #0f172a;
  font-size: 11px;
  font-weight: 600;
  font-family: "SFMono-Regular", "SF Mono", "Menlo", monospace;
}

.files-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.files-picker-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.96);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.96));
}

.files-picker-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.files-picker-title {
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
}

.files-picker-desc {
  color: #64748b;
  font-size: 12px;
}

.files-picker-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.files-picker-count {
  color: #334155;
  font-size: 12px;
  font-weight: 700;
}

.picker-clear-btn {
  border: 0;
  background: transparent;
  color: #0284c7;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.picker-clear-btn:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.files-table-card {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.05);
}

.files-table-card.is-drag-over {
  border-color: rgba(37, 99, 235, 0.42);
  box-shadow: 0 20px 44px rgba(37, 99, 235, 0.12);
}

.files-drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(248, 250, 252, 0.78);
  backdrop-filter: blur(6px);
}

.files-drop-overlay-card {
  min-width: 280px;
  padding: 20px 24px;
  border-radius: 18px;
  border: 1px solid rgba(37, 99, 235, 0.22);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
  text-align: center;
}

.files-drop-overlay-icon {
  color: #2563eb;
  font-size: 24px;
}

.files-drop-overlay-title {
  margin-top: 8px;
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
}

.files-drop-overlay-path {
  margin-top: 6px;
  color: #475569;
  font-size: 12px;
  font-family: "SFMono-Regular", "SF Mono", "Menlo", monospace;
}

.files-empty-state {
  padding: 18px 0;
}

.files-empty-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.entry-cell {
  display: flex;
  align-items: center;
  min-width: 0;
}

.entry-main {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.entry-main-button {
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.entry-icon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.entry-icon-folder {
  background: rgba(239, 246, 255, 0.96);
  color: #2563eb;
}

.entry-icon-file {
  background: rgba(248, 250, 252, 0.98);
  color: #475569;
}

.entry-icon-amind {
  background: transparent;
  padding: 0;
}

.entry-icon-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: inherit;
}

.entry-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.entry-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
}

.entry-subtitle {
  color: #64748b;
  font-size: 11px;
  line-height: 1.4;
}

.entry-meta {
  color: #475569;
  font-size: 12px;
  font-weight: 500;
}

.entry-actions {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.entry-action-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 9px;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 999px;
  background: #ffffff;
  color: #334155;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    color 0.16s ease;
}

.entry-action-chip:hover {
  border-color: rgba(148, 163, 184, 1);
  background: #f8fafc;
}

.entry-action-chip-link {
  color: #0369a1;
}

.entry-action-chip-danger {
  color: #b42318;
}

.entry-action-chip-danger:hover {
  border-color: rgba(254, 205, 211, 1);
  background: #fef2f2;
}

.entry-action-chip:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.entry-action-placeholder {
  color: #94a3b8;
  font-size: 12px;
}

.files-dialog-panel {
  width: 420px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.files-dialog-panel-upload {
  width: 560px;
}

.files-dialog-panel-compact {
  width: 420px;
}

.files-dialog-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(255, 255, 255, 0.98));
}

.files-dialog-block-upload {
  padding: 14px;
}

.files-dialog-caption {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.files-dialog-path {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 11px;
  font-weight: 600;
  font-family: "SFMono-Regular", "SF Mono", "Menlo", monospace;
}

.files-dialog-label {
  color: #334155;
  font-size: 12px;
  font-weight: 700;
}

.files-upload-icon {
  color: #0f172a;
  font-size: 28px;
}

.files-upload-text {
  color: #334155;
  font-size: 13px;
}

.files-upload-text em {
  color: #0284c7;
  font-style: normal;
  font-weight: 700;
}

.files-upload-tip {
  color: #64748b;
  font-size: 12px;
}

.files-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.files-table {
  flex: 1 1 auto;
  min-height: 0;
}

.files-table :deep(.el-table__inner-wrapper),
.files-table :deep(.el-table__body-wrapper),
.files-table :deep(.el-scrollbar),
.files-table :deep(.el-scrollbar__wrap) {
  height: 100%;
  min-height: 0;
}

.files-table :deep(.el-table__header-wrapper th) {
  border-bottom: 1px solid rgba(226, 232, 240, 0.92);
}

.files-table :deep(.el-table__row td) {
  height: 62px;
}

.files-table :deep(.el-table__row:hover > td) {
  background: rgba(248, 250, 252, 0.9) !important;
}

.files-table :deep(.el-table__cell) {
  padding-top: 12px;
  padding-bottom: 12px;
}

.files-upload :deep(.el-upload) {
  width: 100%;
}

.files-upload :deep(.el-upload-dragger) {
  width: 100%;
  min-height: 220px;
  border-radius: 18px;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98));
}

.files-upload :deep(.el-upload-list) {
  margin-top: 14px;
}

.files-upload :deep(.el-upload-list__item) {
  border-radius: 12px;
}

.files-dialog-panel :deep(.el-input__wrapper) {
  min-height: 42px;
  border-radius: 12px;
  box-shadow: 0 0 0 1px rgba(226, 232, 240, 0.92) inset;
}

.files-dialog-panel :deep(.el-upload-list) {
  margin-top: 12px;
}

@media (max-width: 1200px) {
  .files-page {
    padding: 20px;
  }

  .files-hero {
    grid-template-columns: 1fr;
  }

  .files-hero-tools {
    justify-content: flex-start;
  }

  .files-toolbar-actions {
    justify-content: flex-start;
  }

  .files-nav-card,
  .files-picker-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .files-stats,
  .files-picker-actions {
    justify-content: flex-start;
  }
}
</style>
