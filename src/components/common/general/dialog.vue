<template>
    <div class="dialog-container">
        <Dialog.Root :open="visible">
            <Dialog.Portal>
                <AnimatePresence>
                    <Dialog.Overlay as-child>
                        <motion.div class="overlay" :style="{ zIndex: props.zIndex }" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
                            :exit="{ opacity: 0 }" />
                    </Dialog.Overlay>
                    <Dialog.Content as-child @escape-key-down="handleEscapeKeyDown">
                        <motion.div class="input-modal-container" :initial="dialogInitialState"
                            :animate="dialogOpenState" :exit="dialogInitialState" style="top: -50%;"
                            :style="{ transformPerspective: 200, top: topMove, zIndex: props.zIndex }">
                            <div class="modal" :style="{ backgroundColor: bgtype === 'black' ? '#0b1011' : 'white', zIndex: props.zIndex }">
                                <Dialog.Title class="dialog-title"
                                    :style="{ color: bgtype === 'black' ? 'white' : 'black' }">
                                    {{ title }}
                                </Dialog.Title>
                                <Dialog.Description>
                                    <slot />
                                </Dialog.Description>
                                <div class="controls">
                                    <!-- 优先使用自定义 controls 插槽 -->
                                    <slot name="controls">
                                        <Dialog.Close as-child v-if="showCancel">
                                            <motion.button @click="cancelAction" :whilePress="{ scale: 0.95 }" :whileHover="{ scale: 1.1 }"
                                                class="cancel"
                                                :style="{ color: bgtype === 'black' ? 'white' : 'black', backgroundColor: bgtype === 'black' ? 'black' : 'white' }">
                                                {{ cancel_title }}
                                            </motion.button>
                                        </Dialog.Close>
                                        <Dialog.Close as-child v-if="showComfirm">
                                            <motion.button @click="comfirmAction" :whilePress="{ scale: 0.95 }" :whileHover="{ scale: 1.1 }"
                                                :style="{ color: bgtype === 'black' ? 'black' : 'white', backgroundColor: bgtype === 'black' ? 'white' : 'black' }">
                                                {{ confirm_title }}
                                            </motion.button>
                                        </Dialog.Close>
                                    </slot>
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
import { ref } from 'vue'

const emit = defineEmits(['cancel', 'comfirm'])
let resolver: any
const props = defineProps({
    title: { type: String, default: "提示" },
    cancel_title: { type: String, default: "取消" },
    confirm_title: { type: String, default: "确定" },
    close_after_action: { type: Boolean, default: true },
    before_comfirm: { type: null, default: null },
    bgtype: { type: String, default: 'black' },
    topMove: { type: String, default: '-20% !important' },
    showCancel: { type: Boolean, default: true },
    showComfirm: { type: Boolean, default: true },
    closeOnPressEscape: { type: Boolean, default: true },
    zIndex: { type: Number, default: 100 },
})

const visible = ref(false)

function handleEscapeKeyDown(event: Event) {
    if (!props.closeOnPressEscape) {
        event.preventDefault()
        return
    }
    cancelAction()
}

async function cancelAction() {
    emit('cancel')
    resolver?.({ action: 'cancel' })
    if (props.close_after_action === true) {
        visible.value = false
    }
}

async function comfirmAction() {
    emit('comfirm')
    if (props.before_comfirm) {
        const hook_result = await props.before_comfirm()
        if (hook_result === true) {
            resolver?.({ action: 'comfirm', hook_result: hook_result })
            checkClose()
        }
    } else {
        resolver?.({ action: 'comfirm' })
        checkClose()
    }
}

function checkClose() {
    if (props.close_after_action === true) {
        visible.value = false
    }
}

// watch(visible, show => {
//     if (show) {
//         nextTick(() => {
//             // 需要 focus 的话这里加
//         })
//     }
// })

// 暴露方法（open/close，可选）
const open = () => {
    visible.value = true
    return new Promise((resolve, reject) => {
        resolver = resolve
    })
}
const close = () => (visible.value = false)
defineExpose({ open, close })

// 动画参数（可继续复用你的）
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
        opacity: { delay: 0.2, duration: 0.5, ease: 'easeOut' }
    }
}

const dialogInitialState: any = {
    opacity: 0,
    filter: 'blur(10px)',
    z: -100,
    rotateY: 25,
    rotateX: 5,
    transformPerspective: 500,
    transition: { duration: 0.3, ease: [0.67, 0.17, 0.62, 0.64] }
}
</script>

<style lang="scss" scoped>
/* 你的样式原样保留 */
.dialog-container {
    display: flex;
    align-items: center;
    justify-content: center;
}

.overlay {
    background: rgba(0, 0, 0, 0.5);
    position: fixed;
    inset: 0;
    backdrop-filter: blur(3px);
}

.input-modal-container {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;

    .modal {
        border-radius: 10px;
        border: 1px solid #1d2628;
        background-color: #0b1011;
        padding: 20px;
        min-width: 300px;
        pointer-events: auto;

        .dialog-title {
            font-weight: 500;
            font-size: 16px;
            margin: 0 0 20px;
            color: rgb(255, 255, 255);
        }

        .controls button {
            background-color: white;
            color: black;
            font-size: 0.9rem;
            padding: 6px 10px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
        }

        .controls {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            border: none!important;
            padding-top: 10px;
        }

        .controls button.cancel {
            background-color: #1a1e26;
            color: white;
        }
    }
}
</style>
