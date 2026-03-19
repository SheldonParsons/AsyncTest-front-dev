<template>
  <div class="ast-data-root" :class="{ 'ast-maximized': isMaximized }">
    <div class="ast-data-panel">
      <div v-if="!global" class="ast-tips-bar">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
        此处的数据将会在您运行用例时被覆盖到当前环境变量中（变量优先级：临时变量 &gt; 环境变量 &gt; 全局变量）
      </div>

      <div class="ast-toolbar">
        <div class="ast-toolbar-left">
          <motion.button class="ast-btn" :whilePress="{ scale: 0.93 }" @click="action_add_last_blank_row">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M21 9H3" /><path d="M21 15H3" />
            </svg>
            新增行
          </motion.button>
          <motion.button class="ast-btn" :whilePress="{ scale: 0.93 }" @click="action_add_col">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="M15 3v18" />
            </svg>
            新增列
          </motion.button>
          <SwitchComp v-if="global === false" ref="dependRef" @action="action_change_depends"
            :data="env?.depend === 1" />
        </div>

        <div class="ast-toolbar-center">
          <div class="ast-toolbar-meta">
            <span class="ast-meta-pill">{{ rowData.length }} 行</span>
            <span class="ast-meta-pill">{{ colDefs.length }} 列</span>
          </div>
        </div>

        <div class="ast-toolbar-right">
          <div class="ast-search-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <span class="ast-search-label">搜索</span>
            <input v-model="globalFilter" class="ast-search-input" placeholder="整张表的单元格内容" />
            <button v-if="globalFilter" class="ast-search-clear" @click="globalFilter = ''" tabindex="-1">✕</button>
          </div>
          <div class="ast-stats" v-if="globalFilter">
            {{ filteredRows.length }} / {{ rowData.length }} 行
          </div>
          <motion.div @click="toggleMaximize" class="ast-max-btn">
            <MaxBtn />
          </motion.div>
        </div>
      </div>

      <div class="ast-table-shell">
        <div class="ast-table-scroll" ref="scrollContainerRef">
          <table ref="tableRef" class="ast-table">
        <thead>
          <tr>
            <th class="ast-th ast-th-drag ast-sticky-left-0">
              <div class="ast-th-inner"></div>
            </th>
            <th
              v-for="(col, colIdx) in colDefs"
              :key="col.id"
              class="ast-th ast-th-data"
              :class="{ 'ast-sticky-left-32': colIdx === 0 }"
            >
              <ColHeader
                :col="col"
                :is-fixed="colIdx === 0"
                @rename="(name) => action_edit_col(col.id, col.name, name)"
                @batch-edit="action_batch_col(col, colIdx !== 0)"
                @delete-col="action_delete_col(col)"
              />
            </th>

            <th class="ast-th ast-th-actions ast-sticky-right">
              <div class="ast-th-inner ast-th-actions-label">操作</div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(tableRow, visibleIdx) in filteredRows"
            :key="tableRow.original.id"
            class="ast-tr"
            :class="{
              'ast-tr--drag-over': dragState !== null && dragState.targetIdx === visibleIdx && dragState.sourceIdx !== visibleIdx,
              'ast-tr--dragging': dragState !== null && dragState.sourceIdx === visibleIdx,
            }"
            @dragover.prevent="onDragOver(visibleIdx)"
            @drop.prevent="onDrop(visibleIdx)"
          >
            <td
              class="ast-td ast-td-drag ast-sticky-left-0"
              :draggable="!isDragDisabled"
              @dragstart="onDragStart(visibleIdx, $event)"
              @dragend="onDragEnd"
            >
              <div class="ast-drag-handle" :class="{
                'ast-drag-handle--active': dragState?.sourceIdx === visibleIdx,
                'ast-drag-handle--disabled': isDragDisabled,
              }">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                  fill="currentColor">
                  <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                  <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                  <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                </svg>
              </div>
            </td>

            <td
              v-for="(col, colIdx) in colDefs"
              :key="col.id"
              class="ast-td ast-td-cell"
              :class="{ 'ast-sticky-left-32': colIdx === 0, 'ast-td-first': colIdx === 0 }"
              :data-cell="`${visibleIdx}-${colIdx}`"
            >
              <TableCell
                :value="tableRow.original[col.name]"
                :single-line="colIdx === 0"
                :env-name="env?.name"
                @update="(newVal) => handleCellUpdate(tableRow, col.name, newVal)"
                @tab="(e) => handleCellTab(visibleIdx, colIdx, e)"
                @enter="(e) => handleCellEnter(visibleIdx, colIdx, e)"
              />
            </td>

            <td class="ast-td ast-td-actions ast-sticky-right">
              <div class="ast-row-actions">
                <ActionGroup
                  :group="['addSiblingStep', 'copy', 'batchEdit', 'delete']"
                  :actionDesc="{
                    addSiblingStep: '在此行后插入空行',
                    copy: '复制此行',
                    batchEdit: '批量编辑此行',
                    delete: '删除此行',
                  }"
                  itemBackgroundColor="transparent"
                  itemColor="#555"
                  @action="(a) => handleRowAction(a, tableRow, visibleIdx)"
                />
              </div>
            </td>
          </tr>

        </tbody>
          </table>

          <div v-if="filteredRows.length === 0" class="ast-empty-overlay">
            <div class="ast-empty">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke="#ccc" stroke-width="1.5">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M21 9H3"/><path d="M21 15H3"/>
              </svg>
              <span>{{ globalFilter ? '未找到匹配的数据' : '暂无数据，点击「新增行」添加' }}</span>
            </div>
          </div>
        </div>

        <div class="ast-footer">
          <span>共 {{ rowData.length }} 行 · {{ colDefs.length }} 列</span>
          <span class="ast-footer-hint">Tab 切换单元格；Enter 切换到下一行；Alt/Option + Enter 在单元格内换行；Esc 撤销当前输入</span>
        </div>

        <div
          ref="horizontalScrollbarRef"
          v-show="scrollMetrics.showHorizontal"
          class="ast-scrollbar ast-scrollbar-x"
          @mousedown="onScrollbarTrackMouseDown('horizontal', $event)"
        >
          <div
            class="ast-scrollbar-thumb"
            :class="{ 'ast-scrollbar-thumb--dragging': scrollbarDrag?.axis === 'horizontal' }"
            :style="{ width: `${scrollMetrics.horizontalThumbSize}px`, transform: `translateX(${scrollMetrics.horizontalThumbOffset}px)` }"
            @mousedown.stop="startScrollbarDrag('horizontal', $event)"
          />
        </div>

        <div
          ref="verticalScrollbarRef"
          v-show="scrollMetrics.showVertical"
          class="ast-scrollbar ast-scrollbar-y"
          @mousedown="onScrollbarTrackMouseDown('vertical', $event)"
        >
          <div
            class="ast-scrollbar-thumb"
            :class="{ 'ast-scrollbar-thumb--dragging': scrollbarDrag?.axis === 'vertical' }"
            :style="{ height: `${scrollMetrics.verticalThumbSize}px`, transform: `translateY(${scrollMetrics.verticalThumbOffset}px)` }"
            @mousedown.stop="startScrollbarDrag('vertical', $event)"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Dialogs -->
  <AddColDialog title="创建列数据" ref="addColDialogRef" :cols="colDefs" confirm_title="创建" :valid="api_create_col" />
  <EditColDialog title="批量编辑此列" ref="editColDialogRef" :can_change="canChangeColInfo" :cols="colDefs"
    :rows="rowData" :col="current_col" confirm_title="编辑" :valid="api_edit_col" />
  <EditRowDialog title="批量编辑此行" ref="editRowDialogRef" confirm_title="编辑" :cols="colDefs" :valid="api_edit_row" />
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, nextTick, watch } from 'vue'
import { motion } from 'motion-v'
import {
  useVueTable,
  getCoreRowModel,
  type ColumnDef,
} from '@tanstack/vue-table'
import _ from 'lodash'

