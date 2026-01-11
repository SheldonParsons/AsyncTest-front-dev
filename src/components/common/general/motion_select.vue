<template>
    <Select.Root v-model:open="open" v-model="modelValue" @update:modelValue="handleUpdate">
        <Select.Trigger class="motion-trigger" :as-child="true">
            <motion.button :while-hover="{ scale: 1.02 }" :while-press="{ scale: 0.98 }" :transition="{ duration: 0.1 }"
                style="will-change: transform">
                <Select.Value :placeholder="placeholder" style="font-size: 0.9rem;">
                    {{ selectedLabel }}
                </Select.Value>
                <Select.Icon>
                    <Icon icon="mdi:chevron-down" />
                </Select.Icon>
            </motion.button>
        </Select.Trigger>

        <Select.Portal>
            <AnimatePresence>
                <Select.Content v-if="open" :side-offset="5" :as-child="true" style="z-index: 9999;">
                    <motion.div class="motion-content" :initial="{ opacity: 0, scale: 0.9 }" :animate="{
                        opacity: 1,
                        scale: 1,
                        transition: {
                            type: 'spring',
                            visualDuration: 0.3,
                            bounce: 0.4,
                        }
                    }" :exit="{
                        opacity: 0,
                        scale: 0.95,
                        transition: {
                            duration: 0.1,
                            ease: 'easeIn'
                        }
                    }" style="will-change: transform, opacity">
                        <Select.Viewport class="motion-viewport">
                            <Select.Item v-for="item in options" :key="item[valueField]" :value="item[valueField]"
                                class="motion-item" :as-child="true">
                                <motion.div :initial="{ backgroundColor: '#0b1011' }"
                                    :while-hover="{ backgroundColor: '#59c173' }"
                                    :transition="{ duration: 0.1, ease: 'linear' }"
                                    style="will-change: background-color">
                                    <Select.ItemText style="font-size: 0.9rem;">
                                        {{ item[labelField] }}
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

<script setup lang="ts">
import { ref, computed } from 'vue'
import { motion, AnimatePresence } from 'motion-v'
// @ts-ignore
import { Select } from 'reka-ui/namespaced'
import { Icon } from '@iconify/vue'

// 定义双向绑定，必须提供
const modelValue = defineModel<string | number | any>({ required: true })

const props = defineProps({
    // 数据源
    options: {
        type: Array as any,
        default: () => []
    },
    // 占位符
    placeholder: {
        type: String,
        default: '请选择'
    },
    // 自定义数据结构中 label 的字段名
    labelField: {
        type: String,
        default: 'label'
    },
    // 自定义数据结构中 value 的字段名
    valueField: {
        type: String,
        default: 'value'
    }
})

const selectedLabel = computed(() => {
    // 在 options 中查找与 modelValue 匹配的项
    const target = props.options.find((item: any) => item[props.valueField] === modelValue.value)
    // 如果找到了，返回 label；没找到（或 modelValue 为空），返回 undefined
    return target ? target[props.labelField] : undefined
})

const emit = defineEmits(['change'])

const open = ref(false)

// 处理更新逻辑
const handleUpdate = (val: any) => {
    // 1. modelValue 会自动通过 defineModel 更新，不需要手动 emit update:modelValue

    // 2. 查找完整对象回抛 change 事件 (兼容业务逻辑需求)
    const currentItem = props.options.find((item: any) => item[props.valueField] === val)
    if (currentItem) {
        emit('change', currentItem)
    }
}
</script>

<style lang="scss" scoped>
/* 样式保持不变，但使用了 scoped 避免污染全局 */
.motion-trigger {
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
    cursor: pointer;
}

.motion-trigger button {
    all: unset;
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: space-between;
}

.motion-trigger:focus {
    box-shadow: 0 0 0 2px #0f1115;
}

.motion-content {
    overflow: hidden;
    background-color: #0b1011;
    color: #f5f5f5;
    border: 1px solid #1d2628;
    border-radius: 5px;
    /* 确保下拉框宽度与触发器一致或自适应 */
    min-width: var(--radix-select-trigger-width);
}

.motion-viewport {
    padding: 5px;
}

.motion-item {
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

.motion-item[data-disabled] {
    color: #666;
    /* 替换 var(--gray-500) 为具体颜色或保持 var */
    pointer-events: none;
}

.motion-item[data-highlighted] {
    outline: none;
    background-color: transparent;
    color: #f5f5f5;
}
</style>