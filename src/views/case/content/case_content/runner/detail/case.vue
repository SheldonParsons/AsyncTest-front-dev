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
                <InputUnderLine v-model="data.label" :maxLength="225" :placeholder="'步骤名称'" :bgcolor="'#f0f0f0'">
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
            <div class="step-footer">
                <div>
                    <AstButton @click="save">
                        <div style="font-size: 0.8rem;">保存(Ctrl+E)</div>
                    </AstButton>
                </div>
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
import AstButton from '@/components/common/general/button.vue'
import InputUnderLine from '@/components/common/general/inputUnderLine.vue'
import Select from '@/components/common/general/select_public.vue'
import { envStrategy, errorCaseStrategy, errorParamsCoverStrategy } from '@/views/case/utils/constants'
const containerRef = ref<HTMLDivElement | null>(null)
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
});

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
        (event.key === "e" || event.code === "KeyE")
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