import MaxBtn from '@/components/common/mini_btn/max.vue'
import ActionGroup from '@/views/case/content/case_content/runner/tree/components/action_group.vue'
import SwitchComp from '@/views/case/content/case_content/data/comp/switch_animation.vue'
import TableCell from '@/views/case/content/case_content/data/comp/TableCell.vue'
import ColHeader from '@/views/case/content/case_content/data/comp/ColHeader.vue'
import AddColDialog from '@/views/case/components/input_dialog.vue'
import EditColDialog from '@/views/case/components/edit_col_dialog.vue'
import EditRowDialog from '@/views/case/components/edit_row_dialog.vue'
import { send_action } from '@/views/case/utils'

// ─── Props & Emits ────────────────────────────────────────────────────────────
const props = defineProps({
  env: { type: null },
  data: { type: null },
  dataset: { type: null },
  global: { type: null, default: false },
  can_edit: { type: Boolean, default: true },
})
const emit = defineEmits(['change_depend'])

// ─── Dialog refs ──────────────────────────────────────────────────────────────
const addColDialogRef = ref<any>(null)
const editColDialogRef = ref<any>(null)
const editRowDialogRef = ref<any>(null)
const dependRef = ref<any>(null)
const scrollContainerRef = ref<HTMLDivElement>()
const tableRef = ref<HTMLTableElement>()
const horizontalScrollbarRef = ref<HTMLDivElement>()
const verticalScrollbarRef = ref<HTMLDivElement>()

