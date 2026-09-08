<template>
  <el-drawer :show-close="false" append-to-body v-model="visible" :title="`${project?.name || ''} · 项目成员`" size="min(800px, 95vw)" class="team-drawer ast-glass-drawer" modal-class="ast-glass-mask" :close-on-click-modal="!busy">
    <template #header="{ close, titleId, titleClass }">
      <span :id="titleId" :class="titleClass">{{ `${project?.name || ''} · 项目成员` }}</span>
      <button type="button" class="el-drawer__close-btn" aria-label="关闭弹出层" @click="close"><X :size="18" aria-hidden="true" /></button>
    </template>
    <p class="team-muted">我的身份：{{ roleLabel(project?.role ?? null) }}</p>
    <div class="team-toolbar"><el-input :clear-icon="CircleX" v-model="search" clearable class="team-search" :prefix-icon="Search" placeholder="搜索账号或昵称" aria-label="搜索成员" /><span class="team-count">{{ count }} 位成员</span></div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" class="team-alert" />
    <TeamBusy :busy="loading"><el-table :data="rows" empty-text="暂无成员">
      <el-table-column label="成员" min-width="190"><template #default="{ row }"><div class="team-person"><el-avatar :size="32" :src="row.user.avatar_url">{{ (personName(row.user) || '?').slice(0, 1) }}</el-avatar><div><strong>{{ personName(row.user) }}</strong><small>{{ row.user.username }}</small></div></div></template></el-table-column>
      <el-table-column label="身份" width="110"><template #default="{ row }"><el-tag :type="row.role === 2 ? 'warning' : row.role === 1 ? 'primary' : 'info'" effect="plain">{{ roleLabel(row.role) }}</el-tag></template></el-table-column>
      <el-table-column label="操作" min-width="230"><template #default="{ row }"><div class="team-actions">
        <el-button v-if="row.allowed_actions.includes('change_role')" link type="primary" :disabled="busy" @click="changeRole(row)">{{ row.role === 1 ? '设为成员' : '设为管理员' }}</el-button>
        <el-button v-if="row.allowed_actions.includes('transfer')" link type="primary" :disabled="busy" @click="transfer(row)">转让</el-button>
        <el-button v-if="row.allowed_actions.includes('remove')" link type="danger" :disabled="busy" @click="remove(row)">移除</el-button>
      </div></template></el-table-column>
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
import { type Member, type TeamProject, errorText, notifyTeamChanged, personName, roleLabel, teamRequest } from '@/api/team'
import { useTeamList } from '@/composables/useTeamList'
const visible = ref(false), busy = ref(false), project = ref<TeamProject | null>(null), search = ref(''), page = ref(1)
// Mounted only after a project is selected by the parent.
const props = defineProps<{ initialProject: TeamProject }>()
project.value = props.initialProject; visible.value = true
const { rows, count, loading, error } = useTeamList<Member>(() => `/team/projects/${project.value!.id}/members/`, () => ({ search: search.value, page: page.value }), [search, page])
watch(search, () => { page.value = 1 })
async function perform(message: string, action: () => Promise<unknown>, close = false) {
  if (busy.value) return
  try { await ElMessageBox.confirm(message, project.value!.name, { customClass: 'ast-glass-message', closeIcon: X, icon: CircleAlert, modalClass: 'ast-glass-mask', type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }) } catch { return }
  busy.value = true
  try { await action(); teamMessage.success('操作成功'); if (close) visible.value = false; notifyTeamChanged() }
  catch (e) { teamMessage.error(errorText(e)) } finally { busy.value = false }
}
function changeRole(row: Member) { return perform(`将 ${personName(row.user)} 设置为${row.role === 1 ? '成员' : '管理员'}？`, () => teamRequest(`/team/projects/${project.value!.id}/members/`, 'PATCH', { user: row.user.id, role: row.role === 1 ? 0 : 1 })) }
function remove(row: Member) { return perform(`移除 ${personName(row.user)} 后，该用户将无法访问此项目。`, () => teamRequest(`/team/projects/${project.value!.id}/members/`, 'DELETE', { user: row.user.id })) }
function transfer(row: Member) { return perform(`将项目转让给 ${personName(row.user)}？转让后，你将成为管理员。`, () => teamRequest(`/team/projects/${project.value!.id}/transfer/`, 'POST', { user: row.user.id }), true) }
</script>
