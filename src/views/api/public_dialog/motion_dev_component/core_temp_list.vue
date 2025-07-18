<template>
    <motion.div class="temp-list-container" :initial="{ opacity: 0, scale: 0.7 }" :animate="{ opacity: 1, scale: 1 }"
        :transition="{
            duration: 0.4,
            delay: 0.2,
            ease: [0, 0.71, 0.2, 1.01]
        }">
        <motion.div style="height: 100%;">
            <motion.div style="display: flex;justify-content: space-between;align-items: center;gap: 10px;">
                <Pointer @action="add_param"></Pointer>
                <InputAnimation v-model="search_value" @change="search" :placeholder="'输入变量名进行搜索'"></InputAnimation>
            </motion.div>

            <motion.div class="b-item" v-show="accordionContent.length === 0">
                <motion.div>
                    <BlankAnimation v-for="(item, i) in items" :key="i" :item="item" :index="i" :skewX="skewX"
                        :skewY="skewY">
                    </BlankAnimation>
                </motion.div>
            </motion.div>
            <motion.div v-if="accordionContent.length > 0" :initial="{ opacity: 0, scale: 0 }"
                :animate="{ opacity: 1, scale: 1 }" :transition="{
                    duration: 0.4,
                    scale: { type: 'spring', visualDuration: 0.4, bounce: 0.2 }
                }" class="list-items"
                style="overflow: hidden;height: 100%;display: flex;width: 100%;margin-bottom: 0px;" ref="listItemRef">
                <MotionConfig :transition="{ type: 'spring', bounce: 0.2, visualDuration: 0.4 }"
                    style="overflow: scroll;width: 100%;" class="no-scroll">
                    <Accordion.Root type="single" v-model="value" class="accordion" :collapsible="true">
                        <Accordion.Item v-for="(item, index) in accordionContent" :key="item.id" :value="item.id"
                            class="section">
                            <Accordion.Header>
                                <motion.div :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }"
                                    :exit="{ opacity: 0, scale: 0 }" :transition="{
                                        duration: 0.2,
                                        scale: { type: 'spring', visualDuration: 0.2, bounce: 0.2 }
                                    }" style="display: flex;justify-content: space-between;width: 100%;">
                                    <motion.div style="display: flex;align-items: center;gap: 10px;">
                                        <motion.div>
                                            <InputAnimation v-model="item.name" :placeholder="'变量名'"></InputAnimation>
                                        </motion.div>
                                        <motion.div>
                                            <InputAnimation v-model="item.fixed_value" :maxLength="500"
                                                :placeholder="'固定值'">
                                            </InputAnimation>
                                        </motion.div>
                                        <motion.div>
                                            <HoverSpanAnimation :value="item.dynamic_value"></HoverSpanAnimation>
                                        </motion.div>
                                        <motion.div>
                                            <SwitchAnimation :data="item.is_fixed"
                                                @action="(val) => switchHandle(val, item)">
                                            </SwitchAnimation>
                                        </motion.div>
                                        <motion.div>
                                            <HlodAnimation @action="deleteHandle(item, index)"></HlodAnimation>
                                        </motion.div>
                                        <motion.div>
                                            <ButtonAnimation @action="saveHandle(item, index)"></ButtonAnimation>
                                        </motion.div>
                                    </motion.div>
                                    <Accordion.Trigger as-child>
                                        <motion.button class="trigger" @focus="onlyKeyboardFocus(() => hasFocus = true)"
                                            @blur="() => hasFocus = false" :variants="{ pressed: { scale: 0.98 } }"
                                            whilePress="pressed">
                                            <motion.svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="3"
                                                strokeLinecap="round" strokeLinejoin="round"
                                                :animate="{ rotate: value === item.id ? 180 : 0 }"
                                                :style="{ willChange: 'transform', 'outline': 'none' }">
                                                <path d="m6 9 6 6 6-6" />
                                            </motion.svg>
                                        </motion.button>
                                    </Accordion.Trigger>
                                </motion.div>

                            </Accordion.Header>

                            <AnimatePresence :initial="false">
                                <Accordion.Content v-if="value === item.id" force-mount as-child>
                                    <motion.div class="accordion-content" :variants="{
                                        open: {
                                            height: 'auto',
                                            maskImage: 'linear-gradient(to bottom, black 100%, transparent 100%)',
                                        },
                                        closed: {
                                            height: 0,
                                            maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                                        },
                                    }" initial="closed" animate="open" exit="closed">
                                        <motion.div :variants="{
                                            open: {
                                                filter: 'blur(0px)',
                                                opacity: 1,
                                            },
                                            closed: {
                                                filter: 'blur(2px)',
                                                opacity: 0,
                                            },
                                        }">
                                            <div class="content-inner">
                                                <div class="process-dialog-content" id="process-dialog-content">
                                                    <div
                                                        style="width: 100%; border: 1px solid #f3f5f6; border-radius: 10px">
                                                        <div class="editor-header">
                                                            <Params :showVariable="false"
                                                                @insert_action="(val) => insert_params(val, index)">
                                                            </Params>
                                                        </div>
                                                        <TextEditor ref="tempEditorRef" :code="item.fixed_value"
                                                            @change="(val) => changeFixCode(val, index)"
                                                            :allowNewlines="false" :always="true">
                                                        </TextEditor>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                </Accordion.Content>
                            </AnimatePresence>
                        </Accordion.Item>
                    </Accordion.Root>
                </MotionConfig>
            </motion.div>
        </motion.div>
    </motion.div>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick, getCurrentInstance } from 'vue';
