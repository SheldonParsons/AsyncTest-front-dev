<template>
  <CommonDialog
    :dialog="modelValue"
    @closed="updateValue(false)"
    @cancel="updateValue(false)"
    :footerConfirmDesc="
      isEdit ? $t('project.mock.desc.save') : $t('project.mock.desc.create')
    "
    :footerCancelDesc="$t('global.cancel')"
    :hasFooter="true"
    @confirm="confirmHope"
    :headerText="$t('project.mock.desc.createExpect')"
    :cancelDoubleCheck="false"
  >
    <el-row class="input-row" align="middle">
      <el-col :span="18" class="exe-col">
        <StandardInput
          :colorType="1"
          class="create-child"
          v-model="hopeName"
          :text="$t('project.mock.desc.expectName')"
          :maxlength="50"
        ></StandardInput>
      </el-col>
    </el-row>
    <el-row class="input-row" align="middle" style="margin-top: 20px">
      <el-col :span="18">
        <div class="radio">
          <div class="radio__2" style="display: flex; align-items: center">
            <div
              style="display: inline-block"
              @click="changeConditionPassRule(1)"
            >
              <input
                id="radio-2"
                type="radio"
                name="radio"
                value="2"
                :checked="conditionPassRule == 1"
              />
              <label for="radio-2"></label>
            </div>
            <div
              style="
                display: inline;
                margin-left: 15px;
                font-size: 1rem;
                font-weight: 500;
                white-space: nowrap;
              "
            >
              {{ $t('project.mock.desc.passAll') }}
            </div>
          </div>
          <div class="radio__1" style="display: flex; align-items: center">
            <div
              style="display: inline-block"
              @click="changeConditionPassRule(0)"
            >
              <input
                id="radio-1"
                type="radio"
                name="radio"
                value="1"
                :checked="conditionPassRule == 0"
              />
              <label for="radio-1"></label>
            </div>
            <div
              style="
                display: inline;
                margin-left: 15px;
                font-size: 1rem;
                font-weight: 500;
                white-space: nowrap;
              "
            >
              {{ $t('project.mock.desc.passOne') }}
            </div>
          </div>

          <div class="radio__3" style="display: flex; align-items: center">
            <div
              style="display: inline-block"
              @click="changeConditionPassRule(2)"
            >
              <input
                id="radio-3"
                type="radio"
                name="radio"
                value="3"
                :checked="conditionPassRule == 2"
              />
              <label for="radio-3"></label>
            </div>
            <div
              style="
                display: inline;
                margin-left: 15px;
                font-size: 1rem;
                font-weight: 500;
                white-space: nowrap;
              "
            >
              {{ $t('project.mock.desc.byCondition') }}
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
    <!-- <el-row>
      <el-col :offset="23" :span="1">
        <CButton
          @click="createCondition"
          style="display: inline-block; margin-right: 6px"
          ><el-icon><CirclePlusFilled /></el-icon
        ></CButton>
      </el-col>
    </el-row> -->
    <el-row style="margin-top: 3%">
      <el-col :span="24"
        ><ParamsTable
          :cols="[
            '',
            $t('project.mock.desc.expectTableField.necessary'),
            $t('project.mock.desc.expectTableField.enabled'),
            $t('project.mock.desc.expectTableField.position'),
            $t('project.mock.desc.expectTableField.paramName'),
            $t('project.mock.desc.expectTableField.compare'),
            $t('project.mock.desc.expectTableField.value'),
            $t('project.MockCol.action')
          ]"
          :data="paramsConditions.list"
          @onDeleteCondition="deleteConditionAction"
          @onRefreshCondition="refreshConditionList"
          @addConditionAction="createCondition"
        ></ParamsTable>
      </el-col>
    </el-row>
    <el-row
      justify="start"
      align="middle"
      class="tools-var"
      style="margin-top: 3%; margin-bottom: 40px"
    >
      <el-col :span="12">
        <div class="segmented-control-inner g-unselect">
          <input
            type="radio"
            name="radio2"
            @click="changeMenu('2')"
            value="3"
            id="tab-7"
            checked
          />
          <label for="tab-7" class="segmented-control-inner__1">
            <p>Body</p></label
          >

          <input
            type="radio"
            name="radio2"
            @click="changeMenu('1')"
            value="4"
            id="tab-8"
          />
          <label for="tab-8" class="segmented-control-inner__2">
            <p>Headers</p></label
          >

          <input
            type="radio"
            name="radio2"
            @click="changeMenu('3')"
            value="5"
            id="tab-9"
          />
          <label for="tab-9" class="segmented-control-inner__3">
            <p>Status</p></label
          >

          <input
            type="radio"
            name="radio2"
            @click="changeMenu('4')"
            value="5"
            id="tab-10"
          />
          <label for="tab-10" class="segmented-control-inner__4">
            <p>{{ $t('project.mock.desc.moreSetting') }}</p></label
          >

          <div class="segmented-control-inner__color__inner"></div>
        </div>
      </el-col>
    </el-row>
    <el-row class="child-row" v-if="active === '1'">
      <el-col :span="12">
        <HeadersTable
          :headersData="headersData.list"
          @changeTableHeader="changeTableHeader"
          @deleteHeadersEle="deleteHeadersEle"
          :colorGroup="1"
        ></HeadersTable> </el-col
      ><el-col
        style="
          display: flex;
          justify-content: center;
          text-align: center;
          margin-top: 150px;
        "
        :span="2"
      >
        <el-button
          class="arrow-btn"
          type="primary"
          @click="transferHeader"
          :style="{
            '--el-color-primary': GlobalStatus.colorList[1][0],
            '--el-button-hover-border-color': GlobalStatus.colorList[1][0],
            '--el-button-hover-bg-color': GlobalStatus.colorList[1][0]
          }"
          :icon="ArrowLeft"
        /> </el-col
      ><el-col :span="9">
        <TransferBar
          :colorGroup="1"
          v-model="transferData"
        ></TransferBar> </el-col
    ></el-row>
    <el-row class="editor-row" v-if="active === '2'">
      <el-col :span="24">
        <JsonEditor
          :colorGroup="1"
          v-if="code !== undefined || (!isEdit && editorReady)"
          class="create-child"
          v-model="code"
          :project="Number(route.params.project)"
        ></JsonEditor>
      </el-col>
    </el-row>
    <el-row class="input-row" align="middle" v-if="active === '3'">
      <el-col :span="18" class="exe-col">
        <el-tooltip
          :visible="showStatusCheck"
          effect="light"
          placement="bottom"
        >
          <template #content>
            <span style="font-size: 14px">{{ $t('input.check.status') }}</span>
          </template>
          <StandardInput
            :colorType="1"
            class="create-child"
            v-model="resStatus"
            :text="$t('project.MockCol.status')"
            :maxlength="3"
            @check="checkStatus"
          ></StandardInput>
        </el-tooltip>
      </el-col>
    </el-row>
    <el-row class="input-row" align="middle" v-if="active === '4'">
      <el-col :span="18" class="exe-col">
        <el-tooltip :visible="showDelayCheck" effect="light" placement="bottom">
          <template #content>
            <span style="font-size: 14px">{{ $t('input.check.delay') }}</span>
          </template>
          <StandardInput
            :colorType="1"
            class="create-child"
            v-model="delayTimes"
            :text="$t('project.MockCol.delay')"
            :maxlength="4"
            :end-text="$t('project.mock.desc.millisecond')"
            @check="checkDelay"
          ></StandardInput>
        </el-tooltip>
      </el-col>
    </el-row>
  </CommonDialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import tools from '@/utils/tools'

