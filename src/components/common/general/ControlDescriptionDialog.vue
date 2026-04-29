<template>
  <Teleport to="body">
    <Transition name="ctrl-desc-fade">
      <div v-if="modelValue" class="ctrl-desc-overlay">
        <section class="ctrl-desc-dialog" role="dialog" aria-modal="true">
          <header class="ctrl-desc-header">
            <div>
              <p>控件描述插入器</p>
              <h2>生成控件行为描述</h2>
            </div>
          </header>

          <div class="ctrl-desc-body">
            <div class="ctrl-desc-grid">
              <label>
                <span>控件类型</span>
                <CustomSelect v-model="draft.controlType" :options="controlTypeOptions" size="sm" />
              </label>

              <label v-if="draft.controlType === 'button' || draft.controlType === 'table_action_button'">
                <span>按钮文字</span>
                <input v-model="draft.label" placeholder="例如：新增 / 编辑 / 删除" />
              </label>

              <label v-if="draft.controlType === 'icon_button'">
                <span>图标含义</span>
                <input v-model="draft.iconMeaning" placeholder="例如：编辑图标 / 删除图标" />
              </label>

              <label>
                <span>触发方式</span>
                <CustomSelect v-model="draft.trigger" :options="triggerOptions" size="sm" />
              </label>

              <label>
                <span>触发后结果</span>
                <CustomSelect v-model="draft.resultType" :options="resultTypeOptions" size="sm" />
              </label>

              <label class="ctrl-desc-wide">
                <span>出现的内容 / 执行的行为</span>
                <textarea
                  v-model="draft.resultContent"
                  placeholder="例如：右侧弹出创建账号面板 / 打开账号详情页 / 调用删除接口并刷新列表"
                  rows="3"
                />
              </label>

              <label>
                <span>内容描述方式</span>
                <CustomSelect v-model="draft.descriptionScope" :options="descriptionScopeOptions" size="sm" />
              </label>

              <label>
                <span>条件 / 权限</span>
                <CustomSelect v-model="draft.conditionMode" :options="conditionModeOptions" size="sm" />
              </label>

              <label v-if="draft.conditionMode !== 'none'" class="ctrl-desc-wide">
                <span>条件说明</span>
                <textarea
                  v-model="draft.conditionText"
                  placeholder="例如：仅拥有账号编辑权限时可点击 / 当前账号状态为启用时显示"
                  rows="2"
                />
              </label>
            </div>

            <section class="ctrl-desc-feedback">
              <span>反馈与状态</span>
              <div>
                <button
                  v-for="item in feedbackOptions"
                  :key="item.value"
                  type="button"
                  :class="{ 'is-active': draft.feedback.includes(item.value) }"
                  @click="toggleFeedback(item.value)"
                >
                  {{ item.label }}
                </button>
              </div>
            </section>

            <section class="ctrl-desc-preview">
              <div>
                <span>插入预览</span>
                <button type="button" @click="resetDraft">重置</button>
              </div>
              <p>{{ generatedText }}</p>
            </section>
          </div>

          <footer class="ctrl-desc-footer">
            <button type="button" class="ctrl-desc-cancel" @click="close">取消</button>
            <button type="button" class="ctrl-desc-insert" :disabled="!generatedText.trim()" @click="insert">
              插入描述
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, reactive, watch } from 'vue'

type ControlType = 'button' | 'icon_button' | 'table_action_button'
type DescriptionScope = 'inline' | 'child_node' | 'existing_node'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'insert', value: string): void
}>()

const controlTypeOptions = [
  { value: 'button', label: '文字按钮' },
  { value: 'icon_button', label: '图标按钮' },
  { value: 'table_action_button', label: '表格内操作按钮' },
]

const triggerOptions = [
  { value: '点击', label: '点击' },
  { value: '双击', label: '双击' },
  { value: '悬停', label: '悬停' },
]

