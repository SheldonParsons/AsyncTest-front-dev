<template>
    <div class="tab-data-case-group">
        <div class="guide"></div>
        <nav class="tab-select-vertical">
            <ul>
                <li v-for="(name, index) in tabs" :key="index" :class="{ selected: selectedTab === index }" role="tab"
                    :aria-selected="selectedTab === index">
                    <motion.div v-if="selectedTab === index" layout-id="selected-indicator-data"
                        class="selected-indicator" />
                    <motion.button :animate="{ color: selectedTab === index ? '#fff' : '#333' }"
                        :transition="{ color: { duration: 0 } }" @press-start="() => setSelectedTab(index)"
                        :while-press="{ scale: 0.95 }" :while-focus="{ backgroundColor: 'var(--accent-transparent)' }">
                        {{ name }}
                    </motion.button>
                </li>
            </ul>
        </nav>
    </div>
</template>

<script setup lang="ts">
import { motion } from 'motion-v'

const emit = defineEmits(['change'])

const props = defineProps({
    selectedTab: {
        type: Number,
        default: 0
    },
    tabs: {
        default: [],
        type: Array<String>
    }
})

const setSelectedTab = (index: any) => {
    emit('change', index)
}
</script>

<style lang="scss" scoped>
.tab-data-case-group {
    .tab-select-vertical {
        background-color: white;
        border-radius: 10px;
        padding: 20px 5px;
        width: 120px;
        /* 竖向建议宽度适中 */
    }

    .tab-select-vertical ul {
        display: flex;
        flex-direction: column;
        /* 改为列方向 */
        gap: 8px;
        align-items: stretch;
        justify-content: flex-start;
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .tab-select-vertical li {
        color: black;
        position: relative;
        height: 30px;
        width: 100%;
        margin: 0;
        border-radius: 8px;
    }

    .tab-select-vertical .selected-indicator {
        background-color: #333;
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        z-index: 1;
        border-radius: 8px;
        height: 100%;
        width: 100%;
        transition: background 0.2s;
    }

    .tab-select-vertical button {
        font-weight: 600;
        z-index: 2;
        position: relative;
        cursor: pointer;
        padding: 0 14px;
        border-radius: 8px;
        background: none;
        color: black;
        border: none;
        width: 100%;
        height: 100%;
        text-align: left;
        outline: none;
        font-size: 14px;
        transition: none !important;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
    }
}
</style>