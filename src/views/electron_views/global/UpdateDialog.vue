<template>
    <DialogAnimation ref="dialogRef" title="软件更新" bgtype="white" :showCancel="!updateInfo.isForce && !downloading"
        :showComfirm="false" topMove="0px important" :closeOnClickModal="false"
        :closeOnPressEscape="!updateInfo.isForce && !downloading" cancel_title="暂不更新" @cancel="visible = false">
        <div class="update-dialog-content">
            <div v-if="!downloading && !downloadComplete" :key="updateInfo.version" class="update-section">
                <div class="update-icon">
                    <img src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/app_logo/LOGO_DARK.png"
                        alt="Logo" />
                </div>

                <h3 class="update-title">发现新版本 v{{ updateInfo.version }}</h3>

                <div v-if="parsedNotes" class="update-notes">
                    <div class="notes-label">更新内容 ({{ parsedDate }})：</div>
                    <div class="notes-content markdown-body" v-html="renderedMarkdown"></div>
                </div>

                <div v-if="updateInfo.isForce" class="force-update-tip">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>您需要更新后才能继续使用</span>
                </div>

                <button class="update-btn primary" @click="startDownload">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>立即更新</span>
                </button>
            </div>

            <div v-if="downloading && !downloadComplete" class="download-section">
                <div class="download-animation">
                    <div class="download-icon">
                        <svg class="rotating" xmlns="http://www.w3.org/2000/svg" width="64" height="64"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        <div class="download-inner-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        </div>
                    </div>
                </div>
                <h3 class="download-title">正在下载更新... {{ percentage }}%</h3>
                <div class="progress-wrapper">
                    <el-progress :percentage="percentage" :stroke-width="12" :color="'#10b981'" :show-text="false" />
                </div>
                <p class="download-tip">请稍候，下载完成后将自动提示安装</p>
            </div>

            <div v-if="downloadComplete" class="complete-section">
                <div class="complete-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                </div>
                <h3 class="complete-title">下载完成！</h3>
                <p class="complete-description">新版本已准备就绪，点击下方按钮退出并安装</p>
                <button class="update-btn success" @click="startInstall">
                    <span>立即重启安装</span>
                </button>
            </div>
        </div>
    </DialogAnimation>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import DialogAnimation from '@/components/common/general/dialog.vue';
import { marked } from 'marked';

const dialogRef = ref<any>(null);
const visible = ref(false);
const updateInfo = ref({ version: '', notes: '', isForce: false, publishDate: '' });
const percentage = ref(0);
const downloading = ref(false);
const downloadComplete = ref(false);

// --- 数据处理逻辑 ---

// 安全解析更新日志
const parsedNotes = computed(() => {
    const raw = updateInfo.value.notes;
    if (!raw) return '';
    if (typeof raw === 'object') return (raw as any).notes || '';
    try {
        const data = JSON.parse(raw);
        return data.notes || raw;
    } catch (e) {
        return raw;
    }
});

const renderedMarkdown = computed(() => {
    const raw = updateInfo.value.notes;
    let content = '';

    if (!raw) return '';

    // 逻辑：如果是 JSON 则取 notes 字段，否则取原始值
    if (typeof raw === 'object') {
        content = (raw as any).notes || '';
    } else {
        try {
            const data = JSON.parse(raw);
            content = data.notes || raw;
        } catch (e) {
            content = raw;
        }
    }

    // 使用 marked 将 Markdown 转为 HTML
    // 注意：这里的 sanitize 已经过时，marked 默认相对安全
    return marked.parse(content);
});

const parsedDate = computed(() => {
    return updateInfo.value.publishDate || '最新版本';
});

// --- 事件监听逻辑 ---

let removeUpdateListener: any = null;
let removeProgressListener: any = null;
let removeNotAvailableListener: any = null; // 独立变量，防止覆盖
let removeDownloadedListener: any = null;

let readyTimer: NodeJS.Timeout | null = null;

const stopPinging = () => {
    if (readyTimer) {
        clearInterval(readyTimer);
        readyTimer = null;
        console.log('--- 握手完成，停止呼叫 ---');
    }
};

