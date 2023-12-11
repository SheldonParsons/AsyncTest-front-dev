<template>
  <el-descriptions
    :title="t('project.MockRecord.dialog.title')"
    :column="3"
    border
  >
    <el-descriptions-item
      :label="t('project.MockRecord.dialog.url')"
      label-align="right"
      align="center"
      span="3"
      >{{
        'http://' +
        data.server_host +
        data.path +
        (data.params === '' ? '' : '?' + data.params)
      }}</el-descriptions-item
    >
    <el-descriptions-item
      :label="t('project.MockRecord.dialog.domain')"
      label-align="right"
      align="center"
      label-class-name="my-label"
      class-name="my-content"
      width="200px"
      >{{ 'http://' + data.server_host }}</el-descriptions-item
    >
    <el-descriptions-item
      :label="t('project.MockRecord.reqTime')"
      label-align="right"
      align="center"
      >{{ tools.getLocaleDateTime(data.add_time, false) }}</el-descriptions-item
    >
    <el-descriptions-item
      :label="t('project.MockRecord.dialog.method')"
      label-align="right"
      align="center"
      ><span
        class="method-desc"
        :style="{
          '--method-color': GlobalStatus.methodColor[data.request_method]
        }"
        >{{ method[data.request_method] }}</span
      ></el-descriptions-item
    >
    <el-descriptions-item
      :label="t('project.MockRecord.dialog.ip')"
      label-align="right"
      align="center"
    >
      <el-tag size="small">{{ data.origin_ip }}</el-tag>
    </el-descriptions-item>
    <el-descriptions-item
      :label="t('project.MockRecord.dialog.status')"
      label-align="right"
      align="center"
    >
      <el-tag size="small">{{
        data.status +
        ' ' +
        (GlobalStatus.regular_response_status_map(data.status) !== undefined
          ? GlobalStatus.regular_response_status_map(data.status)
          : 'Customize Code')
      }}</el-tag>
    </el-descriptions-item>
    <el-descriptions-item
      :label="t('project.MockRecord.dialog.size')"
      label-align="right"
      align="center"
    >
      <el-tag size="small">{{ data.response_length + ' B' }}</el-tag>
    </el-descriptions-item>
    <el-descriptions-item
      :label="t('project.MockRecord.dialog.path')"
      label-align="right"
      align="center"
      span="3"
      >{{ data.path }}</el-descriptions-item
    >
  </el-descriptions>
  <el-row class="detail-row">
    <el-col :span="12">
      <el-row>
        <el-col :span="24">
          <span class="title-span title-span-req">Request</span>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="24">
          <CommonReqResBar
            childTitle="Request"
            :body="tryJson(data.request_body)"
            :headers="tryJson(data.request_headers)"
            :loading="false"
            :result="true"
            :err="''"
            :reason="''"
            class="res-bar"
          ></CommonReqResBar>
        </el-col>
      </el-row>
    </el-col>
    <el-col :span="12"
      ><el-row>
        <el-col :span="24">
          <span class="title-span title-span-res">Response</span>
        </el-col> </el-row
      ><el-row>
        <el-col :span="24">
          <CommonReqResBar
            childTitle="Response"
            :body="tryJson(data.response_body)"
            :headers="tryJson(data.response_headers)"
            :loading="false"
            :result="true"
            :err="''"
            :reason="''"
            class="res-bar"
          ></CommonReqResBar>
        </el-col> </el-row
    ></el-col>
  </el-row>
</template>

<script setup lang="ts">
import CommonReqResBar from '@/components/layout/debugs/commonReqResBar.vue'
import { useI18n } from 'vue-i18n'
import tools from '@/utils/tools'
import GlobalStatus from '@/global'

const { t } = useI18n()
const method = ['GET', 'POST', 'PUT', 'DELETE']

defineProps({
  data: {
    type: Object as any,
    default: () => {}
  }
})

function tryJson(data: string) {
  try {
    return JSON.parse(data)
  } catch (error) {
    return data
  }
}
</script>

<style lang="scss" scoped>
.method-desc {
  font-weight: bold;
  color: var(--method-color);
}
.detail-row {
  margin-top: 30px;
  .title-span {
    font-size: 20px;
  }
  .title-span-req {
    background-image: -webkit-linear-gradient(
      bottom,
      var(--global-theme-light-color),
      var(--global-theme-color),
      var(--el-color-primary-light-8)
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .title-span-res {
    background-image: -webkit-linear-gradient(
      bottom,
      #ee6363,
      #fd8403,
      #ee6363
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}
</style>
