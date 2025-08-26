<template>
    <motion.div class="case-info-container" ref="caseInfoRef">
        <motion.div class="title">
            <InputAnimation v-model="data.name" :maxLength="255" :placeholder="'用例名（回车更新）'" @enter="changeCaseName">
            </InputAnimation>
        </motion.div>
        <motion.div class="tag">
            <TagsInputRoot v-model="modelValue" class="tags-input-root" @addTag="addCaseTag" @removeTag="removeTag">
                <TagsInputItem v-for="(item, index) in modelValue" :key="index" :value="item" class="tags-input-item">
                    <TagsInputItemText class="tags-input-item-text" />
                    <TagsInputItemDelete class="tags-input-item-delete">
                        <CloseIcon style="height: 15px;color: white;" />
                    </TagsInputItemDelete>
                </TagsInputItem>
                <TagsInputInput placeholder="标签..." class="tags-input-input" />
            </TagsInputRoot>
        </motion.div>
        <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
          ">
            <div class="doc-base-title-statement" style="margin-bottom: 5px">
                说明文档
            </div>
            <div>
                <EditButton v-if="show_markdown" class="special-btn"
                    @click="show_markdown = false; collapseStatement = false;"></EditButton>
                <DoneButton v-if="!show_markdown" class="special-btn" @click="done_statement"></DoneButton>
            </div>
        </div>
        <motion.div ref="statementRef" :style="{ 'height': collapseStatement ? '150px' : '100%' }" class="statement">
            <el-input v-if="!show_markdown" v-model="data.statement" :autosize="{ minRows: 4 }" type="textarea"
                placeholder="用例描述信息（支持MarkDown格式）" />
            <MarkDown v-else :data="data.statement"></MarkDown>
            <div ref="collapseRef" v-if="data.statement.split('\n').length > 4" class="collapse"
                :style="{ 'height': collapseStatement ? '100px' : '28px', 'position': collapseStatement ? 'absolute' : 'unset' }"
                @click="toggleCollapse" style="display: flex;justify-content: center;">
                <div style="display: flex;justify-content: center;align-items: center;min-width: 200px;">
                    <div class="content">
                        <ArrowDownIcon v-if="collapseStatement" style="width: 20px;"></ArrowDownIcon>
                        <ArrowUpIcon v-else style="width: 20px;"></ArrowUpIcon>展开说明
                    </div>
                </div>
            </div>
        </motion.div>
    </motion.div>
</template>

<script lang="ts" setup>
import { motion } from 'motion-v'
import { TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText, TagsInputRoot } from 'reka-ui'
import { ref, onMounted, watch } from 'vue'
import CloseIcon from '@/assets/logo/final/match_vue/close.vue'
import InputAnimation from '@/components/common/general/inputUnderLine.vue'
import MarkDown from "@/views/api/child_component/params_child/comp/markdown.vue";
import EditButton from "@/assets/svg/common/edit_btn.vue";
import DoneButton from "@/assets/svg/common/done_btn.vue";
import ArrowDownIcon from '@/assets/logo/final/match_vue/arrow_down.vue'
import ArrowUpIcon from '@/assets/logo/final/match_vue/arrow_up.vue'
import { ApiGetSummarySource } from "@/api/interface/index";
import { useRoute } from 'vue-router'
import { send_case_action } from '@/views/case/utils'
import { GlobalState } from "@/state/index";
const route = useRoute()
const modelValue: any = ref([])
const modelIdValue: any = ref([])
const show_markdown = ref(true)
const statementRef = ref(null)
const collapseStatement = ref(true)
const caseInfoRef: any = ref(null)
const tag_mapping: any = ref([])
const cache_case_name: any = ref("")

const props = defineProps({
    data: {
        type: null,
        default: null
    },
    node_id: {
        type: Number,
        default: -1
    }
})

watch(() => GlobalState.count, (_) => {
    if (GlobalState.message === "change_name_from_tree") {
        if (GlobalState.data.target_id === props.data.id) {
            props.data.name = GlobalState.data.name;
            cache_case_name.value = GlobalState.data.name
        }
    }
})

onMounted(async () => {
    if (props.data.statement.length === 0) {
        show_markdown.value = false
        collapseStatement.value = false
    }
    await get_case_source()
    cache_case_name.value = props.data.name
})

async function changeCaseName(value: any) {
    if (cache_case_name.value !== value) {
        const _data = {
            type: 0,
            child_action_type: 'change_name',
            content: {
                case_id: props.data.id,
                name: value
            }
        }
        const marker: any = await send_case_action(_data)
        if (marker !== false) {
            modelIdValue.value.push(marker.id)
            window.$toast({ title: '更新用例名称成功' })
            cache_case_name.value = value
            GlobalState.sendMessage("update_case_name", {
                node_id: props.node_id,
                name: value,
            });
        }
    } else {
        window.$toast({ title: '用例名称无变化', type: 'info¬' })
    }

}