onMounted(() => {
    if (window.electronAPI) {
        // 1. 发现更新
        removeUpdateListener = window.electronAPI.on('update-available', (event: any, info: any) => {
            console.log('收到更新详情:', info);
            stopPinging();

            updateInfo.value = info;
            downloading.value = false;
            downloadComplete.value = false;
            percentage.value = 0;

            visible.value = true;
            nextTick(() => {
                dialogRef.value?.open();
            });
        });

        // 2. 进度监控
        removeProgressListener = window.electronAPI.on('download-progress', (event: any, percent: any) => {
            percentage.value = percent;
        });

        // 3. 已经是最新版 (修复了原代码变量覆盖问题)
        removeNotAvailableListener = window.electronAPI.on('update-not-available', (event: any, info: string) => {
            stopPinging();
            window.$toast({ title: '已经是最新版:' + info })
        });

        // 4. 下载完成
        removeDownloadedListener = window.electronAPI.on('update-downloaded', () => {
            downloading.value = false;
            downloadComplete.value = true;
            percentage.value = 100;
        });

        // 启动握手轮询
        readyTimer = setInterval(() => {
            window.electronAPI.send('renderer-ready-for-update');
        }, 800);

        setTimeout(stopPinging, 15000);
    }
});

onUnmounted(() => {
    // 严格清理所有监听器
    removeUpdateListener?.();
    removeProgressListener?.();
    removeNotAvailableListener?.();
    removeDownloadedListener?.();
    stopPinging();
});

// --- 操作逻辑 ---

const startDownload = () => {
    downloading.value = true;
    window.electronAPI.send('start-download');
};

const startInstall = () => {
    window.electronAPI.send('install-now');
};

watch(visible, (newVal) => {
    if (!newVal) dialogRef.value?.close();
});
</script>

<style scoped lang="scss">
.update-dialog-content {
    padding: 20px;
    min-width: 500px;
    min-height: 280px;
    max-height: 600px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    overflow-y: auto;
}

// 发现新版本样式
.update-section {
    text-align: center;
    width: 100%;

    .update-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        // background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
        // border-radius: 20px;
        // box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        padding: 12px;

        img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    }

    .update-title {
        font-size: 22px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 16px 0;
    }

    .update-notes {
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 16px;
        text-align: left;

        .notes-label {
            font-size: 13px;
            font-weight: 600;
            color: #4b5563;
            margin-bottom: 8px;
        }

        .notes-content {
            font-size: 14px;
            color: #4b5563;
            white-space: pre-wrap;
            word-break: break-word;
            max-height: 200px;
            overflow-y: auto;
            padding-right: 4px;

            &:deep(.markdown-body) {
                font-size: 14px;
                line-height: 1.6;
                color: #374151;

                h1,
                h2,
                h3,
                h4 {
                    margin-top: 0px !important;
                    margin-bottom: 0px !important;
                    color: #111827;
                    font-weight: 600;
                }

                h3 {
                    font-size: 15px;
                }

                ul,
                ol {
                    padding-left: 20px;
                    margin-bottom: 8px;
                }

                li {
                    margin-bottom: 4px;
                    list-style-type: disc; // 确保显示圆点
                }

                code {
                    background-color: #f3f4f6;
                    padding: 2px 4px;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 13px;
                }

                strong {
                    font-weight: 600;
                    color: #111827;
                }
            }

            // 自定义滚动条样式
            &::-webkit-scrollbar {
                width: 6px;
            }

            &::-webkit-scrollbar-track {
                background: #e5e7eb;
                border-radius: 3px;
            }

            &::-webkit-scrollbar-thumb {
                background: #9ca3af;
                border-radius: 3px;

                &:hover {
                    background: #6b7280;
                }
            }
        }
    }

    .force-update-tip {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 12px;
        background: #f0f0f0;
        border: 1px solid black;
        border-radius: 6px;
        margin-bottom: 20px;

        svg {
            color: #272727;
            flex-shrink: 0;
        }

        span {
            font-size: 13px;
            color: #090909;
            font-weight: 500;
        }
    }
}