import GlobalStatus from '@/global'
import { ArrowLeft } from '@element-plus/icons-vue'
import CommonDialog from '@/components/layout/dialogs/commonDialog.vue'
import StandardInput from '@/components/common/input/standardInput.vue'
import ParamsTable from './paramsTableView.vue'
import HeadersTable from '@/components/layout/debugs/headersTable.vue'
import TransferBar from '@/components/layout/debugs/transferBar.vue'
import JsonEditor from '@/components/common/editor/JsonEditor.vue'
import CButton from '@/components/common/button/CButton.vue'
import {
  ApiGetSingleExpect,
  ApiEditExpect,
  ApiExpectPostAction
} from '@/api/mock/expect'
const { proxy }: any = getCurrentInstance()
const { t } = useI18n()

const prop = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  editHope: {
    type: Number,
    default: -1
  },
  isPublic: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['update:modelValue', 'update:hopeName', 'flush'])

const route = useRoute()

const code: any = ref(undefined)
const hopeName = ref('')
const active = ref('2')
const transferData = ref('')
const resStatus = ref('200')
const delayTimes = ref('0')
const editorReady = ref(false)
const showStatusCheck = ref(false)
const conditionPassRule = ref(1)
const showDelayCheck = ref(false)
const headersData = reactive({
  list: [{ key: '', value: '' }] as any
})
const hopeSort = ref(0)
const currentResponseId = ref(-1)
const currentConditionId = ref(-1)

