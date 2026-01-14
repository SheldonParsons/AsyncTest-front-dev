<template>
  <div class="project-card" @click="enterProject">
    <!-- 顶部操作按钮 -->
    <div class="card-actions">
      <button
        class="action-btn favorite-btn"
        :class="{ active: isFavorite }"
        @click.stop="setFavorite"
        :title="isFavorite ? '取消收藏' : '加入收藏'"
      >
        <el-icon>
          <Star v-if="!isFavorite" />
          <StarFilled v-else />
        </el-icon>
      </button>
      <button
        class="action-btn default-btn"
        :class="{ active: isDefault }"
        @click.stop="setDefault"
        :title="isDefault ? '取消默认' : '设为默认'"
      >
        <el-icon>
          <CircleCheck v-if="isDefault" />
          <CircleCheckFilled v-else />
        </el-icon>
      </button>
    </div>

    <!-- 卡片主体内容 -->
    <div class="card-body">
      <!-- 项目图标 -->
      <div class="project-icon-wrapper">
        <div class="project-icon">
          <el-icon><FolderOpened /></el-icon>
        </div>
        <div class="project-badge" v-if="isDefault">
          <el-icon><Check /></el-icon>
          <span>默认</span>
        </div>
      </div>

      <!-- 项目信息 -->
      <div class="project-content">
        <h3 class="project-title" :title="name">{{ name }}</h3>

        <p class="project-description" v-if="decsString" :title="decsString">
          {{ decsString }}
        </p>
        <p class="project-description empty" v-else>
          暂无描述信息
        </p>

        <!-- 项目元信息 -->
        <div class="project-meta">
          <div class="meta-item">
            <el-icon><User /></el-icon>
            <span>{{ creator || '未知' }}</span>
          </div>
          <div class="meta-item">
            <el-icon><Calendar /></el-icon>
            <span>{{ createTime }}</span>
          </div>
        </div>
        <!-- 活跃度指示器 -->
        <div class="activity-indicator">
          <div class="activity-header">
            <div class="activity-label">
              <el-icon><TrendCharts /></el-icon>
              <span>活跃度</span>
            </div>
            <span class="activity-value">{{ Math.floor(fire) * 2 }}%</span>
          </div>
          <div class="activity-bar">
            <div
              class="activity-progress"
              :style="{ width: Math.floor(fire) * 2 + '%' }"
              :class="getActivityLevel(Math.floor(fire))"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="card-footer">
      <div class="footer-tags">
        <span class="tag">公开项目</span>
        <span class="tag members">{{ Math.floor(fire) }} 成员</span>
      </div>
      <div class="enter-action">
        <span>进入项目</span>
        <el-icon class="arrow-icon"><ArrowRight /></el-icon>
      </div>
    </div>

    <!-- Hover 边框效果 -->
    <div class="card-border"></div>
  </div>
</template>

<script setup lang="ts">
import {
  Star,
  StarFilled,
  FolderOpened,
  User,
  Calendar,
  TrendCharts,
  Check,
  ArrowRight,
  CircleCheck,
  CircleCheckFilled,
} from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  name: String,
  isFavorite: {
    type: Boolean,
    default: false
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createTime: {
    type: String,
    default: ''
  },
  creator: {
    type: String,
    default: ''
  },
  project: {
    type: Object
  },
  decsString: {
    type: String
  },
  fire: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['enterProject', 'setFavorite', 'setDefault'])

function enterProject() {
  emit('enterProject', props.project)
}

function setFavorite() {
  emit('setFavorite', props.project)
}

function setDefault() {
  emit('setDefault', props.project)
}

// 根据活跃度返回不同的样式等级
function getActivityLevel(value: number) {
  if (value >= 75) return 'high'
  if (value >= 50) return 'medium'
  if (value >= 25) return 'low'
  return 'minimal'
}
</script>

