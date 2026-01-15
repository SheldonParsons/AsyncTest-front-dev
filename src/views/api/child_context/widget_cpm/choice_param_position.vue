<template>
    <div class="ast-tab-core g-unselect">
        <div class="tab-container" ref="containerRef">
            <div v-for="tab in tabs" :key="tab.value" :ref="el => setTabRef(tab.value, el)"
                :class="['tab-item', { 'is-active': active_res_tab === tab.value }]" @click="changeTab(tab.value)">
                <span>{{ tab.label }}</span>
            </div>
            <div class="tab-indicator" :style="indicatorStyle"></div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue'

const emit = defineEmits(['change_tab'])

const props = defineProps({
    active_res_tab: {
        type: Number,
        default: 0
    },
    disable_index: {
        type: Number,
        default: -1
    }
})

const tabs = [
    { label: 'Params', value: 0 },
    { label: 'Body', value: 1 },
    { label: 'Headers', value: 2 },
    { label: '前置操作', value: 5 },
    { label: '后置操作', value: 6 },
    { label: 'Auth', value: 4 }
]

const containerRef = ref<HTMLElement | null>(null)
const tabRefs = ref<Map<number, HTMLElement>>(new Map())
const indicatorLeft = ref(0)
const indicatorWidth = ref(0)

function setTabRef(value: number, el: any) {
    if (el) {
        tabRefs.value.set(value, el)
    }
}

function changeTab(value: number) {
    console.log(value);
    console.log(props.disable_index);


    if (props.disable_index === value) {
        window.$toast({ title: '该功能暂未开放，敬请期待' })
        return
    }
    emit('change_tab', value)
}

function updateIndicator() {
    nextTick(() => {
        const activeTabEl = tabRefs.value.get(props.active_res_tab)
        const containerEl = containerRef.value

        if (activeTabEl && containerEl) {
            const containerRect = containerEl.getBoundingClientRect()
            const tabRect = activeTabEl.getBoundingClientRect()

            indicatorLeft.value = tabRect.left - containerRect.left
            indicatorWidth.value = tabRect.width
        }
    })
}

// 计算指示器位置
const indicatorStyle = computed(() => {
    return {
        transform: `translateX(${indicatorLeft.value}px)`,
        width: `${indicatorWidth.value}px`
    }
})

watch(() => props.active_res_tab, () => {
    updateIndicator()
})

onMounted(() => {
    updateIndicator()
    // 确保布局完成后再次更新
    setTimeout(() => {
        updateIndicator()
    }, 100)
})
</script>

<style lang="scss" scoped>
.ast-tab-core {
    display: inline-flex;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 4px;
}

.tab-container {
    position: relative;
    display: flex;
    gap: 4px;
    background: transparent;
}

.tab-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 7px 14px;
    cursor: pointer;
    transition: all 0.25s ease;
    z-index: 2;
    border-radius: 6px;

    span {
        font-size: 13px;
        font-weight: 600;
        color: #9ca3af;
        transition: color 0.25s ease;
        user-select: none;
        position: relative;
        z-index: 1;
    }

    &:hover:not(.is-active) {
        span {
            color: #10b981;
        }
    }

    &:active {
        span {
            transform: scale(0.96);
        }
    }

    &.is-active {
        span {
            color: #ffffff;
        }
    }
}

// 扁平滑动指示器
.tab-indicator {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 0;
    background: #000000;
    border-radius: 6px;
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 1;
}
</style>