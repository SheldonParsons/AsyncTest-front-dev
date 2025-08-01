<template>
    <SplitterGroup direction="vertical" ref="groupRef">
        <SplitterPanel :default-size="10"
            style="display:flex; flex-direction:column; height:100%;justify-content: center;">
            <div class="data-container-case-ag-grid-tips">此处的数据将会在您运行用例时被覆盖到当前环境变量中，（变量优先级 : 临时变量 > 环境变量 > 全局变量）。</div>
        </SplitterPanel>
        <SplitterPanel :default-size="85" style="display:flex; flex-direction:column; height:100%;">
            <div :class="['grid-wrapper', { maximized: isMaximized }]" class="data-container-case-ag-grid">
                <!-- 简单工具栏 -->
                <div class="controller">
                    <div class="add">
                        <motion.div class="btn" :whilePress="{ scale: 0.9 }" @click="action_add_last_blank_row"><svg
                                xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="lucide lucide-rows3-icon lucide-rows-3">
                                <rect width="18" height="18" x="3" y="3" rx="2" />
                                <path d="M21 9H3" />
                                <path d="M21 15H3" />
                            </svg>新增行</motion.div>
                        <motion.div class="btn" :whilePress="{ scale: 0.9 }" @click="action_add_col"><svg
                                xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round" class="lucide lucide-columns3-icon lucide-columns-3">
                                <rect width="18" height="18" x="3" y="3" rx="2" />
                                <path d="M9 3v18" />
                                <path d="M15 3v18" />
                            </svg>新增列</motion.div>
                        <Swtich @action="action_change_depends" :data="true"></Swtich>
                    </div>

                    <div class="max">
                        <motion.div @click="toggleMaximize">
                            <MaxBtn></MaxBtn>
                        </motion.div>
                    </div>
                </div>
                <!-- AG Grid 核心表格 -->
                <ag-grid-vue style="width:100%; height:100%;" :columnDefs="columnDefs" :rowData="rowData"
                    :defaultColDef="defaultColDef" :gridOptions="gridOptions" @grid-ready="onGridReady"
                    class="ag-theme-quartz" @cell-value-changed="action_edit_cell" />
            </div>
        </SplitterPanel>
        <SplitterPanel :default-size="5"></SplitterPanel>
    </SplitterGroup>
    <AddColDialog :title="'创建列数据'" ref="addColDialogRef" :cols="columnDefs" :confirm_title="'创建'"></AddColDialog>
    <EditColDialog :title="'批量编辑此列'" ref="editColDialogRef" :can_change="canChangeColInfo" :cols="columnDefs"
        :rows="rowData" :col="current_col" :confirm_title="'编辑'"></EditColDialog>
    <EditRowDialog :title="'批量编辑此行'" ref="editRowDialogRef" :confirm_title="'编辑'" :cols="columnDefs"></EditRowDialog>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { motion } from 'motion-v'
import { AgGridVue } from 'ag-grid-vue3'
import MaxBtn from '@/components/common/mini_btn/max.vue'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import type { GridReadyEvent, CellValueChangedEvent, RowDragEndEvent, ColDef } from 'ag-grid-community'
import { ModuleRegistry, AllCommunityModule, Theme, themeQuartz } from 'ag-grid-community';
import { AG_GRID_LOCALE_CN } from '@ag-grid-community/locale';
import _ from 'lodash'
import Cell from '@/views/case/content/case_content/data/CellRefer.vue'
import CellSingelLine from '@/views/case/content/case_content/data/CellReferSingleLine.vue'
import Rol from '@/views/case/content/case_content/data/RolRefer.vue'
import RolFix from '@/views/case/content/case_content/data/RolFixRefer.vue'
import ActionCell from '@/views/case/content/case_content/data/ActionCellRefer.vue'
import AddColDialog from '@/views/case/components/input_dialog.vue'
import EditColDialog from '@/views/case/components/edit_col_dialog.vue'
import EditRowDialog from '@/views/case/components/edit_row_dialog.vue'
import Swtich from '@/views/case/content/case_content/data/comp/switch_animation.vue'
import 'ag-grid-community/styles/ag-theme-quartz.css'
ModuleRegistry.registerModules([AllCommunityModule]);

// Grid API 引用
const gridApi = ref<any>(null)
const addColDialogRef: any = ref(null)
const editColDialogRef: any = ref(null)
const editRowDialogRef: any = ref(null)
// 列定义与行数据
const columnDefs: any = ref([])
const rowData: any = ref<any[]>([])
const isMaximized = ref(false)
const current_col: any = ref(null)
const canChangeColInfo = ref(true)
defineExpose({
    Cell,
    Rol,
    ActionCell,
    CellSingelLine,
    RolFix
})


const props = defineProps({
    env_name: {
        type: String,
        default: '生产环境'
    }
})

