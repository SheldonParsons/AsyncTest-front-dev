<template>
    <div class="case-tab-container">
        <nav class="tab-select-container">
            <ul>
                <li v-for="(name, index) in tabs" :key="index" :class="{ selected: selectedTab === index }" role="tab"
                    :aria-selected="selectedTab === index">
                    <motion.div v-if="selectedTab === index" :layout-id="uniqueLayoutId"
                        class="selected-indicator" />
                    <motion.button :animate="{ color: selectedTab === index ? '#ffffff' : '#333' }"
                        :transition="{ color: { duration: 0 } }" @press-start="() => setSelectedTab(index)"
                        :while-press="{ scale: 0.9 }" :while-focus="{ backgroundColor: 'var(--accent-transparent)' }">
                        {{ name }}
                    </motion.button>
                </li>
            </ul>
        </nav>
        <div class="other-action">
            <slot></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import { motion } from 'motion-v'
import { getCurrentInstance } from 'vue'
const instance = getCurrentInstance()
const uniqueLayoutId = `selected-indicator-${instance?.uid}`

const emit = defineEmits(['change'])

const props = defineProps({
    selectedTab: {
        type: Number,
        default: 0
    },
    tabs: {
        type: null,
        default: ["测试步骤", "测试数据", "执行记录"]
    }
})

const setSelectedTab = (index: number) => {
    emit('change', index)
}
</script>

<style lang="scss" scoped>
.case-tab-container {
    display: flex;
    justify-content: space-between;

    .other-action {
        flex: 50;
    }
}

.tab-select-container {
    background-color: white;
    border-radius: 10px;
    padding: 10px 20px;
    width: 20%;
    flex: 50;
    display: flex;
    justify-content: start;
    align-items: center;
}

.tab-select-container ul {
    display: flex;
    gap: 5px;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    list-style: none;
    margin: 0;
    padding: 0;
}

.tab-select-container li {
    color: black;
    position: relative;
    height: 30px;
    width: 90px !important;
}

.tab-select-container .selected-indicator {
    background-color: black;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    z-index: 1;
    border-radius: 5px;
    color: black;
    height: 100%;
    width: 90px;
}

.tab-select-container .selected-btn {
    color: white;
}

.tab-select-container button {
    font-weight: 600;
    z-index: 2;
    position: relative;
    cursor: pointer;
    padding: 0px 14px;
    border-radius: 5px;
    background: none;
    color: black;
    border: none;
    height: 100%;
    transition: none !important;
    width: 90px;
}
</style>
