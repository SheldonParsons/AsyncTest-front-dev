<template>
    <div class="record-detail-wrapper">
        <div class="detail-tabs">
            <div class="tab-item" v-for="tab in tabs" :key="tab.key" :class="{ active: activeTab === tab.key }"
                @click="activeTab = tab.key">
                {{ tab.label }}
            </div>
        </div>
        <div class="detail-content">
            <BasicInfo v-if="activeTab === 'basic'" :detail-data="detailData" />
            <RequestContent v-else-if="activeTab === 'request'" :detail-data="detailData" />
            <ResponseContent v-else-if="activeTab === 'response'" :detail-data="detailData" />
            <TimingDetail v-else-if="activeTab === 'timing'" :detail-data="detailData" />
            <ProcessInfo v-else-if="activeTab === 'process'" :detail-data="detailData" />
            <VariableChange v-else-if="activeTab === 'variable'" :detail-data="detailData" />
            <LogInfo v-else-if="activeTab === 'log'" :detail-data="detailData" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, onUnmounted } from 'vue';
import { ApiInterfaceDebug } from '@/api/interface/index';
import tools from '@/utils/tools';
import { createPolling, Polling } from './polling';
import BasicInfo from './detail_child_comp/BasicInfo.vue';
import RequestContent from './detail_child_comp/RequestContent.vue';
import ResponseContent from './detail_child_comp/ResponseContent.vue';
import TimingDetail from './detail_child_comp/TimingDetail.vue';
import ProcessInfo from './detail_child_comp/ProcessInfo.vue';
import VariableChange from './detail_child_comp/VariableChange.vue';
import LogInfo from './detail_child_comp/LogInfo.vue';

interface RecordDetail {
    id: number;
    task_index: string;
    status: string;
    url: string;
    method: string;
    result: string;
    request?: any;
    response?: any;
    code?: number;
    waste_time?: string;
    timing?: string;
    start_time?: string;
    end_time?: string;
    error?: any;
    process?: string[];
    change_temporary_variable?: any[];
    log?: any[];
    [key: string]: any;
}

const props = defineProps({
    taskIndex: {
        type: String,
        required: true
    }
});

const detailData = ref<RecordDetail | undefined>(undefined);
const activeTab = ref('basic');
let polling: Polling<RecordDetail> | null = null;

const tabs = [
    { key: 'basic', label: '基础信息' },
    { key: 'request', label: '请求内容' },
    { key: 'response', label: '响应内容' },
    { key: 'timing', label: '耗时详情' },
    { key: 'process', label: 'Process' },
    { key: 'variable', label: '临时变量替换' },
    { key: 'log', label: '日志信息' }
];

// 获取记录详情
async function getRecordDetail(): Promise<RecordDetail> {
    const data = {
        type: 'get_interface_debug_detail',
        content: {
            task_index: props.taskIndex
        }
    };
    const response = await tools.send(ApiInterfaceDebug, data);
    return response;
}

// 检查是否应该停止轮询
function shouldStopPolling(data: RecordDetail): boolean {
    return data && data.status === 'end';
}

// 初始化轮询
function initPolling() {
    if (polling) {
        polling.stop();
    }

    polling = createPolling<RecordDetail>({
        pollFn: getRecordDetail,
        shouldStop: shouldStopPolling,
        interval: 500,
        maxDuration: 60000,
        onSuccess: (data) => {
            console.log(123);
            
            detailData.value = data;
        },
        onError: (error) => {
            console.error('轮询请求详情失败:', error);
        }
    });

    polling.start();
}

// 监听 taskIndex 变化，重置轮询
watch(() => props.taskIndex, () => {
    if (props.taskIndex) {
        initPolling();
    }
}, { immediate: true });

onUnmounted(() => {
    if (polling) {
        polling.stop();
    }
});
</script>

<style lang="scss" scoped>
.record-detail-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #f5f5f5;
}

.detail-tabs {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    background: #fff;
    border-bottom: 1px solid #e0e0e0;
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.tab-item {
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at center, rgba(76, 175, 80, 0.1) 0%, transparent 70%);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    &:hover {
        background: #f5f5f5;
        color: #333;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);

        &::before {
            opacity: 1;
        }
    }

    &:active {
        transform: translateY(0);
        transition: all 0.1s ease;
    }

    &.active {
        background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%);
        color: #2e7d32;
        box-shadow:
            0 2px 8px rgba(76, 175, 80, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
        transform: translateY(-1px);
    }
}

@keyframes shimmer {
    0%, 100% {
        opacity: 0.5;
    }
    50% {
        opacity: 1;
    }
}

.detail-content {
    flex: 1;
    overflow-y: auto;
    background: #fff;
    animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
