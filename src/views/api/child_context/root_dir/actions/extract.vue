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
          <div class="script-rank" @mousedown.stop="open_script = false">
            <div class="drag-handle">
              <el-icon color="#d0d5dd"><Rank /></el-icon>
            </div>
          </div>
          <div class="script-header-title">
            <span>等待时间</span>
          </div>
          <div class="script-header-desc">
            <div>{{ waste_time }} 毫秒</div>
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
                变量名称<span
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
                <el-input v-model="props.element.data.name"></el-input>
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
  const open_script = ref(true);
  const dropdownRef:any = ref(null)
  const props = defineProps({
    element: {
      type: Object,
      default: {},
    },
  });
  function close_expand() {
    open_script.value = false;
  }
  onMounted(() => {
    waste_time.value = props.element.data.time;
  })
  const waste_time: any = ref(0);
  // 暴露给父组件调用
  defineExpose({
    close_expand,
  });
  const emit = defineEmits(["dup_action","delete_action"]);
  
  const handleTriggerClick = (e:any) => {
    e.stopPropagation()
    dropdownRef.value?.handleOpen()  // 手动控制下拉状态
  }
  function handleDupDelete(type:string){
    if (type === 'dup') {
      emit("dup_action")
    }
    if (type === 'delete') {
      emit("delete_action")
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
      padding: 0px 40px 0px 12px;
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
  