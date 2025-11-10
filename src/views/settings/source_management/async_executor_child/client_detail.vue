<template>
    <div class="client-detail-container">
        <div class="task-edit-item">
            <InputAnimation v-model="data.name" :placeholder="'Client名称'" :maxLength="50"></InputAnimation>
        </div>
        <div class="task-edit-item">
            <div class="step-tips">
                <div>
                    需要提醒您的是，此处您填写的IP和端口信息请确保AsyncTest服务器能够正常访问，并且该服务器需要正确安装和启动AsyncExecutor。
                </div>
            </div>
        </div>
        <div class="task-edit-item">
            <InputAnimation v-model="data.ip" :placeholder="'IP'" :maxLength="50"></InputAnimation>
        </div>
        <div class="task-edit-item">
            <InputAnimation v-model="data.port" :placeholder="'端口'" :maxLength="50"></InputAnimation>
        </div>
    </div>
    <div style="padding: 10px 0px;">
        <motion.div @click="ping" class="run-btn" :whilePress="{ scale: 0.9 }" :whileHover="{ scale: 1.05 }">
            <PingSvg />
            <div>Ping</div>
        </motion.div>
    </div>
</template>

<script lang="ts" setup>

import { onMounted, ref } from 'vue'
import { motion } from 'motion-v'
import PingSvg from '@/assets/logo/final/match_vue/ping.vue'
import InputAnimation from '@/components/common/general/input.vue'
import { useRoute } from 'vue-router'
import _ from 'lodash'

const route = useRoute()

const props = defineProps({
    is_edit: {
        default: false,
        type: Boolean
    },
    client_info: {
        default: null,
        type: null
    }
})

function check_content(check_name: boolean = true) {
    if (!data.value) {
        window.$toast({ title: '系统错误', type: 'error' })
        return false
    }
    if (check_name === true) {
        if (data.value.name.length === 0) {
            window.$toast({ title: '请填写Client名称' })
            return false
        }
    }
    if (data.value.ip.length === 0) {
        window.$toast({ title: '请填写IP信息' })
        return false
    } else if (data.value.port.length === 0) {
        window.$toast({ title: '请填写端口信息' })
        return false
    }
    const num = Number(data.value.port);
    if (!Number.isInteger(num) || num <= 0) {
        window.$toast({ title: '端口不合法，请重新填写' })
        return false
    }
    return true
}

function get_data() {
    data.value.project_id = Number(route.params.project)
    return data.value
}

const emit = defineEmits(['ping'])

defineExpose({ check_content, get_data })

async function ping() {
    if (check_content(false) === false) {
        return
    }
    emit('ping', data.value)
}

const data: any = ref({})

onMounted(() => {
    if (props.is_edit) {
        data.value = _.cloneDeep(props.client_info)
    } else {
        data.value = {
            name: '',
            ip: '',
            port: ''
        }
    }
})

</script>

<style lang="scss" scoped>
.client-detail-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: start;
    width: 700px;
    gap: 10px;

    .task-edit-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 5px;

        .title {
            font-size: 0.9rem;
            white-space: nowrap;
        }
    }
}

.step-tips {
    div {
        box-sizing: border-box;
        border-radius: 8px;
        border: 2px solid #f0f0f0;
        font-weight: 500;
        font-size: 0.9rem;
        padding: 10px;
        color: rgba($color: #000000, $alpha: 0.8);
        background: linear-gradient(80deg, #ffd460 0%, #f8b98c 40%, #f07b3f 90%)
    }
}

.run-btn {
    width: 80px;
    height: 25px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    /* 核心修改 */
    border: none;
    /* 移除边框，让渐变和阴影成为主体 */
    background: linear-gradient(90deg, #b3d53a, #6fd700, #3ad561);
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