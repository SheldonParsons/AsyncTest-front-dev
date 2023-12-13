<template>
  <transition name="el-fade-in-linear" appear>
    <div
      class="ed"
      :style="{
        '--color-group': GlobalStatus.colorList[colorGroup][0],
        '--color-group-light': GlobalStatus.colorList[colorGroup][1]
      }"
    >
      <div class="ed-header">
        <el-row>
          <el-col :span="18"
            ><p class="g-unselect">{{ $t('main.editor') }}</p></el-col
          >
          <el-col :span="6" class="language-col">
            <el-dropdown trigger="click" @command="choiceLanguage">
              <span class="el-dropdown-link g-unselect">
                {{ $t('component.editor.language') }}-{{
                  languageMapping[defaultLanguage]
                }}<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="private">Json</el-dropdown-item>
                  <el-dropdown-item command="text">Text</el-dropdown-item>
                  <el-dropdown-item command="python" divided disabled
                    >Python</el-dropdown-item
                  >
                  <el-dropdown-item command="javascript" disabled
                    >JavaScript</el-dropdown-item
                  >
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-col>
        </el-row>
      </div>
      <div class="ed editor" ref="dom"></div>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import { onMounted, ref, getCurrentInstance, watch } from 'vue'
import JSONFormat from './formatter'
import tools from '@/utils/tools'
import { useI18n } from 'vue-i18n'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import GlobalStatus from '@/global'
// import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

self.MonacoEnvironment = {
  getWorker(workerId, label) {
    return new EditorWorker()
  }
}

const { t } = useI18n()

const props = defineProps({
  modelValue: {
    type: Object
  },
  project: {
    type: Number,
    default: -1
  },
  codeCompleteFn: {
    type: Function,
    default: null
  },
  changeValue: {
    type: Boolean,
    default: false
  },
  colorGroup: {
    type: Number,
    default: 0
  }
})
watch(
  () => props.modelValue,
  (newVal: any, oldVal) => {
    if (props.changeValue && instance) {
      try {
        instance.setValue(JSONFormat(newVal))
      } catch (error) {
        instance.setValue(newVal)
      }
    }
  }
)

// 全局对象
const { proxy }: any = getCurrentInstance()

// 双向绑定，抛出model
const emit = defineEmits(['update:modelValue'])

// 编辑器组件实例
const dom = ref()

// monaco实例
const monaco = ref()

// {{}}正则
const localRe = /\{{2}.*?\}{2}/g

// model生成出来的编辑器结构化实例
let instance: any

// 自定义语言
const _CUSTOMER = 'private'

// 语言文本映射
const languageMapping: any = {
  private: 'JSON',
  text: 'TEXT',
  python: 'Python',
  javascript: 'JavaScript'
}

// 当前语言
const defaultLanguage = ref(_CUSTOMER)

// 编辑器注册列表
const registerList: any = []

// 插入数据列表
const insertData: any = []

function choiceLanguage(command: any) {
  dispose()
  defaultLanguage.value = command
  createLanguage(monaco.value)
  tools.message(
    t('component.editor.changeLanguage') +
      languageMapping[defaultLanguage.value],
    proxy
  )
}

onMounted(async () => {
  // 动态加载monaco
  import('monaco-editor').then(async (m) => {
    await createLanguage(m)
  })
})

function dispose() {
  for (let i = 0; i < registerList.length; i++) {
    registerList[i].dispose()
  }
}

