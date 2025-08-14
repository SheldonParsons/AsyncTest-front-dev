<template>
    <motion.div class="b-item">
        <motion.div>
            <motion.li class="guide-item" v-for="(item, index) in items" :key="index"
                :style="{ justifyContent: hover_item === item.number ? 'flex-end' : 'flex-start' }"
                :whileHover="{ scale: 1.05 }" @hoverStart="onHoverStart(item)" @hoverEnd="hover_item = -1">
                <motion.span layout class="text">
                    <span class="number-label">#{{ item.number }}</span>
                    {{ item.label }}
                </motion.span>
                <motion.span layout class="text" aria-hidden>
                    <span class="number-label">#{{ item.number }}</span>
                    {{ item.label }}
                </motion.span>


                <Cursor :show="hover_item === item.number" follow :offset="{ x: 30, y: 30 }" :variants="{
                    default: {
                        clipPath: 'inset(0% 0% 0% 0%)',
                        transition: enterTransition,
                    },
                    exit: {
                        clipPath: 'inset(50% 50% 50% 50%)',
                        transition: exitTransition,
                    },
                }" :style="{ skewX, skewY, originX: 0, originY: 0 }">
                    <motion.div class="image-container" :variants="{
                        default: { scale: 1, transition: enterTransition },
                        exit: { scale: 1.5, transition: exitTransition },
                    }">
                        <img style="border-radius: 10px;" :src="item.image" width="345" height="174"
                            :alt="`Photo of ${item.label}`" />
                    </motion.div>
                </Cursor>
            </motion.li>
        </motion.div>
    </motion.div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue"
import {
    motion, clamp,
    useSpring,
    useTransform,
    useVelocity
} from "motion-v"
import { Cursor } from "motion-plus-vue"
import { usePointerPosition } from "motion-plus-vue"
import SettingImage from '@/views/api/public_dialog/motion_dev_component/image/setting.png'
import LoginImage from '@/views/api/public_dialog/motion_dev_component/image/login.png'
import RunningImage from '@/views/api/public_dialog/motion_dev_component/image/running.png'

const position = usePointerPosition()

const items = [
    { label: 'Login', number: 1, image: LoginImage },
    { label: 'Setting', number: 2, image: SettingImage },
    { label: 'Running', number: 3, image: RunningImage }
]

const skewX = usePointerToSkew(position.x)
const skewY = usePointerToSkew(position.y)

function usePointerToSkew(axisMotionValue: any) {
    const velocity = useVelocity(axisMotionValue)
    const maxVelocity = useTransform(() => clamp(-1000, 1000, velocity.get()))
    const smoothVelocity = useSpring(maxVelocity, {
        damping: 10,
        stiffness: 200,
    })
    return useTransform(smoothVelocity, [0, 100], [0, -1], {
        clamp: false,
    })
}

function onHoverStart(item: any) {
    hover_item.value = item.number
    console.log("hover start")
}

const hover_item: any = ref(-1)

const enterTransition: any = {
    duration: 0.2,
    ease: [0, 0.54, 0.37, 0.97],
}

const exitTransition: any = {
    duration: 0.2,
    ease: "easeIn",
}

</script>


<style lang="scss" scoped>
.b-item {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 10%;

    div {
        padding: 50px;
        border: 5px dotted black;
    }
}

.guide-item {
    position: relative;
    cursor: pointer;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    height: 48px;
}

.text {
    color: black;
    font-size: 48px;
    font-weight: bold;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 10px;
    line-height: 48px;
}

.number-label {
    font-size: 48px;
    font-weight: bold;
    text-transform: uppercase;
    opacity: 0.5;
    font-variant-numeric: tabular-nums;
}

.image-container {
    width: 345px;
    height: 174px;
    border-radius: 10px;
}
</style>
