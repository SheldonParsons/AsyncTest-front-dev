<template>
  <div
    class="tool g-unselect"
    :style="{
      '--dyToolsWidth': dyWidth + 'px',
      '--dyToolsHeight': dyHeight + 'px',
      '--dyPaddingTop': dyPaddingTop + '%',
      '--dyFontSize': dyFontSize + 'px',
      '--dyOtherHeight': dyOtherHeight + '%'
    }"
    @click="showCore"
  >
    <p class="tools-p">{{ $t('tool.x2e.title') }}</p>
    <div class="fake-btn">
      <span>{{ $t('tool.baseJavaScript') }}</span>
    </div>
  </div>
  <CommonDialog
    :dialog="showX2EGuide"
    :cancelDoubleCheck="false"
    :confirmDoubleCheck="false"
    :modalCloseable="true"
    :dWidth="70"
    :dTop="5"
    :hasFooter="false"
    :headerText="t('tool.x2e.guideHeader')"
    @closed="showX2EGuide = false"
    ><Guide></Guide
  ></CommonDialog>
  <CommonDialog
    :dialog="showUploadDialog"
    :cancelDoubleCheck="false"
    :confirmDoubleCheck="false"
    :modalCloseable="false"
    :dWidth="60"
    :dTop="20"
    :hasFooter="true"
    :headerText="t('tool.x2e.dialogHeader')"
    :footerConfirmDesc="t('tool.x2e.preview')"
    :footerCancelDesc="t('tool.x2e.cancel')"
    @confirm="generateTable"
    @closed="closedUploadDialog"
    @cancel="closedUploadDialog"
  >
    <template v-slot:icon>
      <el-tooltip
        class="box-item"
        effect="light"
        :content="t('tool.x2e.guideTooltip')"
        placement="bottom"
      >
        <el-icon
          @click="showX2EGuide = true"
          color="white"
          style="cursor: pointer"
          class="method-info"
          ><InfoFilled
        /></el-icon>
      </el-tooltip>
    </template>
    <el-upload
      ref="upload"
      class="upload-demo"
      :drag="true"
      :limit="1"
      :on-exceed="handleExceed"
      :on-change="handleChange"
      :on-remove="handleRemove"
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">
        {{ $t('tool.x2e.uploadTips') }} <em>{{ $t('tool.x2e.clickUpload') }}</em
        >（{{ $t('tool.x2e.otherTips') }}）
      </div>
      <template #tip>
        <div class="el-upload__tip">{{ $t('tool.x2e.format') }}</div>
      </template>
    </el-upload>
  </CommonDialog>
  <CommonDialog
    :dialog="showPreviewDialog"
    :cancelDoubleCheck="false"
    :confirmDoubleCheck="false"
    :dWidth="90"
    :dTop="5"
    :hasFooter="true"
    ref="excelDialog"
    :headerText="t('tool.x2e.next2.title')"
    :footerConfirmDesc="t('tool.x2e.next2.download')"
    :footerCancelDesc="t('tool.x2e.next2.reUpload')"
    @confirm="downloadExcel"
    @closed="closedPreviewDialog"
    @cancel="reopenUploadDialog"
  >
    <el-table-v2
      :columns="cols"
      :data="rows.list"
      :width="dyViewWidth"
      :height="400"
      fixed
    />
  </CommonDialog>
</template>

<script setup lang="ts">
import { ref, reactive, getCurrentInstance, onMounted } from 'vue'
import { genFileId } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { UploadInstance, UploadProps, UploadRawFile } from 'element-plus'
import CommonDialog from '@/components/layout/dialogs/commonDialog.vue'
import Guide from '../details/xmind2excelGuide.vue'
import { parseXmindFileToJson } from 'parse-mind'
import Xmind from '../xmindObj'
import * as XLSX from 'xlsx'

const { t } = useI18n()

const dyWidth = ref(180)
const dyHeight = ref(70)
const dyPaddingTop = ref(5)
const dyFontSize = ref(12)
const dyOtherHeight = ref(30)

onMounted(() => {
  if (!props.fixSize) {
    dyWidth.value = document.documentElement.clientWidth * 0.16
    dyHeight.value = dyWidth.value / 3
    dyPaddingTop.value = 7
    dyFontSize.value = 16
    dyOtherHeight.value = 25
  }
})

const props = defineProps({
  shouldTurn: {
    type: Boolean,
    default: false
  },
  fixSize: {
    type: Boolean,
    default: false
  }
})

const showUploadDialog = ref(false)
const showPreviewDialog = ref(false)
const upload = ref<UploadInstance>()
const { proxy }: any = getCurrentInstance()
const originData = ref<any>(null)
const excelDialog = ref<HTMLElement>()
const xmind = ref()
const router = useRouter()
const route = useRoute()
const hasFirstChange = ref(false)
const showX2EGuide = ref(false)
const cols: any = ref([])
const rows = reactive({
  list: [] as any
})
const dyViewWidth = ref(0)

