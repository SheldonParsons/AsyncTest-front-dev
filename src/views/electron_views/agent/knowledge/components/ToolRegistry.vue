<template>
  <Teleport to="#kb-tool-tree-host">
    <aside class="kbt-tree-rail">
      <div class="kbt-tree-actions">
        <button type="button" @click="createRootFolder">
          <span>+</span>
          新建根目录
        </button>
      </div>
      <div v-if="loading" class="kbt-tree-empty">加载工具树中...</div>
      <div v-else-if="!tree.length" class="kbt-tree-empty">
        <p>暂无工具目录</p>
        <button type="button" @click="createRootFolder">创建第一个目录</button>
      </div>
      <div v-else class="kbt-tree-list">
        <ToolTreeNode
          v-for="node in tree"
          :key="node.id"
          :node="node"
          :depth="0"
          :selected-id="selectedNodeId"
          @select="selectNode"
          @add-folder="createChildFolder"
          @add-tool="createPythonTool"
          @delete="removeNode"
        />
      </div>
    </aside>
  </Teleport>

  <section class="kbt">
    <div v-if="!selectedNode" class="kbt-empty">
      <h2>工具注册中心</h2>
      <p>先用目录组织 Tools，再在目录下挂载 Calling。Wiki 会按目录摘要渐进式发现可用能力。</p>
    </div>

    <div v-else class="kbt-workbench">
      <header class="kbt-header">
        <div>
          <p>{{ selectedNode.node_type === 'folder' ? '工具目录' : 'AI 工具' }}</p>
          <h2>{{ selectedNode.name }}</h2>
        </div>
        <div class="kbt-header-actions">
          <button type="button" class="kbt-secondary" @click="reload">刷新</button>
          <button type="button" class="kbt-danger" @click="removeSelected">删除</button>
          <button type="button" class="kbt-primary" :disabled="saving" @click="saveSelected">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </header>

      <div class="kbt-form-grid">
        <label class="kbt-form-name">
          <span>名称</span>
          <input v-model="nodeDraft.name" />
        </label>
        <label v-if="selectedNode.node_type === 'folder'" class="kbt-form-wide">
          <span>描述</span>
          <textarea v-model="nodeDraft.description" rows="3" placeholder="描述这个目录下通常放哪些 Tools，便于后续生成目录摘要。" />
        </label>
      </div>

      <template v-if="selectedNode.node_type === 'folder'">
        <section class="kbt-panel">
          <div class="kbt-section-head">
            <div>
              <h3>子树索引摘要</h3>
              <p>用于让 Wiki Agent 先判断这个目录是否值得展开。</p>
            </div>
            <div class="kbt-section-actions">
              <button type="button" class="kbt-secondary" @click="createChildFolder">添加子目录</button>
              <button type="button" class="kbt-secondary" @click="createPythonTool">添加 Tools</button>
              <button type="button" class="kbt-primary" :disabled="summaryRunning" @click="generateSummary">
                {{ summaryRunning ? '生成中...' : '生成摘要' }}
              </button>
            </div>
          </div>
          <textarea v-model="nodeDraft.subtree_summary" class="kbt-summary" rows="12" placeholder="点击生成摘要，或手工描述这个目录下工具的能力边界。" />
        </section>
      </template>

      <template v-else-if="toolDraft">
        <section class="kbt-panel">
          <div class="kbt-section-head">
            <div>
              <h3>工具定义</h3>
              <p>AI 会先阅读描述和参数，再决定是否调用这个工具。</p>
            </div>
            <label class="kbt-switch">
              <CheckboxRoot v-model="toolDraft.enabled" class="kbt-checkbox">
                <CheckboxIndicator class="kbt-checkbox-indicator">✓</CheckboxIndicator>
              </CheckboxRoot>
              <span>{{ toolDraft.enabled ? '已启用' : '已禁用' }}</span>
            </label>
          </div>
          <div class="kbt-form-grid kbt-form-grid--tool">
            <label>
              <span class="kbt-field-head">
                工具描述
                <button type="button" class="kbt-mini-action" :disabled="inferringDescription" @click="inferToolDescription">
                  {{ inferringDescription ? '生成中...' : 'AI 提取' }}
                </button>
              </span>
              <textarea v-model="toolDraft.description" rows="4" placeholder="描述这个 Calling 适合解决什么问题、什么时候应该被 Wiki 调用。" />
            </label>
            <label>
              <span class="kbt-field-head">
                返回内容说明
                <button type="button" class="kbt-mini-action" :disabled="inferringOutput" @click="inferOutputDescription">
                  {{ inferringOutput ? '生成中...' : 'AI 提取' }}
                </button>
              </span>
              <textarea v-model="toolDraft.output_description" rows="4" placeholder="例如：返回 JSON，其中 result 表示两个数字相加后的结果。" />
            </label>
            <label>
              <span>超时时间（秒）</span>
              <input v-model.number="toolDraft.timeout_seconds" type="number" min="1" max="120" />
            </label>
          </div>
        </section>

        <section class="kbt-code-panel">
          <AstCodeEditor
            v-model="toolDraft.script_code"
            language="python"
            :file-name="`${toolDraft.name || 'ai_tool'}.py`"
            height="420px"
            @run="testCurrentTool"
          />
        </section>

        <section class="kbt-panel">
          <div class="kbt-section-head">
            <div>
              <h3>需求参数</h3>
              <p>参数名会直接影响 AI 生成调用参数的稳定性。</p>
            </div>
            <button type="button" class="kbt-secondary" @click="addParam">添加参数</button>
            <button type="button" class="kbt-secondary" :disabled="extractingParams" @click="inferParams">
              {{ extractingParams ? '提取中...' : 'AI 提取参数' }}
            </button>
          </div>
          <div v-if="!toolDraft.input_schema.length" class="kbt-param-empty">暂无参数。无参工具可以保持为空。</div>
          <div v-for="(param, index) in toolDraft.input_schema" :key="index" class="kbt-param-row">
            <label>
              <span>参数名</span>
              <input v-model="param.name" placeholder="例如：a" />
            </label>
            <label>
              <span>类型</span>
              <AppSelect
                v-model="param.type"
                class="kbt-param-type-select"
                :options="paramTypeOptions"
                placeholder="选择类型"
              />
            </label>
            <label>
              <span>默认值</span>
              <input v-model="param.default" placeholder="可为空" />
            </label>
            <label class="kbt-param-desc">
              <span>参数描述</span>
              <input v-model="param.description" placeholder="告诉 AI 这个参数应该填什么" />
            </label>
            <div class="kbt-param-side">
              <label class="kbt-param-check">
                <CheckboxRoot v-model="param.required" class="kbt-checkbox">
                  <CheckboxIndicator class="kbt-checkbox-indicator">✓</CheckboxIndicator>
                </CheckboxRoot>
                必填
              </label>
              <button type="button" class="kbt-danger kbt-param-delete" @click="removeParam(index)">删除</button>
            </div>
          </div>
        </section>

        <section class="kbt-panel">
          <div class="kbt-section-head">
            <div>
              <h3>测试运行</h3>
              <p>按当前参数配置生成测试输入，然后执行 Python main(**kwargs)。</p>
            </div>
            <button type="button" class="kbt-primary" :disabled="testing" @click="testCurrentTool">
              {{ testing ? '运行中...' : '运行测试' }}
            </button>
          </div>
          <div class="kbt-test-grid">
            <label v-for="param in toolDraft.input_schema" :key="param.name || param.description">
              <span>{{ param.name || '未命名参数' }}</span>
              <input v-model="testArgs[param.name]" :placeholder="param.default != null ? String(param.default) : param.description" />
            </label>
          </div>
          <pre v-if="testResult" :class="['kbt-test-result', { 'is-error': !testResult.ok }]">{{ JSON.stringify(testResult, null, 2) }}</pre>
        </section>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import AstCodeEditor from '@/components/common/editor/AstCodeEditor.vue'
