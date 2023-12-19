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
          v-model="presetsName"
          :text="$t('project.mock.desc.presetsName')"
          :maxlength="50"
        ></StandardInput>
      </el-col>
    </el-row>
    <el-row
      justify="start"
      align="middle"
      class="tools-var"
      style="margin-top: 3%; margin-bottom: 40px"
    >
      <el-col :span="12">
        <div class="segmented-control-presets g-unselect">
          <input
            type="radio"
            name="radio11"
            @click="changeMenu('2')"
            value="11"
            id="tab-11"
            :checked="active === '2'"
          />
          <label for="tab-11" class="segmented-control-presets__1">
            <p>Body</p></label
          >

          <input
            type="radio"
            name="radio12"
            @click="changeMenu('1')"
            value="12"
            id="tab-12"
            :checked="active === '1'"
          />
          <label for="tab-12" class="segmented-control-presets__2">
            <p>Headers</p></label
          >

          <input
            type="radio"
            name="radio13"
            @click="changeMenu('3')"
            value="13"
            id="tab-13"
            :checked="active === '3'"
          />
          <label for="tab-13" class="segmented-control-presets__3">
            <p>Status</p></label
          >

          <input
            type="radio"
            name="radio14"
            @click="changeMenu('4')"
            value="14"
            id="tab-14"
            :checked="active === '4'"
          />
          <label for="tab-14" class="segmented-control-presets__4">
            <p>{{ $t('project.mock.desc.moreSetting') }}</p></label
          >

          <div class="segmented-control-presets__color__inner"></div>
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
      <el-col :span="23">
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
import HeadersTable from '@/components/layout/debugs/headersTable.vue'
import TransferBar from '@/components/layout/debugs/transferBar.vue'
import JsonEditor from '@/components/common/editor/JsonEditor.vue'
import {
  ApiGetSinglePresets,
  ApiEditPresets,
  ApiPresetsPostAction
} from '@/api/mock/presets'
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
  editPresets: {
    type: Number,
    default: -1
  },
  isPublic: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['update:modelValue', 'update:presetsName', 'flush'])

const route = useRoute()

const code: any = ref(undefined)
const presetsName = ref('')
const active = ref('2')
const transferData = ref('')
const resStatus = ref('200')
const delayTimes = ref('0')
const editorReady = ref(false)
const showStatusCheck = ref(false)
const showDelayCheck = ref(false)
const headersData = reactive({
  list: [{ key: '', value: '' }] as any
})

// table 参数条件
const paramsConditions = reactive({
  list: [] as any
})

onMounted(() => {
  editorReady.value = false
  if (prop.isEdit) {
    getEditPresets()
  } else {
    reset()
  }
})

function reset() {
  code.value = ''
  presetsName.value = ''
  headersData.list = [{ key: '', value: '' }]
  resStatus.value = '200'
  delayTimes.value = '0'
  editorReady.value = true
}

function getEditPresets() {
  ApiGetSinglePresets(prop.editPresets, {}).then((res: any) => {
    const codeValue = {
      edit: true,
      data: ''
    }
    const data = res.data
    presetsName.value = data.name
    if (typeof data.body === 'string') {
      codeValue.data = data.body
    } else {
      codeValue.data = JSON.stringify(data.body)
    }
    code.value = codeValue
    resStatus.value = data.status.toString()
    delayTimes.value = data.delay.toString()
    headersData.list = (() => {
      const res = []
      const _d = JSON.parse(data.header)
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

function updateValue(value: Boolean) {
  emit('update:modelValue', false)
}

function getPresetsParams() {
  const data = {
    api: Number(route.params.mock),
    is_public: prop.isPublic,
    name: presetsName.value,
    status: resStatus.value,
    header: (() => {
      const res: any = {}
      for (let i = 0; i < headersData.list.length - 1; i++) {
        res[headersData.list[i].key] = headersData.list[i].value
      }
      return JSON.stringify(res)
    })(),
    body: tryString(code.value.edit ? code.value.data : code.value),
    delay: Number(delayTimes.value)
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
  const data = getPresetsParams()
  await ApiPresetsPostAction({}, data)
  emit('update:modelValue', false)
  emit('flush', true)
}

function createChecking() {
  if (presetsName.value.length === 0) {
    tools.message(t('project.mock.checking.presetsName'), proxy, 'success')
    return false
  }
  return true
}

async function edit() {
  const data: any = getPresetsParams()
  await ApiEditPresets(prop.editPresets, {}, data).then((res) => {
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
.segmented-control-presets {
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
  &__4 {
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

#tab-11:checked ~ .segmented-control-presets__color__inner {
  transform: translateX(0);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
#tab-12:checked ~ .segmented-control-presets__color__inner {
  transform: translateX(6.8rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
#tab-13:checked ~ .segmented-control-presets__color__inner {
  transform: translateX(13.6rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}

#tab-14:checked ~ .segmented-control-presets__color__inner {
  transform: translateX(20.4rem);
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
</style>
