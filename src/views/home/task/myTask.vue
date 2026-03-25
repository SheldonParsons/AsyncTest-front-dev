<template>
  <el-row v-if="d.list.length > 0" class="main-data">
    <el-col :offset="1" :span="21">
      <table
        class="styled-table"
        v-infinite-scroll="load"
        :infinite-scroll-disabled="disInfinite"
      >
        <thead>
          <tr>
            <th>{{ t('project.approve.task.type') }}</th>
            <th>{{ t('project.approve.task.promoter') }}</th>
            <th>{{ t('project.approve.task.promoRemark') }}</th>
            <th>
              {{ t('project.approve.task.applyProject') }}
            </th>
            <th>
              {{ t('project.approve.task.time') }}
            </th>
            <th>{{ t('project.approve.task.taskStatus') }}</th>
            <th>{{ t('project.dataCol.action') }}</th>
          </tr>
        </thead>
        <tbody>
          <transition-group name="fade" appear>
            <tr v-for="item in d.list" :key="item">
              <td class="active-row copy-instance">
                {{ getEventType(item.pixel_type) }}
              </td>
              <td class="disappear-auto desc-td">
                <div style="font-size: 16px">{{ item.apply_user }}</div>
              </td>
              <td class="active-row copy-instance">
                <div style="font-size: 16px">{{ item.apply_desc }}</div>
              </td>
              <td class="active-row copy-instance">
                <div style="font-size: 16px">{{ item.project_name }}</div>
              </td>
              <td class="disappear-auto desc-td">
                <div style="font-size: 16px">
                  {{ tools.getLocaleDateTime(item.add_time, false) }}
                </div>
              </td>
              <td class="">
                <div style="font-size: 16px">
                  <el-tag
                    :type="
                      [
                        'warning',
                        'success',
                        'danger',
                        'success',
                        'danger',
                        'info'
                      ][item.result]
                    "
                    size="small"
                    >{{
                      t('project.approve.task.st').split(',')[item.result]
                    }}</el-tag
                  >
                </div>
              </td>
              <!-- <td class="disappear-auto">{{ item.create_by }}</td> -->
              <td style="width: 15%">
                <div class="action-td action-view">
                  <CButton @click="detailsTask(item)"
                    ><el-icon><MoreFilled /></el-icon
                  ></CButton>
                  <CButton
                    style="margin-left: 10px"
                    v-if="item.result === 0"
                    @click="approveTask(item)"
                    ><el-icon><Select /></el-icon
                  ></CButton>
                </div>
              </td>
            </tr>
          </transition-group>
        </tbody>
      </table>
    </el-col>
  </el-row>
  <el-empty v-else :image-size="200" />
  <CommonDialog
    :dialog="showApproveProjectDialog"
    :dWidth="45"
    :dTop="10"
    :hasFooter="true"
    :footerConfirmDesc="t('project.approve.task.dialog.confirmFooter')"
    :footerCancelDesc="t('project.approve.task.dialog.rejectFooter')"
    :headerText="t('project.approve.task.dialog.header')"
    @closed="closedApproveProjectDialog"
    @cancel="rejectApproveProjectDialog"
    @confirm="confirmApproveProject"
  >
    <CommonTextarea
      v-model="approveDesc"
      class="create-child"
      :placeholder="$t('project.approve.task.placeholder')"
      :maxlength="500"
    ></CommonTextarea>
  </CommonDialog>
  <CommonDialog
    :dialog="showTaskDetailDialog"
    :dWidth="80"
    :dTop="5"
    :headerText="t('project.approve.task.dialog.header')"
    @closed="closedTaskDetailDialog"
  >
    <DetailsView :content="detailData"></DetailsView>
  </CommonDialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ApiGetTasks,
  ApiApproveTask,
  ApiGetSingleTask
} from '@/api/pixel/event'
import CButton from '@/components/common/button/CButton.vue'
import CommonDialog from '@/components/layout/dialogs/commonDialog.vue'
import CommonTextarea from '@/components/common/input/commonTextarea.vue'
import tools from '@/utils/tools'
import DetailsView from './detailsView.vue'
const { proxy }: any = getCurrentInstance()

const { t } = useI18n()
// 数据主体！！！
const d = reactive({
  list: [] as any
})
// 是否禁用无限滚动
const disInfinite = ref(true)