function showCore() {
  if (props.shouldTurn) {
    router.push({
      name: 'otherwise',
      params: {
        project: Number(route.params.project)
      }
    })
  } else {
    showUploadDialog.value = true
  }
}

const handleExceed: UploadProps['onExceed'] = (files) => {
  upload.value!.clearFiles()
  const file = files[0] as UploadRawFile
  file.uid = genFileId()
  upload.value!.handleStart(file)
}

const handleRemove: UploadProps['onRemove'] = (file) => {
  upload.value!.clearFiles()
  originData.value = null
}

const handleChange: UploadProps['onChange'] = (uploadFile: any) => {
  if (!hasFirstChange.value) {
    hasFirstChange.value = true
    return
  }
  if (checkFile(uploadFile.name)) {
    try {
      parseXmindFileToJson(uploadFile.raw)
        .then((data) => {
          originData.value = data
          generateTable()
        })
        .catch((error) => {
          originData.value = null
          upload.value!.clearFiles()
          window.$toast({
            title: '文件解析错误，请升级您的Xmind，该版本缺少content.json文件：' + error,
            type: 'warning'
          })
        })
    } catch (error) {
      window.$toast({ title: '文件内容有误，请调整文件：' + error, type: 'warning' })
      originData.value = null
      upload.value!.clearFiles()
    }
  }
}

function downloadExcel() {
  generateExcel(xmind.value)
}

function closedPreviewDialog() {
  showPreviewDialog.value = false
  cols.value = []
  rows.list = []
}

function reopenUploadDialog() {
  closedPreviewDialog()
  originData.value = null
  upload.value!.clearFiles()
  cols.value = []
  rows.list = []
  showUploadDialog.value = true
}

function generateExcel(xmind: any) {
  const d = []
  const maxWidth: any = {}
  for (let i = 0; i < rows.list.length; i++) {
    const dRow: any = {}
    for (let j = 0; j < cols.value.length; j++) {
      if (
        !maxWidth[j] ||
        maxWidth[j] < String(rows.list[i]['column-' + j]).length
      ) {
        maxWidth[j] = String(rows.list[i]['column-' + j]).length
      }
      dRow[cols.value[j].title] = rows.list[i]['column-' + j]
    }
    d.push(dRow)
  }
  const ws = XLSX.utils.json_to_sheet(d)
  ws['!cols'] = Array.from(cols.value).map((_, index) => ({
    wch:
      Math.ceil(maxWidth[index] * 2.2) > 10
        ? Math.ceil(maxWidth[index] * 2.2)
        : 10
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '测试用例')
  XLSX.writeFile(wb, xmind.topic.title + '_' + xmind.typeString + '.xlsx')
  return d
}

function generateTable() {
  if (originData.value) {
    console.log(originData.value)
    xmind.value = new Xmind()
    xmind.value.generate(originData.value)
    console.log(xmind.value.generateColumns())
    console.log(xmind.value.generateData())
    cols.value = xmind.value.generateColumns()
    rows.list = xmind.value.generateData()

    showPreviewDialog.value = true
    dyViewWidth.value = document.body.clientWidth * 0.9 - 35
    closedUploadDialog()
  } else {
    window.$toast({ title: '请先上传文件！', type: 'warning' })
  }
}

function checkFile(name: string) {
  const _splitList = name.split('.')
  const _suffix = _splitList[_splitList.length - 1]
  if (_suffix !== 'xmind') {
    window.$toast({ title: '文件类型不一致，请重新上传！', type: 'warning' })
    upload.value!.clearFiles()
    return false
  }
  return true
}

function closedUploadDialog() {
  showUploadDialog.value = false
  originData.value = null
  upload.value!.clearFiles()
}
</script>

<style lang="scss" scoped>
.tool {
  cursor: pointer;
  background-image: url('@/assets/img/projectStyle/l-bg-2.png');
  height: var(--dyToolsHeight);
  width: var(--dyToolsWidth);
  //   margin-left: 20px;
  border-radius: 10px;
  background-size: cover;
  border: 2px solid #fff;
  text-align: center;
  .tools-p {
    margin: 0;
    font-weight: 700;
    font-size: 16px;
    text-align: center;
    padding-top: var(--dyPaddingTop);
    color: aliceblue;
    background: -webkit-linear-gradient(315deg, #ffffff 45%, #caff70);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .fake-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    align-content: center;
    width: 60%;
    height: var(--dyOtherHeight);
    margin: auto;
    background: -webkit-linear-gradient(315deg, #00cd66 20%, #008b45);
    border-radius: 5px;
    margin-top: 5px;
    margin-bottom: 5px;
    font-size: var(--dyFontSize);
    color: #fff;
  }
}
.tool:hover {
  border: 2px solid rgb(0, 214, 75);
}
</style>
