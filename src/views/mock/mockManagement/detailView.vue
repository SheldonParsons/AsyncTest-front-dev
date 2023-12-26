<template>
  <div>
    <div class="container">
      <el-row>
        <el-col :span="18">
          <el-row class="input-row" align="middle">
            <el-col :span="24">
              <el-radio-group v-model="methodRadio">
                <div
                  class="segmented-control-radio checkbox-control g-unselect"
                >
                  <div class="checkbox">
                    <div class="checkbox__1">
                      <input
                        @click="methodRadio = '0'"
                        id="checkbox-1"
                        :checked="methodRadio === '0'"
                        type="checkbox"
                      />
                      <label for="checkbox-1"
                        ><el-icon v-show="methodRadio === '0'" :size="20"
                          ><Select
                        /></el-icon>
                        <p class="checkbox-p">Get</p>
                      </label>
                    </div>
                  </div>
                  <el-divider
                    style="font-size: 16px"
                    direction="vertical"
                    border-style="dashed"
                  />
                  <div class="checkbox">
                    <div class="checkbox__2">
                      <input
                        @click="methodRadio = '1'"
                        id="checkbox-2"
                        :checked="methodRadio === '1'"
                        type="checkbox"
                      />
                      <label for="checkbox-2"
                        ><el-icon v-show="methodRadio === '1'" :size="20"
                          ><Select />
                        </el-icon>
                        <p class="checkbox-p">Post</p></label
                      >
                    </div>
                  </div>
                  <el-divider
                    style="font-size: 16px"
                    direction="vertical"
                    border-style="dashed"
                  />

                  <div class="checkbox">
                    <div class="checkbox__3">
                      <input
                        @click="methodRadio = '2'"
                        id="checkbox-3"
                        :checked="methodRadio === '2'"
                        type="checkbox"
                      />
                      <label for="checkbox-3"
                        ><el-icon v-show="methodRadio === '2'" :size="20"
                          ><Select />
                        </el-icon>
                        <p class="checkbox-p">Put</p></label
                      >
                    </div>
                  </div>
                  <el-divider
                    style="font-size: 16px"
                    direction="vertical"
                    border-style="dashed"
                  />

                  <div class="checkbox">
                    <div class="checkbox__4">
                      <input
                        @click="methodRadio = '3'"
                        id="checkbox-4"
                        :checked="methodRadio === '3'"
                        type="checkbox"
                      />
                      <label for="checkbox-4"
                        ><el-icon v-show="methodRadio === '3'" :size="20"
                          ><Select />
                        </el-icon>
                        <p class="checkbox-p">Delete</p></label
                      >
                    </div>
                  </div>
                </div>
                <el-tooltip
                  class="box-item"
                  effect="light"
                  :content="t('tooltip.buildInMethod')"
                  placement="bottom"
                >
                  <el-icon
                    style="margin-left: 20px"
                    @click="showDialog = true"
                    class="method-info"
                    ><InfoFilled
                  /></el-icon>
                </el-tooltip>
              </el-radio-group>
            </el-col>
          </el-row>
          <el-row class="input-row" align="middle">
            <el-col class="exe-col" :span="24">
              <el-tooltip
                :visible="showNameCheck"
                effect="light"
                placement="bottom"
              >
                <template #content>
                  <span style="font-size: 14px">{{
                    $t('input.check.empty')
                  }}</span>
                </template>
                <BlockInput
                  v-model="path"
                  class="create-child"
                  :text="$t('project.MockCol.url')"
                  :maxlength="200"
                  :blockText="domain"
                  @check="checkName"
                ></BlockInput>
              </el-tooltip>
            </el-col>
          </el-row>
          <el-row class="input-row" align="middle">
            <el-col class="exe-col" :span="24">
              <StandardInput
                class="create-child"
                v-model="desc"
                :text="$t('project.MockCol.desc')"
                :maxlength="300"
              ></StandardInput>
            </el-col>
          </el-row>

          <el-row class="input-row" align="middle">
            <el-col :span="24">
              <el-divider
                class="divider-text g-unselect"
                border-style="dashed"
                content-position="left"
              >
                <div
                  class="chip__icon"
                  style="
                    display: inline;
                    height: auto;
                    width: 2rem;
                    display: flex;
                    margin-right: 10px;
                  "
                >
                  <div v-if="settingType === 1" class="wave-container">
                    <div v-for="item in 20" class="wave"></div>
                  </div>
                  <el-icon v-if="settingType === 0"><PublicIcon /></el-icon>
                </div>

                {{
                  settingType === 0
                    ? t('project.MockCol.divider.responseInfo')
                    : t('project.MockCol.divider.responsePrivate')
                }}
              </el-divider>
            </el-col></el-row
          >
          <div v-show="loading" class="main-loading">
            <el-row>
              <el-col :span="24">
                <NormalLoading></NormalLoading>
              </el-col>
            </el-row>
          </div>
          <div v-show="!loading" class="main-content" style="height: 80%">
            <el-row justify="start" align="middle" class="tools-var">
              <el-col :span="12">
                <MoveSwitch
                  :activeMenu="activeMenuIndex"
                  @changeMenuAction="changeMenu"
                ></MoveSwitch>
              </el-col>
              <el-col
                :offset="6"
                :span="6"
                v-if="isEdit"
                style="display: flex; justify-content: right"
              >
                <MoveOther
                  :activeMenu="activeMenuIndex"
                  @changeMenuAction="changeMenu"
                ></MoveOther>
              </el-col>
            </el-row>
            <el-row class="child-row" v-if="activeMenuIndex === '1'">
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
                    '--el-button-hover-border-color':
                      GlobalStatus.colorList[1][0],
                    '--el-button-hover-bg-color': GlobalStatus.colorList[1][0]
                  }"
                  :icon="ArrowLeft"
                /> </el-col
              ><el-col :span="10">
                <TransferBar
                  :colorGroup="1"
                  v-model="transferData"
                ></TransferBar> </el-col
            ></el-row>
            <el-row class="editor-row" v-if="activeMenuIndex === '2'">
              <el-col :span="24">
                <JsonEditor
                  :colorGroup="1"
                  v-if="code !== undefined || (!isEdit && editorReady)"
                  class="create-child"
                  v-model="code"
                  :project="Number(route.params.project)"
                  :changeValue="isChangeCode"
                  @stopChangeCode="closeChangeCode"
                ></JsonEditor>
              </el-col>
            </el-row>
            <el-row
              class="input-row"
              align="middle"
              v-if="activeMenuIndex === '3'"
            >
              <el-col :span="18" class="exe-col">
                <el-tooltip
                  :visible="showStatusCheck"
                  effect="light"
                  placement="bottom"
                >
                  <template #content>
                    <span style="font-size: 14px">{{
                      $t('input.check.status')
                    }}</span>
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
            <el-row
              class="input-row"
              align="middle"
              v-if="activeMenuIndex === '4'"
            >
              <el-col :span="18" class="exe-col">
                <el-tooltip
                  :visible="showDelayCheck"
                  effect="light"
                  placement="bottom"
                >
                  <template #content>
                    <span style="font-size: 14px">{{
                      $t('input.check.delay')
                    }}</span>
                  </template>
                  <StandardInput
                    :colorType="1"
                    class="create-child"
                    v-model="delayTimes"
                    :text="$t('project.MockCol.delay')"
                    :maxlength="5"
                    :end-text="$t('project.mock.desc.millisecond')"
                    @check="checkDelay"
                  ></StandardInput>
                </el-tooltip>
              </el-col>
            </el-row>
            <el-row v-if="activeMenuIndex === '6'">
              <el-col :span="24"
                ><PresetTable
                  v-if="activeMenuIndex === '6'"
                  :cols="[
                    $t('project.MockCol.name'),
                    $t('project.mock.desc.totalCall'),
                    $t('project.mock.desc.lastCallTime'),
                    $t('project.mock.desc.lastCallPersonnel'),
                    $t('project.MockCol.creator'),
                    $t('project.MockCol.action')
                  ]"
                  :params="presetsTableParams"
                  :flushData="flushPresetsListFlag"
                  @editPresetsAction="showEditPresets"
                  @addPresetsAction="showCreatePresets"
                  @showPresetResponseList="showPresetResListAction"
                  @showPresetRecordList="showPresetRecordListAction"
                ></PresetTable>
              </el-col>
            </el-row>
            <el-row v-if="activeMenuIndex === '5'">
              <el-col :span="24"
                ><HopeTable
                  v-if="activeMenuIndex === '5'"
                  :cols="[
                    '',
                    $t('project.mock.desc.expectTableField.enabled'),
                    $t('project.MockCol.name'),
                    $t('project.mock.desc.expectTableField.condition'),
                    $t('project.MockCol.creator'),
                    $t('project.MockCol.action')
                  ]"
                  :params="expectTableParams"
                  :flushData="flushHopeListFlag"
                  @editHopeAction="showEditHope"
                  @addHopeAction="showCreateHope"
                ></HopeTable>
              </el-col>
            </el-row>
            <el-row style="margin-top: 50px"><p></p></el-row>
          </div>
        </el-col>
        <el-col :offset="1" :span="4">
          <AstButton
            v-if="isEdit"
            @click="copy('?astKey=' + privateKey)"
            :width="'100%'"
            :height="'3rem'"
            class="chip"
          >
            <div class="chip-icon-btn">
              <el-icon><KeyIcon /></el-icon>
            </div>
            <p class="chip-p-btn">{{ privateKey }}</p>
          </AstButton>
          <AstButton
            v-if="isEdit"
            :width="'100%'"
            :height="'3rem'"
            :class="
              'chip response-status response-status-top g-unselect' +
              (settingType === 0 ? ' select-btn' : '')
            "
            @click="settingTypeFn(0)"
          >
            <div class="chip-icon-btn">
              <el-icon><PublicIcon /></el-icon>
            </div>
            <p class="chip-p-btn">
              {{ $t('project.mock.desc.publicResSetting') }}
            </p>
          </AstButton>
          <AstButton
            v-if="isEdit"
            :width="'100%'"
            :height="'3rem'"
            :class="
              'chip response-status response-other g-unselect' +
              (settingType === 1 ? ' select-btn' : '')
            "
            @click="settingTypeFn(1)"
          >
            <div class="chip-icon-btn">
              <el-icon><PersonalIcon /></el-icon>
            </div>
            <p class="chip-p-btn">
              {{ $t('project.mock.desc.privateResSetting') }}
            </p>
            <FireIcon
              v-if="!hasPrivate"
              style="cursor: pointer; left: 85%"
            ></FireIcon>
          </AstButton>
          <MockBox class="response-other"></MockBox>
        </el-col>
      </el-row>
    </div>
    <CommitFooter
      v-if="isEdit"
      :createText="t('button.edit')"
      :cancelText="t('button.cancel')"
      @create="editData"
      @cancel="closeWindow"
    ></CommitFooter>
    <CommitFooter
      v-else
      :createText="t('button.create')"
      :cancelText="t('button.cancel')"
      @create="createData"
      @cancel="closeWindow"
    ></CommitFooter>
    <CommonDialog
      :dialog="showDialog"
      @closed="showDialog = !showDialog"
      :headerText="t('project.MockCol.dialogHeader')"
    >
      <CommonTable
        :cols="[
          t('project.buildInCol.buildIn'),
          t('project.buildInCol.desc'),
          t('project.buildInCol.demo')
        ]"
      ></CommonTable>
    </CommonDialog>
    <HopeDetailView
      v-if="showHopeDialog"
      v-model="showHopeDialog"
      :isEdit="isEditDetailHope"
      :editHope="currentEditHope"
      :isPublic="settingType === 0"
      @flush="flashHopeList"
    ></HopeDetailView>
    <PresetsDetailView
      v-if="showPresetsDialog"
      v-model="showPresetsDialog"
      :isEdit="isEditDetailPresets"
      :editPresets="currentEditPresets"
      :isPublic="settingType === 0"
      @flush="flashPresetsList"
    ></PresetsDetailView>
    <PresetsResListDialog
      v-model="showPresetsResList"
      :data="presetsResListData"
      @bindPresetRes="bindPresetResAction"
    ></PresetsResListDialog>
    <PresetsRecord
      v-model="showPresetsRecordList"
      :data="presetsRecordListData"
    ></PresetsRecord>
    <el-dialog
      v-model="showChangeDialog"
      :title="t('project.mock.tips.tips')"
      width="30%"
      style="border-radius: 15px"
    >
      <span style="font-size: 16px; font-weight: 500">{{
        t('project.mock.tips.content')
      }}</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="continueChangeType">{{
            t('project.mock.desc.continue')
          }}</el-button>
          <el-button type="primary" @click="updateCurrentResponse">
            {{ t('project.mock.desc.save') }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, getCurrentInstance, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useStore } from '@/store'

