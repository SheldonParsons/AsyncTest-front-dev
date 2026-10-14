<template>
  <section class="source-panel">
    <div class="source-directory" :aria-busy="importingDirectory">
      <label for="report-source-directory" class="source-directory-label">
        <FolderOpen :size="15" aria-hidden="true" />从 AsyncTest 目录导入
      </label>
      <div class="source-directory-controls">
        <input
          id="report-source-directory"
          class="source-directory-input"
          type="url"
          aria-label="AsyncTest 目录地址"
          aria-describedby="report-source-directory-hint report-source-directory-status"
          :aria-invalid="directoryImportStatus?.type === 'error'"
          :value="directoryUrl"
          :disabled="busy || !persistentSources"
          placeholder="粘贴 AsyncTest 文件目录地址，如 http://localhost:3333/home/main/project/1137/settings/source/files/v3.31"
          autocomplete="off"
          spellcheck="false"
          @input="$emit('update:directoryUrl', ($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="!busy && persistentSources && directoryUrl?.trim() && $emit('import-directory')"
        />
        <button
          type="button"
          class="report-button solid"
          :disabled="busy || !persistentSources || !directoryUrl?.trim()"
          @click="$emit('import-directory')"
        >
          <LoaderCircle v-if="importingDirectory" :size="14" class="spin" aria-hidden="true" />
          <Download v-else :size="14" aria-hidden="true" />
          {{ importingDirectory ? '正在导入…' : '下载并导入' }}
        </button>
      </div>
      <p id="report-source-directory-hint" class="source-directory-hint">
        {{ persistentSources ? '读取当前目录，将 .amind 自动归入用例文件、.xlsx 归入任务分配表；其他文件和子目录会跳过。' : '目录导入需要在 AsyncTest 桌面端使用。' }}
      </p>
      <p
        id="report-source-directory-status"
        class="source-directory-status"
        :class="{ 'is-error': directoryImportStatus?.type === 'error' }"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <CircleAlert v-if="directoryImportStatus?.type === 'error'" :size="13" aria-hidden="true" />
        <Check v-else-if="directoryImportStatus?.type === 'success'" :size="13" aria-hidden="true" />
        {{ directoryImportStatus?.message }}
      </p>
    </div>
    <!-- 空状态使用中间的导入入口；已有文件时提供追加或替换动作。 -->
    <div class="source-bar">
      <div class="source-switch" role="tablist" aria-label="数据源类型">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          class="source-switch-tab"
          :class="{ 'is-active': modelValue === tab.key }"
          :aria-selected="modelValue === tab.key"
          @click="$emit('update:modelValue', tab.key)"
        >
          <component :is="tab.icon" :size="14" />
          {{ tab.label }}
          <span
            v-if="tab.key === 'amind' && amindFiles.length"
            class="source-switch-count"
            >{{ amindFiles.length }}</span
          >
          <span
            v-if="tab.key === 'excel' && excelParseResult?.status === 'success'"
            class="report-ready-dot"
          />
        </button>
      </div>
      <div
        v-if="modelValue === 'amind' ? amindFiles.length > 0 : !!excelFile"
        class="source-bar-actions"
      >
        <button
          type="button"
          class="report-button outline tone-snug"
          :disabled="busy"
          @click="
            modelValue === 'amind' ? amindInput?.click() : excelInput?.click()
          "
        >
          <Upload :size="14" />从本地导入
        </button>
        <button
          type="button"
          class="report-button outline tone-snug"
          :disabled="busy"
          @click="$emit('trigger-input', modelValue as ReportInputKey)"
        >
          <FolderOpen :size="14" />从项目选择
        </button>
      </div>
    </div>

    <input
      ref="amindInput"
      type="file"
      accept=".amind"
      multiple
      class="visually-hidden"
      tabindex="-1"
      aria-label="选择本地 amind 文件"
      @change="selectedFiles($event, 'amind')"
    />
    <input
      ref="excelInput"
      type="file"
      accept=".xlsx"
      class="visually-hidden"
      tabindex="-1"
      aria-label="选择本地 Excel 文件"
      @change="selectedFiles($event, 'excel')"
    />

    <!-- 整个工作台就是拖放目标，拖拽时才浮出提示层。 -->
    <div
      class="source-workbench"
      :class="{ 'is-dragging': dragDepth > 0 }"
      @dragover.prevent="dragDepth++"
      @dragleave.prevent="dragDepth = Math.max(0, dragDepth - 1)"
      @drop.prevent="dropFiles"
    >
      <Transition name="report-fade">
        <div v-if="dragDepth > 0" class="source-drop" aria-hidden="true">
          <Upload :size="22" />
          <strong>松开即可导入</strong>
          <span>{{
            modelValue === "amind" ? ".amind 文件" : ".xlsx 文件"
          }}</span>
        </div>
      </Transition>

      <!-- ── amind ─────────────────────────────────────────── -->
      <template v-if="modelValue === 'amind'">
        <div v-if="!amindFiles.length" class="source-empty">
          <span class="source-empty-mark"><GitBranch :size="20" /></span>
          <strong>还没有用例文件</strong>
          <p>
            把 .amind 文件拖到这里，或从本地 /
            项目中选择。支持多个文件，单个不超过 50 MB。
          </p>
          <div class="source-empty-actions">
            <button
              type="button"
              class="report-button solid"
              :disabled="busy"
              @click="amindInput?.click()"
            >
              <Upload :size="14" />从本地导入
            </button>
            <button
              type="button"
              class="report-button outline"
              :disabled="busy"
              @click="$emit('trigger-input', 'amind')"
            >
              <FolderOpen :size="14" />从项目选择
            </button>
          </div>
        </div>

        <div v-else class="source-split">
          <div class="source-list" role="list" aria-label="已导入的用例文件">
            <button
              v-for="file in amindFiles"
              :key="file.id"
              type="button"
              role="listitem"
              class="source-list-row"
              :class="{ 'is-active': selectedAmindId === file.id }"
              @click="selectedAmindId = file.id"
            >
              <span class="source-list-mark">
                <FileText :size="14" />
              </span>
              <span class="source-list-copy">
                <strong>{{ file.name }}</strong>
                <small>{{
                  file.source === "local" ? "本地文件" : file.projectName
                }}</small>
              </span>
              <CircleAlert
                v-if="resultFor(file.id)?.status === 'error'"
                :size="13"
                class="is-error-icon"
              />
              <CircleCheck
                v-else-if="resultFor(file.id)?.status === 'success'"
                :size="13"
                class="is-ready-icon"
              />
            </button>
          </div>

          <div v-if="selectedAmind" class="source-detail">
            <div class="source-detail-head">
              <div class="source-detail-title">
                <h3>{{ selectedAmind.name }}</h3>
                <p>
                  {{
                    selectedAmind.source === "local"
                      ? "内容仅用于本次报告"
                      : `${selectedAmind.projectName} / ${selectedAmind.path}`
                  }}
                </p>
              </div>
              <button
                type="button"
                class="report-icon-button is-danger"
                :disabled="busy"
                :aria-label="`移除 ${selectedAmind.name}`"
                @click="$emit('remove-amind-file', selectedAmind.id)"
              >
                <Trash2 :size="15" />
              </button>
            </div>

            <template v-if="selectedResult?.status === 'success'">
              <div class="source-stats">
                <div
                  v-for="stat in statsFor(selectedResult)"
                  :key="stat.label"
                  class="source-stat"
                >
                  <span>{{ stat.label }}</span>
                  <strong :class="stat.tone">{{ stat.value }}</strong>
                </div>
              </div>

              <div class="source-detail-block">
                <div class="source-detail-label">
                  <span>统计画板</span>
                  <i>至少保留一个</i>
                </div>
                <div class="source-chips">
                  <button
                    v-for="board in selectedAmind.boardOptions"
                    :key="board.value"
                    type="button"
                    class="report-chip"
                    :class="{
                      'is-on': selectedAmind.selectedBoardIds.includes(
                        board.value,
                      ),
                    }"
                    :disabled="busy"
                    :aria-pressed="
                      selectedAmind.selectedBoardIds.includes(board.value)
                    "
                    @click="
                      $emit('toggle-amind-board', {
                        fileId: selectedAmind.id,
                        boardId: board.value,
                      })
                    "
                  >
                    <Check
                      v-if="
                        selectedAmind.selectedBoardIds.includes(board.value)
                      "
                      :size="12"
                    />{{ board.label }}
                  </button>
                </div>
              </div>

              <div class="source-detail-foot">
                <label class="report-check">
                  <input
                    :checked="selectedAmind.includeFreeNodes"
                    type="checkbox"
                    :disabled="busy"
                    @change="
                      $emit('update-amind-include-free-nodes', {
                        fileId: selectedAmind.id,
                        value: ($event.target as HTMLInputElement).checked,
                      })
                    "
                  />
                  <span>统计自由节点上的数据</span>
                </label>
                <div class="source-attachment">
                  <span class="source-attachment-label">附件格式</span>
                  <GeneratorDropdown
                    :model-value="selectedAmind.docxFileType"
                    :options="[
                      { value: 'xmind', label: 'XMind（自动转换）' },
                      { value: 'amind', label: 'amind（原始文件）' },
                    ]"
                    placeholder="选择附件格式"
                    :disabled="busy"
                    aria-label="报告附件格式"
                    @update:model-value="
                      $emit('update-amind-docx-file-type', {
                        fileId: selectedAmind.id,
                        value: $event as 'amind' | 'xmind',
                      })
                    "
                  />
                </div>
              </div>
            </template>

            <div
              v-else-if="selectedResult?.status === 'error'"
              class="source-failure"
            >
              <CircleAlert :size="16" />
              <div>
                <strong>这个文件暂时无法解析</strong>
                <p>{{ selectedResult.errorMessage }}</p>
                <button
                  type="button"
                  class="report-button outline tone-snug"
                  :disabled="busy"
                  @click="$emit('retry-amind')"
                >
                  <RefreshCw :size="13" />重新解析
                </button>
              </div>
            </div>

            <!-- 只有确实在解析时才转圈；否则会显示一个永远转不完的假进度。 -->
            <div
              v-else-if="parsingAmind || importingLocal"
              class="source-pending"
            >
              <LoaderCircle :size="15" class="spin" />正在解析这个文件…
            </div>
            <div v-else class="source-pending is-idle">
              这个文件还没有解析结果，移除后重新导入即可重试。
            </div>
          </div>
        </div>
      </template>

      <!-- ── Excel ─────────────────────────────────────────── -->
      <template v-else>
        <div v-if="!excelFile" class="source-empty">
          <span class="source-empty-mark"><FileSpreadsheet :size="20" /></span>
          <strong>还没有任务分配表</strong>
          <p>
            把 .xlsx 文件拖到这里，或从本地 /
            项目中选择。每份报告使用一个活动文件，桌面版会保留其他文件供切换。
          </p>
          <div class="source-empty-actions">
            <button
              type="button"
              class="report-button solid"
              :disabled="busy"
              @click="excelInput?.click()"
            >
              <Upload :size="14" />从本地导入
            </button>
            <button
              type="button"
              class="report-button outline"
              :disabled="busy"
              @click="$emit('trigger-input', 'excel')"
            >
              <FolderOpen :size="14" />从项目选择
            </button>
          </div>
        </div>

        <template v-else>
          <div class="source-file-bar">
            <span class="source-list-mark"><FileSpreadsheet :size="14" /></span>
            <div class="source-list-copy">
              <strong>{{ excelFile.name }}</strong>
              <small>{{
                excelFile.source === "local"
                  ? "本地文件 · 活动任务表"
                  : `${excelFile.projectName} · 活动任务表`
              }}</small>
            </div>
            <button
              type="button"
              class="report-icon-button is-danger"
              :disabled="busy"
              aria-label="移除 Excel 文件"
              @click="$emit('remove-excel-file')"
            >
              <Trash2 :size="15" />
            </button>
          </div>

          <div v-if="excelParseResult" class="source-detail is-flush">
            <div
              v-if="excelParseResult.status === 'success'"
              class="source-excel-head"
            >
              <div class="source-summary">
                <span
                  ><strong>{{ excelParseResult.rowCount }}</strong> 行任务</span
                >
                <span
                  ><strong>{{ excelParseResult.uniqueModules.length }}</strong>
                  个模块</span
                >
                <span
                  ><strong>{{ excelParseResult.uniqueOwners.length }}</strong>
                  位负责人</span
                >
                <span class="source-summary-state"
                  ><span class="report-ready-dot" />解析完成</span
                >
              </div>
              <div class="source-switch is-compact" role="tablist">
                <button
                  v-for="view in [
                    { key: 'setup', label: '解析设置' },
                    {
                      key: 'preview',
                      label: `任务预览 · ${excelParseResult.rowCount}`,
                    },
                  ]"
                  :key="view.key"
                  type="button"
                  role="tab"
                  class="source-switch-tab"
                  :class="{ 'is-active': excelView === view.key }"
                  :aria-selected="excelView === view.key"
                  @click="excelView = view.key"
                >
                  {{ view.label }}
                </button>
              </div>
            </div>

            <div v-if="excelView === 'setup'" class="source-excel-setup">
              <div class="source-excel-grid">
                <ReportField name="excel-sheet" label="工作表" v-slot="field">
                  <GeneratorDropdown
                    v-bind="field"
                    :model-value="excelParseResult.selectedSheet"
                    :options="excelParseResult.sheetOptions"
                    :disabled="busy"
                    placeholder="选择工作表"
                    @update:model-value="$emit('update-excel-sheet', $event)"
                  />
                </ReportField>
                <ReportField
                  v-for="column in columns"
                  :key="column.key"
                  :name="`excel-${column.key}`"
                  :label="column.label"
                  v-slot="field"
                >
                  <GeneratorDropdown
                    v-bind="field"
                    :model-value="excelParseResult.columnMapping[column.key]"
                    :options="column.options"
                    :disabled="busy"
                    :placeholder="`选择${column.label}`"
                    @update:model-value="
                      $emit('update-excel-column', {
                        key: column.key,
                        value: $event,
                      })
                    "
                  />
                </ReportField>
              </div>

              <div
                v-if="excelParseResult.status === 'error'"
                class="source-failure"
              >
                <CircleAlert :size="16" />
                <div>
                  <strong>需要调整解析配置</strong>
                  <p>{{ excelParseResult.errorMessage }}</p>
                  <button
                    type="button"
                    class="report-button outline tone-snug"
                    :disabled="busy"
                    @click="$emit('retry-excel')"
                  >
                    <RefreshCw :size="13" />重新解析
                  </button>
                </div>
              </div>

              <CollapsibleRoot
                v-else
                v-model:open="filtersOpen"
                class="report-disclosure"
              >
                <CollapsibleTrigger class="disclosure-trigger">
                  <span class="disclosure-trigger-copy">
                    <Settings2 :size="14" />筛选参与计算的行
                    <span
                      v-if="excelParseResult.rowFilter"
                      class="disclosure-badge"
                      >按列筛选</span
                    >
                    <span v-if="excludedCount" class="disclosure-badge"
                      >已排除 {{ excludedCount }} 项</span
                    >
                  </span>
                  <ChevronDown :size="15" class="disclosure-chevron" />
                </CollapsibleTrigger>
                <CollapsibleContent class="disclosure-content">
                  <div class="disclosure-inner">
                    <div class="source-row-filter">
                      <div class="source-row-filter-controls">
                        <ReportField
                          name="excel-filter-column"
                          label="筛选列"
                          :required="false"
                          v-slot="field"
                        >
                          <GeneratorDropdown
                            v-bind="field"
                            :model-value="
                              excelParseResult.rowFilter?.column || ''
                            "
                            :options="excelParseResult.filterColumnOptions"
                            :disabled="busy"
                            placeholder="选择任意一列（可选）"
                            @update:model-value="
                              $emit('update-excel-row-filter', {
                                column: $event,
                                value: null,
                              })
                            "
                          />
                        </ReportField>
                        <span class="source-row-filter-operator">等于</span>
                        <ReportField
                          name="excel-row-filter"
                          label="匹配值"
                          :required="!!excelParseResult.rowFilter"
                          v-slot="field"
                        >
                          <GeneratorDropdown
                            v-bind="field"
                            :model-value="encodedFilterValue"
                            :options="excelParseResult.filterValueOptions"
                            :disabled="busy || !excelParseResult.rowFilter"
                            :placeholder="
                              excelParseResult.rowFilter
                                ? '选择或搜索该列的值'
                                : '先选择筛选列'
                            "
                            @update:model-value="setRowFilterValue"
                          />
                        </ReportField>
                        <button
                          v-if="excelParseResult.rowFilter"
                          type="button"
                          class="report-icon-button source-row-filter-clear"
                          :disabled="busy"
                          aria-label="清除按列筛选"
                          title="清除按列筛选"
                          @click="$emit('update-excel-row-filter', null)"
                        >
                          <X :size="14" />
                        </button>
                      </div>
                      <p
                        v-if="excelParseResult.rowFilter?.value === null"
                        class="source-row-filter-hint"
                        role="status"
                      >
                        请选择匹配值后生效，也可以选择“空值”。
                      </p>
                      <p
                        v-else-if="excelParseResult.rowFilter"
                        class="source-row-filter-hint"
                        role="status"
                      >
                        当前保留
                        <strong
                          >{{ excelParseResult.rowCount }} /
                          {{ excelParseResult.sourceRowCount }}</strong
                        >
                        行任务，模块、负责人和报告内容将同步更新。<span
                          v-if="!excelParseResult.rowCount"
                          >没有匹配行，请调整条件或下方排除项。</span
                        >
                      </p>
                      <p v-else class="source-row-filter-hint">
                        仅保留所选列与匹配值完全相同的行，并与下方排除项一起生效。切换工作表会清除此条件。
                      </p>
                    </div>
                    <div class="source-filter-columns">
                      <div>
                        <div class="source-detail-label">
                          <span>模块</span><i>点击排除</i>
                        </div>
                        <div class="source-chips is-dense">
                          <button
                            v-for="name in excelParseResult.uniqueModules"
                            :key="name"
                            type="button"
                            class="report-chip is-excludable"
                            :disabled="busy"
                            @click="$emit('exclude-excel-module', name)"
                          >
                            {{ name }}<X :size="11" />
                          </button>
                          <button
                            v-if="excelParseResult.hasEmptyModule"
                            type="button"
                            class="report-chip"
                            :disabled="busy"
                            @click="$emit('toggle-excel-empty-module')"
                          >
                            空模块 ·
                            {{
                              excelParseResult.excludedModules.includes(
                                EMPTY_MODULE_LABEL,
                              )
                                ? "恢复"
                                : "排除"
                            }}
                          </button>
                        </div>
                      </div>
                      <div>
                        <div class="source-detail-label">
                          <span>负责人</span><i>点击排除</i>
                        </div>
                        <div class="source-chips is-dense">
                          <button
                            v-for="name in excelParseResult.uniqueOwners"
                            :key="name"
                            type="button"
                            class="report-chip is-excludable"
                            :disabled="busy"
                            @click="$emit('exclude-excel-owner', name)"
                          >
                            {{ name }}<X :size="11" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      v-if="excludedCount"
                      type="button"
                      class="report-button text-inline"
                      :disabled="busy"
                      @click="$emit('reset-excel-filters')"
                    >
                      <RefreshCw :size="13" />恢复全部 {{ excludedCount }} 项
                    </button>
                  </div>
                </CollapsibleContent>
              </CollapsibleRoot>
            </div>

            <div v-else class="source-excel-preview">
              <div class="source-table-scroll">
                <table class="source-table">
                  <thead>
                    <tr>
                      <th>模块</th>
                      <th>需求</th>
                      <th>负责人</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in visibleRows" :key="row.id">
                      <td>{{ row.module || "—" }}</td>
                      <td>{{ row.requirement || "—" }}</td>
                      <td>{{ row.owner || "—" }}</td>
                    </tr>
                  </tbody>
                </table>
                <p v-if="!visibleRows.length" class="source-table-empty">
                  没有符合当前筛选的任务，请调整筛选条件。
                </p>
              </div>
              <div class="source-pager">
                <span>第 {{ tablePage }} / {{ tablePages }} 页</span>
                <button
                  class="report-icon-button"
                  type="button"
                  aria-label="上一页任务"
                  :disabled="tablePage === 1"
                  @click="tablePage--"
                >
                  <ChevronLeft :size="15" />
                </button>
                <button
                  class="report-icon-button"
                  type="button"
                  aria-label="下一页任务"
                  :disabled="tablePage === tablePages"
                  @click="tablePage++"
                >
                  <ChevronRight :size="15" />
                </button>
              </div>
            </div>
          </div>

          <div v-if="parsingExcel || importingLocal" class="source-pending">
            <LoaderCircle :size="15" class="spin" />正在读取工作表…
          </div>
        </template>
      </template>
    </div>

    <footer class="source-footnote">
      <Info
        :size="12"
      /><template v-if="persistentSources">来源已保存到本机，退出或刷新后可继续使用，当前草稿总大小不超过 100 MB。</template><template v-else>本地文件仅保留在当前工作台中，退出或刷新后需要重新导入，总大小不超过 100 MB。</template>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  CollapsibleRoot,
  CollapsibleTrigger,
  CollapsibleContent,
} from "reka-ui";
import {
  Upload,
  Download,
  GitBranch,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Trash2,
  Check,
  CircleCheck,
  CircleAlert,
  LoaderCircle,
  RefreshCw,
  Settings2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
} from "@/components/icons/lucide";
import { EMPTY_MODULE_LABEL } from "../types";
import type {
  ReportAmindSourceFile,
  ReportAmindParseResult,
  ReportExcelSourceFile,
  ReportExcelParseResult,
  ReportExcelColumnMapping,
  ReportExcelRowFilter,
  ReportInputKey,
  ReportStatusState,
} from "../types";
import GeneratorDropdown from "./GeneratorDropdown.vue";
import ReportField from "./ReportField.vue";

