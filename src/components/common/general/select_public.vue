<script setup lang="ts">
import { ref } from 'vue'
// @ts-ignore
import { DropdownMenu } from 'reka-ui/namespaced'
import { motion, AnimatePresence } from 'motion-v'

const emit = defineEmits(['change'])

const open = ref(false)
const highlight = {
    background: "linear-gradient(80deg, #ffd460 0%, #f8b98c 40%, #f07b3f 90%)",
}

function change(project_item: any) {
    emit('change', project_item)
}

const props = defineProps({
    items: {
        default: [],
        type: null
    },
    current: {
        default: -1
    },
    padding: {
        default: '4px 8px'
    }
})

function get_current_name() {
    const current_item: any = props.items.filter((element: any) => {
        return element.key == props.current
    });
    if (current_item.length > 0) {
        return current_item[0].value
    }
    return '请选择'
}
</script>

<template>
    <div class="ast-select-container">
        <DropdownMenu.Root v-model:open="open">
            <DropdownMenu.Trigger as-child>
                <motion.button class="ast-select-trigger" :style="{padding: padding}" :while-press="{ scale: 0.95 }">
                    {{ get_current_name() }} ▾
                </motion.button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <AnimatePresence>
                    <DropdownMenu.Content style="z-index: 999;" :side-offset="10">
                        <motion.div class="ast-select-content" :initial="{ opacity: 0, scale: 0.85 }"
                            :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.85 }"
                            :transition="{ duration: 0.2 }" :style="{ willChange: 'transform, opacity' }">
                            <DropdownMenu.Item as-child v-for="(item, index) in items" :key="index"
                                @click="change(item)">
                                <motion.button class="ast-select-item" :while-hover="highlight" :while-focus="highlight"
                                    :while-press="{ scale: 0.95 }">
                                    {{ item.value }}
                                </motion.button>
                            </DropdownMenu.Item>
                        </motion.div>
                    </DropdownMenu.Content>
                </AnimatePresence>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    </div>
</template>

<style>
.ast-select-container {
    display: flex;
    align-items: center;
    justify-content: start;
}

.ast-select-trigger {
    border-radius: 6px;
    background-color: #0b1011;
    color: #f5f5f5;
    border: 1px solid #1d2628;
    cursor: pointer;
    font-weight: 500;
    line-height: 1.2;
    width: 100%;
}

.ast-select-content {
    background-color: #0b1011;
    border: 1px solid #1d2628;
    border-radius: 6px;
    padding: 4px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

.ast-select-item {
    /* width: 100%; */
    padding: 4px 12px;
    border: none;
    background: none;
    color: #f5f5f5;
    text-align: left;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    box-sizing: border-box;
}

.ast-select-separator {
    height: 1px;
    background-color: #1d2628;
    margin: 4px 0;
}
</style>
