<template>
  <section class="report-sources-panel">
    <header class="report-sources-panel-head">
      <div>
        <h3>数据源</h3>
      </div>
    </header>

    <div class="report-sources-list">
      <article v-for="input in inputs" :key="input.key" class="report-source-card">
        <div class="report-source-card-main">
          <div class="report-source-title-row">
            <h4>{{ input.title }}</h4>
            <span class="report-source-tag" :class="{ 'report-source-tag-soft': !input.required }">
              {{ input.required ? "必填" : "可选" }}
            </span>
          </div>
          <p v-if="input.description">{{ input.description }}</p>
          <div v-if="input.hint" class="report-source-hint">{{ input.hint }}</div>
          <div class="report-source-status">{{ input.statusText }}</div>
          <div v-if="input.selectedText" class="report-source-selected">{{ input.selectedText }}</div>

           <template v-if="input.key === 'amind'">
             <div class="source-actions">
               <button class="report-source-toggle" type="button" @click="$emit('trigger-input', input.key)">
                 {{ input.actionLabel }}
                </button>
              </div>

            <div v-if="amindFiles.length" class="amind-file-list">
              <div v-for="file in amindFiles" :key="file.id" class="amind-file-item">
                <div class="amind-file-copy">
                  <strong>{{ file.name }}</strong>
                  <span>{{ file.projectName }} / {{ file.path }}</span>
                </div>
                <div class="amind-file-actions">
                  <label class="amind-file-format">
                    <span>输出到 DOCX</span>
                    <GeneratorDropdown
                      :model-value="file.docxFileType"
                      :options="[
                        { value: 'xmind', label: 'xmind' },
                        { value: 'amind', label: 'amind' },
                      ]"
                      placeholder="请选择类型"
                      trigger-label="类型"
                      @update:model-value="$emit('update-amind-docx-file-type', { fileId: file.id, value: $event })"
                    />
                  </label>
                  <button class="amind-file-remove" type="button" @click="$emit('remove-amind-file', file.id)">删除</button>
                </div>
              </div>
            </div>

             <div v-if="amindParseResults.length" class="amind-result-list">
              <article v-for="result in amindParseResults" :key="result.fileId" class="amind-result-card" :class="{ 'is-error': result.status === 'error' }">
                <div class="amind-result-head">
                  <div>
                    <h5>{{ result.fileName }}</h5>
                    <p>{{ result.projectName }} · {{ result.boardTitle }}</p>
                  </div>
                  <span class="amind-result-badge" :class="{ 'is-error': result.status === 'error' }">
                    {{ result.status === "success" ? "已解析" : "解析失败" }}
                  </span>
                </div>

                <div v-if="result.status === 'success'" class="amind-result-grid">
                  <div><span>用例条数</span><strong>{{ result.totalCaseCount }}</strong></div>
                  <div><span>通过用例数</span><strong>{{ result.passedCaseCount }}</strong></div>
                  <div><span>失败用例数</span><strong>{{ result.failedCaseCount }}</strong></div>
                  <div><span>未执行用例数</span><strong>{{ result.pendingCaseCount }}</strong></div>
                  <div><span>复用用例数</span><strong>{{ result.reusedCaseCount }}</strong></div>
                  <div><span>通过率</span><strong>{{ result.passRate }}</strong></div>
                </div>

                <div v-else class="amind-result-error">{{ result.errorMessage }}</div>
              </article>
             </div>
           </template>

            <template v-if="input.key === 'excel'">
              <div class="source-actions">
                <button class="report-source-toggle" type="button" @click="$emit('trigger-input', input.key)">
                  {{ input.actionLabel }}
                </button>
              </div>

             <div v-if="excelFile" class="excel-file-list">
               <div class="excel-file-item">
                 <div class="amind-file-copy">
                   <strong>{{ excelFile.name }}</strong>
                   <span>{{ excelFile.projectName }} / {{ excelFile.path }}</span>
                 </div>
                 <button class="amind-file-remove" type="button" @click="$emit('remove-excel-file')">删除</button>
               </div>
             </div>

             <div v-if="excelParseResult" class="excel-result-list">
               <article class="excel-result-card" :class="{ 'is-error': excelParseResult.status === 'error' }">
                 <div class="amind-result-head">
                   <div>
                     <h5>{{ excelParseResult.fileName }}</h5>
                     <p>{{ excelParseResult.projectName }}</p>
                   </div>
                   <span class="amind-result-badge" :class="{ 'is-error': excelParseResult.status === 'error' }">
                     {{ excelParseResult.status === "success" ? "已解析" : "待确认" }}
                   </span>
                 </div>

                 <div class="excel-mapping-grid">
                   <label class="excel-mapping-field">
                     <span>解析 Sheet</span>
                     <GeneratorDropdown
                       :model-value="excelParseResult.selectedSheet"
                       :options="excelParseResult.sheetOptions"
                       placeholder="请选择 Sheet"
                       trigger-label="Sheet"
                       @update:model-value="$emit('update-excel-sheet', $event)"
                     />
                   </label>

                   <label class="excel-mapping-field">
                     <span>需求列</span>
                     <GeneratorDropdown
                       :model-value="excelParseResult.columnMapping.requirement"
                       :options="excelParseResult.requirementColumnOptions"
                       placeholder="请选择需求列"
                       trigger-label="列"
                       @update:model-value="$emit('update-excel-column', { key: 'requirement', value: $event })"
                     />
                   </label>

                   <label class="excel-mapping-field">
                     <span>模块列</span>
                     <GeneratorDropdown
                       :model-value="excelParseResult.columnMapping.module"
                       :options="excelParseResult.moduleColumnOptions"
                       placeholder="请选择模块列"
                       trigger-label="列"
                       @update:model-value="$emit('update-excel-column', { key: 'module', value: $event })"
                     />
                   </label>

                   <label class="excel-mapping-field">
                     <span>负责人列</span>
                     <GeneratorDropdown
                       :model-value="excelParseResult.columnMapping.owner"
                       :options="excelParseResult.ownerColumnOptions"
                       placeholder="请选择负责人列"
                       trigger-label="列"
                       @update:model-value="$emit('update-excel-column', { key: 'owner', value: $event })"
                     />
                   </label>
                 </div>

                 <div v-if="excelParseResult.status === 'error'" class="amind-result-error">
                   {{ excelParseResult.errorMessage }}
                 </div>

                 <template v-else>
                   <div class="excel-overview-grid">
                     <div><span>预览行数</span><strong>{{ excelParseResult.rowCount }}</strong></div>
                     <div><span>模块去重</span><strong>{{ excelParseResult.uniqueModules.length }}</strong></div>
                     <div><span>负责人去重</span><strong>{{ excelParseResult.uniqueOwners.length }}</strong></div>
                   </div>

                    <div class="excel-unique-group">
                     <div class="excel-unique-block">
                       <span>所有模块</span>
                      <div class="excel-chip-list">
                          <button
                            v-for="moduleName in excelParseResult.uniqueModules"
                            :key="moduleName"
                            class="excel-chip excel-chip-removable"
                            type="button"
                            @click="$emit('exclude-excel-module', moduleName)"
                          >
                            <span>{{ moduleName }}</span>
                            <span aria-hidden="true">×</span>
                          </button>
                         </div>
                       </div>

                       <div v-if="excelParseResult.hasEmptyModule" class="excel-unique-block">
                         <span>空模块</span>
                         <div class="excel-chip-list">
                           <button
                             class="excel-chip excel-chip-removable"
                             :class="{ 'excel-chip-muted': excelParseResult.excludedModules.includes(EMPTY_MODULE_LABEL) }"
                             type="button"
                             @click="$emit('toggle-excel-empty-module')"
                           >
                             <span>{{ EMPTY_MODULE_LABEL }}</span>
                             <span aria-hidden="true">{{ excelParseResult.excludedModules.includes(EMPTY_MODULE_LABEL) ? "恢复" : "移除" }}</span>
                           </button>
                         </div>
                       </div>

                       <div class="excel-unique-block">
                         <span>所有负责人</span>
                        <div class="excel-chip-list">
                          <button
                            v-for="ownerName in excelParseResult.uniqueOwners"
                            :key="ownerName"
                            class="excel-chip excel-chip-removable"
                            type="button"
                            @click="$emit('exclude-excel-owner', ownerName)"
                          >
                            <span>{{ ownerName }}</span>
                            <span aria-hidden="true">×</span>
                          </button>
                        </div>
                      </div>
                    </div>

                   <div v-if="excelParseResult.previewRows.length" class="excel-preview-wrap">
                     <table class="excel-preview-table">
                        <thead>
                          <tr>
                            <th>模块</th>
                            <th class="excel-cell-requirement">需求</th>
                            <th class="excel-cell-owner">负责人</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="row in excelParseResult.previewRows" :key="row.id">
                            <td v-if="row.showModule" :rowspan="row.moduleRowSpan">{{ row.module }}</td>
                            <td v-if="row.showRequirement" :rowspan="row.requirementRowSpan" class="excel-cell-requirement">{{ row.requirement || "-" }}</td>
                            <td v-if="row.showOwner" :rowspan="row.ownerRowSpan" class="excel-cell-owner">{{ row.owner || "-" }}</td>
                          </tr>
                        </tbody>
                      </table>
                   </div>
                 </template>
               </article>
             </div>
           </template>

           <div v-if="input.key === 'custom'" class="custom-fields-grid">
            <label class="custom-field">
              <span>禅道缺陷统计上限</span>
              <input v-model.number="customFields.zendaoBugLimit" type="number" min="1" />
            </label>

            <label class="custom-field">
              <span>质检结果</span>
              <input v-model="customFields.qualityResult" type="text" />
            </label>

            <label class="custom-field">
              <span>秘密级别</span>
              <input v-model="customFields.secrecyLevel" type="text" />
            </label>

            <label class="custom-field custom-field-span-2">
              <span>测试类型</span>
              <input v-model="customFields.testTypes" type="text" />
            </label>

            <label class="custom-field custom-field-span-2">
              <span>实际结果</span>
              <input v-model="customFields.actualResult" type="text" />
            </label>
          </div>
        </div>

        <button
          v-if="input.key !== 'custom' && input.key !== 'amind' && input.key !== 'excel'"
          class="report-source-toggle"
          type="button"
          @click="$emit('trigger-input', input.key)"
        >
          {{ input.actionLabel }}
        </button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { EMPTY_MODULE_LABEL } from "../types";
