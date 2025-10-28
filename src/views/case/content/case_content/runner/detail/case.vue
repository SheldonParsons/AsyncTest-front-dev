<template>
    <div style="padding: 10px 10px 0px 10px;display: flex;justify-content: start;" class="project-label-container"
        ref="containerRef">
        <span style="font-size: 0.9rem;font-weight: 500;">所属项目：</span>
        <motion.span style="font-size: 16px;" class="project-label">{{ data.project_name }}</motion.span>
    </div>
    <div class="step-tips">
        <div>
            引用的测试用例将根据它自己的执行方式、驱动方式对旗下的步骤进行执行。获取环境变量时可以正常使用引用用例本身项目的环境变量，对应的服务也将使用用例本身的服务信息。
        </div>
    </div>
    <div class="step-info">
        <div class="step-container">
            <div class="step-title">
                <InputUnderLine v-model="data.label" :maxLength="225" :placeholder="'步骤名称'">
                </InputUnderLine>
            </div>
            <div class="step-item">
                <div>环境选择</div>
                <div>
                    <Select :current="data.env_strategy" :items="envStrategy" @change="changeEnvStraegy"></Select>
                </div>
            </div>
            <div class="step-item">
                <div>发生错误时</div>
                <div>
                    <Select :current="data.error_strategy" :items="errorCaseStrategy"
                        @change="changeErrorStraegy"></Select>
                </div>
            </div>
            <div class="step-item">
                <div>运行时是否覆盖变量</div>
                <div>
                    <Select :current="data.runtime_parameters_strategy" :items="errorParamsCoverStrategy"
                        @change="changeParamStraegy"></Select>
                </div>
            </div>
            <div class="step-item">
                <div style="display: inline-block;white-space: nowrap;">执行方式</div>
                <div>
                    <Radio v-model="data.loop_strategy" :items="caseMultitaskerLoopStrategy"></Radio>
                </div>
                <div style="width: 20px;height: 100%;display: flex;align-items: center;">
                    <TooltipAnimation :isOpen="showRunTooltip">
                        <template #trigger><span
                                style="color: rgba(0,0,0);width: 1rem;height: 20px;display: flex;align-items: center;cursor: pointer;"
                                @mouseenter="showRunTooltip = true" @mouseleave="showRunTooltip = false">
                                <InfoSvg />
                            </span></template>
                        <template #default>
                            <div style="display: flex;flex-direction: column;gap: 5px;">
                                <div>执行方式</div>
                                <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">【顺序执行】将以同步的方式运行您的任务。
                                </div>
                                <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                    【并发执行】可以更快的执行您的任务，并获取结果。但请确保您的服务可以正确的接受它。</div>
                            </div>
                        </template>
                    </TooltipAnimation>
                </div>
            </div>
            <div class="step-item">
                <div style="display: inline-block;white-space: nowrap;">驱动方式</div>
                <div style="width: 100%;">
                    <Radio v-model="data.drive_strategy" :items="caseMultitaskerDriveStrategy"></Radio>
                </div>
            </div>
            <div class="step-item" v-if="data.drive_strategy === 'times'">
                <div style="display: inline-block;white-space: nowrap;">循环次数</div>
                <div>
                    <InputAnimation v-model="data.loop_times" :placeholder="'循环次数'" :maxLength="50"></InputAnimation>
                </div>
                <div style="width: 20px;height: 100%;">
                    <TooltipAnimation :isOpen="showIdTooltip">
                        <template #trigger><span style="color: rgba(0,0,0);width: 0.7rem;"
                                @mouseenter="showIdTooltip = true" @mouseleave="showIdTooltip = false">
                                <InfoSvg />
                            </span></template>
                        <template #default>
                            <div style="display: flex;flex-direction: column;gap: 5px;">
                                <div>循环次数</div>
                                <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">您可以填入一个变量值来动态的设置它。</div>
                                <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                    如果该变量是一个整数时，将会循环该整数的次数。当它为一个数组时，将取该数组的长度作为循环次数。</div>
                            </div>
                        </template>
                    </TooltipAnimation>
                </div>
            </div>
            <div class="step-item" v-if="data.drive_strategy === 'dataset'">
                <div style="display: inline-block;white-space: nowrap;">选择数据集</div>
                <div>
                    <Select :current="data.data_set" :items="dataset_list" @change="changeDataset"></Select>
                </div>
            </div>
            <div class="step-item" style="width: 100%;" v-if="data.drive_strategy === 'script'">
                <MarkDown :data="createDatasetScript"></MarkDown>
            </div>
            <div class="step-item" style="width: 100%;" v-if="data.drive_strategy === 'script'">
                <PythonCode @change="changeLoopCode" :code="data.before_script"></PythonCode>
            </div>
            <div class="step-footer" style="display: flex;justify-content: end;align-items: center;">
                <MotionButton @click="save" style="width: 90px;">
                    <div style="display: flex;justify-content: space-between;align-items: center;gap: 3px;">
                        <div style="font-size: 14px;">保存</div>
                        <div
                            style="font-size: 0.7rem;background-color: black;color: white;padding: 1px 2px;border-radius: 4px;">
                            {{ get_system_save() }}</div>
                    </div>
                </MotionButton>
            </div>
        </div>
    </div>
    <CaseStep ref="caseStepRef" :case_id="data.case_id" :read_only="2">
    </CaseStep>
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { motion, animate, stagger } from "motion-v"
import { splitText } from "motion-plus"
import CaseStep from '@/views/case/content/case_content/runner/tree/index.vue'
import InputUnderLine from '@/components/common/general/inputUnderLine.vue'
import Select from '@/components/common/general/select_public.vue'
import TooltipAnimation from '@/components/common/general/tooltip.vue'
import { ApiGetDatasetList } from '@/api/case/dataset/index'
import Radio from '@/components/common/general/radio.vue'
import InfoSvg from '@/assets/svg/common/new_icon/info.vue'
import MarkDown from "@/views/api/child_component/params_child/comp/markdown.vue";
import PythonCode from '@/components/common/general/pythonCode.vue'
import InputAnimation from '@/components/common/general/input.vue'
import { createDatasetScript, envStrategy, errorCaseStrategy, errorParamsCoverStrategy, caseMultitaskerLoopStrategy, caseMultitaskerDriveStrategy } from '@/views/case/utils/constants'
import MotionButton from '@/assets/motion/button.vue'