import JsonEditor from '@/components/common/editor/JsonEditor.vue'
import StandardInput from '@/components/common/input/standardInput.vue'
import BlockInput from '@/components/common/input/blockInput.vue'
import CommitFooter from '@/components/layout/footers/commitFooter.vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import useClipboard from 'vue-clipboard3/dist/esm/index.js'
import HeadersTable from '@/components/layout/debugs/headersTable.vue'
import TransferBar from '@/components/layout/debugs/transferBar.vue'
import CommonDialog from '@/components/layout/dialogs/commonDialog.vue'
import CommonTable from '@/components/layout/tables/commonTable.vue'
import HopeTable from './hopeTable.vue'
import MockBox from '@/views/otherwise/tools/MockBox.vue'
import AstButton from '@/components/common/button/ast_button.vue'
import NormalLoading from '@/components/layout/loading/normal_loading.vue'
import HopeDetailView from './hopeDetailView.vue'
import tools from '@/utils/tools'
import PublicIcon from '@/assets/svg/common/publicIcon.vue'
import PersonalIcon from '@/assets/svg/common/personalIcon.vue'
import KeyIcon from '@/assets/svg/common/keyIcon.vue'
import FireIcon from '@/components/layout/otherwise/fire-icon.vue'
import MoveSwitch from './moveSwitchView.vue'
import MoveOther from './moveOtherView.vue'
import PresetTable from './presetsTable.vue'
import PresetsDetailView from './presetsDetailView.vue'
import PresetsResListDialog from './presetsResList.vue'
import PresetsRecord from './presetsResRecordList.vue'

