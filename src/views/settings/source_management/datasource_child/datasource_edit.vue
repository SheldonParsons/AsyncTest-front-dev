<template>
    <div class="datasource-edit-page">
        <!-- 顶部操作栏 -->
        <div class="sticky-header">
            <motion.div class="back-btn" :whileHover="{ x: -3 }" :whileTap="{ scale: 0.97 }" @click="handleBack">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m15 18-6-6 6-6" />
                </svg>
                返回列表
            </motion.div>

            <div class="header-actions">
                <motion.div class="toggle-btn" :class="{ active: currentView === 'data' }" :whileHover="{ scale: 1.02 }"
                    :whileTap="{ scale: 0.98 }" @click="toggleView">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <path d="M21 9H3" />
                        <path d="M21 15H3" />
                    </svg>
                    {{ currentView === 'info' ? '查看数据' : '基础信息' }}
                </motion.div>

                <motion.div v-if="currentView === 'info'" class="save-btn" :whileHover="{ scale: 1.02 }"
                    :whileTap="{ scale: 0.98 }" @click="handleSaveWithAnimation">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                    </svg>
                    保存
                </motion.div>
            </div>
        </div>

        <!-- 滚动内容区 -->
        <div class="content-scroll no-scroll">
            <!-- 基础信息视图 -->
            <div v-if="currentView === 'info'" class="content-container">
                <!-- 卡片1: 基础信息 -->
                <motion.div class="info-card" :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
                    :transition="{ duration: 0.4, delay: 0, ease: [0.16, 1, 0.3, 1] }">

                    <div class="card-header">
                        <h3 class="card-title">基础信息</h3>
                        <span class="badge required">必填</span>
                    </div>

                    <div class="form-grid">
                        <!-- 数据源名称 -->
                        <div class="input-group">
                            <label class="label">数据源名称</label>
                            <el-input v-model="editableData.name" placeholder="请输入数据源名称" clearable />
                        </div>

                        <!-- 数据源类型 -->
                        <div class="input-group">
                            <label class="label">数据源类型</label>
                            <CustomRadio v-model="editableData.source_type" :items="sourceTypeOptions" />
                        </div>

                        <!-- 启用状态 -->
                        <div class="input-group">
                            <label class="label">启用状态</label>
                            <div class="switch-group">
                                <SimpleSwitch v-model="editableData.enable" :disabled="!canEdit || loading" />
                                <span class="switch-text">
                                    {{ editableData.enable ? '已启用' : '已禁用' }}
                                </span>
                            </div>
                        </div>

                        <!-- 备注 -->
                        <div class="input-group">
                            <label class="label">备注信息</label>
                            <el-input v-model="editableData.remark" placeholder="请输入备注信息（可选）" />
                        </div>
                    </div>
                </motion.div>

                <!-- 卡片2: 使用权限 -->
                <motion.div class="info-card" :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
                    :transition="{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }">

                    <div class="card-header">
                        <h3 class="card-title">使用权限</h3>
                    </div>

                    <!-- 全局/范围切换 -->
                    <div class="permission-toggle">
                        <CustomRadio v-model="readPermissionType" :items="readPermissionOptions"
                            :disabled="!canEdit || loading" />
                    </div>

                    <!-- 范围配置 -->
                    <ScopeConfig :show="!editableData.is_public_read"
                        v-model:project-ids="editableData.acl_read_project_ids"
                        v-model:user-ids="editableData.acl_read_user_ids" :project-list="projectList"
                        :user-list="userList" :user-search-loading="userSearchLoading"
                        :remote-search-users="searchUsers" :disabled="!canEdit || loading" project-label="可使用项目"
                        user-label="可使用用户" project-placeholder="选择项目" user-placeholder="搜索用户" />
                </motion.div>

                <!-- 卡片3: 编辑权限 -->
                <motion.div class="info-card" :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
                    :transition="{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">

                    <div class="card-header">
                        <h3 class="card-title">编辑权限</h3>
                    </div>

                    <!-- 全局/范围切换 -->
                    <div class="permission-toggle">
                        <CustomRadio v-model="editPermissionType" :items="editPermissionOptions"
                            :disabled="!canEdit || loading" />
                    </div>

                    <!-- 范围配置 -->
                    <ScopeConfig :show="!editableData.is_public_edit"
                        v-model:project-ids="editableData.acl_edit_project_ids"
                        v-model:user-ids="editableData.acl_edit_user_ids" :project-list="projectList"
                        :user-list="userList" :user-search-loading="userSearchLoading"
                        :remote-search-users="searchUsers" :disabled="!canEdit || loading" project-label="可编辑项目"
                        user-label="可编辑用户" project-placeholder="选择项目" user-placeholder="搜索用户" />
                </motion.div>
            </div>

            <!-- 数据视图 -->
            <div v-if="currentView === 'data'" class="data-view-container">
                <DataCore v-if="tableData" :data="tableData" :global="true" :can_edit="props.initialData.can_edit"
                    :env="{ name: 'ignore', table_id: props.initialData.table }" />
            </div>
        </div>

        <!-- 加载遮罩 -->
        <AnimatePresence>
            <motion.div v-if="loading" class="loading-overlay" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
                :exit="{ opacity: 0 }">
                <AstLoading />
            </motion.div>
        </AnimatePresence>

        <!-- 保存成功动画反馈 -->
        <AnimatePresence>
            <motion.div v-if="saveSuccess" class="success-overlay" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
                :exit="{ opacity: 0 }" :transition="{ duration: 0.3 }">

                <motion.div class="success-icon" :initial="{ scale: 0, rotate: -180 }"
                    :animate="{ scale: 1, rotate: 0 }" :transition="{
                        type: 'spring',
                        stiffness: 200,
                        damping: 15,
                        delay: 0.1
                    }">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </motion.div>

                <motion.div class="success-text" :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
                    :transition="{ delay: 0.3 }">
                    {{ isEdit ? '修改成功' : '创建成功' }}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import SimpleSwitch from '@/components/common/general/simple-switch.vue'
