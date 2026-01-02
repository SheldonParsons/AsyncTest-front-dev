<template>
    <div class="resource-btn" :style="cssVars">
        <slot></slot>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
const props = defineProps({
    t: {
        default: 'inner',
        type: String
    }
})

const cssVars = computed(() => {
    if (props.t === 'inner') {
        return {
            '--t-linear': 'linear-gradient(90deg, #2b323c, #485563, #2b323c)',
            '--t-color': 'white'
        }
    } else {
        return {
            '--t-linear': 'linear-gradient(to right, #0F1716, #1A2A26)',
            '--t-color': '#C5A36A'
        }
    }
})
</script>


<style lang="scss" scoped>
.resource-btn {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    color: var(--t-color);
    font-size: 14px;
    font-weight: 500;
    border: none;
    // background: linear-gradient(90deg, #ffffff, #ffffff, #ffffff);
    background-size: 200% 200%;
    animation: gradient-move 4s ease-in-out infinite;
    // padding: 4px;
    border-radius: 6px 30px 30px 6px;
    box-sizing: border-box;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: "Monoton-Regular", sans-serif;
    background-image:
        url('https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/idea.png'),
        var(--t-linear);

    /* 2. 设置不重复：两个层都不要重复 */
    background-repeat: no-repeat, no-repeat;

    /* 3. 位置：图片靠右居中，渐变背景从左侧开始 */
    /* 逗号分隔：第一个值对应图片，第二个值对应渐变 */
    background-position: right -1px center, 0% 50%;

    /* 4. 大小：图片高度占80%(保持比例)，渐变背景放大到200%以支持流光动画 */
    background-size: auto 100%, 200% 200%;

    /* 5. 动画：应用新的动画 */
    animation: gradient-move-static-img 4s ease-in-out infinite;
}

/* 2. 替换您的 @keyframes (与原来相同，但配合新样式效果不同) */
@keyframes gradient-move {
    0% {
        background-position: 0% 50%;
    }

    50% {
        background-position: 100% 50%;
    }

    100% {
        background-position: 0% 50%;
    }
}
</style>