// ─── State ────────────────────────────────────────────────────────────────────
const rowData = ref<any[]>([])
const colDefs = ref<any[]>([])
const globalFilter = ref('')
const isMaximized = ref(false)
const current_col = ref<any>(null)
const current_row = ref<any>(null)
const canChangeColInfo = ref(true)
const create_col_data = ref<any>(null)
const isDragDisabled = computed(() => globalFilter.value.trim().length > 0)
const scrollMetrics = ref({
  showHorizontal: false,
  showVertical: false,
  horizontalThumbSize: 40,
  horizontalThumbOffset: 0,
  verticalThumbSize: 40,
  verticalThumbOffset: 0,
})
const scrollbarDrag = ref<null | {
  axis: 'horizontal' | 'vertical'
  startClient: number
  startOffset: number
}>(null)
let resizeObserver: ResizeObserver | null = null

// ─── TanStack Table ───────────────────────────────────────────────────────────
const tanColumns = computed<ColumnDef<any>[]>(() =>
  colDefs.value.map((col: any) => ({
    id: col.name,
    accessorKey: col.name,
  }))
)

const table = useVueTable({
  get data() { return rowData.value },
  get columns() { return tanColumns.value },
  getCoreRowModel: getCoreRowModel(),
})

const normalizedSearch = computed(() => globalFilter.value.trim().toLowerCase())
const filteredRows = computed(() => {
  const search = normalizedSearch.value
  const rows = rowData.value.map((row: any) => ({ original: row }))
  if (!search) return rows
  return rows.filter((wrapped: any) =>
    colDefs.value.some((col: any) =>
      String(wrapped.original[col.name]?.data ?? '').toLowerCase().includes(search)
    )
  )
})

// ─── Initialise table from props ──────────────────────────────────────────────
onMounted(() => {
  const tempCols: any[] = []
  for (let i = 0; i < props.data.cols.length; i++) {
    tempCols.push({
      id: props.data.cols[i].id,
      name: props.data.cols[i].name,
      desc: props.data.cols[i].desc,
    })
  }
  colDefs.value = tempCols
  rowData.value = _.cloneDeep(props.data.rows)
  nextTick(() => {
    setupScrollSystem()
    updateScrollMetrics()
  })
})

onBeforeUnmount(() => {
  teardownScrollSystem()
})

watch(
  [
    () => rowData.value.length,
    () => colDefs.value.length,
    () => filteredRows.value.length,
    () => isMaximized.value,
    () => globalFilter.value,
  ],
  () => nextTick(updateScrollMetrics)
)

// ─── Permission wrapper ───────────────────────────────────────────────────────
async function guarded(fn: () => Promise<any>) {
  if (!props.can_edit) {
    window.$toast({ title: '您无权修改' })
    return false
  }
  return await fn()
}

// ─── Maximize ─────────────────────────────────────────────────────────────────
function toggleMaximize() {
  isMaximized.value = !isMaximized.value
  nextTick(updateScrollMetrics)
}

// ─── Keyboard navigation ──────────────────────────────────────────────────────
function focusCellAt(rowIdx: number, colIdx: number) {
  const el = scrollContainerRef.value?.querySelector(
    `[data-cell="${rowIdx}-${colIdx}"] textarea`
  ) as HTMLElement | null
  el?.focus()
}

function handleCellTab(rowIdx: number, colIdx: number, e: KeyboardEvent) {
  const totalCols = colDefs.value.length
  let nr = rowIdx, nc = colIdx + (e.shiftKey ? -1 : 1)
  if (nc >= totalCols) { nc = 0; nr++ }
  else if (nc < 0) { nc = totalCols - 1; nr-- }
  if (nr >= 0 && nr < filteredRows.value.length) focusCellAt(nr, nc)
}

function handleCellEnter(rowIdx: number, colIdx: number, e: KeyboardEvent) {
  const nr = rowIdx + (e.shiftKey ? -1 : 1)
  if (nr >= 0 && nr < filteredRows.value.length) focusCellAt(nr, colIdx)
}

