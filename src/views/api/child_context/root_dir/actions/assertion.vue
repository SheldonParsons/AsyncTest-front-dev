<template>
  <div class="script-container">
    <div
      class="script-header"
      :class="{ 'default-active': open_script }"
      @click="open_script = !open_script"
    >
      <div style="box-sizing: border-box" class="script-header-icon">
        <el-switch
          class="script-action-switch"
          v-model="props.element.data.status"
          @click.stop
          size="small"
        />
        <el-dropdown
          v-if="disable === false"
          @command="handleDupDelete"
          ref="dropdownRef"
          trigger="contextmenu"
          class="script-action-dropdown"
        >
          <el-icon><MoreFilled @click.stop="handleTriggerClick" /></el-icon>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="dup">复制</el-dropdown-item>
              <el-dropdown-item command="delete">删除</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-icon class="script-action-icon" size="12">
          <ArrowRightBold v-if="open_script === false" />
          <ArrowDownBold v-if="open_script === true" />
        </el-icon>
      </div>
      <div class="script-header-content">
        <div
          class="script-rank"
          v-if="disable === false"
          @mousedown.stop="open_script = false"
        >
          <div class="drag-handle">
            <el-icon color="#d0d5dd"><Rank /></el-icon>
          </div>
        </div>
        <div class="script-header-title">
          <span>断言</span>
        </div>
        <div class="script-header-desc">
          <div>
            <span style="margin-right: 20px">{{
              t_mapping[props.element.data.t]
            }}</span
            >{{ range_mapping[props.element.data.source] }}
            <span style="margin-left: 5px">{{
              assertion_mapping[props.element.data.assertion.t]
            }}</span>
            <span style="margin-left: 5px">{{
              props.element.data.assertion.value
            }}</span>
          </div>
        </div>
      </div>
    </div>
    <Transition name="slide">
      <div v-show="open_script" class="script-body">
        <el-row style="padding-top: 20px">
          <el-col :span="17">
            <div
              style="display: flex; justify-content: end; align-items: center"
            >
              <div style="display: flex">
                断言名称<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div style="width: 600px">
                <el-input
                  :disabled="props.disable"
                  v-model="props.element.data.name"
                ></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="margin-top: 20px">
          <el-col :span="17">
            <div
              style="display: flex; justify-content: end; align-items: center"
            >
              <div style="display: flex">
                断言对象<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div style="width: 600px">
                <el-select
                  :disabled="props.disable"
                  v-model="props.element.data.source"
                  placeholder="Select"
                  style="width: 600px"
                >
                  <el-option
                    v-for="item in [
                      { value: 0, label: 'Response Body' },
                      { value: 1, label: 'Response Headers' },
                      { value: 2, label: 'Response Cookies' },
                      { value: 3, label: '临时变量' },
                      { value: 4, label: '环境变量' },
                      { value: 5, label: '全局变量' },
                      { value: 6, label: '耗时' },
                      { value: 7, label: 'HTTP 状态码' },
                    ]"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="margin-top: 20px" v-if="props.element.data.source === 0">
          <el-col :span="17">
            <div
              style="display: flex; justify-content: end; align-items: center"
            >
              <div style="display: flex">
                断言范围<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div style="width: 600px">
                <el-radio-group
                  v-model="props.element.data.extract_range"
                  :disabled="props.disable"
                >
                  <el-radio :value="0">整体数据</el-radio>
                  <el-radio :value="1">JsonPath</el-radio>
                  <el-radio :value="2">正则表达式</el-radio>
                  <el-radio :value="3">XPath</el-radio>
                </el-radio-group>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row
          style="padding-top: 20px"
          v-if="
            props.element.data.extract_range === 1 &&
            props.element.data.source === 0
          "
        >
          <el-col :span="17">
            <div
              style="display: flex; justify-content: end; align-items: center"
            >
              <div style="display: flex">
                JsonPath 表达式<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div style="width: 600px">
                <el-input
                  :disabled="props.disable"
                  v-model="props.element.data.jsonpath.expression"
                  placeholder="如：$class.score[0].range"
                ></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row
          style="padding-top: 20px"
          v-if="
            props.element.data.extract_range === 2 &&
            props.element.data.source === 0
          "
        >
          <el-col :span="17">
            <div
              style="display: flex; justify-content: end; align-items: center"
            >
              <div style="display: flex">
                提取表达式<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div style="width: 600px">
                <el-input
                  :disabled="props.disable"
                  v-model="props.element.data.regexp.expression"
                  placeholder="如：/^1[3-9]\d{9}$/"
                ></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row
          style="padding-top: 20px"
          v-if="
            props.element.data.extract_range === 2 &&
            props.element.data.source === 0
          "
        >
          <el-col :span="17">
            <div
              style="display: flex; justify-content: end; align-items: center"
            >
              <div style="display: flex">
                Template<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div style="width: 600px">
                <el-input
                  :disabled="props.disable"
                  v-model="props.element.data.regexp.template"
                  placeholder="$i，i 表示正则匹配到的第 i 个捕获，从 1 起始"
                ></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row
          style="padding-top: 20px"
          v-if="
            props.element.data.extract_range === 3 &&
            props.element.data.source === 0
          "
        >
          <el-col :span="17">
            <div
              style="display: flex; justify-content: end; align-items: center"
            >
              <div style="display: flex">
                XPath 表达式<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div style="width: 600px">
                <el-input
                  :disabled="props.disable"
                  v-model="props.element.data.xpath.expression"
                  placeholder="如：/store/book[1]/title"
                ></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row
          style="padding-top: 20px"
          v-if="props.element.data.source === 1"
        >
          <el-col :span="17">
            <div
              style="display: flex; justify-content: end; align-items: center"
            >
              <div style="display: flex">
                Header 名<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div style="width: 600px">
                <el-input
                  :disabled="props.disable"
                  v-model="props.element.data.header_name"
                ></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row
          style="padding-top: 20px"
          v-if="props.element.data.source === 2"
        >
          <el-col :span="17">
            <div
              style="display: flex; justify-content: end; align-items: center"
            >
              <div style="display: flex">
                Cookie 名<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div style="width: 600px">
                <el-input
                  :disabled="props.disable"
                  v-model="props.element.data.cookie_name"
                ></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row
          style="padding-top: 20px"
          v-if="
            props.element.data.source === 3 ||
            props.element.data.source === 4 ||
            props.element.data.source === 5
          "
        >
          <el-col :span="17">
            <div
              style="display: flex; justify-content: end; align-items: center"
            >
              <div style="display: flex">
                变量名<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div style="width: 600px">
                <el-input
                  :disabled="props.disable"
                  v-model="props.element.data.source_name"
                ></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row
          style="padding-top: 20px"
          v-if="props.element.data.source === 6"
        >
          <el-col :span="17">
            <div
              style="display: flex; justify-content: end; align-items: center"
            >
              <div style="display: flex">
                耗时单位<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div style="width: 600px">
                <el-switch
                  :disabled="props.disable"
                  v-model="props.element.data.waste_time_unit"
                  active-text="秒"
                  inactive-text="毫秒"
                />
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="padding-top: 20px">
          <el-col :span="17">
            <div
              style="display: flex; justify-content: end; align-items: center"
            >
              <div style="display: flex">
                断言<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div style="width: 600px; display: flex">
                <el-select
                  :disabled="props.disable"
                  v-model="props.element.data.assertion.t"
                  placeholder="断言过程"
                  style="width: 240px"
                >
                  <el-option
                    v-for="item in [
                      { value: 0, label: '等于' },
                      { value: 1, label: '不等于' },
                      { value: 2, label: '存在' },
                      { value: 3, label: '不存在' },
                      { value: 4, label: '小于' },
                      { value: 5, label: '小于或等于' },
                      { value: 6, label: '大于' },
                      { value: 7, label: '大于或等于' },
                      { value: 8, label: '正则匹配' },
                      { value: 9, label: '包含' },
                      { value: 10, label: '不包含' },
                      { value: 11, label: '为空' },
                      { value: 12, label: '不为空' },
                      { value: 13, label: '属于集合' },
                      { value: 14, label: '不属于集合' },
                    ]"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
                <div
                  v-if="
                    ![2, 3, 11, 12].includes(props.element.data.assertion.t)
                  "
                  class="mirror-outside"
                >
                  <CodeMirror
                    ref="code_mirror"
                    v-model="props.element.data.assertion.value"
                    :disable="props.disable"
                    :interface_id="interface"
                    @updateValue="
                      update_value(
                        $event,
                        props.element.data.assertion,
                        'default'
                      )
                    "
                  ></CodeMirror>
                </div>
                <Params
                  :disable="props.disable"
                  v-if="
                    ![2, 3, 11, 12].includes(props.element.data.assertion.t)
                  "
                  :interface="interface"
                  @insert_action="add_content_to_value"
                ></Params>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import CodeMirror from "@/views/api/child_context/code_mirror.vue";
