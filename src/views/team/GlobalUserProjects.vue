<template>
  <el-drawer :show-close="false" append-to-body v-model="visible" :title="`${personName(user)} · 项目身份`" size="min(780px, 95vw)" class="team-drawer ast-glass-drawer" modal-class="ast-glass-mask" :close-on-click-modal="!busy">
    <template #header="{ close, titleId, titleClass }">
      <span :id="titleId" :class="titleClass">{{ `${personName(user)} · 项目身份` }}</span>
      <button type="button" class="el-drawer__close-btn" aria-label="关闭弹出层" @click="close"><X :size="18" aria-hidden="true" /></button>
    </template>
    <p class="team-muted">账号：{{ user.username }}。项目创建者身份须通过项目转让修改。</p>
    <el-alert v-if="!user.is_active" title="此账号已停用，仅可查看项目身份。" type="info" :closable="false" />
    <div class="team-toolbar"><el-input :clear-icon="CircleX" v-model="search" class="team-search" :prefix-icon="Search" clearable placeholder="搜索项目名称" aria-label="搜索用户的项目" /><span class="team-count">{{ count }} 个项目</span></div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" class="team-alert" />
    <TeamBusy :busy="loading"><el-table :data="rows" empty-text="暂无项目">
      <el-table-column prop="name" label="项目" min-width="200" />
      <el-table-column label="当前身份" width="130"><template #default="{ row }">{{ roleLabel(row.role) }}<span v-if="row.membership_status === 1" class="team-muted">成员关系已停用</span></template></el-table-column>
      <el-table-column label="设置身份" min-width="220"><template #default="{ row }"><div v-if="row.can_set_role" class="team-actions">
        <el-button size="small" :disabled="busy || row.role === 0 && row.membership_status === 0" @click="grant(row, 0)">设为成员</el-button>
        <el-button size="small" type="primary" plain :disabled="busy || row.role === 1 && row.membership_status === 0" @click="grant(row, 1)">设为管理员</el-button>
      </div><span v-else class="team-muted">不可修改</span></template></el-table-column>
    </el-table></TeamBusy>
    <TeamPagination class="team-pagination" v-model:current-page="page" :page-size="20" :total="count" />
  </el-drawer>
</template>
<script setup lang="ts">
import { CircleAlert, CircleX, Search, X } from '@/components/icons/lucide'
import { teamMessage } from './feedback'
import TeamBusy from './TeamBusy.vue'
import TeamPagination from './TeamPagination.vue'
import { ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useTeamList } from '@/composables/useTeamList'
import { type GlobalUser, type UserProject, errorText, notifyTeamChanged, personName, roleLabel, teamRequest } from '@/api/team'
const props = defineProps<{ user: GlobalUser }>()
const visible = ref(true), search = ref(''), page = ref(1), busy = ref(false)
const { rows, count, loading, error, reload } = useTeamList<UserProject>(() => `/admin/users/${props.user.id}/projects/`, () => ({ search: search.value, page: page.value }), [search, page])
watch(search, () => { page.value = 1 })
async function grant(project: UserProject, role: number) {
  if (busy.value) return
  try { await ElMessageBox.confirm(`将 ${personName(props.user)} 设置为「${project.name}」的${roleLabel(role)}？如有待审批加入申请，将一并通过。`, '设置项目身份', { customClass: 'ast-glass-message', closeIcon: X, icon: CircleAlert, modalClass: 'ast-glass-mask', confirmButtonText: '确认设置', cancelButtonText: '取消' }) } catch { return }
  busy.value = true
  try { await teamRequest(`/admin/users/${props.user.id}/projects/`, 'PUT', { project: project.id, role }); teamMessage.success('项目身份已更新'); notifyTeamChanged() }
  catch (e) { teamMessage.error(errorText(e)); await reload() } finally { busy.value = false }
}
</script>
