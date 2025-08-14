<template>
    <div class="dialog-container">
        <Dialog.Root :open="visible">
            <Dialog.Portal>
                <AnimatePresence>
                <Dialog.Overlay as-child>
                    <motion.div class="overlay" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
                        :exit="{ opacity: 0 }" />
                </Dialog.Overlay>
                <Dialog.Content as-child>
                    <motion.div class="step-modal-container" @click="onOverlayClick" :initial="dialogInitialState"
                        :animate="dialogOpenState" :exit="dialogInitialState" :style="{ transformPerspective: 200 }">
                        <div class="modal" @click.stop>
                            <Dialog.Description>
                                <div class="steps-container">
                                    <motion.div class="b-item">
                                        <motion.li class="guide-item" v-for="(item, index) in steps" :key="index"
                                            :style="{ justifyContent: hover_item === index ? 'flex-end' : 'flex-start' }"
                                            @hoverStart="onHoverStart(index)" @hoverEnd="hover_item = -1"
                                            @click="action(item)">
                                            <motion.span layout class="text">
                                                <CaseLight class="case-icon" style="height:2rem;width: 2rem;" />
                                                <span class="title g-ellipsis">{{ item }}</span>
                                            </motion.span>
                                            <motion.span layout class="text-cover">
                                                <Case class="case-icon" style="height:2rem;width: 2rem;" />
                                                <span class="title g-ellipsis">{{ item }}</span>
                                            </motion.span>
                                            <Cursor :show="hover_item === index" follow :offset="{ x: 10, y: 10 }"
                                                :variants="{
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
                                                    <div class="step-detail-item">
                                                        <div class="top-title" v-show="item === 'interface'">
                                                            <div
                                                                style="display: flex;flex-direction: column;justify-content: center;align-items: center;gap: 10px;">
                                                                <div class="icon-item-special">
                                                                    <CaseLight class="case-icon"
                                                                        style="height:2rem;width: 2rem;" />
                                                                </div>
                                                                <div class="gradient-text orange"
                                                                    style="font-weight: 500;font-size: 1rem;">
                                                                    INTERFACE</div>
                                                            </div>
                                                            <div class="text-title">
                                                                <div class="title">引用接口</div>
                                                                <div class="detail">
                                                                    从您编写的APIs处引用接口，您可以在这里对接口直接进行编辑操作，将多个接口连接起来逐步形成您的用例。
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="top-title" v-show="item === 'database'">
                                                            <div
                                                                style="display: flex;flex-direction: column;justify-content: center;align-items: center;gap: 10px;">
                                                                <div class="icon-item-special">
                                                                    <CaseLight class="case-icon"
                                                                        style="height:2rem;width: 2rem;" />
                                                                </div>
                                                                <div class="gradient-text orange"
                                                                    style="font-weight: 500;font-size: 1rem;">
                                                                    DATABASE</div>
                                                            </div>
                                                            <div class="text-title">
                                                                <div class="title">连接数据库</div>
                                                                <div class="detail">
                                                                    您可以通过编写SQL语句来访问数据库，AsyncTest提供了多种解析响应数据的工具，亦或者将其放入到变量中进行更复杂的处理。
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="top-title" v-show="item === 'script'">
                                                            <div
                                                                style="display: flex;flex-direction: column;justify-content: center;align-items: center;gap: 10px;">
                                                                <div class="icon-item-special">
                                                                    <CaseLight class="case-icon"
                                                                        style="height:2rem;width: 2rem;" />
                                                                </div>
                                                                <div class="gradient-text orange"
                                                                    style="font-weight: 500;font-size: 1rem;">
                                                                    SCRIPT</div>
                                                            </div>
                                                            <div class="text-title">
                                                                <div class="title">自定义脚本</div>
                                                                <div class="detail">
                                                                    AsyncTest
                                                                    Case提供了一个Python环境给您，您可以在这个空间内执行自定义的Python代码，您可以在这里处理变量，或者控制整个用例的状态。
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="top-title" v-show="item === 'multitasker'">
                                                            <div
                                                                style="display: flex;flex-direction: column;justify-content: center;align-items: center;gap: 10px;">
                                                                <div class="icon-item-special">
                                                                    <CaseLight class="case-icon"
                                                                        style="height:2rem;width: 2rem;" />
                                                                </div>
                                                                <div class="gradient-text orange"
                                                                    style="font-weight: 500;font-size: 1rem;">
                                                                    MULTITASKER</div>
                                                            </div>
                                                            <div class="text-title">
                                                                <div class="title">多任务执行器</div>
                                                                <div class="detail">
                                                                    区别于循环，多任务执行器可以在异步维度发挥更大的作用，如果您设置了以同步的方式运行，那么它和普通的for其实没有差异，但是您也可以选择异步驱动，让他摆脱同步的限制。
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="top-title" v-show="item === 'group'">
                                                            <div
                                                                style="display: flex;flex-direction: column;justify-content: center;align-items: center;gap: 10px;">
                                                                <div class="icon-item-special">
                                                                    <CaseLight class="case-icon"
                                                                        style="height:2rem;width: 2rem;" />
                                                                </div>
                                                                <div class="gradient-text orange"
                                                                    style="font-weight: 500;font-size: 1rem;">
                                                                    GROUP</div>
                                                            </div>
                                                            <div class="text-title">
                                                                <div class="title">步骤分组</div>
                                                                <div class="detail">
                                                                    您可以通过分组来结构化您的步骤，让您的脚本更加清晰易于阅读。
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="top-title" v-show="item === 'if'">
                                                            <div
                                                                style="display: flex;flex-direction: column;justify-content: center;align-items: center;gap: 10px;">
                                                                <div class="icon-item-special">
                                                                    <CaseLight class="case-icon"
                                                                        style="height:2rem;width: 2rem;" />
                                                                </div>
                                                                <div class="gradient-text orange"
                                                                    style="font-weight: 500;font-size: 1rem;">
                                                                    IF</div>
                                                            </div>
                                                            <div class="text-title">
                                                                <div class="title">条件分支</div>
                                                                <div class="detail">
                                                                    您可以通过条件分支来决定某些步骤是否执行，这在复杂的场景中非常实用。您可以通过这个技巧来大幅度的减少您的用例编写，但是非常推荐您同时考虑单个用例的长度，以免增加阅读的难度。
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="top-title" v-show="item === 'error'">
                                                            <div
                                                                style="display: flex;flex-direction: column;justify-content: center;align-items: center;gap: 10px;">
                                                                <div class="icon-item-special">
                                                                    <CaseLight class="case-icon"
                                                                        style="height:2rem;width: 2rem;" />
                                                                </div>
                                                                <div class="gradient-text orange"
                                                                    style="font-weight: 500;font-size: 1rem;">
                                                                    ERROR</div>
                                                            </div>
                                                            <div class="text-title">
                                                                <div class="title">异常抛出</div>
                                                                <div class="detail">
                                                                    在这个步骤您可以通过配置或者自定义代码的方式抛出特定的错误，通过结合用例以及循环的错误处理方式来实现在异常情况对当前流程、用例甚至整个任务的控制。
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="top-title" v-show="item === 'delay'">
                                                            <div
                                                                style="display: flex;flex-direction: column;justify-content: center;align-items: center;gap: 10px;">
                                                                <div class="icon-item-special">
                                                                    <CaseLight class="case-icon"
                                                                        style="height:2rem;width: 2rem;" />
                                                                </div>
                                                                <div class="gradient-text orange"
                                                                    style="font-weight: 500;font-size: 1rem;">
                                                                    DELAY</div>
                                                            </div>
                                                            <div class="text-title">
                                                                <div class="title">延迟阻塞</div>
                                                                <div class="detail">
                                                                    通过这个步骤，可以对当前流程进行特定时间的阻塞，需要说明的是，delay的作用域是取决于它当前的环境的，您可能处于一个异步的的多用例环境，那么它阻塞的将是当前的协程。
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="top-title" v-show="item === 'case'">
                                                            <div
                                                                style="display: flex;flex-direction: column;justify-content: center;align-items: center;gap: 10px;">
                                                                <div class="icon-item-special">
                                                                    <CaseLight class="case-icon"
                                                                        style="height:2rem;width: 2rem;" />
                                                                </div>
                                                                <div class="gradient-text orange"
                                                                    style="font-weight: 500;font-size: 1rem;">
                                                                    CASE</div>
                                                            </div>
                                                            <div class="text-title">
                                                                <div class="title">引用用例</div>
                                                                <div class="detail">
                                                                    您可以在当前用例中引用其他的用例，甚至可以跨项目进行用例的引用，需要说明的是之所以是”引用“，意味着这个用例将不会被拷贝，而是直接通过引用的方式进行驱动，此处的配置变动将直接修改被引用的用例配置。
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="top-title" v-show="item === 'copy'">
                                                            <div
                                                                style="display: flex;flex-direction: column;justify-content: center;align-items: center;gap: 10px;">
                                                                <div class="icon-item-special">
                                                                    <CaseLight class="case-icon"
                                                                        style="height:2rem;width: 2rem;" />
                                                                </div>
                                                                <div class="gradient-text orange"
                                                                    style="font-weight: 500;font-size: 1rem;">
                                                                    COPY</div>
                                                            </div>
                                                            <div class="text-title">
                                                                <div class="title">拷贝步骤</div>
                                                                <div class="detail">
                                                                    一个简化操作，您可以通过可视化选择的方式拷贝其他用例的步骤，。
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="content" v-show="item === 'interface'">
                                                            <div class="interface">
                                                                <span class="gradient-text gray">POST</span>
                                                            </div>
                                                            <div
                                                                style="width: 100%;display: flex;justify-content: center;align-items: center;position: absolute;width: 1.5rem;left: 5px;top: 33px;">
                                                                <Redo style="width: 1.5rem;"></Redo>
                                                            </div>
                                                            <div class="interface"><span
                                                                    class="gradient-text gray">GET</span></div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </Cursor>
                                        </motion.li>
                                    </motion.div>
                                </div>
                            </Dialog.Description>
                        </div>
                    </motion.div>
                </Dialog.Content>
                </AnimatePresence>
            </Dialog.Portal>
        </Dialog.Root>
    </div>