import GeneratorDropdown from "./GeneratorDropdown.vue";
import type {
  ReportAmindParseResult,
  ReportAmindSourceFile,
  ReportCustomFields,
  ReportExcelColumnMapping,
  ReportExcelParseResult,
  ReportExcelSourceFile,
  ReportInputItem,
  ReportInputKey,
} from "../types";

defineProps<{
  inputs: ReportInputItem[];
  customFields: ReportCustomFields;
  amindFiles: ReportAmindSourceFile[];
  amindParseResults: ReportAmindParseResult[];
  parsingAmind: boolean;
  excelFile: ReportExcelSourceFile | null;
  excelParseResult: ReportExcelParseResult | null;
  parsingExcel: boolean;
}>();

defineEmits<{
  "trigger-input": [inputKey: ReportInputKey];
  "remove-amind-file": [fileId: string];
  "update-amind-docx-file-type": [payload: { fileId: string; value: "xmind" | "amind" }];
  "remove-excel-file": [];
  "update-excel-sheet": [sheetName: string];
  "update-excel-column": [payload: { key: keyof ReportExcelColumnMapping; value: string }];
  "exclude-excel-module": [moduleName: string];
  "exclude-excel-owner": [ownerName: string];
  "toggle-excel-empty-module": [];
}>();
</script>