import AppSelect from '@/components/common/select/AppSelect.vue'
import type { KBAITool, KBAIToolInputParam, KBAIToolTestResult, KBToolTreeNode } from '@/types/knowledge'
import { streamHarnessSse } from '@/api/harness'
import ToolTreeNode from './ToolTreeNode.vue'
import {
  createToolTreeNode,
  deleteToolTreeNode,
  getToolTree,
  inferAIToolParams,
  inferAIToolText,
  testAITool,
  updateAITool,
  updateToolTreeNode,
} from '../api'

const props = defineProps<{ kbId: number }>()

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const extractingParams = ref(false)
const inferringDescription = ref(false)
const inferringOutput = ref(false)
const summaryRunning = ref(false)
const tree = ref<KBToolTreeNode[]>([])
const selectedNodeId = ref('')
const testArgs = reactive<Record<string, any>>({})
const testResult = ref<KBAIToolTestResult | null>(null)
const nodeDraft = reactive({
  name: '',
  description: '',
  subtree_summary: '',
})
const toolDraft = ref<KBAITool | null>(null)

const selectedNode = computed(() => findNode(tree.value, selectedNodeId.value))
const paramTypeOptions = [
  { value: 'string', label: '字符串' },
  { value: 'number', label: '数字' },
  { value: 'integer', label: '整数' },
  { value: 'boolean', label: '布尔' },
  { value: 'json', label: 'JSON' },
]