// 最大化状态
function toggleMaximize() {
    isMaximized.value = !isMaximized.value
}

const backend_data = {
    cols: [
        {
            name: "$ast_set_name",
            desc: "您可以通过 {{$ast_set_name}} 访问到该字段的值",
            id: 1
        },
        {
            name: "createdByName",
            desc: "创建人-从公共接口-登录中获取",
            id: 2
        },
        {
            name: "projectId",
            desc: "引用项目id-公共接口-获取项目信息-项目id",
            id: 3
        },
        {
            name: "contractIdss",
            desc: "报价客户-公共接口-获取项目详情信息-客户名称",
            id: 4
        },
        {
            name: "applicantChannelName",
            desc: "报价客户-公共接口-获取项目详情信息-客户名称",
            id: 5
        },
        {
            name: "receiverCompanyName",
            desc: "受理方-公共接口-获取项目详情信息-合同单位",
            id: 6
        },
        {
            name: "contractIds",
            desc: "执行方-公共接口-获取项目详情信息-执行单位",
            id: 7
        },
        {
            name: "consignee",
            desc: "提货方id-公共接口-获取提货方信息-提货方id",
            id: 8
        },
        {
            name: "type",
            desc: "报价类型 1-投标报价 2-合同报价",
            id: 9
        }
    ]
}


onMounted(() => {
    console.log(backend_data.cols);

    for (let i = 0; i < backend_data.cols.length; i++) {
        if (i === 0) {
            columnDefs.value.push({
                filter: 'agTextColumnFilter',
                field: backend_data.cols[i].name,
                headerName: '数据名',
                headerComponent: "RolFix",
                pinned: 'left',
                editable: true,
                rowDrag: true,
                cellEditor: CellSingelLine,
                filterValueGetter: (params: any) => params.data?.[backend_data.cols[i].name]?.data ?? '',
                cellRenderer: (params: any) => params.value && params.value.data ? params.value.data : '',
                minWidth: 250,
                headerComponentParams: {
                    name: backend_data.cols[i].name,
                    id: backend_data.cols[i].id,
                    desc: backend_data.cols[i].desc,
                    env_name: props.env_name,
                    edit_col: action_edit_col,
                    batch_edit_col: action_batch_col,
                }
            })
        } else {
            columnDefs.value.push({
                filter: 'agTextColumnFilter',
                field: backend_data.cols[i].name,
                headerName: backend_data.cols[i].name,
                headerComponent: "Rol",
                editable: true,
                minWidth: 250,
                cellEditor: Cell,
                filterValueGetter: (params: any) => params.data?.[backend_data.cols[i].name]?.data ?? '',
                cellRenderer: (params: any) => params.value && params.value.data ? params.value.data : '',
                headerComponentParams: {
                    name: backend_data.cols[i].name,
                    id: backend_data.cols[i].id,
                    desc: backend_data.cols[i].desc,
                    env_name: props.env_name,
                    edit_col: action_edit_col,
                    batch_edit_col: action_batch_col,
                    delete_col: action_delete_col
                }
            })
        }
    }
    columnDefs.value.push(
        {
            field: '$ast_action',
            headerName: '操作',
            cellRenderer: 'ActionCell',
            editable: false,
            pinned: 'right',
            filter: false,
            maxWidth: 100,
            minWidth: 100,
            cellRendererParams: {
                add_row: action_add_blank_row,
                delete_row: action_delete_row,
                copy_row: action_copy_row,
                eidt_row: action_edit_row
            }
        })
    for (let i = 0; i < 5; i++) {
        rowData.value.push({
            id: i,
            $ast_set_name: {
                id: i + 1,
                data: '数据' + (i + 1)
            },
            createdByName: {
                id: i + 2,
                data: generateRandomString()
            },
            projectId: {
                id: i + 3,
                data: generateRandomString()
            },
            contractIdss: {
                id: i + 4,
                data: generateRandomString()
            },
            applicantChannelName: {
                id: i + 5,
                data: generateRandomString()
            },
            receiverCompanyName: {
                id: i + 6,
                data: generateRandomString()
            },
            contractIds: {
                id: i + 7,
                data: generateRandomString()
            },
            consignee: {
                id: i + 8,
                data: generateRandomString()
            },
            type: {
                id: i + 9,
                data: generateRandomString()
            },
            $ast_action: null
        })
    }
})

