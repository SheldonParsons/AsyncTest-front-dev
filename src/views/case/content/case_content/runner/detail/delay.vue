<template>
    <div class="step-info">
        <div class="step-container">
            <div class="step-title">
                <InputUnderLine v-model="data.label" :maxLength="225" :placeholder="'步骤名称'" :bgcolor="'#f0f0f03a'">
                </InputUnderLine>
            </div>
            <div class="step-item">
                <div>延迟时间</div>
                <div>
                    <InputAnimation v-model="raiseCodeAsString" :placeholder="'延迟时间（毫秒）'" :maxLength="5"></InputAnimation>
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
</template>

<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import InputUnderLine from '@/components/common/general/inputUnderLine.vue'
import InputAnimation from '@/components/common/general/input.vue'
import AstButton from '@/components/common/general/button.vue'
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

// 创建一个可读写的计算属性
const raiseCodeAsString = computed({
    // "get" 函数：当子组件需要读取值时调用
    get() {
        // 总是返回一个字符串
        if (props.data.delay === 0){
            return "0"
        } else {
            return String(props.data.delay || '');
        }
    },
    // "set" 函数：当子组件更新值时调用
    set(newValue) {
        // 将新值（一定是字符串）写回到原始数据源
        // 如果您希望 raise_code 最终存为数字，可以在这里转换
        // data.value.raise_code = Number(newValue); 
        props.data.delay = newValue;
    }
});
</script>
