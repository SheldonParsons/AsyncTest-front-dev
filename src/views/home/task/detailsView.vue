<template>
  <el-descriptions
    :title="t('project.MockRecord.dialog.title')"
    :column="3"
    border
  >
    <el-descriptions-item
      :label="t('project.approve.task.promoter')"
      label-align="right"
      align="center"
      label-class-name="my-label"
      class-name="my-content"
      width="200px"
      >{{ content.user }}</el-descriptions-item
    >
    <el-descriptions-item
      :label="t('project.approve.task.type')"
      label-align="right"
      align="center"
      >{{ getEventType(content.pixel_type) }}</el-descriptions-item
    >
    <el-descriptions-item
      :label="t('project.approve.task.taskStatus')"
      label-align="right"
      align="center"
    >
      <el-tag
        :type="
          ['warning', 'warning', 'danger', 'success', 'info'][content.status]
        "
        size="small"
        >{{ t('project.approve.event.es').split(',')[content.status] }}</el-tag
      >
    </el-descriptions-item>
    <el-descriptions-item
      :label="t('project.approve.task.time')"
      label-align="right"
      align="center"
    >
      <el-tag size="small">{{
        tools.getLocaleDateTime(content.add_time, false)
      }}</el-tag>
    </el-descriptions-item>
    <el-descriptions-item
      :label="t('project.approve.task.applyProject')"
      label-align="right"
      align="center"
      span="2"
      ><span
        class="method-desc"
        :style="{
          '--method-color': GlobalStatus.methodColor[1]
        }"
        >{{ content.project_name }}</span
      ></el-descriptions-item
    >
    <el-descriptions-item
      :label="t('project.approve.node')"
      label-align="right"
      align="center"
      span="3"
      ><el-steps
        :active="getEventActive(content)"
        :finish-status="
          ['wait', 'process', 'error', 'success', 'process'][content.status]
        "
        align-center
        style="margin-top: 20px"
      >
        <el-step :title="content.approve_process[0].name"
          ><template #description
            ><div>
              <div>
                {{
                  t('project.approve.task.promoter') +
                  '：' +
                  content.approve_process[0].record[0].user
                }}
              </div>
              <div>
                {{
                  t('project.approve.task.reason') +
                  '：' +
                  content.approve_process[0].record[0].result
                }}
              </div>
              <div>
                {{
                  t('project.approve.task.promoRemark') +
                  '：' +
                  content.approve_process[0].record[0].result_desc
                }}
              </div>
              <div>
                {{
                  t('project.approve.task.time') +
                  '：' +
                  tools.getLocaleDateTime(
                    content.approve_process[0].record[0].add_time,
                    false
                  )
                }}
              </div>
            </div>
          </template></el-step
        >
        <el-step :title="content.approve_process[1].name">
          <template #description
            ><div>
              <el-divider class="approve-divider">{{
                t('project.approve.task.ApproveBy')
              }}</el-divider>
              <el-tooltip
                class="box-item"
                effect="light"
                placement="top"
                content="
                  项目管理员
                "
                v-for="(item, index) in content.approve_process[1].approve_list
                  .group[0].user"
                :key="index"
              >
                <el-tag class="approve-person">{{ item }}</el-tag>
              </el-tooltip>
              <el-tooltip
                class="box-item"
                effect="light"
                placement="top"
                content="
                  项目创建者
                "
                v-for="(item, index) in content.approve_process[1].approve_list
                  .group[1].user"
                :key="index"
                ><el-tag class="approve-person">{{ item }}</el-tag></el-tooltip
              >
              <el-tooltip
                class="box-item"
                effect="light"
                placement="top"
                :content="content.approve_process[1].approve_list.single"
                v-for="(item, index) in content.approve_process[1].approve_list
                  .single"
                :key="index"
                ><el-tag class="approve-person">{{ item }}</el-tag></el-tooltip
              >
              <el-divider class="approve-divider">{{
                t('project.approve.task.record')
              }}</el-divider>
              <el-card
                v-for="(item, index) in content.approve_process[1].record"
                :key="index"
                class="approve-card"
                shadow="always"
              >
                <div class="approve-card-person">
                  <span
                    >{{ item.user }}
                    {{ tools.getLocaleDateTime(item.add_time, false) }}</span
                  >
                </div>
                <div
                  class="approve-card-remark"
                  :style="{
                    '--private-border-color':
                      item.result === 1 ? '#3CB371' : '#FF6A6A'
                  }"
                >
                  <span>{{
                    t('project.approve.task.promoRemark') +
                    '：' +
                    item.result_desc
                  }}</span>
                </div>
              </el-card>
            </div>
          </template>
        </el-step>
        <el-step :title="content.approve_process[2].name" /> </el-steps
    ></el-descriptions-item>
  </el-descriptions>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import GlobalStatus from '@/global'
import tools from '@/utils/tools'
const { t } = useI18n()
defineProps({
  content: {
    type: Object as any
  }
})
function getEventType(index: any) {
  return ['', t('project.approve.task.project')][index]
}

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
</script>
<style lang="scss">
.approve-divider {
  .el-divider__text {
    padding: 0 10px;
  }
}
.approve-card {
  border-radius: 4px 4px 4px 0px;
  .el-card__body {
    padding: 0px;
  }
  .approve-card-person {
    background: var(--dialog-color);
    color: white;
    text-align: start;
    span {
      padding: 5px;
    }
  }
  .approve-card-remark {
    padding: 10px;
    border-left: 2px solid;
    border-color: var(--private-border-color);
  }
}
</style>

<style lang="scss" scoped>
.approve-person {
  margin-right: 5px;
  margin-top: 5px;
  cursor: default;
}
</style>