async function addCaseTag(value: any) {
    const _data = {
        type: 0,
        child_action_type: 'add_tag',
        content: {
            case_id: props.data.id,
            tag_name: value
        }
    }
    const marker: any = await send_case_action(_data)
    if (marker !== false) {
        modelIdValue.value.push(marker.id)
        window.$toast({ title: '新增标签成功' })
    }
}

async function removeTag(value: any) {
    console.log(value);
    const _index = modelValue.value.indexOf(value)
    const tag_id = modelIdValue.value[_index]
    const _data = {
        type: 0,
        child_action_type: 'delete_tag',
        content: {
            case_id: props.data.id,
            tag_id: tag_id
        }
    }
    const result = await send_case_action(_data)
    modelIdValue.value.splice(_index, 1)
    if (result !== false) {
        window.$toast({ title: "删除标签成功" })
    }

}

async function get_case_source() {
    await ApiGetSummarySource({
        project: route.params.project,
        source: 'case'
    }).then((res: any) => {
        tag_mapping.value = res
        console.log(tag_mapping.value);
        modelValue.value = []
        tag_mapping.value.forEach((element: any) => {
            if (props.data.markers.includes(element.id)) {
                modelValue.value.push(element.name)
                modelIdValue.value.push(element.id)
            }
        })
    })
}


function toggleCollapse() {
    collapseStatement.value = !collapseStatement.value
    caseInfoRef.value.$el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    show_markdown.value = true
}

async function done_statement() {
    const _data = {
        type: 0,
        child_action_type: 'change_statement',
        content: {
            case_id: props.data.id,
            statement: props.data.statement
        }
    }
    const marker: any = await send_case_action(_data)
    if (marker !== false) {
        modelIdValue.value.push(marker.id)
        window.$toast({ title: '更新说明文档成功' })
        show_markdown.value = true;
    }
}
</script>

<style lang="scss" scoped>
.case-info-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px;
    box-sizing: border-box;

    .statement {
        overflow: hidden;
        position: relative;

        .collapse {
            padding-top: 10px;
            bottom: 0;
            left: 0;
            width: 100%;
            font-size: 0.9rem;
            cursor: pointer;
            background: linear-gradient(180deg, #fff0 0%, #fff 66.07%);

            .content {
                animation: blink 5s infinite;
                display: flex;
                width: 100%;
                justify-content: center;
                align-items: center;
            }
        }
    }

    .doc-base-title-statement {
        color: gray;
        font-size: 0.9em;
        font-weight: 500;
        margin-top: 20px;
        margin-bottom: 5px;
    }

    .special-btn {
        width: 1rem !important;
        height: 1rem !important;
    }

    .title {
        display: flex;
        justify-content: center;
    }

    .tags-input-root {
        display: flex;
        gap: 0.5rem;
        /* gap-2 */
        align-items: center;
        /* items-center */
        /* border + border-blackA7 */
        padding: 0.5rem;
        /* p-2 */
        border-radius: 0.5rem;
        /* w-[380px]（已包含 w-full） */
        flex-wrap: wrap;
        /* flex-wrap */
        background-color: #ffffff;
        /* bg-white */
        // box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    /* 每个标签项 */
    .tags-input-item {
        cursor: default;
        display: flex;
        align-items: center;
        /* items-center */
        justify-content: center;
        /* justify-center */
        gap: 0.5rem;
        /* gap-2 */
        padding: 0.25rem;
        /* p-1 */
        border-radius: 0.3rem;
        /* rounded */
        background: linear-gradient(to right, #1a1a1a 0%, #0a3f0a 100%);
        /* bg-green8 */
        color: #ffffff;
        /* text-white */
        box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
        /* shadow-md */
    }

    /* 当前选中项背景更深 */
    .tags-input-item[aria-current="true"] {
        background: linear-gradient(to right, #000000 0%, #b4b4b4 100%);
        /* aria-[current=true]:bg-green9 */
    }

    /* 标签文字 */
    .tags-input-item-text {
        font-size: 0.875rem;
        /* text-sm */
        padding-left: 0.25rem;
        /* pl-1 */
    }

    /* 删除按钮 */
    .tags-input-item-delete {
        cursor: pointer;
        display: flex;
        align-items: center;
        border: none;
        padding: 0.125rem;
        /* p-0.5 */
        border-radius: 0.25rem;
        /* rounded */
        background-color: transparent;
        /* bg-transparent */
    }

    .tags-input-item-delete:hover {
        background-color: rgba(192, 192, 192, 0.25);
        /* hover:bg-blackA4 */
    }

    /* 输入框 */
    .tags-input-input {
        font-size: 0.875rem;
        /* text-sm */
        flex: 1 1 0%;
        /* flex-1 */
        border-radius: 0.25rem;
        /* rounded */
        color: #000000;
        /* text-green9 */
        background-color: transparent;
        /* bg-transparent */
        padding: 0 0.25rem;
        /* px-1 */
        outline: none;
        border: none;
        min-height: 27px;
    }

    .tags-input-input:focus {
        outline: none;
        /* focus:outline-none */
    }

    .tags-input-input::placeholder {
        color: #000000;
        /* placeholder:text-mauve9 */
    }
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