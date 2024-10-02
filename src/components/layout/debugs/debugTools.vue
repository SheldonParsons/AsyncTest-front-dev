<template>
  <el-dialog
    top="2vh"
    v-model="dialogModel"
    @closed="closeDialog"
    class="debug-tools"
    width="80%"
    :show-close="false"
  >
    <template #header>
      <el-row class="tools-header" justify="start" align="middle">
        <el-col :span="20"><p>AsyncTest DebugTools</p></el-col>
        <el-col :span="4" style="text-align: right">
          <!-- <el-tooltip
            class="box-item"
            effect="light"
            :content="t('tooltip.getInter')"
            placement="bottom"
          >
            <el-icon
              @click="getDebug"
              style="margin-right: 15px"
              class="header-save-icon"
              ><CopyDocument
            /></el-icon>
          </el-tooltip> -->
          <el-tooltip
            class="box-item"
            effect="light"
            :content="t('tooltip.saveInter')"
            placement="bottom"
          >
            <el-icon
              @click="saveDebug"
              class="header-save-icon header-save-icon-last"
              ><Lock
            /></el-icon> </el-tooltip
        ></el-col>
      </el-row>
    </template>
    <div class="tools-main">
      <el-row>
        <el-col :span="3"
          ><el-dropdown trigger="click" @command="handelMethod">
            <el-button type="primary" class="method-btn">
              Method {{ methodList[currentMethod]
              }}<el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  :command="index"
                  v-for="(item, index) in methodList"
                  :key="index"
                  >{{ item }}</el-dropdown-item
                >
              </el-dropdown-menu>
            </template>
          </el-dropdown></el-col
        >
        <el-col :span="18">
          <SpecialInput
            radius="0px 0px 0px 0px"
            v-model="url"
            @input="changeUrl"
            placeholder="Enter Request URL"
            @clearData="clearUrl"
            :max="600"
            :isTransColor="false"
          ></SpecialInput
        ></el-col>
        <el-col :span="3">
          <el-button class="send-btn" type="primary" @click="send"
            >Send Request</el-button
          >
        </el-col>
      </el-row>
      <el-row justify="start" align="middle" class="tools-var">
        <el-col>
          <el-tabs v-model="activeMenuIndex" @tab-click="changeMenu">
            <el-tab-pane label="Params" name="1"></el-tab-pane>
            <el-tab-pane label="Headers" name="2"></el-tab-pane>
            <el-tab-pane label="Body" name="3"></el-tab-pane>
          </el-tabs>
        </el-col>
      </el-row>
      <el-row class="child-row" v-if="activeMenuIndex === '1'">
        <el-col>
          <ParamsTable
            :paramsData="paramsData.list"
            :url="url"
            @changeTableParams="changeTableParams"
            @changeTableUrl="changeTableUrl"
            @deleteParamsEle="deleteParamsEle"
          ></ParamsTable>
        </el-col>
      </el-row>
      <el-row class="child-row" v-if="activeMenuIndex === '2'">
        <el-col :span="12">
          <HeadersTable
            :headersData="headersData.list"
            @changeTableHeader="changeTableHeader"
            @deleteHeadersEle="deleteHeadersEle"
          ></HeadersTable> </el-col
        ><el-col style="text-align: center; margin-top: 150px" :span="2"
          ><el-button
            class="arrow-btn"
            type="primary"
            @click="transferHeader"
            :icon="ArrowLeft" /></el-col
        ><el-col :span="9">
          <TransferBar v-model="transferData"></TransferBar> </el-col
      ></el-row>
      <el-row class="child-row editor-row" v-show="activeMenuIndex === '3'">
        <el-col :span="22">
          <JsonEditor
            v-if="showJsonEdit"
            class="create-child"
            v-model="code"
            :project="Number(route.params.project)"
            :codeCompleteFn="ApiGetData"
            :changeValue="changeResCodeValue"
          ></JsonEditor>
        </el-col>
      </el-row>
      <ResponseBar
        :body="resBody"
        :headers="resHeaders"
        :status="resStatus"
        :time="resTime"
        :size="resSize"
        :loading="resLoading"
        :result="resResult"
        :err="resErr"
        :reason="resReason"
        class="res-bar"
      ></ResponseBar>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import useClipboard from 'vue-clipboard3/dist/esm/index.js'
