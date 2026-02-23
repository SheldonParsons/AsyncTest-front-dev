<template>
    <div class="log-info-wrapper">
        <div v-if="!logData || logData.length === 0" class="empty-container">
            <div class="empty-state">
                <span v-if="isRunning" class="running-indicator">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </span>
                <span class="empty-text">{{ isRunning ? '日志数据加载中...' : '暂无日志信息' }}</span>
            </div>
        </div>

        <div v-else class="log-content">
            <div class="section-header">
                <span class="section-title">执行日志</span>
                <span class="count-badge">{{ logData.length }}</span>
                <span v-if="isRunning" class="loading-dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </span>
            </div>

            <div class="log-list">
                <div
                    v-for="(item, index) in logData"
                    :key="index"
                    class="log-item"
                    :class="getLogItemClass(item)"
                >
                    <!-- 时间轴线 -->
                    <div class="timeline">
                        <div class="timeline-dot" :class="getTimelineDotClass(item)"></div>
                        <div v-if="index < logData.length - 1" class="timeline-line"></div>
                    </div>

                    <!-- 日志内容 -->
                    <div class="log-main">
                        <!-- 头部：时间 + 标签 + 位置 -->
                        <div class="log-header">
                            <div class="log-time">{{ formatTime(item.time) }}</div>
                            <div v-if="item.tag" class="log-tag" :class="getTagClass(item)">
                                {{ item.tag }}
                            </div>
                            <div v-if="item.position" class="log-position">
                                <span class="position-icon">📍</span>
                                {{ item.position }}
                            </div>
                        </div>

                        <!-- 数据内容 -->
                        <div class="log-body">
                            <!-- 普通文本消息 -->
                            <div v-if="isSimpleData(item.data)" class="log-message">
                                <pre v-if="item.data && item.data.includes('\n')" class="message-multiline">{{ item.data }}</pre>
                                <span v-else class="message-text">{{ item.data || 'N/A' }}</span>
                            </div>

                            <!-- 变量替换详情 -->
                            <div v-else-if="isVariableData(item.data)" class="variable-detail">
                                <div class="variable-header">
                                    <div class="variable-type-badge" :class="getVariableTypeBadgeClass(item.data.t)">
                                        {{ getVariableTypeLabel(item.data.t) }}
                                    </div>
                                    <div class="variable-key">
                                        <span class="key-label">变量名:</span>
                                        <span class="key-value">{{ item.data.key || 'N/A' }}</span>
                                    </div>
                                    <div class="variable-result" :class="{ success: item.data.result, failed: !item.data.result }">
                                        {{ item.data.result ? '✓ 成功' : '✕ 失败' }}
                                    </div>
                                </div>

                                <div class="variable-info-grid">
                                    <div class="info-item">
                                        <div class="info-label">数据源</div>
                                        <div class="info-value">{{ formatSource(item.data.source) }}</div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">提取范围</div>
                                        <div class="info-value">{{ formatExtractRange(item.data.extract_range) }}</div>
                                    </div>
                                </div>

                                <div class="variable-value-section">
                                    <div class="value-label">提取值</div>
                                    <div class="value-content">
                                        <CodeHighlight
                                            v-if="isLongValue(item.data.value)"
                                            :content="formatValue(item.data.value)"
                                            :language="detectLanguage(item.data.value)"
                                            height="200px"
                                            empty-text="无值"
                                        />
                                        <div v-else class="value-short">
                                            {{ formatValue(item.data.value) }}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 其他对象类型数据 -->
                            <div v-else class="log-object">
                                <CodeHighlight
                                    :content="formatObjectData(item.data)"
                                    language="json"
                                    height="150px"
                                    empty-text="无数据"
                                />
                            </div>
                        </div>

                        <!-- 事件类型标识 -->
                        <div v-if="item.event_name && item.event_name !== 'message'" class="log-footer">
                            <div class="event-badge">
                                {{ formatEventName(item.event_name) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import CodeHighlight from '@/components/common/editor/CodeHighlight.vue';

interface LogItem {
    t: string;
    tag: string | null;
    data: any;
    time: number;
    position: string | null;
    event_name: string;
}

const props = defineProps({
    detailData: {
        type: Object,
        default: null
    }
});

// 判断是否正在运行
const isRunning = computed(() => {
    return props.detailData?.status !== 'end';
});

// 获取日志数据
const logData = computed<LogItem[]>(() => {
    const data = props.detailData?.log;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    // 容错处理：如果是字符串，尝试解析
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }
    return [];
});

// 格式化时间戳
function formatTime(timestamp: number | string | undefined): string {
    if (!timestamp) return 'N/A';
    try {
        const num = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;
        const date = new Date(num * 1000);
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }) + '.' + String(num).split('.')[1]?.substring(0, 3) || '000';
    } catch (e) {
        return String(timestamp);
    }
}