onMounted(() => {
  reload()
  window.addEventListener('keydown', handleShortcutSave)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleShortcutSave)
})

watch(() => props.kbId, () => {
  selectedNodeId.value = ''
  reload()
})

watch(selectedNode, (node) => {
  if (!node) {
    resetDraft()
    return
  }
  nodeDraft.name = node.name || ''
  nodeDraft.description = node.node_type === 'folder' ? (node.description || '') : ''
  nodeDraft.subtree_summary = node.node_type === 'folder' ? (node.subtree_summary || '') : ''
  toolDraft.value = node.tool ? JSON.parse(JSON.stringify(node.tool)) : null
  testResult.value = null
  Object.keys(testArgs).forEach((key) => delete testArgs[key])
  const savedArgs = toolDraft.value?.test_arguments || {}
  for (const param of toolDraft.value?.input_schema || []) {
    if (param.name) testArgs[param.name] = savedArgs[param.name] ?? param.default ?? ''
  }
}, { immediate: true })

function resetDraft() {
  nodeDraft.name = ''
  nodeDraft.description = ''
  nodeDraft.subtree_summary = ''
  toolDraft.value = null
}

function findNode(nodes: KBToolTreeNode[], id: string): KBToolTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const child = findNode(node.children || [], id)
    if (child) return child
  }
  return null
}

async function reload() {
  loading.value = true
  try {
    tree.value = await getToolTree(props.kbId)
    if (selectedNodeId.value && !findNode(tree.value, selectedNodeId.value)) selectedNodeId.value = ''
  } finally {
    loading.value = false
  }
}

function selectNode(id: string) {
  selectedNodeId.value = id
}

function handleShortcutSave(event: KeyboardEvent) {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return
  if (!selectedNode.value || saving.value) return
  event.preventDefault()
  saveSelected()
}

async function createRootFolder() {
  const node = await createToolTreeNode(props.kbId, {
    parent_id: null,
    node_type: 'folder',
    name: '新工具目录',
    description: '',
  })
  await reload()
  selectedNodeId.value = node.id
}

async function createChildFolder(parentId?: string) {
  const parent = parentId ? findNode(tree.value, parentId) : selectedNode.value
  if (!parent || parent.node_type !== 'folder') return
  const node = await createToolTreeNode(props.kbId, {
    parent_id: parent.id,
    node_type: 'folder',
    name: '新工具目录',
    description: '',
  })
  await reload()
  selectedNodeId.value = node.id
}

async function createPythonTool(parentId?: string) {
  const parent = parentId ? findNode(tree.value, parentId) : selectedNode.value
  if (!parent || parent.node_type !== 'folder') {
    window.$toast?.({ title: '请先选择一个目录，再添加工具', type: 'warning' })
    return
  }
  const node = await createToolTreeNode(props.kbId, {
    parent_id: parent.id,
    node_type: 'tool',
    name: 'New Calling',
    description: '',
    tool: {
      name: 'New Calling',
      tool_type: 'python_script',
      description: '',
      enabled: true,
        input_schema: [
          { name: 'a', type: 'number', required: true, default: '12', description: '参与计算的第一个数字' },
          { name: 'b', type: 'number', required: true, default: '35', description: '参与计算的第二个数字' },
        ],
        test_arguments: { a: '12', b: '35' },
        output_description: '',
      timeout_seconds: 60,
      script_code: 'def main(a, b):\n    return {"result": float(a) + float(b)}\n',
    },
  })
  await reload()
  selectedNodeId.value = node.id
}

async function saveSelected() {
  await persistSelected({ reloadAfter: true, toast: true })
}