import {
  ApiAddSingleMock,
  ApiGetSingleMock,
  ApiChangeSingleMock
} from '@/api/mock/index'

import {
  ApiPresets,
  ApiGetSinglePresets,
  ApiPresetsRecord
} from '@/api/mock/presets'

import { ApiGetBasicConfig } from '@/api/index'
import GlobalStatus from '@/global'

const store = useStore()
const code: any = ref(undefined)
const path = ref('')
const desc = ref('')
const domain = ref()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { proxy }: any = getCurrentInstance()
const showNameCheck = ref(false)
const showStatusCheck = ref(false)
const showDelayCheck = ref(false)
const showDialog = ref(false)
const showHopeDialog = ref(false)
const showPresetsDialog = ref(false)
const methodRadio = ref('0')
const transferData = ref('')
const activeMenuIndex = ref('2')
const isChangeCode = ref(false)
const headersData = reactive({
  list: [{ key: '', value: '' }] as any
})

const expectTableParams = ref({})
const presetsTableParams = ref({})
const hasPrivate = ref(false)
const showChangeDialog = ref(false)
const currentPresetsId = ref(-1)
const showPresetsRecordList = ref(false)

const isCommit = ref(false)
const isEdit = ref(false)
const resStatus = ref('200')
const delayTimes = ref('0')
const editorReady = ref(false)
const settingType = ref(0)
const loading = ref(false)
const privateKey = ref('Loading...')
const flushHopeListFlag = ref(false)
const flushPresetsListFlag = ref(false)
const showPresetsResList = ref(false)

