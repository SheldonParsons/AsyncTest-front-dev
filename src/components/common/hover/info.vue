<template>
    <!-- 1. 把 Provider 提到最外层，只创建一次 -->
    <Tooltip.Provider>
        <!-- 2. 以 openItem 控制每个 Root 的开关 -->
        <Tooltip.Root :open="openItem">
            <!-- 3. Trigger 用 as-child，将原生 div 作为触发器，减少 motion 包裹 -->
            <Tooltip.Trigger as-child>
                <motion.div class="mini-btn-filter" :whilePress="{ scale: 0.9 }" @mouseenter="openItem = true"
                    @mouseleave="openItem = false">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="lucide lucide-info-icon lucide-info">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" />
                        <path d="M12 8h.01" />
                    </svg>
                </motion.div>
            </Tooltip.Trigger>

            <Tooltip.Portal>
                <Tooltip.Content force-mount v-if="openItem" as-child :side-offset="10">
                    <motion.div class="tooltip-content" :initial="{ opacity: 0, y: 20, scale: 0.8 }"
                        :animate="{ opacity: 1, y: 0, scale: 1 }" :exit="{
                            opacity: 0,
                            y: 20,
                            scale: 0.8,
                            transition: { duration: 0.1 },
                        }" :transition="{
                            ...spring,
                            opacity: { ...spring, bounce: 0 } as any,
                        } as any">
                        <motion.div :style="{ wordBreak: 'break-all' }"
                            style="display: flex;flex-direction: column;gap: 5px;">
                            <div>字段描述：</div>
                            <div>{{ desc }}</div>
                        </motion.div>
                        <Tooltip.Arrow class="tooltip-arrow" />
                    </motion.div>
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    </Tooltip.Provider>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { motion } from 'motion-v'
// @ts-ignore
import { Tooltip } from 'reka-ui/namespaced'

// props & emits
const props = defineProps({
    desc: {
        default: ""
    }
})


// 动画参数
const spring = {
    type: 'spring',
    bounce: 0.6,
    visualDuration: 0.3
}

// 当前打开的 Tooltip key
const openItem = ref(false)

</script>

<style lang="scss" scoped>
.mini-btn-filter {
    width: 1.4rem;
    height: 1.4rem;
    box-sizing: border-box;
    padding: 2px;
    border-radius: 4px;
    cursor: pointer;
    background-color: black;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;

    svg {
        height: 100%;
        width: 100%;
    }
}

.mini-btn-filter:hover {
    background: rgba($color: #ffffff, $alpha: 0.2);
}
</style>