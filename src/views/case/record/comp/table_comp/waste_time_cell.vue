<template>
    <div class="counter-container">
        {{ displayValue }}
        <span class="unit">秒</span>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
// import { AnimateNumber } from 'motion-plus-vue';
// import tools from '@/utils/tools'

const props = defineProps<{
    params: any
}>();

const number = {
    fontSize: '1rem',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
};

// 1. 新的状态变量，用于控制更新频率
let lastUpdateTime: number = 0;
const UPDATE_INTERVAL = 800; // 更新间隔800毫秒
const displayValue = ref(0);
let animationFrameId: number | null = null;
// 【核心】使用普通的 let 变量作为组件内部的“真实数据源”
let currentStart: number = props.params.data.start;
let currentEnd: number = props.params.data.end;


// 2. 动画循环函数（现在改名为 tick，职责更单一）
//    它只负责根据当前状态更新UI
// 2. tick 函数现在是同步的，不再有 async/await
function tick(currentTime: DOMHighResTimeStamp) {
    // a. 检查是否到了更新UI的时间
    if (currentTime - lastUpdateTime > UPDATE_INTERVAL) {
        // b. 更新UI
        const system_time = props.params.get_system_time()
        if (system_time === 0) {
            displayValue.value = 0
        } else {
            const ms = system_time - currentStart;
            displayValue.value = Number((ms / 1000).toFixed(3));
        }
        // c. 更新上一次的更新时间戳
        lastUpdateTime = currentTime;
    }

    // d. 无论是否更新UI，都继续请求下一帧，保持循环运行
    animationFrameId = requestAnimationFrame(tick);
}

// 3. 控制动画的辅助函数
function startTicking() {
    // 防止重复启动
    if (animationFrameId === null && currentStart > 0) {
        lastUpdateTime = 0;
        animationFrameId = requestAnimationFrame(tick);
    }
}

function stopTicking() {
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

/**
 * 4. refresh 方法现在是更新内部状态的唯一入口
 */
const refresh = (params: any) => {
    // a. 【核心】用最新的 params 更新内部状态
    currentStart = params.data.start;
    currentEnd = params.data.end;

    // b. 根据更新后的内部状态，决定要做什么
    if (currentEnd > 0) {
        // 如果任务结束了
        stopTicking();
        const ms = currentEnd - currentStart;
        displayValue.value = Number((ms > 0 ? ms / 1000 : 0).toFixed(3));
    } else if (currentStart > 0) {
        // 如果任务仍在进行
        startTicking(); // 启动或继续秒表
    } else {
        // 其他情况（例如数据无效）
        stopTicking();
        displayValue.value = 0;
    }

    return true; // 告诉 AG-Grid 我们成功处理了刷新
};

// 5. onMounted 只负责初始化状态
onMounted(() => {
    // 调用一次 refresh 来设置初始状态和启动动画（如果需要）
    // 只有在初始状态是“进行中”时，才需要启动计时器
    if (currentEnd === 0 && currentStart > 0) {
        startTicking();
    } else if (currentEnd > 0) {
        const { start, end } = props.params.data;
        // 如果任务已结束，直接计算最终耗时
        const ms = end - start;
        nextTick(() => {
            displayValue.value = Number((ms > 0 ? ms / 1000 : 0).toFixed(3));
        })

    }
});

// 6. onBeforeUnmount 负责清理
onBeforeUnmount(() => {
    stopTicking();
});

defineExpose({
    refresh
});
</script>

<style lang="scss" scoped>
.counter-container {
    display: flex;
    align-items: center;
    font-size: 0.9rem;
    font-family: "Monoton-Regular", 'Courier New', Courier, monospace;
    font-variant-numeric: tabular-nums;
}

.unit {
    font-size: 0.9rem;
    margin-left: 8px;
    font-weight: 500;
}
</style>