const props = defineProps<{
  persistentSources?: boolean;
  directoryUrl?: string;
  importingDirectory?: boolean;
  directoryImportStatus?: ReportStatusState;
  modelValue: string;
  amindFiles: ReportAmindSourceFile[];
  amindParseResults: ReportAmindParseResult[];
  parsingAmind: boolean;
  excelFile: ReportExcelSourceFile | null;
  excelParseResult: ReportExcelParseResult | null;
  parsingExcel: boolean;
  importingLocal: boolean;
  disabled?: boolean;
  revealField?: string;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:directoryUrl": [value: string];
  "import-directory": [];
  "trigger-input": [key: ReportInputKey];
  "import-local": [files: File[], kind: "amind" | "excel"];
  "remove-amind-file": [id: string];
  "update-amind-docx-file-type": [
    value: { fileId: string; value: "xmind" | "amind" },
  ];
  "toggle-amind-board": [value: { fileId: string; boardId: string }];
  "update-amind-include-free-nodes": [
    value: { fileId: string; value: boolean },
  ];
  "remove-excel-file": [];
  "update-excel-sheet": [value: string];
  "update-excel-column": [
    value: { key: keyof ReportExcelColumnMapping; value: string },
  ];
  "update-excel-row-filter": [filter: ReportExcelRowFilter | null];
  "exclude-excel-module": [name: string];
  "exclude-excel-owner": [name: string];
  "toggle-excel-empty-module": [];
  "reset-excel-filters": [];
  "retry-amind": [];
  "retry-excel": [];
}>();

