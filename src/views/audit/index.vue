<template>
  <div class="audit-container">
    <Input placeholder="搜索数据 范围：用户昵称、接口名" title="监听接口列表" :handlerFunction="getAuditInterfaceList">
      <template #headers>
        <th class="col-method">Method</th>
        <th class="col-desc">描述</th>
        <th class="col-name">名称</th>
        <th class="col-core">核心内容</th>
        <th class="col-creator">创建者</th>
        <th class="col-time">时间</th>
      </template>
      <template v-slot:main="{ item }">
        <td class="col-method">{{ item.method }}</td>
        <td class="col-desc" :title="item.description">
          <div class="text-ellipsis">{{ item.description }}</div>
        </td>
        <td class="col-name" :title="item.name">
          <div class="text-ellipsis">{{ item.name }}</div>
        </td>
        <td class="col-core" :title="item.core_content">
          <div class="text-ellipsis">{{ item.core_content }}</div>
        </td>
        <td class="col-creator">{{ item.create_by }}</td>
        <td class="col-time">{{ new Date(item.add_time).toLocaleString() }}</td>
      </template>
    </Input>
  </div>
</template>

<script lang="ts" setup>
import Input from "@/components/common/input/search.vue";
import { getAuditInterfaceList } from "@/api/audit";
</script>

<style lang="scss" scoped>
.audit-container {
  height: 100%;
  overflow: auto;
}

/* 使用 :deep() 穿透到子组件的表格样式 */
:deep(.styled-table) {
  /* 列宽设置 - 核心内容占最大比例 */
  .col-method {
    width: 8%;
    min-width: 70px;
  }

  .col-desc {
    width: 15%;
    min-width: 120px;
  }

  .col-name {
    width: 12%;
    min-width: 100px;
  }

  .col-core {
    width: 40%;
    min-width: 200px;
  }

  .col-creator {
    width: 10%;
    min-width: 80px;
  }

  .col-time {
    width: 15%;
    min-width: 140px;
  }

  /* 短文本列 - 单行显示省略 */
  .col-method,
  .col-creator,
  .col-time {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 描述和名称 - 限制行数 */
  .col-desc .text-ellipsis,
  .col-name .text-ellipsis {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
    line-height: 1.5;
  }

  /* 核心内容 - 换行显示 */
  .col-core .text-ellipsis {
    white-space: normal;
    word-wrap: break-word;
    word-break: break-word;
    line-height: 1.6;
    max-height: none;
  }

  /* 单元格内边距优化 */
  td {
    padding: 14px 12px;
    vertical-align: top;
  }

  th {
    padding: 14px 12px;
    font-weight: 600;
    background-color: rgba(0, 0, 0, 0.02);
  }

  /* 行样式优化 */
  tbody tr {
    transition: background-color 0.2s;

    &:hover {
      background-color: rgba(0, 0, 0, 0.03) !important;
    }
  }
}
</style>
