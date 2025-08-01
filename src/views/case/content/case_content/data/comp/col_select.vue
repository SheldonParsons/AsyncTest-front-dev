<template>
    <div class="col-select-container">
        <DropdownMenu.Root v-model:open="open">
            <DropdownMenu.Trigger as-child>
                <MoreBtn></MoreBtn>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal >
                <AnimatePresence>
                    <DropdownMenu.Content :side-offset="10" :style="{ zIndex: 200 }">
                        <motion.div class="col-select-content" :initial="{ opacity: 0, scale: 0.85 }"
                            :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.85 }"
                            :transition="{ duration: 0.2 }" :style="{ willChange: 'transform, opacity' }">
                            <DropdownMenu.Item as-child v-if="has_action.includes('edit')">
                                <motion.button class="item" @click="edit_col" :while-hover="highlight"
                                    :while-focus="highlight" :while-press="{ scale: 0.95 }">
                                    <EditBtn></EditBtn>批量编辑此列
                                </motion.button>
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator class="separator" v-if="has_action.includes('delete')" />
                            <DropdownMenu.Item as-child v-if="has_action.includes('delete')">
                                <motion.button class="item" @click="delete_col" :while-hover="highlight"
                                    :while-focus="highlight" :while-press="{ scale: 0.95 }">
                                    <DeleteBtn></DeleteBtn>删除此列
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
import DeleteBtn from '@/components/common/mini_btn/delete.vue'
import MoreBtn from '@/components/common/mini_btn/more.vue'
import EditBtn from '@/components/common/mini_btn/edit.vue'

const open = ref(false)
const highlight = {
    backgroundColor: "rgba(0,0,0)",
}

const emit = defineEmits(['delete_col', 'edit_col'])

const props = defineProps({
    has_action: {
        default: ['edit', 'delete']
    }
})

function delete_col() {
    emit('delete_col')
}

function edit_col() {
    emit('edit_col')
}
</script>

<style lang="scss" scope>
.col-select-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
}

.col-select-content {
    min-width: 160px;
    background-color: white;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    padding: 4px;
    box-sizing: border-box;
    z-index: 100;

    .item {
        width: 100%;
        padding: 8px 12px;
        border: none;
        background: none;
        color: rbga(0, 0, 0);
        text-align: left;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: start;
    }

    .item:hover {
        color: white;
    }

    .separator {
        height: 1px;
        background-color: #f0f0f0;
        margin: 4px 0;
    }
}
</style>