async function persistSelected(options: { reloadAfter?: boolean; toast?: boolean } = {}) {
  const node = selectedNode.value
  if (!node) return
  const reloadAfter = options.reloadAfter !== false
  const showToast = options.toast !== false
  saving.value = true
  try {
    await updateToolTreeNode(props.kbId, node.id, {
      name: nodeDraft.name,
      description: node.node_type === 'folder' ? nodeDraft.description : undefined,
      subtree_summary: node.node_type === 'folder' ? nodeDraft.subtree_summary : undefined,
    })
    if (node.node_type === 'tool' && toolDraft.value?.id) {
      await updateAITool(props.kbId, toolDraft.value.id, {
        name: nodeDraft.name,
        description: toolDraft.value.description,
        enabled: toolDraft.value.enabled,
        input_schema: cleanParams(toolDraft.value.input_schema),
        test_arguments: collectTestArguments(cleanParams(toolDraft.value.input_schema)),
        output_description: toolDraft.value.output_description,
        timeout_seconds: Number(toolDraft.value.timeout_seconds || 60),
        script_code: toolDraft.value.script_code || '',
      })
    }
    if (reloadAfter) await reload()
    if (showToast) window.$toast?.({ title: '工具已保存', type: 'success' })
  } catch (error: any) {
    window.$toast?.({ title: error.message || '保存失败', type: 'error' })
    throw error
  } finally {
    saving.value = false
  }
}

function cleanParams(params: KBAIToolInputParam[]) {
  return (params || []).filter((item) => (item.name || '').trim()).map((item) => ({
    name: item.name.trim(),
    type: item.type || 'string',
    required: !!item.required,
    default: item.default,
    description: item.description || '',
  }))
}

async function removeSelected() {
  const node = selectedNode.value
  if (!node) return
  await removeNode(node.id)
}

async function removeNode(nodeId: string) {
  const node = findNode(tree.value, nodeId)
  if (!node) return
  if (!window.confirm(`确认删除「${node.name}」？`)) return
  await deleteToolTreeNode(props.kbId, node.id)
  if (selectedNodeId.value === node.id) selectedNodeId.value = ''
  await reload()
  window.$toast?.({ title: '已删除', type: 'success' })
}

function addParam() {
  toolDraft.value?.input_schema.push({
    name: toolDraft.value.input_schema.length === 0 ? 'a' : 'b',
    type: 'number',
    required: false,
    default: '',
    description: '参与计算的数字',
  })
}

function removeParam(index: number) {
  toolDraft.value?.input_schema.splice(index, 1)
}

function collectTestArguments(params: KBAIToolInputParam[]) {
  const args: Record<string, any> = {}
  for (const param of params || []) {
    const name = (param.name || '').trim()
    if (!name) continue
    const value = testArgs[name]
    args[name] = value !== undefined && value !== '' ? value : (param.default ?? '')
  }
  return args
}

async function inferParams() {
  if (!toolDraft.value?.id) return
  extractingParams.value = true
  try {
    const result = await inferAIToolParams(props.kbId, toolDraft.value.id, {
      name: nodeDraft.name,
      description: toolDraft.value.description,
      output_description: toolDraft.value.output_description,
      script_code: toolDraft.value.script_code || '',
    })
    if (!result.params?.length) {
      window.$toast?.({ title: result.warning || '没有提取到可用参数', type: 'warning' })
      return
    }
    toolDraft.value.input_schema = result.params
    Object.keys(testArgs).forEach((key) => delete testArgs[key])
    for (const param of result.params) {
      if (param.name) testArgs[param.name] = toolDraft.value.test_arguments?.[param.name] ?? param.default ?? ''
    }
    window.$toast?.({ title: `已提取 ${result.params.length} 个参数`, type: 'success' })
  } catch (error: any) {
    window.$toast?.({ title: error.message || '参数提取失败', type: 'error' })
  } finally {
    extractingParams.value = false
  }
}

function currentToolTextPayload(target: 'description' | 'output_description') {
  if (!toolDraft.value) return null
  const params = cleanParams(toolDraft.value.input_schema)
  return {
    target,
    name: nodeDraft.name,
    description: toolDraft.value.description,
    input_schema: params,
    test_arguments: collectTestArguments(params),
    output_description: toolDraft.value.output_description,
    script_code: toolDraft.value.script_code || '',
    test_result: target === 'output_description' ? testResult.value : null,
  }
}

async function inferToolDescription() {
  if (!toolDraft.value?.id) return
  inferringDescription.value = true
  try {
    const payload = currentToolTextPayload('description')
    if (!payload) return
    const result = await inferAIToolText(props.kbId, toolDraft.value.id, payload)
    if (!result.content) {
      window.$toast?.({ title: result.warning || '没有生成可用工具描述', type: 'warning' })
      return
    }
    toolDraft.value.description = result.content
    window.$toast?.({ title: '已生成工具描述', type: 'success' })
  } catch (error: any) {
    window.$toast?.({ title: error.message || '工具描述生成失败', type: 'error' })
  } finally {
    inferringDescription.value = false
  }
}