import CustomRadio from '@/components/common/general/radio.vue'
import ScopeConfig from './scope-config.vue'
import DataCore from '@/views/case/content/case_content/data/index.vue'
import { send_action } from '@/views/case/utils'
import {
    ApiGetGlobalDatasource,
    ApiUpdateGlobalDatasource,
    ApiPostGlobalDatasource,
    ApiGetGlobalProjectList,
    ApiGetGlobalUserList
} from '@/api/global/index'

// Props
const props = defineProps({
    datasourceId: {
        type: Number,
        default: null
    },
    isEdit: {
        type: Boolean,
        default: false
    },
    initialData: {
        type: Object,
        default: () => ({
            id: -1,
            name: '',
            source_type: 'table',
            enable: true,
            remark: '',
            table: -1,
            can_edit: false,
            is_public_read: true,
            acl_read_project_ids: [],
            acl_read_user_ids: [],
            is_public_edit: true,
            acl_edit_project_ids: [],
            acl_edit_user_ids: []
        })
    }
})

// Emits
const emit = defineEmits(['back', 'save'])

// ========== 状态管理 ==========
const loading = ref(false)
const saveSuccess = ref(false)
const datasourceData = ref<any>(null)
const projectList = ref<any[]>([])
const userList = ref<any[]>([])
const userSearchLoading = ref(false)
const currentView = ref<'info' | 'data'>('info')
const tableData = ref<any>(null)

const editableData = reactive({
    name: props.initialData.name || '',
    source_type: props.initialData.source_type || 'table',
    enable: props.initialData.enable ?? true,
    remark: props.initialData.remark || '',
    is_public_read: props.initialData.is_public_read ?? true,
    acl_read_project_ids: props.initialData.acl_read_project_ids || [],
    acl_read_user_ids: props.initialData.acl_read_user_ids || [],
    is_public_edit: props.initialData.is_public_edit ?? true,
    acl_edit_project_ids: props.initialData.acl_edit_project_ids || [],
    acl_edit_user_ids: props.initialData.acl_edit_user_ids || []
})

// ========== 选项配置 ==========
const sourceTypeOptions = [
    { key: 'table', value: '表格数据' }
]

