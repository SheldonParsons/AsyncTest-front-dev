<template>
    <div class="datasource-wrapper">
        <div v-show="!isEditMode" class="datasource-container">
            <!-- 顶部操作栏 -->
            <div class="datasource-header">
                <div class="search-wrapper">
                    <input v-model="searchKeyword" type="text" placeholder="搜索数据源名称..." class="search-input"
                        @input="handleSearch" />
                    <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                        stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                </div>

                <motion.div class="add-datasource-btn" :whilePress="{ scale: 0.95 }" @click="handleAddDatasource">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                    </svg>
                    添加数据源
                </motion.div>
            </div>

            <!-- 数据表格 -->
            <div class="datasource-table-wrapper no-scroll">
                <table class="datasource-table">
                    <thead>
                        <tr>
                            <th>数据源名称</th>
                            <th>创建人</th>
                            <th>更新时间</th>
                            <th>是否启用</th>
                            <th>应用范围</th>
                            <th>数据源类型</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <motion.tr v-for="item in displayData" :key="item.id" :initial="{ opacity: 0, y: 20 }"
                            :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.3 }" class="table-row">
                            <td class="name-cell">
                                <div class="name-wrapper">
                                    <div class="name-icon">{{ item.name.charAt(0).toUpperCase() }}</div>
                                    <span class="name-text">{{ item.name }}</span>
                                </div>
                            </td>
                            <td>{{ item.create_by }}</td>
                            <td>{{ tools.getLocaleDateTime(item.update_time, false) }}</td>
                            <td>
                                <SimpleSwitch v-model="item.enable"
                                    @update:model-value="(value) => handleToggleEnable(value, item)" />
                            </td>
                            <td>
                                <div class="scope-wrapper">
                                    <Tooltip v-if="!item.is_public_read" :is-open="openTooltipId === item.id"
                                        side="top">
                                        <template #trigger>
                                            <span class="scope-badge project"
                                                @mouseenter="cleanAndSetTooltipEvent(item.id)"
                                                @mouseleave="delayChange">
                                                范围
                                            </span>
                                        </template>
                                        <div class="tooltip-mapping-list" @mouseenter="cleanAndSetTooltipEvent(item.id)"
                                            @mouseleave="openTooltipId = null">
                                            <div v-if="item.read_mapping?.projects?.length > 0" class="mapping-section">
                                                <div class="tooltip-title">可使用项目</div>
                                                <div class="mapping-items">
                                                    <div v-for="project in item.read_mapping.projects" :key="project.id"
                                                        class="mapping-item">
                                                        {{ project.name }}
                                                    </div>
                                                </div>
                                            </div>
                                            <div v-if="item.read_mapping?.users?.length > 0" class="mapping-section">
                                                <div class="tooltip-title">可使用用户</div>
                                                <div class="mapping-items">
                                                    <div v-for="user in item.read_mapping.users" :key="user.id"
                                                        class="mapping-item">
                                                        {{ user.name }}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Tooltip>
                                    <span v-else class="scope-badge global">
                                        全局
                                    </span>
                                </div>
                            </td>
                            <td>
                                <span class="type-tag">{{ item.source_type === 'table' ? '表格' : item.source_type
                                    }}</span>
                            </td>
                            <td>
                                <ActionGroup :group="['copy', 'batchEdit', 'delete']" :actionDesc="{
                                    copy: '复制',
                                    batchEdit: '编辑',
                                    delete: '删除'
                                }" :itemBackgroundColor="'rgba(0, 0, 0, 0.05)'" :itemColor="'#1a1a1a'"
                                    @action="(action) => handleAction(action, item)" />
                            </td>
                        </motion.tr>
                    </tbody>
                </table>

                <div v-if="displayData.length === 0" class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                        <ellipse cx="12" cy="5" rx="9" ry="3" />
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                    </svg>
                    <p>暂无数据源</p>
                </div>
            </div>

            <!-- 分页器 -->
            <div class="pagination-wrapper">
                <Pagination :total="totalCount" :size="pageSize" @changePage="handlePageChange" />
            </div>
        </div>

        <DatasourceEdit v-if="isEditMode" :initialData="currentEditData" :isEdit="isEditMode" @back="handleBack"
            @save="handleSave" />

        <!-- 添加数据源对话框 -->
        <DialogAnimation ref="addDialogRef" title="添加数据源" cancel_title="取消" confirm_title="创建" :bgtype="'white'">
            <div class="add-datasource-form">
                <label class="form-label">数据源名称</label>
                <input v-model="newDatasourceName" type="text" placeholder="请输入数据源名称" class="form-input" />
            </div>
        </DialogAnimation>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { motion } from 'motion-v'
import Pagination from '@/components/common/general/pagination.vue'
import ActionGroup from '@/views/case/content/case_content/runner/tree/components/action_group.vue'
import SimpleSwitch from '@/components/common/general/simple-switch.vue'
import Tooltip from '@/components/common/general/tooltip.vue'
import DatasourceEdit from './datasource_child/datasource_edit.vue'
import DialogAnimation from '@/components/common/general/dialog.vue'
import tools from '@/utils/tools'
import { HttpClass } from "@/utils/http"
import _ from 'lodash'
import { ApiGetGlobalDatasourceList, ApiGetGlobalDatasource, ApiDeleteGlobalDatasource, ApiUpdateGlobalDatasource, ApiPostGlobalDatasource } from '@/api/global/index'

