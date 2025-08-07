<template>
    <div class="dialog-container">
        <Dialog.Root :open="visible">
            <Dialog.Portal>
                <AnimatePresence multiple>
                    <Dialog.Overlay as-child>
                        <motion.div class="overlay" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
                            :exit="{ opacity: 0 }" />
                    </Dialog.Overlay>
                    <Dialog.Content as-child>
                        <motion.div class="input-modal-container" :initial="dialogInitialState"
                            :animate="dialogOpenState" style="top: -50%;" :exit="dialogInitialState"
                            :style="{ transformPerspective: 200 }">
                            <div class="modal">
                                <Dialog.Title class="dialog-title">
                                    {{ title }}
                                </Dialog.Title>
                                <Dialog.Description>
                                    <div class="label-container">
                                        <Label class="LabelRoot" for="firstName"> 行内容 </Label>
                                        <textarea class="mul-row-inputer" ref="valueRef" spellcheck="false"
                                            v-model="row_values" :rows="10" placeholder="【双回车】输入多个变量的值，批量为该列添加值" />
                                    </div>
                                </Dialog.Description>
                                <div class="controls">
                                    <Dialog.Close as-child>
                                        <motion.button :whilePress="{ scale: 0.9 }" class="cancel"
                                            @click="handleClose('pass')">
                                            {{ cancel_title }}
                                        </motion.button>
                                    </Dialog.Close>
                                    <Dialog.Close as-child>
                                        <motion.button :whilePress="{ scale: 0.9 }" @click="handleClose('save')">
                                            {{ confirm_title }}
                                        </motion.button>
                                    </Dialog.Close>
                                </div>
                            </div>
                        </motion.div>
                    </Dialog.Content>
                </AnimatePresence>
            </Dialog.Portal>
        </Dialog.Root>
    </div>
</template>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
// @ts-ignore
import { Dialog } from 'reka-ui/namespaced'
import { Label } from 'reka-ui'
import { ref, watch, nextTick } from 'vue'
let resolver: any
const visible = ref(false)
const row_values = ref('')
const valueRef: any = ref(null)

const props = defineProps({
    title: {
        type: String,
        default: "您有未保存的接口"
    },
    content: {
        type: String,
        default: "您确定要离开这个接口吗？离开前您可以选择将其保存"
    },
    cancel_title: {
        type: String,
        default: "取消"
    },
    confirm_title: {
        type: String,
        default: "保存并跳转"
    },
    other_confirm_title: {
        type: String,
        default: "不保存"
    },
    cols: {
        type: Array<any>,
        default: []
    },
    valid: {
        type: null
    }
})

watch(visible, (show) => {
    if (show) {
        nextTick(() => {
            if (valueRef.value) {
                // 先 focus
                valueRef.value.focus()
                // 再设置光标到末尾
                valueRef.value.setSelectionRange(0, 0)
            }
        })
    }
})

const emit = defineEmits(['action'])
function clean() {
    row_values.value = ''
}

function open() {
    visible.value = true
    return new Promise((resolve, reject) => {
        resolver = resolve
    })
}
const close = () => {
    visible.value = false
}

const init = (data: any) => {
    row_values.value = data
}

defineExpose({ open, close, clean, init })

// 关闭对话框
const handleClose = async (action_name: string) => {
    if (action_name === 'save') {
        const data: any = valid_data_and_parse(row_values.value)
        if (data === false) {
            return
        }
        let send_data = []
        for (let i = 0; i < data.length; i++) {
            send_data.push({
                name: props.cols[i].field,
                value: data[i]
            })
        }
        const remote_valid = await props.valid(send_data)
        if (!remote_valid) return
        visible.value = false
        resolver?.({ action: action_name, data: data })
    } else {
        visible.value = false
        resolver?.({ action: action_name, data: null })
    }
    clean()
}



function valid_data_and_parse(values: string) {
    if (values.length === 0) {
        window.$toast?.({
            title: '列名不能为空。',
            actionText: '关闭',
            type: 'error',
            duration: 3000,
        })
        return false
    }

    const row_list = values.trim()
        .split(/(\r?\n){2,}/)   // 按2个及以上回车分割
        .map(s => s.trim())
        .filter(Boolean)

    for (let i = 0; i < row_list.length; i++) {
        if (row_list[i].length > 10000) {
            window.$toast?.({
                title: `行内容过长（10000 Limit）。`,
                actionText: '关闭',
                type: 'error',
                duration: 3000,
            })
            return false
        }
    }
    if (row_list.length !== (props.cols.length - 1)) {
        window.$toast?.({
            title: `行数不一致，当前行数：${(props.cols.length - 1)}，输入行数：${row_list.length}`,
            actionText: '关闭',
            type: 'error',
            duration: 3000,
        })
        return false
    }
    return row_list
}

const dialogOpenState: any = {
    opacity: 1,
    filter: 'blur(0px)',
    rotateX: 0,
    rotateY: 0,
    z: 0,
    transition: {
        delay: 0.2,
        duration: 0.1,
        ease: [0.17, 0.67, 0.51, 1],
        opacity: {
            delay: 0.2,
            duration: 0.5,
            ease: 'easeOut',
        },
    },
}

const dialogInitialState: any = {
    opacity: 0,
    filter: 'blur(10px)',
    z: -100,
    rotateY: 25,
    rotateX: 5,
    transformPerspective: 500,
    transition: {
        duration: 0.3,
        ease: [0.67, 0.17, 0.62, 0.64],
    },
}
</script>

<style lang="scss" scope>
.dialog-container {
    display: flex;
    align-items: center;
    justify-content: center;


}

.overlay {
    background: rgba(0, 0, 0, 0.5);
    position: fixed;
    inset: 0;
    z-index: 100 !important;
    backdrop-filter: blur(3px);
}

.input-modal-container {
    top: -20% !important;
    position: fixed;
    inset: 0;
    z-index: 100 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;

    .modal {
        border-radius: 10px;
        border: 1px solid #1d2628;
        background-color: #0b1011;
        z-index: 100 !important;
        padding: 20px;
        min-width: 300px;
        pointer-events: auto;

        .dialog-title {
            font-weight: 400;
            font-size: 16px;
            margin: 0 0 20px;
            color: rgb(255, 255, 255);
        }

        .label-container {
            display: flex;
            gap: 15px;
            padding-bottom: 15px;
            flex-direction: column;

            .LabelRoot {
                font-size: 14px;
                font-weight: 500;
                line-height: 14px;
                color: rgb(225, 225, 225);
            }

            .mul-row-inputer {
                all: unset;
                min-width: 500px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                padding: 10px;
                font-size: 15px;
                line-height: 1;
                color: black;
                background-color: rgb(255, 255, 255);
                box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0;
                text-decoration: none !important;
                -webkit-text-decoration: none !important;
            }

            .mul-row-inputer:focus {
                box-shadow: 0 0 0 2px black;
            }

            .mul-row-inputer::selection {
                background-color: #000000b3;
                color: white;
            }

            .mul-row-inputer:disabled {
                /* 禁用状态的样式 */
                background-color: #f0f0f0;
                color: #999;
                border-color: #ddd;
                cursor: not-allowed;
            }

        }

        .controls button {
            background-color: white;
            color: black;
            font-size: 16px;
            padding: 8px 10px;
            border-radius: 10px;
            border: none;
            cursor: pointer;
        }

        .controls {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        .controls button.cancel {
            background-color: #1a1e26;
            color: white;
        }
    }
}
</style>