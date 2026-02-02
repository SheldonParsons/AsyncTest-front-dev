<template>
    <TagsInputRoot
        v-model="tagsModel"
        class="tags-input-root"
        :delimiter="''"
        :disabled="disabled"
    >
        <div class="tags-container" :class="{ 'is-disabled': disabled }">
            <TagsInputItem
                v-for="item in tagsModel"
                :key="item"
                :value="item"
                class="tag-item"
                @click.stop
            >
                <div class="tag-content">
                    <img
                        v-if="isUserComponent"
                        :src="getAvatarUrl(item)"
                        @error="handleImageError"
                        class="tag-avatar"
                        alt="avatar"
                    />
                    <span class="tag-text">{{ getLabelById(item) }}</span>
                </div>

                <TagsInputItemDelete v-if="!disabled" class="tag-delete" @click.stop>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </TagsInputItemDelete>
            </TagsInputItem>

            <TagsInputInput
                class="tags-input-field"
                :placeholder="modelValue.length === 0 ? placeholder : ''"
                readonly
                @click="!disabled && handleOpenDialog()"
            />
        </div>
    </TagsInputRoot>

    <DialogAnimation
        ref="dialogRef"
        :title="placeholder"
        confirm_title="确定"
        cancel_title="取消"
        bgtype="white"
    >
        <div class="dialog-content-wrapper">
            <div class="dialog-header">
                <div class="dialog-search">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="search-icon">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                        v-model="dialogSearchTerm"
                        type="text"
                        placeholder="搜索..."
                        class="dialog-search-input"
                        @click.stop
                    />
                </div>

                <div class="select-all-wrapper">
                    <div
                        class="select-all-btn"
                        :class="{ 'is-all-selected': isAllSelected }"
                        @click="toggleSelectAll"
                    >
                        <div class="checkbox-box">
                            <svg v-if="isAllSelected" xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round" class="check-icon">
                                <path d="M20 6 9 17l-5-5" />
                            </svg>
                        </div>
                        <span class="select-all-text">全选</span>
                    </div>
                    <div class="selected-count">已选 {{ tempSelectedIds.length }} 项</div>
                </div>
            </div>

            <div class="options-list">
                <div
                    v-for="opt in filteredDialogOptions"
                    :key="opt[valueKey]"
                    class="option-item"
                    :class="{ 'is-selected': tempSelectedIds.includes(opt[valueKey]) }"
                    @click="toggleSelection(opt[valueKey])"
                >
                    <div class="checkbox-box">
                        <svg v-if="tempSelectedIds.includes(opt[valueKey])" xmlns="http://www.w3.org/2000/svg"
                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-icon">
                            <path d="M20 6 9 17l-5-5" />
                        </svg>
                    </div>

                    <img
                        v-if="isUserComponent"
                        :src="getAvatarUrl(opt[valueKey])"
                        @error="handleImageError"
                        class="option-avatar"
                        alt=""
                    />

                    <span class="option-label">{{ opt[displayKey] }}</span>
                </div>

                <div v-if="filteredDialogOptions.length === 0" class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"
                        class="empty-icon">
                        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                        <path
                            d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                    </svg>
                    <div class="empty-text">没有找到匹配项</div>
                </div>
            </div>
        </div>
    </DialogAnimation>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
    TagsInputRoot,
    TagsInputItem,
    TagsInputItemDelete,
    TagsInputInput,
} from 'reka-ui'
// 务必确认这个路径是正确的，并且指向的是那个 Dialog 组件文件，而不是当前文件！
import DialogAnimation from '@/components/common/general/dialog.vue'

// --- Props ---
interface Props {
    options: Record<string, any>[]
    modelValue?: (string | number)[]
    displayKey?: string
    valueKey?: string,
    isUserComponent?: boolean,
    placeholder: string,
    disabled?: boolean,
    loading?: boolean,
    remoteSearch?: (query: string) => void
}

const props = withDefaults(defineProps<Props>(), {
    options: () => [],
    modelValue: () => [],
    displayKey: 'name',
    valueKey: 'id', // 假设 ID 可能是 number
    isUserComponent: false,
    placeholder: '请选择...',
    disabled: false,
    loading: false,
    remoteSearch: undefined
})

const emit = defineEmits(['update:modelValue'])

// --- 状态 ---
// 使用 any 解决类型推断错误，或者使用 InstanceType<typeof DialogAnimation>
const dialogRef = ref<any>(null)
const tempSelectedIds = ref<(string | number)[]>([])
const dialogSearchTerm = ref('')

// --- 修复 1: 类型转换 computed ---
// Reka UI 强制要求 string[]，但我们需要维护 number[] 的 ID
const tagsModel = computed({
    get: () => {
        // 将 ID (number/string) 全部转为 string 给 UI 显示
        return props.modelValue.map(String)
    },
    set: (newVal: string[]) => {
        // 当 UI 删除标签时，newVal 是剩下的 string ID 数组
        // 我们需要尽量保持原始类型。如果原始数据里是 number，我们转回 number
        const convertedIds = newVal.map(idStr => {
            // 简单的判断：如果原始数据里存在 number，则尝试转回 number
            // 或者简单粗暴地：如果看起来是数字，就转数字
            return /^\d+$/.test(idStr) ? Number(idStr) : idStr
        })
        emit('update:modelValue', convertedIds)
    }
})

// --- 辅助逻辑 ---

const filteredDialogOptions = computed(() => {
    if (!dialogSearchTerm.value) return props.options
    const term = dialogSearchTerm.value.toLowerCase()
    return props.options.filter(opt =>
        String(opt[props.displayKey]).toLowerCase().includes(term)
    )
})

