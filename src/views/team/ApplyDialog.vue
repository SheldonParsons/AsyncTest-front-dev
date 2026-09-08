<template>
  <el-dialog :close-icon="X" append-to-body class="ast-glass-dialog" modal-class="ast-glass-mask" align-center v-model="visible" title="申请加入项目" width="480px" :close-on-click-modal="!busy" :close-on-press-escape="!busy" :show-close="!busy" destroy-on-close>
    <p class="team-project-title">{{ project?.name }}</p>
    <el-form label-position="top" @submit.prevent="submit">
      <el-form-item label="申请理由"><el-input :clear-icon="CircleX" v-model="reason" type="textarea" :rows="4" :maxlength="500" show-word-limit placeholder="向项目管理者介绍你加入项目的原因（选填）" :disabled="busy" /></el-form-item>
      <el-alert v-if="error" :title="error" type="error" :closable="false" />
    </el-form>
    <template #footer><el-button :disabled="busy" @click="visible = false">取消</el-button><el-button type="primary" :loading="busy" :loading-icon="LoaderCircle" @click="submit">提交申请</el-button></template>
  </el-dialog>
</template>
<script setup lang="ts">
import { CircleX, LoaderCircle, X } from '@/components/icons/lucide'
import { teamMessage } from './feedback'
import { ref } from 'vue'
import { errorText, notifyTeamChanged, teamRequest } from '@/api/team'
const visible = ref(false), busy = ref(false), reason = ref(''), error = ref('')
const project = ref<{ id: number; name: string } | null>(null)
function open(value: { id: number; name: string }) { project.value = value; reason.value = ''; error.value = ''; visible.value = true }
async function submit() {
  if (!project.value || busy.value) return
  busy.value = true; error.value = ''
  try {
    await teamRequest('/team/join-requests/', 'POST', { project: project.value.id, reason: reason.value })
    visible.value = false; teamMessage.success('申请已提交'); notifyTeamChanged()
  } catch (e) { error.value = errorText(e) } finally { busy.value = false }
}
defineExpose({ open })
</script>
