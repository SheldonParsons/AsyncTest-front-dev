<template>
    <div class="record-list-wrapper">
        <div class="record-list">
            <div class="record-item" v-for="(record, index) in records" :key="index"
                @click="handleRecordClick(record)">
                <div class="record-method" :class="`method-${record.method.toLowerCase()}`">
                    {{ record.method.toUpperCase() }}
                </div>
                <div class="record-url">{{ record.url }}</div>
                <div class="record-status-badge" :class="getStatusClass(record)">
                    {{ getStatusText(record) }}
                </div>
                <div class="record-result" :class="`result-${record.result}`">
                    {{ record.result === 'success' ? '成功' : '错误' }}
                </div>
                <div class="record-code">
                    <span v-if="record.code === 0 && record.status === 'running'" class="loading-dot"></span>
                    <span v-else-if="record.code === 0 && record.status === 'end'" class="failed-text">获取失败</span>
                    <span v-else>{{ record.code }}</span>
                </div>
                <div class="record-time">
                    <span v-if="record.status === 'running'" class="loading-dot"></span>
                    <span v-else-if="record.status === 'end' && !record.waste_time" class="failed-text">获取失败</span>
                    <span v-else>{{ formatTime(record.waste_time) }}</span>
                </div>
                <div class="record-timestamp">{{ formatTimestamp(record.add_time) }}</div>
            </div>
        </div>
        <div v-if="records.length === 0" class="empty-state">
            <span>暂无请求记录</span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { ApiInterfaceDebug } from '@/api/interface/index';
import tools from '@/utils/tools';
import { createPolling, Polling } from './polling';

interface RecordItem {
    start_time: string;
    url: string;
    method: string;
    status: string;
    result: string;
    code: number;
    waste_time: string;
    task_index: string;
    add_time: string;
}

const props = defineProps({
    interface: {
        default: null,
        type: null
    }
});

const emit = defineEmits<{
    (e: 'record-click', taskIndex: string): void;
    (e: 'update:count', count: number): void;
}>();

const records = ref<RecordItem[]>([]);
let polling: Polling<RecordItem[]> | null = null;

// 获取记录列表
async function getRecordList(): Promise<RecordItem[]> {
    const data = {
        type: 'get_interface_debug_list',
        content: {
            interface: props.interface
        }
    };
    const response = await tools.send(ApiInterfaceDebug, data);
    return response || [];
}

// 检查是否所有记录都已结束
function shouldStopPolling(data: RecordItem[]): boolean {
    if (data.length === 0) {
        return false;
    }
    return data.every(record => record.status === 'end');
}

// 初始化轮询
function initPolling() {
    if (polling) {
        polling.stop();
    }

    polling = createPolling<RecordItem[]>({
        pollFn: getRecordList,
        shouldStop: shouldStopPolling,
        interval: 500,
        maxDuration: 60000,
        onSuccess: (data) => {
            records.value = data;
            emit('update:count', data.length);
        },
        onError: (error) => {
            console.error('轮询请求失败:', error);
        }
    });

    polling.start();
}

// 格式化时间
function formatTime(wasteTime: string): string {
    if (!wasteTime) {
        return '';
    }
    const time = parseFloat(wasteTime);
    if (isNaN(time)) {
        return '';
    }
    if (time < 1) {
        return `${Math.round(time * 1000)}ms`;
    }
    return `${time.toFixed(2)}s`;
}

// 格式化时间戳
function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 获取状态样式类
function getStatusClass(record: RecordItem): string {
    if (record.status === 'end') {
        return 'status-end';
    }
    return 'status-processing';
}

// 获取状态文本
function getStatusText(record: RecordItem): string {
    if (record.status === 'end') {
        return '已完成';
    }
    return '处理中';
}

// 点击记录
function handleRecordClick(record: RecordItem) {
    emit('record-click', record.task_index);
}

// 监听 interface 变化，重置轮询
watch(() => props.interface, () => {
    initPolling();
});

onMounted(() => {
    initPolling();
});

onUnmounted(() => {
    if (polling) {
        polling.stop();
    }
});
</script>

<style lang="scss" scoped>
.record-list-wrapper {
    height: 100%;
    overflow-y: auto;
}

.record-list {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.record-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 12px;
    background: #fff;
    border-bottom: 1px solid #f0f0f0;
    font-size: 13px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 0;
        background: linear-gradient(90deg, rgba(76, 175, 80, 0.08) 0%, transparent 100%);
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    &:hover {
        background: #fafafa;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        transform: translateX(4px);

        &::before {
            width: 100%;
        }
    }

    &:active {
        transform: translateX(2px);
        transition: all 0.1s ease;
    }

    &:last-child {
        border-bottom: none;
    }
}

.record-method {
    padding: 3px 7px;
    font-weight: 600;
    font-size: 11px;
    min-width: 50px;
    text-align: center;
    border-radius: 4px;
    letter-spacing: 0.3px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

    &.method-get {
        background: #f5f5f5;
        color: #333;
    }

    &.method-post {
        background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%);
        color: #2e7d32;
        box-shadow: 0 1px 3px rgba(76, 175, 80, 0.2);
    }

    &.method-put {
        background: #f5f5f5;
        color: #666;
    }

    &.method-delete {
        background: #fafafa;
        color: #333;
    }

    &.method-patch {
        background: #f5f5f5;
        color: #666;
    }

    .record-item:hover & {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .record-item:hover &.method-post {
        box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
    }
}

.record-url {
    flex: 1;
    color: #333;
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.record-status-badge {
    padding: 3px 8px;
    font-weight: 600;
    font-size: 11px;
    min-width: 56px;
    text-align: center;
    border-radius: 4px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

    &.status-end {
        background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%);
        color: #2e7d32;
        box-shadow: 0 1px 3px rgba(76, 175, 80, 0.2);
    }

    &.status-processing {
        background: #f5f5f5;
        color: #666;
        animation: processingPulse 2s ease-in-out infinite;
    }

    .record-item:hover & {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .record-item:hover &.status-end {
        box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
    }
}

@keyframes processingPulse {
    0%, 100% {
        opacity: 0.7;
    }
    50% {
        opacity: 1;
    }
}

.record-result {
    padding: 3px 8px;
    font-weight: 600;
    font-size: 11px;
    min-width: 42px;
    text-align: center;
    border-radius: 4px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

    &.result-success {
        background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%);
        color: #2e7d32;
        box-shadow: 0 1px 3px rgba(76, 175, 80, 0.2);
    }

    &.result-error {
        background: #fafafa;
        color: #333;
    }

    .record-item:hover & {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .record-item:hover &.result-success {
        box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
    }
}

.record-code {
    color: #666;
    font-size: 12px;
    min-width: 40px;
    text-align: center;
    font-variant-numeric: tabular-nums;
}

.record-time {
    color: #666;
    font-size: 12px;
    min-width: 60px;
    text-align: right;
    font-variant-numeric: tabular-nums;
}

.record-timestamp {
    color: #999;
    font-size: 11px;
    min-width: 110px;
    text-align: right;
    font-variant-numeric: tabular-nums;
}

.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #999;
    font-size: 13px;
}

.loading-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4caf50;
    animation: loading-pulse 1.4s ease-in-out infinite;
}

@keyframes loading-pulse {
    0%, 100% {
        opacity: 0.3;
        transform: scale(0.8);
    }
    50% {
        opacity: 1;
        transform: scale(1.2);
    }
}

.failed-text {
    color: #333;
    font-size: 11px;
}
</style>
