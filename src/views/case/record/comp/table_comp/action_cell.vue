<template>
    <div class="table-action-container">
        <div class="title title-action" @click.stop>
            <div @click="open_child_case_record"
                class="run-btn">Record</div>
        </div>
        <div class="title title-action" @click.stop>
            <motion.div :whilePress="{ scale: 0.95 }" :whileHover="{ scale: 1.1 }" @click="to_step_page"
                class="step-action">Step</motion.div>
        </div>
    </div>

</template>


<script lang="ts" setup>
import { motion } from 'motion-v'

const props = defineProps({
    params: {
        type: null
    }
})

function open_child_case_record() {
    props.params.show_case_table_record(props.params.data.index_in_global_list)
}

function to_step_page() {
    props.params.to_step_page(props.params.data.index_in_global_list,props.params.data.case_id)
}

</script>

<style lang="scss" scoped>
.run-btn {
    width: 80px;
    height: 25px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    color: white;
    font-size: 0.9rem;
    font-weight: 500;
    /* 核心修改 */
    border: none;
    /* 移除边框，让渐变和阴影成为主体 */
    background: linear-gradient(to right, #6c757d, #495057, #343a40);
    /* 柔和的蓝-青渐变 */
    background-size: 200% 200%;
    animation: gradient-move 4s ease-in-out infinite;
    /* 动画更平滑，时间更长 */
    padding: 4px;
    border-radius: 6px;
    /* 更圆润的边角 */
    box-sizing: border-box;
    cursor: pointer;
    transition: all 0.3s ease;
    /* 为悬停效果添加过渡 */
    box-shadow: 0 4px 15px 0 rgba(0, 118, 255, 0.3);
    /* 添加与渐变色匹配的发光效果 */
    font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
}

/* 增强交互反馈 */
.run-btn:hover {
    box-shadow: 0 6px 20px 0 rgba(0, 118, 255, 0.4);
    transform: translateY(-2px);
    /* 悬停时轻微上浮 */
}

.run-btn:active {
    transform: translateY(0);
    /* 点击时恢复原位 */
    box-shadow: 0 2px 10px 0 rgba(0, 118, 255, 0.2);
}

.run-btn svg {
    width: 14px;
}
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

.table-action-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    gap: 5px;

    .step-action {
        width: 60px;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 15px;
        padding: 3px 5px;
        font-weight: 800;
        cursor: pointer;
        transition: transform 0s ease;
        font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
        background-image: linear-gradient(to right, rgb(255, 169, 169), rgb(255, 119, 0), rgb(255, 42, 0));
        -webkit-background-clip: text;
        color: transparent;
    }

    .record-action {
        width: 60px;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 15px;
        padding: 3px 5px;
        font-weight: 800;
        cursor: pointer;
        transition: transform 0s ease;
        font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
        background-image: linear-gradient(to right, rgb(255, 169, 169), rgb(255, 119, 0), rgb(255, 42, 0));
        -webkit-background-clip: text;
        color: transparent;
        border: 2px solid rgb(255, 119, 0);
        border-radius: 5px;
    }
}
</style>