const isAllSelected = computed(() => {
    if (filteredDialogOptions.value.length === 0) return false
    return filteredDialogOptions.value.every(opt =>
        tempSelectedIds.value.includes(opt[props.valueKey])
    )
})

async function handleOpenDialog() {
    tempSelectedIds.value = [...props.modelValue]
    dialogSearchTerm.value = ''

    if (dialogRef.value) {
        const result = await dialogRef.value.open()
        if (result && result.action === 'comfirm') {
            handleConfirm()
        }
    }
}

function toggleSelection(id: string | number) {
    const index = tempSelectedIds.value.indexOf(id)
    if (index > -1) {
        tempSelectedIds.value.splice(index, 1)
    } else {
        tempSelectedIds.value.push(id)
    }
}

function toggleSelectAll() {
    if (isAllSelected.value) {
        // 取消全选：移除当前过滤列表中的所有项
        const currentIds = filteredDialogOptions.value.map(opt => opt[props.valueKey])
        tempSelectedIds.value = tempSelectedIds.value.filter(id => !currentIds.includes(id))
    } else {
        // 全选：添加当前过滤列表中的所有项
        const currentIds = filteredDialogOptions.value.map(opt => opt[props.valueKey])
        const newIds = currentIds.filter(id => !tempSelectedIds.value.includes(id))
        tempSelectedIds.value.push(...newIds)
    }
}

function handleConfirm() {
    emit('update:modelValue', [...tempSelectedIds.value])
}

// 兼容 string/number 的查找
function getLabelById(id: string | number) {
    // 因为 tagsModel 传进来的是 string，但 options 里可能是 number
    // 所以统一转成 string 对比
    const item = props.options.find(opt => String(opt[props.valueKey]) === String(id))
    return item ? item[props.displayKey] : id
}

const getAvatarUrl = (id: string | number) => {
    return `https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/${id}.png`
}

const handleImageError = (e: Event) => {
    const img = e.target as HTMLImageElement
    img.style.display = 'none'
}
</script>

<style lang="scss" scoped>
.tags-input-root {
    width: 100%;
    font-family: inherit;
}

.tags-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 6px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    background: white;
    min-height: 36px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: rgba(0, 0, 0, 0.2);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    &.is-disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background: #f5f5f5;

        &:hover {
            border-color: rgba(0, 0, 0, 0.1);
            box-shadow: none;
        }
    }
}

.tag-item {
    display: flex;
    align-items: center;
    gap: 4px;
    color: white;
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    user-select: none;
    transition: all 0.2s ease;

    &:hover {
        background: linear-gradient(135deg, #2d2d2d 0%, #404040 100%);
        transform: translateY(-1px);
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
    }

    &[data-state='active'] {
        background: linear-gradient(135deg, #404040 0%, #4d4d4d 100%);
    }
}

.tag-content {
    display: flex;
    align-items: center;
}

.tag-avatar {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    margin-right: 4px;
    object-fit: cover;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.tag-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    margin-left: 2px;
    border-radius: 4px;
    background-color: transparent;
    border: none;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.7);
    transition: all 0.2s ease;

    &:hover {
        color: white;
        background-color: rgba(255, 255, 255, 0.2);
    }
}

.tags-input-field {
    flex: 1;
    min-width: 80px;
    border: none;
    background: transparent;
    font-size: 13px;
    color: transparent;
    text-shadow: 0 0 0 #333;
    padding: 4px;
    cursor: pointer;

    &:focus {
        outline: none;
    }

    &::placeholder {
        color: #999;
    }
}

.dialog-content-wrapper {
    display: flex;
    flex-direction: column;
    height: 400px;
}

.dialog-header {
    flex-shrink: 0;
    margin-bottom: 16px;
}

.dialog-search {
    position: relative;
    margin-bottom: 12px;
}

.search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
    font-size: 16px;
}

.dialog-search-input {
    width: 100%;
    height: 40px;
    padding: 0 16px 0 40px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
    background: #fafafa;

    &:focus {
        border-color: #1a1a1a;
        background: white;
        box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
    }
}

.select-all-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.06);
}

.select-all-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(0, 0, 0, 0.04);
    }

    &.is-all-selected {
        .checkbox-box {
            background-color: #1a1a1a;
            border-color: #1a1a1a;
        }
    }
}

.select-all-text {
    font-size: 13px;
    font-weight: 500;
    color: #333;
}

.selected-count {
    font-size: 12px;
    color: #666;
    padding: 4px 10px;
    background: white;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.08);
}

.options-list {
    flex: 1;
    overflow-y: auto;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 8px;
    padding: 6px;
    background: #fafafa;
}

.option-item {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.15s ease;
    margin-bottom: 4px;
    background: white;
    border: 1px solid transparent;

    &:hover {
        background: #f5f5f5;
        border-color: rgba(0, 0, 0, 0.08);
        transform: translateX(2px);
    }

    &.is-selected {
        background: #f0f0f0;
        border-color: #1a1a1a;

        .checkbox-box {
            background-color: #1a1a1a;
            border-color: #1a1a1a;
        }
    }
}

.checkbox-box {
    width: 18px;
    height: 18px;
    border: 2px solid #ccc;
    border-radius: 4px;
    margin-right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    flex-shrink: 0;
    transition: all 0.2s ease;
}

.check-icon {
    color: white;
    font-size: 12px;
    display: none;

    .is-selected &,
    .is-all-selected & {
        display: block;
    }
}

.option-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    margin-right: 12px;
    object-fit: cover;
    background: #eee;
    border: 2px solid rgba(0, 0, 0, 0.08);
}

.option-label {
    font-size: 14px;
    color: #333;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: #999;
}

.empty-icon {
    font-size: 48px;
    color: #ddd;
    margin-bottom: 12px;
}

.empty-text {
    font-size: 14px;
    color: #999;
}
</style>