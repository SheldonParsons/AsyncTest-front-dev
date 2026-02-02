<template>
    <div class="global-datasource">
        <div class="datasource-label">全局数据源</div>
        <div class="datasource-content">
            <div class="datasource-tags">
                <div v-for="table in modelValue" :key="table" class="datasource-tag"
                    :class="{ 'tag-invalid': !isValidDatasource(table) }">
                    <span class="tag-text">{{ getDatasourceName(table) }}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="tag-close" @click="removeDatasource(table)">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </div>
                <div class="add-btn" @click="openDialog">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                    </svg>
                </div>
            </div>
        </div>
    </div>

    <DialogAnimation ref="dialogRef" title="选择全局数据源" confirm_title="确定" cancel_title="取消" bgtype="white" :topMove="'-5% !important'">
        <div class="dialog-content">
            <div class="datasource-list">
                <div v-for="item in datasourceList" :key="item.table" class="datasource-item"
                    :class="{ 'item-selected': tempSelected.includes(item.table) }" @click="toggleSelect(item.table)">
                    <div class="checkbox-box">
                        <svg v-if="tempSelected.includes(item.table)" xmlns="http://www.w3.org/2000/svg" width="12"
                            height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round" class="check-icon">
                            <path d="M20 6 9 17l-5-5" />
                        </svg>
                    </div>
                    <div class="item-info">
                        <div class="item-name">{{ item.name }}</div>
                        <div class="item-meta">
                            <span class="item-type">{{ item.source_type === 'table' ? '表格' : item.source_type }}</span>
                            <span class="item-creator">创建人: {{ item.create_by }}</span>
                        </div>
                    </div>
                </div>
                <div v-if="datasourceList.length === 0" class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                        <ellipse cx="12" cy="5" rx="9" ry="3" />
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                    </svg>
                    <div class="empty-text">暂无可用数据源</div>
                </div>
            </div>
        </div>
    </DialogAnimation>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DialogAnimation from '@/components/common/general/dialog.vue'
import { ApiGetGlobalDatasourceSimple } from '@/api/global/index'

const props = defineProps({
    modelValue: {
        type: Array as () => number[],
        default: () => []
    }
})

const emit = defineEmits(['update:modelValue'])

const dialogRef = ref<any>(null)
const datasourceList = ref<any[]>([])
const tempSelected = ref<number[]>([])

onMounted(async () => {
    await loadDatasources()
})

async function loadDatasources() {
    try {
        const res: any = await ApiGetGlobalDatasourceSimple({})
        datasourceList.value = res || []
    } catch (error: any) {
        window.$toast({ title: error.message || '加载数据源失败', type: 'error' })
    }
}

function getDatasourceName(id: number): string {
    const datasource = datasourceList.value.find(item => item.table === id)
    if (datasource) {
        return datasource.name
    }
    return `数据源不存在 (ID: ${id})`
}

function isValidDatasource(id: number): boolean {
    return datasourceList.value.some(item => item.table === id)
}

function removeDatasource(id: number) {
    const newValue = props.modelValue.filter(item => item !== id)
    emit('update:modelValue', newValue)
}

async function openDialog() {
    tempSelected.value = [...props.modelValue]
    const result = await dialogRef.value.open()
    if (result && result.action === 'comfirm') {
        emit('update:modelValue', [...tempSelected.value])
    }
}

function toggleSelect(id: number) {
    const index = tempSelected.value.indexOf(id)
    if (index > -1) {
        tempSelected.value.splice(index, 1)
    } else {
        tempSelected.value.push(id)
    }
}
</script>

<style lang="scss" scoped>
.global-datasource {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
}

.datasource-label {
    font-size: 14px;
    font-weight: 500;
    color: black;
    white-space: nowrap;
    padding-top: 8px;
}

.datasource-content {
    flex: 1;
}

.datasource-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.datasource-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    color: white;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
        background: linear-gradient(135deg, #2d2d2d 0%, #404040 100%);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    &.tag-invalid {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);

        .tag-text {
            font-style: italic;
        }
    }
}

.tag-text {
    user-select: none;
}

.tag-close {
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s ease;

    &:hover {
        opacity: 1;
    }
}

.add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(0, 0, 0, 0.04);
        border-color: rgba(0, 0, 0, 0.2);
        transform: scale(1.05);
    }

    svg {
        color: #333;
    }
}

.dialog-content {
    min-width: 500px;
    width: 100%;
    max-height: 60vh;
    display: flex;
    flex-direction: column;
}

.datasource-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    padding: 4px;
    flex: 1;
}

.datasource-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &:hover {
        background: #f5f5f5;
        border-color: rgba(0, 0, 0, 0.15);
        transform: translateX(2px);
    }

    &.item-selected {
        background: #f0f0f0;
        border-color: #1a1a1a;

        .checkbox-box {
            background-color: #1a1a1a;
            border-color: #1a1a1a;
        }
    }
}

.checkbox-box {
    width: 16px;
    height: 16px;
    border: 2px solid #ccc;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    flex-shrink: 0;
    transition: all 0.2s ease;
}

.check-icon {
    color: white;
}

.item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}

.item-name {
    font-size: 13px;
    font-weight: 500;
    color: #1a1a1a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    color: #666;
}

.item-type {
    padding: 1px 6px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 3px;
    font-weight: 500;
    font-size: 11px;
}

.item-creator {
    color: #999;
    font-size: 11px;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: rgba(0, 0, 0, 0.4);

    svg {
        margin-bottom: 16px;
        opacity: 0.5;
    }
}

.empty-text {
    font-size: 14px;
}
</style>
