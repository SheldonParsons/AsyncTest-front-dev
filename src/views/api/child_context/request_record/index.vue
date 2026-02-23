<template>
    <div class="request-record-wrapper"
        :style="{ height: (height + HANDLE_HEIGHT) + 'px', maxHeight: maxHeight + 'px' }">
        <!-- 内容区域（不可拖动） -->
        <div class="handle-bar" @click="togglePanel">
            <!-- 可拖动的把手 -->
            <div class="drag-handle" @mousedown.stop="startDrag" @click.stop>
                <div class="drag-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            <div class="handle-left">
                <span class="handle-title">{{ currentView === 'list' ? '请求记录' : '请求详情' }}</span>
                <span class="record-count" v-if="currentView === 'list' && recordCount > 0">{{ recordCount }}</span>
            </div>
            <div class="handle-right">
                <button v-if="currentView === 'detail'" class="back-button" @click.stop="switchToList">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M8.75 3.5L5.25 7L8.75 10.5" stroke="currentColor" stroke-width="1.5"
                            stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span>返回列表</span>
                </button>
                <span class="expand-icon" :class="{ 'expanded': height > 0 }">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" stroke-width="1.5"
                            stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </span>
            </div>
        </div>

        <!-- 记录内容 -->
        <div class="record-content" v-show="height > 0" :style="{ height: height + 'px' }">
            <RecordList v-if="currentView === 'list'" :interface="interface" @record-click="handleRecordClick"
                @update:count="updateRecordCount" />
            <RecordDetail v-else-if="currentView === 'detail'" :task-index="selectedTaskIndex" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
import RecordList from './RecordList.vue';
import RecordDetail from './RecordDetail.vue';

const HANDLE_HEIGHT = 32; // handle bar 高度
const DEFAULT_PANEL_HEIGHT = 300; // 点击展开时的默认高度
const MAX_HEIGHT_PERCENT = 0.7; // 最大高度占父容器的70%

const props = defineProps({
    interface: {
        default: null,
        type: null
    }
});

const height = ref(0);
const maxHeight = ref(600);
const currentView = ref<'list' | 'detail'>('list');
const selectedTaskIndex = ref('');
const recordCount = ref(0);

let isDragging = false;
let startY = 0;
let startHeight = 0;
let parentElement: HTMLElement | null = null;

// 更新记录数量
function updateRecordCount(count: number) {
    recordCount.value = count;
}

// 切换到列表视图
function switchToList() {
    currentView.value = 'list';
    selectedTaskIndex.value = '';
}

// 处理记录点击
function handleRecordClick(taskIndex: string) {
    selectedTaskIndex.value = taskIndex;
    currentView.value = 'detail';
}

// 暴露给外部调用的方法：跳转到指定任务的详情页
function showTaskDetail(taskIndex: string) {
    selectedTaskIndex.value = taskIndex;
    currentView.value = 'detail';

    // 如果面板是收起状态，展开它
    if (height.value === 0) {
        height.value = Math.min(DEFAULT_PANEL_HEIGHT, maxHeight.value - HANDLE_HEIGHT);
    }
}

// 暴露方法给父组件
defineExpose({
    showTaskDetail
});

// 计算最大高度
const calculateMaxHeight = () => {
    if (parentElement) {
        const parentHeight = parentElement.offsetHeight;
        maxHeight.value = Math.floor(parentHeight * MAX_HEIGHT_PERCENT);
    }
};

// 点击 handle 切换面板
const togglePanel = () => {
    if (height.value === 0) {
        // 展开到默认高度
        height.value = Math.min(DEFAULT_PANEL_HEIGHT, maxHeight.value - HANDLE_HEIGHT);
    } else {
        // 收起
        height.value = 0;
    }
};

// 开始拖动
const startDrag = (e: MouseEvent) => {
    isDragging = true;
    startY = e.clientY;
    startHeight = height.value;

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);

    e.preventDefault();
    e.stopPropagation();
};

// 拖动中
const onDrag = (e: MouseEvent) => {
    if (!isDragging) return;

    const deltaY = startY - e.clientY;
    const newHeight = startHeight + deltaY;

    // 限制在 0 到 maxHeight - HANDLE_HEIGHT 之间
    height.value = Math.max(0, Math.min(newHeight, maxHeight.value - HANDLE_HEIGHT));
};

