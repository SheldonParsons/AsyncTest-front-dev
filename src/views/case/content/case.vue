<template>
    <div class="case-container">
        <div class="case-container-select">
            <TabSelect :selectedTab="current_page" @change="change_page">
                <div class="tab-action">
                    <div class="dataset-group-tab-atcion" v-if="current_page === 1 && isOpen">
                        <AstButton @click="addDataSet">
                            <div style="display: flex; gap: 4px;font-size: 14px;">
                                <AddDatasetAvg style="width: 15px;"></AddDatasetAvg>新建数据集
                            </div>
                        </AstButton>
                    </div>
                </div>
            </TabSelect>
        </div>
        <div class="case-content" v-if="current_page === 0">
            <SplitterGroup direction="horizontal" ref="groupRef" v-if="!loading">
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
            <AstLoading v-else></AstLoading>
            <div v-if="isCollapsed" class="floating-handle" @click="togglePanel">
                <span class="vertical-text">SHOW</span>
            </div>
        </div>
        <div class="data-content" v-if="current_page === 1">
            <motion.div v-if="isOpen" style="width: 100%;height: 100%;position: relative;" :initial="{ opacity: 0 }"
                :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 1.2 }">
                <SplitterGroup direction="horizontal" ref="groupRef">
                    <SplitterPanel :default-size="100">
                        <DataSet ref="datasetRef" @edit="enter_date_set_detail"></DataSet>
                    </SplitterPanel>
                </SplitterGroup>
            </motion.div>
            <motion.div style="width: 100%;height: 100%;position: relative;" v-if="!isOpen" :initial="{ opacity: 0 }"
                :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 1.2 }">
                <div class="floating-handle-left" @click="isOpen = !isOpen">
                    <span class="vertical-text">BACK</span>
                </div>
                <SplitterGroup direction="horizontal" ref="groupRef">
                    <SplitterPanel :default-size="13"
                        style="display:flex; flex-direction:column;align-items: center; height:100%;border-right: 1px solid #f0f0f0;box-sizing: border-box;">
                        <TabSelectCol :selectedTab="current_env" @change="change_env"
                            :tabs="['默认数据', '开发环境', '测试环境', 'UAT']">
                        </TabSelectCol>
                    </SplitterPanel>
                    <SplitterPanel :default-size="1" style="display:flex; flex-direction:column; height:100%;">
                    </SplitterPanel>
                    <SplitterPanel :default-size="84" style="display:flex; flex-direction:column; height:100%;">
                        <DataCore></DataCore>
                    </SplitterPanel>
                    <SplitterPanel :default-size="2" style="display:flex; flex-direction:column; height:100%;">
                    </SplitterPanel>
                </SplitterGroup>
            </motion.div>
        </div>
    </div>
</template>

<script setup lang="ts">
import TabSelect from '@/assets/motion/tab_select.vue'
import TabSelectCol from '@/assets/motion/tab_select_col.vue'
import CaseSteps from '@/views/case/content/case_content/runner/tree/index.vue'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import InterfacePage from "@/views/api/child_context/interface_page.vue";
import { ref, computed, watch } from 'vue'
import CaseInfo from '@/views/case/content/case_content/runner/case_info/index.vue'
import DataCore from '@/views/case/content/case_content/data/index.vue'
import DataSet from '@/views/case/content/case_content/data_set/index.vue'
import AstButton from '@/components/common/general/button.vue'
import AddDatasetAvg from '@/assets/logo/final/match_vue/add_dataset.vue'
import { motion } from 'motion-v'
/** 拿到右侧面板实例 */
const panelRef: any = ref(null)
const handleRef = ref(null)
const COLLAPSE_THRESHOLD = 20
const dandle_id = ref(0)
const current_page = ref(1)
const current_env = ref(1)
const isOpen = ref(true)
const datasetRef: any = ref(null)
const loading = ref(true)
let timer: any = null


watch(current_page, (newVal, oldVal) => {
    if (newVal === 0) {
        // 每次都重置等待
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
            loading.value = false
        }, 500) // 1秒延迟，你可以调整时间
    } else {
        // 只要不是0就立即清除定时器（可选）
        if (timer) clearTimeout(timer)
        loading.value = true
    }
})

const isCollapsed = computed(() => {
    try {
        return panelRef.value?.getSize() === 0
    } catch (error) {
        return false
    }
})

async function change_page(index: number) {
    current_page.value = index
}

async function change_env(index: number) {
    current_env.value = index
}

function enter_date_set_detail(data_set_id: number) {
    isOpen.value = !isOpen.value
}

function addDataSet() {
    datasetRef.value.addDataset()
}

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

        .tab-action {
            display: flex;
            justify-content: end;
            align-items: center;
            height: 100%;

            .dataset-group-tab-atcion {
                display: flex;
                align-items: center;
                height: 100%;
                padding-right: 20px;
            }
        }
    }

    .case-content,
    .data-content {
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
    animation: blink 5s infinite;
}

.floating-handle-left {
    position: absolute;
    top: 50%;
    left: 0;
    transform: translate(0%, -100%);
    width: 24px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    animation: blink 5s infinite;
    z-index: 1;
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
    background-image: linear-gradient(90deg, #000000, #654730);
    display: inline-block;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
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