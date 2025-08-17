<template>
    <motion.div class="case-info-container" ref="caseInfoRef">
        <motion.div class="title">
            <InputAnimation v-model="title" :maxLength="255" :placeholder="'用例名'"></InputAnimation>
        </motion.div>
        <motion.div class="tag">
            <TagsInputRoot v-model="modelValue" class="tags-input-root">
                <TagsInputItem v-for="item in modelValue" :key="item" :value="item" class="tags-input-item">
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
            <el-input v-if="!show_markdown" v-model="statement" :autosize="{ minRows: 4 }" type="textarea"
                placeholder="用例描述信息（支持MarkDown格式）" />
            <MarkDown v-else :data="statement"></MarkDown>
            <div ref="collapseRef" v-if="statement.split('\n').length > 4" class="collapse"
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
import { ref, onMounted } from 'vue'
import CloseIcon from '@/assets/logo/final/match_vue/close.vue'
import InputAnimation from '@/components/common/general/inputUnderLine.vue'
import MarkDown from "@/views/api/child_component/params_child/comp/markdown.vue";
import EditButton from "@/assets/svg/common/edit_btn.vue";
import DoneButton from "@/assets/svg/common/done_btn.vue";
import ArrowDownIcon from '@/assets/logo/final/match_vue/arrow_down.vue'
import ArrowUpIcon from '@/assets/logo/final/match_vue/arrow_up.vue'

const modelValue = ref(['Apple', 'Banana'])
const title = ref('新建用例')
const show_markdown = ref(true)
const statementRef = ref(null)
const collapseStatement = ref(true)
const caseInfoRef: any = ref(null)
const statement = ref(
    "# Observer-Toolbox（TestReport）\nAn \"observer-pattern-driven\" flow control framework that primarily abstracts the interaction between the Server (publisher) and Plugins (subscribers). It also includes a built-in Toolbox that provides utility functions for HTTP requests.\n## Document\nhttps://www.yuque.com/shelly-crrwq/rdp2or/zmabzq35lxrgle8g\n```python\nclass DynamicFreezeObject(Mapping):\n    def __getitem__(self, key):\n        str_key = str(key)\n        if str_key in self.__dict__:\n            return self.__dict__[str_key]\n        else:\n            raise KeyError(f\"Key '{key}' not found\")\n\n    def __len__(self):\n        return len(self.__dict__)\n\n    def __iter__(self):\n        for key, value in self.__dict__.items():\n            if isinstance(value, DynamicFreezeObject):\n                yield key, dict(value)\n            else:\n                yield key, value\n\n    def __init__(self, **kwargs):\n        for key, value in kwargs.items():\n            str_key = str(key) if not isinstance(key, str) else key\n            if isinstance(value, dict):\n                sanitized_dict = {str(k): v for k, v in value.items()}\n                self.__dict__[str_key] = DynamicFreezeObject(**sanitized_dict)\n            elif isinstance(value, list):\n                self.__dict__[str_key] = tuple(value)\n            else:\n                self.__dict__[str_key] = value\n\n    __annotations__ = {}\n\n    def __getattr__(self, name: str):\n        raise AttributeError(f\"{self.__class__.__name__} 没有属性 '{name}'\")\n\n    def __repr__(self):\n        return str(self.__dict__)\n\n    def __setattr__(self, name, value):\n        if getattr(self, '_initialized', False):\n            raise AttributeError(\n                f\"{self.__class__.__name__} 属性不可变，请勿修改广播对象的值，该操作有可能会影响后续的监听服务。\")\n        else:\n            super().__setattr__(name, value)\n\n    def __delattr__(self, name):\n        if hasattr(self, name):\n            raise AttributeError(\n                f\"{self.__class__.__name__} 属性不可变，请勿修改广播对象的值，该操作有可能会影响后续的监听服务。\")\n        else:\n            raise AttributeError(\n                f\"{self.__class__.__name__} 属性不可变，请勿修改广播对象的值，该操作有可能会影响后续的监听服务。\")\n\n    def __setitem__(self, key, value):\n        raise TypeError(\n            f\"{self.__class__.__name__} 属性不可变，请勿修改广播对象的值，该操作有可能会影响后续的监听服务。\")\n\n    def __delitem__(self, key):\n        raise TypeError(\n            f\"{self.__class__.__name__} 属性不可变，请勿修改广播对象的值，该操作有可能会影响后续的监听服务。\")\n\n    def keys(self):\n        return self.__dict__.keys()\n\n    def values(self):\n        return [(_ := lambda value: dict(value) if isinstance(value, DynamicFreezeObject) else value)(value) for value\n                in\n                self.__dict__.values()]\n\n    def items(self):\n        \"\"\" 返回键值对视图（可选） \"\"\"\n        return self.__dict__.items()\n```"
)

onMounted(() => {
    if (statement.value.length === 0) {
        show_markdown.value = false
        collapseStatement.value = false
    }
})


function toggleCollapse() {
    collapseStatement.value = !collapseStatement.value
    caseInfoRef.value.$el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    show_markdown.value = true
}

function done_statement() {
    if (statement.value === "") {
        window.$toast({ title: '说明文档不能为空', type: 'info' })
    } else {
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