const presetsResListData = ref({})
const presetsRecordListData = ref({})

// 详细期望参数
const isEditDetailHope = ref(false)
const isEditDetailPresets = ref(false)
const currentEditHope = ref(-1)
const currentEditPresets = ref(-1)

// 期望搜索参数
const isPublic = ref(0)
const isPrivate = ref(0)
const privateUser = ref(-1)
const api = ref(0)

const tryChangeStatus = ref(0)

const isChangeResponse = ref(false)
const shouldListenerChangeResponse = ref(true)

onMounted(async () => {
  editorReady.value = false
  ApiGetBasicConfig({ type: 'mockDomain' }).then((data: any) => {
    domain.value = data.result.domain_mock + '‎'
  })
  isEdit.value = router.currentRoute.value.name === 'editMock'
  if (isEdit.value) {
    const data = {
      project: route.params.project
    }
    await getApiGetSingleMock(data)
  } else {
    code.value = ''
    editorReady.value = true
  }
  addListener()
  getPrivateKey()
})

watch(
  [headersData, code, resStatus, delayTimes],
  (
    [newHeader, newCode, newStatus, newDelay],
    [oldHeader, oldCode, oldStatus, oldDelay]
  ) => {
    if (shouldListenerChangeResponse.value === true) {
      isChangeResponse.value = true
    }
    shouldListenerChangeResponse.value = true
  }
)

