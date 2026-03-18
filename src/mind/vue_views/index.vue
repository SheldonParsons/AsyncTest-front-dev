<template>
    <div class="mind-container">
        <MindHeader>
            <div class="mind-header-meta">
                <div class="mind-header-title">
                    <span class="mind-header-name">{{ saveState.displayName }}</span>
                    <span v-if="saveState.isDirty" class="mind-header-dirty-dot"></span>
                    <SaveActionsMenu :can-save="!!docId && !saveState.isSaving"
                        :can-save-as="!!docId && !saveState.isSaving" :can-open-folder="!!filePath"
                        :recent-paths="recentPaths" @save="onSaveClick" @saveAs="onSaveAsClick"
                        @openFolder="onOpenFolderClick" @quickNew="onQuickNewClick" @openLocal="onOpenLocalClick"
                        @openRecent="onOpenRecentClick" @menuOpen="loadRecentPaths" />
                    <span v-if="saveState.isSaving" class="mind-header-saving-indicator">保存中...</span>
                </div>
            </div>
            <div class="mind-header-format-entry" :style="{ 'margin-right': isMac ? '0px' : '135px' }">
                <button class="mind-header-format-button" type="button" aria-label="打开格式面板" @click="toggleFormatPanel">
                    <img class="mind-header-format-icon" :src="settingsIcon" alt="" />
                </button>
                <span class="mind-header-format-label">格式</span>
            </div>
        </MindHeader>
        <MindMain ref="mindMainRef" class="mind-main-container" :doc="doc" :filePath="filePath" :docId="docId"
            :windowKey="windowKey" :show-format-panel="showFormatPanel" @filePathChange="changeFilePath"
            @saveStateChange="updateSaveState" @nodeCountChange="updateNodeCountState"
            @toggleFormatPanel="toggleFormatPanel">
        </MindMain>
        <MindFooter class="mind-footer-container" :total-nodes="nodeCountState.totalNodes"
            :selected-nodes="nodeCountState.selectedNodes"></MindFooter>
    </div>
</template>

<script lang="ts" setup>
import MindHeader from '@/mind/vue_views/headers/index.vue'
import MindMain from '@/mind/vue_views/main/index.vue'
import MindFooter from '@/mind/vue_views/footer.vue/index.vue'
import SaveActionsMenu from '@/mind/vue_views/components/SaveActionsMenu.vue'
import settingsIcon from '@/mind/core/action_icon/settings.svg'
import { DEBUG_NEW_MIND_SEED_NODE_COUNT } from '@/mind/vue_views/main/constants'
import { onMounted, ref, computed } from 'vue';
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
const recentPaths = ref<string[]>([]);
const showFormatPanel = ref(false);
const saveState = ref({
    isDirty: false,
    isSaving: false,
    displayName: '思维导图',
});
const nodeCountState = ref({
    totalNodes: 0,
    selectedNodes: 0,
});
const isMac = computed(() => window.electronAPI?.platform === 'darwin');
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
    await loadRecentPaths();
});

function changeFilePath(value: any) {
    filePath.value = value
}

function updateSaveState(value: { isDirty: boolean; isSaving: boolean; displayName: string }) {
    saveState.value = value;
}

function updateNodeCountState(value: { totalNodes: number; selectedNodes: number }) {
    nodeCountState.value = value;
}

function toggleFormatPanel() {
    showFormatPanel.value = !showFormatPanel.value;
}

function onSaveClick() {
    void mindMainRef.value?.saveDocument();
}

function onSaveAsClick() {
    void mindMainRef.value?.saveDocumentAs();
}

async function loadRecentPaths() {
    try {
        const recents = await window.electronAPI.amind.recents();
        recentPaths.value = Array.isArray(recents) ? recents : [];
    } catch {
        recentPaths.value = [];
    }
}

function toast(title: string) {
    window.$toast({ title })
}

async function onOpenFolderClick() {
    if (!filePath.value) return;
    const result = await window.electronAPI.amind.openFolder({ filePath: filePath.value });
    if (!result?.ok) {
        toast(result?.error || '打开文件目录失败');
    }
}

async function onQuickNewClick() {
    try {
        await window.electronAPI.amind.newAndOpenWindow({ seedNodeCount: DEBUG_NEW_MIND_SEED_NODE_COUNT });
    } catch {
        toast('快速新建失败');
    }
}

async function onOpenRecentClick(targetPath: string) {
    try {
        await window.electronAPI.amind.openFileInWindow({ filePath: targetPath });
    } catch {
        toast('找不到该最近文件');
        await window.electronAPI.amind.removeRecent({ filePath: targetPath });
        await loadRecentPaths();
    }
}

async function onOpenLocalClick() {
    try {
        await window.electronAPI.amind.openDialog();
        await loadRecentPaths();
    } catch {
        toast('打开本地文件失败');
    }
}
</script>

<style lang="scss" scoped>
.mind-container :deep(.window-header) {
    flex: 0 0 55px;
}

.mind-container :deep(.header-content) {
    flex: 1 1 auto;
    min-width: 0;
}

.mind-container :deep(.save-actions-menu),
.mind-container :deep(.save-actions-trigger),
.mind-container :deep(.mind-header-format-entry),
.mind-container :deep(.mind-header-format-button) {
    -webkit-app-region: no-drag;
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
        align-items: center;
        flex: 0 1 auto;
        width: fit-content;
        max-width: min(30%, 420px);
        min-width: 0;
        padding: 6px 14px 6px 10px;
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(245, 247, 250, 0.46));
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.72),
            0 10px 26px rgba(15, 23, 42, 0.06);
    }

    .mind-header-title {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
        width: fit-content;
        max-width: 100%;
    }

    .mind-header-name {
        flex: 1 1 auto;
        min-width: 0;
        font-size: 14px;
        font-weight: 600;
        color: #172033;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        letter-spacing: 0.01em;
    }

    .mind-header-dirty-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #f59e0b;
        box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.14);
        flex: 0 0 auto;
    }

    .mind-header-saving-indicator {
        font-size: 12px;
        color: #8a94a6;
        font-weight: 500;
        white-space: nowrap;
        flex: 0 0 auto;
    }

    .mind-header-format-entry {
        flex: 0 0 auto;
        width: 44px;
        margin-left: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        margin-right: 0;
    }

    .mind-header-format-button {
        width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
        transition: background-color 0.16s ease, transform 0.16s ease;
    }

    .mind-header-format-button:hover {
        background: rgba(156, 163, 175, 0.22);
        transform: translateY(-1px);
    }

    .mind-header-format-icon {
        width: 16px;
        height: 16px;
        display: block;
        opacity: 0.82;
    }

    .mind-header-format-label {
        font-size: 11px;
        line-height: 1;
        color: #6b7280;
        user-select: none;
        pointer-events: none;
    }

    .mind-footer-container,
    .mind-main-container {
        margin-left: 10px;
        margin-right: 10px;
    }

}
</style>