async function inferOutputDescription() {
  if (!toolDraft.value?.id) return
  if (!testResult.value) {
    window.$toast?.({ title: '请先运行测试，再生成返回内容说明', type: 'warning' })
    return
  }
  inferringOutput.value = true
  try {
    const payload = currentToolTextPayload('output_description')
    if (!payload) return
    const result = await inferAIToolText(props.kbId, toolDraft.value.id, payload)
    if (!result.content) {
      window.$toast?.({ title: result.warning || '没有生成可用返回说明', type: 'warning' })
      return
    }
    toolDraft.value.output_description = result.content
    window.$toast?.({ title: '已生成返回内容说明', type: 'success' })
  } catch (error: any) {
    window.$toast?.({ title: error.message || '返回说明生成失败', type: 'error' })
  } finally {
    inferringOutput.value = false
  }
}

async function testCurrentTool() {
  if (!toolDraft.value?.id) return
  testing.value = true
  testResult.value = null
  const toolId = toolDraft.value.id
  const params = cleanParams(toolDraft.value.input_schema)
  const args = collectTestArguments(params)
  try {
    await persistSelected({ reloadAfter: false, toast: false })
    testResult.value = await testAITool(props.kbId, toolId, args)
    await nextTick()
  } catch (error: any) {
    window.$toast?.({ title: error.message || '测试运行失败', type: 'error' })
    testResult.value = { ok: false, error: error.message || String(error) }
  } finally {
    testing.value = false
  }
}

async function generateSummary() {
  const node = selectedNode.value
  if (!node || node.node_type !== 'folder') return
  summaryRunning.value = true
  nodeDraft.subtree_summary = ''
  try {
    await streamHarnessSse(
      `/kb/${props.kbId}/tool-tree/node/${node.id}/subtree-summary/stream`,
      {},
      {
        onChunk: (chunk) => { nodeDraft.subtree_summary += chunk },
        onError: (message) => { throw new Error(message || '摘要生成失败') },
      },
    )
    await reload()
    window.$toast?.({ title: '目录摘要已生成', type: 'success' })
  } catch (error: any) {
    window.$toast?.({ title: error.message || '目录摘要生成失败', type: 'error' })
  } finally {
    summaryRunning.value = false
  }
}
</script>

<style scoped lang="scss">
.kbt {
  height: 100%;
  min-height: 0;
  background: #f6f7f8;
  color: #171a1f;
  overflow: auto;
}

.kbt-tree-rail {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
}

.kbt-tree-actions {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(21, 25, 32, 0.08);

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #1b1f25;
    padding: 6px 8px;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    transition: background 0.14s ease, transform 0.14s ease;

    &:hover { background: #eaeaec; }
    &:active { transform: translateY(1px); }

    span {
      font-size: 15px;
      line-height: 1;
    }
  }
}

.kbt-tree-list {
  min-height: 0;
  overflow: auto;
  padding: 6px 4px;
}

.kbt-tree-empty {
  padding: 18px 12px;
  color: #8b939d;
  font-size: 12px;

  button {
    margin-top: 10px;
    border: 0;
    border-radius: 8px;
    background: #1d1f23;
    color: #fff;
    padding: 8px 10px;
    cursor: pointer;
  }
}

.kbt-empty {
  height: 100%;
  display: grid;
  place-content: center;
  text-align: center;
  color: #6f7782;

  h2 { margin: 0 0 8px; color: #181c22; }
  p { max-width: 430px; margin: 0; line-height: 1.7; }
}

.kbt-workbench {
  max-width: 1180px;
  margin: 0 auto;
  padding: 22px;
}

.kbt-header,
.kbt-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  p,
  h2,
  h3 { margin: 0; }

  p {
    margin-top: 5px;
    color: #7b838d;
    font-size: 12px;
  }
}

.kbt-header {
  margin-bottom: 16px;

  h2 { font-size: 24px; letter-spacing: 0; }
}

.kbt-header-actions {
  display: flex;
  gap: 8px;
}

.kbt-section-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.kbt-primary,
.kbt-secondary,
.kbt-danger {
  border: 1px solid rgba(21, 25, 32, 0.12);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease, background 0.15s ease;

  &:active:not(:disabled) { transform: translateY(1px); }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
}