</template>

<script setup lang="ts">
// @ts-ignore
import { Dialog } from 'reka-ui/namespaced'
import { ref, nextTick, watch } from 'vue'
import {
    AnimatePresence,
    motion, clamp,
    useSpring,
    useTransform,
    useVelocity
} from "motion-v"
import { Cursor } from "motion-plus-vue"
import { usePointerPosition } from "motion-plus-vue"
import CaseLight from "@/assets/svg/tree/case_light.vue";
import Case from "@/assets/svg/tree/case.vue";
import Redo from '@/assets/logo/final/match_vue/redo.vue'
const visible = ref(false)

const steps = ref([])

function onOverlayClick() {
    visible.value = false
}
const position = usePointerPosition()

const skewX = usePointerToSkew(position.x)
const skewY = usePointerToSkew(position.y)
let resolver: any
function action(step_type: string) {
    hover_item.value = -1
    setTimeout(() => {
        visible.value = false
        resolver?.({ action: 'comfirm', step_type: step_type })
    }, 200)

}

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

function onHoverStart(index: any) {
    hover_item.value = index
}

const hover_item: any = ref(-1)

const enterTransition: any = {
    duration: 0.15,
    ease: [0, 0.54, 0.37, 0.97],
}

const exitTransition: any = {
    duration: 0.15,
    ease: "easeIn",
}

