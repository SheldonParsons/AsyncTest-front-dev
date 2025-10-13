<template>
    <div class="counter-container">
        <AnimateNumber :style="number" :value="displayValue" />
        <span class="unit">秒</span>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { AnimateNumber } from 'motion-plus-vue';
import tools from '@/utils/tools'

// 1. Props 定义保持不变
const props = defineProps({
    start_at: {
        type: Number,
        default: 0,
    },
    end_at: {
        type: Number,
        default: 0,
    },
});

const number = {
    fontSize: '1rem',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
};

// 2. 统一的显示值 ref
const displayValue: any = ref(0);

// 3. 动画循环所需的变量
let animationFrameId: number | null = null;

/**
 * 动画更新函数
 * 在每一帧都会被调用，并实时检查 props 的变化
 */
const update = async () => {
    // --- 核心修正：在每一帧都检查 end_at ---
    if (props.end_at > 0) {
        // 如果 end_at 有效，说明计时已结束
        // 立即计算最终耗时并停止动画循环
        const durationMs = props.end_at - props.start_at;
        const finalSeconds = durationMs > 0 ? durationMs / 1000 : 0;

        displayValue.value = Number(finalSeconds.toFixed(2));

        // 清理动画帧，确保循环停止
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null; // 置空以防重复取消
        }
        return; // 结束当前 update 函数的执行
    }
    const diffMs = Math.abs(Date.now() - props.start_at);
    // 2. 将毫秒转换为秒
    const diffSeconds = diffMs / 1000;
    // 3. 使用 toFixed(2) 保留两位小数，并返回字符串
    displayValue.value = Number(diffSeconds.toFixed(2));
    await tools.delaySec(800)
    // 请求下一帧以继续循环
    animationFrameId = requestAnimationFrame(update);
};


// onMounted 现在只负责启动循环
onMounted(async () => {
    if (props.end_at === 0) {
        animationFrameId = requestAnimationFrame(update);
    } else {
        fix_value()
    }
});

async function fix_value() {
    const diffMs = Math.abs(props.end_at - props.start_at);
    // 2. 将毫秒转换为秒
    const diffSeconds = diffMs / 1000;
    // 3. 使用 toFixed(2) 保留两位小数，并返回字符串
    nextTick(() => {
        displayValue.value = Number(diffSeconds.toFixed(2));
    })
}

// onBeforeUnmount 负责在组件销毁时清理定时器
onBeforeUnmount(() => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
});
</script>

<style scoped>
.counter-container {
    display: flex;
    align-items: center;
    font-size: 2rem;
    font-family: "Monoton-Regular", 'Courier New', Courier, monospace;
}

.unit {
    font-size: 0.9rem;
    margin-left: 8px;
    font-weight: 500;
}
</style>