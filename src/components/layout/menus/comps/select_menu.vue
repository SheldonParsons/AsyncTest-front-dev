<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import InterfaceIcon from "@/assets/svg/common/interface.vue";
import CopyIcon from "@/assets/svg/common/copy.vue";
import MoveIcon from "@/assets/svg/common/move.vue";
import FolderPlusIcon from "@/assets/svg/common/fold_plus.vue";
import DeleteIcon from "@/assets/svg/common/delete.vue";
import {
    DropdownMenuArrow,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuItemIndicator,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuRoot,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from 'reka-ui'
import { ref } from 'vue'

const toggleState = ref(false)
const checkboxOne = ref(false)
const checkboxTwo = ref(false)
const person = ref('pedro')

const bookmarksChecked = ref(true)
const urlsChecked = ref(false)

const props = defineProps({
    data: {
        default: null,
        type: null
    }
})
const emit = defineEmits(['close', 'action'])

function menu_action(_index: any, _name: any) {
    emit("action", _index, _name, props.data)
}

function get_system() {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

</script>

<template>
    <DropdownMenuRoot v-model:open="toggleState">
        <DropdownMenuTrigger style="background-color: transparent;border: none;padding: 0px;margin: 0px;" @click.stop>
            <slot></slot>
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
            <AnimatePresence>
                <DropdownMenuContent @closeAutoFocus="emit('close')">
                    <motion.div class="context-menu-content" :initial="{ opacity: 0, scale: 0.9 }"
                        :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.9 }">
                        <DropdownMenuItem class="context-menu-item" :disabled="data.child_type === 3"
                            @select="menu_action(3, 'create_case_under_dir')">
                            添加用例
                            <div class="context-menu-shortcut">
                                <InterfaceIcon></InterfaceIcon>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem class="context-menu-item" :disabled="data.child_type === 3"
                            @select="menu_action(4, 'create_child_dir')">
                            添加子目录
                            <div class="context-menu-shortcut">
                                <FolderPlusIcon></FolderPlusIcon>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem class="context-menu-item" :disabled="data.child_type === 0"
                            @select="menu_action(2, 'copy_node')">
                            复制
                            <div class="context-menu-shortcut">
                                <CopyIcon></CopyIcon>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem class="context-menu-item" :disabled="data.child_type === 0"
                            @select="menu_action(2, 'move_to')">
                            移动
                            <div class="context-menu-shortcut">
                                <MoveIcon></MoveIcon>
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger class="context-menu-item">
                                更多操作
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
                                    xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95694 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95694 3.32394 6.1584 3.13508Z"
                                        fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" />
                                </svg>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <AnimatePresence>
                                    <DropdownMenuSubContent>
                                        <motion.div class="context-menu-content" :initial="{ opacity: 0, x: -10 }"
                                            :animate="{ opacity: 1, x: 0 }" :exit="{ opacity: 0, x: -10 }" :transition="{
                                                type: 'spring',
                                                stiffness: 400,
                                                damping: 20,
                                                opacity: { duration: 0.2 },
                                            }">
                                            <DropdownMenuItem class="context-menu-item danger"
                                                :disabled="data.child_type === 0"
                                                @select="menu_action(2, 'delete_node')">
                                                删除
                                                <div class="context-menu-shortcut">
                                                    <DeleteIcon></DeleteIcon>
                                                </div>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator class="context-menu-separator" />
                                            <DropdownMenuItem class="context-menu-item">
                                                Developer Tools
                                                <div class="context-menu-shortcut">{{ get_system() ? '⌘+⌥+I' :
                                                    'F12' }}</div>
                                            </DropdownMenuItem>
                                        </motion.div>
                                    </DropdownMenuSubContent>
                                </AnimatePresence>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator class="context-menu-separator" />

                        <DropdownMenuCheckboxItem class="context-menu-item" disabled style="display: flex;gap: 5px;"
                            v-model="bookmarksChecked">
                            <DropdownMenuItemIndicator style="display: flex;justify-content: center;">
                                <svg t="1761200868917" class="icon" viewBox="0 0 1024 1024" version="1.1"
                                    xmlns="http://www.w3.org/2000/svg" p-id="8045" width="15" height="15">
                                    <path
                                        d="M762.688 1007.936c-16.64 0-33.152-4.16-47.744-12.032l-203.968-109.824-203.904 109.824c-33.088 17.6-74.496 15.232-104.896-5.568-31.296-21.568-47.36-59.328-41.152-96.128l39.936-238.656L28.672 483.456C2.112 457.152-6.784 418.88 5.248 383.68 17.344 348.8 47.744 323.712 84.672 318.272l234.496-34.88 101.76-211.392c16.384-33.984 51.776-56 90.048-56 38.336 0 73.664 21.952 89.92 56l101.888 211.392 234.432 34.88c36.992 5.44 67.392 30.528 79.424 65.344 12.096 35.264 3.136 73.472-23.296 99.84l-172.416 172.096 40.064 238.656c6.208 36.864-9.984 74.624-41.216 96.064C802.88 1001.792 783.168 1007.936 762.688 1007.936"
                                        fill="#FDBC00" p-id="8046"></path>
                                </svg>
                            </DropdownMenuItemIndicator>
                            标为重要
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem class="context-menu-item" disabled style="display: flex;gap: 5px;"
                            v-model="bookmarksChecked">
                            <DropdownMenuItemIndicator style="display: flex;justify-content: center;">
                                <svg t="1761201562866" class="icon" viewBox="0 0 1024 1024" version="1.1"
                                    xmlns="http://www.w3.org/2000/svg" p-id="7491" width="15" height="15">
                                    <path
                                        d="M870.4 730.368a55.8592 55.8592 0 0 1-16.896 40.96l-81.92 81.92a58.2144 58.2144 0 0 1-81.92 0L512 675.84l-177.408 177.6128a58.2144 58.2144 0 0 1-81.92 0l-81.92-81.92a58.2656 58.2656 0 0 1 0-81.92L347.8528 512 170.496 334.5408a58.2656 58.2656 0 0 1 0-81.92l81.92-81.92a58.3168 58.3168 0 0 1 81.92 0L512 347.8016l177.408-177.408a58.3168 58.3168 0 0 1 81.92 0l81.92 81.92a58.2656 58.2656 0 0 1 0 81.92L676.096 512l177.408 177.3568a55.9616 55.9616 0 0 1 16.896 41.0112z"
                                        fill="#ff0088" p-id="7492"></path>
                                </svg>
                            </DropdownMenuItemIndicator>
                            标为废弃
                        </DropdownMenuCheckboxItem>
                    </motion.div>
                </DropdownMenuContent>
            </AnimatePresence>
        </DropdownMenuPortal>
    </DropdownMenuRoot>
