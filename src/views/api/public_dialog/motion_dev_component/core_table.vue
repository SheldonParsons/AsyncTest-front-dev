<template>
    <div style="
              padding: 10px;
              font-size: 14px;
              font-weight: 500;
              color: black;
            ">
        <TestAnimation :text="text"></TestAnimation>
    </div>
    <el-divider></el-divider>
    <TempList :current_interface="current_interface"></TempList>
</template>

<script lang="ts" setup>
import TempList from "@/views/api/public_dialog/motion_dev_component/core_temp_list.vue"
import TestAnimation from '@/views/api/public_dialog/motion_dev_component/text_animation.vue'
import { ref, onMounted } from 'vue'

const text = ref('')
const index = ref(0)

const props = defineProps({
    current_interface: {
        type: Number,
        default: -1
    }
})

const text_list = ['欢迎使用临时变量，关于临时变量的使用和规则：',
    '1. 临时变量的优先级非常高，但请放心，它仅会在您运行接口时才会生效，用例中它将被隔离。',
    '2. 您可以通过接口的后置操作中设置全局变量、环境变量、临时变量来覆盖该变量的动态值。',
    '3. 使用建议：和普通变量的同名策略，通过它的强制优先级来帮助您调试接口，运行用例时通过自动隔离来调用您的普通变量。']

onMounted(() => {
    text.value = text_list[index.value]

    setInterval(() => {
        index.value = (index.value + 1) % text_list.length
        text.value = text_list[index.value]
    }, 7000) // 每 3 秒切换一次
})
</script>