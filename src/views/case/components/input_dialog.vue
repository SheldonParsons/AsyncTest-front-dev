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
                                        <Label class="LabelRoot" for="firstName"> 列名 </Label>
                                        <textarea class="mul-row-inputer" spellcheck="false" v-model="col_name"
                                            :rows="6" placeholder="回车输入多个变量名，一次性创建多列" />
                                    </div>
                                    <div class="label-container">
                                        <Label class="LabelRoot" for="firstName"> 描述 </Label>
                                        <textarea class="mul-row-inputer" spellcheck="false" v-model="col_desc"
                                            :rows="6" placeholder="回车输入多个变量描述，一次性为多个列添加描述" />
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
import { ref } from 'vue'
const col_name = ref('')
const col_desc = ref('')
let resolver: any



const visible = ref(false)

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
    }
})

const emit = defineEmits(['action'])
function clean() {
    col_name.value = ''
    col_desc.value = ''
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

defineExpose({ open, close, clean })

// 关闭对话框
const handleClose = (action_name: string) => {
    if (action_name === 'save') {
        const data: any = valid_data_and_parse(col_name.value, col_desc.value)
        if (data === false) {
            return
        }
        const existedFields = props.cols.map(cd => cd.field)

        // 找第一个重复的
        const duplicated = data.find((col: any) => existedFields.includes(col.name))
        if (duplicated) {
            window.$toast?.({
                title: `字段已存在：${duplicated.name}，添加失败。`,
                type: 'error'
            })
            return
        }
        visible.value = false
        resolver?.({ action: action_name, data: data })
    } else {
        visible.value = false
        resolver?.({ action: action_name, data: null })
    }
    clean()
}



function valid_data_and_parse(name: string, desc: string) {
    console.log(name.length);

    if (name.length === 0) {
        window.$toast?.({
            title: '列名不能为空。',
            actionText: '关闭',
            type: 'error',
            duration: 3000,
        })
        return false
    }
    if (desc.length === 0) {
        window.$toast?.({
            title: '列描述不能为空。',
            actionText: '关闭',
            type: 'error',
            duration: 3000,
        })
        return false
    }
    // 1. 去掉前后多余回车，只按换行分割，支持 \r\n 和 \n
    const arrA = name.trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    const arrB = desc.trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean)

    // 2. 长度必须一致
    if (arrA.length !== arrB.length) {
        window.$toast?.({
            title: `长度不一致：列名(${arrA.length})， 描述(${arrB.length})`,
            actionText: '关闭',
            type: 'error',
            duration: 3000,
        })
        return false
    }

    // 校验描述长度
    for (let i = 0; i < arrB.length; i++) {
        if (arrB[i].length > 500) {
            window.$toast?.({
                title: `列描述过长（500 Limit）。`,
                actionText: '关闭',
                type: 'error',
                duration: 3000,
            })
            return false
        }
    }

    // 3. 校验A只能包含字母数字下划线
    const nameRegex = /^[A-Za-z0-9_]+$/
    for (let i = 0; i < arrA.length; i++) {
        console.log(arrA[i]);
        if (!nameRegex.test(arrA[i])) {
            window.$toast?.({
                title: `第${i + 1}行列名不合法：${arrA[i]}，只能由大小写字母、数字、下划线组成`,
                actionText: '关闭',
                type: 'error',
                duration: 3000,
            })
            return false
        }
        if (arrA[i].length > 500) {
            window.$toast?.({
                title: `列名过长（500 Limit）。`,
                actionText: '关闭',
                type: 'error',
                duration: 3000,
            })
            return false
        }
        // 4. 构造列表
        const result = arrA.map((name, i) => ({
            name,
            desc: arrB[i]
        }))
        return result
    }
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