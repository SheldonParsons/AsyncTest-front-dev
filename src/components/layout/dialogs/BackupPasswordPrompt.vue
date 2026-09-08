<template>
  <el-dialog append-to-body v-model="visible" class="ast-glass-dialog ast-backup-dialog" modal-class="ast-glass-mask"
    title="为账号设置备用密码" width="480px" align-center :before-close="dismiss"
    :close-on-click-modal="!busy" :close-on-press-escape="!busy" :show-close="!busy" destroy-on-close>
    <template #header>
      <div class="backup-heading">
        <div class="backup-heading__icon"><el-icon :size="26"><Lock /></el-icon><span class="backup-heading__spark"></span></div>
        <p class="backup-heading__eyebrow">账号安全</p>
        <h2>设置备用密码</h2>
        <p class="backup-heading__description">禅道暂时不可用时，也能继续登录 AST。</p>
      </div>
    </template>
    <BackupPasswordForm variant="prompt" cancellable @saved="visible = false" @cancel="dismiss()" @busy="busy = $event" />
  </el-dialog>
</template>
<script setup lang="ts">
import { Lock } from '@element-plus/icons-vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { type Behavior, errorText, teamRequest } from '@/api/team'
import { readLocalAuthToken } from '@/utils/authNavigation'
import BackupPasswordForm from './BackupPasswordForm.vue'
const visible = ref(false), busy = ref(false)
let lastToken = '', current: Behavior | undefined, epoch = 0
async function afterLogin() {
  const token = readLocalAuthToken()
  if (!token || token === lastToken) return
  lastToken = token
  visible.value = false; current = undefined
  const run = ++epoch
  try {
    const states = await teamRequest<Behavior[]>('/user/me/behaviors/?scene=login')
    if (run !== epoch || readLocalAuthToken() !== token) return
    current = states.find(item => item.key === 'account.backup_password_prompt' && item.should_trigger)
    if (current) {
      visible.value = true
      await teamRequest('/user/me/behaviors/events/', 'POST', { key: current.key, version: current.version, scope: current.scope, event: 'displayed' })
    }
  } catch (reason) { ElMessage.error(`提醒状态读取失败：${errorText(reason)}`) }
}
async function dismiss(done?: () => void) {
  if (busy.value) return
  visible.value = false; done?.()
  if (!current || readLocalAuthToken() !== lastToken) return
  try {
    await teamRequest('/user/me/behaviors/events/', 'POST', { key: current.key, version: current.version, scope: current.scope, event: 'dismissed' })
  } catch (reason) { ElMessage.error(`未能保存“不再提醒”状态：${errorText(reason)}`) }
}
onMounted(() => window.addEventListener('ast:login-succeeded', afterLogin))
onBeforeUnmount(() => { epoch++; window.removeEventListener('ast:login-succeeded', afterLogin) })
</script>

<style scoped>
.backup-heading__icon { position: relative; display: flex; align-items: center; justify-content: center; width: 58px; height: 58px; margin-bottom: 22px; color: #696969; border: 1px solid rgba(255,255,255,.95); border-radius: 19px; background: linear-gradient(145deg,rgba(240,240,240,.82),rgba(249,249,249,.7)); box-shadow: 0 6px 18px rgba(98,98,98,.08), inset 0 1px 0 white; }
.backup-heading__spark { position: absolute; width: 9px; height: 9px; right: -3px; top: 7px; border-radius: 50%; background: #b1b1b1; box-shadow: 0 0 0 4px rgba(242,242,242,.9); }
.backup-heading__eyebrow { margin: 0 0 8px; font-size: 11px; letter-spacing: 2px; font-weight: 600; color: #838383; }
.backup-heading h2 { margin: 0 0 10px; font-size: 25px; line-height: 1.35; font-weight: 650; letter-spacing: -.6px; color: #353535; }
.backup-heading__description { margin: 0; font-size: 13px; line-height: 1.8; color: #747474; }
</style>