// 停止拖动
const stopDrag = () => {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
};

// 监听窗口大小变化，重新计算最大高度
const handleResize = () => {
    calculateMaxHeight();
    // 如果当前高度超过新的最大高度，调整它
    if (height.value > maxHeight.value - HANDLE_HEIGHT) {
        height.value = maxHeight.value - HANDLE_HEIGHT;
    }
};

onMounted(() => {
    // 获取父元素
    const wrapper = document.querySelector('.request-record-wrapper');
    if (wrapper && wrapper.parentElement) {
        parentElement = wrapper.parentElement;
        calculateMaxHeight();
    }

    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
});
</script>

<style lang="scss" scoped>
.request-record-wrapper {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background: #fff;
    border-top: 1px solid #e0e0e0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}

// 内容区域（不可拖动）
.handle-bar {
    height: 32px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #ffffff;
    border-top: 2px solid #e0e0e0;
    border-bottom: 1px solid #e0e0e0;
    cursor: pointer;
    user-select: none;
    flex-shrink: 0;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;

    &:hover {
        background: #fafafa;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    &:active {
        background: #f5f5f5;
        transform: scale(0.995);
        transition: all 0.1s ease;
    }
}

// 拖动把手
.drag-handle {
    position: absolute;
    left: 50%;
    top: -6px;
    transform: translateX(-50%);
    padding: 3px 10px 4px;
    cursor: ns-resize;
    z-index: 10;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 0 0 6px 6px;

    &:hover {
        background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%);
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
        transform: translateX(-50%) translateY(1px);

        .drag-dots span {
            background: #4caf50;
            box-shadow: 0 0 4px rgba(76, 175, 80, 0.4);
            animation: pulse 1.5s ease-in-out infinite;
        }
    }

    &:active {
        transform: translateX(-50%) translateY(2px);

        .drag-dots span {
            background: #2e7d32;
            animation: none;
        }
    }
}

@keyframes pulse {
    0%, 100% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.3);
        opacity: 0.8;
    }
}

// 当拖动把手 hover 时改变 handle-bar 的边框
.handle-bar:has(.drag-handle:hover) {
    border-top-color: #4caf50;
    box-shadow: 0 -1px 4px rgba(76, 175, 80, 0.15);
}

.drag-dots {
    display: flex;
    gap: 4px;
    align-items: center;

    span {
        width: 3px;
        height: 3px;
        background: #ccc;
        border-radius: 50%;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
}

.handle-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.handle-title {
    font-size: 13px;
    font-weight: 500;
    color: #333;
    letter-spacing: -0.01em;
    transition: color 0.2s ease;
}

.record-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 18px;
    padding: 0 6px;
    background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%);
    color: #2e7d32;
    font-size: 11px;
    font-weight: 600;
    border-radius: 9px;
    box-shadow: 0 1px 3px rgba(76, 175, 80, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: countAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);

    &:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
    }
}

@keyframes countAppear {
    from {
        opacity: 0;
        transform: scale(0.5);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.handle-right {
    display: flex;
    align-items: center;
    gap: 8px;
}

.back-button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: transparent;
    border: none;
    color: #666;
    font-size: 12px;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(76, 175, 80, 0.1);
        transform: translate(-50%, -50%);
        transition: width 0.4s ease, height 0.4s ease;
    }

    &:hover {
        background: #f5f5f5;
        color: #333;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        transform: translateX(-2px);

        &::before {
            width: 100px;
            height: 100px;
        }
    }

    &:active {
        background: #e0e0e0;
        transform: translateX(-1px);
        transition: all 0.1s ease;
    }

    svg {
        flex-shrink: 0;
        transition: transform 0.3s ease;
    }

    &:hover svg {
        transform: translateX(-2px);
    }
}

.expand-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: #666;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &.expanded {
        transform: rotate(180deg);
    }

    .handle-bar:hover & {
        color: #333;
        transform: scale(1.1);
    }

    .handle-bar:hover &.expanded {
        transform: rotate(180deg) scale(1.1);
    }
}

// 记录内容区域
.record-content {
    overflow-y: auto;
    flex-shrink: 0;
    background: #fff;
}
</style>