// 下载中样式
.download-section {
    text-align: center;
    width: 100%;

    .download-animation {
        position: relative;
        width: 120px;
        height: 120px;
        margin: 0 auto 24px;

        .download-icon {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;

            .rotating {
                position: absolute;
                color: #10b981;
                animation: rotate 2s linear infinite;
            }

            .download-inner-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 56px;
                height: 56px;
                background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

                svg {
                    color: #ffffff;
                }
            }
        }
    }

    .download-title {
        font-size: 20px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 20px 0;
    }

    .progress-wrapper {
        width: 100%;
        padding: 0 20px;
        margin-bottom: 16px;
    }

    .download-tip {
        font-size: 13px;
        color: #6b7280;
        margin: 0;
    }
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

// 下载完成样式
.complete-section {
    text-align: center;
    width: 100%;

    .complete-icon {
        width: 100px;
        height: 100px;
        margin: 0 auto 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
        border-radius: 50%;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        animation: scaleIn 0.5s ease;
        position: relative;

        &::after {
            content: '';
            position: absolute;
            inset: -3px;
            border-radius: 50%;
            border: 2px solid #10b981;
            opacity: 0.5;
        }

        svg {
            color: #ffffff;
        }
    }

    .complete-title {
        font-size: 22px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 12px 0;
    }

    .complete-description {
        font-size: 14px;
        color: #6b7280;
        margin: 0 0 24px 0;
        line-height: 1.6;
    }
}

@keyframes scaleIn {
    from {
        transform: scale(0);
        opacity: 0;
    }

    to {
        transform: scale(1);
        opacity: 1;
    }
}

// 按钮样式
.update-btn {
    outline: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 32px;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: hidden;

    &:focus {
        outline: none; // 针对某些浏览器的强制覆盖
    }

    // 如果你想保留专业的键盘焦点，可以使用这种方式（仅键盘操作可见）
    &:focus-visible {
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.4);
    }

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    svg {
        flex-shrink: 0;
        position: relative;
        z-index: 1;
    }

    span {
        position: relative;
        z-index: 1;
    }

    &.primary {
        background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
        color: #ffffff;
        border: 1px solid #374151;

        &:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            border-color: #10b981;

            &::before {
                opacity: 1;
            }
        }

        &:active {
            transform: translateY(0);
        }
    }

    &.success {
        background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
        color: #ffffff;
        border: 1px solid #374151;

        &:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            border-color: #10b981;

            &::before {
                opacity: 1;
            }
        }

        &:active {
            transform: translateY(0);
        }
    }
}

// Element Plus 进度条样式覆盖
:deep(.el-progress-bar__outer) {
    background-color: #e5e7eb;
    border-radius: 6px;
}

:deep(.el-progress-bar__inner) {
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    border-radius: 6px;
    transition: width 0.3s ease;
    position: relative;
    overflow: hidden;

    &::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 20px;
        background: linear-gradient(90deg, transparent, #10b981);
        opacity: 0.6;
    }
}

:deep(.el-progress__text) {
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
}

// 覆盖 DialogAnimation 的 modal 样式，限制高度并启用滚动
:deep(.modal) {
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;

    // 自定义滚动条样式
    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-track {
        background: rgba(229, 231, 235, 0.3);
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(156, 163, 175, 0.5);
        border-radius: 4px;

        &:hover {
            background: rgba(107, 114, 128, 0.7);
        }
    }
}
</style>

<style lang="scss">
.markdown-body {
    font-size: 14px;
    color: #374151;

    h1,
    h2,
    h3,
    h4 {
        margin-top: 0px !important;
        margin-bottom: 0px !important;
        color: #111827;
        font-weight: 600;
    }

    h3 {
        font-size: 20px;
    }

    ul,
    ol {
        padding-left: 20px;
        margin-bottom: 8px;
    }

    li {
        margin-bottom: 4px;
        list-style-type: disc; // 确保显示圆点
    }

    code {
        background-color: #f3f4f6;
        padding: 2px 4px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 13px;
    }

    strong {
        font-weight: 600;
        color: #111827;
    }
}
</style>