const tabs = [
  { key: "amind", label: "用例文件", icon: GitBranch },
  { key: "excel", label: "任务分配表", icon: FileSpreadsheet },
] as const;

const amindInput = ref<HTMLInputElement>();
const excelInput = ref<HTMLInputElement>();
const selectedAmindId = ref("");
const tablePage = ref(1);
const filtersOpen = ref(!!props.excelParseResult?.rowFilter);
const excelView = ref("setup");
// dragleave 会在子元素间反复触发，用计数而不是布尔量才不会闪。
const dragDepth = ref(0);

const busy = computed(
  () =>
    props.importingLocal ||
    props.importingDirectory ||
    props.parsingAmind ||
    props.parsingExcel ||
    !!props.disabled,
);
const selectedAmind = computed(() =>
  props.amindFiles.find((file) => file.id === selectedAmindId.value),
);
const resultFor = (id: string) =>
  props.amindParseResults.find((result) => result.fileId === id);
const selectedResult = computed(() => resultFor(selectedAmindId.value));
const excludedCount = computed(
  () =>
    (props.excelParseResult?.excludedModules.length || 0) +
    (props.excelParseResult?.excludedOwners.length || 0),
);
const encodedFilterValue = computed(() => {
  const filter = props.excelParseResult?.rowFilter;
  return filter && filter.value !== null ? JSON.stringify(filter.value) : "";
});
function setRowFilterValue(encoded: string) {
  const result = props.excelParseResult;
  if (
    !result?.rowFilter ||
    !result.filterValueOptions.some((option) => option.value === encoded)
  )
    return;
  const value: unknown = JSON.parse(encoded);
  if (typeof value === "string")
    emit("update-excel-row-filter", { column: result.rowFilter.column, value });
}
watch(
  () => props.revealField,
  (field) => {
    if (field === "excel-row-filter") {
      excelView.value = "setup";
      filtersOpen.value = true;
    }
  },
  { immediate: true },
);
const columns = computed(
  () =>
    [
      {
        key: "requirement",
        label: "需求列",
        options: props.excelParseResult?.requirementColumnOptions || [],
      },
      {
        key: "module",
        label: "模块列",
        options: props.excelParseResult?.moduleColumnOptions || [],
      },
      {
        key: "owner",
        label: "负责人列",
        options: props.excelParseResult?.ownerColumnOptions || [],
      },
    ] as const,
);
const tablePages = computed(() =>
  Math.max(1, Math.ceil((props.excelParseResult?.previewRows.length || 0) / 5)),
);
const visibleRows = computed(
  () =>
    props.excelParseResult?.previewRows.slice(
      (tablePage.value - 1) * 5,
      tablePage.value * 5,
    ) || [],
);
function statsFor(result: ReportAmindParseResult) {
  return [
    { label: "用例总数", value: result.totalCaseCount, tone: "" },
    { label: "通过", value: result.passedCaseCount, tone: "" },
    {
      label: "失败",
      value: result.failedCaseCount,
      tone: result.failedCaseCount ? "is-error-text" : "",
    },
    { label: "未执行", value: result.pendingCaseCount, tone: "" },
    { label: "复用", value: result.reusedCaseCount, tone: "" },
  ];
}
watch(
  () => props.amindFiles.map((file) => file.id),
  (ids, previous = []) => {
    const added = ids.filter((id) => !previous.includes(id));
    if (added.length) selectedAmindId.value = added.at(-1) || "";
    else if (!ids.includes(selectedAmindId.value))
      selectedAmindId.value = ids.at(-1) || "";
  },
  { immediate: true },
);
watch(
  () => props.excelParseResult,
  () => {
    tablePage.value = 1;
    if (props.excelParseResult?.status !== "success") excelView.value = "setup";
  },
);
function selectedFiles(event: Event, kind: "amind" | "excel") {
  const input = event.target as HTMLInputElement;
  if (!busy.value) emit("import-local", Array.from(input.files || []), kind);
  input.value = "";
}
function dropFiles(event: DragEvent) {
  dragDepth.value = 0;
  if (busy.value) return;
  emit(
    "import-local",
    Array.from(event.dataTransfer?.files || []),
    props.modelValue === "amind" ? "amind" : "excel",
  );
}
</script>

