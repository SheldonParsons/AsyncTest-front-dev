<template>
  <div>
    <div
      id="editor-placeholder"
      ref="editorContainer"
      class="editor-container"
    ></div>
    <el-tooltip
      ref="tooltipRef"
      effect="light"
      v-model:visible="visible"
      :popper-options="{
        modifiers: [
          {
            name: 'computeStyles',
            options: {
              adaptive: false,
              enabled: false,
            },
          },
        ],
      }"
      :virtual-ref="buttonRef"
      virtual-triggering
      trigger="click"
      popper-class="singleton-tooltip"
    >
      <template #content>
        <span>{{ codeContent }}</span>
      </template>
    </el-tooltip>
  </div>
</template>

<script setup>
import {
  onMounted,
  ref,
  onBeforeUnmount,
  createApp,
  defineEmits,
  h,
  watch,
  toRefs,
} from "vue";
import Params from "./widget_cpm/param.vue";
const emit = defineEmits(['update:modelValue', "updateValue"]);

// props
const props = defineProps({
  doc: {
    type: String,
    default: "",
  },
  enableDecoration: {
    type: Boolean,
    default: true,
  },
});

const editorContainer = ref(null);
const buttonRef = ref();
const tooltipRef = ref();
const codeContent = ref("");

const visible = ref(false);
let editorView;

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

function initCodeMirror() {
  // _optionalChain 实现
  function _optionalChain(ops) {
    let lastAccessLHS = undefined;
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
        value = fn((...args) => value.call(lastAccessLHS, ...args));
        lastAccessLHS = undefined;
      }
    }
    return value;
  }
  const { WidgetType } = window.CM["@codemirror/view"];
  // 创建 PlaceholderWidget 类
  class PlaceholderWidget extends WidgetType {
    constructor(name) {
      super();
      this.name = name;
    }
    eq(other) {
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
          handleClick() {
            console.log("点击了");
          },
          handleMouseenter(event) {
            codeContent.value = event.target.textContent.trim();
            visible.value = true;
            buttonRef.value = event.currentTarget;
          },
          handleMouseleave(event) {
            visible.value = false;
          },
        },
      });
      app.mount(container);
      return container.firstElementChild;
    }
    ignoreEvent() {
      return false;
    }
  }

  const { MatchDecorator } = window.CM["@codemirror/view"];
  const { Decoration, EditorView, ViewPlugin } = window.CM["@codemirror/view"];
  // 创建 MatchDecorator 实例
  let placeholderMatcher;
  if (props.enableDecoration) {
    placeholderMatcher = new MatchDecorator({
      regexp: /\{\{(\w+)\}\}/g,
      decoration: (match) =>
        Decoration.replace({
          widget: new PlaceholderWidget(match[1]),
        }),
    });
  }
  // 创建 ViewPlugin 实例
  const placeholders = ViewPlugin.fromClass(
    class {
      constructor(view) {
        if (props.enableDecoration) {
          this.placeholders = placeholderMatcher.createDeco(view);
        } else {
          this.placeholders = Decoration.none;
        }
      }
      update(update) {
        if (update.docChanged) {
          emit('updateValue', update.state.doc.text);
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
      decorations: (instance) => instance.placeholders,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => {
          return (
            _optionalChain([
              view,
              "access",
              (_) => _.plugin,
              "call",
              (_2) => _2(plugin),
              "optionalAccess",
              (_3) => _3.placeholders,
            ]) || Decoration.none
          );
        }),
    }
  );
  return placeholders;
}

onMounted(async () => {
  await loadScript("/src/utils/codemirror.js");
  if (editorContainer.value) {
    const placeholders = initCodeMirror();
    const { EditorView } = window.CM["@codemirror/view"];
    const { EditorState, keymap } = window.CM["@codemirror/state"];

    editorView = new EditorView({
      state: EditorState.create({
        doc: props.doc,
        extensions: [
          window.CM.codemirror.minimalSetup,
          placeholders,
          EditorState.transactionFilter.of((tr) => {
            if (tr.newDoc.lines > 1 || tr.newDoc.length > 500) {
              return [];
            }
            return tr;
          }),
        ],
      }),
      parent: editorContainer.value,
    });
  }
});

onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy();
  }
});
</script>

<style>
.editor-container {
  width: 100%;
  overflow: hidden;
  .cm-scroller {
    overflow: hidden;
  }
  .cm-content {
    padding: 0px;
  }
  .cm-editor {
    font-size: 15px;
  }
}
.cm-line {
  width: 100%;
  display: flex !important;
  align-items: center;
}
.cm-editor {
  height: 100% !important; /* 确保编辑器高度填满容器 */
  overflow: hidden !important; /* 隐藏滚动条 */
  white-space: nowrap !important; /* 禁止换行 */
}
</style>
