<template>
    <div class="ast-first-container">
        <motion.div :layout="true" :data-open="isOpen" class="ast-first-parent" @click="toggleOpen">
            <StepChoiceFirst ref="stepChoiceRef" :data-open="isOpen" class="ast-first-content" :layout="true"
                @action="action">
            </StepChoiceFirst>
            <motion.div :data-open="isOpen" :whileHover="{ scale: 0.9 }" :whilePress="{ scale: 0.8 }"
                class="ast-first-child">
                <CaseLight style="height:1.2rem;width: 1.2rem;"></CaseLight>
                <div>新建接口</div>
            </motion.div>
        </motion.div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { motion } from 'motion-v'
import StepChoiceFirst from '@/views/case/content/case_content/runner/tree/components/step_first.vue';
import CaseLight from "@/assets/svg/tree/case_light.vue";
const isOpen = ref(false)
const stepChoiceRef = ref(null)

const emit = defineEmits(['scroll', 'action'])

function toggleOpen() {
    isOpen.value = !isOpen.value
    if (isOpen.value === true) {
        emit('scroll')
    }
}

function action(step_type: any) {
    emit('action', step_type)
}
</script>

<style>
.ast-first-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}

.ast-first-parent {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100px;
    height: 40px;
    background-color: transparent;
    overflow: hidden;
    border-radius: 10px;
}

.ast-first-parent[data-open="true"] {
    width: auto;
    height: auto;
}

.ast-first-content[data-open="true"] {
    visibility: visible;
    height: auto !important;
    width: auto !important;
}

.ast-first-child[data-open="true"] {
    height: 0px !important;
    width: 0px !important;
    visibility: hidden;

}

.ast-first-content {
    visibility: hidden;
    height: 0px !important;
    width: 0px !important;
}

.ast-first-child {
    width: 100%;
    height: 100%;
    display: flex;
    gap: 3px;
    justify-content: center;
    align-items: center;
    background: black;
    background-size: 300% 300%;
    animation: gradient-move 1s ease infinite;
    cursor: pointer;
    font-size: 0.8rem;
    color: white;
    border-radius: 8px;
}
</style>
