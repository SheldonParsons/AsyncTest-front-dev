<template>
    <motion.div class="case-info-container">
        <motion.div class="tag">
            <TagsInputRoot v-model="modelValue" class="tags-input-root">
                <motion.div style="height: 27px;"></motion.div>
                <TagsInputItem v-for="item in modelValue" :key="item" :value="item" class="tags-input-item">
                    <TagsInputItemText class="tags-input-item-text" />
                    <TagsInputItemDelete class="tags-input-item-delete">
                        <CloseIcon style="height: 15px;color: white;" />
                    </TagsInputItemDelete>
                </TagsInputItem>
                <TagsInputInput placeholder="标签..." class="tags-input-input" />
            </TagsInputRoot>
        </motion.div>
    </motion.div>
</template>

<script lang="ts" setup>
import { motion } from 'motion-v'
import { TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText, TagsInputRoot } from 'reka-ui'
import { ref } from 'vue'
import CloseIcon from '@/assets/logo/final/match_vue/close.vue'

const modelValue = ref(['Apple', 'Banana'])
</script>




<style lang="scss" scoped>
.case-info-container {
    display: flex;
    flex-direction: column;

    .tags-input-root {
        display: flex;
        gap: 0.5rem;
        /* gap-2 */
        align-items: center;
        /* items-center */
        /* border + border-blackA7 */
        padding: 0.5rem;
        /* p-2 */
        border-radius: 0.5rem;
        /* w-[380px]（已包含 w-full） */
        flex-wrap: wrap;
        /* flex-wrap */
        background-color: #ffffff;
        /* bg-white */
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    /* 每个标签项 */
    .tags-input-item {
        cursor: default;
        display: flex;
        align-items: center;
        /* items-center */
        justify-content: center;
        /* justify-center */
        gap: 0.5rem;
        /* gap-2 */
        padding: 0.25rem;
        /* p-1 */
        border-radius: 0.3rem;
        /* rounded */
        background: linear-gradient(to right, #000000 50%, #0a3f0a 100%);
        /* bg-green8 */
        color: #ffffff;
        /* text-white */
        box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
        /* shadow-md */
    }

    /* 当前选中项背景更深 */
    .tags-input-item[aria-current="true"] {
        background: linear-gradient(to right, #a0a0a0 0%, #0a3f0a 100%);
        /* aria-[current=true]:bg-green9 */
    }

    /* 标签文字 */
    .tags-input-item-text {
        font-size: 0.875rem;
        /* text-sm */
        padding-left: 0.25rem;
        /* pl-1 */
    }

    /* 删除按钮 */
    .tags-input-item-delete {
        cursor: pointer;
        display: flex;
        align-items: center;
        border: none;
        padding: 0.125rem;
        /* p-0.5 */
        border-radius: 0.25rem;
        /* rounded */
        background-color: transparent;
        /* bg-transparent */
    }

    .tags-input-item-delete:hover {
        background-color: rgba(192, 192, 192, 0.25);
        /* hover:bg-blackA4 */
    }

    /* 输入框 */
    .tags-input-input {
        font-size: 0.875rem;
        /* text-sm */
        flex: 1 1 0%;
        /* flex-1 */
        border-radius: 0.25rem;
        /* rounded */
        color: #7a5c61;
        /* text-green9 */
        background-color: transparent;
        /* bg-transparent */
        padding: 0 0.25rem;
        /* px-1 */
        outline: none;
        border: none;
    }

    .tags-input-input:focus {
        outline: none;
        /* focus:outline-none */
    }

    .tags-input-input::placeholder {
        color: #7a5c61;
        /* placeholder:text-mauve9 */
    }
}
</style>