import { ApiGetData } from '@/api/data/index'
import { ArrowLeft } from '@element-plus/icons-vue'
import SpecialInput from '@/components/common/input/specialInput.vue'
import ParamsTable from './paramsTable.vue'
import HeadersTable from './headersTable.vue'
import TransferBar from './transferBar.vue'
import ResponseBar from './responseBar.vue'
import JsonEditor from '@/components/common/editor/JsonEditor.vue'
import { ApiHttpSender } from '@/api/debug/index'
import { useStore } from '@/store'
const route = useRoute()
const store = useStore()
const { proxy }: any = getCurrentInstance()
const { t } = useI18n()
const currentMethod = ref(0)
const url = ref('')
const activeMenuIndex = ref('1')
const dialogModel = ref(true)
const transferData = ref('')
// response status
const resBody = ref('')
const resHeaders = ref('')
const resStatus = ref('waiting...')
const resTime = ref(0)
const resSize = ref(0)
const resLoading = ref(false)
const resResult = ref(true)
const resErr = ref('')
const resReason = ref('')
const changeResCodeValue = ref(false)
const showJsonEdit = ref(true)

const InterfaceInfo = ref({})

const paramsData = reactive({
  list: [{ key: '', value: '' }] as any
})
const headersData = reactive({
  list: [{ key: '', value: '' }] as any
})
const code: any = ref('')
const methodList = ['GET', 'POST', 'PUT', 'DELETE']
const emit = defineEmits(['closed'])

onMounted(() => {
  changeUrlByParamsTable()
  store.dispatch('getDebug').then((data) => {
    if (data) setDebugInfo(JSON.parse(data.result))
  })
})

function setDebugInfo(data: any) {
  resResult.value = data.result
  resErr.value = data.error
  resBody.value = data.response.body
  resHeaders.value = data.response.headers
  resStatus.value = data.response.code
  resReason.value = data.response.reason
  resTime.value = data.response.time
  resSize.value = data.response.size
  currentMethod.value = methodList.indexOf(data.request.method)
  url.value = data.request.url
  paramsData.list = dict2kv(data.request.params)
  headersData.list = dict2kv(data.request.headers)
  code.value = tryJson(data.request.data)
  changeUrlByParamsTable()
}

function dict2kv(data: any) {
  const _l: Array<any> = []
  for (const item in data) {
    _l.push({
      key: item,
      value: data[item]
    })
  }
  _l.push({ key: '', value: '' })
  return _l
}

function deleteParamsEle(index: number) {
  paramsData.list.splice(index, 1)
  changeUrlByParamsTable()
}
function deleteHeadersEle(index: number) {
  headersData.list.splice(index, 1)
}

// function getDebug() {
//   navigator.clipboard.readText().then((data) => {
//     const debugInfo = tryJson(data)
//     console.log(debugInfo)
//     changeResCodeValue.value = true
//     setDebugInfo(debugInfo)
//     setTimeout(() => {
//       changeResCodeValue.value = false
//     }, 500)
//   })
// }

function saveDebug() {
  proxy.$message({
    message: t('debug.save'),
    duration: 3000,
    type: 'warning'
  })
  getInterfaceInfo()
  store.dispatch('saveDebug', JSON.stringify(InterfaceInfo.value))
  copy(JSON.stringify(InterfaceInfo.value))
}
async function copy(value: string) {
  const { toClipboard } = useClipboard()
  await toClipboard(value)
}

function handelMethod(command: any) {
  currentMethod.value = command
}

function getInterfaceInfo() {
  InterfaceInfo.value = {
    result: resResult.value,
    error: resErr.value,
    response: {
      body: resBody.value,
      headers: resHeaders.value,
      code: resStatus.value,
      reason: resReason.value,
      time: resTime.value,
      size: resSize.value
    },
    request: {
      method: methodList[currentMethod.value],
      url: url.value.split('?')[0],
      params: kv2dict(paramsData.list),
      headers: kv2dict(headersData.list),
      data: tryJsonStr(code.value),
      timeout: 60
    }
  }
}

function cleanInterfaceInfo() {
  InterfaceInfo.value = {}
}

function send() {
  to()
  setResponseStatus()
  resLoading.value = true
  requestSenderApi()
}

function requestSenderApi() {
  const data = {
    method: methodList[currentMethod.value],
    url: url.value.split('?')[0],
    params: kv2dict(paramsData.list),
    headers: kv2dict(headersData.list),
    data: code.value
  }
  ApiHttpSender(data).then((data: any) => {
    resLoading.value = false
    console.log(data)

    setResponseStatus(
      data.response.body,
      data.response.headers,
      data.response.code,
      data.response.time,
      data.response.size,
      data.result,
      data.error,
      data.response.reason
    )
  })
}

function kv2dict(data: Array<any>) {
  const res: any = {}
  for (let i = 0; i < data.length - 1; i++) {
    res[data[i].key] = data[i].value
  }
  return res
}

function setResponseStatus(
  b = '',
  h = '',
  status = '',
  t = 0,
  size = 0,
  result = true,
  err = '',
  reason = ''
) {
  resBody.value = tryJson(b)
  resHeaders.value = h
  resStatus.value = status
  resTime.value = t
  resSize.value = size
  resResult.value = result
  resErr.value = err
  resReason.value = reason
}

