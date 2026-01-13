<template>
    <section class="video-showcase-section">
        <div class="container">
            <div class="video-wrapper" ref="videoWrapperRef">
                <video ref="videoRef" class="main-video"
                    src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/case_demo.mp4" muted loop playsinline
                    @play="onVideoPlay" @pause="onVideoPause" @click="togglePlay"></video>

                <div class="video-controls">
                    <button class="play-pause-btn" @click.stop="togglePlay">
                        <svg v-if="!isPlaying" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                            fill="currentColor" class="icon play-icon">
                            <path fill-rule="evenodd"
                                d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                                clip-rule="evenodd" />
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                            class="icon pause-icon">
                            <path fill-rule="evenodd"
                                d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V5.25z"
                                clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>

                <div class="video-overlay" v-if="!isPlaying && !hasAutoPlayed">
                    <span class="overlay-text">滚动至此处自动播放</span>
                </div>
            </div>

        </div>
    </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const videoRef = ref<HTMLVideoElement | null>(null)
const videoWrapperRef = ref<HTMLElement | null>(null)
const isPlaying = ref(false)
const hasAutoPlayed = ref(false) // 确保只自动播放一次
let observer: IntersectionObserver | null = null

// 切换播放/暂停状态
const togglePlay = () => {
    const video = videoRef.value
    if (!video) return

    if (video.paused) {
        // 如果是用户手动点击播放，我们可以选择取消静音 (可选)
        // video.muted = false 
        video.play()
    } else {
        video.pause()
    }
}

// 监听原生视频事件，保持状态同步
const onVideoPlay = () => {
    isPlaying.value = true
}
const onVideoPause = () => {
    isPlaying.value = false
}

// 初始化滚动监听器
const initIntersectionObserver = () => {
    // 如果不支持 IntersectionObserver，直接放弃自动播放
    if (!('IntersectionObserver' in window)) return

    observer = new IntersectionObserver((entries) => {
        const entry = entries[0]
        // isIntersecting: 元素进入视口
        // !hasAutoPlayed.value: 还没自动播放过
        if (entry.isIntersecting && !hasAutoPlayed.value && videoRef.value) {
            console.log('Video entered viewport center, attempting auto-play...')
            // 尝试播放
            videoRef.value.play().then(() => {
                hasAutoPlayed.value = true
                // 播放成功后，取消观察，节省性能
                if (videoWrapperRef.value) {
                    observer?.unobserve(videoWrapperRef.value)
                }
            }).catch(err => {
                // 自动播放可能会被浏览器策略拦截 (通常是因为没有 muted)
                console.warn('Auto-play failed:', err)
            })
        }
    }, {
        // rootMargin: '0px',
        // threshold: 0.5 表示当元素 50% 进入视口时触发回调（即滚动到中间）
        threshold: 0.5
    })

    if (videoWrapperRef.value) {
        observer.observe(videoWrapperRef.value)
    }
}

onMounted(() => {
    initIntersectionObserver()
})

onBeforeUnmount(() => {
    if (observer) {
        observer.disconnect()
    }
})
</script>

<style lang="scss" scoped>
.video-showcase-section {
    //   padding: 5rem 0;
    // 背景色，根据你的页面风格调整
    background: linear-gradient(to bottom, var(--color-bg, #000), var(--color-bg-elevated, #111));
}

.section-header {
    text-align: center;
    margin-bottom: 3rem;

    .section-title {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 1rem;
        color: var(--color-text-primary, #fff);
    }

    .section-subtitle {
        font-size: 1.2rem;
        color: var(--color-text-secondary, #a0a0a0);
    }
}

/* === 核心视频容器样式 === */
.video-wrapper {
    position: relative;
    width: 100%;
    border-radius: 20px; // 圆角
    overflow: hidden; // 确保视频不溢出圆角
    /* 精美的阴影效果，增加立体感 */
    box-shadow:
        0 20px 40px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.1) inset; // 微妙的内边框
    background: #000; // 视频加载前的背景色
    aspect-ratio: 16 / 9; // 强制保持 16:9 比例 (可选，根据视频实际情况调整)
    cursor: pointer; // 鼠标放上去显示手型

    /* 鼠标悬停时，稍微抬起一点，增加交互感 */
    transition: transform 0.3s ease, box-shadow 0.3s ease;

    &:hover {
        transform: translateY(-5px);
        box-shadow:
            0 30px 60px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(var(--color-accent, 16, 185, 129), 0.3) inset; // 悬停时边框变色
    }
}

.container {
    position: relative;
    // max-width: 1024px;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    margin: 0 auto;
    border: 1px solid #10b981;
    border-radius: 26px;
    // padding: 10px;
    box-shadow:
        0 0 6px rgba(16, 185, 129, 0.6),
        0 0 12px rgba(16, 185, 129, 0.4),
        0 0 20px rgba(16, 185, 129, 0.25);
}

.main-video {
  position: absolute;       /* ✅ 绝对定位 */
  top: 50%;
  left: 50%;
  width: 107%;             /* 放大裁掉黑边 */
  height: 108%;
  object-fit: cover;
  transform: translate(-50%, -50%); /* ✅ 居中 */
}

/* === 自定义控制器样式 === */
.video-controls {
    position: absolute;
    bottom: 24px;
    right: 24px;
    z-index: 10;
}

.play-pause-btn {
    // 玻璃拟态风格按钮
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);

    color: #fff;
    width: 56px;
    height: 56px;
    border-radius: 50%; // 圆形按钮
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

    &:hover {
        background: var(--color-accent, #10b981); // 悬停时变成主题色
        border-color: var(--color-accent, #10b981);
        transform: scale(1.1); // 稍微放大
        box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
    }

    &:active {
        transform: scale(0.95);
    }

    .icon {
        width: 28px;
        height: 28px;
    }

    // 调整播放图标的位置，使其视觉居中
    .play-icon {
        margin-left: 4px;
    }
}

/* === 遮罩层样式 (可选) === */
.video-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none; // 确保不阻挡点击事件
    opacity: 1;
    transition: opacity 0.5s ease;

    // 当视频开始播放或已经自动播放过，隐藏遮罩
    .video-wrapper:hover &,
    .main-video[data-playing="true"]+.video-controls+& {
        opacity: 0;
    }
}

.overlay-text {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1rem;
    font-weight: 500;
    letter-spacing: 1px;
}

/* 响应式调整 */
@media (max-width: 768px) {
    .video-wrapper {
        border-radius: 12px;
    }

    .play-pause-btn {
        width: 48px;
        height: 48px;
        bottom: 16px;
        right: 16px;

        .icon {
            width: 24px;
            height: 24px;
        }
    }
}
</style>