function get_system_save() {
    if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
        return '⌘+E'
    }
    return 'Ctrl+E'
}
const containerRef = ref<HTMLDivElement | null>(null)
const showRunTooltip = ref(false)
const showIdTooltip = ref(false)
const dataset_list: any = ref([])
const props = defineProps({
    data: {
        type: null,
        default: null
    }
})

function changeEnvStraegy(item: any) {
    props.data.env_strategy = item.key
}

function changeErrorStraegy(item: any) {
    props.data.error_strategy = item.key
}

function changeParamStraegy(item: any) {
    props.data.runtime_parameters_strategy = item.key
}

onMounted(async () => {
    // 添加全局事件监听
    window.addEventListener("keydown", addAltE);
    show_project_name()
    get_data_set()
});

async function get_data_set() {
    const _data = {
        case: props.data.case_id
    }
    dataset_list.value = []
    ApiGetDatasetList(_data).then((res: any) => {
        res.forEach((element: any) => {
            dataset_list.value.push({
                key: element.id,
                value: element.name
            })
        });
    })
    dataset_list.value.push({
        key: -1,
        value: '请选择'
    })
}

function changeDataset(item: any) {
    props.data.data_set = item.key
}

function changeLoopCode(value: any) {
    props.data.before_script = value
}

function show_project_name() {
    document.fonts.ready.then(() => {
        if (!containerRef.value) return

        // Hide the container until the fonts are loaded
        containerRef.value.style.visibility = "visible"

        const { words } = splitText(
            containerRef.value.querySelector("span")!
        )

        // Animate the words in the h1
        animate(
            words,
            { opacity: [0, 1], y: [10, 0] },
            {
                type: "spring",
                duration: 2,
                bounce: 0,
                delay: stagger(0.05),
            }
        )
    })
}

onBeforeUnmount(() => {
    window.removeEventListener("keydown", addAltE);
});


function addAltE(event: any) {
    if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "e" || event.code === "KeyE" || event.key === "s" || event.code === "KeyS")
    ) {
        event.preventDefault(); // 阻止浏览器默认行为
        save();
        // 在这里执行你想要的逻辑
    }
}

const emit = defineEmits(['save'])

async function save() {
    if (check() === false) return
    emit("save")
}

function check() {
    return true
}

</script>

<style lang="scss" scope>
.step-tips {
    padding: 10px;

    div {
        box-sizing: border-box;
        border-radius: 8px;
        border: 2px solid #f0f0f0;
        font-weight: 500;
        font-size: 0.9rem;
        padding: 10px;
        color: rgba($color: #000000, $alpha: 0.8);
        background: linear-gradient(80deg, #ffd460 0%, #f8b98c 40%, #f07b3f 90%)
    }
}

.project-label-container {
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: left;
    visibility: hidden;
}

.project-label {
    background-color: black;
    color: white !important;
    padding: 3px 5px;
    border-radius: 5px;
    font-size: 12px !important;
}
</style>