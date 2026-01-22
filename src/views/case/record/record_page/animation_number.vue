<template>
    <div class="counter-container">
        <AnimateNumber :style="number" :value="displayValue" />
        <span class="unit">秒</span>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { AnimateNumber } from 'motion-plus-vue';

const props = defineProps({
    start_at: {
        type: Number,
        default: 0,
    },
    end_at: {
        type: Number,
        default: 0,
    },
    server_current_time: {
        type: Number,
        default: 0
    }
});

const number = {
    fontSize: '1rem',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
};

const displayValue = ref(0);

let timerId: ReturnType<typeof setInterval> | null = null;
let localAnchor = 0;   
let baseDuration = 0;  


const initTimerState = () => {
    if (props.end_at > 0) {
        const total = Math.max(0, props.end_at - props.start_at);
        displayValue.value = Number((total / 1000).toFixed(2));
        stopLoop();
        return;
    }

    const serverNow = props.server_current_time || props.start_at; 
    baseDuration = Math.max(0, serverNow - props.start_at);
    localAnchor = Date.now();

    startLoop();
};

const update = () => {
    if (props.end_at > 0) {
        initTimerState();
        return;
    }

    const localPassed = Date.now() - localAnchor;
    const totalMs = baseDuration + localPassed;

    displayValue.value = Number((totalMs / 1000).toFixed(2));
};

const startLoop = () => {
    stopLoop();
    update();
    timerId = setInterval(update, 1000);
};

const stopLoop = () => {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
    }
};

onMounted(() => {
    initTimerState();
});

watch(
    [() => props.start_at, () => props.server_current_time, () => props.end_at],
    () => {
        initTimerState();
    }
);

onBeforeUnmount(() => {
    stopLoop();
});
</script>

<style scoped>
.counter-container {
    display: flex;
    align-items: center;
    font-size: 2rem;
    font-family: "Monoton-Regular", 'Courier New', Courier, monospace;
}

.unit {
    font-size: 0.9rem;
    margin-left: 8px;
    font-weight: 500;
}
</style>