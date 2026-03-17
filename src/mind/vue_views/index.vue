<template>
    <div class="mind-container">
        <MindHeader>
            <div class="mind-header-meta">
                <div class="mind-header-title">
                    <span class="mind-header-name">{{ saveState.displayName }}</span>
                    <span v-if="saveState.isDirty" class="mind-header-dirty-dot"></span>
                    <SaveActionsMenu
                        :disabled="!docId || saveState.isSaving"
                        @save="onSaveClick"
                        @saveAs="onSaveAsClick"
                    />
                    <span v-if="saveState.isSaving" class="mind-header-saving-indicator">保存中...</span>
                </div>
                <div class="mind-header-path" v-if="filePath">{{ filePath }}</div>
            </div>
        </MindHeader>
        <MindMain
            ref="mindMainRef"
            class="mind-main-container"
            :doc="doc"
            :filePath="filePath"
            :docId="docId"
            :windowKey="windowKey"
            @filePathChange="changeFilePath"
            @saveStateChange="updateSaveState">
        </MindMain>
        <MindFooter class="mind-footer-container"></MindFooter>
    </div>
</template>

<script lang="ts" setup>
import MindHeader from '@/mind/vue_views/headers/index.vue'
import MindMain from '@/mind/vue_views/main/index.vue'
import MindFooter from '@/mind/vue_views/footer.vue/index.vue'
import SaveActionsMenu from '@/mind/vue_views/components/SaveActionsMenu.vue'
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

type MindMainExpose = {
    saveDocument: () => Promise<boolean>;
    saveDocumentAs: () => Promise<boolean>;
};

const docId = ref<string>('');
const filePath = ref<string | null>(null);
const doc = ref<any>(null);
const windowKey = ref<any>(null);
const mindMainRef = ref<MindMainExpose | null>(null);
const saveState = ref({
    isDirty: false,
    isSaving: false,
    displayName: '思维导图',
});

onMounted(async () => {
    const qDocId = route.query.docId;
    windowKey.value = route.query.windowKey
    if (typeof qDocId !== 'string' || !qDocId) {
        throw new Error('Mind window missing query.docId');
    }

    docId.value = qDocId;

    const res = await window.electronAPI.amind.docGet({ docId: docId.value });
    filePath.value = res.filePath;
    doc.value = res.doc;
});

function changeFilePath(value: any) {
    filePath.value = value
}

function updateSaveState(value: { isDirty: boolean; isSaving: boolean; displayName: string }) {
    saveState.value = value;
}

function onSaveClick() {
    void mindMainRef.value?.saveDocument();
}

function onSaveAsClick() {
    void mindMainRef.value?.saveDocumentAs();
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

    .mind-header-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .mind-header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
    }

    .mind-header-name {
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .mind-header-dirty-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #f59e0b;
        flex: 0 0 auto;
    }

    .mind-header-path {
        max-width: 480px;
        font-size: 12px;
        color: #6b7280;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .mind-header-saving-indicator {
        font-size: 12px;
        color: #9ca3af;
        font-weight: 500;
        white-space: nowrap;
    }

    .mind-footer-container,
    .mind-main-container {
        margin-left: 10px;
        margin-right: 10px;
    }

}
</style>
