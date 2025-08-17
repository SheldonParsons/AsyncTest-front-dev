<template>
  <div class="script-container">
    <div class="script-header" :class="{ 'default-active': open_script }" @click="open_script = !open_script">
      <div style="box-sizing: border-box" class="script-header-icon">
        <el-switch class="script-action-switch" v-model="props.element.data.status" @click.stop size="small" />
        <el-dropdown v-if="disable === false" @command="handleDupDelete" ref="dropdownRef" trigger="contextmenu"
          class="script-action-dropdown">
          <el-icon>
            <MoreFilled @click.stop="handleTriggerClick" />
          </el-icon>
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
        <div class="script-rank" v-if="disable === false" @mousedown.stop="open_script = false">
          <div class="drag-handle">
            <el-icon color="#d0d5dd">
              <Rank />
            </el-icon>
          </div>
        </div>
        <div class="script-header-title">
          <span>提取变量</span>
        </div>
        <div class="script-header-desc">
          <div>
            <span style="margin-right: 20px">{{
              t_mapping[props.element.data.t]
            }}</span>{{ range_mapping[props.element.data.source] }} <span
              style="font-size: 0.8rem;color: black;opacity: 1;font-weight: 500;">{{ props.element.data.name
              }}</span>
          </div>
        </div>
      </div>
    </div>
    <Transition name="slide">
      <div v-show="open_script" class="script-body">
        <el-row style="padding-top: 20px">
          <el-col :span="23">
            <div style="display: flex; justify-content: start; align-items: center">
              <div style="display: inline-block; white-space: nowrap;padding-left: 20px;box-sizing: border-box;">
                <span style="display: inline-block;">变量名称</span><span style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  ">*</span>
              </div>
              <div style="width: 100%">
                <el-input :disabled="props.disable" v-model="props.element.data.name"></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="margin-top: 20px">
          <el-col :span="23">
            <div style="display: flex; justify-content: start; align-items: center">
              <div style="display: inline-block; white-space: nowrap;padding-left: 20px;box-sizing: border-box;">
                <span style="display: inline-block;">变量类型</span><el-popover class="box-item" title="关于变量类型的解释"
                  placement="top" :width="350" trigger="click">
                  <el-divider></el-divider>
                  <div>
                    <span style="font-weight: 500">临时变量</span>：它仅作用于当前被执行的接口，当接口生命周期结束，该变量也随之销毁。
                  </div>
                  <el-divider></el-divider>
                  <div>
                    <span style="font-weight: 500">环境变量</span>：它将作用于当前用例，但在性能模式下，它是当前协程独享的。
                  </div>
                  <el-divider></el-divider>
                  <div>
                    <span style="font-weight: 500">全局变量</span>：它将作用于当前整个任务，无论是单用例还是性能模式下，它都是全局唯一的。
                  </div>
                  <template #reference>
                    <el-icon style="cursor: pointer">
                      <InfoFilled />
                    </el-icon>
                  </template>
                </el-popover><span style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  ">*</span>
              </div>
              <div style="width: 100%">
                <el-select :disabled="props.disable" v-model="props.element.data.t" placeholder="变量类型"
                  style="width: 100%">
                  <el-option v-for="item in [
                    { value: 0, label: '临时变量' },
                    { value: 1, label: '环境变量' },
                    { value: 2, label: '全局变量' },
                  ]" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="margin-top: 20px">
          <el-col :span="23">
            <div style="display: flex; justify-content: start; align-items: center">
              <div style="display: inline-block; white-space: nowrap;padding-left: 20px;box-sizing: border-box;">
                <span style="display: inline-block;">提取来源</span><span style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                    display: inline-block;
                  ">*</span>
              </div>
              <div style="width: 100%">
                <el-select :disabled="props.disable" v-model="props.element.data.source" placeholder="提取来源"
                  style="width: 100%">
                  <el-option v-for="item in [
                    { value: 0, label: 'Response Body' },
                    { value: 1, label: 'Response Headers' },
                    { value: 2, label: 'Response Cookies' },
                    { value: 3, label: '耗时' },
                  ]" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="margin-top: 20px" v-if="props.element.data.source === 0">
          <el-col :span="17">
            <div style="display: flex; justify-content: start; align-items: center">
              <div style="display: inline-block; white-space: nowrap;padding-left: 20px;box-sizing: border-box;">
                <span style="display: inline-block;">提取范围</span><span style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  ">*</span>
              </div>
              <div style="width: 600px">
                <el-radio-group v-model="props.element.data.extract_range" :disabled="props.disable">
                  <el-radio :value="0">整体数据</el-radio>
                  <el-radio :value="1">JsonPath</el-radio>
                  <el-radio :value="2">正则表达式</el-radio>
                  <el-radio :value="3">XPath</el-radio>
                </el-radio-group>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="padding-top: 20px" v-if="
          props.element.data.extract_range === 1 &&
          props.element.data.source === 0
        ">
          <el-col :span="23">
            <div style="display: flex; justify-content: start; align-items: center">
              <div style="display: inline-block; white-space: nowrap;padding-left: 20px;box-sizing: border-box;">
                <span style="display: inline-block;">JsonPath 表达式</span><span style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                    display: inline-block;
                  ">*</span>
              </div>
              <div style="width: 100%">
                <el-input :disabled="props.disable" v-model="props.element.data.jsonpath.expression"
                  placeholder="如：$class.score[0].range"></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="padding-top: 20px" v-if="
          props.element.data.extract_range === 2 &&
          props.element.data.source === 0
        ">
          <el-col :span="23">
            <div style="display: flex; justify-content: start; align-items: center">
              <div style="display: inline-block; white-space: nowrap;padding-left: 20px;box-sizing: border-box;">
                <span style="display: inline-block;">提取表达式</span><span style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                    display: inline-block
                  ">*</span>
              </div>
              <div style="width: 100%">
                <el-input :disabled="props.disable" v-model="props.element.data.regexp.expression"
                  placeholder="如：/^1[3-9]\d{9}$/"></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="padding-top: 20px" v-if="
          props.element.data.extract_range === 2 &&
          props.element.data.source === 0
        ">
          <el-col :span="23">
            <div style="display: flex; justify-content: start; align-items: center">
              <div style="display: inline-block; white-space: nowrap;padding-left: 20px;box-sizing: border-box;">
                <span style="display: inline-block;">Template</span><span style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                    display: inline-block
                  ">*</span>
              </div>
              <div style="width: 100%">
                <el-input :disabled="props.disable" v-model="props.element.data.regexp.template"
                  placeholder="$i，i 表示正则匹配到的第 i 个捕获，从 1 起始"></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="padding-top: 20px" v-if="
          props.element.data.extract_range === 3 &&
          props.element.data.source === 0
        ">
          <el-col :span="17">
            <div style="display: flex; justify-content: start; align-items: center">
              <div style="display: inline-block; white-space: nowrap;padding-left: 20px;box-sizing: border-box;">
                <span style="display: inline-block;">XPath 表达式</span><span style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                    display: inline-block
                  ">*</span>
              </div>
              <div style="width: 100%">
                <el-input :disabled="props.disable" v-model="props.element.data.xpath.expression"
                  placeholder="如：/store/book[1]/title"></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="padding-top: 20px" v-if="props.element.data.source === 1">
          <el-col :span="17">
            <div style="display: flex; justify-content: end; align-items: center">
              <div style="display: flex">
                Header 名<span style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  ">*</span>
              </div>
              <div style="width: 600px">
                <el-input :disabled="props.disable" v-model="props.element.data.header_name"></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="padding-top: 20px" v-if="props.element.data.source === 2">
          <el-col :span="17">
            <div style="display: flex; justify-content: end; align-items: center">
              <div style="display: flex">
                Cookie 名<span style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  ">*</span>
              </div>
              <div style="width: 600px">
                <el-input :disabled="props.disable" v-model="props.element.data.cookie_name"></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="padding-top: 20px" v-if="props.element.data.source === 3">
          <el-col :span="17">
            <div style="display: flex; justify-content: end; align-items: center">
              <div style="display: flex">
                耗时单位<span style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  ">*</span>
              </div>
              <div style="width: 600px">
                <el-switch :disabled="props.disable" v-model="props.element.data.waste_time_unit" active-text="秒"
                  inactive-text="毫秒" />
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
const route = useRoute();
const open_script = ref(false);
const dropdownRef: any = ref(null);
const range_mapping: any = {
  0: "Body",
  1: "Headers",
  2: "Cookies",
  3: "耗时",
};
const t_mapping: any = {
  0: "临时变量",
  1: "环境变量",
  2: "全局变量",
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
});
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
  max-height: 1000px;
  /* 设置一个足够大的值 */
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
          // opacity: 0.5;
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
