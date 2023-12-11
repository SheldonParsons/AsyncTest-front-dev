<template>
  <div class="container">
    <el-row class="input-row" align="middle">
      <el-col :span="22" :md="15" :sm="22">
        <el-tooltip :visible="showNameCheck" effect="light" placement="bottom">
          <template #content>
            <span style="font-size: 14px">{{
              $t('component.editor.nameReg')
            }}</span>
          </template>
          <StandardInput
            v-model="name"
            class="create-child"
            :text="$t('project.dataCol.name')"
            :maxlength="60"
            @check="checkName"
          ></StandardInput>
        </el-tooltip>
      </el-col>
    </el-row>
    <el-row class="input-row" align="middle">
      <el-col :span="22" :md="15" :sm="22">
        <StandardInput
          class="create-child"
          v-model="desc"
          :text="$t('project.dataCol.desc')"
          :maxlength="300"
        ></StandardInput>
      </el-col>
    </el-row>
    <el-row class="editor-row">
      <el-col :span="22" :md="18" :sm="22">
        <JsonEditor
          v-if="code !== undefined || (!isEdit && editorReady)"
          class="create-child"
          v-model="code"
          :project="Number(route.params.project)"
          :codeCompleteFn="ApiGetData"
        ></JsonEditor>
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
</template>

<script lang="ts" setup>
import { ref, getCurrentInstance, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import JsonEditor from '@/components/common/editor/JsonEditor.vue'
import StandardInput from '@/components/common/input/standardInput.vue'
import CommitFooter from '@/components/layout/footers/commitFooter.vue'
import {
  ApiAddSingleData,
  ApiGetSingleData,
  ApiChangeSingleData,
  ApiGetData
} from '@/api/data/index'

const code: any = ref(undefined)
const name = ref('')
const desc = ref('')
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { proxy }: any = getCurrentInstance()
const showNameCheck = ref(false)

const isCommit = ref(false)
const isEdit = ref(false)
const editorReady = ref(false)

onMounted(() => {
  editorReady.value = false
  isEdit.value = router.currentRoute.value.name === 'editData'
  if (isEdit.value) {
    const data = {
      project: route.params.project
    }
    ApiGetSingleData(Number(route.params.data), data).then((data: any) => {
      name.value = data.data.name
      desc.value = data.data.desc
      // code.value = JSON.stringify(data.data.data)
      const codeValue = {
        edit: true,
        data: ''
      }
      if (typeof data.data.data === 'string') {
        codeValue.data = data.data.data
      } else {
        codeValue.data = JSON.stringify(data.data.data)
      }
      code.value = codeValue
      editorReady.value = true
    })
  } else {
    code.value = ''
    editorReady.value = true
  }
  addListener()
})

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

function editData() {
  if (!emptyCheck() || checkName(name.value)) return
  isCommit.value = true
  const data = {
    name: name.value,
    project: Number(route.params.project),
    data: code.value.edit ? code.value.data : code.value,
    desc: desc.value
  }
  ApiChangeSingleData(Number(route.params.data), data).then((data: any) => {
    if (data.non_field_errors) {
      proxy.$message({
        message: t('component.editor.unique'),
        duration: 3000,
        type: 'warning'
      })
      isCommit.value = false
    } else {
      changeStorage('editData', JSON.stringify(data.data))
      window.close()
    }
  })
}

function createData() {
  if (!emptyCheck() || checkName(name.value)) return
  isCommit.value = true
  const data = {
    name: name.value,
    project: Number(route.params.project),
    data: code.value,
    desc: desc.value
  }
  ApiAddSingleData(data).then((data: any) => {
    if (data.non_field_errors) {
      proxy.$message({
        message: t('component.editor.unique'),
        duration: 3000,
        type: 'warning'
      })
      isCommit.value = false
    } else {
      changeStorage('createData', JSON.stringify(data.data))
      window.close()
    }
  })
}

function changeStorage(changeString: string, data: any) {
  // localStorage.setItem('changeString', changeString)
  localStorage.setItem(changeString, data)
}

function emptyCheck() {
  if (
    name.value.length === 0 ||
    desc.value.length === 0 ||
    code.value.length === 0
  ) {
    proxy.$message({
      message: t('component.editor.empty'),
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
  const reg = /^[a-zA-Z_]([a-zA-Z_]+)?$/
  showNameCheck.value = !(reg.test(value) && value.length !== 0)
  return showNameCheck.value
}
</script>

<style lang="scss" scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
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
  }
}
</style>