</template>

<style lang="scss" scoped>
.context-menu-container {
    /* display: flex;
    align-items: center;
    justify-content: center; */
    /* min-height: 200px; */
    /* background-color: #0b1011; */
    /* border: 1px solid #1d2628; */
    /* border-radius: 6px; */
    width: 100%;
}

.context-menu-trigger {
    /* display: block; */
    width: 100%;
    /* height: 200px;
    display: flex;
    align-items: center;
    justify-content: center; */
}

.context-menu-content {
    background-color: var(--layer-transparent);
    backdrop-filter: blur(10px);
    border: 1px solid #90a4a8;
    color: black;
    border-radius: 6px;
    padding: 4px;
    margin-top: 5px;
    transform-origin: var(--radix-context-menu-content-transform-origin);
}

.context-menu-item:hover {
    color: white;
}

.context-menu-item.danger:hover {
    color: white;
}

.context-menu-item {
    width: 100%;
    min-width: 180px;
    padding: 8px 12px;
    border: none;
    background: none;
    text-align: left;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
}

.context-menu-item[data-disabled] {
    color: #777777;
    cursor: not-allowed;
}

.context-menu-item[data-highlighted] {
    background-color: black;
    outline: none;
}

.context-menu-item[data-highlighted] .shortcut {
    color: #f5f5f5;
}

.context-menu-item.danger {
    color: #ff0088;
}

.context-menu-item.danger[data-disabled] {
    color: #777777;
    cursor: not-allowed;
}

.context-menu-item.danger[data-highlighted] {
    background-color: black;
    outline: none;
}



.context-menu-shortcut {
    color: var(--feint-text);
    font-size: 12px;
    margin-left: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.context-menu-separator {
    height: 1px;
    background-color: #333;
    margin: 4px 0;
}
</style>