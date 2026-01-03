<script setup lang="ts">
import { ref } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
// @ts-ignore
import { Select } from 'reka-ui/namespaced'
import { Icon } from '@iconify/vue'

const props = defineProps({
    data: {
        default: () => [],
        type: Array as any
    }
})

// 定义事件
const emits = defineEmits(['update:modelValue', 'change'])

const open = ref(false)
const value = ref(null)

// 处理值变化，抛出完整的 item 对象
const handleUpdate = (val: any) => {
    value.value = val
    emits('update:modelValue', val)
    
    // 从 data 中找到完整的对象抛出
    const currentItem = props.data.find((item: any) => item.value === val)
    if (currentItem) {
        emits('change', currentItem)
    }
}
</script>

<template>
    <Select.Root v-model:open="open" :model-value="value" @update:model-value="handleUpdate">
        <Select.Trigger class="trigger" :as-child="true">
            <motion.button 
                :while-hover="{ scale: 1.02 }" 
                :while-press="{ scale: 0.98 }"
                :transition="{ duration: 0.1 }" 
                style="will-change: transform"
            >
                <Select.Value :placeholder="'选择数据类型'" style="font-size: 0.9rem;" />
                <Select.Icon>
                    <Icon icon="mdi:chevron-down" />
                </Select.Icon>
            </motion.button>
        </Select.Trigger>

        <Select.Portal>
            <AnimatePresence>
                <Select.Content 
                    v-if="open"
                    :side-offset="5" 
                    :as-child="true" 
                    style="z-index: 9999;"
                >
                    <motion.div 
                        class="motion-content" 
                        :initial="{ opacity: 0, scale: 0.9 }"
                        :animate="{ 
                            opacity: 1, 
                            scale: 1,
                            transition: {
                                type: 'spring',
                                visualDuration: 0.3,
                                bounce: 0.4,
                            }
                        }" 
                        :exit="{ 
                            opacity: 0, 
                            scale: 0.95,
                            transition: { 
                                duration: 0.1, 
                                ease: 'easeIn' 
                            } 
                        }" 
                        style="will-change: transform, opacity"
                    >
                        <Select.Viewport class="viewport">
                            <Select.Item v-for="item in data" :key="item.value" :value="item.value" class="item"
                                :as-child="true">
                                <motion.div 
                                    :initial="{ backgroundColor: '#0b1011' }"
                                    :while-hover="{ backgroundColor: '#59c173' }"
                                    :transition="{ duration: 0.1, ease: 'linear' }"
                                    style="will-change: background-color"
                                >
                                    <Select.ItemText style="font-size: 0.9rem;">
                                        {{ item.value === 'ds' ? '引用类型' : item.label.charAt(0).toUpperCase() +
                                            item.label.slice(1) }}
                                    </Select.ItemText>
                                </motion.div>
                            </Select.Item>
                        </Select.Viewport>
                    </motion.div>
                </Select.Content>
            </AnimatePresence>
        </Select.Portal>
    </Select.Root>
</template>

<style scope>
.trigger {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 5px;
    padding: 0 15px;
    font-size: 16px;
    line-height: 1;
    height: 35px;
    gap: 5px;
    width: 100%;
    background-color: #0b1011;
    color: #f5f5f5;
    border: 1px solid #1d2628;
    z-index: 9999;
    /* 优化点 3: 添加鼠标手势 */
    cursor: pointer; 
}

/* 移除浏览器默认的 button 样式干扰 */
.trigger button {
    all: unset;
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: space-between;
}

.trigger:focus {
    box-shadow: 0 0 0 2px #0f1115;
}

.motion-content {
    overflow: hidden;
    background-color: #0b1011;
    color: #f5f5f5;
    border: 1px solid #1d2628;
    border-radius: 5px;
}

.viewport {
    padding: 5px;
}

.item {
    font-size: 16px;
    line-height: 1;
    border-radius: 3px;
    display: flex;
    align-items: center;
    height: 30px;
    padding-right: 35px;
    padding-left: 25px;
    position: relative;
    user-select: none;
    cursor: pointer;
}

.item[data-disabled] {
    color: var(--gray-500);
    pointer-events: none;
}

.item[data-highlighted] {
    outline: none;
    /* 让 motion.div 接管背景色，这里透明或移除 */
    background-color: transparent; 
    color: #f5f5f5;
}
</style>