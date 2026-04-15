<template>
    <div class="mind-container">
        <MindHeader>
            <div class="mind-header-user-section">
                <div class="mind-header-action-item">
                    <div class="mind-header-avatar-container" @click="handleAvatarClick">
                        <el-avatar :size="36" :src="userImage" class="mind-header-user-avatar" />
                        <div class="mind-header-online-indicator"></div>
                    </div>
                </div>
                <div v-if="isLoggedIn" class="mind-header-action-item">
                    <button class="mind-header-user-action-btn mind-header-logout-btn" type="button"
                        aria-label="退出登录" @click="logout">
                        <AnimatedLogoutIcon :size="18" />
                    </button>
                </div>
            </div>
            <div class="mind-header-meta">
                <div class="mind-header-title">
                    <button class="mind-header-home-button" type="button" aria-label="显示主窗口" @click="showMainWindow">
                        <img class="mind-header-home-icon" :src="homeIcon" alt="" />
                    </button>
                    <span class="mind-header-name">{{ saveState.displayName }}</span>
                    <span v-if="saveState.isDirty" class="mind-header-dirty-dot"></span>
                    <SaveActionsMenu :can-save="!!docId && !saveState.isSaving"
                        :can-save-as="!!docId && !saveState.isSaving" :can-open-folder="!!filePath"
                        :can-export-xmind="!!docId && !saveState.isSaving"
                        :recent-paths="recentPaths" @save="onSaveClick" @saveAs="onSaveAsClick"
                        @openFolder="onOpenFolderClick" @quickNew="onQuickNewClick" @openLocal="onOpenLocalClick"
                        @exportXmind="onExportXmindClick" @openRecent="onOpenRecentClick" @menuOpen="loadRecentPaths" />
                    <span v-if="saveState.isSaving" class="mind-header-saving-indicator">保存中...</span>
                </div>
            </div>
            <div class="mind-header-shortcuts">
                <div class="mind-header-shortcut-strip">
                    <button class="mind-header-shortcut-entry" :class="{ 'is-disabled': !hasSelectedNodes }" type="button"
                        :disabled="!hasSelectedNodes" @click="onHeaderBranchClick">
                        <img class="mind-header-shortcut-icon" :src="nextNodeIcon" alt="" />
                        <span class="mind-header-shortcut-label">分支</span>
                    </button>
                    <button class="mind-header-shortcut-entry" :class="{ 'is-disabled': !hasSelectedNodes }" type="button"
                        :disabled="!hasSelectedNodes" @click="onHeaderChildBranchClick">
                        <img class="mind-header-shortcut-icon" :src="childNodeIcon" alt="" />
                        <span class="mind-header-shortcut-label">子分支</span>
                    </button>
                    <span class="mind-header-shortcut-divider" aria-hidden="true"></span>
                    <button class="mind-header-shortcut-entry"
                        :class="{ 'is-disabled': !nodeCountState.canCreateRelation }" type="button"
                        :disabled="!nodeCountState.canCreateRelation" @click="onHeaderRelationClick">
                        <img class="mind-header-shortcut-icon" :src="connectIcon" alt="" />
                        <span class="mind-header-shortcut-label">连线</span>
                    </button>
                    <button class="mind-header-shortcut-entry"
                        :class="{ 'is-disabled': !nodeCountState.canCreateSummary }" type="button"
                        :disabled="!nodeCountState.canCreateSummary" @click="onHeaderSummaryClick">
                        <img class="mind-header-shortcut-icon" :src="sumIcon" alt="" />
                        <span class="mind-header-shortcut-label">概要</span>
                    </button>
                </div>
            </div>
            <div class="mind-header-panel-actions">
                <button class="mind-header-share-button" type="button" aria-label="分享" @click="onShareClick">
                    分享
                </button>
                <div class="mind-header-panel-entry">
                    <button class="mind-header-panel-button" :class="{ 'is-active': showSearchPanel }" type="button"
                        aria-label="打开搜索面板" @click="toggleSearchPanel">
                        <img class="mind-header-panel-icon" :src="searchIcon" alt="" />
                    </button>
                    <span class="mind-header-panel-label">搜索</span>
                </div>
                <div class="mind-header-panel-entry">
                    <button class="mind-header-panel-button" :class="{ 'is-active': showFormatPanel }" type="button"
                        aria-label="打开格式面板" @click="toggleFormatPanel">
                        <img class="mind-header-panel-icon" :src="settingsIcon" alt="" />
                    </button>
                    <span class="mind-header-panel-label">格式</span>
                </div>
            </div>
        </MindHeader>
        <MindMain ref="mindMainRef" class="mind-main-container" :doc="doc" :filePath="filePath" :docId="docId"
            :windowKey="windowKey" :show-search-panel="showSearchPanel" :show-format-panel="showFormatPanel"
            @filePathChange="changeFilePath"
            @saveStateChange="updateSaveState" @nodeCountChange="updateNodeCountState"
            @toggleSearchPanel="toggleSearchPanel" @toggleFormatPanel="toggleFormatPanel"
            @scaleChange="onScaleChange">
        </MindMain>
        <MindFooter class="mind-footer-container" :total-nodes="nodeCountState.totalNodes"
            :selected-nodes="nodeCountState.selectedNodes" :boards="mindBoards" :active-board-id="activeBoardId"
            :has-local-file-binding="!!filePath" :scale="currentScale"
            @switch-board="onSwitchBoard" @rename-board="onRenameBoard" @zoom-to="onZoomTo"></MindFooter>
        <UserProfileDialog ref="userProfileDialogRef" />
        <DialogAnimation ref="loginDialogRef" title="登录" bgtype="white" :showCancel="false" :showComfirm="false">
            <LoginComponent :redirect-on-success="false" @loginSuccess="handleLoginSuccess" />
        </DialogAnimation>
        <RemoteBindingDialog v-model="remoteBindingDialogVisible" :binding="currentRemoteBinding"
            :invalid-binding="invalidRemoteBinding" :default-file-name="remoteBindingDefaultFileName"
            :preferred-project-id="preferredBindingProjectId" @bind="handleBindRemoteFile"
            @save-to-directory="handleSaveToDirectoryAndBind" @unbind="handleUnbindRemoteFile" />
    </div>
