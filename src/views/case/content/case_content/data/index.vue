<template>
    <SplitterGroup direction="vertical" ref="groupRef">
        <SplitterPanel :default-size="10" v-if="global === false"
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
                        <Swtich ref="dependRef" v-if="global === false" @action="action_change_depends"
                            :data="env.depend === 1"></Swtich>
                    </div>

                    <div class="max">
                        <motion.div @click="toggleMaximize">
                            <MaxBtn></MaxBtn>
                        </motion.div>
                    </div>
                </div>
                <ag-grid-vue v-if="isReady" style="width:100%; height:100%;" :columnDefs="columnDefs" :rowData="rowData"
                    :defaultColDef="defaultColDef" :gridOptions="gridOptions" :rowDragText="rowDragText"
                    @grid-ready="onGridReady" class="ag-theme-quartz" @cell-value-changed="action_edit_cell" />
            </div>
        </SplitterPanel>
        <SplitterPanel :default-size="5"></SplitterPanel>
    </SplitterGroup>
    <AddColDialog :title="'创建列数据'" ref="addColDialogRef" :cols="columnDefs" :confirm_title="'创建'"
        :valid="api_create_col"></AddColDialog>
    <EditColDialog :title="'批量编辑此列'" ref="editColDialogRef" :can_change="canChangeColInfo" :cols="columnDefs"
        :rows="rowData" :col="current_col" :confirm_title="'编辑'" :valid="api_edit_col"></EditColDialog>
    <EditRowDialog :title="'批量编辑此行'" ref="editRowDialogRef" :confirm_title="'编辑'" :cols="columnDefs"
        :valid="api_edit_row"></EditRowDialog>
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
import { send_action } from '@/views/case/utils'
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
const dependRef: any = ref(null)
const current_row: any = ref(null)
const create_col_data: any = ref(null)
const isReady = ref(false)
defineExpose({
    Cell,
    Rol,
    ActionCell,
    CellSingelLine,
    RolFix
})


const props = defineProps({
    env: {
        type: null
    },
    data: {
        type: null
    },
    dataset: {
        type: null
    },
    global: {
        type: null,
        default: false
    },
    can_edit: {
        type: Boolean,
        default: true
    }
})

const emit = defineEmits(['change_depend'])

// 权限检查的 send_action 包装函数
async function send_action_with_permission(data: any) {
    if (!props.can_edit) {
        window.$toast({ title: '您无权修改' })
        return false
    }
    return await send_action(data)
}

// 最大化状态
function toggleMaximize() {
    isMaximized.value = !isMaximized.value
}