import Params from "@/views/api/child_component/params.vue";
const route = useRoute();
const open_script = ref(false);
const dropdownRef: any = ref(null);
const code_mirror: any = ref(null);
const range_mapping: any = {
  0: "Response Body",
  1: "Response Headers",
  2: "Response Cookies",
  3: "耗时",
};
const t_mapping: any = {
  0: "临时变量",
  1: "环境变量",
  2: "全局变量",
};
const assertion_mapping: any = {
  0: "等于",
  1: "不等于",
  2: "存在",
  3: "不存在",
  4: "小于",
  5: "小于或等于",
  6: "大于",
  7: "大于或等于",
  8: "正则匹配",
  9: "包含",
  10: "不包含",
  11: "为空",
  12: "不为空",
  13: "属于集合",
  14: "不属于集合",
};
const props = defineProps({
  element: {
    type: Object,
    default: {},
  },
  disable: {
    type: Boolean,
    default: false,
  },
  interface: {
    type: Number,
    default: -1,
  },
});
function add_content_to_value(content: string) {
  if (props.disable) return;
  code_mirror.value.add_content(content);
}
function update_value(value: any, scope: any, type: any) {
  console.log(value);
  console.log(scope);
  console.log(type);
}

function close_expand() {
  open_script.value = false;
}
onMounted(() => {
  waste_time.value = props.element.data.time;
});
const waste_time: any = ref(0);
// 暴露给父组件调用
defineExpose({
  close_expand,
});
const emit = defineEmits(["dup_action", "delete_action"]);