</template>

<script lang="ts" setup>
import MindHeader from '@/mind/vue_views/headers/index.vue'
import MindMain from '@/mind/vue_views/main/index.vue'
import MindFooter from '@/mind/vue_views/footer.vue/index.vue'
import SaveActionsMenu from '@/mind/vue_views/components/SaveActionsMenu.vue'
import RemoteBindingDialog from '@/mind/vue_views/components/RemoteBindingDialog.vue'
import UserProfileDialog from '@/components/layout/dialogs/UserProfileDialog.vue'
import AnimatedLogoutIcon from "@/assets/svg/header/AnimatedLogoutIcon.vue"
import DialogAnimation from '@/components/common/general/dialog.vue'
import LoginComponent from '@/views/electron_views/login.vue'
import settingsIcon from '@/mind/core/action_icon/settings.svg'
import homeIcon from '@/mind/core/action_icon/home.svg'
import searchIcon from '@/mind/core/action_icon/search.svg'
import nextNodeIcon from '@/mind/core/action_icon/next_node.svg'
import childNodeIcon from '@/mind/core/action_icon/child_node.svg'
import connectIcon from '@/mind/core/action_icon/connect.svg'
import sumIcon from '@/mind/core/action_icon/sum.svg'
import { DEBUG_NEW_MIND_SEED } from '@/mind/vue_views/main/constants'
import { ensureMultiMindDoc, getActiveMind, getActiveMindId, listMindBoards } from '@/mind/vue_views/main/actions/useDocUtils'
import { getNodePlainText } from '@/mind/core/nodeContent'
import { ApiCheckProjectFileExists } from '@/api/project/index'
import { ensureAmindFileName, getRemoteBinding, type MindRemoteBinding } from '@/mind/vue_views/remoteBinding'
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from '@/store'
import { ApiCheckPermission, ClearServerCookie } from '@/api/layout/cookies'
import asyncTest from '@/db'
import GlobalStatus from '@/global'

