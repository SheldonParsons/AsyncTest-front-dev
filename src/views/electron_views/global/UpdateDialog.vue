<template>
    <DialogAnimation ref="dialogRef" title="软件更新" bgtype="white" :showCancel="!updateInfo.isForce && !downloading"
        :showComfirm="false" :closeOnClickModal="false" :closeOnPressEscape="!updateInfo.isForce && !downloading" cancel_title="暂不更新">
        <div class="update-dialog-content">
            <!-- 发现新版本 -->
            <div v-if="!downloading && !downloadComplete" class="update-section">
                <div class="update-icon">
                    <img src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/app_logo/LOGO_DARK.png" alt="AsyncTest Logo" />
                </div>
                <h3 class="update-title">发现新版本 v{{ updateInfo.version }}</h3>
                <div v-if="updateInfo.notes" class="update-notes">
                    <div class="notes-label">更新内容：</div>
                    <div class="notes-content">{{ updateInfo.notes }}</div>
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

            <!-- 下载中 -->
            <div v-if="downloading && !downloadComplete" class="download-section">
                <div class="download-animation">
                    <div class="download-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                            class="rotating">
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
                <h3 class="download-title">正在下载更新...</h3>
                <div class="progress-wrapper">
                    <el-progress :percentage="percentage" :stroke-width="12" :color="progressColor" :show-text="true" />
                </div>
                <p class="download-tip">请稍候，下载完成后将自动提示安装</p>
            </div>

            <!-- 下载完成 -->
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="16 16 12 12 8 16" />
                        <line x1="12" y1="12" x2="12" y2="21" />
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                        <polyline points="16 16 12 12 8 16" />
                    </svg>
                    <span>退出并安装</span>
                </button>
            </div>
        </div>
    </DialogAnimation>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import DialogAnimation from '@/components/common/general/dialog.vue';

const dialogRef = ref<any>(null);
const visible = ref(false);
const updateInfo = ref({ version: '1.0.1', notes: '', isForce: true });
const percentage = ref(0);
const downloading = ref(false);
const downloadComplete = ref(false);

// 进度条颜色
const progressColor = computed(() => {
    if (percentage.value < 30) return '#10b981';
    if (percentage.value < 70) return '#10b981';
    return '#10b981';
});

// 监听 visible 变化，控制 dialog 显示/隐藏
watch(visible, (newVal) => {
    if (newVal) {
        dialogRef.value?.open();
    } else {
        dialogRef.value?.close();
    }
});

// 立即更新按钮
const startDownload = () => {
    downloading.value = true;
    percentage.value = 0;
    downloadComplete.value = false;
    if (window.electronAPI) {
        window.electronAPI.send('start-download');
    }
};

// 立即退出程序并安装按钮
const startInstall = () => {
    if (window.electronAPI) {
        window.electronAPI.send('install-now');
    }
};

let removeUpdateListener: any = null;
let removeProgressListener: any = null;
let removeDownloadedListener: any = null;

onMounted(() => {
    if (window.electronAPI) {
        // 1. 监听更新可用
        removeUpdateListener = window.electronAPI.on('update-available', (event: any, info: any) => {
            console.log('监听到更新信号:', info);
            visible.value = true;
            updateInfo.value = info;
            downloading.value = false;
            downloadComplete.value = false;
            percentage.value = 0;
        });

        // 2. 监听下载进度
        removeProgressListener = window.electronAPI.on('download-progress', (event: any, percent: any) => {
            percentage.value = Math.floor(percent);
        });

        // 3. 监听下载完成
        removeDownloadedListener = window.electronAPI.on('update-downloaded', () => {
            console.log('下载完成');
            downloading.value = false;
            downloadComplete.value = true;
            percentage.value = 100;
        });
        dialogRef.value?.open();
    }
});

onUnmounted(() => {
    // 组件销毁时，执行清理，防止内存溢出
    if (removeUpdateListener) removeUpdateListener();
    if (removeProgressListener) removeProgressListener();
    if (removeDownloadedListener) removeDownloadedListener();
});
</script>

<style scoped lang="scss">
.update-dialog-content {
    padding: 20px;
    min-height: 280px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
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
            color: #6b7280;
            line-height: 1.6;
            white-space: pre-wrap;
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
</style>