// ─── Cell edit ────────────────────────────────────────────────────────────────
async function handleCellUpdate(tableRow: any, colName: string, newVal: { id: number; data: string }) {
  // Optimistic update already applied by the cell component (v-model local)
  // We just sync the source object
  tableRow.original[colName] = newVal
  await guarded(async () => {
    const result = await send_action({
      type: 1,
      child_action_type: 'edit_cell',
      content: {
        table_id: props.env.table_id,
        cell_id: newVal.id,
        value: newVal.data,
      },
    })
    if (!result) return
    window.$toast({ title: '已保存。' })
  })
}

// ─── Row CRUD ─────────────────────────────────────────────────────────────────
function buildRowFromResult(data: any): any {
  const newRow: any = { id: data.row_id }
  for (const cell of data.cells) {
    newRow[cell.column] = { id: cell.id, data: cell.value }
  }
  return newRow
}

async function action_add_last_blank_row() {
  await guarded(async () => {
    const result = await send_action({
      type: 1, child_action_type: 'add_row',
      content: { table_id: props.env.table_id, index: -1, t: 'blank' },
    })
    if (!result) return
    rowData.value.push(buildRowFromResult(result))
    window.$toast({ title: '已添加行。' })
  })
}

async function addRowAt(index: number, sourceRowId: number, t: 'blank' | 'copy') {
  await guarded(async () => {
    const result = await send_action({
      type: 1, child_action_type: 'add_row',
      content: { table_id: props.env.table_id, index: sourceRowId, t },
    })
    if (!result) return
    rowData.value.splice(index, 0, buildRowFromResult(result))
    window.$toast({ title: t === 'copy' ? '已复制行。' : '已添加行。' })
  })
}

async function action_delete_row(tableRow: any, visibleIdx: number) {
  await guarded(async () => {
    const result = await send_action({
      type: 1, child_action_type: 'delete_row',
      content: { table_id: props.env.table_id, row_id: tableRow.original.id },
    })
    if (!result) return
    // Remove from rowData by id
    const idx = rowData.value.findIndex((r: any) => r.id === tableRow.original.id)
    if (idx !== -1) rowData.value.splice(idx, 1)
    window.$toast({ title: '已删除行。' })
  })
}

async function action_edit_row(tableRow: any) {
  const row = tableRow.original
  // Exclude the action column (last colDef); collect all data columns
  const current_row_data = colDefs.value.map((col: any) => row[col.name]?.data ?? '')
  editRowDialogRef.value.init(current_row_data.join('\n\n'))
  current_row.value = row
  const result = await editRowDialogRef.value.open()
  if (result?.action !== 'save') return

  // Apply to local data
  colDefs.value.forEach((col: any, i: number) => {
    row[col.name] = { ...row[col.name], data: result.data[i] ?? '' }
  })
  window.$toast({ title: '已批量编辑行。' })
}

async function api_edit_row(data: any) {
  return await guarded(async () => {
    const result = await send_action({
      type: 1, child_action_type: 'batch_edit_row',
      content: { table_id: props.env.table_id, row_id: current_row.value.id, data },
    })
    return !!result
  })
}

function handleRowAction(action: string, tableRow: any, visibleIdx: number) {
  const row = tableRow.original
  // Find actual index in rowData
  const actualIdx = rowData.value.findIndex((r: any) => r.id === row.id)
  if (action === 'addSiblingStep') addRowAt(actualIdx + 1, row.id, 'blank')
  else if (action === 'copy') addRowAt(actualIdx + 1, row.id, 'copy')
  else if (action === 'delete') action_delete_row(tableRow, visibleIdx)
  else if (action === 'batchEdit') action_edit_row(tableRow)
}

// ─── Column CRUD ──────────────────────────────────────────────────────────────
async function action_edit_col(colId: number, oldName: string, newName: string) {
  await guarded(async () => {
    const result = await send_action({
      type: 1, child_action_type: 'change_col_name',
      content: { table_id: props.env.table_id, col_id: colId, new_col_name: newName },
    })
    if (!result) return false
    // Update colDef
    const col = colDefs.value.find((c: any) => c.id === colId)
    if (col) col.name = newName
    // Rename key in all rows
    rowData.value.forEach((row: any) => {
      if (oldName !== newName && row[oldName] !== undefined) {
        row[newName] = row[oldName]
        delete row[oldName]
      }
    })
    window.$toast({ title: '列名已更新。' })
  })
}

