<!-- src/components/ToastView.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
// @ts-ignore
import { Toast } from 'reka-ui/namespaced'

const isVisible = ref(false)
const title = ref('')
const actionText = ref('')
const type = ref<'success' | 'info' | 'error'>('info')
const duration = ref(3000)
const currentTime = ref('')

function formatDate(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Asia/Shanghai'
    }).format(date)
}

let timeoutId: ReturnType<typeof setTimeout> | null = null
let showDelayId: ReturnType<typeof setTimeout> | null = null

function showToast(options: {
    title: string
    actionText: string
    type: 'success' | 'info' | 'error'
    duration?: number
}) {
    // 清除等待显示的延迟器
    if (showDelayId) {
        clearTimeout(showDelayId)
        showDelayId = null
    }

    // 清除已存在的 toast 自动关闭定时器
    if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
    }

    // 马上隐藏旧的 toast
    isVisible.value = false

    // 等待旧动画执行完再显示新的
    showDelayId = setTimeout(() => {
        title.value = options.title
        actionText.value = options.actionText
        type.value = options.type
        duration.value = options.duration ?? 3000
        currentTime.value = formatDate(new Date())
        isVisible.value = true

        // 开始新的自动关闭定时器
        timeoutId = setTimeout(() => {
            isVisible.value = false
            timeoutId = null
        }, duration.value)

        showDelayId = null // 延迟器也清理
    }, 100)
}

// 提供给外部调用
defineExpose({ showToast })

</script>

<template>
    <teleport to="body">
        <div class="toast-container">
            <Toast.Provider v-if="isVisible">
                <Toast.Root :duration="duration" :force-mount="true" :as-child="true">
                    <AnimatePresence mode="wait">
                        <motion.div class="toast-root" :initial="{ opacity: 0, x: 100 }" :animate="{ opacity: 1, x: 0 }"
                            :exit="{ opacity: 0, scale: 0.9 }" :drag="'x'" :drag-elastic="0.1"
                            :drag-constraints="{ left: 0 }">
                            <Toast.Title class="toast-title">{{ title }}</Toast.Title>
                            <Toast.Description :as-child="true">
                                <time class="toast-description" :dateTime="currentTime">{{ currentTime }}</time>
                            </Toast.Description>
                            <Toast.Action :as-child="true" alt-text="Goto schedule to undo">
                                <button class="button small toast-action" :class="type" @click="isVisible = false">{{ actionText
                                    }}</button>
                            </Toast.Action>
                        </motion.div>
                    </AnimatePresence>
                </Toast.Root>
                <Toast.Viewport class="toast-viewport" />
            </Toast.Provider>
        </div>
    </teleport>
</template>

<style>
.toast-container {
    position: fixed;
    right: 0px;
    bottom: 0px;
    z-index: 9999;
    /* 👈 足够高，确保盖过 el-dialog 的遮罩层 */
    /* 其他样式 */
}

.toast-viewport {
    padding: 25px;
    width: 390px;
}

.toast-root {
    background-color: #0b1011;
    border: 1px solid #1d2628;
    border-radius: 10px;
    padding: 15px;
    display: grid;
    grid-template-areas: "title action" "description action";
    grid-template-columns: auto max-content;
    column-gap: 15px;
    align-items: center;
}

.toast-title {
    grid-area: title;
    margin-bottom: 5px;
    font-weight: 500;
    color: white;
    font-size: 15px;
}

.toast-description {
    grid-area: description;
    font-size: 13px;
    color: #ccc;
}

.toast-action {
    grid-area: action;
    background-color: #38b48b;
    color: white;
    padding: 4px 12px;
    border-radius: 6px;
    border: none;
    border-color: black;
}

.toast-action.success {
  background-color: #38b48b;
  color: white;
}

.toast-action.info {
  background-color: #0d63f8;
  color: white;
}

.toast-action.error {
  background-color: #f44336;
  color: white;
}
</style>