// 判断是否为简单数据（字符串或数字）
function isSimpleData(data: any): boolean {
    return typeof data === 'string' || typeof data === 'number' || data === null || data === undefined;
}

// 判断是否为变量替换数据
function isVariableData(data: any): boolean {
    return data && typeof data === 'object' && 'key' in data && 'value' in data && 'source' in data;
}

// 判断是否为长值（需要用代码编辑器展示）
function isLongValue(value: any): boolean {
    if (!value) return false;
    const str = String(value);
    return str.length > 100 || str.includes('\n');
}

// 格式化值
function formatValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (value === '空') return '空';
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value, null, 2);
        } catch (e) {
            return String(value);
        }
    }
    return String(value);
}

// 格式化对象数据
function formatObjectData(data: any): string {
    if (!data) return '';
    try {
        return JSON.stringify(data, null, 2);
    } catch (e) {
        return String(data);
    }
}

// 检测语言类型
function detectLanguage(value: any): string {
    if (!value) return 'plaintext';
    const str = String(value).trim();

    if (str.startsWith('<!DOCTYPE') || str.startsWith('<html')) {
        return 'html';
    }
    if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
        try {
            JSON.parse(str);
            return 'json';
        } catch (e) {
            // 不是有效的JSON
        }
    }
    return 'plaintext';
}

// 获取日志项样式类
function getLogItemClass(item: LogItem): string {
    if (item.t === 'error') return 'log-error';
    if (item.t === 'success') return 'log-success';
    if (item.event_name === 'end') return 'log-end';
    // 检查变量替换失败
    if (isVariableData(item.data) && !item.data.result) return 'log-error';
    return 'log-normal';
}

// 获取时间轴点样式类
function getTimelineDotClass(item: LogItem): string {
    if (item.t === 'error') return 'dot-error';
    if (item.t === 'success') return 'dot-success';
    if (item.event_name === 'end') return 'dot-end';
    return 'dot-normal';
}

// 获取标签样式类
function getTagClass(item: LogItem): string {
    const tag = item.tag?.toLowerCase() || '';
    if (tag.includes('全局') || tag.includes('环境') || tag.includes('临时')) return 'tag-param';
    if (tag.includes('系统')) return 'tag-system';
    if (tag.includes('变量')) return 'tag-variable';
    if (tag.includes('打印')) return 'tag-print';
    if (tag.includes('等待')) return 'tag-wait';
    return 'tag-default';
}

// 获取变量类型标签样式类
function getVariableTypeBadgeClass(type: string): string {
    if (type === 'TEMP') return 'type-temp';
    if (type === 'ENV') return 'type-env';
    if (type === 'GLOBAL') return 'type-global';
    return 'type-default';
}

// 获取变量类型标签文本
function getVariableTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        'TEMP': '临时变量',
        'ENV': '环境变量',
        'GLOBAL': '全局变量'
    };
    return labels[type] || type;
}