const resultTypeOptions = [
  { value: 'panel', label: '弹出面板' },
  { value: 'dialog', label: '弹出弹窗' },
  { value: 'drawer', label: '打开抽屉' },
  { value: 'page', label: '跳转页面' },
  { value: 'menu', label: '展开菜单' },
  { value: 'api', label: '触发接口' },
  { value: 'status', label: '改变状态' },
  { value: 'download', label: '下载' },
  { value: 'upload', label: '上传' },
  { value: 'none', label: '无页面变化' },
  { value: 'custom', label: '自定义' },
]

const descriptionScopeOptions = [
  { value: 'inline', label: '在当前描述中说明' },
  { value: 'child_node', label: '在子节点中描述' },
  { value: 'existing_node', label: '引用已有节点描述' },
]

const conditionModeOptions = [
  { value: 'none', label: '无条件' },
  { value: 'show_permission', label: '有权限才显示' },
  { value: 'click_permission', label: '有权限才可点击' },
  { value: 'status_show', label: '满足状态才显示' },
  { value: 'status_click', label: '满足状态才可点击' },
  { value: 'custom', label: '自定义条件' },
]

const feedbackOptions = [
  { value: 'confirm', label: '二次确认' },
  { value: 'loading', label: '加载状态' },
  { value: 'success', label: '成功提示' },
  { value: 'failure', label: '失败提示' },
  { value: 'disabled', label: '禁用状态' },
  { value: 'no_permission', label: '无权限提示' },
]

const draft = reactive({
  controlType: 'button' as ControlType,
  label: '',
  iconMeaning: '',
  trigger: '点击',
  resultType: 'panel',
  resultContent: '',
  descriptionScope: 'inline' as DescriptionScope,
  conditionMode: 'none',
  conditionText: '',
  feedback: [] as string[],
})

const resultTypeLabels = computed(() =>
  Object.fromEntries(resultTypeOptions.map(item => [item.value, item.label]))
)

const conditionModeLabels = computed(() =>
  Object.fromEntries(conditionModeOptions.map(item => [item.value, item.label]))
)

const feedbackLabels = computed(() =>
  Object.fromEntries(feedbackOptions.map(item => [item.value, item.label]))
)

const generatedText = computed(() => {
  const subject = controlSubject()
  const parts: string[] = []
  const result = draft.resultContent.trim()
  const resultType = resultTypeLabels.value[draft.resultType] || draft.resultType

  parts.push(`${draft.trigger}${subject}后，${result || resultType}。`)

  if (draft.descriptionScope === 'child_node') {
    parts.push('触发后出现内容的具体字段、校验和提交规则在当前节点的子节点中描述。')
  } else if (draft.descriptionScope === 'existing_node') {
    parts.push('触发后出现内容引用已有节点描述。')
  } else if (result && draft.resultType !== 'none') {
    parts.push('触发后出现内容在当前描述中就地说明。')
  }

  if (draft.conditionMode !== 'none') {
    const condition = draft.conditionText.trim()
    const label = conditionModeLabels.value[draft.conditionMode] || '满足条件'
    parts.push(condition ? `${label}：${condition}。` : `${label}。`)
  }

  if (draft.feedback.length) {
    const labels = draft.feedback.map(item => feedbackLabels.value[item] || item).join('、')
    parts.push(`该控件需要处理${labels}。`)
  }

  return parts.join('')
})

function controlSubject() {
  if (draft.controlType === 'icon_button') {
    return `${draft.iconMeaning.trim() || '图标'}按钮`
  }
  if (draft.controlType === 'table_action_button') {
    return `表格行内【${draft.label.trim() || '操作'}】按钮`
  }
  return `【${draft.label.trim() || '按钮'}】按钮`
}

function toggleFeedback(value: string) {
  const index = draft.feedback.indexOf(value)
  if (index >= 0) draft.feedback.splice(index, 1)
  else draft.feedback.push(value)
}

function resetDraft() {
  draft.controlType = 'button'
  draft.label = ''
  draft.iconMeaning = ''
  draft.trigger = '点击'
  draft.resultType = 'panel'
  draft.resultContent = ''
  draft.descriptionScope = 'inline'
  draft.conditionMode = 'none'
  draft.conditionText = ''
  draft.feedback = []
}