const route = useRoute();
const store: any = useStore()

type MindMainExpose = {
    saveDocument: () => Promise<boolean>;
    saveDocumentAs: () => Promise<boolean>;
    exportXmind: () => Promise<boolean>;
    switchMindBoard: (boardId: string) => Promise<boolean>;
    renameMindBoard: (boardId: string, title: string) => Promise<boolean>;
    updateRemoteBindingState: (binding: MindRemoteBinding | null) => Promise<boolean>;
    saveToRemoteBindingTarget: (binding: MindRemoteBinding) => Promise<boolean>;
    refreshSaveStatePresentation: () => void;
    triggerHeaderBranchAction: () => boolean;
    triggerHeaderChildBranchAction: () => boolean;
    triggerHeaderRelationAction: () => boolean;
    triggerHeaderSummaryAction: () => boolean;
    zoomTo: (scale: number) => void;
};

const docId = ref<string>('');
const filePath = ref<string | null>(null);
const doc = ref<any>(null);
const windowKey = ref<any>(null);
const mindMainRef = ref<MindMainExpose | null>(null);
const recentPaths = ref<string[]>([]);
const showSearchPanel = ref(false);
const showFormatPanel = ref(false);
const saveState = ref({
    isDirty: false,
    isSaving: false,
    displayName: '思维导图',
});
const isLoggedIn = ref(checkLoginStatus());
const userImage = ref("https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/99.png");
const userProfileDialogRef = ref<InstanceType<typeof UserProfileDialog> | null>(null);
const loginDialogRef = ref<any>(null);
const remoteBindingDialogVisible = ref(false);
const invalidRemoteBinding = ref<MindRemoteBinding | null>(null);
let removeAuthLogoutListener: (() => void) | null = null;
let removeAuthLoginListener: (() => void) | null = null;
const nodeCountState = ref({
    totalNodes: 0,
    selectedNodes: 0,
    canCreateRelation: false,
    canCreateSummary: false,
});
const hasSelectedNodes = computed(() => nodeCountState.value.selectedNodes > 0);
const isMac = computed(() => window.electronAPI?.platform === 'darwin');
const mindBoards = computed(() => listMindBoards(doc.value));
const activeBoardId = computed(() => getActiveMindId(doc.value));
const currentScale = ref(1);

function onScaleChange(scale: number) {
    currentScale.value = scale;
}

function onZoomTo(scale: number) {
    mindMainRef.value?.zoomTo(scale);
}
const currentRemoteBinding = computed(() => getRemoteBinding(doc.value));
const preferredBindingProjectId = computed(() =>
    `${currentRemoteBinding.value?.projectId ?? invalidRemoteBinding.value?.projectId ?? ""}`.trim()
);
function getLocalFileBaseName(filePathValue: string | null | undefined) {
    if (!filePathValue) return '';
    const fileName = String(filePathValue).split(/[\\/]/).filter(Boolean).pop() ?? '';
    return fileName.replace(/\.[^.]+$/u, '').trim();
}

function getCurrentMainRootTitle() {
    const activeMind = getActiveMind(doc.value);
    const rootId = typeof activeMind?.roots?.[0]?.rootId === 'string' ? activeMind.roots[0].rootId : null;
    const rootNode = rootId && activeMind?.nodes ? activeMind.nodes[rootId] : null;
    const title = getNodePlainText(rootNode).trim();
    return title || `${doc.value?.manifest?.title ?? saveState.value.displayName ?? '思维导图'}`.trim() || '思维导图';
}

const remoteBindingDefaultFileName = computed(() => {
    const localFileBaseName = getLocalFileBaseName(filePath.value);
    return ensureAmindFileName(localFileBaseName || getCurrentMainRootTitle() || '思维导图');
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
    ensureMultiMindDoc(res.doc);
    doc.value = res.doc;
    if (isLoggedIn.value) {
        await getUserImage();
    }
    if (window.electronAPI?.on) {
        removeAuthLogoutListener = window.electronAPI.on('auth:logout', (_event: any, payload: { sourceWindow?: string } = {}) => {
            if (payload?.sourceWindow === windowKey.value) return;
            applyLoggedOutState();
        });
        removeAuthLoginListener = window.electronAPI.on('auth:login', (_event: any, payload: { sourceWindow?: string } = {}) => {
            if (payload?.sourceWindow === windowKey.value) return;
            updateLoginStatus();
        });
    }
    await loadRecentPaths();
});