async function createLanguage(m: any) {
  monaco.value = m
  // 设置自定义皮肤
  setTheme()
  monaco.value.languages.register({ id: defaultLanguage.value })
  // 创建保存格式化代码快捷键
  monaco.value.editor.addEditorAction({
    id: 'save',
    label: 'save',
    keybindings: [
      monaco.value.KeyMod.chord(
        monaco.value.KeyMod.CtrlCmd | monaco.value.KeyCode.KeyS
      )
    ],
    run: saveEditor // 方法
  })
  const _t: any = props.modelValue
  // 创建编辑器model
  const model = monaco.value.editor.createModel(
    _t.data === undefined ? JSONFormat(_t) : JSONFormat(_t.data),
    defaultLanguage.value
  )
  // 创建编辑器实例
  instance = monaco.value.editor.create(dom.value, {
    model,
    tabSize: 2,
    fontSize: '16px',
    automaticLayout: true,
    scrollBeyondLastLine: false,
    minimap: {
      enabled: true,
      maxColumn: 80,
      renderCharacters: true,
      showSlider: 'always', // "always" | "mouseover"
      side: 'right', // "right" | "left"
      size: 'fit' // "proportional" | "fill" | "fit"
    }
  })
  initEditorInstance(model)
  function saveEditor() {
    if (defaultLanguage.value === _CUSTOMER) {
      // 格式化代码
      instance.setValue(JSONFormat(instance.getValue()))
      tools.message(t('component.editor.formatted'), proxy)
    } else {
      console.log('text...')
    }
  }
  switchRegister()
  await completionItems()
}

function switchRegister() {
  if (defaultLanguage.value === _CUSTOMER) {
    initRegister()
    initPrivateRegister()
  } else if (defaultLanguage.value === 'text') {
    initRegister()
  }
}

function initEditorInstance(model: any) {
  // 创建修改监听事件
  instance.onDidChangeModelContent((event: any) => {
    if (defaultLanguage.value === _CUSTOMER) {
      // 代码检查
      SyntaxCheck(model)
    }
    // 自定义特殊字符自动补全
    completionSpecialWord(model, event.changes[0].text, event.changes[0].range)
    // 抛出组件双向绑定
    const value = instance.getValue()
    emit('update:modelValue', value)
  })
  registerList.push(instance)
}

// 设置自定义主题
function setTheme() {
  monaco.value.editor.defineTheme('fizz', {
    base: 'vs',
    inherit: true,
    rules: [{ background: 'F5F5F5' }],
    colors: {
      'editor.foreground': '#000000',
      'editor.background': '#F5F5F5',
      'editorCursor.foreground': '#000000',
      'editor.lineHighlightBackground': '#DCDCDC',
      'editorLineNumber.foreground': '#008800',
      'editor.selectionBackground': '#CDCDB4',
      'editor.inactiveSelectionBackground': '#88000015'
    }
  })
  monaco.value.editor.setTheme('fizz')
}

// 特殊字符自动补全
function completionSpecialWord(model: any, text: string, range: any) {
  if (text === '{') {
    insertWordAndNextPosition('}')
    instance.setPosition({
      lineNumber: range.startLineNumber,
      column: range.endColumn + 1
    })
  }

  function insertWordAndNextPosition(text: any) {
    model.applyEdits(
      [
        {
          range: {
            startLineNumber: range.startLineNumber,
            startColumn: range.startColumn + 1,
            endLineNumber: range.endLineNumber,
            endColumn: range.endColumn + 1
          },
          text
        }
      ],
      true
    )
  }
}

// 代码检查
function SyntaxCheck(model: any) {
  try {
    // 获取替换字符长度，用于等长度替换
    const match = localRe.exec(instance.getValue())
    let addLength: number = 0
    if (match !== null) {
      match.map((item: any) => {
        addLength += item.length
      })
    }
    // JSON.parse语法检查
    JSON.parse(
      instance.getValue().replaceAll(localRe, Math.pow(10, addLength - 1))
    )
    // 语法检查通过清空编辑器marker内容
    monaco.value.editor.setModelMarkers(model, defaultLanguage.value, [])
  } catch (error: any) {
    // 匹配数字
    const re = /\d+/g
    let errorIndex: any = re.exec(error.message)
    if (errorIndex) {
      errorIndex = parseInt(errorIndex[0])
      let sumLength = 0
      const dataRows = instance.getValue().split('\n')
      for (let i = 0; i < dataRows.length; i++) {
        // 区间匹配
        if (
          parseInt(errorIndex) >= sumLength &&
          parseInt(errorIndex) <= sumLength + dataRows[i].length
        ) {
          // 创建编辑器代码提示marker
          monaco.value.editor.setModelMarkers(model, defaultLanguage.value, [
            {
              startLineNumber: i + 1,
              endLineNumber: i + 1,
              startColumn: errorIndex - sumLength + 1,
              endColumn: errorIndex - sumLength + 1,
              code: error.code,
              severity: monaco.value.MarkerSeverity.Error,
              message: error.message
            }
          ])
          break
        } else {
          sumLength += dataRows[i].length + 1
        }
      }
    }
  }
}