async function action_batch_col(col: any, canChangeInfo: boolean) {
  canChangeColInfo.value = canChangeInfo
  current_col.value = col
  const current_col_data = rowData.value.map((row: any) => row[col.name]?.data ?? '')
  editColDialogRef.value.init(col, current_col_data.join('\n\n'))
  const result = await editColDialogRef.value.open()
  if (!result || result.action === 'pass') { current_col.value = null; return }

  const { value_list, new_col_name, new_col_desc } = result
  const oldField = col.name
  const newField = new_col_name

  // Update colDef
  const targetCol = colDefs.value.find((c: any) => c.id === col.id)
  if (targetCol) {
    targetCol.name = newField
    targetCol.desc = new_col_desc
  }
  // Update rows
  rowData.value.forEach((row: any, i: number) => {
    row[newField] = {
      id: row[oldField]?.id,
      data: value_list?.[i] !== undefined ? value_list[i] : '',
    }
    if (oldField !== newField) delete row[oldField]
  })
  current_col.value = null
  window.$toast({ title: '批量编辑完成。' })
}

async function api_edit_col(data: any, name: string, desc: string) {
  return await guarded(async () => {
    const result = await send_action({
      type: 1, child_action_type: 'batch_edit_col',
      content: {
        table_id: props.env.table_id,
        col_id: current_col.value.id,
        data, new_col_name: name, new_col_desc: desc,
      },
    })
    return !!result
  })
}

async function action_add_col() {
  const result = await addColDialogRef.value.open()
  const newCols = result?.data
  if (!Array.isArray(newCols) || newCols.length === 0) return

  create_col_data.value.forEach((item: any) => {
    colDefs.value.push({ id: item.col.id, name: item.col.name, desc: item.col.desc })
    rowData.value.forEach((row: any, i: number) => {
      row[item.col.name] = { id: item.cells[i]?.id, data: item.cells[i]?.value ?? '' }
    })
  })
  window.$toast({ title: '已添加列。' })
}

async function api_create_col(data: any) {
  return await guarded(async () => {
    const result = await send_action({
      type: 1, child_action_type: 'add_columns',
      content: { table_id: props.env.table_id, columns: data },
    })
    if (!result) return false
    create_col_data.value = result
    return true
  })
}

async function action_delete_col(col: any) {
  await guarded(async () => {
    const result = await send_action({
      type: 1, child_action_type: 'delete_col',
      content: { table_id: props.env.table_id, col_id: col.id },
    })
    if (!result) return
    colDefs.value = colDefs.value.filter((c: any) => c.id !== col.id)
    rowData.value.forEach((row: any) => { delete row[col.name] })
    window.$toast({ title: '已删除列。' })
  })
}

// ─── Depend switch ────────────────────────────────────────────────────────────
async function action_change_depends(checked: boolean) {
  await guarded(async () => {
    const result = await send_action({
      type: 1, child_action_type: 'switch_depend',
      content: { table_id: props.env.table_id },
    })
    if (!result) { dependRef.value?.toggle(); return }
    emit('change_depend')
    window.$toast({ title: checked ? '已启用：独立数据源' : '已禁用：跟随默认数据', type: checked ? 'success' : 'info' })
  })
}

// ─── Drag & Drop row reorder ──────────────────────────────────────────────────
const dragState = ref<{ sourceIdx: number; targetIdx: number } | null>(null)

function onDragStart(visibleIdx: number, e: DragEvent) {
  // Disable drag when filtered (would corrupt order)
  if (globalFilter.value) { e.preventDefault(); return }
  dragState.value = { sourceIdx: visibleIdx, targetIdx: visibleIdx }
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', String(visibleIdx))
}

function onDragOver(visibleIdx: number) {
  if (!dragState.value) return
  dragState.value.targetIdx = visibleIdx
}

async function onDrop(visibleIdx: number) {
  if (!dragState.value) return
  const { sourceIdx } = dragState.value
  const targetIdx = visibleIdx
  dragState.value = null
  if (sourceIdx === targetIdx) return

  const nextRows = [...rowData.value]
  const movedRow = nextRows.splice(sourceIdx, 1)[0]
  nextRows.splice(targetIdx, 0, movedRow)
  rowData.value = nextRows

  await guarded(async () => {
    const result = await send_action({
      type: 1, child_action_type: 'switch_position',
      content: { table_id: props.env.table_id, row_id: movedRow.id, target_index: targetIdx },
    })
    if (!result) {
      const rollbackRows = [...rowData.value]
      rollbackRows.splice(targetIdx, 1)
      rollbackRows.splice(sourceIdx, 0, movedRow)
      rowData.value = rollbackRows
    } else {
      window.$toast({ title: '已更新位置。' })
    }
  })
}

function onDragEnd() {
  dragState.value = null
}

function setupScrollSystem() {
  const container = scrollContainerRef.value
  if (!container) return

  container.addEventListener('scroll', updateScrollMetrics, { passive: true })
  container.addEventListener('wheel', handleContainerWheel, { passive: false })
  window.addEventListener('mousemove', handleScrollbarDrag)
  window.addEventListener('mouseup', stopScrollbarDrag)

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => updateScrollMetrics())
    resizeObserver.observe(container)
    if (tableRef.value) {
      resizeObserver.observe(tableRef.value)
    }
  }
}