// 格式化数据源
function formatSource(source: string | undefined): string {
    if (!source) return 'N/A';
    const sourceMap: Record<string, string> = {
        'RESPONSE_BODY': '响应Body',
        'RESPONSE_HEADER': '响应Header',
        'RESPONSE_COOKIE': '响应Cookie',
        'WASTE_TIME': '耗时'
    };
    return sourceMap[source] || source;
}

// 格式化提取范围
function formatExtractRange(range: string | undefined): string {
    if (!range) return 'N/A';
    const rangeMap: Record<string, string> = {
        'WHOLE_BODY': '完整内容',
        'REGEXP': '正则表达式',
        'XPATH': 'XPath',
        'JSONPATH': 'JSONPath'
    };
    return rangeMap[range] || range;
}

// 格式化事件名称
function formatEventName(eventName: string): string {
    const eventMap: Record<string, string> = {
        'end': '任务结束',
        'start': '任务开始',
        'message': '消息'
    };
    return eventMap[eventName] || eventName;
}
</script>

<style lang="scss" scoped>
.log-info-wrapper {
    padding: 12px;
    background: #fff;
    min-height: 100%;
}

.empty-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
}

.empty-state {
    display: flex;
    align-items: center;
    gap: 8px;
}

.empty-text {
    color: #bbb;
    font-size: 13px;
    font-style: italic;
}

.running-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;

    .dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #4caf50;
        animation: dotPulse 1.4s ease-in-out infinite;

        &:nth-child(1) {
            animation-delay: 0s;
        }

        &:nth-child(2) {
            animation-delay: 0.2s;
        }

        &:nth-child(3) {
            animation-delay: 0.4s;
        }
    }
}

.log-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
}

.section-title {
    font-size: 11px;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.8px;
}

.count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.loading-dots {
    display: inline-flex;
    align-items: center;
    gap: 3px;

    .dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #4caf50;
        animation: dotPulse 1.4s ease-in-out infinite;

        &:nth-child(1) {
            animation-delay: 0s;
        }

        &:nth-child(2) {
            animation-delay: 0.2s;
        }

        &:nth-child(3) {
            animation-delay: 0.4s;
        }
    }
}

.log-list {
    display: flex;
    flex-direction: column;
}

.log-item {
    display: flex;
    gap: 12px;
    position: relative;

    &:hover {
        .log-main {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
    }

    &.log-error {
        .log-main {
            border-left-color: #ef4444;
            background: linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%);
        }
    }

    &.log-success {
        .log-main {
            border-left-color: #10b981;
        }
    }

    &.log-end {
        .log-main {
            border-left-color: #8b5cf6;
        }
    }
}

.timeline {
    flex-shrink: 0;
    width: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 6px;
}

.timeline-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #94a3b8;
    border: 2px solid #fff;
    box-shadow: 0 0 0 2px #e2e8f0;
    flex-shrink: 0;
    z-index: 1;

    &.dot-error {
        background: #ef4444;
        box-shadow: 0 0 0 2px #fee2e2;
    }

    &.dot-success {
        background: #10b981;
        box-shadow: 0 0 0 2px #d1fae5;
    }

    &.dot-end {
        background: #8b5cf6;
        box-shadow: 0 0 0 2px #ede9fe;
    }
}

.timeline-line {
    width: 2px;
    flex: 1;
    background: #e2e8f0;
    margin-top: 2px;
    min-height: 12px;
}

.log-main {
    flex: 1;
    background: #fafafa;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
    border-left: 3px solid #94a3b8;
    margin-bottom: 8px;
    transition: all 0.2s ease;
    overflow: hidden;
}

.log-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-bottom: 1px solid #e2e8f0;
    flex-wrap: wrap;
}

.log-time {
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 10px;
    font-weight: 600;
    color: #64748b;
    padding: 2px 6px;
    background: #fff;
    border-radius: 3px;
    border: 1px solid #e2e8f0;
}

