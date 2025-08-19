<template>
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
            <div class="step-footer">
                <div>
                    <AstButton @click="save">
                        <div style="font-size: 0.8rem;">保存(Ctrl+E)</div>
                    </AstButton>
                </div>
            </div>
        </div>
    </div>
    <InterfacePage :node_id="0" :interface_id="data.interface_id" :is_case="true">
    </InterfacePage>
</template>

<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import InterfacePage from "@/views/api/child_context/interface_page.vue";
import SwitchAnimation from '@/components/common/general/switch.vue'
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
