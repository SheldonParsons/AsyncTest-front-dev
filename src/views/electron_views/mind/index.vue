<template>
    <div class="mind-dashboard-page">
        <section class="mind-hero">
            <div class="mind-hero-main">
                <div class="mind-hero-logo-shell" aria-hidden="true">
                    <img class="mind-hero-logo" :src="mindLogo" alt="" />
                </div>
                <div class="mind-hero-copy">
                    <p class="mind-hero-eyebrow">AsyncTest Mind</p>
                    <h1 class="mind-hero-title">最近打开</h1>
                    <p class="mind-hero-description">
                        在这里继续你最近编辑过的思维导图，或者快速新建一张新的图。
                    </p>
                </div>
            </div>

            <div class="mind-hero-actions">
                <button class="mind-hero-button mind-hero-button--primary" type="button" @click="openMindNewInstance">
                    新建思维导图
                </button>
                <button class="mind-hero-button" type="button" @click="openLocalMindFile">
                    打开本地文件
                </button>
            </div>
        </section>

        <section class="mind-recents-shell">
            <section v-if="recentMindEntries.length" class="mind-recents-grid">
                <article
                    v-for="entry in recentMindEntries"
                    :key="entry.filePath"
                    class="mind-recent-card"
                    @click="openRecentMind(entry.filePath)"
                    @contextmenu="openRecentContextMenu($event, entry)"
                >
                    <div class="mind-recent-preview">
                        <img
                            v-if="entry.previewUrl"
                            class="mind-recent-preview-image"
                            :src="entry.previewUrl"
                            :alt="entry.title || getRecentLabel(entry.filePath)"
                            @error="handlePreviewError(entry.filePath)"
                        />
                        <div v-else class="mind-recent-preview-placeholder">
                            <div class="mind-recent-placeholder-header">
                                <img class="mind-recent-placeholder-logo" :src="mindLogo" alt="" />
                                <span class="mind-recent-placeholder-label">Mind</span>
                            </div>
                            <span class="mind-recent-placeholder-name">{{ getRecentLabel(entry.filePath) }}</span>
                        </div>
                    </div>

                    <div class="mind-recent-meta">
                        <h3 class="mind-recent-name">{{ getRecentLabel(entry.filePath) }}</h3>
                        <p class="mind-recent-time">{{ formatUpdatedAt(entry.updatedAt) }}</p>
                    </div>
                </article>
            </section>

            <section v-else class="mind-recents-empty">
                <p class="mind-recents-empty-title">还没有最近打开的思维导图</p>
                <p class="mind-recents-empty-description">保存一次文件后，这里会显示自动生成的预览图片。</p>
            </section>
        </section>
    </div>
</template>

<script lang="ts" setup>
import mindLogo from '@/mind/core/action_icon/mind.svg';
import { DEBUG_NEW_MIND_SEED } from '@/mind/vue_views/main/constants';
import { onBeforeUnmount, onMounted, ref } from 'vue';

type RecentMindEntry = {
    filePath: string;
    title?: string | null;
    updatedAt?: string | null;
    previewUrl?: string | null;
};

const recentMindEntries = ref<RecentMindEntry[]>([]);
let removeRecentUpdateListener: (() => void) | null = null;

onMounted(() => {
    void loadRecentMindEntries();
    removeRecentUpdateListener = window.electronAPI.on('amind:recents-updated', () => {
        void loadRecentMindEntries();
    });
    window.addEventListener('focus', handleWindowFocus);
});

onBeforeUnmount(() => {
    removeRecentUpdateListener?.();
    removeRecentUpdateListener = null;
    window.removeEventListener('focus', handleWindowFocus);
});

function handleWindowFocus() {
    void loadRecentMindEntries();
}

async function loadRecentMindEntries() {
    try {
        const entries = await window.electronAPI.amind.recentEntries();
        console.info('[mind-preview-debug] loadRecentMindEntries', {
            count: Array.isArray(entries) ? entries.length : 0,
            entries: Array.isArray(entries)
                ? entries.map((entry) => ({
                    filePath: entry?.filePath ?? null,
                    title: entry?.title ?? null,
                    updatedAt: entry?.updatedAt ?? null,
                    hasPreviewUrl: !!entry?.previewUrl,
                    previewUrlLength: typeof entry?.previewUrl === 'string' ? entry.previewUrl.length : 0,
                }))
                : [],
        });
        recentMindEntries.value = Array.isArray(entries) ? entries : [];
    } catch {
        recentMindEntries.value = [];
    }
}

async function openMindNewInstance() {
    try {
        await window.electronAPI.amind.newAndOpenWindow(
            DEBUG_NEW_MIND_SEED ? { seedConfig: DEBUG_NEW_MIND_SEED } : {}
        );
    } catch {
        window.$toast({ title: '新建思维导图失败', type: 'error' });
    }
}

async function openLocalMindFile() {
    try {
        await window.electronAPI.amind.openDialog();
        await loadRecentMindEntries();
    } catch {
        window.$toast({ title: '打开本地文件失败', type: 'error' });
    }
}

async function openRecentMind(filePath: string) {
    try {
        await window.electronAPI.amind.openFileInWindow({ filePath });
    } catch {
        window.$toast({ title: '找不到该最近文件', type: 'error' });
        await window.electronAPI.amind.removeRecent({ filePath });
        await loadRecentMindEntries();
    }
}

async function removeRecentEntry(filePath: string, options: { notifyMissing?: boolean } = {}) {
    await window.electronAPI.amind.removeRecent({ filePath });
    await loadRecentMindEntries();
    if (options.notifyMissing) {
        window.$toast({ title: '文件不存在，已移除最近打开记录', type: 'info' });
    }
}