// 初始化Private类型的功能注册
function initPrivateRegister() {
  // 格式化
  const formatter =
    monaco.value.languages.registerDocumentFormattingEditProvider(
      defaultLanguage.value,
      {
        provideDocumentFormattingEdits: (
          model: any,
          range: any,
          options: any,
          token: any
        ) => {
          return [
            {
              range: model.getFullModelRange(),
              text: JSONFormat(model.getValue())
            }
          ]
        }
      }
    )
  registerList.push(formatter)
}
// 注册通用功能
function initRegister() {
  // 自定义代码高亮
  const highlight = monaco.value.languages.setMonarchTokensProvider(
    defaultLanguage.value,
    {
      ignoreCase: true,
      tokenizer: {
        root: [
          // [/\d+/, { token: 'keyword' }],
          ['\\d+|[\u4e00-\u9fa5]|\\w+|\\"', { token: 'string' }],
          ['\\{{2}.*?\\}{2}', { token: 'keyword' }]
        ]
      }
    }
  )
  registerList.push(highlight)
  // 补全代码监听
  const codeComplete = monaco.value.languages.registerCompletionItemProvider(
    defaultLanguage.value,
    {
      triggerCharacters:
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"'.split(''),
      provideCompletionItems: function (
        model: any,
        position: any,
        context: any,
        token: any
      ) {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        }
        const prefix = word.word.toLowerCase()
        const suggestions = insertData
          .filter((item: any) => {
            return item.label.toLowerCase().startsWith(prefix)
          })
          .map((item: any) => {
            return {
              ...item,
              range
            }
          })
        return {
          suggestions,
          incomplete: true
        }
      }
    }
  )
  registerList.push(codeComplete)
}

async function completionItems() {
  const data = {
    project: props.project,
    simple: 1
  }
  if (props.codeCompleteFn === null) {
    return
  }
  props.codeCompleteFn!(data).then((data: any) => {
    console.log(data)
    for (let i = 0; i < data.results.length; i++) {
      insertData.push({
        preselect: true,
        label: data.results[i].name,
        kind: monaco.value.languages.CompletionItemKind.Variable,
        documentation: data.results[i].id + ':' + data.results[i].desc,
        insertText: data.results[i].name,
        detail: data.results[i].desc
      })
    }
    return insertData
  })
}
</script>

<style lang="scss" scoped>
.ed {
  width: 100%;
  height: 100%;
  // margin-left: 5%;
}
.ed-header {
  height: 35px;
  width: calc(100% + 20px);
  border-radius: 5px 5px 0px 0px;
  background-image: linear-gradient(
    90deg,
    var(--dialog-deep-color) 80%,
    var(--dialog-color)
  );
  text-align: center;
  p {
    color: white;
    font-size: 16px;
    font-family: $special-font-family;
    font-weight: normal;
    font-style: normal;
    display: table-cell;
    vertical-align: middle;
    height: 35px;
    padding-left: 20px;
  }
}
.editor {
  height: 90%;
  border-radius: 0px 0px 5px 5px;
  border-right: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-left: 10px solid transparent;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(to right, #ffffff, #ffffff),
    linear-gradient(90deg, var(--dialog-deep-color) 80%, var(--dialog-color));
}
.el-row {
  height: inherit;
}
.language-col {
  height: inherit;
  span.el-dropdown-link {
    cursor: pointer;
    margin-top: 10px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    display: flex;
  }
  .el-dropdown {
    height: 100%;
  }
}
</style>