// table 参数条件
const paramsConditions = reactive({
  list: [] as any
})

onMounted(() => {
  editorReady.value = false
  if (prop.isEdit) {
    getEditHope()
  } else {
    reset()
  }
})

function deleteConditionAction(index: number) {
  paramsConditions.list.splice(index, 1)
  refreshConditionList()
}

function refreshConditionList() {
  for (let i = 0; i < paramsConditions.list.length; i++) {
    paramsConditions.list[i].sort = i
  }
}

function reset() {
  code.value = ''
  paramsConditions.list = []
  hopeName.value = ''
  conditionPassRule.value = 1
  headersData.list = [{ key: '', value: '' }]
  resStatus.value = '200'
  delayTimes.value = '0'
  editorReady.value = true
}

function getEditHope() {
  ApiGetSingleExpect(prop.editHope, {}).then((res: any) => {
    const codeValue = {
      edit: true,
      data: ''
    }
    const data = res.data
    hopeName.value = data.name
    conditionPassRule.value = Number(data.relation)
    paramsConditions.list = JSON.parse(data.expect_condition.condition_str)
    if (typeof data.expect_response.body === 'string') {
      codeValue.data = data.expect_response.body
    } else {
      codeValue.data = JSON.stringify(data.expect_response.body)
    }
    code.value = codeValue
    currentResponseId.value = data.expect_response.id
    currentConditionId.value = data.expect_condition.id
    resStatus.value = data.expect_response.status.toString()
    delayTimes.value = data.expect_response.delay.toString()
    headersData.list = (() => {
      const res = []
      const _d = JSON.parse(data.expect_response.header)
      for (const item in _d) {
        res.push({
          key: item,
          value: _d[item]
        })
      }
      res.push({
        key: '',
        value: ''
      })
      return res
    })()
    editorReady.value = true
  })
}

