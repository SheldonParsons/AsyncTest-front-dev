<template>
  <TeamLayout title="全局用户管理" description="查看 AST 用户，并为有效账号设置项目成员或管理员身份。" admin>
    <div class="team-toolbar"><el-input :clear-icon="CircleX" v-model="search" class="team-search" :prefix-icon="Search" clearable placeholder="搜索账号或昵称" aria-label="搜索用户" /><el-select :suffix-icon="ChevronDown" :clear-icon="CircleX" v-model="active" aria-label="账号状态"><el-option label="全部账号" value="all" /><el-option label="正常" value="true" /><el-option label="已停用" value="false" /></el-select><span class="team-count">{{ count }} 位用户</span><el-button @click="reload">刷新</el-button></div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" class="team-alert" />
    <TeamBusy :busy="loading"><el-table :data="rows" empty-text="没有匹配的用户">
      <el-table-column label="用户" min-width="210"><template #default="{ row }"><div class="team-person"><el-avatar :size="36" :src="row.avatar_url">{{ (personName(row) || '?').slice(0, 1) }}</el-avatar><div><strong>{{ personName(row) }}</strong><small>{{ row.username }}</small></div></div></template></el-table-column>
      <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.is_active ? 'success' : 'info'" effect="plain">{{ row.is_active ? '正常' : '已停用' }}</el-tag></template></el-table-column>
      <el-table-column prop="project_count" label="有效项目" width="100" />
      <el-table-column label="注册时间" min-width="175"><template #default="{ row }">{{ formatTime(row.date_joined) }}</template></el-table-column>
      <el-table-column label="最近登录" min-width="175"><template #default="{ row }">{{ formatTime(row.last_login) }}</template></el-table-column>
      <el-table-column label="操作" width="130"><template #default="{ row }"><el-button link type="primary" @click="openUser(row)">项目身份</el-button></template></el-table-column>
    </el-table></TeamBusy>
    <TeamPagination class="team-pagination" v-model:current-page="page" :page-size="20" :total="count" />
    <GlobalUserProjects v-if="selected" :key="drawerKey" :user="selected" />
  </TeamLayout>
</template>
<script setup lang="ts">
import { ChevronDown, CircleX, Search } from '@/components/icons/lucide'
import TeamBusy from './TeamBusy.vue'
import TeamPagination from './TeamPagination.vue'
import { ref, watch } from 'vue'
import TeamLayout from './TeamLayout.vue'
import GlobalUserProjects from './GlobalUserProjects.vue'
import { useTeamList } from '@/composables/useTeamList'
import { type GlobalUser, personName, formatTime } from '@/api/team'
const search = ref(''), active = ref('all'), page = ref(1), selected = ref<GlobalUser | null>(null), drawerKey = ref(0)
const { rows, count, loading, error, reload } = useTeamList<GlobalUser>(() => '/admin/users/', () => ({ search: search.value, active: active.value, page: page.value }), [search, active, page])
watch([search, active], () => { page.value = 1 })
function openUser(user: GlobalUser) { selected.value = user; drawerKey.value++ }
</script>
