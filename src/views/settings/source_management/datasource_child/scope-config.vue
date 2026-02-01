<template>
    <AnimatePresence>
        <motion.div v-if="show" class="scope-config" :initial="{ opacity: 0, height: 0 }"
            :animate="{ opacity: 1, height: 'auto' }"
            :exit="{ opacity: 0, height: 0 }" :transition="{
                duration: 0.25,
                ease: [0.4, 0, 0.2, 1],
                height: { duration: 0.25 },
                opacity: { duration: 0.2 }
            }">

            <!-- 动态背景装饰 -->
            <div class="bg-decoration">
                <motion.div class="decoration-dot dot-1" :animate="{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3]
                }" :transition="{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }" />
                <motion.div class="decoration-dot dot-2" :animate="{
                    scale: [1, 1.3, 1],
                    opacity: [0.2, 0.5, 0.2]
                }" :transition="{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.5
                }" />
            </div>

            <div class="scope-grid">
                <motion.div v-if="showProjects" class="scope-item" :initial="{ opacity: 0, x: -20 }"
                    :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3, delay: 0.1 }">
                    <div class="label-wrapper">
                        <motion.div class="label-icon" :whileHover="{ x: [0, -3, 3, -3, 3, 0] }"
                            :transition="{ duration: 0.5 }">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        </motion.div>
                        <label class="scope-label">{{ projectLabel }}</label>
                    </div>
                    <TagsInputSelect v-model="projectIds" :options="projectList" display-key="name" value-key="id"
                        :disabled="disabled" placeholder="搜索项目..." />
                </motion.div>

                <motion.div v-if="showUsers" class="scope-item" :initial="{ opacity: 0, x: -20 }"
                    :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3, delay: 0.2 }">
                    <div class="label-wrapper">
                        <motion.div class="label-icon" :whileHover="{ x: [0, -3, 3, -3, 3, 0] }"
                            :transition="{ duration: 0.5 }">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </motion.div>
                        <label class="scope-label">{{ userLabel }}</label>
                    </div>
                    <TagsInputSelect v-model="userIds" :options="userList" display-key="search_nick_name" value-key="id"
                        :disabled="disabled" :loading="userSearchLoading" :remote-search="remoteSearchUsers"
                        :is-user-component="true" placeholder="搜索用户..." />
                </motion.div>
            </div>
        </motion.div>
    </AnimatePresence>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
import TagsInputSelect from './tags-input-select.vue'

interface Option {
    id: number
    name: string
}

const props = withDefaults(defineProps<{
    show: boolean
    projectIds?: number[]
    userIds?: number[]
    projectList?: Option[]
    userList?: Option[]
    userSearchLoading?: boolean
    disabled?: boolean
    showProjects?: boolean
    showUsers?: boolean
    projectLabel?: string
    userLabel?: string
    projectPlaceholder?: string
    userPlaceholder?: string
    remoteSearchUsers?: (query: string) => void
}>(), {
    projectIds: () => [],
    userIds: () => [],
    projectList: () => [],
    userList: () => [],
    userSearchLoading: false,
    disabled: false,
    showProjects: true,
    showUsers: true,
    projectLabel: '可读项目',
    userLabel: '可读用户',
    projectPlaceholder: '选择项目',
    userPlaceholder: '搜索用户'
})

const emit = defineEmits<{
    'update:projectIds': [value: number[]]
    'update:userIds': [value: number[]]
}>()

const projectIds = computed({
    get: () => props.projectIds,
    set: (value) => emit('update:projectIds', value)
})

const userIds = computed({
    get: () => props.userIds,
    set: (value) => emit('update:userIds', value)
})
</script>

<style lang="scss" scoped>
// 范围配置展开区域
.scope-config {
    margin-top: 12px;
    padding: 20px;
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
    border-radius: 0;
    border: 1px solid rgba(0, 0, 0, 0.06);
    position: relative;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: all 0.3s ease;

    &:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        border-color: rgba(0, 0, 0, 0.1);
    }

    // 左侧动态装饰条
    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: linear-gradient(180deg, #1a1a1a 0%, #4a4a4a 50%, #1a1a1a 100%);
        background-size: 100% 200%;
        animation: gradient-slide 3s ease-in-out infinite;
    }

    // 顶部微光效果
    &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg,
                transparent 0%,
                rgba(255, 255, 255, 0.8) 50%,
                transparent 100%);
        opacity: 0.6;
    }

    // 内容区域留出左侧空间
    .scope-grid {
        margin-left: 16px;
    }
}

// 背景装饰元素
.bg-decoration {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
}

.decoration-dot {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0, 0, 0, 0.08) 0%, transparent 70%);

    &.dot-1 {
        width: 120px;
        height: 120px;
        top: -40px;
        right: -40px;
    }

    &.dot-2 {
        width: 80px;
        height: 80px;
        bottom: -20px;
        left: 50%;
    }
}

.scope-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.scope-item {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.label-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
}

.label-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: rgba(0, 0, 0, 0.04);
    border-radius: 6px;
    color: #333;
    transition: all 0.3s ease;

    &:hover {
        background: rgba(0, 0, 0, 0.08);
    }

    svg {
        width: 14px;
        height: 14px;
    }
}

.scope-label {
    font-size: 13px;
    font-weight: 600;
    color: #1a1a1a;
    letter-spacing: 0.3px;
}

// 动画定义
@keyframes gradient-slide {
    0% {
        background-position: 0% 0%;
    }

    50% {
        background-position: 0% 100%;
    }

    100% {
        background-position: 0% 0%;
    }
}
</style>