onBeforeUnmount(() => {
    removeAuthLogoutListener?.();
    removeAuthLogoutListener = null;
    removeAuthLoginListener?.();
    removeAuthLoginListener = null;
});

function changeFilePath(value: any) {
    filePath.value = value
}

function updateSaveState(value: { isDirty: boolean; isSaving: boolean; displayName: string }) {
    saveState.value = value;
}

function updateNodeCountState(value: { totalNodes: number; selectedNodes: number; canCreateSummary?: boolean; canCreateRelation?: boolean }) {
    nodeCountState.value = value;
}

function onHeaderBranchClick() {
    mindMainRef.value?.triggerHeaderBranchAction();
}

function onHeaderChildBranchClick() {
    mindMainRef.value?.triggerHeaderChildBranchAction();
}

function onHeaderRelationClick() {
    mindMainRef.value?.triggerHeaderRelationAction();
}

function onHeaderSummaryClick() {
    mindMainRef.value?.triggerHeaderSummaryAction();
}

function toggleFormatPanel() {
    showFormatPanel.value = !showFormatPanel.value;
}

function toggleSearchPanel() {
    showSearchPanel.value = !showSearchPanel.value;
}

async function showMainWindow() {
    await window.electronAPI?.wm?.open({ key: 'main' });
    await window.electronAPI?.wm?.focus('main');
}

function onSaveClick() {
    void mindMainRef.value?.saveDocument();
}

function onSaveAsClick() {
    void mindMainRef.value?.saveDocumentAs();
}

