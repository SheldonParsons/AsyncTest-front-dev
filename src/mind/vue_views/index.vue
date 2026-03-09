<template>
    <div class="mind-container">
        <MindHeader>
            <div>sheldon</div>
        </MindHeader>
        <MindMain class="mind-main-container"></MindMain>
        <MindFooter class="mind-footer-container"></MindFooter>
    </div>
</template>

<script lang="ts" setup>
import MindHeader from '@/mind/vue_views/headers/index.vue'
import MindMain from '@/mind/vue_views/main/index.vue'
import MindFooter from '@/mind/vue_views/footer.vue/index.vue'
</script>

<style lang="scss" scoped>
.mind-container {
    width: 100%;
    height: 100%;
    background-color: rgb(237, 240, 242);
    display: flex;
    flex-direction: column;
    border-radius: 10px;

    .mind-main-container {
        flex: 1;
    }

    .mind-footer-container,
    .mind-main-container {
        margin-left: 10px;
        margin-right: 10px;
    }

}
</style>