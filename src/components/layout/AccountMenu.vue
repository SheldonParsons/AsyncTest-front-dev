<template>
  <FeatureGuide v-if="loggedIn" kind="account" :enabled="route.path !== '/home/team'">
  <el-dropdown trigger="click" placement="bottom" :popper-options="accountPopperOptions" popper-class="ast-account-menu" @command="command">
    <slot />
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="profile"><UserRound :size="15" :stroke-width="1.8" aria-hidden="true" />个人信息</el-dropdown-item>
        <el-dropdown-item command="/home/team"><UsersRound :size="15" :stroke-width="1.8" aria-hidden="true" />团队管理</el-dropdown-item>
        <el-dropdown-item v-if="profile?.capabilities.manage_all_users" command="/home/admin/users" divided><UserRoundCog :size="15" :stroke-width="1.8" aria-hidden="true" />全局用户管理</el-dropdown-item>
        <el-dropdown-item v-if="profile?.capabilities.review_all_join_requests" command="/home/admin/approvals"><ClipboardCheck :size="15" :stroke-width="1.8" aria-hidden="true" />全局审批</el-dropdown-item>
        <el-dropdown-item command="docs" divided><BookOpen :size="15" :stroke-width="1.8" aria-hidden="true" />文档</el-dropdown-item>
        <el-dropdown-item v-if="isElectron" command="update"><Download :size="15" :stroke-width="1.8" aria-hidden="true" />检查更新</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
  </FeatureGuide>
  <span v-else class="account-login-trigger" @click="emit('login')"><slot /></span>
</template>
<script setup lang="ts">
import { UserRound, UsersRound, UserRoundCog, ClipboardCheck, BookOpen, Download } from '@/components/icons/lucide'
import GlobalStatus from '@/global'
import FeatureGuide from './FeatureGuide.vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentUserProfile } from '@/composables/useCurrentUserProfile'
const isElectron = import.meta.env.VITE_IS_ELECTRON === 'true'
const props = defineProps<{ loggedIn: boolean }>()
const emit = defineEmits<{ profile: []; login: [] }>()
const router = useRouter(), route = useRoute()
const accountPopperOptions = { modifiers: [{ name: 'preventOverflow', options: { padding: 8 } }] }
const { profile } = useCurrentUserProfile()
function command(value: string) {
  if (value === 'profile') emit('profile')
  else if (value === 'update') window.electronAPI?.send('check-for-update')
  else if (value === 'docs') {
    if (isElectron) window.electronAPI?.openExternal(GlobalStatus.product_docs_host)
    else window.open(GlobalStatus.product_docs_host, '_blank', 'noopener,noreferrer')
  }
  else void router.push({ path: value, query: route.query.windowKey ? { windowKey: route.query.windowKey } : {} })
}
</script>
<style scoped>.account-login-trigger { display: inline-flex; }</style>
