<template>
    <section class="sidebar-group">
          <p class="sidebar-group__title">{{ $t('menu.level4.father') }}</p>
          <a
            class="link"
            :class="{ active: 'otherwise' === activeLinkStyle }"
            @click="
              switchRouter('otherwise')
            "
          >
            <p class="link-text">{{ $t('menu.level4.child.a') }}</p>
          </a>
          <a
            class="link"
            :class="{ active: 'update' === activeLinkStyle }"
            @click="switchRouter('update')"
          >
            <p class="link-text">{{ $t('menu.level5.child.a') }}</p>
          </a>
        </section>
</template>


<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const props = defineProps({
    activeLinkStyle: {
        type: String,
        default: '0'
    }
})

const emit = defineEmits(['switchRouterAction'])

function switchRouter(data:string) {
    emit('switchRouterAction', data)
}
</script>

<style lang="scss" scoped>
a {
    cursor: pointer;
}

.sidebar-group {
    .sidebar-group__title {
        font-size: 1rem;
        font-weight: 700;
        margin-bottom: 8px;
        line-height: 24px;
        color: rgb(48, 49, 51);
    }

    .sidebar-group__title:first-child {
        margin-top: 0;
    }

    .link {
        display: block;
        padding: 10px 16px 10px 26px;
        line-height: 1.5;
        font-size: 0.9rem;
        border-radius: 8px;
        font-weight: 500;
        text-decoration: inherit;
        touch-action: manipulation;
    }

    .link.active .link-text {
        font-weight: 600;
        color: var(--global-theme-color);
        transition: color 0.25s;
    }

    .link.active {
        background-color: var(--global-theme-color-rgb);
    }

    .link-text {
        margin: 0;
        line-height: 20px;
        font-size: 13px;
        font-weight: 500;
        color: #606266;
        transition: color 0.5s;
    }

    .link:hover,
    .link:focus {
        .link-text {
            color: var(--global-theme-color);
        }
    }
}
</style>