.kbt-primary { background: #111827; color: #fff; }
.kbt-secondary { background: #fff; color: #1f2937; }
.kbt-danger { background: #fff1f2; color: #be123c; border-color: rgba(190, 18, 60, 0.18); }

.kbt-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  margin-bottom: 14px;

  &--tool {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 160px;
    align-items: stretch;

    @media (max-width: 980px) {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  label {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  span {
    color: #6b7280;
    font-size: 12px;
    font-weight: 900;
  }

  .kbt-form-wide {
    grid-column: 1 / -1;
  }

  .kbt-form-name {
    min-width: 0;
  }
}

.kbt-field-head {
  min-height: 26px;
  display: flex;
  flex-direction: row !important;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.kbt-mini-action {
  border: 1px solid rgba(21, 25, 32, 0.12);
  border-radius: 7px;
  background: #f8fafc;
  color: #334155;
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
  transition: background 0.14s ease, transform 0.14s ease, opacity 0.14s ease;

  &:hover:not(:disabled) {
    background: #eef2f7;
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
}

input,
textarea,
select {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(21, 25, 32, 0.12);
  border-radius: 9px;
  background: #fff;
  color: #15191f;
  padding: 10px 11px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: rgba(15, 118, 110, 0.55);
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.08);
  }
}

textarea {
  resize: vertical;
  line-height: 1.6;
}

.kbt-panel,
.kbt-code-panel {
  border: 1px solid rgba(21, 25, 32, 0.08);
  border-radius: 12px;
  background: #fff;
  padding: 14px;
  margin-bottom: 14px;
  box-shadow: 0 12px 28px rgba(17, 24, 39, 0.05);
}

.kbt-code-panel {
  padding: 0;
  overflow: hidden;
}

.kbt-summary {
  display: block;
  box-sizing: border-box;
  width: 100%;
  margin-top: 14px;
  min-height: 260px;
}

.kbt-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #334155;
  font-size: 12px;
  font-weight: 900;
}

.kbt-checkbox {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(21, 25, 32, 0.22);
  border-radius: 5px;
  background: #fff;
  color: #fff;
  cursor: pointer;
  outline: none;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

  &:hover {
    border-color: rgba(17, 24, 39, 0.45);
    background: #f8fafc;
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
  }

  &:active {
    transform: translateY(1px);
  }

  &[data-state='checked'] {
    border-color: #111827;
    background: #111827;
  }
}

.kbt-checkbox-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 950;
  line-height: 1;
}

.kbt-param-empty {
  margin-top: 12px;
  border: 1px dashed rgba(21, 25, 32, 0.14);
  border-radius: 10px;
  padding: 18px;
  color: #8b939d;
  font-size: 12px;
}

.kbt-param-row {
  display: grid;
  grid-template-columns: minmax(120px, 0.9fr) 120px minmax(120px, 0.8fr) minmax(220px, 1.6fr) auto;
  gap: 10px;
  align-items: end;
  margin-top: 12px;
  border: 1px solid rgba(21, 25, 32, 0.08);
  border-radius: 11px;
  background: #fafafa;
  padding: 12px;

  label {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  span {
    color: #6b7280;
    font-size: 12px;
    font-weight: 900;
  }

  @media (max-width: 1080px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);

    .kbt-param-desc,
    .kbt-param-side {
      grid-column: 1 / -1;
    }
  }
}

.kbt-param-check {
  display: inline-flex;
  align-items: center;
  flex-direction: row;
  gap: 5px;
  color: #334155;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  line-height: 1;

  input { width: auto; }
}

.kbt-param-row .kbt-param-check {
  min-width: auto;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
}

.kbt-param-side {
  min-width: 100px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.kbt-param-type-select {
  width: 100%;

  :deep(.app-select) {
    width: 100%;
    display: flex;
  }

  :deep(.app-select-trigger) {
    width: 100%;
    height: 39px;
  }
}

.kbt-param-delete {
  white-space: nowrap;
  padding: 9px 12px;
}

.kbt-test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin-top: 12px;

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  span {
    color: #6b7280;
    font-size: 12px;
    font-weight: 900;
  }
}

.kbt-test-result {
  margin: 14px 0 0;
  max-height: 260px;
  overflow: auto;
  border-radius: 10px;
  background: #0f172a;
  color: #d1fae5;
  padding: 14px;
  font-size: 12px;
  line-height: 1.6;

  &.is-error {
    color: #fecdd3;
  }
}
</style>