function tryJson(_json: string) {
  try {
    const j = JSON.parse(_json)
    console.log(j)

    return j
  } catch (error) {
    return _json
  }
}

function tryJsonStr(_jsonStr: any) {
  try {
    return JSON.stringify(_jsonStr)
  } catch (error) {
    return _jsonStr
  }
}

function to() {
  document.getElementById('toolsRes')!.scrollIntoView({ behavior: 'smooth' })
}
function transferHeader() {
  console.log(transferData.value)
  const newTableList = []
  try {
    const headerDict = JSON.parse(transferData.value)
    for (const key in headerDict) {
      newTableList.push({ key, value: headerDict[key] })
    }
  } catch (error) {
    const headerList = transferData.value.split('\n')
    for (let i = 0; i < headerList.length; i++) {
      if (headerList[i].indexOf(':') !== -1) {
        const _kv = headerList[i].split(':')
        newTableList.push({ key: _kv[0].trim(), value: _kv[1].trim() })
      }
    }
  }
  newTableList.push({ key: '', value: '' })
  headersData.list = newTableList
}

function changeMenu(key: string, keyPath: string[]) {
  activeMenuIndex.value = keyPath[0]
}

function closeDialog() {
  cleanInterfaceInfo()
  emit('closed', false)
}

function clearUrl() {
  url.value = ''
  changeUrl()
}

function changeTableParams(data: any) {
  paramsData.list.push(data)
}

function changeTableHeader(data: any) {
  headersData.list.push(data)
}

function changeTableUrl(s: string) {
  url.value = s
}

// URL的变动触发对table的改动
function changeUrl() {
  // 解构URL
  const { a } = splitUrl()
  // 解构url params并获取新的table list
  paramsData.list = splitUrlParams(a)
}

// table的改动触发url的变动
async function changeUrlByParamsTable() {
  // 解构URL
  const { b } = splitUrl()
  // 获取table转换为url的值
  const _newUrlParams = tableToParams()
  url.value = b + _newUrlParams
}

// 解构url params并获取新的table list
function splitUrlParams(urlParams: string) {
  if (urlParams === '') {
    return [{ key: '', value: '' }]
  }
  const _newTableData = []
  const _SPLIT_LIST = urlParams.split('&')
  for (let i = 0; i < _SPLIT_LIST.length; i++) {
    const _kv = _SPLIT_LIST[i]
    if (_kv === '') {
      continue
    }
    if (_kv.indexOf('=') === -1) {
      _newTableData.push({ key: _kv, value: '' })
    } else {
      const _KEY_SPLIT = _kv.split('=')
      _newTableData.push({ key: _KEY_SPLIT[0], value: _KEY_SPLIT[1] })
    }
  }
  _newTableData.push({ key: '', value: '' })
  return _newTableData
}

function tableToParams() {
  const _l = []
  for (let i = 0; i < paramsData.list.length; i++) {
    const _ROW = paramsData.list[i]
    if (_ROW.key === '' && _ROW.value === '') {
      continue
    } else {
      _l.push(_ROW.key + '=' + _ROW.value)
    }
  }
  return _l.length > 0 ? '?' + _l.join('&') : ''
}

function splitUrl() {
  if (url.value === '') {
    return { b: '', a: '' }
  }
  if (url.value.indexOf('?') === -1) {
    return { b: url.value, a: '' }
  }
  const _split = url.value.split('?')
  return { b: _split[0], a: _split[1] }
}
</script>

<style lang="scss" scoped>
.header-save-icon {
  font-size: 1.4rem;
  color: white;
  cursor: pointer;
}
.header-save-icon-last {
  margin-right: 35px;
}
.tools-main {
  .el-dropdown,
  .method-btn,
  .send-btn {
    width: 100%;
    height: 100%;
  }
  .method-btn {
    border-top-right-radius: 0px;
    border-bottom-right-radius: 0px;
  }
  .send-btn {
    border-radius: 0px 5px 5px 0px;
  }
}
.tools-var {
  margin-top: 10px;
}

.editor-row {
  height: 70%;
  min-height: 200px;
}
.child-row {
  margin: 10px 0px;
}
.arrow-btn {
  margin-top: 50%;
}
</style>

<style lang="scss">
.debug-tools {
  border-radius: 10px !important;
  .el-dialog__body {
    padding: 20px!important;
  }
  .el-dialog__header {
    margin: 0px;
    padding: 10px 0px 10px 5px;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    background-image: linear-gradient(
      90deg,
      var(--global-theme-color) 70%,
      var(--global-theme-light-color)
    );
    p {
      color: white;
      font-size: 16px;
      font-weight: normal;
      font-style: normal;
      display: table-cell;
      vertical-align: middle;
      height: 35px;
      padding-left: 20px;
    }
  }
}
</style>