const readPermissionOptions = [
    { key: 'read-public', value: '全局' },
    { key: 'read-scope', value: '范围' }
]

const editPermissionOptions = [
    { key: 'edit-public', value: '全局' },
    { key: 'edit-scope', value: '范围' }
]

// ========== 权限类型计算属性 ==========
const readPermissionType = computed({
    get: () => editableData.is_public_read ? 'read-public' : 'read-scope',
    set: (value: string) => {
        editableData.is_public_read = value === 'read-public'
    }
})

const editPermissionType = computed({
    get: () => editableData.is_public_edit ? 'edit-public' : 'edit-scope',
    set: (value: string) => {
        editableData.is_public_edit = value === 'edit-public'
    }
})

const canEdit = computed(() => {
    if (!props.isEdit) return true
    return props.initialData?.can_edit ?? false
})

// ========== 数据加载 ==========
async function loadDatasource() {
    if (!props.datasourceId) return

    loading.value = true
    try {
        const res: any = await ApiGetGlobalDatasource(props.datasourceId, {})
        datasourceData.value = res.data

        // 填充编辑数据
        editableData.name = res.data.name
        editableData.source_type = res.data.source_type
        editableData.enable = res.data.enable
        editableData.remark = res.data.remark || ''
        editableData.is_public_read = res.data.is_public_read
        editableData.acl_read_project_ids = res.data.acl_read_project_ids || []
        editableData.acl_read_user_ids = res.data.acl_read_user_ids || []
        editableData.is_public_edit = res.data.is_public_edit
        editableData.acl_edit_project_ids = res.data.acl_edit_project_ids || []
        editableData.acl_edit_user_ids = res.data.acl_edit_user_ids || []

        // 加载项目和用户映射数据
        if (res.data.read_mapping?.projects) {
            projectList.value = [...projectList.value, ...res.data.read_mapping.projects]
        }
        if (res.data.edit_mapping?.projects) {
            projectList.value = [...projectList.value, ...res.data.edit_mapping.projects]
        }
        if (res.data.read_mapping?.users) {
            userList.value = [...userList.value, ...res.data.read_mapping.users]
        }
        if (res.data.edit_mapping?.users) {
            userList.value = [...userList.value, ...res.data.edit_mapping.users]
        }

        // 去重
        projectList.value = Array.from(new Map(projectList.value.map(item => [item.id, item])).values())
        userList.value = Array.from(new Map(userList.value.map(item => [item.id, item])).values())
    } catch (error: any) {
        window.$toast({ title: error.message || '加载数据源失败', type: 'error' })
    } finally {
        loading.value = false
    }
}

async function loadProjects() {
    try {
        const res: any = await ApiGetGlobalProjectList({})
        projectList.value = res || []
    } catch (error: any) {
        window.$toast({ title: error.message || '加载项目列表失败', type: 'error' })
    }
}

async function loadUsers() {
    try {
        const res: any = await ApiGetGlobalUserList({})
        userList.value = res || []
    } catch (error: any) {
        window.$toast({ title: error.message || '加载用户列表失败', type: 'error' })
    }
}

async function searchUsers(query: string) {
    if (!query) return

    userSearchLoading.value = true
    try {
        // TODO: 实现用户搜索
        // 等待用户提供 API 接口
        // const res = await ApiSearchUsers({ keyword: query })
        // userList.value = res.data
    } catch (error: any) {
        window.$toast({ title: error.message || '搜索用户失败', type: 'error' })
    } finally {
        userSearchLoading.value = false
    }
}

// ========== 交互处理 ==========
function handleBack() {
    emit('back')
}

async function toggleView() {
    if (currentView.value === 'info') {
        // 切换到数据视图
        currentView.value = 'data'
        await getTableData()
    } else {
        // 切换回基础信息视图
        currentView.value = 'info'
    }
}

async function getTableData() {
    if (!props.initialData.table || props.initialData.table === -1) {
        window.$toast({ title: '该数据源没有关联的表格数据', type: 'warning' })
        return
    }

    loading.value = true
    try {
        const _data = {
            type: 1,
            child_action_type: 'get_table',
            content: {
                table_id: props.initialData.table
            }
        }
        const result = await send_action(_data)
        tableData.value = result
        window.$toast({ title: '数据已加载。' })
    } catch (error: any) {
        window.$toast({ title: error.message || '加载表格数据失败', type: 'error' })
        currentView.value = 'info'
    } finally {
        loading.value = false
    }
}