<style scoped lang="scss">
.report-sources-panel {
  padding: 22px;
}

.report-sources-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.report-sources-panel-kicker,
.report-sources-panel-note {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.1);
  color: #166534;
  font-size: 11px;
  font-weight: 700;
}

.report-sources-panel-head h3 {
  margin: 10px 0 0;
  color: #0f172a;
  font-size: 22px;
}

.report-sources-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-source-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 20px;
  background: #fafafa;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.report-source-card-main {
  min-width: 0;
}

.report-source-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.report-source-title-row h4 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
}

.report-source-tag {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
  font-size: 11px;
  font-weight: 700;
}

.report-source-tag-soft {
  background: rgba(34, 197, 94, 0.1);
  color: #166534;
}

.report-source-card p {
  margin: 8px 0 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.7;
}

.report-source-hint,
.report-source-status,
.report-source-selected {
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.7;
}

.report-source-selected {
  color: #0f172a;
  font-weight: 700;
}

.source-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.report-source-toggle {
  border: 1px solid rgba(15, 23, 42, 0.1);
  flex: 0 0 auto;
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

.report-source-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.report-source-toggle:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(15, 23, 42, 0.18);
  background: #f8fafc;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
}

.report-source-toggle-accent {
  border-color: #111827;
  background: #111827;
  color: #ffffff;
}

.report-source-toggle-accent:hover:not(:disabled) {
  background: #000000;
  border-color: #000000;
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.2);
}