onMounted(() => {
    // 1. 创建临时数组，避免在循环中频繁触发 Vue 响应式更新
    const tempCols = []

    for (let i = 0; i < props.data.cols.length; i++) {
        if (i === 0) {
            tempCols.push({  // 修改：push 到 tempCols
                filter: 'agTextColumnFilter',
                field: props.data.cols[i].name,
                headerName: '数据名',
                headerComponent: "RolFix",
                pinned: 'left',
                editable: true,
                rowDrag: true,
                cellEditor: CellSingelLine,
                filterValueGetter: (params: any) => params.data?.[props.data.cols[i].name]?.data ?? '',
                cellRenderer: (params: any) => params.value && params.value.data ? params.value.data : '',
                minWidth: 250,
                headerComponentParams: {
                    name: props.data.cols[i].name,
                    id: props.data.cols[i].id,
                    desc: props.data.cols[i].desc,
                    env_name: props.env ? props.env.name : null,
                    edit_col: action_edit_col,
                    batch_edit_col: action_batch_col,
                }
            })
        } else {
            tempCols.push({ // 修改：push 到 tempCols
                filter: 'agTextColumnFilter',
                field: props.data.cols[i].name,
                headerName: props.data.cols[i].name,
                headerComponent: "Rol",
                editable: true,
                minWidth: 250,
                cellEditor: Cell,
                filterValueGetter: (params: any) => params.data?.[props.data.cols[i].name]?.data ?? '',
                cellRenderer: (params: any) => params.value && params.value.data ? params.value.data : '',
                headerComponentParams: {
                    name: props.data.cols[i].name,
                    id: props.data.cols[i].id,
                    desc: props.data.cols[i].desc,
                    env_name: props.env.name,
                    edit_col: action_edit_col,
                    batch_edit_col: action_batch_col,
                    delete_col: action_delete_col
                }
            })
        }
    }

    tempCols.push({ // 修改：push 到 tempCols
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

    // 2. 一次性赋值给响应式对象
    columnDefs.value = tempCols
    rowData.value = _.cloneDeep(props.data.rows)

    // 3. 标记数据已准备好，允许渲染 Grid
    isReady.value = true
})

// 默认列配置：可过滤、可编辑、不允许调整宽度、自适应宽度
const defaultColDef: ColDef = {
    filter: true,
    editable: false,
    resizable: false,
    flex: 1,
    sortable: false,
}

// 拖拽结束动作
async function onRowDragEnd(event: any) {
    console.log(event);
    gridApi.value!.setGridOption("suppressRowDrag", true);
    const _data = {
        type: 1,
        child_action_type: 'switch_position',
        content: {
            table_id: props.env.table_id,
            row_id: event.node.data.id,
            target_index: event.node.rowIndex
        }
    }
    const result = await send_action_with_permission(_data)
    gridApi.value!.setGridOption("suppressRowDrag", false);
    if (!result) return
    window.$toast({ title: '更新位置成功' })

}

// 单元格编辑完成
async function action_edit_cell(e: CellValueChangedEvent) {
    console.log('单元格新值：', e)
    if (e.newValue.data === e.oldValue.data) {
        window.$toast({ title: '内容无变化。', type: 'info' })
    } else {
        const _data = {
            type: 1,
            child_action_type: 'edit_cell',
            content: {
                table_id: props.env.table_id,
                cell_id: e.value.id,
                value: e.value.data
            }
        }
        const result = await send_action_with_permission(_data)
        if (!result) return
        window.$toast({ title: '更新单元格内容成功。' })
    }
}

function generate8DigitNumber() {
    // 10000000 ~ 99999999
    return Math.floor(Math.random() * 90000000) + 10000000
}

async function action_copy_row(params: any) {
    const _data = {
        type: 1,
        child_action_type: 'add_row',
        content: {
            table_id: props.env.table_id,
            index: rowData.value[params.node.childIndex].id,
            t: 'copy'
        }
    }
    const result = await send_action_with_permission(_data)
    if (!result) return
    action_add_row(params.node.childIndex + 1, result)
}

async function action_add_blank_row(params: any) {
    const _data = {
        type: 1,
        child_action_type: 'add_row',
        content: {
            table_id: props.env.table_id,
            index: rowData.value[params.node.childIndex].id,
            t: 'blank'
        }
    }
    const result = await send_action_with_permission(_data)
    if (!result) return
    action_add_row(params.node.childIndex + 1, result)
}

async function action_add_last_blank_row() {
    const _data = {
        type: 1,
        child_action_type: 'add_row',
        content: {
            table_id: props.env.table_id,
            index: -1,
            t: 'blank'
        }
    }
    const result = await send_action_with_permission(_data)
    if (!result) return
    action_add_row(rowData.value.length, result)
}

async function action_add_row(index: number, data: any) {
    let newRow: any = {}
    newRow.id = data.row_id
    for (let i = 0; i < data.cells.length; i++) {
        newRow[data.cells[i].column] = {
            id: data.cells[i].id,
            data: data.cells[i].value
        }
    }
    rowData.value.splice(index, 0, newRow)
    window.$toast({ title: '成功新增行。' })
}

async function action_edit_col(col_id: number, origin_data: any, data: any) {
    console.log(col_id);
    console.log(origin_data);
    console.log(data);
    const _data = {
        type: 1,
        child_action_type: 'change_col_name',
        content: {
            table_id: props.env.table_id,
            col_id: col_id,
            new_col_name: data,
        }
    }
    const result = await send_action_with_permission(_data)
    if (!result) return false
    window.$toast({ title: `列名称更新成功。` })
}

async function api_edit_col(data: any, name: string, desc: string) {
    const _data = {
        type: 1,
        child_action_type: 'batch_edit_col',
        content: {
            table_id: props.env.table_id,
            col_id: current_col.value.id,
            data: data,
            new_col_name: name,
            new_col_desc: desc
        }
    }
    const result = await send_action_with_permission(_data)
    if (!result) return false
    return true
}

async function action_batch_col(col_instance: any, can_change_col_info: boolean) {
    canChangeColInfo.value = can_change_col_info
    // 1. 记录当前列实例，用于传递给编辑弹窗
    current_col.value = col_instance

    console.log(current_col.value);
    console.log(canChangeColInfo.value);
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
        // 如果 value_list 有值，更新为新内容，否则为空字符串
        row[new_field] = {
            id: row[old_field].id, // 沿用旧ID或生成新ID
            data: (value_list && value_list[i] !== undefined) ? value_list[i] : ''
        }
        // 旧字段要先删掉
        if (old_field !== new_field) {
            delete row[old_field]
        }
    })

    // 6. 清理
    current_col.value = null
    window.$toast({ title: `批量编辑成功` })
}

async function api_create_col(data: any) {
    const _data = {
        type: 1,
        child_action_type: 'add_columns',
        content: {
            table_id: props.env.table_id,
            columns: data
        }
    }
    const result = await send_action_with_permission(_data)
    if (!result) return false
    create_col_data.value = result
    return true
}


async function action_add_col() {
    const result = await addColDialogRef.value.open()
    console.log(result);
    const newCols = result.data
    if (!Array.isArray(newCols) || newCols.length === 0) {
        return
    }

    // 1. 追加新列到 columnDefs
    create_col_data.value.forEach((item: any) => {
        columnDefs.value.splice(columnDefs.value.length - 1, 0, {
            filter: 'agTextColumnFilter',
            field: item.col.name,
            headerName: item.col.name,
            headerComponent: "Rol",
            editable: true,
            minWidth: 250,
            cellEditor: Cell,
            filterValueGetter: (params: any) => params.data?.[item.col.name]?.data ?? '',
            cellRenderer: (params: any) => params.value && params.value.data ? params.value.data : '',
            headerComponentParams: {
                name: item.col.name,
                id: item.col.id,
                desc: item.col.desc,
                edit_col: action_edit_col,
                batch_edit_col: action_batch_col,
                delete_col: action_delete_col
            }
        })
        for (let i = 0; i < item.cells.length; i++) {
            rowData.value[i][item.col.name] = {
                id: item.cells[i].id,
                data: item.cells[i].value
            }
        }
    })
    window.$toast({ title: '成功添加列。' })
}

