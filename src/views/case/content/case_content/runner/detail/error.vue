<template>
    <div class="step-info">
        <div class="step-container">
            <div class="step-title">
                <InputUnderLine v-model="data.label" :maxLength="225" :placeholder="'步骤名称'" :bgcolor="'#f0f0f03a'">
                </InputUnderLine>
            </div>
            <div class="step-item">
                <div>异常模式</div>
                <div>
                    <Radio v-model="data.error_mode" :items="assertMode"></Radio>
                </div>
            </div>
            <div class="step-item" v-if="data.error_mode === 'fast'">
                <div style="display: inline-block;white-space: nowrap;">断言比较</div>
                <div style="display: flex;justify-content: start;align-items: center;gap: 10px;">
                    <InputAnimation style="flex: 40" v-model="data.key" placeholder="{{ name }}" :maxLength="50">
                    </InputAnimation>
                    <Select :padding="'8px 8px'" style="flex: 20" :current="data.pattern" :items="patternMode"
                        @change="changePattern"></Select>
                    <InputAnimation style="flex: 40" v-model="data.value" placeholder="{{ variable }}" :maxLength="50">
                    </InputAnimation>
                </div>
            </div>
            <div class="step-item" style="width: 100%;" v-if="data.error_mode === 'script'">
                <MarkDown :data="errorScriptDemo"></MarkDown>
            </div>
            <div class="step-item" style="width: 100%;" v-if="data.error_mode === 'script'">
                <PythonCode :shortcuts="script_demo" @change="changeLoopCode" :code="data.script"></PythonCode>
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
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import InputUnderLine from '@/components/common/general/inputUnderLine.vue'
import InputAnimation from '@/components/common/general/input.vue'
import AstButton from '@/components/common/general/button.vue'
import { assertMode, patternMode, errorScriptDemo } from '@/views/case/utils/constants'
import Select from '@/components/common/general/select_public.vue'
import Radio from '@/components/common/general/radio.vue'
import MarkDown from "@/views/api/child_component/params_child/comp/markdown.vue";
import PythonCode from '@/components/common/general/pythonCode.vue'
const props = defineProps({
    data: {
        type: null,
        default: null
    },
    case_id: {
        type: Number,
        default: -1
    }
})

const script_demo = [
    { label: "获取全局变量", code: "at.gv.get('variable_key')\n" },
    { label: "获取环境变量", code: "at.env.get('variable_key')\n" },
    { label: "获取临时变量", code: "at.temp.get('variable_key')\n" },
    { label: "获取生成器函数", code: "at.func.boolean(10, 20, 'true').value\n" },
    { label: "获取处理函数", code: "at.pipeline.sha('abc', 'sha1')\n" },
    { label: "获取环境名称", code: "at.env_name\n" },
    { label: "抛出异常", code: "at.raise('name_error')\n" }
]

onMounted(async () => {
    // 添加全局事件监听
    window.addEventListener("keydown", addAltE);
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", addAltE);
});

function changeLoopCode(value: any) {
    props.data.script = value
}

function changePattern(item: any) {
    props.data.pattern = item.key
}


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
