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
        <div class="footer-right">
            <div class="footer-node-count">
                {{ footerCountText }}
            </div>
            <div class="footer-zoom-controls">
                <button
                    class="footer-zoom-btn"
                    type="button"
                    title="缩小"
                    :disabled="scalePercent <= MIN_PERCENT"
                    @click="stepZoom(-STEP)"
                >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3.5 8h9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                </button>
                <div class="footer-zoom-value-wrapper" @click.stop="togglePopover">
                    <span class="footer-zoom-value">{{ scalePercent }}%</span>
                    <div v-if="showPopover" ref="popoverRef" class="footer-zoom-popover">
                        <button
                            v-for="opt in popoverOptions"
                            :key="opt"
                            class="footer-zoom-option"
                            :class="{ 'is-current': opt === scalePercent }"
                            type="button"
                            @click.stop="selectZoom(opt)"
                        >
                            {{ opt }}%
                            <span v-if="opt === scalePercent" class="footer-zoom-current-tag">当前</span>
                        </button>
                    </div>
                </div>
                <button
                    class="footer-zoom-btn"
                    type="button"
                    title="放大"
                    :disabled="scalePercent >= MAX_PERCENT"
                    @click="stepZoom(STEP)"
                >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3.5 8h9M8 3.5v9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

const MIN_PERCENT = 10;
const MAX_PERCENT = 500;
const STEP = 5;
const PRESETS = [10, 20, 50, 80, 100, 120, 150, 200, 300, 400, 500];

const props = withDefaults(defineProps<{
    totalNodes?: number;
    selectedNodes?: number;
    boards?: Array<{ id: string; title: string }>;
    activeBoardId?: string | null;
    hasLocalFileBinding?: boolean;
    scale?: number;
}>(), {
    totalNodes: 0,
    selectedNodes: 0,
    boards: () => [],
    activeBoardId: null,
    hasLocalFileBinding: false,
    scale: 1,
});

const emit = defineEmits<{
    (event: 'switchBoard', boardId: string): void;
    (event: 'renameBoard', payload: { boardId: string; title: string }): void;
    (event: 'zoomTo', scale: number): void;
}>();

const scalePercent = computed(() => Math.round(props.scale * 100));

const popoverOptions = computed(() => {
    const current = scalePercent.value;
    const set = new Set(PRESETS);
    set.add(current);
    return [...set].sort((a, b) => a - b);
});

const footerCountText = computed(() => {
    if (props.selectedNodes > 0) return `主题 ${props.selectedNodes}/${props.totalNodes}`;
    return `主题 ${props.totalNodes}`;
});

function stepZoom(delta: number) {
    const next = Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, scalePercent.value + delta));
    emit('zoomTo', next / 100);
}

function selectZoom(percent: number) {
    emit('zoomTo', percent / 100);
    showPopover.value = false;
}

// popover
const showPopover = ref(false);
const popoverRef = ref<HTMLElement | null>(null);

function togglePopover() {
    showPopover.value = !showPopover.value;
}

function onClickOutside(e: MouseEvent) {
    if (showPopover.value && popoverRef.value && !popoverRef.value.contains(e.target as Node)) {
        showPopover.value = false;
    }
}

onMounted(() => document.addEventListener('click', onClickOutside, true));
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside, true));

// board rename
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

.footer-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 0 0 auto;
}

.footer-node-count {
    font-size: 12px;
    line-height: 1;
    color: rgba(23, 32, 51, 0.72);
    letter-spacing: 0.01em;
    user-select: none;
    flex: 0 0 auto;
}

.footer-zoom-controls {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 0 0 auto;
}

.footer-zoom-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    border-radius: 6px;
    color: rgba(23, 32, 51, 0.65);
    cursor: pointer;
    transition: background-color 0.14s ease, color 0.14s ease;
    padding: 0;

    &:hover:not(:disabled) {
        background: rgba(0, 0, 0, 0.06);
        color: rgba(23, 32, 51, 0.92);
    }

    &:active:not(:disabled) {
        background: rgba(0, 0, 0, 0.1);
    }

    &:disabled {
        opacity: 0.3;
        cursor: default;
    }
}

.footer-zoom-value-wrapper {
    position: relative;
    cursor: pointer;
    user-select: none;
}

.footer-zoom-value {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 46px;
    height: 24px;
    padding: 0 6px;
    border-radius: 6px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: rgba(23, 32, 51, 0.72);
    transition: background-color 0.14s ease, color 0.14s ease;

    &:hover {
        background: rgba(0, 0, 0, 0.06);
        color: rgba(23, 32, 51, 0.92);
    }
}

.footer-zoom-popover {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    min-width: 110px;
    max-height: 280px;
    overflow-y: auto;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 10px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.06);
    padding: 4px;
    z-index: 100;
    scrollbar-width: thin;
}

.footer-zoom-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 30px;
    padding: 0 10px;
    border: none;
    background: transparent;
    border-radius: 6px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: rgba(23, 32, 51, 0.82);
    cursor: pointer;
    transition: background-color 0.12s ease;
    box-sizing: border-box;

    &:hover {
        background: rgba(0, 0, 0, 0.05);
    }

    &.is-current {
        font-weight: 600;
        color: #111111;
    }
}

.footer-zoom-current-tag {
    font-size: 10px;
    font-weight: 400;
    color: rgba(23, 32, 51, 0.45);
    margin-left: 6px;
}
</style>
