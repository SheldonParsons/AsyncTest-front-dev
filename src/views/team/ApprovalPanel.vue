<template>
  <div>
    <el-radio-group v-if="global" v-model="group" aria-label="审批分组">
      <template v-if="global"><el-radio-button value="pending">待审批</el-radio-button><el-radio-button value="processed">已审批</el-radio-button><el-radio-button value="all">全部记录</el-radio-button></template>
    </el-radio-group>
    <div class="team-toolbar">
      <el-input :clear-icon="CircleX" v-model="search" class="team-search" :prefix-icon="Search" clearable placeholder="搜索项目、申请人或处理人" aria-label="搜索审批" />
      <el-select :suffix-icon="ChevronDown" :clear-icon="CircleX" v-model="status" clearable placeholder="处理结果" aria-label="处理结果"><el-option v-for="value in ['pending', 'approved', 'rejected', 'withdrawn', 'invalid']" :key="value" :label="statusLabel(value)" :value="value" /></el-select>
      <el-date-picker :prefix-icon="CalendarInputIcon" :clear-icon="DateClearIcon" v-model="dates" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" style="max-width: 280px" ><template #prev-year><ChevronsLeft :size="16" aria-hidden="true" /></template><template #prev-month><ChevronLeft :size="16" aria-hidden="true" /></template><template #next-year><ChevronsRight :size="16" aria-hidden="true" /></template><template #next-month><ChevronRight :size="16" aria-hidden="true" /></template></el-date-picker>
      <span class="team-count">{{ count }} 条记录</span><el-button @click="reload">刷新</el-button>
    </div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" class="team-alert" />
    <TeamBusy :busy="loading"><el-table :data="rows" empty-text="暂无审批记录" @row-dblclick="showDetail">
      <el-table-column label="申请人" min-width="160"><template #default="{ row }"><div class="team-person"><el-avatar :size="32" :src="row.applicant.avatar_url">{{ (personName(row.applicant) || '?').slice(0, 1) }}</el-avatar><div><strong>{{ personName(row.applicant) }}</strong><small>{{ row.applicant.username }}</small></div></div></template></el-table-column>
      <el-table-column prop="project.name" label="项目" min-width="170" show-overflow-tooltip />
      <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'info'" effect="plain">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
      <el-table-column label="申请时间" min-width="175"><template #default="{ row }">{{ formatTime(row.created_at) }}</template></el-table-column>
      <el-table-column label="处理人" min-width="120"><template #default="{ row }">{{ personName(row.reviewer) }}</template></el-table-column>
      <el-table-column label="操作" min-width="180"><template #default="{ row }"><div class="team-actions">
        <el-button link type="primary" @click="showDetail(row)">详情</el-button>
        <el-button v-if="row.allowed_actions.includes('review')" link type="primary" :disabled="busy" @click="review(row, 'approved')">通过</el-button>
        <el-button v-if="row.allowed_actions.includes('review')" link type="danger" :disabled="busy" @click="review(row, 'rejected')">驳回</el-button>
        <el-button v-if="row.allowed_actions.includes('withdraw')" link :disabled="busy" @click="withdraw(row)">撤回</el-button>
      </div></template></el-table-column>
    </el-table></TeamBusy>
    <TeamPagination class="team-pagination" v-model:current-page="page" :page-size="20" :total="count" />
    <el-drawer :show-close="false" append-to-body class="ast-glass-drawer" modal-class="ast-glass-mask" v-model="detailVisible" title="加入申请详情" size="min(560px, 95vw)">
    <template #header="{ close, titleId, titleClass }">
      <span :id="titleId" :class="titleClass">{{ '加入申请详情' }}</span>
      <button type="button" class="el-drawer__close-btn" aria-label="关闭弹出层" @click="close"><X :size="18" aria-hidden="true" /></button>
    </template>
      <div v-if="detail" class="team-detail">
        <div><label>项目</label><p>{{ detail.project.name }}</p></div>
        <div><label>申请人</label><p>{{ personName(detail.applicant) }} · {{ detail.applicant.username }}</p></div>
        <div><label>申请理由</label><p>{{ detail.reason || '未填写' }}</p></div>
        <div><label>当前状态</label><p>{{ statusLabel(detail.status) }}</p></div>
        <div v-if="detail.decision_note"><label>处理意见</label><p>{{ detail.decision_note }}</p></div>
        <el-timeline><el-timeline-item v-for="item in detail.history" :key="item.id" :timestamp="formatTime(item.created_at)"><strong>{{ personName(item.actor) }}</strong><p>{{ historyLabel(item.action) }}{{ item.note ? `：${item.note}` : '' }}</p></el-timeline-item></el-timeline>
      </div>
    </el-drawer>
  </div>
