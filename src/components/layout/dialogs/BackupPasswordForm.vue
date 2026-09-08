<template>
  <form class="backup-form" :class="{ 'backup-form--prompt': variant === 'prompt', 'backup-form--panel': variant === 'panel' }" @submit.prevent="save">
    <div class="backup-form__fields">
    <p v-if="variant !== 'prompt'" class="backup-help">禅道暂时不可用时，也能使用备用密码登录 AST。</p>
    <div v-if="hasPassword" class="backup-field">
      <label :for="`${formId}-current`">当前密码</label>
      <el-input :id="`${formId}-current`" v-model="currentPassword" type="password" show-password :prefix-icon="Key" autocomplete="current-password" placeholder="禅道密码或原备用密码" :disabled="saving" size="large" />
    </div>
    <div class="backup-field">
      <div class="backup-field__label"><label :for="`${formId}-new`">备用密码</label><span>6～21 位</span></div>
      <el-input :id="`${formId}-new`" v-model="password" type="password" show-password :prefix-icon="Lock" autocomplete="new-password" :minlength="6" :maxlength="21" placeholder="6～21 位" :disabled="saving" size="large" />
    </div>
    <div class="backup-field">
      <label :for="`${formId}-confirm`">确认备用密码</label>
      <el-input :id="`${formId}-confirm`" v-model="confirm" type="password" show-password :prefix-icon="Lock" autocomplete="new-password" :maxlength="21" placeholder="再次输入备用密码" :disabled="saving" size="large" />
    </div>
    <p class="backup-note"><el-icon :size="14"><CircleCheck /></el-icon>仅用于 AST 登录，不会修改禅道密码。</p>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon role="alert" />
    </div>
    <div class="backup-actions">
      <el-button v-if="cancellable" :disabled="saving" @click="emit('cancel')">暂不设置</el-button>
      <el-button type="primary" native-type="submit" :loading="saving">{{ hasPassword ? '修改备用密码' : '设置备用密码' }}<el-icon v-if="!saving" class="backup-actions__arrow"><ArrowRight /></el-icon></el-button>
    </div>
  </form>
</template>
<script setup lang="ts">
import { ref, useId } from 'vue'
import { Lock, Key, CircleCheck, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { errorText, teamRequest } from '@/api/team'
import { applyCurrentUserProfile, useCurrentUserProfile, type CurrentUserProfilePayload } from '@/composables/useCurrentUserProfile'
const props = defineProps<{ hasPassword?: boolean; cancellable?: boolean; variant?: 'prompt' | 'embedded' | 'panel' }>()
const formId = useId()
const emit = defineEmits<{ saved: []; cancel: []; busy: [boolean] }>()
const { profile: currentProfile } = useCurrentUserProfile()
const password = ref(''), confirm = ref(''), currentPassword = ref(''), error = ref(''), saving = ref(false)
async function save() {
  if (saving.value) return
  error.value = ''
  if (password.value.length < 6 || password.value.length > 21) { error.value = '请输入 6～21 位的密码'; return }
  if (password.value !== confirm.value) { error.value = '两次输入的密码不一致'; return }
  if (props.hasPassword && !currentPassword.value) { error.value = '请输入当前密码进行验证'; return }
  const actorId = currentProfile.value?.id
  saving.value = true; emit('busy', true)
  try {
    const profile = await teamRequest<CurrentUserProfilePayload>('/user/me/backup-password/', 'PUT', {
      new_password: password.value, current_password: currentPassword.value,
    })
    if (currentProfile.value?.id !== actorId) throw new Error('账号已切换，请重新设置')
    applyCurrentUserProfile(profile, { broadcast: true })
    password.value = confirm.value = currentPassword.value = ''
    ElMessage.success('备用密码已保存'); emit('saved')
  } catch (reason) { error.value = errorText(reason) }
  finally { saving.value = false; emit('busy', false) }
}
</script>
<style scoped>
.backup-help { color: #767676; line-height: 1.75; margin: 0 0 22px; font-size: 13px; }
.backup-field { display: grid; gap: 9px; margin-bottom: 19px; }
.backup-field label { font-size: 13px; font-weight: 550; color: #494949; line-height: 1.5; }
.backup-field__label { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.backup-field__label > span { font-size: 11px; color: #888888; }
.backup-field :deep(.el-input__wrapper) { min-height: 46px; padding: 0 14px; border-radius: 12px; }
.backup-field :deep(.el-input__inner) { height: 46px; font-size: 13px; }
.backup-field :deep(.el-input__prefix) { color: #9d9d9d; margin-right: 4px; }
.backup-note { display: flex; align-items: center; gap: 7px; color: #888888; font-size: 11px; line-height: 1.6; margin: 3px 0 0; }
.backup-note .el-icon { color: #898989; flex: 0 0 auto; }
.backup-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; padding-top: 18px; border-top: 1px solid rgba(131,131,131,.12); }
.backup-actions .el-button { height: 42px; padding: 0 20px; margin-left: 0; font-size: 13px; border-radius: 11px; }
.backup-actions__arrow { margin-left: 10px; }
.backup-form--prompt .backup-actions { margin: 25px -30px -26px; padding: 20px 30px 24px; background: rgba(255,255,255,.3); }
.backup-form :deep(.el-alert) { margin-top: 15px; border-radius: 10px; }
.backup-form--panel { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.backup-form--panel .backup-form__fields { flex: 1; min-height: 0; overflow-y: auto; padding: 18px 20px; scrollbar-width: thin; scrollbar-color: rgba(80,80,80,.3) transparent; }
.backup-form--panel .backup-actions { flex-shrink: 0; margin: 0; padding: 16px 20px; background: rgba(255,255,255,.3); }
.backup-form--panel .backup-help { margin-bottom: 16px; }
.backup-form--panel .backup-field { margin-bottom: 15px; }
@media(max-width: 420px) { .backup-actions .el-button { padding: 0 14px; } }
</style>
