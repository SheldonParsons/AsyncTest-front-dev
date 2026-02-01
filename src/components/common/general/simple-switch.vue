<template>
    <div class="simple-switch-container">
        <Switch.Root :model-value="modelValue" :class="{ checked_animation: modelValue }"
            @update:model-value="handleChange">
            <motion.button class="switch" :initial="modelValue" :animate="{
                backgroundColor: modelValue ? 'black' : 'var(--hue-6-transparent)'
            }" :style="{
                    justifyContent: modelValue ? 'flex-end' : 'flex-start'
                }">
                <Switch.Thumb as-child>
                    <motion.div class="thumb-inner" :data-checked="modelValue" :layout="true" :transition="{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30
                    }" />
                </Switch.Thumb>
            </motion.button>
        </Switch.Root>
    </div>
</template>

<script setup lang="ts">
// @ts-ignore
import { Switch } from 'reka-ui/namespaced'
import { motion } from 'motion-v'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:modelValue'])

function handleChange(value: boolean) {
    emit('update:modelValue', value)
}
</script>

<style lang="scss" scoped>
.simple-switch-container {
    --hue-6-transparent: rgba(154, 154, 154);
    display: flex;
    align-items: center;
    background-color: transparent;

    button {
        all: unset;
    }

    .switch {
        width: 35px;
        padding: 5px;
        background-color: var(--hue-6-transparent);
        border-radius: 9999px;
        position: relative;
        outline: none;
        cursor: pointer;
        display: flex;
        border: none;
    }

    .thumb-inner {
        display: block;
        width: 13px;
        height: 13px;
        background-color: white;
        border-radius: 50%;
    }

    .checked_animation {
        animation: pulse 0.3s ease;
    }

    @keyframes pulse {
        0% {
            transform: scale(1);
        }

        50% {
            transform: scale(1.05);
        }

        100% {
            transform: scale(1);
        }
    }
}
</style>
