<template>
  <transition name="el-fade-in-linear" appear v-if="showTable">
    <el-row class="main-data">
      <el-col :span="24">
        <table class="styled-table" v-if="showDrag">
          <thead>
            <tr>
              <th
                v-for="(item, index) in cols"
                :key="index"
                style="white-space: nowrap"
              >
                {{ item }}
              </th>
            </tr>
          </thead>
          <draggable
            :disabled="canDrag"
            v-if="d.list.length > 0"
            v-show="showTable"
            tag="tbody"
            :animation="200"
            handle=".drag-handle"
            :list="d.list"
            item-key="name"
          >
            <template #item="{ element, index }">
              <tr class="draggable-item">
                <td class="active-row drag-handle" :title="element.name">
                  <span>{{ element.name }}</span>
                </td>
                <td class="active-row">
                  <span>{{ element.call_times }}次</span>
                </td>
                <td class="active-row">
                  <span>{{
                    element.last_call_time === null
                      ? $t('project.mock.desc.emptyCall')
                      : tools.getLocaleDateTime(element.last_call_time, false)
                  }}</span>
                </td>
                <td class="disappear-auto active-row">
                  <span>{{
                    element.cover_user === null
                      ? $t('project.mock.desc.emptyPersonCall')
                      : element.cover_user
                  }}</span>
                </td>
                <td class="disappear-auto active-row">
                  <span>{{ element.creator }}</span>
                </td>
                <td class="disappear-auto active-row">
                  <div class="action-td">
                    <CButton @click="editPresetsEle(element)"
                      ><el-icon><Edit /></el-icon
                    ></CButton>
                    <el-popconfirm
                      width="220"
                      :confirm-button-text="t('form.push')"
                      :cancel-button-text="t('form.cancel')"
                      confirm-button-type="danger"
                      :icon="InfoFilled"
                      :icon-color="GlobalStatus.methodColor[0]"
                      :title="t('asking.delete')"
                      @confirm="deletePresets(element, index)"
                    >
                      <template #reference>
                        <CButton style="margin-left: 1rem"
                          ><el-icon><Delete /></el-icon
                        ></CButton>
                      </template>
                    </el-popconfirm>
                    <CButton
                      style="margin-left: 1rem"
                      @click="showPresetsRes(element.id)"
                      ><el-icon><EditPen /></el-icon
                    ></CButton>
                    <CButton
                      style="margin-left: 1rem"
                      @click="showPresetsRecord(element.id)"
                      ><el-icon><MoreFilled /></el-icon
                    ></CButton>
                  </div>
                </td>
              </tr>
            </template>
          </draggable>
          <tr
            v-if="d.list.length > 0"
            @click="addNewPresets"
            style="border-bottom: 2px solid var(--dialog-color)"
          >
            <td colspan="7">
              <div class="add-new-item">
                <span>{{ $t('project.mock.desc.createNewPresets') }}</span
                ><el-icon><CirclePlusFilled /></el-icon>
              </div>
            </td>
          </tr>
          <tr
            v-if="d.list.length === 0"
            @click="addNewPresets"
            style="cursor: pointer"
          >
            <td colspan="7">
              <el-empty class="hope-empty" :image-size="100" description=" ">
                <div class="add-new-item">
                  <span>{{ $t('project.mock.desc.createNewPresets') }}</span
                  ><el-icon><CirclePlusFilled /></el-icon>
                </div>
              </el-empty>
            </td>
          </tr>
        </table>
      </el-col>
    </el-row>
  </transition>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, getCurrentInstance, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiPresets, ApiDeletePresets } from '@/api/mock/presets'
import { InfoFilled } from '@element-plus/icons-vue'
import GlobalStatus from '@/global'
import CButton from '@/components/common/button/CButton.vue'
import draggable from 'vuedraggable'
import tools from '@/utils/tools'
const { proxy }: any = getCurrentInstance()
const { t } = useI18n()