import Pointer from '@/views/api/public_dialog/motion_dev_component/pointer_animation.vue'
import BlankAnimation from '@/views/api/public_dialog/motion_dev_component/guide_blank_animation.vue'
import { motion, AnimatePresence, MotionConfig } from 'motion-v'
import TextEditor from "@/components/common/editor/TextEditor.vue";
import Params from "@/views/api/child_component/params.vue";
// @ts-ignore
import { Accordion } from 'reka-ui/namespaced'
import InputAnimation from '@/views/api/public_dialog/motion_dev_component/input_animation.vue'
import HoverSpanAnimation from '@/views/api/public_dialog/motion_dev_component/hover_animation.vue'
import SwitchAnimation from '@/views/api/public_dialog/motion_dev_component/switch_animation.vue'
import HlodAnimation from '@/views/api/public_dialog/motion_dev_component/hold_animation.vue'
import { usePointerPosition } from "motion-plus-vue"
import SettingImage from '@/views/api/public_dialog/motion_dev_component/image/setting.png'
import LoginImage from '@/views/api/public_dialog/motion_dev_component/image/login.png'
import RunningImage from '@/views/api/public_dialog/motion_dev_component/image/running.png'
import ButtonAnimation from '@/views/api/public_dialog/motion_dev_component/button_animation.vue'
import _ from "lodash";
import { HttpClass } from "@/utils/http";

import {
    clamp,
    useSpring,
    useTransform,
    useVelocity,
} from "motion-v"
import {
    ApiUpdateTempVariable,
    ApiPostTempVariable,
    ApiDeleteTempVariable,
    ApiGetTempVariableCancel
} from "@/api/interface/index";
import tools from '@/utils/tools'

const can_action = ref(true)
let cancelTokenSource: any;
const search_value = ref('')

onMounted(async () => {
    await get_temps(null)
    await nextTick()
})

const position = usePointerPosition()
const skewX = usePointerToSkew(position.x)
const skewY = usePointerToSkew(position.y)
const value = ref("")
const hasFocus = ref(false)
const proxy = getCurrentInstance()
const props = defineProps({
    current_interface: {
        type: Number,
        default: -1
    }
})
const tempEditorRef: any = ref(null)
const accordionContent: any = ref([])

function insert_code(text: string, index: number) {
    tempEditorRef.value[index].insertText(text);
}
function insert_params(text: string, index: number) {
    insert_code(text, index);
}

