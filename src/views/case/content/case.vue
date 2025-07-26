<template>
    <div class="case-container">
        <div class="case-container-select">
            <TabSelect></TabSelect>
        </div>
        <div class="case-content">
            <SplitterGroup direction="horizontal" ref="groupRef">
                <SplitterPanel :default-size="100" :min-size="40"
                    style="display:flex; flex-direction:column; height:100%;">
                    <CaseInfo style="padding: 10px;"></CaseInfo>
                    <CaseSteps style="overflow-y: auto;flex: 1;"></CaseSteps>
                </SplitterPanel>
                <SplitterResizeHandle ref="handleRef" class="SplitterResizeHandle"
                    :style="{ width: isCollapsed ? '0px' : '10px' }" />
                <SplitterPanel class="animated-panel" @resize="onPanelResize" style="
            display:flex; flex-direction:column; height:100%;
          " ref="panelRef" :default-size="0" :min-size="0" :max-size="60" :collapsed-size="0">
                    <div style="overflow-y: auto;flex: 1;" class="no-scroll">
                        <InterfacePage :node_id="146" :interface_id="101" :is_case="true"></InterfacePage>
                    </div>
                </SplitterPanel>
            </SplitterGroup>
            <div v-if="isCollapsed" class="floating-handle" @click="togglePanel">
                <span class="vertical-text">SHOW</span>
            </div>
        </div>
    </div>
</template>


<script setup lang="ts">
import TabSelect from '@/assets/motion/tab_select.vue'
import CaseSteps from '@/views/case/content/case_content/tree/index.vue'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import InterfacePage from "@/views/api/child_context/interface_page.vue";
import { ref, computed } from 'vue'
import CaseInfo from '@/views/case/content/case_content/case_info/index.vue'
/** 拿到右侧面板实例 */
const panelRef: any = ref(null)
const handleRef = ref(null)
const COLLAPSE_THRESHOLD = 20
const dandle_id = ref(0)
const isCollapsed = computed(() => {
    try {
        return panelRef.value?.getSize() === 0
    } catch {
        return false
    }
})

/** 切换折叠/展开 */
function togglePanel() {
    if (!panelRef.value) return
    const isCollapsedNow = panelRef.value.getSize() === 0
    panelRef.value.resize(isCollapsedNow ? 60 : 0)
    dandle_id.value += 1
}
async function onPanelResize(newSize: number, oldSize: number) {
    if (!panelRef.value) return
    // 如果拖拽下来到阈值以下，且还没折叠，就 collapse()
    if (newSize <= COLLAPSE_THRESHOLD) {
        panelRef.value.resize(0)
    }
}
const props = defineProps({
    node_id: {
        type: Number,
        default: null,
    },
    case_id: {
        type: Number,
        default: null,
    },
    target_type: {
        type: Number,
        default: -1,
    }
});

</script>

<style lang="scss" scoped>
.case-container {
    display: flex;
    flex-direction: column;
    height: 100%;

    .case-container-select {
        flex: 0 0 auto;
        position: sticky;
        top: 0;
        z-index: 1;
        background-color: white;
        border-bottom: 1px solid var(--border-color-light);
    }

    .case-content {
        height: 100%;
        flex: 1 1 auto;
        overflow: hidden;
    }
}

.SplitterResizeHandle[data-orientation="horizontal"] {
    width: 0.5rem;
    background-color: rgb(242, 244, 247);
}

.SplitterResizeHandle[data-orientation="vertical"] {
    height: 0.5rem
}

/* 垂直文字 + 闪烁动画 */
.floating-handle {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translate(50%, -50%);
    width: 24px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    /* 闪烁 */
    animation: blink 5s infinite;
    // background: rgba(255,126,95, 0.1);
}

/* 文字竖排 */
.vertical-text {
    writing-mode: vertical-rl;
    text-orientation: upright;
    font-size: 12px;
    font-weight: bold;
    /* 定义背景渐变 */
    /* 将背景裁剪到文字（仅 WebKit 内核生效）*/
    -webkit-background-clip: text;
    /* 文字本身透明，这样才能显示背景 */
    -webkit-text-fill-color: transparent;
    /* 对非 WebKit 浏览器，也可以加上普通 background-clip */
    background-clip: text;
    /* 如果希望支持 Firefox，需要开启 text-fill-color 的标准属性（目前仍需前缀或兼容写法） */
    color: transparent;
    font-weight: 800;
    background-image: linear-gradient(90deg, #000000, #FEB47B);
    display: inline-block;
}

/* 闪烁关键帧 */
@keyframes blink {

    0%,
    50%,
    100% {
        opacity: 1;
    }

    25%,
    75% {
        opacity: 0;
    }
}
</style>