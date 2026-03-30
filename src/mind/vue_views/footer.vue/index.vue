<template>
    <div class="footer-container">
        <div class="footer-board-tabs">
            <div
                v-for="board in boards"
                :key="board.id"
                class="footer-board-tab-shell"
            >
                <input
                    v-if="editingBoardId === board.id"
                    :ref="setRenameInputRef"
                    v-model="editingTitle"
                    class="footer-board-input"
                    type="text"
                    spellcheck="false"
                    @click.stop
                    @keydown.enter.prevent="commitRename(board)"
                    @keydown.esc.prevent="cancelRename"
                    @blur="commitRename(board)"
                />
                <button
                    v-else
                    class="footer-board-tab"
                    :class="{ 'is-active': activeBoardId === board.id }"
                    type="button"
                    :title="board.title"
                    @click="emit('switchBoard', board.id)"
                    @dblclick.stop.prevent="startRename(board)"
                >
                    <span class="footer-board-tab-label">{{ board.title }}</span>
                </button>
            </div>
        </div>
        <div v-if="!hasLocalFileBinding" class="footer-warning-text">
            当前文件未保存到本地，或仅保存在远程文件中。
        </div>
        <div class="footer-node-count">
            {{ footerCountText }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

const props = withDefaults(defineProps<{
    totalNodes?: number;
    selectedNodes?: number;
    boards?: Array<{ id: string; title: string }>;
    activeBoardId?: string | null;
    hasLocalFileBinding?: boolean;
}>(), {
    totalNodes: 0,
    selectedNodes: 0,
    boards: () => [],
    activeBoardId: null,
    hasLocalFileBinding: false,
});

const emit = defineEmits<{
    (event: 'switchBoard', boardId: string): void;
    (event: 'renameBoard', payload: { boardId: string; title: string }): void;
}>();

const footerCountText = computed(() => {
    if (props.selectedNodes > 0) return `主题 ${props.selectedNodes}/${props.totalNodes}`;
    return `主题 ${props.totalNodes}`;
});

const editingBoardId = ref<string | null>(null);
const editingTitle = ref('');
const renameInputRef = ref<HTMLInputElement | null>(null);

function setRenameInputRef(el: Element | null) {
    renameInputRef.value = el instanceof HTMLInputElement ? el : null;
}

function startRename(board: { id: string; title: string }) {
    editingBoardId.value = board.id;
    editingTitle.value = board.title;
    void nextTick(() => {
        renameInputRef.value?.focus();
        renameInputRef.value?.select();
    });
}

function cancelRename() {
    editingBoardId.value = null;
    editingTitle.value = '';
}

function commitRename(board: { id: string; title: string }) {
    if (editingBoardId.value !== board.id) return;
    const title = editingTitle.value.trim();
    if (title && title !== board.title) {
        emit('renameBoard', {
            boardId: board.id,
            title,
        });
    }
    cancelRename();
}
</script>

<style lang="scss" scoped>
.footer-container {
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 14px;
}

.footer-board-tabs {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
}

.footer-warning-text {
    flex: 0 1 auto;
    max-width: 320px;
    font-size: 12px;
    line-height: 1;
    color: #9a6700;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
}

.footer-board-tabs::-webkit-scrollbar {
    display: none;
}

.footer-board-tab-shell {
    flex: 0 0 auto;
    width: 98px;
}

.footer-board-tab,
.footer-board-input {
    width: 100%;
    height: 24px;
    padding: 0 9px;
    box-sizing: border-box;
    border-radius: 8px;
    font-size: 12px;
    line-height: 24px;
}

.footer-board-tab {
    border: 1px solid rgba(148, 163, 184, 0.28);
    background: rgba(255, 255, 255, 0.78);
    color: rgba(23, 32, 51, 0.7);
    cursor: pointer;
    transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.footer-board-tab:hover {
    background: rgba(255, 255, 255, 0.96);
    border-color: rgba(100, 116, 139, 0.34);
    color: rgba(23, 32, 51, 0.92);
}

.footer-board-tab.is-active {
    background: #111111;
    border-color: #111111;
    color: #ffffff;
}

.footer-board-tab-label {
    display: block;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.footer-board-input {
    border: 1px solid rgba(17, 17, 17, 0.22);
    background: #ffffff;
    color: #111111;
    outline: none;
    box-shadow: 0 0 0 2px rgba(17, 17, 17, 0.06);
}

.footer-board-input:focus {
    border-color: rgba(17, 17, 17, 0.52);
    box-shadow: 0 0 0 2px rgba(17, 17, 17, 0.08);
}

.footer-node-count {
    font-size: 12px;
    line-height: 1;
    color: rgba(23, 32, 51, 0.72);
    letter-spacing: 0.01em;
    user-select: none;
    flex: 0 0 auto;
}
</style>