function teardownScrollSystem() {
  const container = scrollContainerRef.value
  if (container) {
    container.removeEventListener('scroll', updateScrollMetrics)
    container.removeEventListener('wheel', handleContainerWheel as EventListener)
  }
  window.removeEventListener('mousemove', handleScrollbarDrag)
  window.removeEventListener('mouseup', stopScrollbarDrag)
  resizeObserver?.disconnect()
  resizeObserver = null
}

function updateScrollMetrics() {
  const container = scrollContainerRef.value
  if (!container) return

  const horizontalOverflow = Math.max(container.scrollWidth - container.clientWidth, 0)
  const verticalOverflow = Math.max(container.scrollHeight - container.clientHeight, 0)
  const showHorizontal = horizontalOverflow > 1
  const showVertical = verticalOverflow > 1

  const horizontalTrackSize = horizontalScrollbarRef.value?.clientWidth ?? Math.max(container.clientWidth - (showVertical ? 12 : 0), 0)
  const verticalTrackSize = verticalScrollbarRef.value?.clientHeight ?? Math.max(container.clientHeight - (showHorizontal ? 12 : 0), 0)

  const horizontalThumbSize = showHorizontal
    ? Math.max((container.clientWidth / container.scrollWidth) * horizontalTrackSize, 44)
    : horizontalTrackSize
  const verticalThumbSize = showVertical
    ? Math.max((container.clientHeight / container.scrollHeight) * verticalTrackSize, 44)
    : verticalTrackSize

  const horizontalThumbOffset = showHorizontal && horizontalOverflow > 0
    ? ((container.scrollLeft / horizontalOverflow) * (horizontalTrackSize - horizontalThumbSize))
    : 0
  const verticalThumbOffset = showVertical && verticalOverflow > 0
    ? ((container.scrollTop / verticalOverflow) * (verticalTrackSize - verticalThumbSize))
    : 0

  scrollMetrics.value = {
    showHorizontal,
    showVertical,
    horizontalThumbSize,
    horizontalThumbOffset,
    verticalThumbSize,
    verticalThumbOffset,
  }
}

function handleContainerWheel(e: WheelEvent) {
  const container = scrollContainerRef.value
  if (!container || e.ctrlKey) return
  const canScrollX = container.scrollWidth > container.clientWidth + 1
  const canScrollY = container.scrollHeight > container.clientHeight + 1
  if (!canScrollX && !canScrollY) return

  e.preventDefault()
  if (canScrollX) {
    container.scrollLeft += e.deltaX
  }
  if (canScrollY) {
    container.scrollTop += e.deltaY
  }
  updateScrollMetrics()
}

function onScrollbarTrackMouseDown(axis: 'horizontal' | 'vertical', e: MouseEvent) {
  syncScrollFromTrack(axis, e)
}

function startScrollbarDrag(axis: 'horizontal' | 'vertical', e: MouseEvent) {
  scrollbarDrag.value = {
    axis,
    startClient: axis === 'horizontal' ? e.clientX : e.clientY,
    startOffset: axis === 'horizontal'
      ? scrollMetrics.value.horizontalThumbOffset
      : scrollMetrics.value.verticalThumbOffset,
  }
}

function handleScrollbarDrag(e: MouseEvent) {
  if (!scrollbarDrag.value) return
  const container = scrollContainerRef.value
  if (!container) return

  if (scrollbarDrag.value.axis === 'horizontal') {
    const trackSize = horizontalScrollbarRef.value?.clientWidth ?? container.clientWidth
    const maxThumbOffset = Math.max(trackSize - scrollMetrics.value.horizontalThumbSize, 1)
    const nextOffset = clamp(
      scrollbarDrag.value.startOffset + (e.clientX - scrollbarDrag.value.startClient),
      0,
      maxThumbOffset,
    )
    container.scrollLeft = (nextOffset / maxThumbOffset) * (container.scrollWidth - container.clientWidth)
  } else {
    const trackSize = verticalScrollbarRef.value?.clientHeight ?? container.clientHeight
    const maxThumbOffset = Math.max(trackSize - scrollMetrics.value.verticalThumbSize, 1)
    const nextOffset = clamp(
      scrollbarDrag.value.startOffset + (e.clientY - scrollbarDrag.value.startClient),
      0,
      maxThumbOffset,
    )
    container.scrollTop = (nextOffset / maxThumbOffset) * (container.scrollHeight - container.clientHeight)
  }

  updateScrollMetrics()
}