const isEditMode = ref(false)
const currentEditData = ref<any>(null)

// 添加数据源对话框
const addDialogRef = ref<any>(null)
const newDatasourceName = ref('')

// 搜索关键词
const searchKeyword = ref('')

// 分页
const currentPage = ref(1)
const pageSize = ref(10)

// Tooltip状态管理
const openTooltipId = ref<number | null>(null)

// 数据加载
let cancelTokenSource: any
const loading = ref(false)

// 数据源列表
const data = ref<any[]>([])
const totalCount = ref(0)

// 初始化
onMounted(async () => {
    await get_data()
})


// 当前页显示的数据（分页在后端处理，这里直接返回data）
const displayData = computed(() => data.value)

// 获取数据源列表（带防抖）
const get_data = _.debounce(
    () => {
        if (cancelTokenSource) {
            cancelTokenSource.cancel("取消重复请求")
        }
        cancelTokenSource = HttpClass.createCancelToken()

        const params: any = {
            page: currentPage.value,
            size: pageSize.value
        }

        if (searchKeyword.value) {
            params.name = searchKeyword.value
        }

        loading.value = true
        ApiGetGlobalDatasourceList({ params, cancelToken: cancelTokenSource.token })
            .then((res: any) => {
                data.value = res.data || []
                totalCount.value = res.total || 0
                loading.value = false
            })
            .catch((error: any) => {
                loading.value = false
                console.error('获取数据源列表失败:', error)
            })
    },
    300
)

// 总数（已废弃，保留兼容性）
const totalCount_old = computed(() => totalCount.value)

// 搜索处理
function handleSearch() {
    currentPage.value = 1
    get_data()
}

// 添加数据源
async function handleAddDatasource() {
    newDatasourceName.value = ''
    const result = await addDialogRef.value.open()

    if (result.action === 'comfirm') {
        if (!newDatasourceName.value.trim()) {
            window.$toast({ title: '请输入数据源名称', type: 'error' })
            return
        }

        try {
            const createResult = await tools.send(ApiPostGlobalDatasource, { name: newDatasourceName.value }, {})
            if (createResult) {
                window.$toast({ title: '数据源创建成功', type: 'success' })
                // 以接口响应内容作为编辑数据，切换到编辑模式
                currentEditData.value = createResult
                isEditMode.value = true
            }
        } catch (error) {
            console.error('创建数据源失败:', error)
            window.$toast({ title: '创建数据源失败', type: 'error' })
        }
    }
}

let tooltipTimeoutEvent: any = null


function delayChange() {
    tooltipTimeoutEvent = setTimeout(() => {
        openTooltipId.value = null
    }, 200)
}

function cleanAndSetTooltipEvent(id: any) {
    if (tooltipTimeoutEvent) {
        clearTimeout(tooltipTimeoutEvent)
    }
    openTooltipId.value = id

}
// 分页变化
function handlePageChange(page: number) {
    currentPage.value = page
    get_data()
}

// 切换启用状态
async function handleToggleEnable(value: boolean, item: any) {
    const update_result = await tools.send(ApiUpdateGlobalDatasource, item.id, {}, { enable: value })
    if (update_result) {
        item.enable = update_result.enable
        window.$toast({
            title: `${update_result.enable ? '已启用' : '已禁用'}数据源: ${item.name}`,
            type: 'success'
        })
    } else {
        item.enable = !value
    }
}

// 操作处理
async function handleAction(action: string, item: any) {
    switch (action) {
        case 'copy':
            window.$toast({ title: `复制数据源: ${item.name}`, type: 'success' })
            break
        case 'batchEdit':
            const datasource_detail = await tools.send(ApiGetGlobalDatasource, item.id, {})
            if (datasource_detail) {
                currentEditData.value = datasource_detail
                isEditMode.value = true
            }
            break
        case 'delete':
            const delete_result = await tools.send(ApiDeleteGlobalDatasource, item.id, {})
            if (delete_result) {
                window.$toast({ title: `删除数据源: ${item.name}`, type: 'success' })
                await get_data()
            }
            break
    }
}

async function handleBack() {
    isEditMode.value = false
    currentEditData.value = null
    await get_data()
}

async function handleSave() {
    isEditMode.value = false
    currentEditData.value = null
    await get_data() // 重新获取数据列表
}
</script>

<style lang="scss" scoped>
.datasource-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.datasource-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 24px;
    box-sizing: border-box;
}

/* 顶部操作栏 */
.datasource-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    gap: 16px;
}