function showPresetResListAction(params: any, presetsId: any) {
  const s = params.api + '-' + (params.is_public ? 1 : 0)
  const data = {
    presets_binding: s
  }
  currentPresetsId.value = presetsId
  ApiPresets(data).then((res: any) => {
    console.log(res)
    presetsResListData.value = res.data
    showPresetsResList.value = true
  })
}

function showPresetRecordListAction(presetsId: any) {
  ApiPresetsRecord({ presets: presetsId }).then((data: any) => {
    presetsRecordListData.value = data.results
    showPresetsRecordList.value = true
  })
}

async function bindPresetResAction(resId: any, flushDefault: boolean) {
  const data = {
    cover_presets_res: resId
  }
  await ApiGetSinglePresets(currentPresetsId.value, data).then(async (res) => {
    showPresetsResList.value = false
    proxy.$message({
      message: '覆盖成功',
      duration: 3000,
      type: 'success'
    })
    if (flushDefault) {
      const _data: any = {
        project: route.params.project
      }
      if (settingType.value === 1) {
        _data.private_default = 1
      }
      await getApiGetSingleMock(_data)
    }
  })
}

async function continueChangeType() {
  settingType.value = tryChangeStatus.value
  loading.value = true
  await changeMenu(activeMenuIndex.value)
  const _data: any = {
    project: route.params.project
  }
  if (settingType.value === 1) {
    _data.private_default = 1
  }
  await getApiGetSingleMock(_data)
  loading.value = false
  showChangeDialog.value = false
}

async function updateCurrentResponse() {
  editData(false).then(async (res) => {
    if (res) {
      settingType.value = tryChangeStatus.value
      loading.value = true
      await changeMenu(activeMenuIndex.value)
      const _data: any = {
        project: route.params.project
      }
      if (settingType.value === 1) {
        _data.private_default = 1
      }
      await getApiGetSingleMock(_data)
      loading.value = false
    }
    showChangeDialog.value = false
  })
}

async function editData(shouldCloseWindow: boolean = true) {
  if (!emptyCheck() || checkName(path.value)) return false
  fixedPath()
  isCommit.value = true
  const data = {
    path: path.value,
    method: Number(methodRadio.value),
    name: 'default',
    desc: desc.value,
    status: Number(resStatus.value),
    header: (() => {
      const res: any = {}
      for (let i = 0; i < headersData.list.length - 1; i++) {
        res[headersData.list[i].key] = headersData.list[i].value
      }
      return JSON.stringify(res)
    })(),
    body: tryString(code.value.edit ? code.value.data : code.value),
    delay: Number(delayTimes.value),
    project: Number(route.params.project)
  }
  const params = {
    is_public: settingType.value
  }
  await ApiChangeSingleMock(Number(route.params.mock), data, params).then(
    (data: any) => {
      if (data.non_field_errors) {
        proxy.$message({
          message: t('project.MockCol.check.unique'),
          duration: 3000,
          type: 'warning'
        })
        isCommit.value = false
      } else {
        changeStorage('editMock', JSON.stringify(data.data))
        if (shouldCloseWindow) window.close()
      }
    }
  )
  return true
}

async function settingTypeFn(t: number) {
  if (isChangeResponse.value) {
    showChangeDialog.value = true
    tryChangeStatus.value = t
  } else {
    settingType.value = t
    loading.value = true
    console.log(activeMenuIndex.value === '5')

    if (activeMenuIndex.value === '5') {
      searchExpect('5', true, false)
    } else if (activeMenuIndex.value === '6') {
      searchPresets()
    } else {
      await changeMenu(activeMenuIndex.value, false, false)
    }
    const _data: any = {
      project: route.params.project
    }
    if (settingType.value === 1) {
      _data.private_default = 1
    }
    await getApiGetSingleMockEdit(_data)
    loading.value = false
  }
  console.log(activeMenuIndex.value)
}

async function searchPresets() {
  api.value = Number(route.params.mock)
  if (settingType.value === 0) {
    isPublic.value = 1
    isPrivate.value = 0
  } else if (settingType.value === 1) {
    isPublic.value = 0
    isPrivate.value = 1
  }
  const data = {
    is_public: isPublic.value === 1,
    api: api.value
  }
  presetsTableParams.value = data
  if ('6' === activeMenuIndex.value) {
    flashPresetsList(true)
    return
  }
}

