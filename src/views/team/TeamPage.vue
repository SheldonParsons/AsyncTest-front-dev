<template>
  <TeamLayout title="团队管理" description="在这里管理项目成员、申请加入项目，并集中处理审批。">
    <FeatureGuide kind="team" />
    <el-tabs v-model="tab" class="team-section-tabs">
      <el-tab-pane label="我管理的项目" name="managed"><template #label><span class="team-tab-label"><Settings2 :size="16" :stroke-width="1.8" aria-hidden="true" />我管理的项目</span></template></el-tab-pane>
      <el-tab-pane label="我加入的项目" name="joined"><template #label><span class="team-tab-label"><UsersRound :size="16" :stroke-width="1.8" aria-hidden="true" />我加入的项目</span></template></el-tab-pane>
      <el-tab-pane label="未加入的项目" name="unjoined"><template #label><span class="team-tab-label"><Compass :size="16" :stroke-width="1.8" aria-hidden="true" />未加入的项目</span></template></el-tab-pane>
      <el-tab-pane label="审批内容" name="approvals"><template #label><span class="team-tab-label"><ClipboardCheck :size="16" :stroke-width="1.8" aria-hidden="true" />审批内容</span></template></el-tab-pane>
    </el-tabs>
    <ApprovalPanel v-if="tab === 'approvals'" />
    <template v-else>
      <div class="team-toolbar"><el-input :clear-icon="CircleX" v-model="search" class="team-search" :prefix-icon="Search" clearable placeholder="搜索项目名称" aria-label="搜索项目" /><span class="team-count">{{ count }} 个项目</span><el-button @click="reload">刷新</el-button></div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" class="team-alert" />
      <TeamBusy :busy="loading"><el-table :data="rows" empty-text="此分组暂无项目">
        <el-table-column label="项目" min-width="240"><template #default="{ row }"><div class="team-project-cell"><div class="team-project-cell__icon"><FolderOpen :size="19" :stroke-width="1.8" aria-hidden="true" /></div><div><div class="team-project-title">{{ row.name }}</div><div class="team-muted">{{ row.desc || '暂无项目简介' }}</div></div></div></template></el-table-column>
        <el-table-column label="创建者" min-width="140"><template #default="{ row }">{{ personName(row.creator) }}</template></el-table-column>
        <el-table-column label="我的身份" width="115"><template #default="{ row }"><el-tag :type="row.role === 2 ? 'warning' : row.role === 1 ? 'primary' : 'info'" effect="plain">{{ roleLabel(row.role) }}</el-tag></template></el-table-column>
        <el-table-column label="操作" min-width="270"><template #default="{ row }"><div class="team-actions">
          <el-button v-if="row.allowed_actions.includes('view_members')" link type="primary" @click="openMembers(row)">{{ tab === 'managed' ? '管理成员' : '查看成员' }}</el-button>
          <template v-if="tab === 'managed'">
            <el-button v-if="row.allowed_actions.includes('edit_project')" link type="primary" @click="edit(row)">项目信息</el-button>
            <el-button v-if="row.allowed_actions.includes('delete_project')" link type="danger" :disabled="busy" @click="removeProject(row)">删除</el-button>
          </template>
          <el-button v-if="row.allowed_actions.includes('leave')" link :disabled="busy" @click="leave(row)">退出</el-button>
          <template v-if="row.role === null">
            <template v-if="row.pending_request_id"><el-tag effect="plain">审批中</el-tag><el-button link :disabled="busy" @click="withdraw(row)">撤回</el-button></template>
            <el-button v-else type="primary" plain size="small" @click="applyRef?.open(row)">申请加入</el-button>
          </template>
        </div></template></el-table-column>
      </el-table></TeamBusy>
      <TeamPagination class="team-pagination" v-model:current-page="page" :page-size="20" :total="count" />
    </template>
    <ApplyDialog ref="applyRef" />
    <MemberDrawer v-if="selected" :key="drawerKey" :initial-project="selected" />
    <el-dialog :close-icon="X" append-to-body class="ast-glass-dialog" modal-class="ast-glass-mask" align-center v-model="editing" title="项目信息" width="480px" :close-on-click-modal="!busy">
      <el-form label-position="top"><el-form-item label="项目名称"><el-input :clear-icon="CircleX" v-model="editName" :maxlength="100" /></el-form-item><el-form-item label="项目简介"><el-input :clear-icon="CircleX" v-model="editDesc" type="textarea" :rows="4" :maxlength="3000" /></el-form-item></el-form>
      <template #footer><el-button @click="editing = false" :disabled="busy">取消</el-button><el-button type="primary" :loading="busy" :loading-icon="LoaderCircle" @click="saveProject">保存</el-button></template>
    </el-dialog>
  </TeamLayout>