const get_temps = _.debounce(
    (name) => {
        if (cancelTokenSource) {
            cancelTokenSource.cancel("取消重复请求");
        }
        cancelTokenSource = HttpClass.createCancelToken();
        accordionContent.value = [];
        let data: any = {
            interface: props.current_interface,
        };
        if (name !== null) {
            data.name = name;
        }
        ApiGetTempVariableCancel({ params: data, cancelToken: cancelTokenSource.token })
            .then((res: any) => {
                if (res === false) return;
                accordionContent.value = res;
            })
            .catch((err: any) => {
                console.log(err);
            });
    },
    500,
    { maxWait: 1500 }
);

function changeFixCode(value: any, index: number) {
    accordionContent.value[index].fixed_value = value
}

function search(value: string) {
    console.log(value);
    get_temps(value)
}

const items = [
    { label: 'Login', number: 1, image: LoginImage },
    { label: 'Setting', number: 2, image: SettingImage },
    { label: 'Running', number: 3, image: RunningImage }
]
function usePointerToSkew(axisMotionValue: any) {
    const velocity = useVelocity(axisMotionValue)
    const maxVelocity = useTransform(() => clamp(-1000, 1000, velocity.get()))
    const smoothVelocity = useSpring(maxVelocity, {
        damping: 10,
        stiffness: 200,
    })
    return useTransform(smoothVelocity, [0, 100], [0, -1], {
        clamp: false,
    })
}

function add_param() {
    const _data = {
        name: "",
        fixed_value: "",
        dynamic_value: "",
        is_fixed: false,
        interface: props.current_interface,
        id: generateKString()
    };
    accordionContent.value.push(_data);
    scroll_to_bottom()
}

async function send_temp_variable_add(data: any) {
    return await ApiPostTempVariable(data).then((res: any) => {
        return res
    });
}

async function send_temp_variable_update(id: number, data: any) {
    return await ApiUpdateTempVariable(id, data).then((res: any) => {
        return res
    });
}

async function send_temp_variable_delete(id: number) {
    return await ApiDeleteTempVariable(id).then((res: any) => {
        return res
    });
}

async function switchHandle(val: any, row: any) {
    console.log(val);

    if (can_action.value === false) {
        window.$toast?.({
            title: '操作太频繁，请稍等',
            actionText: '关闭',
            type: 'error',
            duration: 3000,
        })
    }
    can_action.value = false
    const _data = {
        name: row.name,
        fixed_value: row.fixed_value,
        is_fixed: !val,
    };
    const res = await send_temp_variable_update(row.id, _data);
    if (res.hasOwnProperty("result") && res.result === 0) {
        window.$toast?.({
            title: res.data,
            actionText: '关闭',
            type: 'error',
            duration: 3000,
        })
        return
    };
    if (res.is_fixed === true) {
        window.$toast?.({
            title: '已启动',
            actionText: '关闭',
            type: 'success',
            duration: 3000,
        })
    } else {
        window.$toast?.({
            title: '已禁用',
            actionText: '关闭',
            type: 'success',
            duration: 3000,
        })
    }
}

async function deleteHandle(row: any, index: number) {
    if (String(row.id).startsWith('K') === true) {
        accordionContent.value.splice(index, 1);
        return;
    }
    const res = await send_temp_variable_delete(row.id);
    if (res.hasOwnProperty("result") && res.result === 0) {
        window.$toast?.({
            title: res.data,
            actionText: '关闭',
            type: 'error',
            duration: 3000,
        })
        return
    };
    accordionContent.value.splice(index, 1);
    window.$toast?.({
        title: '删除成功',
        actionText: '关闭',
        type: 'success',
        duration: 3000,
    })
}

