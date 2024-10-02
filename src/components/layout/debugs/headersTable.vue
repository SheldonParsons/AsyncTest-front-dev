<template>
  <transition name="el-fade-in-linear" appear>
    <el-row justify="start" align="middle" class="tools-var-params">
      <el-col :span="24">
        <table
          class="styled-table"
          :style="{
            '--color-group': GlobalStatus.colorList[colorGroup][0],
            '--color-group-light': GlobalStatus.colorList[colorGroup][1]
          }"
        >
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in headersData" :key="index">
              <td
                class="active-row copy-instance"
                @click="choiceTableInput(index, 'key', $event)"
              >
                <input
                  class="table-input"
                  @blur="cancelTableInput"
                  @input="typeTableInput(index, 'key')"
                  autocomplete="off"
                  spellcheck="false"
                  v-model="item.key"
                  type="text"
                  v-show="activeParamsInput === index + 'key'"
                />

                <div
                  class="input-div"
                  v-show="activeParamsInput !== index + 'key'"
                >
                  <el-icon
                    v-if="index !== headersData.length - 1"
                    @click.stop="deleteHeader(index)"
                    ><CloseBold /></el-icon
                  ><span>{{ item.key }}</span>
                </div>
              </td>
              <td
                class="active-row copy-instance"
                @click="choiceTableInput(index, 'value', $event)"
              >
                <input
                  class="table-input"
                  @blur="cancelTableInput"
                  @input="typeTableInput(index, 'value')"
                  autocomplete="off"
                  spellcheck="false"
                  v-model="item.value"
                  type="text"
                  v-show="activeParamsInput === index + 'value'"
                />
                <span v-show="activeParamsInput !== index + 'value'">{{
                  item.value
                }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </el-col>
    </el-row>
  </transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GlobalStatus from '@/global'
const activeParamsInput = ref('')

const props = defineProps({
  placeholder: String,
  headersData: {
    type: Array<any>,
    default: () => []
  },
  colorGroup: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['changeTableHeader', 'deleteHeadersEle'])

// 输入Header时修改父组件中的header值
function typeTableInput(index: number, type: string) {
  // 对table的行数改动
  if (props.headersData.length === index + 1) {
    pushHeaderData({ key: '', value: '' })
  }
}

function pushHeaderData(data: any) {
  emit('changeTableHeader', data)
}

function deleteHeader(index: number) {
  emit('deleteHeadersEle', index)
}

function choiceTableInput(index: Number, value: String, event: any) {
  activeParamsInput.value = index.toString() + value
  const _td = deepSearchTd(event.target)
  setTimeout(() => {
    _td.children[0].focus()
  }, 100)
}

function deepSearchTd(ele: any) {
  if (ele.tagName === 'TD') {
    return ele
  } else {
    if (ele.parentNode.tagName === 'TD') {
      return ele.parentNode
    } else {
      deepSearchTd(ele)
    }
  }
}

function cancelTableInput() {
  activeParamsInput.value = ''
}
</script>

<style lang="scss" scoped>
.input-div {
  display: flex;
  align-items: center;
  span {
    margin-left: 5px;
  }
}
.styled-table {
  border-collapse: collapse;
  font-size: 1em;
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
    width: 200px;
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
    font-size: 15px;
  }
}

.styled-table thead tr {
  background-image: linear-gradient(
    90deg,
    var(--dialog-deep-color) 80%,
    var(--dialog-color)
  );
  color: #ffffff;
  text-align: left;
}

.styled-table th,
.styled-table td {
  padding: 12px 15px;
  width: 50%;
  border-right: 1px solid #dcdcdc;
}

.styled-table tbody tr {
  border-bottom: 1px solid #dddddd;
  height: 46px;
}

.styled-table tbody tr:nth-of-type(even) {
  background-color: #f3f3f3;
}

.styled-table tbody tr:last-of-type {
  border-bottom: 2px solid var(--color-group);
}

.styled-table tbody tr td.active-row {
  font-weight: bold;
  color: var(--color-group);
}
.copy-instance {
  font-size: 15px;
  cursor: pointer;
}

.table-input {
  color: black !important;
  padding: 0.375rem 0.375rem 0.375rem 0rem;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  border: 0px solid transparent;
  width: 100%;
  height: 20px;
  outline: none;
  box-sizing: border-box;
}
</style>