</template>
<script setup lang="ts">
import { CircleAlert, CircleX, ClipboardCheck, Compass, FolderOpen, LoaderCircle, Search, Settings2, UsersRound, X } from '@/components/icons/lucide'
import { teamMessage } from './feedback'
import TeamBusy from './TeamBusy.vue'
import TeamPagination from './TeamPagination.vue'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import TeamLayout from './TeamLayout.vue'
import FeatureGuide from '@/components/layout/FeatureGuide.vue'
import MemberDrawer from './MemberDrawer.vue'
import ApplyDialog from './ApplyDialog.vue'
import ApprovalPanel from './ApprovalPanel.vue'
import { useTeamList } from '@/composables/useTeamList'
import { type TeamProject, errorText, notifyTeamChanged, personName, roleLabel, teamRequest } from '@/api/team'
const route = useRoute(), router = useRouter()
const tabs = ['managed', 'joined', 'unjoined', 'approvals']
const tab = ref(tabs.includes(String(route.query.tab)) ? String(route.query.tab) : 'managed')
const search = ref(''), page = ref(1), busy = ref(false), selected = ref<TeamProject | null>(null), drawerKey = ref(0)
const applyRef = ref<InstanceType<typeof ApplyDialog>>()
const editing = ref(false), editName = ref(''), editDesc = ref(''), editId = ref<number>()
const { rows, count, loading, error, reload } = useTeamList<TeamProject>(() => '/team/projects/', () => ({ group: tab.value === 'approvals' ? 'joined' : tab.value, search: search.value, page: page.value }), [tab, search, page])
watch([tab, search], () => { page.value = 1 })
watch(tab, value => { void router.replace({ path: route.path, query: { ...route.query, tab: value } }) })
function openMembers(row: TeamProject) { selected.value = row; drawerKey.value++ }
async function confirmed(message: string, action: () => Promise<unknown>) {
  if (busy.value) return
  try { await ElMessageBox.confirm(message, '确认项目操作', { customClass: 'ast-glass-message', closeIcon: X, icon: CircleAlert, modalClass: 'ast-glass-mask', confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }) } catch { return }
  busy.value = true
  try { await action(); teamMessage.success('操作成功'); notifyTeamChanged() }
  catch (e) { teamMessage.error(errorText(e)); await reload() } finally { busy.value = false }
}
function leave(row: TeamProject) { return confirmed(`退出「${row.name}」后，需要重新申请才能加入。`, () => teamRequest(`/team/projects/${row.id}/leave/`, 'POST')) }
function removeProject(row: TeamProject) { return confirmed(`删除「${row.name}」后，所有成员都将无法再访问此项目。`, () => teamRequest(`/team/projects/${row.id}/`, 'DELETE')) }
function withdraw(row: TeamProject) { return confirmed(`撤回加入「${row.name}」的申请？`, () => teamRequest(`/team/join-requests/${row.pending_request_id}/withdraw/`, 'POST')) }
function edit(row: TeamProject) { editId.value = row.id; editName.value = row.name; editDesc.value = row.desc; editing.value = true }
async function saveProject() {
  if (busy.value || !editName.value.trim()) return
  busy.value = true
  try { await teamRequest(`/team/projects/${editId.value}/`, 'PATCH', { name: editName.value.trim(), desc: editDesc.value }); editing.value = false; notifyTeamChanged() }
  catch (e) { teamMessage.error(errorText(e)) } finally { busy.value = false }
}
</script>