async function action_delete_row(params: any) {
    current_row.value = rowData.value.find((row: any) => row.id === params.data.id)
    const _data = {
        type: 1,
        child_action_type: 'delete_row',
        content: {
            table_id: props.env.table_id,
            row_id: current_row.value.id
        }
    }
    const result = await send_action_with_permission(_data)
    if (!result) return false
    rowData.value.splice(params.node.rowIndex, 1)
    window.$toast({ title: '删除行成功。' })
}

async function action_edit_row(params: any) {
    let current_row_data = []
    for (let i = 0; i < columnDefs.value.length - 1; i++) {
        current_row_data.push(rowData.value[params.node.rowIndex][columnDefs.value[i].field].data)
    }
    editRowDialogRef.value.init(current_row_data.join('\n\n'))
    current_row.value = rowData.value.find((row: any) => row.id === rowData.value[params.node.rowIndex].id)
    const result = await editRowDialogRef.value.open()
    if (result.action === 'save') {
        const targetRow: any = rowData.value.find((row: any) => row.id === rowData.value[params.node.rowIndex].id)
        if (targetRow) {
            for (let i = 0; i < columnDefs.value.length - 1; i++) {
                targetRow[columnDefs.value[i].field].data = result.data[i]
            }
        }
        window.$toast({ title: '行修改成功。' })
    }
}

async function api_edit_row(data: any) {
    const _data = {
        type: 1,
        child_action_type: 'batch_edit_row',
        content: {
            table_id: props.env.table_id,
            row_id: current_row.value.id,
            data: data
        }
    }
    const result = await send_action_with_permission(_data)
    if (!result) return false
    return true
}



async function action_delete_col(col_instance: any) {
    if (!col_instance) return

    // 1. 删除 columnDefs 里对应的列
    console.log(columnDefs.value);
    console.log(col_instance);

    const _data = {
        type: 1,
        child_action_type: 'delete_col',
        content: {
            table_id: props.env.table_id,
            col_id: col_instance.id
        }
    }
    const result = await send_action_with_permission(_data)
    if (!result) return false

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
    const _data = {
        type: 1,
        child_action_type: 'switch_depend',
        content: {
            table_id: props.env.table_id
        }
    }
    const result = await send_action_with_permission(_data)
    if (!result) {
        dependRef.value.toggle()
        return
    }
    emit('change_depend')
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
    onRowDragEnd: onRowDragEnd,
    alwaysShowHorizontalScroll: true,
    alwaysShowVerticalScroll:true
}

function rowDragText(params: any, dragItemCount: any) {
    return params.value.data
}

// 生命周期：获取 API
function onGridReady(e: GridReadyEvent) {
    gridApi.value = e.api
}
</script>


<style lang="scss">

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
        padding: 20px 10px 20px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .add {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;

            .btn {
                position: relative;
                color: white;
                box-sizing: border-box;
                padding: 5px 16px;
                font-size: 14px;
                font-weight: 500;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 6px;
                background: linear-gradient(135deg, #1a1a1a, #2d2d2d, #1a1a1a);
                background-size: 200% 200%;
                animation: gradient-shift 3s ease infinite;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4),
                    0 0 20px rgba(255, 255, 255, 0.1);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                overflow: hidden;
                will-change: transform, box-shadow;
            }

            .btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                transition: left 0.5s;
            }

            .btn:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5),
                    0 0 30px rgba(255, 255, 255, 0.15);
                background: linear-gradient(135deg, #2d2d2d, #404040, #2d2d2d);
            }

            .btn:hover::before {
                left: 100%;
            }

            .btn:active {
                transform: translateY(0);
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3),
                    0 0 15px rgba(255, 255, 255, 0.08);
            }

            .btn svg {
                filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3));
                transition: transform 0.3s ease;
            }

            .btn:hover svg {
                transform: scale(1.1);
            }

            @keyframes gradient-shift {
                0% {
                    background-position: 0% 50%;
                }

                50% {
                    background-position: 100% 50%;
                }

                100% {
                    background-position: 0% 50%;
                }
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

.ag-body-viewport-wrapper.ag-layout-normal {
  overflow-x: scroll !important; /* Forces the horizontal scrollbar */
}

/* Optional: customize the appearance of the scrollbar across webkit browsers */
::-webkit-scrollbar {
  -webkit-appearance: none;
  width: 8px; /* height of horizontal scrollbar */
  height: 8px; /* width of vertical scrollbar */
}

::-webkit-scrollbar-thumb {
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
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
    z-index: 999;
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