function stopScrollbarDrag() {
  scrollbarDrag.value = null
}

function syncScrollFromTrack(axis: 'horizontal' | 'vertical', e: MouseEvent) {
  const container = scrollContainerRef.value
  if (!container) return
  const track = e.currentTarget as HTMLDivElement | null
  if (!track) return

  const rect = track.getBoundingClientRect()
  if (axis === 'horizontal') {
    const trackSize = rect.width
    const maxThumbOffset = Math.max(trackSize - scrollMetrics.value.horizontalThumbSize, 1)
    const pointer = clamp(e.clientX - rect.left - scrollMetrics.value.horizontalThumbSize / 2, 0, maxThumbOffset)
    container.scrollLeft = (pointer / maxThumbOffset) * (container.scrollWidth - container.clientWidth)
  } else {
    const trackSize = rect.height
    const maxThumbOffset = Math.max(trackSize - scrollMetrics.value.verticalThumbSize, 1)
    const pointer = clamp(e.clientY - rect.top - scrollMetrics.value.verticalThumbSize / 2, 0, maxThumbOffset)
    container.scrollTop = (pointer / maxThumbOffset) * (container.scrollHeight - container.clientHeight)
  }

  updateScrollMetrics()
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
</script>

<style lang="scss">
.ast-data-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 28%),
    linear-gradient(180deg, #f8fafc 0%, #f3f6fb 100%);
  font-size: 13px;
  color: #0f172a;
}

.ast-data-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  height: 100%;
  padding: 10px;
}

.ast-maximized {
  position: fixed !important;
  inset: 0;
  z-index: 1200;
  background:
    radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 28%),
    linear-gradient(180deg, #f8fafc 0%, #f3f6fb 100%);
}

.ast-tips-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(14px);
  font-size: 12px;
  line-height: 1.6;
  color: #475569;
}

.ast-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(16px);
}

.ast-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ast-toolbar-center {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: flex-start;
}

.ast-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ast-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 9px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
  color: #334155;
  cursor: pointer;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;

  &:hover {
    background: #ffffff;
    border-color: rgba(99, 102, 241, 0.28);
    box-shadow: 0 10px 22px rgba(99, 102, 241, 0.10);
    transform: translateY(-1px);
  }
}

.ast-toolbar-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ast-meta-pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(241, 245, 249, 0.9);
  color: #475569;
  font-size: 12px;
  white-space: nowrap;
}

.ast-meta-pill--warning {
  color: #9a3412;
  background: rgba(255, 237, 213, 0.92);
  border-color: rgba(251, 146, 60, 0.28);
}

.ast-search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 196px;
  max-width: 380px;
  min-height: 28px;
  padding: 2px 7px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 9px;
  background: rgba(248, 250, 252, 0.95);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  color: #94a3b8;

  &:focus-within {
    border-color: rgba(99, 102, 241, 0.45);
    background: #fff;
    color: #334155;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08);
  }
}

.ast-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: #334155;
  font-size: 12px;

  &::placeholder {
    color: #94a3b8;
  }
}

