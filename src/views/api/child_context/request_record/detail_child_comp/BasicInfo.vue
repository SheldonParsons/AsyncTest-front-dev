<template>
    <div class="basic-info-wrapper">
        <div class="info-grid">
            <!-- 创建时间 -->
            <div class="info-item">
                <div class="info-label">创建时间</div>
                <div class="info-value" :class="{ loading: isRunning && !detailData?.add_time }">
                    {{ formatTime(detailData?.add_time) }}
                </div>
            </div>

            <!-- 创建人 -->
            <div class="info-item">
                <div class="info-label">创建人</div>
                <div class="info-value" :class="{ loading: isRunning && !detailData?.create_name }">
                    {{ detailData?.create_name || 'N/A' }}
                </div>
            </div>

            <!-- 请求方法 -->
            <div class="info-item">
                <div class="info-label">请求方法</div>
                <div class="info-value" :class="{ loading: isRunning && !detailData?.method }">
                    <span v-if="detailData?.method" class="method-badge" :class="methodClass">
                        {{ detailData.method.toUpperCase() }}
                    </span>
                    <span v-else class="placeholder">{{ isRunning ? '等待中...' : 'N/A' }}</span>
                </div>
            </div>

            <!-- HTTP状态码 -->
            <div class="info-item">
                <div class="info-label">状态码</div>
                <div class="info-value" :class="{ loading: isRunning && !detailData?.code }">
                    <span v-if="detailData?.code" class="status-badge" :class="statusClass">
                        {{ detailData.code }}
                    </span>
                    <span v-else class="placeholder">
                        <template v-if="isRunning">
                            <span class="running-indicator">
                                <span class="dot"></span>
                                <span class="dot"></span>
                                <span class="dot"></span>
                            </span>
                            等待中
                        </template>
                        <template v-else>N/A</template>
                    </span>
                </div>
            </div>

            <!-- 总耗时 -->
            <div class="info-item">
                <div class="info-label">总耗时</div>
                <div class="info-value" :class="{ loading: isRunning && !detailData?.waste_time }">
                    <template v-if="detailData?.waste_time">
                        <span class="time-badge">{{ formatDuration(parseFloat(detailData.waste_time)) }}</span>
                    </template>
                    <span v-else class="placeholder">{{ isRunning ? '计算中...' : 'N/A' }}</span>
                </div>
            </div>

            <!-- 接口耗时 -->
            <div class="info-item">
                <div class="info-label">接口耗时</div>
                <div class="info-value" :class="{ loading: isRunning && !totalTime }">
                    <template v-if="totalTime">
                        <span class="time-badge">{{ formatDuration(totalTime) }}</span>
                    </template>
                    <span v-else class="placeholder">{{ isRunning ? '计算中...' : 'N/A' }}</span>
                </div>
            </div>

            <!-- 请求URL -->
            <div class="info-item full-width">
                <div class="info-label">请求URL</div>
                <div class="info-value url-value" :class="{ loading: isRunning && !detailData?.url }">
                    <template v-if="detailData?.url">
                        <span class="url-text" :title="detailData.url">{{ detailData.url }}</span>
                    </template>
                    <span v-else class="placeholder">{{ isRunning ? '等待中...' : 'N/A' }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

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

// 解析timing中的total_time
const totalTime = computed(() => {
    if (!props.detailData?.timing) return null;
    try {
        const timing = typeof props.detailData.timing === 'string'
            ? JSON.parse(props.detailData.timing)
            : props.detailData.timing;
        return timing.total_time;
    } catch (e) {
        return null;
    }
});

// 格式化时间
function formatTime(timeStr: string | undefined): string {
    if (!timeStr) return 'N/A';
    try {
        const date = new Date(timeStr);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    } catch (e) {
        return timeStr;
    }
}

// 格式化耗时
function formatDuration(seconds: number): string {
    if (seconds < 0.001) return `${(seconds * 1000000).toFixed(0)}μs`;
    if (seconds < 1) return `${(seconds * 1000).toFixed(2)}ms`;
    return `${seconds.toFixed(3)}s`;
}

// 方法样式类
const methodClass = computed(() => {
    const method = props.detailData?.method?.toLowerCase();
    return {
        'method-get': method === 'get',
        'method-post': method === 'post',
        'method-put': method === 'put',
        'method-delete': method === 'delete',
        'method-patch': method === 'patch'
    };
});

// 状态码样式类
const statusClass = computed(() => {
    const code = props.detailData?.code;
    if (!code) return '';
    if (code >= 200 && code < 300) return 'status-success';
    if (code >= 300 && code < 400) return 'status-redirect';
    if (code >= 400 && code < 500) return 'status-client-error';
    if (code >= 500) return 'status-server-error';
    return '';
});
</script>

<style lang="scss" scoped>
.basic-info-wrapper {
    padding: 12px;
    background: #fafafa;
    min-height: 100%;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    max-width: 1200px;
}

.info-item {
    background: #fff;
    border-radius: 6px;
    padding: 10px 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        transform: translateY(-2px);
    }

    &.full-width {
        grid-column: 1 / -1;
    }
}

.info-label {
    font-size: 11px;
    color: #999;
    margin-bottom: 6px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.info-value {
    font-size: 14px;
    color: #333;
    font-weight: 500;
    word-break: break-all;
    transition: all 0.3s ease;

    &.loading {
        animation: shimmerPulse 1.5s ease-in-out infinite;
    }

    &.running {
        color: #4caf50;
    }
}

.placeholder {
    color: #bbb;
    font-style: italic;
    font-weight: 400;
}

// 运行中指示器
.running-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-right: 8px;

    .dot {
        width: 6px;
        height: 6px;
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

// 方法徽章
.method-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
    transition: all 0.2s ease;

    &.method-get {
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        color: #1976d2;
    }

    &.method-post {
        background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
        color: #388e3c;
    }

    &.method-put {
        background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        color: #f57c00;
    }

    &.method-delete {
        background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
        color: #d32f2f;
    }

    &.method-patch {
        background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
        color: #7b1fa2;
    }
}

// 状态码徽章
.status-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;

    &.status-success {
        background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
        color: #2e7d32;
        box-shadow: 0 2px 4px rgba(76, 175, 80, 0.2);
    }

    &.status-redirect {
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        color: #1565c0;
    }

    &.status-client-error {
        background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        color: #e65100;
    }

    &.status-server-error {
        background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
        color: #c62828;
    }
}

// 时间徽章
.time-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
    color: #6a1b9a;
}

// URL样式
.url-value {
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 13px;
}

.url-text {
    color: #1976d2;
    word-break: break-all;
}

// 动画
@keyframes shimmerPulse {
    0%, 100% {
        opacity: 0.6;
    }
    50% {
        opacity: 1;
    }
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