</template>
<script setup lang="ts">
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CircleAlert, CircleX, Search, X } from '@/components/icons/lucide'
import { teamMessage } from './feedback'
import TeamBusy from './TeamBusy.vue'
import TeamPagination from './TeamPagination.vue'
import { computed, ref, watch, defineComponent, h } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useTeamList } from '@/composables/useTeamList'
import { type JoinRequest, errorText, formatTime, notifyTeamChanged, personName, statusLabel, teamRequest } from '@/api/team'
// DatePicker 当前版本只接受对象式 icon 组件；保持内部使用 Lucide。
const CalendarInputIcon = defineComponent({ setup: () => () => h(CalendarDays, { size: 16 }) })
const DateClearIcon = defineComponent({ setup: () => () => h(CircleX, { size: 16 }) })
const props = defineProps<{ global?: boolean }>()
const group = ref('pending'), search = ref(''), status = ref(''), dates = ref<string[]>([]), page = ref(1), busy = ref(false)
const detailVisible = ref(false), detail = ref<JoinRequest | null>(null)
const base = computed(() => props.global ? '/admin/join-requests/' : '/team/join-requests/')
const { rows, count, loading, error, reload } = useTeamList<JoinRequest>(() => base.value, () => ({
  group: props.global ? undefined : 'all', search: search.value, page: page.value,
  status: status.value || (props.global && group.value !== 'all' ? group.value : undefined),
  date_from: dates.value?.[0], date_to: dates.value?.[1],
}), [group, search, status, dates, page])
watch([group, search, status, dates], () => { page.value = 1 })
watch(group, () => { status.value = '' })
function historyLabel(value: string) { return ({ apply: '提交申请', grant: '授予项目身份', approved: '审批通过', rejected: '审批驳回', withdrawn: '撤回申请', invalid: '申请失效', legacy_decision: '历史审批' } as Record<string, string>)[value] || value }
async function showDetail(row: JoinRequest) {
  try { detail.value = await teamRequest<JoinRequest>(`${base.value}${row.id}/`); detailVisible.value = true }
  catch (e) { teamMessage.error(errorText(e)) }
}
async function review(row: JoinRequest, decision: string) {
  if (busy.value) return
  let note = ''
  try {
    const result = await ElMessageBox.prompt(`${decision === 'approved' ? '通过' : '驳回'} ${personName(row.applicant)} 加入「${row.project.name}」的申请`, '处理加入申请', {
      customClass: 'ast-glass-message', closeIcon: X, icon: CircleAlert, modalClass: 'ast-glass-mask', inputType: 'textarea', inputPlaceholder: '处理意见（选填，最多 500 字）', confirmButtonText: decision === 'approved' ? '通过申请' : '驳回申请', cancelButtonText: '取消', inputValidator: value => !value || value.length <= 500 || '最多 500 字',
    })
    note = result.value || ''
  } catch { return }
  busy.value = true
  try { await teamRequest(`${base.value}${row.id}/decision/`, 'POST', { decision, note }); teamMessage.success('申请已处理'); notifyTeamChanged() }
  catch (e) { teamMessage.error(errorText(e)); await reload() } finally { busy.value = false }
}
async function withdraw(row: JoinRequest) {
  try { await ElMessageBox.confirm(`撤回加入「${row.project.name}」的申请？`, '撤回申请', { customClass: 'ast-glass-message', closeIcon: X, icon: CircleAlert, modalClass: 'ast-glass-mask', confirmButtonText: '撤回', cancelButtonText: '取消' }) } catch { return }
  busy.value = true
  try { await teamRequest(`/team/join-requests/${row.id}/withdraw/`, 'POST'); notifyTeamChanged() }
  catch (e) { teamMessage.error(errorText(e)) } finally { busy.value = false }
}
</script>