function close() {
  emit('update:modelValue', false)
}

function insert() {
  emit('insert', generatedText.value)
  close()
}

watch(() => props.modelValue, (open) => {
  if (open) resetDraft()
})
</script>

<style lang="scss" scoped>
.ctrl-desc-overlay {
  position: fixed;
  inset: 0;
  z-index: 10090;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(246, 246, 248, .72);
  backdrop-filter: blur(3px);
}

.ctrl-desc-dialog {
  width: min(760px, calc(100vw - 40px));
  max-height: min(760px, calc(100vh - 40px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(29, 29, 31, .14);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 24px 80px rgba(0, 0, 0, .18);
  color: #1d1d1f;
}

.ctrl-desc-header {
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(0, 0, 0, .07);

  p {
    margin: 0 0 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, .45);
  }

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
  }
}

.ctrl-desc-body {
  min-height: 0;
  padding: 18px 20px;
  overflow: auto;
}

.ctrl-desc-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  span {
    font-size: 11px;
    color: rgba(0, 0, 0, .45);
  }

  input,
  textarea {
    width: 100%;
    border: 1px solid rgba(0, 0, 0, .1);
    border-radius: 8px;
    padding: 8px 10px;
    box-sizing: border-box;
    background: #fff;
    color: #1d1d1f;
    font-family: inherit;
    font-size: 12px;
    outline: none;
    resize: none;

    &:focus {
      border-color: rgba(29, 29, 31, .42);
      box-shadow: 0 0 0 3px rgba(29, 29, 31, .06);
    }
  }
}

.ctrl-desc-wide {
  grid-column: 1 / -1;
}

.ctrl-desc-feedback,
.ctrl-desc-preview {
  margin-top: 16px;
  border: 1px solid rgba(0, 0, 0, .08);
  border-radius: 10px;
  background: #fafafa;
}

.ctrl-desc-feedback {
  padding: 12px;

  > span {
    display: block;
    margin-bottom: 10px;
    font-size: 11px;
    color: rgba(0, 0, 0, .45);
  }

  div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  button {
    height: 28px;
    padding: 0 11px;
    border: 1px solid rgba(0, 0, 0, .1);
    border-radius: 7px;
    background: #fff;
    color: rgba(0, 0, 0, .68);
    font-size: 12px;
    cursor: pointer;

    &.is-active {
      border-color: #1d1d1f;
      background: #1d1d1f;
      color: #fff;
    }
  }
}

.ctrl-desc-preview {
  overflow: hidden;

  div {
    height: 36px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(0, 0, 0, .06);
    background: #f5f5f6;
  }

  span {
    font-size: 12px;
    font-weight: 600;
  }

  button {
    border: 0;
    background: transparent;
    color: rgba(0, 0, 0, .56);
    cursor: pointer;
  }

  p {
    margin: 0;
    padding: 12px;
    min-height: 52px;
    font-size: 13px;
    line-height: 1.7;
    white-space: pre-wrap;
  }
}

.ctrl-desc-footer {
  padding: 12px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid rgba(0, 0, 0, .07);
}

.ctrl-desc-cancel,
.ctrl-desc-insert {
  height: 34px;
  min-width: 88px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.ctrl-desc-cancel {
  border: 1px solid rgba(0, 0, 0, .12);
  background: #fff;
}

.ctrl-desc-insert {
  border: 1px solid #1d1d1f;
  background: #1d1d1f;
  color: #fff;

  &:disabled {
    opacity: .45;
    cursor: not-allowed;
  }
}

.ctrl-desc-fade-enter-active,
.ctrl-desc-fade-leave-active {
  transition: opacity .16s ease;
}

.ctrl-desc-fade-enter-from,
.ctrl-desc-fade-leave-to {
  opacity: 0;
}

@media (max-width: 720px) {
  .ctrl-desc-grid {
    grid-template-columns: 1fr;
  }
}
</style>