.log-tag {
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 500;
    border-radius: 10px;
    border: 1px solid;

    &.tag-param {
        background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
        color: #1e40af;
        border-color: #bfdbfe;
    }

    &.tag-system {
        background: linear-gradient(135deg, #e0e7ff 0%, #eef2ff 100%);
        color: #4338ca;
        border-color: #c7d2fe;
    }

    &.tag-variable {
        background: linear-gradient(135deg, #fce7f3 0%, #fdf2f8 100%);
        color: #be185d;
        border-color: #fbcfe8;
    }

    &.tag-print {
        background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%);
        color: #92400e;
        border-color: #fde68a;
    }

    &.tag-wait {
        background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%);
        color: #075985;
        border-color: #bae6fd;
    }

    &.tag-default {
        background: linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%);
        color: #4b5563;
        border-color: #e5e7eb;
    }
}

.log-position {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: #6b7280;
    padding: 2px 6px;
    background: #fff;
    border-radius: 3px;
    border: 1px solid #e5e7eb;
}

.position-icon {
    font-size: 9px;
}

.log-body {
    padding: 8px 10px;
}

.log-message {
    .message-text {
        font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 12px;
        color: #1f2937;
        line-height: 1.5;
    }

    .message-multiline {
        font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 11px;
        color: #1f2937;
        line-height: 1.5;
        margin: 0;
        padding: 6px 8px;
        background: #f9fafb;
        border-top-right-radius: 3px;
        border-bottom-right-radius: 3px;
        border-left: 2px solid #d1d5db;
        white-space: pre-wrap;
        word-break: break-word;
    }
}

.variable-detail {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.variable-header {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.variable-type-badge {
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 10px;
    border: 1px solid;

    &.type-temp {
        background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%);
        color: #92400e;
        border-color: #fde68a;
    }

    &.type-env {
        background: linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%);
        color: #065f46;
        border-color: #a7f3d0;
    }

    &.type-global {
        background: linear-gradient(135deg, #ddd6fe 0%, #ede9fe 100%);
        color: #5b21b6;
        border-color: #c4b5fd;
    }

    &.type-default {
        background: linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%);
        color: #4b5563;
        border-color: #e5e7eb;
    }
}

.variable-key {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;

    .key-label {
        color: #6b7280;
        font-weight: 500;
    }

    .key-value {
        font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
        font-weight: 600;
        color: #1f2937;
        padding: 2px 6px;
        background: #f3f4f6;
        border-radius: 3px;
    }
}

.variable-result {
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 10px;
    margin-left: auto;

    &.success {
        background: linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%);
        color: #065f46;
        border: 1px solid #a7f3d0;
    }

    &.failed {
        background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%);
        color: #dc2626;
        border: 1px solid #fca5a5;
        font-weight: 700;
    }
}

.variable-info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.info-label {
    font-size: 9px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.info-value {
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 11px;
    color: #374151;
    padding: 4px 8px;
    background: #f9fafb;
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;
    border-left: 2px solid #e5e7eb;
}

.variable-value-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.value-label {
    font-size: 9px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.value-content {
    .value-short {
        font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 11px;
        color: #1f2937;
        padding: 6px 8px;
        background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%);
        border-left: 3px solid #f59e0b;
        border-top-right-radius: 3px;
        border-bottom-right-radius: 3px;
        word-break: break-word;
        line-height: 1.5;
    }
}

.log-object {
    // CodeHighlight 组件会处理样式
}

.log-footer {
    padding: 5px 10px;
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
}

.event-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 600;
    color: #6b21a8;
    background: linear-gradient(135deg, #ede9fe 0%, #f5f3ff 100%);
    border-radius: 10px;
    border: 1px solid #ddd6fe;
}

@keyframes dotPulse {
    0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
    }
    40% {
        transform: scale(1.2);
        opacity: 1;
    }
}
</style>
