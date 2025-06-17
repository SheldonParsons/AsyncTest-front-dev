<template>
  <div style="width: 100%" v-show="show">
    <div id="editor-placeholder" ref="editorContainer" class="editor-container">
      <div class="edit-div" @click="show_edit_value">
        <el-icon :size="18"><FullScreen /></el-icon>
      </div>
    </div>
    <el-tooltip
      ref="tooltipRef"
      effect="light"
      manual
      v-model:visible="visible"
      placement="top"
      :virtual-ref="buttonRef"
      virtual-triggering
      trigger="click"
      popper-class="singleton-tooltip"
    >
      <template #content>
        <div class="mirror-tooltip">
          <div class="mirror-tooltip-header">
            <span>变量视图</span>
          </div>
          <div class="mirror-tooltip-divider"></div>
          <div
            style="
              display: flex;
              justify-content: start;
              align-items: center;
              width: calc(100% - 20px);
              padding: 5px 10px;
            "
          >
            <div style="color: var(--el-text-color-secondary); font-size: 14px">
              变量名：
            </div>
            <div>{{ variable_content.name }}</div>
          </div>
          <div
            style="
              display: flex;
              justify-content: start;
              align-items: center;
              width: calc(100% - 20px);
              padding: 5px 10px;
            "
          >
            <div style="color: var(--el-text-color-secondary); font-size: 14px">
              变量类型：
            </div>
            <div>{{ variable_type_mapping[variable_content.type][0] }}</div>
          </div>
          <div
            style="
              display: flex;
              justify-content: start;
              align-items: center;
              width: calc(100% - 20px);
              padding: 5px 10px;
            "
          >
            <div style="color: var(--el-text-color-secondary); font-size: 14px">
              变量来源：
            </div>
            <div>{{ variable_type_mapping[variable_content.type][1] }}</div>
          </div>
        </div>
      </template>
    </el-tooltip>
  </div>
  <EditValue
    :disableVar="props.disableVar"
    :canVar="canVar"
    :interface_id="interface_id"
    :disable="props.disable"
    ref="editValueDialog"
    @add_code="add_code"
    :enableNewLine="props.enableNewLine"
  ></EditValue>
</template>

<script setup lang="ts">
import {
  onMounted,
  ref,
  onBeforeUnmount,
  createApp,
  h,
  watch,
  toRefs,
  getCurrentInstance,
} from "vue";
import Params from "./widget_cpm/param.vue";
import ParamsFixed from "./widget_cpm/param_fixed.vue";
import EditValue from "@/views/api/child_component/edit_value.vue";
import tools from "@/utils/tools";
const emit = defineEmits(["update:modelValue"]);
const { proxy }: any = getCurrentInstance();
const show = ref(false);
const editValueDialog: any = ref(null);
const editorContainer = ref(null);
const buttonRef = ref();
const variable_content: any = ref(null);

const visible = ref(false);
defineExpose({
  add_content,
  set_content,
});

const variable_type_mapping: any = {
  static: ["固定值", "即时演算"],
  mock: ["生成值", "即时演算"],
  variable: ["动态值", "动态生成"],
};

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  enableDecoration: {
    type: Boolean,
    default: true,
  },
  enableNewLine: {
    type: Boolean,
    default: true,
  },
  disable: {
    type: Boolean,
    default: false,
  },
  canVar: {
    type: Boolean,
    default: true,
  },
  disableVar: {
    type: Boolean,
    default: false,
  },
  interface_id: {
    type: Number,
    default: -1,
  },
});

let editorView: any;

const { modelValue } = toRefs(props);
watch(
  modelValue,
  (newVal) => {
    if (editorView) {
      if (newVal !== editorView.state.doc.toString()) {
        set_content(newVal);
      }
    }
  },
  { immediate: true } // 初始化时同步一次
);

function add_code(content: any) {
  set_content(content);
}

function show_edit_value() {
  // if (props.disable) {
  //   tools.message("您无法在只读状态下编辑内容", proxy);
  //   return
  // };
  editValueDialog.value.open_dialog();
  editValueDialog.value.set_code(editorView.state.doc.toString());
}

// 暴露更新内容的方法
function add_content(content: any) {
  if (editorView) {
    // 创建事务更新文档
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: editorView.state.doc + content,
      },
    });
  }
}

function set_content(content: any) {
  if (editorView) {
    content = content || ""; // 处理 undefined/null
    const current = editorView.state.doc.toString();
    if (content !== current) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: content,
        },
      });
    }
  }
}

