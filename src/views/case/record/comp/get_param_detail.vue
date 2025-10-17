<template>
    <div class="params-headers">
        <div class="default-insert">
            <span class="back-icon" @click="back"><el-icon color="#000000" :size="16">
                    <ArrowLeftBold />
                </el-icon></span>
            <span style="margin-left: 10px; font-weight: 500;font-size: 0.9rem;">返回日志</span>
        </div>
    </div>
    <Separator class="SeparatorRoot" />
    <div class="title" style="padding-top: 10px;">提取结果</div>
    <MarkDown :data="get_variable_value()"></MarkDown>
    <div class="Text">
        <div>{{ variable_range_mapping[extract_info.type] }}</div>
    </div>
</template>


<script lang="ts" setup>
import { ref, computed } from 'vue'
import { Separator } from 'reka-ui'
import MarkDown from "@/views/api/child_component/params_child/comp/markdown.vue";
const props = defineProps({
    data: {
        type: null,
        default: {}
    }
})
const emit = defineEmits(["back"]);
function back() {
    emit("back");
}

const extract_info = computed(() => JSON.parse(props.data))


const variable_range_mapping: any = {
    'global': '全局变量',
    'env': '环境变量',
    'temp': '临时变量'
}



function get_variable_value() {
    return `\`\`\`json\n${extract_info.value.value}\n\`\`\``
}

</script>

<style lang="scss" scoped>
.title {
    color: #868686;
    font-size: 0.9rem;
}

.SeparatorRoot {
    width: 100%;
    background-color: #f0f0f0;
}

.SeparatorRoot[data-orientation='horizontal'] {
    height: 1px;
    width: 100%;
}

.SeparatorRoot[data-orientation='vertical'] {
    height: 100%;
    width: 1px;
}

.Text {
    color: black;
    font-size: 0.9rem;
    line-height: 20px;
    font-weight: 500;
    display: flex;
    gap: 5px;
    justify-content: end;
    align-items: center;
    padding: 5px;

    div {
        background-color: #f0f0f0;
        color: #646464;
        padding: 3px 5px;
        border-radius: 8px;
    }
}

.params-headers {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 5px;

    .close-icon {
        width: 100%;
        display: flex;
        justify-content: end;
        align-items: center;
        padding-right: 10px;

        i {
            cursor: pointer;
        }
    }

    .default-insert {
        width: 100%;
        display: flex;
        justify-content: start;
        align-items: center;
        padding-left: 10px;
    }

    .back-icon {
        background: #fff;
        border: 0.5px solid #1018280a;
        border-radius: 999px;
        padding: 4px;
        box-shadow: 0 2px 4px #0000000d, 0 4px 8px -2px #00000005;
        height: 16px;
        display: flex;
        cursor: pointer;
    }

    .back-icon:hover {
        box-shadow: 0 0 2px #0000000a, 0 4px 8px #00000014;
    }
}
</style>