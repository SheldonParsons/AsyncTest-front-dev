<template>
    <div class="dialog-container">
        <Dialog.Root :open="modelValue">
            <Dialog.Portal>
                <AnimatePresence multiple>
                    <Dialog.Overlay as-child>
                        <motion.div class="overlay" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
                            :exit="{ opacity: 0 }" />
                    </Dialog.Overlay>
                    <Dialog.Content as-child>
                        <motion.div class="modal-container" :initial="dialogInitialState" :animate="dialogOpenState"
                            style="top: -50%;" :exit="dialogInitialState" :style="{ transformPerspective: 200 }">
                            <div class="modal">
                                <Dialog.Title class="dialog-title">
                                    {{ title }}
                                </Dialog.Title>
                                <Dialog.Description style="color: white;">
                                    {{ content }}
                                </Dialog.Description>
                                <div class="controls">
                                    <Dialog.Close as-child>
                                        <button class="cancel" @click="handleClose('pass')">
                                            {{ cancel_title }}
                                        </button>
                                    </Dialog.Close>
                                    <Dialog.Close as-child>
                                        <button @click="handleClose('nosave')">
                                            {{ other_confirm_title }}
                                        </button>
                                    </Dialog.Close>
                                    <Dialog.Close as-child>
                                        <button @click="handleClose('save')">
                                            {{ confirm_title }}
                                        </button>
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
import { Dialog } from 'reka-ui/namespaced'
import { ref } from 'vue'
const open_dialog = ref(false)

const props = defineProps({
    modelValue: Boolean,
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
    }
})

const emit = defineEmits(['update:modelValue', 'action'])

// 关闭对话框
const handleClose = (action_name: string) => {
    emit('action', action_name)
}

const dialogOpenState = {
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

const dialogInitialState = {
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

<style>
.dialog-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
}

.openButton,
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
    border-top: 1px solid #1a1e26;
    padding-top: 20px;
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.controls button.cancel {
    background-color: #1a1e26;
    color: white;
}

.modal {
    border-radius: 10px;
    border: 1px solid #1d2628;
    background-color: #0b1011;
    z-index: 10000000;
    padding: 20px;
    min-width: 300px;
    pointer-events: auto;
}

.dialog-title {
    font-weight: 400;
    font-size: 18px;
    margin: 0 0 20px;
    color: rgb(255, 255, 255);
}

.overlay {
    background: rgba(0, 0, 0, 0.5);
    position: fixed;
    inset: 0;
    z-index: 9999998;
    backdrop-filter: blur(3px);
}

.modal-container {
    position: fixed;
    inset: 0;
    z-index: 9999999;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}
</style>
