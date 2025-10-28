<template>
    <div class="step-info">
        <div class="step-container">
            <div class="step-title">
                <InputUnderLine v-model="data.label" :maxLength="225" :placeholder="'步骤名称'" :bgcolor="'#f0f0f03a'">
                </InputUnderLine>
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
    }
})

onMounted(async () => {
    // 添加全局事件监听
    window.addEventListener("keydown", addAltE);
});

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