function generateRandomString() {
    const length = Math.floor(Math.random() * 81) + 20;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 默认列配置：可过滤、可编辑、不允许调整宽度、自适应宽度
const defaultColDef: ColDef = {
    filter: true,
    editable: false,
    resizable: false,
    flex: 1,
    sortable: false,
}

// 拖拽结束动作
function onRowDragEnd(event: any) {
    const newOrder: any = []
    event.api.forEachNodeAfterFilterAndSort((node: any) => {
        newOrder.push(node.data)
    })
    rowData.value = newOrder
}

// 单元格编辑完成
async function action_edit_cell(e: CellValueChangedEvent) {
    console.log('单元格新值：', e)
    if (e.newValue.data === e.oldValue.data) {
        window.$toast({ title: '内容无变化。', type: 'info' })
    } else {
        window.$toast({ title: '更新单元格内容成功。' })
    }
}

function generate8DigitNumber() {
    // 10000000 ~ 99999999
    return Math.floor(Math.random() * 90000000) + 10000000
}

async function action_copy_row(params: any) {
    console.log(params);
    const before_row_id = rowData.value[params.node.childIndex].id
    const dataFields = columnDefs.value
        .filter((cd: any) => cd.field && cd.field !== '$ast_action')
        .map((cd: any) => cd.field)
    let row_values: any = []
    dataFields.forEach((field: any, i: any) => {
        if (i === 0) {
            row_values.push(`数据${generate8DigitNumber()}`)
        } else {
            row_values.push(params.data[field].data)
        }
    })
}

async function action_add_blank_row(params: any) {
    console.log(params);
    const before_row_id = rowData.value[params.node.childIndex].id
    let row_values: any = []
    for (let i = 0; i < columnDefs.value.length - 1; i++) {
        if (i === 0) {
            row_values.push(`数据${generate8DigitNumber()}`)
        } else {
            row_values.push('')
        }
    }
}

async function action_add_last_blank_row() {
    const before_row_id = rowData.value.length === 0 ? 0 : rowData.value[rowData.value.length - 1].id
    let row_values: any = []
    for (let i = 0; i < columnDefs.value.length - 1; i++) {
        if (i === 0) {
            row_values.push(`数据${generate8DigitNumber()}`)
        } else {
            row_values.push('')
        }
    }
}

async function action_add_row(newRow: any) {
    rowData.value.push(newRow)
    window.$toast({ title: '成功新增行。' })
}

async function action_edit_col(col_id: number, origin_data: any, data: any) {
    console.log(col_id);
    console.log(origin_data);
    console.log(data);
    window.$toast({ title: `列名称更新成功。` })
}

async function action_batch_col(col_instance: any, can_change_col_info: boolean) {
    canChangeColInfo.value = can_change_col_info
    // 1. 记录当前列实例，用于传递给编辑弹窗
    current_col.value = col_instance

    console.log(current_col.value);
    let current_col_data = []
    for (let i = 0; i < rowData.value.length; i++) {
        current_col_data.push(rowData.value[i][current_col.value.name].data)
    }
    // 2. 初始化弹窗
    editColDialogRef.value.init(col_instance, current_col_data.join('\n\n'))

    // 3. 打开弹窗，获取新内容（等待用户输入）
    // 假定 open() 返回 { value_list, new_col_name, new_col_desc }
    const result = await editColDialogRef.value.open()
    if (!result) {
        current_col.value = null
        return
    }
    const { action, value_list, new_col_name, new_col_desc } = result

    if (action === 'pass') {
        current_col.value = null
        return
    }

    // 4. 更新列名和描述
    const old_field = col_instance.name
    const new_field = new_col_name
    const new_desc = new_col_desc

    // 4.1 修改 columnDefs
    const targetCol = columnDefs.value.find((col: any) => col.field === old_field)
    if (targetCol) {
        targetCol.field = new_field
        targetCol.headerName = new_field
        targetCol.headerComponentParams.name = new_field
        targetCol.headerComponentParams.desc = new_desc
    }

    // 5. 更新 rowData 对应列的值
    // value_list: 一个数组，对应每一行该列新值
    // 行数和 value_list 数组长度一致，依次赋值
    rowData.value.forEach((row: any, i: number) => {
        // 旧字段要先删掉
        if (old_field !== new_field) {
            delete row[old_field]
        }
        // 如果 value_list 有值，更新为新内容，否则为空字符串
        row[new_field] = {
            id: row[new_field].id, // 沿用旧ID或生成新ID
            data: (value_list && value_list[i] !== undefined) ? value_list[i] : ''
        }
    })

    // 6. 清理
    current_col.value = null
    window.$toast({ title: `批量编辑成功` })
}


async function action_add_col() {
    const result = await addColDialogRef.value.open()
    console.log(result);
    const newCols = result.data
    if (!Array.isArray(newCols) || newCols.length === 0) {
        return
    }

    // 1. 追加新列到 columnDefs
    newCols.forEach(col => {
        columnDefs.value.push({
            filter: 'agTextColumnFilter',
            field: col.name,
            headerName: col.name,
            headerComponent: "Rol",
            editable: true,
            minWidth: 250,
            cellEditor: Cell,
            filterValueGetter: (params: any) => params.data?.[col.name]?.data ?? '',
            cellRenderer: (params: any) => params.value && params.value.data ? params.value.data : '',
            headerComponentParams: {
                name: col.name,
                id: generate8DigitNumber(),
                desc: col.desc,
                edit_col: action_edit_col,
                batch_edit_col: action_batch_col,
                delete_col: action_delete_col
            }
        })
    })

    // 2. 所有行都加上这些字段
    rowData.value.forEach((row: any) => {
        newCols.forEach(col => {
            row[col.name] = {
                id: generate8DigitNumber(),
                data: ''
            }
        })
    })
    window.$toast({ title: '成功添加列。' })
}

async function action_delete_row(params: any) {
    rowData.value.splice(params.node.childIndex, 1)
    window.$toast({ title: '删除行成功。' })
}

async function action_edit_row(params: any) {
    console.log(params);
    let current_row_data = []
    for (let i = 0; i < columnDefs.value.length - 1; i++) {
        current_row_data.push(params.data[columnDefs.value[i].field].data)
    }
    editRowDialogRef.value.init(current_row_data.join('\n\n'))
    const result = await editRowDialogRef.value.open()
    if (result.action === 'save') {
        const targetRow: any = rowData.value.find((row: any) => row.id === params.data.id)
        if (targetRow) {
            for (let i = 0; i < columnDefs.value.length - 1; i++) {
                targetRow[columnDefs.value[i].field].data = result.data[i]
            }
        }
        window.$toast({ title: '行修改成功。' })
    }
}



async function action_delete_col(col_instance: any) {
    if (!col_instance) return

    // 1. 删除 columnDefs 里对应的列
    console.log(columnDefs.value);
    console.log(col_instance);

    columnDefs.value = columnDefs.value.filter((col: any) => {
        if (col.headerComponentParams) {
            if (col.headerComponentParams.id !== col_instance.id) {
                return col
            }
        } else {
            return col
        }
    })

    // 2. 删除 rowData 里所有该字段
    rowData.value.forEach((row: any) => {
        delete row[col_instance.name]
    })
    window.$toast({ title: '成功删除列。' })
}



async function action_change_depends(checked: boolean) {
    if (checked === true) {
        window.$toast({ title: '启用：独立数据源' })
    } else {
        window.$toast({ title: '禁用：跟随默认数据', type: 'info' })
    }
}

// Grid 其他配置：行拖拽、动画；不使用右键菜单
const gridOptions = {
    rowDragManaged: true,
    localeText: AG_GRID_LOCALE_CN,
    animateRows: true,
    suppressMovableColumns: true,
    suppressHeaderKeyboardEvent: true,
    onRowDragEnd: onRowDragEnd
}

// 生命周期：获取 API
function onGridReady(e: GridReadyEvent) {
    gridApi.value = e.api
}
</script>


<style lang="scss" scope>
.data-container-case-ag-grid-tips {
    height: 46px;
    width: 80%;
    padding: 12px 16px !important;
    display: flex;
    align-items: center;
    background-color: #f9fafb;
    border-radius: 10px;
    box-sizing: border-box;
    font-size: 0.9rem;
    font-weight: 500;
}

.data-container-case-ag-grid {
    .controller {
        box-sizing: border-box;
        padding: 10px 10px 10px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .add {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;

            .btn {
                background-color: black;
                color: white;
                box-sizing: border-box;
                padding: 5px 10px;
                font-size: 14px;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 3px;
            }
        }
    }
}

.ag-theme-quartz {
    --ag-background-color: rgb(255, 255, 255);
    --ag-foreground-color: rgb(0, 0, 0);
    --ag-header-text-color: rgb(255, 255, 255);
    --ag-header-background-color: rgb(0, 0, 0);
    --ag-odd-row-background-color: rgba(255, 255, 255, 0.03);
    --ag-header-column-resize-handle-color: rgb(255, 255, 255);
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
    border-color: transparent !important;
}

.grid-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0px;
    /* 承接上层 full-height */
}

.toolbar {
    flex: 0 0 auto;
    /* 工具栏按内容撑开 */
}

.grid-container {
    flex: 1 1 auto;
    /* 占满剩余所有高度 */
    /* 注意：ag-grid-vue 本身写 height:100% 才会铺满这里 */
}

/* ---- 最大化时加这段 ---- */
.grid-wrapper.maximized {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 99;
    background: white;
    display: flex;
    flex-direction: column;
    padding: 10px;
    box-sizing: border-box;
}

.dynamic-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;

    .field {
        width: 100%;
        height: 100%;
        min-width: 100px;
        display: flex !important;
        align-items: center;
        justify-content: center;
        padding: 10px;


        .mul-row-inputer {
            resize: none;
            width: 100%;
            border: none;
            outline: none;
            text-decoration: none !important;
            -webkit-text-decoration: none !important;
        }
    }
}
</style>