<template>
  <div class="kb-gate">
    <div v-if="checking" class="kb-gate-center">
      <div class="spinner" />
    </div>

    <div v-else-if="noProjects" class="kb-gate-center">
      <div class="empty-graphic">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      </div>
      <p class="empty-title">请先加入一个项目</p>
      <p class="empty-desc">知识库需要关联项目，请先加入或创建一个项目</p>
      <button class="back-btn" @click="goBack">返回</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getKBByProject } from './api'
import { ApiGetJoinProjects } from '@/api/project/index'

const router = useRouter()
const checking = ref(true)
const noProjects = ref(false)

const electronAPI = (window as any).electronAPI

onMounted(async () => {
  try {
    const res: any = await ApiGetJoinProjects({})
    const projects = res.results || []

    if (projects.length === 0) {
      window.$toast({ title: '请先加入一个项目，知识库需要关联项目', type: 'info' })
      noProjects.value = true
      checking.value = false
      return
    }

    // Try to restore saved project from user space
    let savedId: number | null = null
    try {
      savedId = await electronAPI?.harness?.storeGet('kb_project_id')
    } catch {}

    // Validate saved project still exists in user's project list
    let targetProject = savedId ? projects.find((p: any) => p.id === savedId) : null
    if (!targetProject) {
      targetProject = projects[0]
    }

    // Get or create KB for this project and navigate
    const kb = await getKBByProject(targetProject.id, targetProject.name)
    try {
      await electronAPI?.harness?.storeSet('kb_project_id', targetProject.id)
    } catch {}
    router.replace({ name: 'agentKnowledgeEditor', params: { kbId: String(kb.id) } })
  } catch (e: any) {
    window.$toast({ title: e.message || '加载失败', type: 'error' })
    checking.value = false
  }
})

function goBack() {
  router.push({ name: 'agentDashboard' })
}
</script>

<style lang="scss" scoped>
$bg-page: #ffffff;
$text-primary: #1d1d1f;
$text-secondary: rgba(0, 0, 0, 0.55);
$border-color: rgba(0, 0, 0, 0.08);

.kb-gate {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-page;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.kb-gate-center {
  text-align: center;
  max-width: 320px;
}

.empty-graphic {
  color: rgba(0, 0, 0, 0.12);
  margin-bottom: 20px;
}

.empty-title {
  margin: 0;
  font-size: 21px;
  font-weight: 600;
  color: $text-primary;
  letter-spacing: -0.374px;
}

.empty-desc {
  margin: 8px 0 0;
  font-size: 14px;
  color: $text-secondary;
  letter-spacing: -0.224px;
}

.back-btn {
  margin-top: 20px;
  padding: 8px 20px;
  border: none;
  border-radius: 980px;
  background: $text-primary;
  color: #ffffff;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  letter-spacing: -0.224px;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.88;
  }
}

.spinner {
  width: 22px;
  height: 22px;
  border: 2px solid $border-color;
  border-top-color: $text-primary;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
