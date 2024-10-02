<template>
  <transition name="el-fade-in-linear" appear>
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
            v-if="data.length > 0"
            tag="tbody"
            :animation="200"
            handle=".drag-handle"
            :list="data"
            @start="dragStart"
            @end="dragEnd"
          >
            <template #item="{ element, index }">
              <tr class="draggable-item disappear-auto desc-td">
                <td class="active-row drag-handle" style="cursor: move">
                  <el-icon :size="20"><DragIcon /></el-icon>
                </td>
                <td class="active-row">
                  <AstSwitch
                    @changeSwitch="changeExpectNecessary(element)"
                    :switchIndex="'switch-' + element.id"
                    :isChecked="element.necessary === 1"
                  ></AstSwitch>
                </td>
                <td class="active-row">
                  <AstSwitch
                    @changeSwitch="changeExpectStatus(element)"
                    :switchIndex="'status-' + element.id"
                    :isChecked="element.status === 1"
                  ></AstSwitch>
                </td>
                <td class="disappear-auto desc-td">
                  <el-select
                    v-model="element.position"
                    class="m-2"
                    style="height: inherit; display: flex; align-items: center"
                    placeholder="请选择"
                    size="large"
                  >
                    <el-option
                      v-for="(item, index) in hope.position"
                      :key="index"
                      :label="item"
                      :value="index"
                    />
                  </el-select>
                </td>
                <td class="disappear-auto active-row">
                  <input
                    v-model="element.name"
                    class="table-input"
                    autocomplete="off"
                    spellcheck="false"
                    type="text"
                  />
                </td>
                <td class="disappear-auto desc-td">
                  <el-select
                    v-model="element.compare"
                    class="m-2"
                    style="height: inherit; display: flex; align-items: center"
                    placeholder="请选择"
                    size="large"
                  >
                    <el-option
                      v-for="(item, index) in hope.compare"
                      :key="index"
                      :label="item"
                      :value="index"
                    />
                  </el-select>
                </td>
                <td class="disappear-auto active-row">
                  <input
                    v-model="element.value"
                    class="table-input"
                    autocomplete="off"
                    spellcheck="false"
                    type="text"
                  />
                </td>
                <td class="disappear-auto active-row">
                  <div class="action-td">
                    <el-popconfirm
                      :confirm-button-text="t('form.push')"
                      :cancel-button-text="t('form.cancel')"
                      confirm-button-type="danger"
                      :icon="InfoFilled"
                      :icon-color="GlobalStatus.methodColor[0]"
                      :title="t('asking.delete')"
                      @confirm="deleteCondition(index)"
                    >
                      <template #reference>
                        <CButton
                          ><el-icon><Delete /></el-icon
                        ></CButton>
                      </template>
                    </el-popconfirm>
                  </div>
                </td>
              </tr>
            </template>
          </draggable>
          <tr
            v-if="data.length > 0"
            @click="addCondition"
            style="border-bottom: 2px solid var(--dialog-color)"
          >
            <td colspan="8">
              <div class="add-new-item">
                <span>{{ $t('project.mock.desc.createNewCondition') }}</span
                ><el-icon><CirclePlusFilled /></el-icon>
              </div>
            </td>
          </tr>
          <tr
            v-if="data.length === 0"
            @click="addCondition"
            style="cursor: pointer"
          >
            <td colspan="8">
              <el-empty class="hope-empty" :image-size="100" description=" ">
                <div class="add-new-item">
                  <span>{{ $t('project.mock.desc.createNewCondition') }}</span
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
import { reactive, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
// import useClipboard from 'vue-clipboard3/dist/esm/index.js'
import { ApiGetMockBuildInArgs } from '@/api/mock'
// import tools from '@/utils/tools'
import DragIcon from '@/assets/svg/common/dragIcon.vue'
import { InfoFilled } from '@element-plus/icons-vue'
import GlobalStatus from '@/global'
import CButton from '@/components/common/button/CButton.vue'
import AstSwitch from '@/components/common/switch/ast_switch.vue'
import hope from './staticData'

import draggable from 'vuedraggable'
const { t } = useI18n()

const showDrag = ref(false)

const emit = defineEmits([
  'onDeleteCondition',
  'onRefreshCondition',
  'addConditionAction'
])

onMounted(async () => {
  await getData()
})

defineProps({
  cols: {
    type: Array<any>,
    default: () => []
  },
  data: {
    type: Array<any>,
    default: () => []
  }
})

// 数据主体！！！
const d = reactive({
  list: [] as any
})

// 全局对象
// const { proxy }: any = getCurrentInstance()

function addCondition() {
  emit('addConditionAction')
}

function deleteCondition(index: number) {
  emit('onDeleteCondition', index)
}

function getData() {
  const data = {
    size: 50
  }
  ApiGetMockBuildInArgs(data).then((data: any) => {
    d.list = data.results
    showDrag.value = true
  })
}

function changeExpectNecessary(element: any) {
  element.necessary = element.necessary === 1 ? 0 : 1
}

function changeExpectStatus(element: any) {
  element.status = element.status === 1 ? 0 : 1
}

function dragStart() {
  // 拖拽开始的处理
}
function dragEnd(ele: any) {
  // 拖拽结束的处理
  emit('onRefreshCondition', ele)
}
</script>

<style lang="scss" scoped>
// .main-data {
//   padding-top: 20px;
// }

.styled-table {
  border-collapse: collapse;
  margin-bottom: 25px 0;
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
  transition: all 3 ease;
  .desc-td {
    .desc-div {
      text-align: center;
      font-size: 15px;
    }
  }
  .desc-td div {
    // width: 20vw;
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
}

.table-input {
  color: black !important;
  padding: 0.375rem 0.375rem 0.375rem 0.375rem;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 5px;
  width: 100%;
  height: 30px;
  outline: none;
  box-sizing: border-box;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.draggable-item {
  animation: fadeInOut 0.3s ease-in-out;
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
.m-2 {
  .select-trigger {
    width: 100% !important;
  }
}

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