.amind-file-list,
.amind-result-list,
.excel-file-list,
.excel-result-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.amind-file-item,
.amind-result-card,
.excel-file-item,
.excel-result-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  background: #ffffff;
  padding: 12px;
}

.amind-file-item,
.excel-file-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.amind-file-actions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.amind-file-format {
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  span {
    color: #334155;
    font-size: 11px;
    font-weight: 700;
  }
}

.amind-file-copy,
.amind-result-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.amind-file-copy {
  flex-direction: column;

  strong {
    color: #0f172a;
    font-size: 13px;
  }

  span {
    color: #64748b;
    font-size: 12px;
    line-height: 1.6;
    word-break: break-all;
  }
}

.amind-file-remove {
  border: 1px solid rgba(15, 23, 42, 0.12);
  min-height: 28px;
  padding: 0 10px;
  border-radius: 9px;
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

.amind-file-remove:hover {
  transform: translateY(-1px);
  border-color: rgba(15, 23, 42, 0.18);
  background: #f8fafc;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
}

.amind-result-head {
  h5 {
    margin: 0;
    color: #0f172a;
    font-size: 14px;
  }

  p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 12px;
  }
}

.amind-result-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.1);
  color: #166534;
  font-size: 11px;
  font-weight: 700;
}

.amind-result-badge.is-error {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
}

.amind-result-card.is-error {
  border-color: rgba(239, 68, 68, 0.24);
}

.excel-result-card.is-error {
  border-color: rgba(239, 68, 68, 0.24);
}

.amind-result-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  div {
    border-radius: 12px;
    background: #fafafa;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  span {
    color: #64748b;
    font-size: 11px;
  }

  strong {
    color: #0f172a;
    font-size: 16px;
  }
}

.excel-mapping-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.excel-mapping-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  span {
    color: #334155;
    font-size: 12px;
    font-weight: 700;
  }
}

.excel-overview-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  div {
    border-radius: 12px;
    background: #fafafa;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  span {
    color: #64748b;
    font-size: 11px;
  }

  strong {
    color: #0f172a;
    font-size: 16px;
  }
}

.excel-unique-group {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.excel-unique-block {
  border-radius: 12px;
  background: #fafafa;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  > span {
    color: #334155;
    font-size: 12px;
    font-weight: 700;
  }
}

.excel-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.excel-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #111827;
  font-size: 12px;
  font-weight: 700;
  border: none;
}

.excel-chip-removable {
  gap: 8px;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.excel-chip-removable:hover {
  transform: translateY(-1px);
  background: #e5e7eb;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
}

.excel-chip-muted {
  background: rgba(148, 163, 184, 0.14);
  color: #64748b;
}

.excel-preview-wrap {
  margin-top: 12px;
  overflow: auto;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
}

.excel-preview-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 540px;

  th,
  td {
    border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    border-right: 1px solid rgba(15, 23, 42, 0.08);
    padding: 10px 12px;
    text-align: left;
    vertical-align: top;
    font-size: 12px;
    line-height: 1.7;
    color: #0f172a;
    background: #ffffff;
  }

  th.excel-cell-requirement,
  td.excel-cell-requirement,
  th.excel-cell-owner,
  td.excel-cell-owner {
    border-left: 1px solid rgba(15, 23, 42, 0.08);
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #f8fafc;
    font-size: 11px;
    font-weight: 700;
    color: #475569;
  }

  th:last-child,
  td:last-child {
    border-right: none;
  }

  tr:last-child td {
    border-bottom: none;
  }
}

.amind-result-error {
  margin-top: 12px;
  color: #b91c1c;
  font-size: 12px;
  line-height: 1.7;
}

.custom-fields-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.custom-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.custom-field span {
  color: #334155;
  font-size: 12px;
  font-weight: 700;
}

.custom-field input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 10px;
  padding: 10px 12px;
  background: #ffffff;
  color: #0f172a;
  font-size: 13px;
  outline: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.custom-field input:focus {
  border-color: rgba(34, 197, 94, 0.45);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
}

.custom-field-span-2 {
  grid-column: 1 / -1;
}

@media (max-width: 720px) {
  .report-source-card {
    flex-direction: column;
  }

  .custom-fields-grid {
    grid-template-columns: 1fr;
  }

  .amind-result-grid,
  .excel-overview-grid,
  .excel-unique-group,
  .excel-mapping-grid {
    grid-template-columns: 1fr;
  }

  .custom-field-span-2 {
    grid-column: auto;
  }
}
</style>
