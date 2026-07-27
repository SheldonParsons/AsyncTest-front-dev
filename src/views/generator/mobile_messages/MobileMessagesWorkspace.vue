<template>
  <section class="mobile-messages-workspace">
    <header class="workspace-topbar">
      <div class="workspace-title">
        <button class="back-button" type="button" aria-label="返回 Generator 工具列表" @click="$emit('back')">
          <span aria-hidden="true">←</span>
          工具列表
        </button>
        <span class="title-divider" aria-hidden="true"></span>
        <div class="title-copy">
          <h2>手机消息</h2>
          <span>{{ pagination.total }} 条记录</span>
        </div>
      </div>
    </header>

    <section class="list-panel" aria-label="手机消息列表">
      <form class="filter-toolbar" aria-label="消息筛选" @submit.prevent="applyFilters">
        <div class="filter-fields">
          <label class="filter-field filter-field--all">
            <span class="visually-hidden">搜索发件人或消息内容</span>
            <el-input v-model="filters.search" clearable placeholder="关键词">
              <template #prepend>全部</template>
            </el-input>
          </label>
          <label class="filter-field">
            <span class="visually-hidden">发件人包含</span>
            <el-input v-model="filters.sender" clearable placeholder="输入发件人">
              <template #prepend>发件人</template>
            </el-input>
          </label>
          <label class="filter-field filter-field--content">
            <span class="visually-hidden">内容包含</span>
            <el-input v-model="filters.content" clearable placeholder="输入正文关键词">
              <template #prepend>内容</template>
            </el-input>
          </label>
        </div>
        <div class="filter-actions">
          <button class="reset-button" type="button" :disabled="loading" @click="resetFilters">重置</button>
          <button class="search-button" type="submit" :disabled="loading">
            {{ loading ? "查询中" : "查询" }}
          </button>
        </div>
      </form>

      <div class="table-wrap">
        <el-table
          v-loading="loading"
          :data="messages"
          row-key="id"
          height="100%"
          empty-text="没有找到符合条件的消息"
        >
          <el-table-column label="接收时间" width="176">
            <template #default="{ row }">
              <time class="time-cell" :datetime="row.created_at">{{ formatDateTime(row.created_at) }}</time>
            </template>
          </el-table-column>
          <el-table-column label="发件人" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="sender-cell">{{ row.sender || "未知发件人" }}</span>
            </template>
          </el-table-column>
          <el-table-column label="消息内容" min-width="480" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="content-cell">{{ row.content }}</span>
            </template>
          </el-table-column>
          <el-table-column label="设备" width="126" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="device-cell">{{ row.device_name || "—" }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <footer class="pagination-panel">
        <span class="page-summary">当前显示 {{ messages.length }} 条</span>
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="sizes, prev, pager, next, jumper"
          background
          @current-change="loadMessages"
          @size-change="handlePageSizeChange"
        />
      </footer>
    </section>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import {
  ApiGetMobileMessages,
  type MobileMessageItem,
} from "@/api/mobile_messages";

defineEmits<{
  back: [];
}>();

const messages = ref<MobileMessageItem[]>([]);
const loading = ref(false);
const requestSequence = ref(0);

const filters = reactive({
  search: "",
  sender: "",
  content: "",
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

function formatDateTime(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.replace("T", " ");
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

async function loadMessages() {
  const sequence = ++requestSequence.value;
  loading.value = true;
  try {
    const response = await ApiGetMobileMessages({
      search: filters.search.trim() || undefined,
      sender: filters.sender.trim() || undefined,
      content: filters.content.trim() || undefined,
      page: pagination.page,
      page_size: pagination.pageSize,
    });
    if (sequence !== requestSequence.value) return;
    messages.value = Array.isArray(response?.items) ? response.items : [];
    pagination.total = Number(response?.pagination?.total || 0);
  } catch (error: any) {
    if (sequence !== requestSequence.value) return;
    messages.value = [];
    pagination.total = 0;
    window.$toast({
      title: error?.message || "加载手机消息失败",
      type: "error",
    });
  } finally {
    if (sequence === requestSequence.value) {
      loading.value = false;
    }
  }
}

function applyFilters() {
  pagination.page = 1;
  void loadMessages();
}

function resetFilters() {
  filters.search = "";
  filters.sender = "";
  filters.content = "";
  pagination.page = 1;
  void loadMessages();
}

function handlePageSizeChange() {
  pagination.page = 1;
  void loadMessages();
}

onMounted(() => {
  void loadMessages();
});
</script>

<style scoped lang="scss">
.mobile-messages-workspace {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #1f2937;
}

.workspace-topbar {
  min-height: 38px;
  display: flex;
  align-items: center;
}

.workspace-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-button {
  height: 30px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #dfe4e8;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.84);
  color: #5f6b76;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background 0.18s ease;
}

.back-button:hover {
  border-color: #b8c3bb;
  background: #ffffff;
  color: #176b3a;
}

.title-divider {
  width: 1px;
  height: 20px;
  background: #dfe4e8;
}

.title-copy {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.title-copy h2 {
  margin: 0;
  color: #17211b;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.title-copy span {
  color: #87918b;
  font-size: 12px;
}

.list-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e2e7e4;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 2px 10px rgba(29, 53, 39, 0.035);
}

.filter-toolbar {
  flex: 0 0 auto;
  min-height: 54px;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #e9eeeb;
  background: #fbfcfb;
}

.filter-fields {
  flex: 1 1 auto;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(190px, 0.95fr) minmax(220px, 1fr) minmax(240px, 1.25fr);
  gap: 8px;
}

.filter-field {
  min-width: 0;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.filter-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-button,
.reset-button {
  height: 34px;
  padding: 0 16px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease;
}

.search-button {
  min-width: 66px;
  border: 1px solid #237a49;
  background: #237a49;
  color: #ffffff;
}

.search-button:hover:not(:disabled) {
  border-color: #17663b;
  background: #17663b;
}

.reset-button {
  border: 1px solid transparent;
  background: transparent;
  color: #65716a;
}

.reset-button:hover:not(:disabled) {
  border-color: #dfe5e1;
  background: #ffffff;
  color: #344139;
}

.search-button:disabled,
.reset-button:disabled {
  opacity: 0.5;
  cursor: wait;
}

.back-button:focus-visible,
.search-button:focus-visible,
.reset-button:focus-visible {
  outline: 2px solid rgba(35, 122, 73, 0.28);
  outline-offset: 2px;
}

.table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.time-cell,
.device-cell {
  color: #7a8580;
  font-size: 12px;
}

.sender-cell {
  display: block;
  overflow: hidden;
  color: #28332c;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-cell {
  display: block;
  overflow: hidden;
  color: #4b5750;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-panel {
  flex: 0 0 48px;
  min-height: 48px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid #e9eeeb;
  background: #fbfcfb;
}

.page-summary {
  flex: 0 0 auto;
  color: #8a948e;
  font-size: 12px;
}

:deep(.el-input__wrapper) {
  min-height: 34px;
  background: #ffffff;
  box-shadow: 0 0 0 1px #dfe5e1 inset;
}

:deep(.el-input-group__prepend) {
  min-width: 60px;
  padding: 0 10px;
  justify-content: center;
  border-color: #dfe5e1;
  background: #f2f5f3;
  color: #67736c;
  font-size: 12px;
  font-weight: 600;
  box-shadow:
    1px 0 0 0 #dfe5e1 inset,
    0 1px 0 0 #dfe5e1 inset,
    0 -1px 0 0 #dfe5e1 inset;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #2d8654 inset;
}

:deep(.el-table) {
  --el-table-border-color: #edf1ee;
  --el-table-header-bg-color: #f7f9f8;
  --el-table-row-hover-bg-color: #f5faf7;
  color: #4b5750;
}

:deep(.el-table th.el-table__cell) {
  height: 40px;
  padding: 0;
  color: #67736c;
  font-size: 12px;
  font-weight: 650;
}

:deep(.el-table td.el-table__cell) {
  height: 48px;
  padding: 0;
}

:deep(.el-table .cell) {
  padding: 0 14px;
  line-height: 1.4;
}

:deep(.el-table__inner-wrapper::before) {
  display: none;
}

:deep(.el-pagination) {
  --el-pagination-button-bg-color: transparent;
  --el-pagination-hover-color: #237a49;
  --el-pagination-button-color: #65716a;
  --el-pagination-button-disabled-bg-color: transparent;
}

:deep(.el-pagination.is-background .btn-next),
:deep(.el-pagination.is-background .btn-prev),
:deep(.el-pagination.is-background .el-pager li) {
  border: 1px solid transparent;
  background: transparent;
}

:deep(.el-pagination.is-background .el-pager li.is-active) {
  border-color: #237a49;
  background: #237a49;
}

:deep(.el-select__wrapper),
:deep(.el-pagination__editor.el-input .el-input__wrapper) {
  min-height: 28px;
}

@media (max-width: 980px) {
  .filter-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-fields {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .filter-actions {
    justify-content: flex-end;
  }
}

@media (max-width: 720px) {
  .filter-fields {
    grid-template-columns: 1fr;
  }

  .pagination-panel {
    align-items: flex-start;
    flex-direction: column;
    height: auto;
    padding: 8px 12px;
  }

  :deep(.el-pagination) {
    max-width: 100%;
    overflow-x: auto;
  }
}
</style>