async function saveHandle(row: any, index: number) {
    if (String(row.id).startsWith('K') === true) {
        const _data = {
            name: row.name,
            fixed_value: row.fixed_value,
            is_fixed: row.is_fixed,
            interface: props.current_interface,
        };
        const res = await send_temp_variable_add(_data);
        if (res.hasOwnProperty("result") && res.result === 0) {
            window.$toast?.({
                title: res.data,
                actionText: '关闭',
                type: 'error',
                duration: 3000,
            })
            return
        };
        accordionContent.value[index].id = res.id;
        window.$toast?.({
            title: '创建成功',
            actionText: '关闭',
            type: 'success',
            duration: 3000,
        })
    } else {
        const _data = {
            name: row.name,
            fixed_value: row.fixed_value,
            is_fixed: row.is_fixed,
        };
        const res = await send_temp_variable_update(row.id, _data);
        if (res.hasOwnProperty("result") && res.result === 0) {
            window.$toast?.({
                title: res.data,
                actionText: '关闭',
                type: 'error',
                duration: 3000,
            })
            return
        };
        window.$toast?.({
            title: '修改成功',
            actionText: '关闭',
            type: 'success',
            duration: 3000,
        })
    }
}

function generateKString() {
    const number = Math.floor(Math.random() * 1e10).toString().padStart(10, '0')
    return 'K' + number
}

function onlyKeyboardFocus(callback: () => void) {
    return (e: FocusEvent) => {
        const target = e.target as HTMLElement
        if (e.type === "focus" && target.matches(":focus-visible")) {
            callback()
        }
    }
}

const listItemRef: any = ref(null)

const current_open_list: any = ref([])

function toggle(index: number) {

    if (current_open_list.value.indexOf(index) !== -1) {
        current_open_list.value = current_open_list.value.filter((item: any) => item !== index);
    } else {
        current_open_list.value.push(index)
    }
}

function scroll_to_bottom() {
    nextTick(() => {
        const accordionEl = listItemRef.value.$el?.querySelector('.accordion') as HTMLElement | null
        if (accordionEl) {
            accordionEl.scrollTop = accordionEl.scrollHeight
        }
    })
}
</script>

<style lang="scss" scoped>
.process-dialog-content {
    font-size: 14px;
    width: 99%;

    .editor-header {
        height: 2.5rem;
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
        padding-left: 0.75rem;
        padding-right: 0.75rem;
        flex-flow: wrap;
        min-width: 0;
        display: flex;
        flex-shrink: 0;
        align-items: center;
        flex-wrap: nowrap;
        border-bottom: 1px solid #f3f5f6;
    }
}

.temp-list-container {
    height: 100%;
    padding: 10px;
    overflow: hidden;

    .parent {
        height: 40px;
        border-radius: 8px;
        margin-top: 10px;
        box-sizing: border-box;
        border: 1px solid rgb(193, 193, 193);
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: center;
        background-color: #f5f5f5;
    }

    .parent[data-open="true"] {
        min-height: 200px;
    }

    .b-item {
        width: 100%;
        display: flex;
        justify-content: center;
        margin-top: 10%;

        div {
            padding: 50px;
            border: 5px dotted black;
        }
    }
}

.accordion {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    background: #0b1011;
    // border: 1px solid #1d2628;
    border-radius: 10px;
    width: 100%;
    background-color: white;
    overflow: scroll;
    margin-bottom: 25px;
}

.accordion h3 {
    margin: 0;
    display: flex;
}

.section {
    padding: 10px;
    position: relative;
    background-color: white;
    border-radius: 10px;
}

.trigger {
    border: none;
    padding: 0;
    color: black;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    background-color: white;
    outline: none;
    box-shadow: none;
}

.trigger span,
.trigger svg {
    text-align: left;
    z-index: 1;
    position: relative;
}

.focus-ring {
    position: absolute;
    inset: -10px;
    background: var(--hue-4-transparent);
    border-radius: 5px;
    z-index: 0;
}

hr {
    margin: 0;
    border: 0;
    border-bottom: 1px solid #1d2628;
    position: absolute;
    bottom: 0;
    left: 20px;
    right: 20px;
    z-index: 0;
}

@media (max-width: 500px) {
    .accordion {
        width: 300px;
    }

    .trigger span {
        font-size: 0.9rem;
    }

    .content-inner {
        font-size: 0.85rem;
    }
}

.section:last-child hr {
    display: none;
}

.accordion-content {
    overflow: hidden;
}

.content-inner {
    padding: 20px 0 0;
}

.content-inner p {
    margin: 0;
    padding: 0;
}

.content-inner p+p {
    margin-top: 1em;
}
</style>