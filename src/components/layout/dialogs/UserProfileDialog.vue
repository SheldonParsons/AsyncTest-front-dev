<template>
  <AstDialog ref="dialogRef" title="" bgtype="black" topMove="-15% !important" :showCancel="false"
    :showComfirm="false">
    <div class="user-profile-container">
      <!-- 背景装饰 -->
      <div class="profile-bg-effects">
        <div class="glow-orb orb-1"></div>
        <div class="glow-orb orb-2"></div>
        <div class="grid-lines"></div>
      </div>

      <!-- 头像区域 -->
      <div class="avatar-section">
        <div class="avatar-ring">
          <div class="avatar-glow"></div>
          <el-avatar :size="100" :src="userAvatar" class="profile-avatar" />
          <div class="status-badge">
            <span class="status-dot"></span>
            <span class="status-text">在线</span>
          </div>
        </div>
        <h2 class="user-nickname">{{ userInfo.nickName || userInfo.username || 'User' }}</h2>
        <div class="user-role-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          <span>{{ getRoleText(userInfo.role) }}</span>
        </div>
      </div>

      <!-- 信息卡片区域 -->
      <div class="info-cards">
        <!-- 用户名 -->
        <div class="info-card">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div class="card-content">
            <span class="card-label">用户名</span>
            <span class="card-value">{{ userInfo.username || '-' }}</span>
          </div>
        </div>

        <!-- 邮箱 -->
        <div class="info-card">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div class="card-content">
            <span class="card-label">邮箱</span>
            <span class="card-value">{{ userInfo.email || '-' }}</span>
          </div>
        </div>

        <!-- 手机 -->
        <div class="info-card">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <div class="card-content">
            <span class="card-label">手机</span>
            <span class="card-value">{{ userInfo.mobile || '-' }}</span>
          </div>
        </div>

        <!-- 用户ID -->
        <div class="info-card">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div class="card-content">
            <span class="card-label">用户 ID</span>
            <span class="card-value mono">{{ userInfo.userId || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="profile-actions">
        <button class="action-btn secondary" @click="close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span>关闭</span>
        </button>
      </div>
    </div>
  </AstDialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useStore } from '@/store'
import AstDialog from '@/components/common/general/dialog.vue'

const store: any = useStore()
const dialogRef = ref<InstanceType<typeof AstDialog> | null>(null)

const userInfo = reactive({
  userId: '',
  username: '',
  nickName: '',
  email: '',
  mobile: '',
  role: '',
  sex: ''
})

const userAvatar = ref('https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/99.png')

function getRoleText(role: string) {
  const roleMap: Record<string, string> = {
    'admin': '管理员',
    'user': '普通用户',
    'guest': '访客',
    'developer': '开发者',
    'tester': '测试工程师'
  }
  return roleMap[role] || role || '成员'
}

async function loadUserInfo() {
  const res = await store.dispatch('getUser')
  if (res) {
    userInfo.userId = res.userId || ''
    userInfo.username = res.username || ''
    userInfo.nickName = res.nickName || ''
    userInfo.email = res.email || ''
    userInfo.mobile = res.mobile || ''
    userInfo.role = res.role || ''
    userInfo.sex = res.sex || ''

    if (res.userId) {
      userAvatar.value = `https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/${res.userId + (0 % 100)}.png`
    }
  }
}

async function open() {
  await loadUserInfo()
  return dialogRef.value?.open()
}

function close() {
  dialogRef.value?.close()
}

defineExpose({ open, close })
</script>

<style lang="scss" scoped>
.user-profile-container {
  position: relative;
  width: 380px;
  padding: 30px 25px 25px;
  overflow: hidden;
}

// 背景效果
.profile-bg-effects {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.15;

  &.orb-1 {
    width: 200px;
    height: 200px;
    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
    top: -80px;
    left: -60px;
    animation: float1 8s ease-in-out infinite;
  }

  &.orb-2 {
    width: 150px;
    height: 150px;
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    bottom: -50px;
    right: -40px;
    animation: float2 10s ease-in-out infinite;
  }
}

.grid-lines {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}

@keyframes float1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, 20px) scale(1.1); }
}

@keyframes float2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-15px, -15px) scale(1.05); }
}

// 头像区域
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
}

.avatar-ring {
  position: relative;
  padding: 4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #059669, #047857);
  margin-bottom: 16px;

  &::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981, transparent, #059669);
    animation: rotate 4s linear infinite;
    opacity: 0.6;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.avatar-glow {
  position: absolute;
  inset: -20px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%);
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

.profile-avatar {
  border: 3px solid #0b1011;
  position: relative;
  z-index: 1;
}

.status-badge {
  position: absolute;
  bottom: 5px;
  right: -5px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px 3px 6px;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  z-index: 2;

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 8px #10b981;
    animation: blink 2s ease-in-out infinite;
  }

  .status-text {
    font-size: 10px;
    color: #10b981;
    font-weight: 500;
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.user-nickname {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.user-role-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 20px;

  svg {
    width: 14px;
    height: 14px;
    color: #10b981;
  }

  span {
    font-size: 12px;
    color: #10b981;
    font-weight: 500;
  }
}

// 信息卡片
.info-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.03));
    border-color: rgba(16, 185, 129, 0.2);
    transform: translateY(-2px);
  }
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
  border-radius: 10px;
  flex-shrink: 0;

  svg {
    width: 18px;
    height: 18px;
    color: #10b981;
  }
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.card-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-value {
  font-size: 13px;
  color: #fff;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &.mono {
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
  }
}

// 底部操作
.profile-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 24px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &.secondary {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);

    &:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      transform: translateY(-2px);
    }
  }

  &.primary {
    background: linear-gradient(135deg, #10b981, #059669);
    color: #fff;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);

    &:hover {
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
      transform: translateY(-2px);
    }
  }
}
</style>
