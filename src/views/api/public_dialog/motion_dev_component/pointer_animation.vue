<template>
    <div class="pointer-container">
        <motion.button ref="buttonRef" @press="action" :style="pull" class="button"
            :variants="{ pressed: { scale: 0.95 } }" while-press="pressed">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="lucide lucide-plus-icon lucide-plus">
                <motion.path d="M5 12h14" />
                <motion.path d="M12 5v14" />
            </svg>
            新增参数
        </motion.button>
        <!-- <Cursor :magnetic="true" class="cursor" :variants="variants" :style="style" /> -->
    </div>
</template>
<script setup lang="ts">
import { Cursor, useMagneticPull } from "motion-plus-vue"
import { motion, useDomRef } from "motion-v"

const buttonRef = useDomRef()
const pull = useMagneticPull(buttonRef, 0.1)
const emit = defineEmits(['action'])

const variants = {
    default: {
        backgroundColor: "#7e7e7e",
    },
    pointer: {
        backgroundColor: "#ddd",
    },
}

const style = {
    borderRadius: 10,
    mixBlendMode: "multiply",
}

function action() {
    emit('action')
}
</script>

<style>
.pointer-container {
    display: flex;
    align-items: center;
    justify-content: start;
    min-width: 90px;

    .button {
        background: black;
        border-radius: 6px;
        padding: 5px;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px dashed #fff4;
        user-select: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Helvetica, Arial, sans-serif;
        font-weight: 500;
        font-size: 14px;
        margin-left: 10px;
        cursor: pointer;
    }

    .button>span {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .cursor {
        mix-blend-mode: multiply;
    }
}
</style>