const handleTriggerClick = (e: any) => {
  e.stopPropagation();
  dropdownRef.value?.handleOpen(); // 手动控制下拉状态
};
function handleDupDelete(type: string) {
  if (type === "dup") {
    emit("dup_action");
  }
  if (type === "delete") {
    emit("delete_action");
  }
}
</script>

<style scoped lang="scss">
.mirror-outside {
  display: flex;
  justify-content: start;
  align-items: center;
  width: 100%;
  margin-left: 10px;
  margin-right: 10px;
  border-radius: 4px;
}
.default-active {
  border-bottom-left-radius: 0px !important;
  border-bottom-right-radius: 0px !important;
}
/* 关键 CSS */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.3s ease, max-height 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0 !important;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 1000px; /* 设置一个足够大的值 */
}
.editor-header {
  height: 2.5rem;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  flex-flow: wrap;
  min-width: 0;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  flex-wrap: nowrap;
  border-bottom: 1px solid #f3f5f6;
}
.script-code-fast {
  display: flex;
  flex-direction: column;
  justify-content: left;
  border-left: 1px solid #f3f5f6;
  height: 100%;
  .script-code-fast-title {
    padding: 12px;
    font-size: 14px;
    font-weight: 500;
  }
  .script-code-fast-div {
    padding: 6px 12px;
    color: #039e74;
    cursor: pointer;
  }
}
.script-code-fast-div:hover {
  background-color: var(--el-color-primary-light-9);
}
.script-container {
  margin-top: 5px;
  margin-bottom: 4px;
  border: 0 !important;
  box-sizing: border-box;
  color: #344054;
  font-size: 14px;
  .script-body {
    background-color: #fff;
    border-color: #5657580a;
    border-radius: 0 0 10px 10px;
    border-style: solid;
    border-width: 0 1.5px 1.5px;
    color: #344054;
    transition: max-height 0.3s ease;
    padding-bottom: 50px;
    .script-content {
      padding-top: 4px;
      justify-content: center;
      display: flex;
      padding: 16px;
      height: 100%;
    }
  }
  .script-header {
    border-radius: 10px;
    background-color: #5657580a;
    padding: 0px 100px 0px 12px;
    cursor: pointer;
    border: 0;
    align-items: center;
    height: 40px;
    display: flex;
    position: relative;
    .script-header-icon {
      display: block;
      unicode-bidi: isolate;
      color: rgba(16, 24, 40, 0.8);
      line-height: 1.57143;
      user-select: none;
      font-size: 14px;
      list-style: none;
      .script-action-icon {
        box-sizing: border-box;
        cursor: pointer;
        font-size: 18px;
        margin: 0;
        position: absolute;
        top: 50%;
        left: auto;
        right: 16px;
        transform: translateY(-50%);
      }
      .script-action-switch {
        box-sizing: border-box;
        cursor: pointer;
        font-size: 18px;
        margin: 0;
        position: absolute;
        top: 50%;
        left: auto;
        right: 60px;
        transform: translateY(-50%);
      }
      .script-action-dropdown {
        box-sizing: border-box;
        cursor: pointer;
        font-size: 18px;
        margin: 0;
        position: absolute;
        top: 50%;
        left: auto;
        right: 32px;
        transform: translateY(-50%);
      }
    }
    .script-header-content {
      flex: auto;
      overflow: hidden;
      box-sizing: border-box;
      cursor: pointer;
      display: flex;
      overflow: hidden;
      font-size: 0.875rem;
      align-items: center;
      box-sizing: border-box;
      .script-rank {
        left: -1px;
        display: flex;
        position: relative;
        align-items: center;
        box-sizing: border-box;
        font-size: 0.875rem;
      }
      .script-header-title {
        flex-basis: 144px;
        display: flex;
        flex-shrink: 0;
        flex-grow: 0;
        align-items: center;
        box-sizing: border-box;
        font-size: 0.875rem;
        span {
          cursor: pointer;
          color: rgba(16, 24, 40, 0.8);
          padding-left: 0.5rem;
        }
      }
      .script-header-desc {
        display: flex;
        padding-right: 0.25rem;
        overflow: hidden;
        align-items: center;
        div {
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          opacity: 0.5;
          margin-right: 0.5rem;
          flex-shrink: 1;
        }
      }
    }
  }
}
.drag-handle:hover {
  svg {
    color: black;
  }
}
</style>
