<template>
    <DropdownMenuRoot v-model:open="toggleState">
        <DropdownMenuTrigger class="cascade-trigger" :class="{ 'small': size === 'small' }">
            <div class="cascade-trigger-content">
                <span class="cascade-trigger-text"
                    :class="{ 'placeholder': !selectedPath.length }">
                    <template v-if="lastSelectedNode && isLeaf(lastSelectedNode)">
                        {{ lastSelectedNode.label }}({{ lastSelectedNode.value }})
                    </template>
                    <template v-else-if="selectedPath.length">
                        {{ displayText }}
                    </template>
                    <template v-else>
                        {{ placeholder }}
                    </template>
                </span>
                <svg class="cascade-trigger-icon" :class="{ 'open': toggleState }" width="12" height="12"
                    viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                        stroke-linejoin="round" />
                </svg>
            </div>
        </DropdownMenuTrigger>
        <DropdownMenuPortal :to="'.params-special-k11'">
            <AnimatePresence>
                <DropdownMenuContent v-if="toggleState" asChild :sideOffset="5">
                    <motion.div
                        class="cascade-menu-shell cascade-menu-surface"
                        :initial="{ opacity: 0, y: -8 }"
                        :animate="{ opacity: 1, y: 0 }"
                        :exit="{ opacity: 0, y: -8 }"
                        :transition="{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }"
                        @pointerdown.capture.stop
                        @mousedown.capture.stop
                        @click.capture.stop
                    >
                        <div class="cascade-menu-content" ref="panelEl">
                            <template v-for="item in options" :key="item.value">
                                <DropdownMenuSub v-if="item.children?.length">
                                    <DropdownMenuSubTrigger class="cascade-menu-item"
                                        :class="{ 'selected': getSelectedAtLevel(0) === item.value }">
                                        <span>{{ item.label }}</span>
                                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
                                            xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95694 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95694 3.32394 6.1584 3.13508Z"
                                                fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" />
                                        </svg>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal :to="'.params-special-k11'">
                                        <AnimatePresence>
                                            <DropdownMenuSubContent asChild :sideOffset="8">
                                                <motion.div
                                                    class="cascade-menu-content cascade-menu-sub"
                                                    :initial="{ opacity: 0, x: -8 }"
                                                    :animate="{ opacity: 1, x: 0 }"
                                                    :exit="{ opacity: 0, x: -8 }"
                                                    :transition="{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }"
                                                >
                                                    <!-- 第二级菜单项 -->
                                                    <DropdownMenuItem
                                                        v-for="child in item.children"
                                                        :key="child.value"
                                                        class="cascade-menu-item"
                                                        :class="{ 'selected': getSelectedAtLevel(1) === child.value }"
                                                        @select="selectItem(child, 1)"
                                                    >
                                                        <span v-if="isLeaf(child)">{{ child.label }}({{ child.value }})</span>
                                                        <span v-else>{{ child.label }}</span>
                                                    </DropdownMenuItem>
                                                </motion.div>
                                            </DropdownMenuSubContent>
                                        </AnimatePresence>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>

                                <!-- 无子项的菜单 -->
                                <DropdownMenuItem v-else class="cascade-menu-item"
                                    :class="{ 'selected': getSelectedAtLevel(0) === item.value }"
                                    @select="selectItem(item, 0)">
                                    <span>{{ item.label }}({{ item.value }})</span>
                                </DropdownMenuItem>
                            </template>
                        </div>
                    </motion.div>
                </DropdownMenuContent>
            </AnimatePresence>
        </DropdownMenuPortal>
    </DropdownMenuRoot>