function tryString(value: any) {
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function createCondition() {
  paramsConditions.list.push({
    id: paramsConditions.list.length - 1,
    sort: paramsConditions.list.length - 1,
    position: 0,
    name: '',
    compare: 0,
    value: '',
    necessary: 0,
    status: 1
  })
}

function changeConditionPassRule(ruleIndex: number) {
  conditionPassRule.value = ruleIndex
}

function updateValue(value: Boolean) {
  emit('update:modelValue', false)
}

function getHopeParams() {
  const data = {
    api: Number(route.params.mock),
    is_public: prop.isPublic,
    is_private: !prop.isPublic,
    status: 1,
    name: hopeName.value,
    sort: hopeSort.value,
    relation: conditionPassRule.value,
    expect_response: {
      status: resStatus.value,
      header: (() => {
        const res: any = {}
        for (let i = 0; i < headersData.list.length - 1; i++) {
          res[headersData.list[i].key] = headersData.list[i].value
        }
        return JSON.stringify(res)
      })(),
      body: tryString(code.value.edit ? code.value.data : code.value),
      delay: Number(delayTimes.value),
      is_public: prop.isPublic,
      is_private: !prop.isPublic,
      is_default: false,
      is_expect: true
    },
    expect_condition: {
      condition_str: JSON.stringify(
        paramsConditions.list.sort((a: any, b: any) => a.sort - b.sort)
      )
    }
  }
  return data
}

async function confirmHope() {
  if (prop.isEdit) {
    await edit()
  } else {
    await create()
  }
}

async function create() {
  if (createChecking() === false) return
  const data = getHopeParams()
  await ApiExpectPostAction({}, data)
  emit('update:modelValue', false)
  emit('flush', true)
}

function createChecking() {
  if (hopeName.value.length === 0) {
    tools.message(t('project.mock.checking.expectName'), proxy, 'success')
    return false
  }
  return true
}

async function edit() {
  const data: any = getHopeParams()
  data.expect_response.id = currentResponseId.value
  data.expect_condition.id = currentConditionId.value
  await ApiEditExpect(prop.editHope, {}, data).then((res) => {
    emit('update:modelValue', false)
    emit('flush', true)
  })
}

function changeTableHeader(data: any) {
  headersData.list.push(data)
}

function deleteHeadersEle(index: number) {
  headersData.list.splice(index, 1)
}

function transferHeader() {
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

function checkStatus(value: string) {
  if (
    !Number(value) ||
    Number(value) % 1 !== 0 ||
    Number(value) < 200 ||
    Number(value) > 599
  ) {
    showStatusCheck.value = true
    return true
  }
  showStatusCheck.value = false
  return false
}
function checkDelay(value: any) {
  let compareValue = 0
  try {
    compareValue = parseInt(value)
    if (Number.isInteger(value)) {
      compareValue = parseInt(value)
    }
  } catch (error) {
    showDelayCheck.value = true
    return true
  }
  if (compareValue > -1 && compareValue <= 60000) {
    showDelayCheck.value = false
    return false
  }
  showDelayCheck.value = true
  return true
}

async function changeMenu(key: string, hiddenColor = false) {
  active.value = key
  const color: any = document.getElementsByClassName(
    'segmented-control-inner__color__inner'
  )[0]
  const innerColor: any = document.getElementsByClassName(
    'segmented-control-inner'
  )[0]
  if (hiddenColor) {
    color.style.display = 'none'
    innerColor.style.setProperty('--p', 'var(--greyDark)')
  } else {
    color.style.display = 'block'
    innerColor.style.setProperty('--p', 'var(--primary)')
  }
}
</script>

<style lang="scss" scoped>
/* new style */
$shadow: 0.3rem 0.3rem 0.6rem var(--greyLight-2),
  -0.2rem -0.2rem 0.5rem var(--white);
$inner-shadow: inset 0.2rem 0.2rem 0.5rem var(--greyLight-2),
  inset -0.2rem -0.2rem 0.5rem var(--white);

.exe-col {
  box-shadow: $shadow;
  border-radius: 0px 8px 8px 0px;
  transition: all 0.5s ease;
}
/*  SEGMENTED-CONTROL */
.segmented-control-inner {
  --p: var(--primary);
  grid-column: 3 / 4;
  grid-row: 1 / 2;
  width: 27.4rem;
  height: 3.5rem;
  box-shadow: $shadow;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  position: relative;
  .checkbox-p {
    font-size: 18px;
    font-weight: 500;
    margin-left: 5px;
    color: var(--primary);
  }

  input {
    display: none;
  }

  > input:checked + label {
    transition: all 0.5s ease;
    color: var(--p);
  }

  &__1,
  &__2,
  &__3,
  &__4,
  &__5,
  &__6 {
    width: 6.8rem;
    height: 2.6rem;
    font-size: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    color: var(--greyDark);
    transition: all 0.5s ease;

    &:hover {
      color: var(--primary);
    }
  }

  &__color__inner {
    position: absolute;
    height: 2.4rem;
    width: 6.2rem;
    margin-left: 0.3rem;
    border-radius: 0.5rem;
    box-shadow: $inner-shadow;
    pointer-events: none;
  }
}
.checkbox-control {
  width: auto;
  padding-right: 20px;
}

#tab-7:checked ~ .segmented-control-inner__color__inner {
  transform: translateX(0);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
#tab-8:checked ~ .segmented-control-inner__color__inner {
  transform: translateX(6.8rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
#tab-9:checked ~ .segmented-control-inner__color__inner {
  transform: translateX(13.6rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}

#tab-10:checked ~ .segmented-control-inner__color__inner {
  transform: translateX(20.4rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
#tab-11:checked ~ .segmented-control-inner__color__inner {
  display: none;
  // transform: translateX(6.8rem);
  // transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
#tab-12:checked ~ .segmented-control-inner__color__inner {
  transform: translateX(13.6rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}

.radio {
  grid-column: 1 / 3;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  justify-items: left;
  input {
    display: none;
  }
  &__1,
  &__3 {
    margin-left: 15px;
  }

  &__1,
  &__2,
  &__3 {
    & input:checked {
      & ~ label {
        box-shadow: $inner-shadow;
        &::after {
          background: var(--primary);
        }
      }
    }
    label {
      box-shadow: $shadow;
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      &:hover {
        &::after {
          background: var(--primary);
        }
      }

      &::after {
        content: '';
        position: absolute;
        width: 1rem;
        height: 1rem;
        background: var(--greyDark);
        border-radius: 50%;
        transition: 0.3s ease;
      }
    }
  }
}
.chip-icon-btn {
  font-size: 1.5rem;
  color: var(--primary);
  display: flex;
  justify-content: center;
}
.editor-row {
  margin-right: 20px;
  height: 600px;
  // margin-bottom: -100px;
}
</style>
