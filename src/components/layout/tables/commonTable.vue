<template>
  <el-row class="main-data">
    <el-col :offset="1" :span="22">
      <table class="styled-table">
        <thead>
          <tr>
            <th v-for="(item, index) in cols" :key="index">
              {{ item }}
            </th>
          </tr>
        </thead>
        <tbody>
          <transition-group name="fade" appear>
            <tr v-for="item in d.list" :key="item">
              <td class="active-row copy-instance" @click="copy(item.args)">
                {{ item.args }}
              </td>
              <td
                class="disappear-auto desc-td"
                style="font-size: 16px; white-space: pre-wrap"
              >
                {{ item.desc }}
              </td>
              <td class="disappear-auto active-row" @click="copy(item.demo)">
                {{ item.demo }}
              </td>
            </tr>
          </transition-group>
        </tbody>
      </table>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { reactive, getCurrentInstance, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import useClipboard from 'vue-clipboard3/dist/esm/index.js'
import { ApiGetMockBuildInArgs } from '@/api/mock'
import tools from '@/utils/tools'
const { t } = useI18n()

onMounted(() => {
  getData()
})

defineProps({
  cols: {
    type: Array<any>,
    default: () => []
  }
})

// 数据主体！！！
const d = reactive({
  list: [] as any
})

// 全局对象
const { proxy }: any = getCurrentInstance()

// 复制至剪贴板
async function copy(value: String) {
  console.log(value)

  const { toClipboard } = useClipboard()
  await toClipboard(value.toString())
  tools.message(t('notice.clipboard'), proxy, 'success')
}

function getData() {
  const data = {
    size: 50
  }
  ApiGetMockBuildInArgs(data).then((data: any) => {
    console.log(data)
    d.list = data.results
  })
}
</script>

<style lang="scss" scoped>
// .main-data {
//   padding-top: 20px;
// }

.styled-table {
  border-collapse: collapse;
  margin-bottom: 25px 0;
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
  .desc-td {
    width: 500px;
    .desc-div {
      max-width: 20vw;
      text-align: center;
      font-size: 15px;
    }
  }
  .desc-td div {
    width: 20vw;
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
    var(--dialog-color) 90%,
    var(--dialog-color)
  );
  color: #ffffff;
  text-align: left;
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
  border-bottom: 2px solid var(--dialog-color);
}

.styled-table tbody tr td.active-row {
  cursor: pointer;
  font-weight: bold;
  color: var(--dialog-color);
  font-size: 16px;
}
</style>