async function searchExpect(
  key: string,
  hiddenColor = false,
  shouldChangeMenu = true
) {
  if (settingType.value === 0) {
    isPublic.value = 1
    isPrivate.value = 0
  } else if (settingType.value === 1) {
    isPublic.value = 0
    isPrivate.value = 1
  }
  api.value = Number(route.params.mock)
  const data = {
    is_public: isPublic.value,
    is_private: isPrivate.value,
    private_user: privateUser.value,
    api: api.value
  }
  expectTableParams.value = data
  if (key === activeMenuIndex.value) {
    flashHopeList(true)
    return
  }
  if (shouldChangeMenu) {
    await changeMenu(key, hiddenColor)
  }
}

async function flashHopeList(flag: boolean) {
  if (flag) {
    flushHopeListFlag.value = !flushHopeListFlag.value
    tools.message(t('notice.flush'), proxy, 'success')
  }
}

async function flashPresetsList(flag: boolean) {
  if (flag) {
    flushPresetsListFlag.value = !flushPresetsListFlag.value
    tools.message(t('notice.flush'), proxy, 'success')
  }
}

function showEditHope(element: any) {
  showHopeDialog.value = true
  currentEditHope.value = element.id
  isEditDetailHope.value = true
}

function showEditPresets(element: any) {
  console.log(element.id)

  showPresetsDialog.value = true
  currentEditPresets.value = element.id
  isEditDetailPresets.value = true
}

function showCreateHope() {
  isEditDetailHope.value = false
  showHopeDialog.value = true
}

function showCreatePresets() {
  console.log('show ...')

  isEditDetailPresets.value = false
  showPresetsDialog.value = true
}

function getPrivateKey() {
  store.dispatch('getUser').then((data) => {
    privateKey.value = data.privateKey
  })
}

function closeChangeCode() {
  isChangeCode.value = false
}