<style lang="scss">
.source-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}
.source-directory {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 16px;
  border: 1px solid #e3e3e3;
  border-radius: 10px;
  background: #fafafa;
}
.source-directory-label {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #333;
  font-size: 12px;
  font-weight: 600;
}
.source-directory-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  .report-button { flex-shrink: 0; }
}
.source-directory-input {
  flex: 1 1 240px;
  min-width: 0;
  width: 100%;
  height: 36px;
  box-sizing: border-box;
  padding: 0 11px;
  border: 1px solid #ddd;
  border-radius: 7px;
  background: #fff;
  color: #252525;
  font: inherit;
  font-size: 12px;
  transition: border-color .18s ease, box-shadow .18s ease;
  &::placeholder { color: #999; }
  &:focus-visible { outline: none; border-color: #555; box-shadow: 0 0 0 2px rgb(0 0 0 / 6%); }
  &:disabled { color: #999; background: #f3f3f3; cursor: not-allowed; }
}
.source-directory-hint,
.source-directory-status {
  margin: 0;
  font-size: 11px;
  line-height: 1.65;
  color: #858585;
  overflow-wrap: anywhere;
}
.source-directory-status {
  display: flex;
  align-items: baseline;
  gap: 5px;
  color: #464646;
  &:empty { display: none; }
  svg { flex-shrink: 0; align-self: flex-start; margin-top: 3px; }
  &.is-error { color: #333; }
}
.source-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}
.source-bar-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}
.source-switch {
  display: inline-flex;
  gap: 3px;
  padding: 3px;
  background: #f2f2f2;
  border-radius: 9px;
}
.source-switch.is-compact {
  padding: 2px;
}
.source-switch-tab {
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
  white-space: nowrap;
  transition:
    color 0.18s ease,
    background 0.18s ease;
}
.source-switch-tab:hover {
  color: #3d3d3d;
}
.source-switch-tab.is-active {
  color: #171717;
  background: #ffffff;
  box-shadow: 0 1px 2px rgb(16 16 16 / 6%);
}
.source-switch-count {
  padding: 0 5px;
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #5c5c5c;
  background: #ededed;
  border-radius: 4px;
}
.source-workbench {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.source-drop {
  position: absolute;
  inset: -6px;
  z-index: 20;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 5px;
  color: #171717;
  background: rgb(255 255 255 / 94%);
  border: 1.5px dashed #171717;
  border-radius: 14px;
  pointer-events: none;
  backdrop-filter: blur(2px);
}
.source-drop strong {
  font-size: 13px;
  font-weight: 600;
}
.source-drop span {
  font-size: 11px;
  color: #8a8a8a;
}
.source-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  flex: 1;
  min-height: 260px;
  padding: 34px 24px;
  border: 1px dashed #dcdcdc;
  border-radius: 12px;
  background: #fcfcfc;
}
.source-empty-mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  color: #5c5c5c;
  background: #f2f2f2;
  border-radius: 11px;
}
.source-empty strong {
  font-size: 13px;
  font-weight: 600;
  color: #1f1f1f;
}
.source-empty p {
  max-width: 400px;
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: #969696;
}
.source-empty-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
.source-split {
  display: grid;
  grid-template-columns: minmax(0, 236px) minmax(0, 1fr);
  gap: 0;
  min-height: 0;
  border: 1px solid #ededed;
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
}
.source-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  max-height: 340px;
  overflow-y: auto;
  background: #fafafa;
  border-right: 1px solid #ededed;
  scrollbar-width: thin;
  scrollbar-color: #d4d4d4 transparent;
}
.source-list-row {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 9px;
  text-align: left;
  color: #6b6b6b;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 0.16s ease,
    color 0.16s ease;
}
.source-list-row:hover {
  background: #f0f0f0;
}
.source-list-row.is-active {
  color: #171717;
  background: #ffffff;
  box-shadow: 0 1px 2px rgb(16 16 16 / 6%);
}
.source-list-mark {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  color: #6b6b6b;
  background: #f0f0f0;
  border-radius: 7px;
}
.source-list-row.is-active .source-list-mark {
  color: #ffffff;
  background: #171717;
}
.source-list-copy {
  flex: 1;
  min-width: 0;
}
.source-list-copy strong {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #2b2b2b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.source-list-copy small {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: #a0a0a0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.is-ready-icon {
  flex-shrink: 0;
  color: #009879;
}
.is-error-icon {
  flex-shrink: 0;
  color: #b42318;
}
.is-error-text {
  color: #b42318 !important;
}
.source-detail {
  min-width: 0;
  padding: 14px 16px 16px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #d4d4d4 transparent;
}
.source-detail.is-flush {
  padding: 0;
  border: 1px solid #ededed;
  border-radius: 12px;
  background: #ffffff;
}
.source-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.source-detail-title {
  min-width: 0;
}
.source-detail-title h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #1f1f1f;
  overflow-wrap: anywhere;
}
.source-detail-title p {
  margin: 3px 0 0;
  font-size: 11px;
  color: #a0a0a0;
  overflow-wrap: anywhere;
}
.source-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 2px;
  padding: 12px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}