// 暴露方法（open/close，可选）
const open = (steps_type_list: any) => {
    visible.value = true
    steps.value = steps_type_list
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
    z-index: 100 !important;
    backdrop-filter: blur(3px);
}

.step-modal-container {
    position: fixed;
    inset: 0;
    z-index: 100 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;

    .modal {
        border-radius: 10px;
        background-color: #0b1011;
        z-index: 100 !important;
        padding-left: 20px;
        padding-right: 20px;
        pointer-events: auto;

        .steps-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 5px;


            .item {
                height: 4rem;
                width: 100%;
                background-color: white;
                border-radius: 4px;
            }
        }
    }
}

.b-item {
    width: 100%;
    display: flex;
    justify-content: center;
    flex-direction: column;
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
    color: white;
    font-size: 48px;
    font-weight: bold;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 10px;
    line-height: 48px;
}

.text-cover {
    color: black;
    font-size: 48px;
    font-weight: bold;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 10px;
    line-height: 48px;
    background-color: white;
    width: 100%;
    border-radius: 4px;
}

.number-label {
    font-size: 48px;
    font-weight: bold;
    text-transform: uppercase;
    opacity: 0.5;
    font-variant-numeric: tabular-nums;
}

.step-detail-item {
    width: 400px;
    // height: 300px;
    border-radius: 12px;
    padding: 1.25rem;
    box-sizing: border-box;
    background-color: white;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;

    .content {
        display: flex;
        flex-direction: column;
        gap: 10px;
        position: relative;

        .interface {
            display: flex;
            align-items: center;
            padding: 10px;
            box-sizing: border-box;
            height: 40px;
            background: linear-gradient(80deg, #ffd460 0%, #f8b98c 40%, #f07b3f 90%);
            border-radius: 8px;
        }
    }

    .top-title {
        display: flex;
        gap: 20px;

        .text-title {
            .title {
                font-weight: 500;
                font-size: 1rem;
            }

            .detail {
                line-height: 1.4rem;
                font-weight: 400;
                font-size: 0.9rem;
                color: rgba(0, 0, 0, 0.5);
            }
        }

        .icon-item-special {
            background-color: black;
            border-radius: 50%;
            width: 3.5rem;
            height: 3.5rem;
            display: flex;
            justify-content: center;
            align-items: center;
            min-width: 3.5rem;
        }
    }

}

.orange {
    // color: #eead0e;
    background: linear-gradient(80deg, black 0%, #976b49 80%);
}

.gray {
    background: linear-gradient(80deg, black 0%, #606060 80%);
}

.gradient-text {
    /* 定义背景渐变 */
    /* 将背景裁剪到文字（仅 WebKit 内核生效）*/
    -webkit-background-clip: text;
    /* 文字本身透明，这样才能显示背景 */
    -webkit-text-fill-color: transparent;
    /* 对非 WebKit 浏览器，也可以加上普通 background-clip */
    background-clip: text;
    /* 如果希望支持 Firefox，需要开启 text-fill-color 的标准属性（目前仍需前缀或兼容写法） */
    color: transparent;
    font-weight: 800;
}
</style>