const showDrag = ref(false)
const showTable = ref(false)
const canDrag = ref(true)
const canAction = ref(true)

onMounted(async () => {
  await getData()
})

const emit = defineEmits([
  'editPresetsAction',
  'addPresetsAction',
  'showPresetResponseList',
  'showPresetRecordList'
])

const props = defineProps({
  cols: {
    type: Array<any>,
    default: () => []
  },
  params: {
    type: Object,
    default: () => {}
  },
  flushData: {
    type: Boolean,
    default: false
  }
})

watch(
  () => props.flushData,
  async (newValue, oldValue) => {
    await getData()
  }
)

watch(
  [props.flushData, props.params],
  async ([newFlushData, newParams], [oldFlushData, oldParams]) => {
    await getData()
  }
)

// 数据主体！！！
const d = reactive({
  list: [] as any
})

function addNewPresets() {
  emit('addPresetsAction')
}

function deletePresets(element: any, index: number) {
  canAction.value = false
  ApiDeletePresets(element.id, {}).then((res) => {
    d.list.splice(index, 1)
    tools.message(t('notice.delete'), proxy, 'success')
    canAction.value = true
  })
}

function editPresetsEle(element: any) {
  emit('editPresetsAction', element)
}

function showPresetsRes(presetsId: any) {
  emit('showPresetResponseList', props.params, presetsId)
}

function showPresetsRecord(presetsId: any) {
  emit('showPresetRecordList', presetsId)
}

function getData() {
  console.log(props.params)

  ApiPresets(props.params).then((data: any) => {
    console.log(data)

    d.list = data.results
    showDrag.value = true
    showTable.value = true
  })
}
</script>

<style lang="scss" scoped>
.compare-str {
  font-size: 0.9rem;
  font-weight: 500;
  margin-top: 10px;
  box-sizing: border-box;
  .mr-1 {
    box-sizing: border-box;
    margin-right: 0.25rem;
    word-break: break-all;
    overflow-wrap: break-word;
    text-align: left;
    border-collapse: separate;
    border-spacing: 0;
    line-height: 28px;
    user-select: text;
  }
  .compare-str-name,
  .compare-str-value {
    padding: 2px 8px;
    background-color: #f5f5f5;
    border-radius: 4px;
    box-sizing: border-box;
    word-break: break-all;
    overflow-wrap: break-word;
    text-align: left;
    line-height: 28px;
  }
}
.styled-table {
  border-collapse: collapse;
  margin-bottom: 25px 0;
  font-size: 0.9em;
  width: 100%;
  border-radius: 5px 5px 0px 0px;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
  .action-td {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
  }
  transition: all 3 ease;
  .desc-td {
    width: 400px;
    .desc-div {
      max-width: 20vw;
      text-align: center;
    }
  }
  .active-row {
    white-space: nowrap;
    max-width: 300px;
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
  background-color: white;
  border-bottom: 1px solid #dddddd;
}

.styled-table tbody tr:nth-of-type(even) {
  background-color: #f3f3f3;
}

.styled-table tbody tr:last-of-type {
  // border-bottom: 2px solid var(--dialog-color);
}

.styled-table tbody tr td.active-row {
  font-weight: bold;
  color: var(--dialog-color);
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.condition-div {
  margin-top: 5%;
  font-size: 15px;
  span {
    border: 1px solid red;
  }
}
@keyframes fadeInOut {
  0% {
    opacity: 0;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
.draggable-item {
  animation: fadeInOut 0.5s ease-in-out;
}

.add-new-item {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
  color: var(--primary);
  height: 30px;
  cursor: pointer;
  span {
    margin-right: 10px;
  }
}
</style>

<style lang="scss">
.hope-empty {
  .el-empty__image,
  .el-empty__description {
    display: none !important;
  }
  .el-empty__bottom {
    margin: 0px;
  }
}
</style>