.source-stat span {
  display: block;
  font-size: 10px;
  color: #a0a0a0;
}
.source-stat strong {
  display: block;
  margin-top: 4px;
  font-size: 19px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  color: #171717;
}
.source-detail-block {
  margin-top: 14px;
}
.source-detail-label {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-bottom: 8px;
}
.source-detail-label span {
  font-size: 11px;
  font-weight: 600;
  color: #3f3f3f;
}
.source-detail-label i {
  font-style: normal;
  font-size: 10px;
  color: #b0b0b0;
}
.source-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.source-chips.is-dense {
  gap: 5px;
  max-height: 132px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #d4d4d4 transparent;
}
.source-detail-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  margin-top: 16px;
  padding-top: 13px;
  border-top: 1px solid #f0f0f0;
}
.source-attachment {
  display: flex;
  align-items: center;
  gap: 9px;
}
.source-attachment-label {
  font-size: 11px;
  color: #969696;
  white-space: nowrap;
}
/* 这里是全局 style 块，不需要 :deep；写成 :deep() 反而不会生效。 */
.source-attachment .report-select-anchor {
  min-width: 186px;
}
.source-pending {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 14px 0;
  font-size: 12px;
  color: #8a8a8a;
}
.source-pending.is-idle {
  color: var(--rw-muted-3, #b8b8b8);
}
.source-failure {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 14px;
  padding: 13px 14px;
  color: #8f1d12;
  background: #fffbfa;
  border: 1px solid #f0d9d6;
  border-radius: 10px;
}
.source-failure strong {
  display: block;
  font-size: 12px;
  font-weight: 600;
}
.source-failure p {
  margin: 4px 0 10px;
  font-size: 11px;
  line-height: 1.6;
  color: #a0554d;
  overflow-wrap: anywhere;
}
.source-file-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 13px;
  background: #ffffff;
  border: 1px solid #ededed;
  border-radius: 10px;
}
.source-excel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}
.source-summary {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  font-size: 11px;
  color: #8a8a8a;
}
.source-summary strong {
  margin-right: 3px;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #171717;
}
.source-summary-state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px 2px 7px;
  font-size: 11px;
  font-weight: 550;
  color: #0b6b57;
  background: #f0faf7;
  border-radius: 20px;
}
.source-excel-setup {
  padding: 14px 16px 16px;
}
.source-excel-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 2px 18px;
}
.source-excel-preview {
  padding: 14px 16px 16px;
}
.source-table-scroll {
  border: 1px solid #ededed;
  border-radius: 10px;
  overflow: auto;
  max-height: 268px;
  scrollbar-width: thin;
  scrollbar-color: #d4d4d4 transparent;
}
.source-table {
  width: 100%;
  min-width: 420px;
  border-collapse: collapse;
}
.source-table th,
.source-table td {
  padding: 9px 13px;
  text-align: left;
  font-size: 12px;
  line-height: 1.5;
  border-bottom: 1px solid #f2f2f2;
}
.source-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  font-size: 11px;
  font-weight: 600;
  color: #8a8a8a;
  background: #fafafa;
}
.source-table td {
  color: #4a4a4a;
}
.source-table tbody tr:last-child td {
  border-bottom: 0;
}
.source-table-empty {
  padding: 22px;
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: #a0a0a0;
}
.source-pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding-top: 11px;
}
.source-pager span {
  margin-right: 4px;
  font-size: 11px;
  color: #969696;
}
.source-filter-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}
.source-row-filter {
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eeeeee;
}
.source-row-filter-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
}
.source-row-filter-operator {
  padding-top: 30px;
  color: #737373;
  font-size: 12px;
}
.source-row-filter-clear {
  margin-top: 25px;
}
.source-row-filter-hint {
  margin: 10px 0 0;
  color: #737373;
  font-size: 11px;
  line-height: 1.7;
}
.source-row-filter-hint span {
  display: block;
}
@media (max-width: 600px) {
  .source-row-filter-controls {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .source-row-filter-operator {
    display: none;
  }
  .source-row-filter-controls > .report-field {
    grid-column: 1;
  }
  .source-row-filter-clear {
    grid-column: 2;
    grid-row: 2;
  }
}
.source-footnote {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #b0b0b0;
}
.source-footnote svg {
  flex-shrink: 0;
}
.report-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  font-size: 11px;
  line-height: 1.5;
  color: #6b6b6b;
  background: #ffffff;
  border: 1px solid #e6e6e6;
  border-radius: 7px;
  cursor: pointer;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease;
}
.report-chip:hover:not(:disabled) {
  color: #171717;
  border-color: #b4b4b4;
}
.report-chip.is-on {
  color: #171717;
  font-weight: 550;
  background: #f2f2f2;
  border-color: #cfcfcf;
}
.report-chip.is-excludable:hover:not(:disabled) {
  color: #8f1d12;
  background: #fffbfa;
  border-color: #e0b4b0;
}
@media (max-width: 1100px) {
  .source-excel-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .source-split {
    grid-template-columns: minmax(0, 1fr);
  }
  .source-list {
    flex-direction: row;
    max-height: none;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid #ededed;
    padding: 6px;
  }
  .source-list-row {
    width: 168px;
    flex-shrink: 0;
  }
  .source-filter-columns {
    grid-template-columns: minmax(0, 1fr);
  }
  .source-bar {
    align-items: stretch;
  }
}
@media (max-width: 620px) {
  .source-excel-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .source-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    row-gap: 12px;
  }
}
</style>
