<template>
  <transition name="el-fade-in-linear" appear>
    <el-row justify="start" align="middle" class="tools-var-params">
      <el-col :span="18">
        <table class="styled-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in paramsData" :key="index">
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
                    v-show="index !== paramsData.length - 1"
                    @click.stop="deleteParam(index)"
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
const activeParamsInput = ref('')

const props = defineProps({
  placeholder: String,
  paramsData: {
    type: Array<any>,
    default: () => []
  },
  url: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'changeTableParams',
  'changeTableUrl',
  'deleteParamsEle'
])

function pushParamsData(data: any) {
  emit('changeTableParams', data)
}

function deleteParam(index: number) {
  emit('deleteParamsEle', index)
}

function changeUrl(s: String) {
  emit('changeTableUrl', s)
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

// 输入Url Params 时对table和url的改动
function typeTableInput(index: number, type: string) {
  // 对table的行数改动
  if (props.paramsData.length === index + 1) {
    pushParamsData({ key: '', value: '' })
  }
  // 对URL的改动
  changeUrlByParamsTable()
}

async function changeUrlByParamsTable() {
  // 解构URL
  const { b } = splitUrl()
  // 获取table转换为url的值
  const _newUrlParams = tableToParams()
  changeUrl(b + _newUrlParams)
}

function tableToParams() {
  const _l = []
  for (let i = 0; i < props.paramsData.length; i++) {
    const _ROW: any = props.paramsData[i]
    if (_ROW.key === '' && _ROW.value === '') {
      continue
    } else {
      _l.push(_ROW.key + '=' + _ROW.value)
    }
  }
  return _l.length > 0 ? '?' + _l.join('&') : ''
}

function splitUrl() {
  if (props.url === '') {
    return { b: '', a: '' }
  }
  if (props.url.indexOf('?') === -1) {
    return { b: props.url, a: '' }
  }
  const _split = props.url.split('?')
  return { b: _split[0], a: _split[1] }
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
  border-bottom: 2px solid var(--global-theme-color);
}

.styled-table tbody tr td.active-row {
  font-weight: bold;
  color: var(--global-theme-color);
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
