<template>
    <div class="case-table-contaniner">
        <ag-grid-vue v-show="show_table" style="width:100%; height:100%;" :columnDefs="columnDefs" :defaultColDef="defaultColDef"
            :gridOptions="gridOptions" @grid-ready="onGridReady" class="ag-theme-quartz" />
    </div>

    <DialogAnimation ref="taskDetailRef" title="任务整体日志" confirm_title="关闭" :bgtype="'white'" :topMove="'0% !important'"
        :showCancel="false">
        <div style="height: 500px;width: 900px;">
            <ProcessRecord :callback="child_case_process_record" :interface_callback="interface_detail_record"
                :check_ending="stopRecordChecking" :wating="true">
            </ProcessRecord>
        </div>
    </DialogAnimation>
</template>

<script lang="ts" setup>

import { ref, onMounted, onUnmounted } from 'vue'
import tools from '@/utils/tools'
import { ApiGetRecordList } from '@/api/case/case/index'
import { PollingUtil } from '@/views/case/record/utils/PollingUtil'
import { AgGridVue } from 'ag-grid-vue3'
import RolFix from '@/views/case/record/comp/table_comp/col_fix_header.vue'
import CounterCell from '@/views/case/record/comp/table_comp/counter_cell.vue'
import StatusCell from '@/views/case/record/comp/table_comp/status.vue'
import WasteTimeCell from '@/views/case/record/comp/table_comp/waste_time_cell.vue'
import ActionCell from '@/views/case/record/comp/table_comp/action_cell.vue'
import { ModuleRegistry, AllCommunityModule, Theme, themeQuartz } from 'ag-grid-community';
import { AG_GRID_LOCALE_CN } from '@ag-grid-community/locale';
import type { GridReadyEvent, CellValueChangedEvent, RowDragEndEvent, ColDef } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { StatusMapping } from '@/views/case/record/utils/constant';
import DialogAnimation from '@/components/common/general/dialog.vue'
import ProcessRecord from '@/views/case/record/comp/process_record.vue'
ModuleRegistry.registerModules([AllCommunityModule]);
const poller: any = ref(null)
const columnDefs: any = ref([])
const gridApi = ref<any>(null)
const taskDetailRef: any = ref(null)
const current_child_case_index = ref(-1)
const show_table = ref(false)
const col_defination = [
    {
        field: 'index_in_global_list',
        name: '次序'
    },
    {
        field: 'desc',
        name: '标识'
    },
    {
        field: 'case_name',
        name: '所属用例'
    },
    {
        field: 'done_step_count',
        name: '完成步骤'
    },
    {
        field: 'skipped_step_count',
        name: '跳过步骤'
    },
    {
        field: 'failed_step_count',
        name: '失败步骤'
    },
    {
        field: 'end',
        name: '耗时'
    },
    {
        field: 'status',
        name: '状态'
    },
    {
        field: 'action',
        name: '操作'
    }
]
defineExpose({
    RolFix,
    CounterCell,
    StatusCell,
    WasteTimeCell,
    ActionCell
})

const emit = defineEmits(['action'])
const defaultColDef: ColDef = {
    filter: true,
    editable: false,
    resizable: false,
    sortable: false,
}
const gridOptions = {
    rowDragManaged: true,
    localeText: AG_GRID_LOCALE_CN,
    animateRows: true,
    suppressMovableColumns: true,
    suppressHeaderKeyboardEvent: true,
    getRowId: (params: any) => {
        return params.data.index_in_global_list;
    }
}

onMounted(async () => {
    for (let i = 0; i < col_defination.length; i++) {
        const field = col_defination[i].field;
        const renderer = getCellRendererConfig(field);
        const filterType = getFilterConfig(field);
        columnDefs.value.push({
            filter: filterType,
            field: col_defination[i].field,
            headerName: col_defination[i].name,
            headerComponent: "RolFix",
            filterValueGetter: (params: any) => filter_controller(params, field),
            cellRenderer: renderer,
            ...getWidthFlexConfig(field),
            cellRendererParams: {
                show_case_table_record: show_case_table_record,
                to_step_page: to_step_page
            }
        })
    }
    await get_record()
})

onUnmounted(() => {
    if (poller.value) {
        poller.value.stop()
    }
})

async function show_case_table_record(index: number) {
    current_child_case_index.value = index
    await taskDetailRef.value.open()
}

async function to_step_page(index: number, case_id: number) {
    emit('action', index, case_id)
}

async function child_case_process_record(current_index: Number) {
    const _data = {
        type: "child_case_record_list",
        record_backup_index: props.record_id,
        index: current_index,
        child_case_index: current_child_case_index.value
    }
    return await tools.send(ApiGetRecordList, _data)
}

async function interface_detail_record(type: String, index: String) {
    const _data = {
        type: type,
        record_backup_index: props.record_id,
        index: index
    }
    return await tools.send(ApiGetRecordList, _data)
}

function getFilterConfig(field: string): string {
    // 检查字段是否是用于数字比较的
    if (field === 'index_in_global_list' || field.includes('count') || field === 'end') {
        // 如果是，返回数字过滤器
        return 'agNumberColumnFilter';
    } else if (field === 'action') {
        return ""
    }

    // 默认情况下，返回文本过滤器
    return 'agTextColumnFilter';
}

function filter_controller(params: any, field: any) {
    if (field.includes("status")) {
        return StatusMapping[params.data?.[field]]
    }
    if (field === 'end') {
        const ms = params.data.end - params.data.start;
        return (ms / 1000).toFixed(3);
    }
    return params.data?.[field] ?? ''
}