async function handleSaveWithAnimation() {
    if (!canEdit.value) {
        window.$toast({ title: '您无权更新' })
        return
    }
    if (loading.value) {
        window.$toast({ title: '请勿重复提交' })
        return
    }

    // 验证必填字段
    if (!editableData.name?.trim()) {
        window.$toast({ title: '请输入数据源名称' })
        return
    }

    if (!editableData.source_type) {
        window.$toast({ title: '请选择数据源类型' })
        return
    }

    loading.value = true
    try {
        const saveData = {
            name: editableData.name,
            source_type: editableData.source_type,
            enable: editableData.enable,
            remark: editableData.remark,
            is_public_read: editableData.is_public_read,
            acl_read_project_ids: editableData.is_public_read ? [] : editableData.acl_read_project_ids,
            acl_read_user_ids: editableData.is_public_read ? [] : editableData.acl_read_user_ids,
            is_public_edit: editableData.is_public_edit,
            acl_edit_project_ids: editableData.is_public_edit ? [] : editableData.acl_edit_project_ids,
            acl_edit_user_ids: editableData.is_public_edit ? [] : editableData.acl_edit_user_ids
        }

        if (props.isEdit) {
            await ApiUpdateGlobalDatasource(props.initialData.id, {}, saveData)
            window.$toast({ title: '保存成功', type: 'success' })
        } else {
            const res: any = await ApiPostGlobalDatasource(saveData, {})
            window.$toast({ title: '创建成功', type: 'success' })
            emit('save', res.data)
        }

        // 显示成功动画
        saveSuccess.value = true
        setTimeout(() => {
            saveSuccess.value = false
            emit('save')
        }, 1500)

    } catch (error: any) {
        window.$toast({ title: error.message || '保存失败', type: 'error' })
    } finally {
        loading.value = false
    }
}

// ========== 生命周期 ==========
onMounted(async () => {
    await Promise.all([loadProjects(), loadUsers()])
    await loadDatasource()
})
</script>

<style lang="scss" scoped>
// ========== 页面容器 ==========
.datasource-edit-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

// ========== 顶部操作栏 ==========
.sticky-header {
    position: sticky;
    top: 0;
    z-index: 100;
    padding: 12px 20px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

// 返回按钮
.back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #333;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(0, 0, 0, 0.04);
        border-color: rgba(0, 0, 0, 0.15);
    }

    svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
    }
}

// 保存按钮
.save-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: white;
    background: #1a1a1a;
    border: 1px solid #2d2d2d;
    transition: all 0.2s ease;

    &:hover:not(.disabled) {
        background: #2d2d2d;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        transform: translateY(-1px);
    }

    &.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
    }

    svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
    }
}

// 切换按钮
.toggle-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #333;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.1);
    transition: none;

    &:hover {
        background: rgba(0, 0, 0, 0.04);
        border-color: rgba(0, 0, 0, 0.15);
    }

    &.active {
        background: #1a1a1a;
        color: white;
        border-color: #2d2d2d;

        &:hover {
            background: #2d2d2d;
        }
    }

    svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
    }
}

