<template>
    <div class="motion-container">
        <DropdownMenu.Root v-model:open="open">
            <DropdownMenu.Trigger as-child>
                <motion.button class="motion-trigger" :style="{
                    color: typingAttrMapping[scope.row.t]['color'],
                }" :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.95 }">
                    {{ scope.row.t.charAt(0).toUpperCase() + scope.row.t.slice(1) }} ▾
                </motion.button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <AnimatePresence>
                    <DropdownMenu.Content v-if="open" :side-offset="10" style="z-index: 9999;">
                        <motion.div class="motion-content" :initial="{ opacity: 0, scale: 0.85 }"
                            :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.85 }"
                            :transition="{ duration: 0.2 }" :style="{ willChange: 'transform, opacity' }">
                            <DropdownMenu.Item v-for="item in props.data" :key="item.value" as-child>
                                <motion.button class="motion-item" :while-hover="highlight" :while-focus="highlight"
                                    :while-press="{ scale: 0.95 }" @click="handleCommand([scope.row, item])">
                                    {{  item.label.charAt(0).toUpperCase() + item.label.slice(1) }}
                                </motion.button>
                            </DropdownMenu.Item>
                        </motion.div>
                    </DropdownMenu.Content>
                </AnimatePresence>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
// @ts-ignore
import { DropdownMenu } from 'reka-ui/namespaced'
import { motion, AnimatePresence } from 'motion-v'
import GlobalStatus from "@/global";

const typingAttrMapping: any = GlobalStatus.regular_type_info_map();

// 2. 定义组件的 props
const props = defineProps<{
    // `current` 用于显示在触发器按钮上的当前值
    scope: any;
    // `data` 是下拉菜单的选项列表
    data: Array<any>;
}>()

// 3. 定义组件要触发的事件
const emit = defineEmits<{
    // `command` 事件在用户点击选项时触发，并携带选项的 value
    (e: 'command', value: string | number): void;
}>()

const open = ref(false)
const highlight = {
    backgroundColor: "#59c173",
}

// 4. 点击事件处理函数
const handleCommand = (command: any) => {
    console.log(command);
    
    // 触发 command 事件，将选中的 value 传递给父组件
    emit('command', command)
    // 选择后关闭下拉菜单
    open.value = false
}
</script>

<style>
/* 样式保持不变 */
.motion-container {
    display: flex;
    align-items: center;
    justify-content: center;
}

.motion-trigger {
    padding: 4px 8px;
    border-radius: 6px;
    background-color: #ffffff;
    color: #ffffff;
    border: 0px solid #1d2628;
    cursor: pointer;
    width: 90px;
    font-weight: 500;
    font-size: 0.9rem;
}

.motion-content {
    width: 120px;
    background-color: #0b1011;
    border: 1px solid #1d2628;
    border-radius: 6px;
    padding: 4px;
    box-sizing: border-box;
}

.motion-item {
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: none;
    color: #f5f5f5;
    text-align: left;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    box-sizing: border-box;
}
</style>