async function getApiGetSingleMockEdit(data: any) {
  shouldListenerChangeResponse.value = false
  await ApiGetSingleMock(Number(route.params.mock), data).then((data: any) => {
    hasPrivate.value =
      settingType.value === 1 ? true : data.data.has_private === 1
    const codeValue = {
      edit: true,
      data: ''
    }
    let coreRes = data.data.public_default_response
    if (settingType.value === 1) {
      coreRes = data.data
    } else {
      path.value = data.data.path
      desc.value = data.data.desc
      methodRadio.value = data.data.method.toString()
    }
    if (typeof coreRes.body === 'string') {
      codeValue.data = coreRes.body
    } else {
      codeValue.data = JSON.stringify(coreRes.body)
    }
    isChangeCode.value = true
    code.value = codeValue.data
    resStatus.value = coreRes.status.toString()
    delayTimes.value = coreRes.delay.toString()
    // headers
    headersData.list = (() => {
      const res = []
      const _d = JSON.parse(coreRes.header)
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
    isChangeResponse.value = false
  })
}

async function getApiGetSingleMock(data: any) {
  shouldListenerChangeResponse.value = false
  await ApiGetSingleMock(Number(route.params.mock), data).then((data: any) => {
    hasPrivate.value =
      settingType.value === 1 ? true : data.data.has_private === 1
    const codeValue = {
      edit: true,
      data: ''
    }
    let coreRes = data.data.public_default_response
    if (settingType.value === 1) {
      coreRes = data.data
    } else {
      path.value = data.data.path
      desc.value = data.data.desc
      methodRadio.value = data.data.method.toString()
    }
    if (typeof coreRes.body === 'string') {
      codeValue.data = coreRes.body
    } else {
      codeValue.data = JSON.stringify(coreRes.body)
    }
    code.value = codeValue.data
    resStatus.value = coreRes.status.toString()
    delayTimes.value = coreRes.delay.toString()
    // headers
    headersData.list = (() => {
      const res = []
      const _d = JSON.parse(coreRes.header)
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
    isChangeResponse.value = false
  })
}

// 复制至剪贴板
async function copy(value: String) {
  const { toClipboard } = useClipboard()
  await toClipboard(value.toString())
  tools.message(t('notice.clipboard'), proxy, 'success')
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

function addListener() {
  window.addEventListener('beforeunload', function (event) {
    if (isCommit.value) {
      return true
    } else {
      event.returnValue = false
      return false
    }
  })
}

function fixedPath() {
  if (path.value[0] === '/') return
  path.value = '/' + path.value
}

function tryString(value: any) {
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function createData() {
  if (!emptyCheck() || checkName(path.value)) return
  fixedPath()
  isCommit.value = true
  const data = {
    path: path.value,
    method: Number(methodRadio.value),
    name: 'default',
    desc: desc.value,
    status: Number(resStatus.value),
    header: (() => {
      const res: any = {}
      for (let i = 0; i < headersData.list.length - 1; i++) {
        res[headersData.list[i].key] = headersData.list[i].value
      }
      return JSON.stringify(res)
    })(),
    body: tryString(code.value),
    delay: Number(delayTimes.value),
    project: Number(route.params.project)
  }
  ApiAddSingleMock(data).then((data: any) => {
    if (data.non_field_errors) {
      proxy.$message({
        message: t('project.MockCol.check.unique'),
        duration: 3000,
        type: 'warning'
      })
      isCommit.value = false
    } else {
      changeStorage('createMock', JSON.stringify(data.data))
      window.close()
    }
  })
}

async function changeMenu(
  key: string,
  hiddenColor = false,
  searchAgain = true
) {
  const color: any = document.getElementsByClassName(
    'segmented-control' + (Number(key) > 4 ? '' : '-other') + '__color'
  )[0]
  const innerColor: any = document.getElementsByClassName(
    'segmented-control' + (Number(key) > 4 ? '' : '-other')
  )[0]
  color.style.display = 'none'
  innerColor.style.setProperty('--p', 'var(--greyDark)')

  const anotherInnerColor: any = document.getElementsByClassName(
    'segmented-control' + (Number(key) > 4 ? '-other' : '')
  )[0]
  const anotherColor: any = document.getElementsByClassName(
    'segmented-control' + (Number(key) > 4 ? '-other' : '') + '__color'
  )[0]

  anotherColor.style.display = 'block'
  anotherInnerColor.style.setProperty('--p', 'var(--primary)')
  activeMenuIndex.value = key
  if (Number(key) === 5 && searchAgain) {
    searchExpect(key, true, false)
  } else if (Number(key) === 6 && searchAgain) {
    searchPresets()
  }
}

function changeStorage(changeString: string, data: any) {
  // localStorage.setItem('changeString', changeString)
  localStorage.setItem(changeString, data)
}

function emptyCheck() {
  if (showStatusCheck.value || showDelayCheck.value) {
    proxy.$message({
      message: t('notice.check'),
      duration: 3000,
      type: 'warning'
    })
    return false
  }
  if (path.value.length === 0 || desc.value.length === 0) {
    proxy.$message({
      message: t('project.MockCol.check.empty'),
      duration: 3000,
      type: 'warning'
    })
    return false
  }
  return true
}

function closeWindow() {
  isCommit.value = false
  window.close()
}

function checkName(value: string) {
  showNameCheck.value = value.length === 0
  return showNameCheck.value
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
</script>

<style lang="scss" scoped>
/* new style */
$shadow: 0.3rem 0.3rem 0.6rem var(--greyLight-2),
  -0.2rem -0.2rem 0.5rem var(--white);
$inner-shadow: inset 0.2rem 0.2rem 0.5rem var(--greyLight-2),
  inset -0.2rem -0.2rem 0.5rem var(--white);
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
.segmented-control-radio {
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

  &__color {
    position: absolute;
    height: 2.4rem;
    width: 6.4rem;
    margin-left: 0.3rem;
    border-radius: 0.5rem;
    box-shadow: $inner-shadow;
    pointer-events: none;
  }
}
.container {
  padding-top: 100px;
  height: 100%;
  margin-left: 5%;
  .editor-row {
    height: 70%;
  }
  .input-row {
    margin-bottom: 20px;
    .method-info {
      font-size: 20px;
      cursor: pointer;
    }
  }
}
.exe-col {
  box-shadow: $shadow;
  border-radius: 0px 8px 8px 0px;
  transition: all 0.5s ease;
}

.res-divider-span {
  font-size: 1.1rem;
  color: var(--global-theme-color);
}

.tools-var {
  margin-bottom: 20px;
}

/*  SEGMENTED-CONTROL */

/*  CHECKBOX  */
.checkbox {
  grid-column: 1 / 2;
  display: grid;
  // grid-template-columns: repeat(2, 6rem);
  grid-gap: 3rem;
  justify-content: center;
  input {
    display: none;
  }

  &__1,
  &__2,
  &__3,
  &__4 {
    width: 7rem;
    display: flex;
    justify-content: center;
    label {
      margin-left: 20px;
      // box-shadow: $shadow;
      cursor: pointer;
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 0.2rem;
      width: 100%;
      height: 2rem;
      transition: 0.3s ease-in-out;

      &:hover i {
        color: var(--primary);
      }

      i {
        font-size: 1.8rem;
        font-weight: 700;
        color: var(--greyDark);
        transition: 0.3s ease-in-out;
      }
    }

    & input:checked {
      & ~ label {
        box-shadow: $inner-shadow;
        i {
          color: var(--primary);
        }
      }
    }
  }
}

/*  CHIP  */
.chip {
  cursor: pointer;
  grid-column: 2 / 3;
  grid-row: 3 / 4;
  justify-self: center;
  width: 100%;
  height: 3rem;
  border-radius: 8px;
  // box-shadow: $shadow;
  background-color: white;
  display: flex;
  justify-content: left;
  align-items: center;

  &__icon {
    width: 3rem;
    height: 3rem;
    border-radius: 1rem;
    // margin: 0 0 0 0.2rem;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.5rem;
    color: var(--primary);
  }

  p {
    font-size: 0.9rem;
    // margin-left: -1.8rem;
    color: var(--greyDark);
  }

  &__close {
    width: 1.6rem;
    height: 1.6rem;
    margin: 0 0.5rem;
    display: flex;
    font-size: 1.6rem;
    color: var(--greyLight-3);
    cursor: pointer;
  }
}
.response-status-top {
  margin-top: 50px;
}

.chip-down {
  box-shadow: $inner-shadow;
}
.response-other {
  margin-top: 20px;
}

.chip-icon-btn {
  font-size: 1.5rem;
  color: var(--primary);
  display: flex;
  justify-content: center;
}

.checkbox-control {
  width: auto;
  padding-right: 20px;
}

.chip-p-btn {
  font-size: 0.9rem;
  color: var(--greyDark);
  margin: 0;
  margin-left: 7px;
  height: auto;
}
$shadow: 0.3rem 0.3rem 0.6rem var(--greyLight-2),
  -0.2rem -0.2rem 0.5rem var(--white);
.arrow-btn {
  border-radius: 0.5rem;
  box-shadow: inset 0.2rem 0.2rem 1rem var(--el-color-primary),
    inset -0.2rem -0.2rem 1rem var(--el-button-hover-border-color), $shadow;
}

.flush-btn {
  div {
    width: 100% !important;
  }
}

// fun to customize, guaranteed. act now.
$size: 30px; // project size
$max-w: 13em; // biggest wave
$min-w: 0.25em; // smallest wave
$r: $max-w - $min-w; // width range
$speed: 1000ms; // wave speed
$f: 20; // number of waves
$s-w: 0.5em; // wave width
$c: #1abc9c; // wave color

body {
  background: #2c3e50;
}

.wave-container {
  position: relative;
  width: 15em;
  height: 8em;
  font-size: calc($size / ($max-w / 1em));
  overflow: hidden;
}

.wave {
  border-width: $s-w;
  border-style: solid;
  position: absolute;
  animation: wave $speed infinite alternate;
  transform: rotate(-44.5deg);
  $a: 1; // alpha
  @for $i from 1 through $f {
    &:nth-child(#{$i}) {
      $w: $max-w - ((calc($r / $f)) * $i);
      @if $i > 1 {
        $a: 1 - ((calc(1 / ($f + 1))) * $i);
      }
      width: $w;
      height: $w;
      bottom: calc($w / -2);
      left: calc(($max-w - $w) / 2);
      animation-delay: $i * calc($speed / $f);
      border-color: transparent transparent rgba($c, $a) rgba($c, $a);
      border-radius: $w;
    }
  }
}

@keyframes wave {
  to {
    transform: rotate(135deg);
  }
}
</style>

<style lang="scss">
.divider-text .el-divider__text {
  font-size: 1rem !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

.select-btn {
  .btn-16 {
    background-color: var(--primary) !important;
  }
  .chip-icon-btn,
  .chip-p-btn {
    color: white !important;
  }
}
</style>