.ast-search-label {
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.ast-search-clear {
  border: none;
  background: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  padding: 0;

  &:hover {
    color: #334155;
  }
}

.ast-stats {
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
}

.ast-max-btn {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.ast-table-shell {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow:
    0 18px 42px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.ast-table-scroll {
  position: relative;
  flex: 1;
  overflow: auto;
  overscroll-behavior: none;
  overscroll-behavior-x: none;
  overscroll-behavior-y: none;
  scrollbar-width: none;
  touch-action: pan-x pan-y;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.85) 0%, rgba(255, 255, 255, 0.92) 100%);
  clip-path: inset(0 round 10px);

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  &::-webkit-scrollbar-thumb {
    background: transparent;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.ast-table {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: auto;
  color: #0f172a;
}

.ast-sticky-left-0 {
  position: sticky;
  left: 0;
  z-index: 4;
}

.ast-sticky-left-32 {
  position: sticky;
  left: 32px;
  z-index: 4;
}

.ast-sticky-right {
  position: sticky;
  right: 0;
  z-index: 4;
}

thead tr {
  position: sticky;
  top: 0;
  z-index: 10;
}

.ast-th {
  padding: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.14);
  border-bottom: 1px solid rgba(255, 255, 255, 0.10);
  background: linear-gradient(180deg, #18212f 0%, #111827 100%);
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.04);
  color: white;
  white-space: nowrap;
  user-select: none;
  z-index: 5;
}

.ast-th-inner {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 10px;
}

.ast-th-drag {
  width: 32px;
  min-width: 32px;
  max-width: 32px;
}

.ast-th-data {
  min-width: 220px;
}

.ast-th-actions {
  width: 110px;
  min-width: 110px;
  max-width: 110px;
  background: linear-gradient(180deg, #18212f 0%, #111827 100%);
}

.ast-th-actions-label {
  justify-content: center;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 500;
}

.ast-tr {
  background: transparent;
  transition: background 0.15s ease;

  &:hover .ast-td {
    background: #f8fbff;
  }

  &:hover .ast-sticky-left-0,
  &:hover .ast-sticky-left-32,
  &:hover .ast-sticky-right {
    background: #f8fbff;
  }
}

.ast-tr--drag-over .ast-td {
  border-top: 2px solid #6366f1 !important;
  box-shadow: inset 0 2px 0 rgba(99, 102, 241, 0.08);
}

.ast-tr--dragging .ast-td {
  opacity: 0.45;
}

.ast-td {
  min-height: 48px;
  height: 48px;
  max-height: 140px;
  padding: 0;
  border-right: 1px solid rgba(226, 232, 240, 0.9);
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.92);
  vertical-align: middle;
}

.ast-td-first {
  background: rgba(248, 250, 252, 0.98);
}

.ast-tr:hover .ast-td-first {
  background: #eef5ff;
}

.ast-td-drag {
  width: 32px;
  min-width: 32px;
  max-width: 32px;
}

.ast-td-cell {
  min-width: 220px;
  height: auto;
}

.ast-td-actions {
  width: 110px;
  min-width: 110px;
  max-width: 110px;
  background: rgba(255, 255, 255, 0.98);
}

.ast-tr:hover .ast-td-actions {
  background: #f8fbff;
}

.ast-drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 48px;
  color: #94a3b8;
  cursor: grab;
  transition: color 0.15s ease, opacity 0.15s ease;

  &:hover {
    color: #475569;
  }

  &--active {
    cursor: grabbing;
    color: #6366f1;
  }

  &--disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }
}

.ast-row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 6px;
}

.ast-empty-overlay {
  position: absolute;
  inset: 49px 0 0 0;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  background: rgba(255, 255, 255, 0.96);
}

.ast-empty {
  display: flex;
  flex-direction: column;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 100%;
  padding: 24px 20px;
  color: #94a3b8;
  font-size: 13px;
}

.ast-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
  border-top: 1px solid rgba(226, 232, 240, 0.85);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.92) 0%, rgba(255, 255, 255, 0.96) 100%);
  color: #64748b;
  font-size: 11px;
}

.ast-footer-hint {
  color: #94a3b8;
}

.ast-scrollbar {
  position: absolute;
  z-index: 30;
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(226, 232, 240, 0.52);
  border-radius: 999px;
  user-select: none;
  backdrop-filter: blur(8px);
}

.ast-scrollbar-x {
  left: 0;
  right: 0;
  bottom: 0;
  height: 8px;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
}

.ast-scrollbar-y {
  top: 0;
  right: 0;
  bottom: 0;
  width: 8px;
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
}

.ast-scrollbar-thumb {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.30) 0%, rgba(100, 116, 139, 0.42) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
  cursor: pointer;
}

.ast-scrollbar-x .ast-scrollbar-thumb {
  width: 44px;
  height: 100%;
}

.ast-scrollbar-y .ast-scrollbar-thumb {
  width: 100%;
  height: 44px;
}

.ast-scrollbar-thumb--dragging {
  background: linear-gradient(180deg, rgba(100, 116, 139, 0.48) 0%, rgba(71, 85, 105, 0.58) 100%);
}

.ast-sticky-left-0,
.ast-sticky-left-32,
.ast-sticky-right {
  background-clip: padding-box;
}

.ast-th.ast-sticky-left-32,
.ast-td.ast-sticky-left-32 {
  box-shadow:
    8px 0 16px -16px rgba(15, 23, 42, 0.25),
    inset -1px 0 0 rgba(255, 255, 255, 0.14);
}

.ast-th.ast-sticky-right,
.ast-td.ast-sticky-right {
  box-shadow:
    -8px 0 16px -16px rgba(15, 23, 42, 0.25),
    inset 1px 0 0 rgba(226, 232, 240, 0.95);
}

@media (max-width: 1200px) {
  .ast-toolbar {
    flex-wrap: wrap;
  }

  .ast-toolbar-center {
    order: 3;
    flex-basis: 100%;
  }

  .ast-toolbar-right {
    margin-left: auto;
  }
}
</style>