async function ensureRecentFileExists(filePath: string) {
    const result = await window.electronAPI.amind.fileExists({ filePath });
    if (result?.ok && result?.exists) return true;
    await removeRecentEntry(filePath, { notifyMissing: true });
    return false;
}

async function revealRecentMindInFolder(filePath: string) {
    const exists = await ensureRecentFileExists(filePath);
    if (!exists) return;
    const result = await window.electronAPI.amind.openFolder({ filePath });
    if (!result?.ok) {
        window.$toast({ title: result?.error || '打开文件目录失败', type: 'error' });
        if (result?.error === '当前文件不存在' || result?.error === '当前文件目录不存在') {
            await removeRecentEntry(filePath, { notifyMissing: true });
        }
    }
}

async function removeRecentMind(filePath: string) {
    const exists = await window.electronAPI.amind.fileExists({ filePath });
    if (!exists?.ok || !exists?.exists) {
        await removeRecentEntry(filePath, { notifyMissing: true });
        return;
    }
    await removeRecentEntry(filePath);
    window.$toast({ title: '已移除最近打开记录', type: 'success' });
}

async function openRecentContextMenu(event: MouseEvent, entry: RecentMindEntry) {
    event.preventDefault();
    event.stopPropagation();
    const action = await window.electronAPI.wm.popupMenu({
        x: event.clientX,
        y: event.clientY,
        items: [
            { id: 'open-folder', label: '打开文件目录' },
            { id: 'remove-recent', label: '移除' },
        ],
    });
    if (action === 'open-folder') {
        await revealRecentMindInFolder(entry.filePath);
        return;
    }
    if (action === 'remove-recent') {
        await removeRecentMind(entry.filePath);
    }
}

function handlePreviewError(filePath: string) {
    const target = recentMindEntries.value.find((entry) => entry.filePath === filePath);
    if (target) target.previewUrl = null;
}

function getRecentLabel(filePath: string) {
    const parts = String(filePath ?? '').split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] || filePath;
}

function formatUpdatedAt(value?: string | null) {
    if (!value) return '尚无保存时间';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '尚无保存时间';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
</script>

<style lang="scss" scoped>
.mind-dashboard-page {
    height: 100vh;
    min-height: 0;
    box-sizing: border-box;
    padding: 24px;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 18px;
    overflow: hidden;
}

.mind-recents-shell {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 4px 4px 8px 0;
}

.mind-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 24px;
    border-radius: 24px;
    background:
        radial-gradient(circle at top left, rgba(16, 185, 129, 0.08), transparent 30%),
        linear-gradient(180deg, #ffffff, #f8fafc);
    border: 1px solid #e5e7eb;
    box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
}

.mind-hero-main {
    display: flex;
    align-items: center;
    gap: 16px;
}

.mind-hero-logo-shell {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(240, 253, 244, 0.96)),
        rgba(16, 185, 129, 0.04);
    border: 1px solid rgba(16, 185, 129, 0.18);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.9),
        0 8px 22px rgba(15, 23, 42, 0.06);
}

.mind-hero-logo {
    width: 34px;
    height: 34px;
    display: block;
}

.mind-hero-copy {
    max-width: 720px;
}

.mind-hero-eyebrow {
    margin: 0 0 6px 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #34d399;
}

.mind-hero-title {
    margin: 0;
    font-size: 28px;
    line-height: 1.1;
    font-weight: 800;
    color: #111827;
}

.mind-hero-description {
    margin: 10px 0 0 0;
    font-size: 14px;
    line-height: 1.7;
    color: #6b7280;
}

.mind-hero-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.mind-hero-button {
    border: 1px solid #d1d5db;
    border-radius: 12px;
    padding: 11px 16px;
    background: #ffffff;
    color: #1f2937;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.mind-hero-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    border-color: rgba(16, 185, 129, 0.3);
}

.mind-hero-button--primary {
    background: linear-gradient(135deg, #ffffff, #f9fafb);
    color: #ffffff;
    border-color: rgba(16, 185, 129, 0.28);
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
    color: #065f46;
}

.mind-recents-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px;
    padding-top: 4px;
}

.mind-recent-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    border-radius: 18px;
    background: linear-gradient(180deg, #ffffff, #fbfbfc);
    border: 1px solid #e5e7eb;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}

.mind-recent-card:hover {
    transform: translateY(-2px);
    border-color: rgba(16, 185, 129, 0.34);
    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.1);
}

.mind-recent-preview {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: 14px;
    background: linear-gradient(135deg, #ffffff, #f3f4f6);
    border: 1px solid #e5e7eb;
}

.mind-recent-preview-image {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
}

.mind-recent-preview-placeholder {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 6px;
    padding: 10px;
    background:
        radial-gradient(circle at top left, rgba(16, 185, 129, 0.08), transparent 42%),
        linear-gradient(160deg, #ffffff, #f3f4f6);
}

.mind-recent-placeholder-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
}

.mind-recent-placeholder-logo {
    width: 18px;
    height: 18px;
    display: block;
}

.mind-recent-placeholder-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #34d399;
}

.mind-recent-placeholder-name {
    display: block;
    width: 100%;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.35;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    word-break: break-all;
    overflow-wrap: break-word;
}

.mind-recent-meta {
    min-width: 0;
}

.mind-recent-name {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mind-recent-time {
    margin: 6px 0 0 0;
    font-size: 12px;
    color: #6b7280;
}

.mind-recents-empty {
    padding: 28px;
    border-radius: 22px;
    background: linear-gradient(180deg, #ffffff, #fbfbfc);
    border: 1px solid #e5e7eb;
    text-align: center;
    color: #6b7280;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.mind-recents-empty-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #111827;
}

.mind-recents-empty-description {
    margin: 8px 0 0 0;
    font-size: 13px;
}
</style>
