<template>
    <motion.button class="motion-button" :variants="{ pressed: { scale: 0.9 } }" whilePress="pressed"
        @press="handleAction">Save
    </motion.button>
</template>

<script lang="ts" setup>
import { motion } from 'motion-v'

const emit = defineEmits(['action'])

function handleAction() {
    emit('action')
}

</script>

<style lang="scss" scoped>
.motion-button {
    outline: none;
    background-color: black;
    padding: 5px;
    color: white;
    border-radius: 8px;
    cursor: pointer;
}
</style>