function parseExpression(str: string) {
  // 1. 匹配 mock 类型表达式：{% mock 'name', ... %}
  const mockRegex = /{%\s*mock\s*'([^']+)'/;
  let match = str.match(mockRegex);
  if (match) return { name: match[1], type: "mock" };

  // 2. 匹配 static 类型表达式：{{'name'...}}
  const staticRegex = /{{\s*'([^']+)'/;
  match = str.match(staticRegex);
  if (match) return { name: match[1], type: "static" };

  // 3. 匹配 variable 类型表达式：{{name...}}
  const variableRegex = /{{\s*([^{}\|]+?)\s*[|}]/;
  match = str.match(variableRegex);
  if (match) return { name: match[1].trim(), type: "variable" };

  return null; // 未匹配到任何类型
}

function initCodeMirror() {
  // _optionalChain 实现
  function _optionalChain(ops: any) {
    let lastAccessLHS: any = undefined;
    let value = ops[0];
    let i = 1;
    while (i < ops.length) {
      const op = ops[i];
      const fn = ops[i + 1];
      i += 2;
      if ((op === "optionalAccess" || op === "optionalCall") && value == null) {
        return undefined;
      }
      if (op === "access" || op === "optionalAccess") {
        lastAccessLHS = value;
        value = fn(value);
      } else if (op === "call" || op === "optionalCall") {
        value = fn((...args: any) => value.call(lastAccessLHS, ...args));
        lastAccessLHS = undefined;
      }
    }
    return value;
  }
  const { WidgetType } = _window.CM["@codemirror/view"];
  // 创建 PlaceholderWidget 类
  class PlaceholderWidget extends WidgetType {
    constructor(name: any) {
      super();
      this.name = name;
    }
    eq(other: any) {
      return this.name == other.name;
    }
    toDOM() {
      const _name = this.name;
      const container = document.createElement("div");
      const app = createApp({
        render() {
          return h(Params, {
            text: "{{" + _name + "}}",
            onClick: this.handleClick,
            onMouseenter: this.handleMouseenter,
            onMouseleave: this.handleMouseleave,
          });
        },
        methods: {
          handleClick(event: any) {},
          handleMouseenter(event: any) {
            this.$nextTick(() => {
              variable_content.value = parseExpression(
                event.target.textContent.trim()
              );
              buttonRef.value = event.currentTarget.$el || event.currentTarget;
            });
          },
          handleMouseleave(event: any) {},
        },
      });
      app.mount(container);
      return container.firstElementChild;
    }
    ignoreEvent() {
      return false;
    }
  }

  // 创建 FixedWidget 类
  class FixedWidget extends WidgetType {
    constructor(name: any) {
      super();
      this.name = name;
    }
    eq(other: any) {
      return this.name == other.name;
    }
    toDOM() {
      const _name = this.name;
      const container = document.createElement("div");
      const app = createApp({
        render() {
          return h(ParamsFixed, {
            text: "{%" + _name + "%}",
            onClick: this.handleClick,
            onMouseenter: this.handleMouseenter,
            onMouseleave: this.handleMouseleave,
          });
        },
        methods: {
          handleClick(event: any) {},
          handleMouseenter(event: any) {
            this.$nextTick(() => {
              variable_content.value = parseExpression(
                event.target.textContent.trim()
              );
              buttonRef.value = event.currentTarget.$el || event.currentTarget;
            });
          },
          handleMouseleave(event: any) {},
        },
      });
      app.mount(container);
      return container.firstElementChild;
    }
    ignoreEvent() {
      return false;
    }
  }

  const { MatchDecorator } = _window.CM["@codemirror/view"];
  const { Decoration, EditorView, ViewPlugin } = _window.CM["@codemirror/view"];
  // 创建 MatchDecorator 实例
  let placeholderMatcher: any;
  if (props.enableDecoration) {
    placeholderMatcher = new MatchDecorator({
      regexp: /\{\{([^}]+)\}\}/g,
      decoration: (match: any) =>
        Decoration.replace({
          widget: new PlaceholderWidget(match[1]),
        }),
    });
  }

  let fixedMatcher: any;
  if (props.enableDecoration) {
    fixedMatcher = new MatchDecorator({
      regexp: /\{\%([^%]+)\%\}/g,
      decoration: (match: any) =>
        Decoration.replace({
          widget: new FixedWidget(match[1]),
        }),
    });
  }

  // 创建 ViewPlugin 实例
  const placeholders = ViewPlugin.fromClass(
    class {
      placeholders: any;
      constructor(view: any) {
        if (props.enableDecoration) {
          this.placeholders = placeholderMatcher.createDeco(view);
        } else {
          this.placeholders = Decoration.none;
        }
      }
      update(update: any) {
        if (update.docChanged) {
          emit("update:modelValue", editorView.state.doc.toString());
        }
        if (props.enableDecoration) {
          this.placeholders = placeholderMatcher.updateDeco(
            update,
            this.placeholders
          );
        }
      }
    },
    {
      decorations: (instance: any) => instance.placeholders,
      provide: (plugin: any) =>
        EditorView.atomicRanges.of((view: any) => {
          return (
            _optionalChain([
              view,
              "access",
              (_: any) => _.plugin,
              "call",
              (_2: any) => _2(plugin),
              "optionalAccess",
              (_3: any) => _3.placeholders,
            ]) || Decoration.none
          );
        }),
    }
  );

  const fixedPlaceholders = ViewPlugin.fromClass(
    class {
      fixedPlaceholders: any;
      constructor(view: any) {
        if (props.enableDecoration) {
          this.fixedPlaceholders = fixedMatcher.createDeco(view);
        } else {
          this.fixedPlaceholders = Decoration.none;
        }
      }
      update(update: any) {
        if (update.docChanged) {
          emit("update:modelValue", editorView.state.doc.toString());
        }
        if (props.enableDecoration) {
          this.fixedPlaceholders = fixedMatcher.updateDeco(
            update,
            this.fixedPlaceholders
          );
        }
      }
    },
    {
      decorations: (instance: any) => instance.fixedPlaceholders,
      provide: (plugin: any) =>
        EditorView.atomicRanges.of((view: any) => {
          return (
            _optionalChain([
              view,
              "access",
              (_: any) => _.plugin,
              "call",
              (_2: any) => _2(plugin),
              "optionalAccess",
              (_3: any) => _3.fixedPlaceholders,
            ]) || Decoration.none
          );
        }),
    }
  );

  return [placeholders, fixedPlaceholders];
}
// 全局加载控制
let _window: any = window;
onMounted(async () => {
  // 1. 立即显示容器但显示加载状态
  show.value = true;

  // 3. 空闲期初始化
  const init = () => {
    if (!editorContainer.value) return;

    const [placeholders, fixedPlaceholders] = initCodeMirror();
    const { EditorView } = _window.CM["@codemirror/view"];
    const { EditorState } = _window.CM["@codemirror/state"];
    let extensions_list = [
      _window.CM.codemirror.minimalSetup,
      placeholders,
      fixedPlaceholders,
      EditorState.transactionFilter.of((tr: any) => {
        if (props.disable) return [];
        if (props.enableNewLine === false) {
          // 检查变更中是否包含换行符
          let hasNewline = false;
          tr.changes.iterChanges(
            (fromA: any, toA: any, fromB: any, toB: any, inserted: any) => {
              if (inserted.text.length > 1) {
                hasNewline = true;
              }
            }
          );

          // 如果包含换行符，阻止事务
          return hasNewline ? [] : tr;
        }
        return tr;
      }),
    ];
    editorView = new EditorView({
      state: EditorState.create({
        doc: props.modelValue,
        extensions: extensions_list,
      }),
      parent: editorContainer.value,
      editable: () => !props.disable,
    });
  };

  // 优先使用 requestIdleCallback
  if ("requestIdleCallback" in window) {
    requestIdleCallback(init, { timeout: 2000 });
  } else {
    setTimeout(init, 50);
  }
});

onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy();
  }
});
</script>

<style>
.singleton-tooltip {
  padding: 0px;
  border-radius: 10px;
}
.mirror-tooltip {
  display: flex;
  flex-direction: column;
  width: 300px;
  align-items: center;
  justify-content: start;
  .mirror-tooltip-header {
    width: calc(100% - 20px);
    height: 30px;
    display: flex;
    justify-content: start;
    align-items: center;
    font-size: 14px;
    padding: 5px 10px;
    font-weight: 500;
  }
  .mirror-tooltip-divider {
    width: 100%;
    border-bottom: 1px solid var(--border-color);
  }
}
.edit-div {
  display: flex;
  justify-content: center;
  margin-right: 5px;
  align-items: center;
}
.edit-div i {
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
}
.edit-div i:hover {
  background-color: var(--hover-bg);
}
.editor-container:hover {
  background-color: white;
}
.editor-container {
  display: flex;
  align-items: center;
  flex-direction: row-reverse;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  /* transition: border-color 0.3s ease, color 0.3s ease; */
  /* border: 1px solid transparent; */
  width: 100%;
  overflow: hidden;
  .cm-scroller {
    overflow: hidden;
  }
  .cm-content {
    padding: 0px;
  }
  .cm-editor {
    font-size: 12px;
    outline: unset;
  }
}
.cm-line {
  width: 100%;
  display: flex !important;
  align-items: center;
}
.cm-editor {
  width: 100%;
  height: 100% !important; /* 确保编辑器高度填满容器 */
  overflow: hidden !important; /* 隐藏滚动条 */
  white-space: nowrap !important; /* 禁止换行 */
}
</style>
