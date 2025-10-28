<template>
    <div class="step-info">
        <div class="step-container">
            <div class="step-title">
                <InputUnderLine v-model="data.label" :maxLength="225" :placeholder="'步骤名称'" :bgcolor="'#f0f0f03a'">
                </InputUnderLine>
            </div>
            <div class="step-item" style="width: 100%;">
                <PythonCode :shortcuts="script_demo" @change="changeLoopCode" :code="data.script"></PythonCode>
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
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import InputUnderLine from '@/components/common/general/inputUnderLine.vue'
import PythonCode from '@/components/common/general/pythonCode.vue'
import MotionButton from '@/assets/motion/button.vue'

function get_system_save() {
    if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
        return '⌘+E'
    }
    return 'Ctrl+E'
}
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
    { label: "设置全局变量", code: "at.gv.set('variable_key', 'variable_value')\n" },
    { label: "获取环境变量", code: "at.env.get('variable_key')\n" },
    { label: "设置环境变量", code: "at.env.set('variable_key', 'variable_value')\n" },
    { label: "获取临时变量", code: "at.temp.get('variable_key')\n" },
    { label: "设置临时变量", code: "at.temp.set('variable_key', 'variable_value')\n" },
    { label: "获取生成器函数", code: "at.func.boolean(10, 20, 'true').value\n" },
    { label: "获取处理函数", code: "at.pipeline.sha('abc', 'sha1')\n" },
    { label: "获取环境名称", code: "at.env_name\n" },
]

onMounted(async () => {
    // 添加全局事件监听
    window.addEventListener("keydown", addAltS);
    window.addEventListener("keydown", addAltE);
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", addAltE);
    window.removeEventListener("keydown", addAltS);
});

function changeLoopCode(value: any) {
    props.data.script = value
}

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

function addAltS(event: any) {
    if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "s" || event.code === "KeyS")
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
