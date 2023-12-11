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
            <th>{{ t('project.approve.event.type') }}</th>
            <th>{{ t('project.approve.event.status') }}</th>
            <!-- <th>{{ t('project.approve.event.promoter') }}</th> -->
            <th class="disappear-auto">
              {{ t('project.approve.event.applyProject') }}
            </th>
            <th class="disappear-auto">
              {{ t('project.approve.event.time') }}
            </th>
            <th class="disappear-auto">
              {{ t('project.approve.event.approveStatus') }}
            </th>
            <th>{{ t('project.dataCol.action') }}</th>
          </tr>
        </thead>
        <tbody>
          <transition-group name="fade" appear>
            <tr v-for="item in d.list" :key="item">
              <td class="active-row copy-instance">
                {{ getEventType(item.pixel_type) }}
              </td>
              <td class="active-row copy-instance">
                <el-steps
                  :active="getEventActive(item)"
                  :finish-status="
                    ['wait', 'process', 'error', 'success', 'process'][
                      item.status
                    ]
                  "
                >
                  <el-tooltip
                    class="box-item"
                    effect="light"
                    placement="left"
                    v-for="(schedules, scheduleIndex) in item.approve_process"
                    :content="schedules.name"
                    :key="scheduleIndex"
                  >
                    <el-step />
                  </el-tooltip>
                </el-steps>
              </td>
              <!-- <td class="disappear-auto desc-td">
                <div style="font-size: 16px">{{ item.user }}</div>
              </td> -->
              <td class="active-row copy-instance">
                <div style="font-size: 16px">{{ item.project_name }}</div>
              </td>
              <td class="disappear-auto desc-td">
                <div style="font-size: 16px">
                  {{ tools.getLocaleDateTime(item.add_time, false) }}
                </div>
              </td>
              <td class="active-row copy-instance">
                <el-tag
                  :type="
                    ['warning', 'warning', 'danger', 'success', 'info'][
                      item.status
                    ]
                  "
                  size="small"
                  >{{
                    t('project.approve.event.es').split(',')[item.status]
                  }}</el-tag
                >
              </td>
              <td style="width: 15%">
                <div class="action-td action-view">
                  <CButton @click="detailsTask(item)"
                    ><el-icon><MoreFilled /></el-icon
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
import { ApiGetEvents } from '@/api/pixel/event'
import CommonDialog from '@/components/layout/dialogs/commonDialog.vue'
import CButton from '@/components/common/button/CButton.vue'
import DetailsView from './detailsView.vue'
import tools from '@/utils/tools'
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

// 任务详情对话框
const showTaskDetailDialog = ref(false)

// 审批任务详情内容
const detailData = ref({})

onMounted(async () => {
  disInfinite.value = true
  getData()
})

function getEventActive(item: any) {
  if (item.status === 0 || item.status === 1) {
    for (let i = 0; i < item.approve_process.length; i++) {
      if (item.approve_process[i].code === item.current_node) {
        return i
      }
    }
  }
  if (item.status === 2 || item.status === 3) {
    return item.approve_process.length
  }
}

function getEventType(index: any) {
  return ['', t('project.approve.event.project')][index]
}

function closedTaskDetailDialog() {
  showTaskDetailDialog.value = false
}

async function load() {
  if (alwaysDisInfinite.value === false) {
    disInfinite.value = true
    await getData()
  }
}

function getData(size = 10) {
  console.log('in get')

  const data = {
    page: currentPage.value,
    size
  }

  ApiGetEvents(data).then((data: any) => {
    console.log(data)
    if (data.detail) {
      proxy.$message({
        message: t('response.lessData'),
        duration: 3000,
        type: 'warning'
      })
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

function detailsTask(item: any) {
  showTaskDetailDialog.value = true
  detailData.value = item
  console.log(detailData.value)
}
</script>

<style lang="scss" scoped>
.styled-table {
  border-collapse: collapse;
  font-size: 0.9em;
  font-family: sans-serif;
  width: 100%;
  border-radius: 5px 5px 0px 0px;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
  .action-td {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
  }
  th:nth-child(2) {
    text-align: center;
    min-width: 200px;
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