function getWidthFlexConfig(field: string): { width?: number; flex?: number; minWidth?: number } {
    switch (true) {
        case field.includes('count'):
            return { width: 100 }
        case field === 'index_in_global_list':
            // 对于 'index' 列，我们给一个固定的窄宽度
            return { width: 80 };
        case field === 'desc':
            // 对于 'index' 列，我们给一个固定的窄宽度
            return { width: 180 };
        case field === 'status':
            // 假设 'status' 列也需要一个固定的稍宽的宽度
            return { width: 120 };
        case field === 'end':
            return { width: 140 };
        case field === 'action':
            return { width: 200 };
        default:
            return { flex: 1, minWidth: 150 };
    }
}
function getCellRendererConfig(field: string) {
    // 使用 switch 语句，比多个三元运算符更清晰、更易扩展
    switch (true) {
        case field.includes('count'):
            // 如果是 count 字段，返回组件名（模式 A）
            return 'CounterCell';
        case field.includes("status"):
            return 'StatusCell'
        case field === 'end':
            return 'WasteTimeCell'
        case field === 'action':
            return 'ActionCell'
        default:
            return (params: any) => {
                return params.data[field]
            };
    }
}

const props = defineProps({
    case_id: {
        default: null,
        type: Number
    },
    range_type: {
        default: 'case',
        type: String
    },
    record_id: {
        default: -1,
        type: Number
    }
})

function onGridReady(e: GridReadyEvent) {
    gridApi.value = e.api
}
async function get_record() {
    const _data = {
        type: 'child_case_list',
        record_backup_index: props.record_id,
        index: 0
    }
    const res = await tools.send(ApiGetRecordList, _data)
    if (gridApi.value) {
        gridApi.value.setGridOption('rowData', res.data);
    }
    if (res.data.length > 0) {
        if (!poller.value) {
            createPolling(refresh_data)
        }
        let has_running_task = false
        for (let i = 0; i < res.data.length; i++) {
            if (res.data[i].status.includes('running')) {
                has_running_task = true
                break
            }
        }
        if (has_running_task) {
            poller.value.setInterval(500)
            poller.value.setMaxRetries(300)
            startPolling(refresh_data)
        }
    } else {
        if (!poller.value) {
            poller.value.stop()
        }
    }
    show_table.value = true
}

function stopRecordChecking() {
    let is_stop = false
    // 检查 gridApi 是否已准备好
    if (gridApi.value) {
        // forEachNode 会遍历网格中的每一个 RowNode
        gridApi.value.forEachNode((node: any) => {
            // node.data 包含了你最初提供给这一行的数据对象
            console.log(node.data.index_in_global_list);
            console.log(current_child_case_index.value);
            console.log(node.data.status);
            if (node.data.index_in_global_list === current_child_case_index.value && node.data.status.includes('end_')) {
                is_stop = true
            }
        });
    }
    return is_stop
}

function createPolling(callback: any) {
    poller.value = new PollingUtil(callback, 5000, 360)
}

async function startPolling(callback: any) {
    if (!poller.value) {
        createPolling(callback)
    }
    poller.value.start()
}

async function refresh_data() {
    const _data = {
        type: 'child_case_list',
        record_backup_index: props.record_id,
        index: 0
    }
    const res = await tools.send(ApiGetRecordList, _data)
    if (res.data.length === 0) {
        poller.value.stop()
        return
    }
    let has_running_task = false
    for (let i = 0; i < res.data.length; i++) {
        if (res.data[i].status.includes('running')) {
            has_running_task = true
            break
        }
    }
    const transactionResult = gridApi.value.applyTransaction({ update: res.data });

    if (transactionResult && transactionResult.update && transactionResult.update.length > 0) {
        gridApi.value.refreshCells({
            rowNodes: transactionResult.update, // 指定要刷新哪些行
            columns: ['end'],            // 指定要刷新哪一列 (使用 field 作为 columnId)
            force: true                         // 强制刷新，即使值没有直接变化
        });
    }
    gridApi.value.applyTransaction({ update: res.data });
    if (!has_running_task) {
        poller.value.stop()
    }
}
</script>

<style lang="scss" scoped>
.case-table-contaniner {
    height: 90%;
    width: 100%;
    padding: 15px;
    box-sizing: border-box;
}

.ag-theme-quartz {
    --ag-background-color: rgb(255, 255, 255);
    --ag-foreground-color: rgb(0, 0, 0);
    --ag-header-text-color: rgb(255, 255, 255);
    --ag-header-background-color: rgb(0, 0, 0);
    --ag-odd-row-background-color: rgba(255, 255, 255, 0.03);
    --ag-header-column-resize-handle-color: rgb(255, 255, 255);
    --ag-font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
}

.ag-theme-quartz .ag-row-hover .ag-cell {
    background-color: #f0f0f0 !important;

    .mul-row-inputer {
        background-color: #f0f0f0 !important;
        text-decoration: none !important;
        -webkit-text-decoration: none !important;
    }
}

.ag-theme-quartz .ag-pinned-left-header {
    border-right: 1px solid white;
}

.ag-theme-quartz .ag-pinned-right-header {
    border-left: 1px solid white;
}

.ag-theme-quartz .ag-cell-value {
    cursor: pointer;
}

.ag-theme-quartz .ag-cell-focus {
    border-top-color: transparent !important;
    border-left-color: transparent !important;
    border-bottom-color: transparent !important;
    border-right-color: color-mix(in srgb, transparent, rgb(0, 0, 0) 15%) !important;
}

.ag-theme-quartz .ag-cell:not(:last-child) {
    border-right-color: color-mix(in srgb, transparent, rgb(0, 0, 0) 15%) !important;
}
</style>