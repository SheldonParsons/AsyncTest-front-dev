<template>
    <div style="padding: 10px 10px 0px 10px;display: flex;justify-content: start;" class="project-label-container"
        ref="containerRef">
        <span style="font-size: 0.9rem;font-weight: 500;">所属项目：</span>
        <motion.span style="font-size: 16px;" class="project-label">{{ data.project_name }}</motion.span>
    </div>
    <div class="step-info">
        <div class="step-container">
            <div class="step-title">
                <InputUnderLine v-model="data.label" :maxLength="225" :placeholder="'步骤名称'" :bgcolor="'#f0f0f03a'">
                </InputUnderLine>
            </div>
            <div class="step-item">
                <div>是否在某个响应码时抛出异常？</div>
                <div>
                    <SwitchAnimation :data="data.should_raise" @action="changeShouldRise"
                        :content="data.should_raise ? '启用：该请求在您设置的响应码时会抛出异常，由当前接口所处的任务决定异常时的策略' : '关闭：除接口异常外，任何响应将不会抛出异常'"
                        :bgcolor="'#f0f0f0'">
                    </SwitchAnimation>
                </div>
            </div>
            <div class="step-item" v-if="data.should_raise">
                <div>异常响应码</div>
                <div>
                    <InputAnimation v-model="raiseCodeAsString" :placeholder="'异常响应码'" :maxLength="3"></InputAnimation>
                </div>
            </div>
            <div class="step-footer" style="display: flex;justify-content: end;align-items: center;" v-if="show_save">
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
    <InterfacePage @change_method="change_method" :node_id="0" :interface_id="data.interface_id" :is_case="true">
    </InterfacePage>
</template>

<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import InterfacePage from "@/views/api/child_context/interface_page.vue";
import SwitchAnimation from '@/components/common/general/switch.vue'
import InputUnderLine from '@/components/common/general/inputUnderLine.vue'
import InputAnimation from '@/components/common/general/input.vue'
import { motion, animate, stagger } from "motion-v"
import { splitText } from "motion-plus"
import { ref } from 'vue'
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
    show_save: {
        type: Boolean,
        default: true
    }
})
const containerRef = ref<HTMLDivElement | null>(null)

onMounted(async () => {
    // 添加全局事件监听
    window.addEventListener("keydown", addAltE);
    show_project_name()
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", addAltE);
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

function change_method(method: string) {
    props.data.method = method
    save()
}

// 创建一个可读写的计算属性
const raiseCodeAsString = computed({
    // "get" 函数：当子组件需要读取值时调用
    get() {
        // 总是返回一个字符串
        return String(props.data.raise_code || '');
    },
    // "set" 函数：当子组件更新值时调用
    set(newValue) {
        // 将新值（一定是字符串）写回到原始数据源
        // 如果您希望 raise_code 最终存为数字，可以在这里转换
        // data.value.raise_code = Number(newValue); 
        props.data.raise_code = newValue;
    }
});

function changeShouldRise(status: boolean) {
    props.data.should_raise = !status
}

</script>


<style>
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