/* 搜索框 */
.search-wrapper {
    position: relative;
    flex: 1;
    max-width: 400px;

    .search-input {
        width: 100%;
        height: 42px;
        padding: 0 16px 0 48px;
        border: 2px solid rgba(0, 0, 0, 0.08);
        border-radius: 12px;
        font-size: 14px;
        background: white;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;

        &:focus {
            outline: none;
            border-color: #1a1a1a;
            box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
        }

        &:hover {
            border-color: rgba(0, 0, 0, 0.15);
        }

        &::placeholder {
            color: rgba(0, 0, 0, 0.4);
        }
    }

    .search-icon {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        color: rgba(0, 0, 0, 0.4);
        pointer-events: none;
        transition: color 0.3s ease;
    }

    &:focus-within .search-icon {
        color: #1a1a1a;
    }
}

/* 添加按钮 */
.add-datasource-btn {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 18px;
    background: linear-gradient(135deg, #1a1a1a, #2d2d2d, #1a1a1a);
    background-size: 200% 200%;
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2),
        0 0 20px rgba(0, 0, 0, 0.1);
    animation: gradient-shift 3s ease infinite;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        transition: left 0.5s;
    }

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3),
            0 0 30px rgba(0, 0, 0, 0.15);
        background: linear-gradient(135deg, #2d2d2d, #404040, #2d2d2d);

        &::before {
            left: 100%;
        }

        svg {
            transform: rotate(90deg);
        }
    }

    &:active {
        transform: translateY(0);
    }

    svg {
        transition: transform 0.3s ease;
    }
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

/* 表格容器 */
.datasource-table-wrapper {
    flex: 1;
    background: white;
    border-radius: 16px;
    overflow: auto;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.06);
    display: flex;
    flex-direction: column;
    min-height: 0;
}

/* 表格 */
.datasource-table {
    width: 100%;
    border-collapse: collapse;

    thead {
        background: linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%);
        position: sticky;
        top: 0;
        z-index: 10;

        tr {
            th {
                padding: 16px 20px;
                text-align: left;
                font-size: 13px;
                font-weight: 600;
                color: white;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                border-bottom: 2px solid rgba(255, 255, 255, 0.1);

                &:first-child {
                    padding-left: 24px;
                }

                &:last-child {
                    padding-right: 24px;
                }
            }
        }
    }

    tbody {
        tr {
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            transition: all 0.2s ease;

            &:hover {
                background: rgba(0, 0, 0, 0.02);
                transform: translateX(2px);
            }

            &:last-child {
                border-bottom: none;
            }

            td {
                padding: 16px 20px;
                font-size: 14px;
                color: #2d2d2d;
                vertical-align: middle;

                &:first-child {
                    padding-left: 24px;
                }

                &:last-child {
                    padding-right: 24px;
                }
            }
        }
    }
}

/* 名称单元格 */
.name-cell {
    .name-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;

        .name-icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            flex-shrink: 0;
        }

        .name-text {
            font-weight: 500;
            color: #1a1a1a;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 200px;
        }
    }
}

/* 状态徽章 */
.status-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s ease;

    &.enabled {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }

    &.disabled {
        background: rgba(0, 0, 0, 0.08);
        color: rgba(0, 0, 0, 0.5);
    }
}

/* 类型标签 */
.type-tag {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    color: #1a1a1a;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(0, 0, 0, 0.08);
        border-color: rgba(0, 0, 0, 0.15);
    }
}

/* 应用范围 */
.scope-wrapper {
    display: inline-flex;
}

.scope-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s ease;
    cursor: pointer;

    &.global {
        background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
        color: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    &.project {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);

        &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }
    }
}

/* Tooltip映射列表样式 */
.tooltip-mapping-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 180px;
    max-width: 320px;
    max-height: 400px;
    overflow-y: hidden;
}

.mapping-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-sizing: border-box;
    overflow-y: hidden;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tooltip-title {
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.8px;
}

.mapping-items {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 180px;
    overflow-y: auto;
}

.mapping-item {
    font-size: 13px;
    color: white;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    transition: all 0.2s ease;
    border-left: 2px solid transparent;

    &:hover {
        background: rgba(255, 255, 255, 0.15);
        border-left-color: rgba(255, 255, 255, 0.4);
        border-top-left-radius: 0px;
        border-bottom-left-radius: 0px;
    }
}

/* 空状态 */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    color: rgba(0, 0, 0, 0.4);

    svg {
        margin-bottom: 16px;
        opacity: 0.5;
    }

    p {
        font-size: 14px;
        margin: 0;
    }
}

/* 分页器 */
.pagination-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px 0;
    margin-top: 16px;
}

/* 添加数据源表单 */
.add-datasource-form {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .form-label {
        font-size: 14px;
        font-weight: 500;
        color: #1a1a1a;
    }

    .form-input {
        width: 100%;
        height: 42px;
        padding: 0 16px;
        border: 2px solid rgba(0, 0, 0, 0.08);
        border-radius: 8px;
        font-size: 14px;
        background: white;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;

        &:focus {
            outline: none;
            border-color: #1a1a1a;
            box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
        }

        &:hover {
            border-color: rgba(0, 0, 0, 0.15);
        }

        &::placeholder {
            color: rgba(0, 0, 0, 0.4);
        }
    }
}
</style>