// 当前页数
const currentPage = ref(1)

// 永久禁止无限滚动
const alwaysDisInfinite = ref(false)

// 审批加入项目对话框
const showApproveProjectDialog = ref(false)

// 审批理由
const approveDesc = ref('')

// 当前审批任务ID
const currentTaskId = ref(-1)

// 任务详情对话框
const showTaskDetailDialog = ref(false)

// 审批任务详情内容
const detailData = ref({})

onMounted(async () => {
  disInfinite.value = true
  getData()
})

function closedApproveProjectDialog() {
  approveDesc.value = ''
  showApproveProjectDialog.value = false
}

function confirmApproveProject() {
  sendConfirmApproveProject(1)
}

function rejectApproveProjectDialog() {
  sendConfirmApproveProject(2)
}

async function getApiGetSingleTask(id: Number) {
  return await ApiGetSingleTask(id, {}).then((data) => {
    return data
  })
}

function closedTaskDetailDialog() {
  showTaskDetailDialog.value = false
}

function sendConfirmApproveProject(result: Number) {
  if (approveDesc.value === '') {
    window.$toast({ title: t('project.approve.emptyApproveReason'), type: 'warning' })
  } else {
    const data = {
      desc: approveDesc.value,
      result,
      id: currentTaskId.value
    }
    ApiApproveTask(currentTaskId.value, data).then((data: any) => {
      if (data.non_field_errors) {
        window.$toast({ title: t('project.approve.dupApprove'), type: 'warning' })
      } else {
        console.log(data)
        showApproveProjectDialog.value = false
        approveDesc.value = ''
        resetData()
        getData()
      }
    })
  }
  console.log(approveDesc.value)
}

function resetData() {
  disInfinite.value = true
  currentPage.value = 1
  d.list = []
}

function getEventType(index: any) {
  return ['', t('project.approve.task.project')][index]
}

async function load() {
  if (alwaysDisInfinite.value === false) {
    disInfinite.value = true
    await getData()
  }
}

function getData(size = 10) {
  const data = {
    page: currentPage.value,
    size
  }

  ApiGetTasks(data).then((data: any) => {
    console.log(data)
    if (data.detail) {
      window.$toast({ title: t('response.lessData'), type: 'warning' })
      clearStatus()
      alwaysDisInfinite.value = true
      return
    }
    if (data.results && data.results.length > 0) {
      let count = 0
      const timer = setInterval(() => {
        d.list.push(data.results[count])
        count = count + 1
        if (count >= data.results.length) {
          currentPage.value = currentPage.value + size / 10
          clearInterval(timer)
          clearStatus()
        }
      }, 10)
    }
  })
}

// 开启无限滚动
function clearStatus() {
  disInfinite.value = false
}

async function detailsTask(item: any) {
  const data: any = await getApiGetSingleTask(item.id)
  showTaskDetailDialog.value = true
  console.log(data)
  detailData.value = data.data.approve
}
function approveTask(item: any) {
  showApproveProjectDialog.value = true
  currentTaskId.value = item.id
}
</script>

<style lang="scss" scoped>
.styled-table {
  border-collapse: collapse;
  font-size: 0.9em;
  width: 100%;
  border-radius: 5px 5px 0px 0px;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
  .action-td {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
  }
  .desc-td {
    .desc-div {
      max-width: 20vw;
      text-align: center;
      font-size: 15px;
    }
  }
  .desc-td div {
    overflow: hidden;
    word-break: break-all;
    text-overflow: ellipsis;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    white-space: nowrap;
    margin: 0;
    cursor: default;
    font-size: 14px;
  }
}

.styled-table thead tr {
  background-image: linear-gradient(
    90deg,
    var(--global-theme-color) 70%,
    var(--global-theme-light-color)
  );
  color: #ffffff;
  text-align: left;
}

.styled-table th,
.styled-table td {
  padding: 12px 15px;
}
.styled-table td:nth-child(1) {
  width: 100px;
}

.styled-table tbody tr {
  border-bottom: 1px solid #dddddd;
}

.styled-table tbody tr:nth-of-type(even) {
  background-color: #f3f3f3;
}

.styled-table tbody tr:last-of-type {
  border-bottom: 2px solid var(--global-theme-color);
}

.styled-table tbody tr td.active-row {
  font-weight: bold;
  color: var(--global-theme-color);
}
</style>
