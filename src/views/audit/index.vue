<template>
  <Input
    placeholder="搜索数据 范围：用户昵称、接口名"
    title="监听接口列表"
    :handlerFunction="getAuditInterfaceList"
  >
    <template #headers>
      <th class="disappear-auto">Method</th>
      <th>描述</th>
      <th class="disappear-auto">名称</th>
      <th class="disappear-auto">核心内容</th>
      <th>创建者</th>
      <th>时间</th>
    </template>
    <template v-slot:main="{ item }">
        <td class="disappear-auto">{{ item.method }}</td>
        <td class="disappear-auto">{{ item.description }}</td>
        <td class="disappear-auto">{{ item.name }}</td>
        <td class="disappear-auto">{{ item.core_content }}</td>
        <td class="disappear-auto">{{ item.create_by }}</td>
        <td class="disappear-auto">{{ new Date(item.add_time).toLocaleString() }}</td>
    </template>
  </Input>
</template>

<script lang="ts" setup>
import Input from "@/components/common/input/search.vue";
import { getAuditInterfaceList } from "@/api/audit";
import tools from "@/utils/tools";
</script>

<style lang="scss" scoped>

.styled-table {
  border-top: 2px solid var(--global-theme-color);
  border-collapse: collapse;
  margin: 25px 0;
  font-size: 0.9em;
  width: 100%;
  // border-radius: 5px 5px 0px 0px;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
  .action-td {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
  }
  .desc-td {
    width: 5%;
  }
  .long-td {
    width: 300px;
  }
  .long-td div {
    // width: 30vw;
    max-width: 300px;
    overflow: hidden;
    word-break: break-all;
    text-overflow: ellipsis;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    white-space: nowrap;
    margin: 0;
    font-size: 16px;
  }
  .desc-td div {
    width: 10vw;
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
  text-align: left;
  color: black;
  border-bottom: 1px solid #E6E6E6;
}

.styled-table th,
.styled-table td {
  padding: 12px 15px;
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
  color: var(--method-color);
}
</style>
