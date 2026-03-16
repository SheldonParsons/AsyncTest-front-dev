<template>
    <div class="mind-container">
        <MindHeader>
            <div>sheldon</div>
        </MindHeader>
        <MindMain class="mind-main-container" :doc="doc" :filePath="filePath" :docId="docId" :windowKey="windowKey"
            @changeFilePath="changeFilePath">
        </MindMain>
        <MindFooter class="mind-footer-container"></MindFooter>
    </div>
</template>

<script lang="ts" setup>
import MindHeader from '@/mind/vue_views/headers/index.vue'
import MindMain from '@/mind/vue_views/main/index.vue'
import MindFooter from '@/mind/vue_views/footer.vue/index.vue'
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const docId = ref<string>('');
const filePath = ref<string | null>(null);
const doc = ref<any>(null);
const windowKey = ref<any>(null);

onMounted(async () => {
    const qDocId = route.query.docId;
    windowKey.value = route.query.windowKey
    if (typeof qDocId !== 'string' || !qDocId) {
        throw new Error('Mind window missing query.docId');
    }

    docId.value = qDocId;

    // 从主进程 docStore 取回 doc
    const res = await window.electronAPI.amind.docGet({ docId: docId.value });
    filePath.value = res.filePath;
    doc.value = res.doc;
});

function changeFilePath(value: any) {
    filePath.value = value
}
</script>

<style lang="scss" scoped>
.mind-container :deep(.window-header) {
    flex: 0 0 55px;
}

.mind-container {
    width: 100%;
    height: 100%;
    background-color: rgb(237, 240, 242);
    display: flex;
    flex-direction: column;
    border-radius: 10px;

    .mind-main-container {
        flex: 1;
        min-height: 0;
    }

    .mind-footer-container,
    .mind-main-container {
        margin-left: 10px;
        margin-right: 10px;
    }

}
</style>