// ========== 滚动内容区 ==========
.content-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.content-container {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

// ========== 信息卡片 ==========
.info-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    transition: all 0.2s ease;

    &:hover {
        border-color: rgba(0, 0, 0, 0.12);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    }
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.card-title {
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
}

.badge {
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;

    &.required {
        background: #ef4444;
        color: white;
    }
}

// ========== 表单网格布局 ==========
.form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .label {
        font-size: 13px;
        font-weight: 500;
        color: #555;
    }

    // Element Plus 输入框美化
    :deep(.el-input) {
        .el-input__wrapper {
            background: white;
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            padding: 1px 12px;
            transition: all 0.2s ease;
            box-shadow: none;

            &:hover {
                border-color: rgba(0, 0, 0, 0.2);
            }

            &.is-focus {
                border-color: #1a1a1a;
                box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
            }

            &.is-disabled {
                background: white;
                opacity: 0.6;
            }
        }

        .el-input__inner {
            font-size: 13px;
            height: 32px;
        }
    }

    // Element Plus 选择器美化
    :deep(.el-select) {
        .el-select__wrapper {
            background: #fafafa;
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            transition: all 0.2s ease;
            box-shadow: none;
            min-height: 34px;

            &:hover {
                border-color: rgba(0, 0, 0, 0.2);
                background: #fff;
            }

            &.is-focused {
                border-color: #1a1a1a;
                background: white;
                box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
            }
        }

        .el-select__placeholder {
            font-size: 13px;
        }

        .el-select__selected-item {
            font-size: 13px;
        }
    }
}

// ========== 单选框选项样式 ==========
.radio-option {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    background: #fafafa;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid rgba(0, 0, 0, 0.08);

    &:hover {
        background: #f5f5f5;
        border-color: rgba(0, 0, 0, 0.12);
    }

    :deep(.el-radio) {
        width: 100%;

        .el-radio__label {
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
        }

        &.is-checked {
            .el-radio__inner {
                background-color: #10b981;
                border-color: #10b981;
            }
        }
    }

    .radio-label {
        font-weight: 500;
        color: #1a1a1a;
    }

    .hint {
        font-size: 12px;
        color: #999;
        font-weight: 400;
        margin-left: auto;
    }
}

// ========== Switch 开关组 ==========
.switch-group {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: #fafafa;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    transition: all 0.2s;

    &:hover {
        background: #f5f5f5;
    }

    .switch-text {
        font-size: 13px;
        font-weight: 500;
        color: #666;
    }
}

// ========== 权限配置区 ==========
.permission-toggle {
    margin-bottom: 12px;

    // 覆盖CustomRadio组件样式以适配黑色主题
    :deep(.radio-container) {
        .label {
            color: #333;
            font-size: 13px;
        }

        .radio-item {
            background-color: #fafafa;
            border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .dot {
            background-color: #1a1a1a;
        }

        .border {
            border-color: #1a1a1a;
        }
    }
}

// ========== 加载遮罩 ==========
.loading-overlay {
    position: fixed;
    inset: 0;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

// ========== 保存成功动画 ==========
.success-overlay {
    position: fixed;
    inset: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    z-index: 1001;
}

.success-icon {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

    svg {
        width: 32px;
        height: 32px;
    }
}

.success-text {
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
}

// ========== 响应式设计 ==========
@media (max-width: 768px) {
    .content-container {
        max-width: 100%;
        padding: 0;
    }

    .form-grid {
        grid-template-columns: 1fr;
        gap: 12px;
    }

    .scope-grid {
        grid-template-columns: 1fr;
        gap: 10px;
    }

    .sticky-header {
        padding: 10px 12px;

        .back-btn,
        .save-btn {
            font-size: 12px;
            padding: 6px 12px;
        }
    }

    .info-card {
        border-radius: 10px;
        padding: 16px;
    }

    .content-scroll {
        padding: 12px;
    }
}

// ========== Element Plus 全局样式覆盖 ==========
:deep(.el-radio) {
    margin-right: 0;

    .el-radio__label {
        font-size: 13px;
        font-weight: 500;
    }

    .el-radio__inner {
        transition: all 0.2s ease;
        width: 16px;
        height: 16px;
    }
}

:deep(.el-input__inner) {
    font-size: 13px;
}

:deep(.el-select__placeholder) {
    color: #999;
    font-size: 13px;
}

// 下拉选项美化
:deep(.el-select-dropdown) {
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);

    .el-select-dropdown__item {
        border-radius: 4px;
        margin: 2px 6px;
        padding: 8px 12px;
        font-size: 13px;
        transition: all 0.2s;

        &:hover {
            background: #f5f5f5;
        }

        &.is-selected {
            background: #1a1a1a;
            color: white;
            font-weight: 500;
        }
    }
}

// ========== 数据视图 ==========
.data-view-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.data-loading {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