</template>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import {
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuRoot,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from 'reka-ui'
import { ref, computed, watch, onBeforeUnmount, onMounted, shallowRef } from 'vue'

interface CascadeOption {
    value: string
    label: string
    children?: CascadeOption[]
}

const props = defineProps({
    modelValue: {
        type: Array as () => string[],
        default: () => []
    },
    options: {
        type: Array as () => CascadeOption[],
        default: () => []
    },
    placeholder: {
        type: String,
        default: '请选择'
    },
    size: {
        type: String,
        default: 'default'
    }
})

const emit = defineEmits<{
    'update:modelValue': [value: string[]]
    'change': [value: string[]]
}>()

const toggleState = ref(false)
const panelEl = shallowRef<HTMLElement | null>(null)

// 修复问题1：正确初始化 selectedPath
const selectedPath = ref<string[]>([])

// 初始化时同步 modelValue
watch(() => props.modelValue, (newVal) => {
    if (JSON.stringify(newVal) !== JSON.stringify(selectedPath.value)) {
        selectedPath.value = [...newVal]
    }
}, { immediate: true, deep: true })

// 性能优化：缓存节点查找结果
const nodeCache = new Map<string, CascadeOption>()

function findNodeByPath(path: string[]): CascadeOption | null {
    if (!path.length) return null

    const cacheKey = path.join('|')
    if (nodeCache.has(cacheKey)) {
        return nodeCache.get(cacheKey)!
    }

    let current: CascadeOption[] = props.options
    let node: CascadeOption | null = null

    for (const value of path) {
        const found = current.find(item => item.value === value)
        if (!found) return null

        node = found
        current = found.children || []
    }

    if (node) {
        nodeCache.set(cacheKey, node)
    }

    return node
}

// 清除缓存当 options 变化时
watch(() => props.options, () => {
    nodeCache.clear()
}, { deep: true })

// 计算显示文本 - 优化性能
const displayText = computed(() => {
    if (!selectedPath.value.length) {
        return props.placeholder
    }

    let current: CascadeOption[] = props.options
    const labels: string[] = []

    for (const value of selectedPath.value) {
        const found = current.find(item => item.value === value)
        if (found) {
            labels.push(found.label)
            current = found.children || []
        } else {
            break
        }
    }

    return labels.length ? labels.join(' / ') : props.placeholder
})

// 获取最后选中的节点信息（用于显示）
const lastSelectedNode = computed(() => {
    return findNodeByPath(selectedPath.value)
})

// 判断是否是叶子节点 - 内联优化
const isLeaf = (item: CascadeOption): boolean => {
    return !item.children?.length
}

// 获取当前层级的选中值 - 内联优化
const getSelectedAtLevel = (level: number): string | null => {
    return selectedPath.value[level] || null
}

// 选择项目
function selectItem(item: CascadeOption, level: number) {
    const newPath = selectedPath.value.slice(0, level)
    newPath.push(item.value)

    selectedPath.value = newPath

    // 如果没有子项，则完成选择并关闭菜单
    if (isLeaf(item)) {
        emit('update:modelValue', newPath)
        emit('change', newPath)
        toggleState.value = false
    }
}

// 优化问题3：使用事件委托和防抖优化点击监听
let clickCheckTimer: number | null = null
const CLICK_CHECK_DELAY = 0 // 立即检查，但使用 RAF 优化

function onDocDownCapture(e: Event) {
    if (!toggleState.value) return

    // 使用 requestAnimationFrame 优化性能
    if (clickCheckTimer !== null) {
        cancelAnimationFrame(clickCheckTimer)
    }

    clickCheckTimer = requestAnimationFrame(() => {
        const target = e.target as Node | null
        if (!target) return

        // 优化：直接查找最近的菜单元素
        const targetElement = target as HTMLElement
        const isInMenu = targetElement.closest('.cascade-menu-shell') ||
                        targetElement.closest('.cascade-menu-sub') ||
                        targetElement.closest('.cascade-trigger')

        if (isInMenu) return

        // 点在面板外：关闭下拉
        toggleState.value = false

        // 阻止事件传播
        e.stopPropagation()
        ;(e as any).stopImmediatePropagation?.()
    })
}

// 优化：使用 passive 监听器提升滚动性能
const listenerOptions = { capture: true, passive: false }

onMounted(() => {
    document.addEventListener('pointerdown', onDocDownCapture, listenerOptions)
    document.addEventListener('mousedown', onDocDownCapture, listenerOptions)
})

onBeforeUnmount(() => {
    if (clickCheckTimer !== null) {
        cancelAnimationFrame(clickCheckTimer)
    }
    document.removeEventListener('pointerdown', onDocDownCapture, listenerOptions)
    document.removeEventListener('mousedown', onDocDownCapture, listenerOptions)
})
</script>

<style lang="scss" scoped>
.cascade-trigger {
    width: 100%;
    padding: 8px 12px;
    background-color: #fff;
    border: 1px solid #dcdfe6;
    border-radius: 5px;
    cursor: pointer;
    transition: border-color 0.2s ease;
    outline: none;

    &:hover {
        border-color: #c0c4cc;
    }

    &:focus {
        border-color: black;
    }

    &.small {
        padding: 5px 8px;
        font-size: 13px;
    }
}

.cascade-trigger-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.cascade-trigger-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    color: #606266;

    &.placeholder {
        color: #c0c4cc;
    }
}

.cascade-trigger-icon {
    flex-shrink: 0;
    margin-left: 8px;
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    color: #909399;

    &.open {
        transform: rotate(180deg);
    }
}

.cascade-menu-shell {
    position: relative;
    box-sizing: border-box;
    min-width: 180px;
    max-height: 300px;

    /* 优化问题2：GPU 加速 */
    will-change: transform, opacity;
    transform: translateZ(0);
    backface-visibility: hidden;
    -webkit-font-smoothing: antialiased;
}

.cascade-menu-content {
    box-sizing: border-box;
    max-height: 300px;
    overflow-y: auto;

    /* 优化滚动性能 */
    overflow-scrolling: touch;
    -webkit-overflow-scrolling: touch;

    background-color: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);

    border: 1px solid #90a4a8;
    border-radius: 6px;
    padding: 4px;
    color: black;

    /* GPU 加速 */
    will-change: transform, opacity;
    transform: translateZ(0);
    backface-visibility: hidden;

    min-width: inherit;
}

.cascade-menu-sub {
    /* 子菜单额外优化 */
    contain: layout style paint;
}

.cascade-menu-item {
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: none;
    text-align: left;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;

    /* 优化过渡性能 */
    transition: background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1),
                color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    margin-top: 2px;
    color: #606266;

    /* 减少重绘 */
    contain: layout style paint;

    &:first-child {
        margin-top: 0;
    }

    &:hover {
        background-color: black;
        color: white;
    }

    &.selected {
        color: black;
        font-weight: 600;
    }

    &[data-disabled] {
        color: #c0c4cc;
        cursor: not-allowed;

        &:hover {
            background-color: transparent;
            color: #c0c4cc;
        }
    }

    svg {
        flex-shrink: 0;
        margin-left: 8px;
    }
}

/* 优化滚动条样式 */
.cascade-menu-content::-webkit-scrollbar {
    width: 6px;
}

.cascade-menu-content::-webkit-scrollbar-track {
    background: transparent;
}

.cascade-menu-content::-webkit-scrollbar-thumb {
    background: #dcdfe6;
    border-radius: 3px;
    transition: background-color 0.2s ease;

    &:hover {
        background: #c0c4cc;
    }
}

/* 针对低性能设备的优化 */
@media (prefers-reduced-motion: reduce) {
    .cascade-trigger,
    .cascade-trigger-icon,
    .cascade-menu-item {
        transition: none;
    }
}
</style>