<style lang="scss" scoped>
.project-card {
  position: relative;
  background: #ffffff;
  border: 1.5px solid #e5e7eb;
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;

  // 边框动画效果
  .card-border {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 16px;
    padding: 2px;
    background: linear-gradient(135deg, #1e293b, #334155, #475569);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  &:hover {
    border-color: transparent;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.06);
    transform: translateY(-6px);

    .card-border {
      opacity: 1;
    }

    .project-icon-wrapper .project-icon {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      color: white;
      transform: scale(1.05) rotate(-5deg);
    }

    .enter-action {
      color: #1e293b;

      .arrow-icon {
        transform: translateX(6px);
      }
    }

    .card-actions {
      opacity: 1;
      transform: translateY(0);
    }
  }

  // 顶部操作按钮
  .card-actions {
    position: absolute;
    top: 16px;
    right: 16px;
    display: flex;
    gap: 8px;
    z-index: 10;
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

    .action-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      border: 1.5px solid #e5e7eb;
      border-radius: 10px;
      cursor: pointer;
      font-size: 16px;
      color: #9ca3af;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

      &:hover {
        border-color: #64748b;
        color: #334155;
        transform: scale(1.1);
      }

      &.favorite-btn.active {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border-color: #eab308;
        color: #ca8a04;

        &:hover {
          background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
          border-color: #f59e0b;
        }
      }

      &.default-btn.active {
        background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
        border-color: #818cf8;
        color: #4f46e5;

        &:hover {
          background: linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 100%);
          border-color: #6366f1;
        }
      }
    }
  }

  // 卡片主体
  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }

  // 项目图标区域
  .project-icon-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex-shrink: 0;
    height: 64px;
    padding: 8px;
    margin: -8px;

    .project-icon {
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      border-radius: 14px;
      font-size: 26px;
      color: #6b7280;
      transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
      flex-shrink: 0;
    }

    .project-badge {
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 4px 10px;
      background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
      color: #4f46e5;
      font-size: 11px;
      font-weight: 700;
      border-radius: 8px;
      margin-top: 2px;
      height: fit-content;

      .el-icon {
        font-size: 12px;
      }
    }
  }

  // 项目内容
  .project-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;

    .project-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin: 0;
      padding: 0;
      line-height: 1.4;
      max-height: 44.8px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-word;
      flex-shrink: 0;
    }

    .project-description {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      max-height: 39px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-word;
      flex-shrink: 0;

      &.empty {
        color: #9ca3af;
        font-style: italic;
      }
    }

    .project-meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
      min-height: 42px;

      .meta-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #6b7280;
        min-height: 18px;
        line-height: 18px;

        .el-icon {
          font-size: 13px;
          color: #9ca3af;
          flex-shrink: 0;
        }

        span {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .activity-indicator {
      padding: 12px;
      background: #f9fafb;
      border-radius: 10px;
      flex-shrink: 0;
      margin-top: auto;
      min-height: 50px;

      .activity-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;

        .activity-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;

          .el-icon {
            font-size: 14px;
          }
        }

        .activity-value {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
        }
      }

      .activity-bar {
        width: 100%;
        height: 5px;
        background: #e5e7eb;
        border-radius: 2.5px;
        overflow: hidden;

        .activity-progress {
          height: 100%;
          border-radius: 3px;
          transition: all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);

          &.minimal {
            background: linear-gradient(90deg, #cbd5e1 0%, #94a3b8 100%);
          }

          &.low {
            background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%);
          }

          &.medium {
            background: linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%);
          }

          &.high {
            background: linear-gradient(90deg, #34d399 0%, #10b981 100%);
          }
        }
      }
    }
  }

  // 底部操作栏
  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1.5px solid #f3f4f6;
    margin-top: auto;
    flex-shrink: 0;
    min-height: 36px;

    .footer-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;

      .tag {
        padding: 4px 10px;
        background: #f1f5f9;
        color: #64748b;
        font-size: 11px;
        font-weight: 600;
        border-radius: 6px;

        &.members {
          background: linear-gradient(135deg, #d1f4e0 0%, #a8e6cf 100%);
          color: #047857;
        }
      }
    }

    .enter-action {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      flex-shrink: 0;
      white-space: nowrap;

      .arrow-icon {
        font-size: 14px;
        transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      }
    }
  }
}

// 响应式
@media (max-width: 768px) {
  .project-card {
    padding: 18px;

    .card-actions {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>