function onExportXmindClick() {
    void mindMainRef.value?.exportXmind();
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

function checkLoginStatus() {
    const currentCookie = asyncTest.cookies.getCookie(GlobalStatus.cookieTag);
    return currentCookie !== false;
}

async function applyLoggedOutStateAndBroadcast() {
    await ClearServerCookie();
    applyLoggedOutState();
    if (window.electronAPI?.wm?.broadcast) {
        await window.electronAPI.wm.broadcast('auth:logout', { sourceWindow: windowKey.value || 'mind' });
    }
}

async function ensureShareLoginReady() {
    if (!checkLoginStatus()) {
        await applyLoggedOutStateAndBroadcast();
        loginDialogRef.value?.open();
        return false;
    }

    const response: any = await ApiCheckPermission({});
    if (response?.result === 0) {
        await applyLoggedOutStateAndBroadcast();
        loginDialogRef.value?.open();
        return false;
    }

    return true;
}

async function getUserImage() {
    const res = await store.dispatch("getUser");
    if (res && res.id) {
        userImage.value = `https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/${res.userId + (0 % 100)}.png`;
    }
}

function handleAvatarClick() {
    if (checkLoginStatus()) {
        userProfileDialogRef.value?.open();
    } else {
        loginDialogRef.value?.open();
    }
}

function applyLoggedOutState() {
    isLoggedIn.value = false;
}

function updateLoginStatus() {
    isLoggedIn.value = checkLoginStatus();
    if (isLoggedIn.value) {
        void getUserImage();
    }
}

async function logout() {
    await ClearServerCookie();
    window.$toast({ title: '退出登录' });
    applyLoggedOutState();
    if (window.electronAPI?.wm?.broadcast) {
        await window.electronAPI.wm.broadcast('auth:logout', { sourceWindow: windowKey.value || 'mind' });
    }
}

async function validateCurrentRemoteBinding() {
    const binding = currentRemoteBinding.value;
    if (!binding) {
        invalidRemoteBinding.value = null;
        return true;
    }
    const response: any = await ApiCheckProjectFileExists({
        project: binding.projectId,
        folder: binding.folder,
        name: binding.fileName,
    });
    if (response?.result === 0) {
        invalidRemoteBinding.value = binding;
        await mindMainRef.value?.updateRemoteBindingState(null);
        mindMainRef.value?.refreshSaveStatePresentation();
        window.$toast({
            title: response?.data || response?.msg || '原绑定文件当前无法访问，已自动解除绑定，请重新选择目标',
            type: 'warning'
        });
        return true;
    }
    if (response?.data?.exists) {
        invalidRemoteBinding.value = null;
        return true;
    }
    invalidRemoteBinding.value = binding;
    await mindMainRef.value?.updateRemoteBindingState(null);
    mindMainRef.value?.refreshSaveStatePresentation();
    window.$toast({ title: '原绑定文件已不存在，已自动解除绑定', type: 'warning' });
    return true;
}

async function onShareClick() {
    if (!(await ensureShareLoginReady())) return;
    const ready = await validateCurrentRemoteBinding();
    if (!ready) return;
    remoteBindingDialogVisible.value = true;
}

function handleLoginSuccess() {
    loginDialogRef.value?.close();
    isLoggedIn.value = true;
    void getUserImage();
    if (window.electronAPI?.wm?.broadcast) {
        void window.electronAPI.wm.broadcast('auth:login', { sourceWindow: windowKey.value || 'mind' });
    }
}

async function handleBindRemoteFile(binding: MindRemoteBinding) {
    invalidRemoteBinding.value = null;
    const updated = await mindMainRef.value?.updateRemoteBindingState(binding);
    if (!updated) return;
    window.$toast({ title: `已绑定到 ${binding.filePath}`, type: 'success' });
}

async function handleSaveToDirectoryAndBind(payload: {
    binding: MindRemoteBinding;
    overwriteExisting: boolean;
    done: (success: boolean) => void | Promise<void>;
}) {
    invalidRemoteBinding.value = null;
    if (currentRemoteBinding.value) {
        const unbound = await mindMainRef.value?.updateRemoteBindingState(null);
        if (!unbound) {
            await payload.done(false);
            return;
        }
    }
    const saved = await mindMainRef.value?.saveToRemoteBindingTarget(payload.binding);
    if (!saved) {
        await payload.done(false);
        return;
    }
    const title = payload.overwriteExisting
        ? `已覆盖并绑定 ${payload.binding.filePath}`
        : `已保存并绑定 ${payload.binding.filePath}`;
    window.$toast({ title, type: 'success' });
    mindMainRef.value?.refreshSaveStatePresentation();
    await payload.done(true);
}

async function handleUnbindRemoteFile() {
    invalidRemoteBinding.value = null;
    const updated = await mindMainRef.value?.updateRemoteBindingState(null);
    if (!updated) return;
    window.$toast({ title: '已取消远程绑定', type: 'success' });
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
        await window.electronAPI.amind.newAndOpenWindow(
            DEBUG_NEW_MIND_SEED ? { seedConfig: DEBUG_NEW_MIND_SEED } : {}
        );
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

function onSwitchBoard(boardId: string) {
    void mindMainRef.value?.switchMindBoard(boardId);
}

function onRenameBoard(payload: { boardId: string; title: string }) {
    void mindMainRef.value?.renameMindBoard(payload.boardId, payload.title);
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
.mind-container :deep(.mind-header-home-button),
.mind-container :deep(.mind-header-panel-actions),
.mind-container :deep(.mind-header-panel-entry),
.mind-container :deep(.mind-header-panel-button),
.mind-container :deep(.mind-header-user-section),
.mind-container :deep(.mind-header-avatar-container),
.mind-container :deep(.mind-header-user-action-btn),
.mind-container :deep(.mind-header-action-item),
.mind-container :deep(.mind-header-shortcut-entry) {
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

    .mind-header-user-section {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-right: 10px;
        padding: 4px 6px 4px 4px;
        background: rgba(0, 0, 0, 0.03);
        border-radius: 10px;
        border: 1px solid rgba(0, 0, 0, 0.06);
    }

    .mind-header-action-item {
        position: relative;
        flex: 0 0 auto;
    }

    .mind-header-avatar-container {
        position: relative;
        cursor: pointer;
    }

    .mind-header-user-avatar {
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: 2px solid rgba(0, 0, 0, 0.08);
        will-change: transform;
    }

    .mind-header-avatar-container:hover .mind-header-user-avatar {
        transform: scale(1.08) rotate(5deg);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    .mind-header-online-indicator {
        position: absolute;
        bottom: 1px;
        right: 1px;
        width: 10px;
        height: 10px;
        background: #10b981;
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.04);
    }

    .mind-header-user-action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: #64748b;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
    }

    .mind-header-user-action-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 8px;
        background: rgba(16, 185, 129, 0.1);
        opacity: 0;
        transition: opacity 0.25s ease;
    }

    .mind-header-user-action-btn:hover {
        color: #059669;
    }

    .mind-header-user-action-btn:hover::before {
        opacity: 1;
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

    .mind-header-home-button {
        flex: 0 0 auto;
        width: 30px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: none;
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
        transition: background-color 0.16s ease;
    }

    .mind-header-home-button:hover {
        background: rgba(148, 163, 184, 0.18);
    }

    .mind-header-home-icon {
        width: 18px;
        height: 18px;
        display: block;
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

    .mind-header-panel-actions {
        flex: 0 0 auto;
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .mind-header-shortcuts {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0 14px;
        transform: translateX(-28px);
    }

    .mind-header-shortcut-strip {
        display: inline-flex;
        align-items: center;
        gap: 1px;
        padding: 2px 0;
    }

    .mind-header-shortcut-entry {
        width: 52px;
        min-width: 52px;
        padding: 5px 4px 4px;
        border: none;
        border-radius: 12px;
        background: transparent;
        color: #253047;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        cursor: pointer;
        transition:
            transform 0.16s ease,
            background-color 0.16s ease,
            color 0.16s ease,
            opacity 0.16s ease;
    }

    .mind-header-shortcut-entry:hover:not(:disabled) {
        transform: translateY(-1px);
        background: rgba(148, 163, 184, 0.16);
    }

    .mind-header-shortcut-entry:active:not(:disabled) {
        transform: translateY(0);
    }

    .mind-header-shortcut-entry:disabled,
    .mind-header-shortcut-entry.is-disabled {
        cursor: default;
        color: #9aa4b2;
        opacity: 0.58;
    }

    .mind-header-shortcut-icon {
        width: 17px;
        height: 17px;
        display: block;
        opacity: 0.9;
    }

    .mind-header-shortcut-label {
        font-size: 11px;
        line-height: 1;
        font-weight: 600;
        letter-spacing: 0.01em;
        user-select: none;
        pointer-events: none;
    }

    .mind-header-shortcut-divider {
        width: 1px;
        align-self: stretch;
        margin: 3px 2px;
        background: linear-gradient(180deg, rgba(148, 163, 184, 0), rgba(148, 163, 184, 0.55), rgba(148, 163, 184, 0));
    }

    .mind-header-share-button {
        height: 34px;
        padding: 0 16px;
        border: none;
        border-radius: 11px;
        background: #101317;
        color: #f8fafc;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.02em;
        box-shadow:
            0 10px 24px rgba(15, 23, 42, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        cursor: pointer;
        transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            background-color 0.18s ease;
    }

    .mind-header-share-button:hover {
        background: #171b21;
        transform: translateY(-1px);
        box-shadow:
            0 14px 30px rgba(15, 23, 42, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.16);
    }

    .mind-header-share-button:active {
        transform: translateY(0);
    }

    .mind-header-panel-entry {
        flex: 0 0 auto;
        width: 44px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
    }

    .mind-header-panel-button {
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

    .mind-header-panel-button:hover,
    .mind-header-panel-button.is-active {
        background: rgba(156, 163, 175, 0.22);
        transform: translateY(-1px);
    }

    .mind-header-panel-button.is-active {
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
    }

    .mind-header-panel-icon {
        width: 16px;
        height: 16px;
        display: block;
        opacity: 0.82;
    }

    .mind-header-panel-label {
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
