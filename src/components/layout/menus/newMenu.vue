<template>
    <div class="container">
        <div class="menu-container">
            <div :class="{'ele-container': true, 'focuse-icon': currentFocuseIcon === 'interface'}" @click="switchRouter('interface')">
                <API class="icon-menu api"></API>
                <span>APIs</span>
            </div>
            <div :class="{'ele-container': true, 'focuse-icon': currentFocuseIcon === 'data'}" @click="switchRouter('data')">
                <DATA class="icon-menu api"></DATA>
                <span>Data</span>
            </div>
            <div :class="{'ele-container': true, 'focuse-icon': currentFocuseIcon.indexOf('mock') !== -1}" @click="switchRouter('mockData')">
                <MOCK class="icon-menu api"></MOCK>
                <span>Mock</span>
            </div>
            <div :class="{'ele-container': true, 'focuse-icon': currentFocuseIcon.indexOf('api') !== -1}" @click="switchRouter('apiAuthorization')">
                <OPEN class="icon-menu api"></OPEN>
                <span>Open Server</span>
            </div>
            <div :class="{'ele-container': true,'ele-other': true, 'focuse-icon': (currentFocuseIcon === 'otherwise' || currentFocuseIcon === 'update')}" @click="switchRouter('otherwise')">
                <OTHER class="icon-menu api"></OTHER>
                <span>其他</span>
            </div>
        </div>
    </div>
</template>


<script setup lang="ts">
import { getCurrentInstance,onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import API from "@/assets/svg/menu/api.vue";
import MOCK from "@/assets/svg/menu/mock.vue";
import OTHER from "@/assets/svg/menu/other.vue";
import OPEN from "@/assets/svg/menu/open.vue";
import DATA from "@/assets/svg/menu/data.vue";
import tools from '@/utils/tools'
import { useI18n } from 'vue-i18n'
const route: any = useRoute()
const router: any = useRouter()
const currentFocuseIcon = ref('data')


onMounted(() => {
  switchRouter(router.currentRoute.value.name)
})

const emit = defineEmits(['switchRouterAction'])

// 全局对象
const { proxy }: any = getCurrentInstance()
const { t } = useI18n()

function opening() {
    tools.message(t('global.open'), proxy)
}

function switchRouter(routerName: string) {
    emit('switchRouterAction', routerName)
    const params = { project: Number(route.params.project) }
    if (router.currentRoute.value.name !== routerName) {
        router.push({ name: routerName, params })
    }
    currentFocuseIcon.value = routerName
}
</script>

<style lang="scss" scoped>
.container {
    height: 100%;
}

.menu-container {
    height: inherit;
    display: flex;
    margin-top: 1rem;
    justify-content: top;
    flex-direction: column;
    align-items: center;
}

.icon-menu {
    margin: auto;
}

.ele-container {
    margin: 0.5rem 1rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    font-weight: 400;
    cursor: pointer;

    span {
        text-align: center;
        margin-top: 0.5rem;
        font-size: 14px;
    }
}

.ele-other {
    position: fixed;
    bottom: 10px;
}
</style>

<style lang="scss">
.focuse-icon {
    color: #007a5f;

    .icon-menu {
        .api-path {
            fill: #007a5f !important;
        }
    }
}
.ele-container:hover {
    color: #007a5f;

    .icon-menu {
        .api-path {
            fill: #007a5f !important;
        }
    }
}
</style>