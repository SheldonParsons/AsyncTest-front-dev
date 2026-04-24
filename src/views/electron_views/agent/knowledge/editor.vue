<template>
  <div class="kb-editor">
    <!-- Sidebar: nav + tree/list -->
    <aside class="kbe-sidebar">
      <!-- Project Switcher (with back button inline) -->
      <div class="kbe-project-switch">
        <button class="kbe-back-btn" @click="goBack" title="返回">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <CustomSelect
          v-model="currentProjectId"
          :options="projects.map((p: any) => ({ value: p.id, label: p.name }))"
          placeholder="选择项目"
          @change="onProjectChange"
          style="-webkit-app-region: no-drag; flex: 1; min-width: 0;"
        />
      </div>

      <!-- View switcher (segmented control) -->
      <div class="kbe-view-switch">
        <button
          v-for="v in views"
          :key="v.key"
          :class="['kbe-view-btn', { 'kbe-view-btn--active': currentView === v.key }]"
          @click="currentView = v.key"
        >
          {{ v.label }}
        </button>
      </div>

      <!-- Sidebar sub-header (context-specific) -->
      <div class="kbe-sidebar-subheader">
        <template v-if="currentView === 'raw'">
          <span class="kbe-sidebar-label">知识树</span>
          <button class="kbe-icon-btn" @click="addRootNode" title="新建节点">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </template>
        <template v-else-if="currentView === 'wiki'">
          <span class="kbe-sidebar-label">知识</span>
          <button class="kbe-icon-btn" @click="handleCompile" :disabled="compiling" title="编译">
            <svg v-if="!compiling" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
            </svg>
            <div v-else class="kbe-spinner kbe-spinner--sm" />
          </button>
        </template>
        <template v-else>
          <span class="kbe-sidebar-label">模板列表</span>
          <button class="kbe-icon-btn" @click="addTemplate" title="添加模板">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </template>
      </div>

      <!-- Tree-kind tabs (业务树 / 资产树), only visible in raw view -->
      <div v-if="currentView === 'raw'" class="kbe-tree-tabs">
        <button
          :class="['kbe-tree-tab', { 'kbe-tree-tab--active': currentTree === 'business' }]"
          @click="switchTree('business')"
        >
          业务树
          <span class="kbe-tree-tab-count">{{ treeCounts.business }}</span>
        </button>
        <button
          :class="['kbe-tree-tab', { 'kbe-tree-tab--active': currentTree === 'asset' }]"
          @click="switchTree('asset')"
        >
          资产树
          <span class="kbe-tree-tab-count">{{ treeCounts.asset }}</span>
        </button>
      </div>

      <!-- Sidebar body -->
      <div class="kbe-sidebar-body">
        <!-- Raw tree -->
        <template v-if="currentView === 'raw'">
          <div v-if="treeLoading" class="kbe-sidebar-loading"><div class="kbe-spinner" /></div>
          <div v-else-if="visibleTree.length === 0" class="kbe-sidebar-empty">
            <p>{{ currentTree === 'business' ? '业务树为空' : '资产树为空' }}</p>
            <button class="kbe-text-btn" @click="addRootNode">添加第一个节点</button>
          </div>
          <div v-else class="kbe-tree-list">
            <TreeNode
              v-for="node in visibleTree"
              :key="node.id"
              :node="node"
              :depth="0"
              :selected-id="selectedNodeId"
              @select="selectNode"
              @add-child="addChildNode"
              @rename="handleRenameNode"
              @delete="handleDeleteNode"
            />
          </div>
        </template>

        <!-- Wiki directory -->
        <template v-else-if="currentView === 'wiki'">
          <div v-if="wikiDir.length === 0" class="kbe-sidebar-empty">
            <p>尚未编译</p>
            <button class="kbe-text-btn" @click="handleCompile">编译 Wiki</button>
          </div>
          <div v-else class="kbe-item-list">
            <div
              v-for="item in wikiDir"
              :key="item.path"
              :class="['kbe-item', { 'kbe-item--active': selectedWikiPath === item.path }]"
              @click="selectWikiPage(item.path)"
            >
              <span class="kbe-item-text">{{ item.title || item.path }}</span>
            </div>
          </div>
        </template>

        <!-- Template list -->
        <template v-else>
          <div v-if="templates.length === 0" class="kbe-sidebar-empty">
            <p>暂无模板</p>
            <button class="kbe-text-btn" @click="addTemplate">创建第一个模板</button>
          </div>
          <div v-else class="kbe-item-list">
            <div
              v-for="tmpl in templates"
              :key="tmpl.id"
              :class="['kbe-item', { 'kbe-item--active': selectedTemplateId === tmpl.id }]"
              @click="selectTemplate(tmpl)"
            >
              <span class="kbe-item-text">{{ tmpl.name }}</span>
              <span class="kbe-item-badge">{{ tmpl.type }}</span>
            </div>
          </div>
        </template>
      </div>
    </aside>

    <!-- Main editing area -->
    <main class="kbe-main">
      <!-- Raw Data -->
      <template v-if="currentView === 'raw'">
        <div v-if="!selectedNode" class="kbe-main-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8"
            stroke-linecap="round" stroke-linejoin="round" class="kbe-main-empty-icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <p class="kbe-main-empty-text">选择左侧节点开始编辑</p>
        </div>
        <CanvasEditor
          v-else-if="selectedNode.type === 'page' || selectedNode.type === 'module' || selectedNode.type === 'directory' || selectedNode.type === 'shared'"
          ref="editorRef"
          :node="selectedNode"
          :kb-id="kbId"
          @save="onCanvasSave"
          @dirty-changed="editorDirty = $event"
          @summary-updated="loadTree"
          @refresh="loadTree"
        />
        <NavEditor
          v-else-if="selectedNode.type === 'nav'"
          ref="editorRef"
          :node="selectedNode"
          :kb-id="kbId"
          @saved="loadTree"
          @dirty-changed="editorDirty = $event"
        />
        <RuleEditor
          v-else-if="selectedNode.type === 'rule'"
          ref="editorRef"
          :node="selectedNode"
          :kb-id="kbId"
          @saved="loadTree"
          @dirty-changed="editorDirty = $event"
        />
        <div v-else class="kbe-main-empty">
          <p class="kbe-main-empty-text">未知节点类型: {{ selectedNode.type }}</p>
        </div>
      </template>

      <!-- Wiki -->
      <template v-else-if="currentView === 'wiki'">
        <div v-if="!selectedWikiContent" class="kbe-main-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8"
            stroke-linecap="round" stroke-linejoin="round" class="kbe-main-empty-icon">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <p class="kbe-main-empty-text">选择左侧页面查看内容</p>
        </div>
        <div v-else class="kbe-wiki-content">
          <pre class="kbe-wiki-pre">{{ selectedWikiContent }}</pre>
        </div>
      </template>

      <!-- Templates -->
      <template v-else>
        <div v-if="!selectedTemplate" class="kbe-main-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8"
            stroke-linecap="round" stroke-linejoin="round" class="kbe-main-empty-icon">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <p class="kbe-main-empty-text">选择左侧模板开始编辑</p>
        </div>
        <TemplateEditor v-else :template="selectedTemplate" :kb-id="kbId" @saved="onTemplateSaved" @deleted="onTemplateDeleted" @confirm-delete="onTemplateConfirmDelete" />
      </template>
    </main>

    <!-- Input Dialog (replaces prompt()) -->
    <Teleport to="body">
      <div v-if="inputDialog.visible" class="kbe-dialog-mask" @click.self="cancelInputDialog">
        <div class="kbe-dialog">
          <h2 class="kbe-dialog-title">{{ inputDialog.title }}</h2>
          <input
            ref="inputDialogRef"
            v-model="inputDialog.value"
            class="kbe-dialog-input"
            :placeholder="inputDialog.placeholder"
            @keydown.enter="confirmInputDialog"
            @keydown.esc="cancelInputDialog"
          />
          <div class="kbe-dialog-actions">
            <button class="kbe-dialog-cancel" @click="cancelInputDialog">取消</button>
            <button class="kbe-dialog-confirm" :disabled="!inputDialog.value.trim()" @click="confirmInputDialog">确定</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Dialog (replaces confirm()) -->
    <Teleport to="body">
      <div v-if="confirmDialog.visible" class="kbe-dialog-mask" @click.self="cancelConfirmDialog">
        <div class="kbe-dialog">
          <h2 class="kbe-dialog-title">{{ confirmDialog.title }}</h2>
          <p class="kbe-dialog-desc">{{ confirmDialog.message }}</p>
          <div class="kbe-dialog-actions">
            <button class="kbe-dialog-cancel" @click="cancelConfirmDialog">取消</button>
            <button class="kbe-dialog-confirm kbe-dialog-confirm--danger" @click="resolveConfirmDialog">删除</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Unsaved Changes Dialog (3-button) -->
    <Teleport to="body">
      <div v-if="unsavedDialog.visible" class="kbe-dialog-mask">
        <div class="kbe-dialog">
          <h2 class="kbe-dialog-title">有未保存的修改</h2>
          <p class="kbe-dialog-desc">当前知识有未保存的内容，是否在离开前保存？</p>
          <div class="kbe-dialog-actions kbe-dialog-actions--3">
            <button class="kbe-dialog-cancel" @click="resolveUnsavedDialog('cancel')">取消</button>
            <button class="kbe-dialog-cancel" @click="resolveUnsavedDialog('discard')">不保存</button>
            <button class="kbe-dialog-confirm" @click="resolveUnsavedDialog('save')">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- Create Node Wizard -->
    <CreateNodeWizard ref="wizardRef" />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  getKB, getKBByProject, getTree, createNode, updateNode, deleteNode as deleteNodeApi,
  compileWiki, getWikiDirectory, getWikiPage,
  listTemplates, createTemplate, deleteTemplate,
} from './api'
import type { KnowledgeBase, KBNode, WikiDirectoryItem, KBTemplate } from '@/types/knowledge'
import { ApiGetJoinProjects } from '@/api/project/index'
import TreeNode from './components/TreeNode.vue'
import CanvasEditor from './components/CanvasEditor.vue'
import NavEditor from './components/NavEditor.vue'
import RuleEditor from './components/RuleEditor.vue'
import TemplateEditor from './components/TemplateEditor.vue'
import CreateNodeWizard from './components/CreateNodeWizard.vue'

const router = useRouter()
const route = useRoute()
const kbId = computed(() => Number(route.params.kbId))
const electronAPI = (window as any).electronAPI

// ─── Editor dirty tracking (works for any node-type editor) ───
const editorRef = ref<{ save: () => Promise<void> } | null>(null)
const editorDirty = ref(false)

// ─── Create-node wizard ───
const wizardRef = ref<InstanceType<typeof CreateNodeWizard> | null>(null)

// ─── Tree filter (business / asset) ───
type TreeKind = 'business' | 'asset'
const currentTree = ref<TreeKind>('business')

// ─── Projects ───
const projects = ref<any[]>([])
const currentProjectId = ref<number | null>(null)

type ViewMode = 'raw' | 'wiki' | 'template'
const views: { key: ViewMode; label: string }[] = [
  { key: 'raw', label: '原始数据' },
  { key: 'wiki', label: 'Wiki' },
  { key: 'template', label: '模板/规范' },
]
const currentView = ref<ViewMode>('raw')

const kb = ref<KnowledgeBase | null>(null)

// Raw Data
const tree = ref<KBNode[]>([])
const treeLoading = ref(true)
const selectedNodeId = ref<string | null>(null)
const selectedNode = computed(() => {
  if (!selectedNodeId.value) return null
  return findNode(tree.value, selectedNodeId.value)
})

// Wiki
const wikiDir = ref<WikiDirectoryItem[]>([])
const selectedWikiPath = ref<string | null>(null)
const selectedWikiContent = ref<string | null>(null)
const compiling = ref(false)

// Templates
const templates = ref<KBTemplate[]>([])
const selectedTemplateId = ref<number | null>(null)
const selectedTemplate = computed(() => {
  if (!selectedTemplateId.value) return null
  return templates.value.find(t => t.id === selectedTemplateId.value) || null
})

// ─── Input Dialog (replaces prompt()) ───
const inputDialogRef = ref<HTMLInputElement | null>(null)
const inputDialog = reactive({
  visible: false,
  title: '',
  placeholder: '',
  value: '',
  resolve: null as ((val: string | null) => void) | null,
})

function showInputDialog(title: string, placeholder = '', initialValue = ''): Promise<string | null> {
  return new Promise((resolve) => {
    inputDialog.visible = true
    inputDialog.title = title
    inputDialog.placeholder = placeholder
    inputDialog.value = initialValue
    inputDialog.resolve = resolve
    nextTick(() => {
      if (inputDialogRef.value) {
        inputDialogRef.value.focus()
        inputDialogRef.value.select()
      }
    })
  })
}

function confirmInputDialog() {
  const val = inputDialog.value.trim()
  if (!val) return
  inputDialog.visible = false
  inputDialog.resolve?.(val)
  inputDialog.resolve = null
}

function cancelInputDialog() {
  inputDialog.visible = false
  inputDialog.resolve?.(null)
  inputDialog.resolve = null
}

// ─── Confirm Dialog (replaces confirm()) ───
const confirmDialog = reactive({
  visible: false,
  title: '',
  message: '',
  resolve: null as ((val: boolean) => void) | null,
})

function showConfirmDialog(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirmDialog.visible = true
    confirmDialog.title = title
    confirmDialog.message = message
    confirmDialog.resolve = resolve
  })
}

function resolveConfirmDialog() {
  confirmDialog.visible = false
  confirmDialog.resolve?.(true)
  confirmDialog.resolve = null
}

function cancelConfirmDialog() {
  confirmDialog.visible = false
  confirmDialog.resolve?.(false)
  confirmDialog.resolve = null
}

// ─── Unsaved Changes Dialog ───
const unsavedDialog = reactive({
  visible: false,
  resolve: null as ((val: 'save' | 'discard' | 'cancel') => void) | null,
})

function showUnsavedDialog(): Promise<'save' | 'discard' | 'cancel'> {
  return new Promise((resolve) => {
    unsavedDialog.visible = true
    unsavedDialog.resolve = resolve
  })
}

function resolveUnsavedDialog(val: 'save' | 'discard' | 'cancel') {
  unsavedDialog.visible = false
  unsavedDialog.resolve?.(val)
  unsavedDialog.resolve = null
}

async function checkUnsaved(): Promise<boolean> {
  if (!editorDirty.value) return true
  const result = await showUnsavedDialog()
  if (result === 'save') {
    await editorRef.value?.save()
    return true
  } else if (result === 'discard') {
    editorDirty.value = false
    return true
  }
  return false
}

onMounted(async () => {
  // Load projects for the switcher
  try {
    const res: any = await ApiGetJoinProjects({})
    projects.value = res.results || []
  } catch {
    projects.value = []
  }

  await loadKBData()
})

watch(kbId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    loadKBData()
  }
})

async function loadKBData() {
  selectedNodeId.value = null
  selectedWikiPath.value = null
  selectedWikiContent.value = null
  selectedTemplateId.value = null
  try {
    kb.value = await getKB(kbId.value)
    if (kb.value?.project_id) {
      currentProjectId.value = kb.value.project_id
    }
  } catch (e: any) {
    window.$toast({ title: e.message || '加载失败', type: 'error' })
  }
  loadTree()
  if (currentView.value === 'wiki') loadWikiDir()
  if (currentView.value === 'template') loadTemplates()
}

watch(currentView, (v) => {
  if (v === 'wiki') loadWikiDir()
  if (v === 'template') loadTemplates()
})

async function loadTree() {
  treeLoading.value = true
  try {
    tree.value = await getTree(kbId.value)
  } catch {
    tree.value = []
  } finally {
    treeLoading.value = false
  }
}

// ─── Tree filter (Phase 4.7 — business / asset) ───
function nodeMatchesTree(n: KBNode, kind: TreeKind): boolean {
  // Default missing/legacy nodes to business so existing data still shows up.
  return (n.tree || 'business') === kind
}
function filterTree(nodes: KBNode[], kind: TreeKind): KBNode[] {
  return nodes
    .filter(n => nodeMatchesTree(n, kind))
    .map(n => ({
      ...n,
      children: n.children ? filterTree(n.children, kind) : [],
    }))
}
function countTree(nodes: KBNode[], kind: TreeKind): number {
  let total = 0
  for (const n of nodes) {
    if (nodeMatchesTree(n, kind)) total += 1
    if (n.children?.length) total += countTree(n.children, kind)
  }
  return total
}
const visibleTree = computed(() => filterTree(tree.value, currentTree.value))
const treeCounts = computed(() => ({
  business: countTree(tree.value, 'business'),
  asset: countTree(tree.value, 'asset'),
}))
async function switchTree(kind: TreeKind) {
  if (kind === currentTree.value) return
  if (!(await checkUnsaved())) return
  currentTree.value = kind
  // If the currently selected node lives in the other tree, deselect it.
  if (selectedNode.value && (selectedNode.value.tree || 'business') !== kind) {
    selectedNodeId.value = null
  }
}

function findNode(nodes: KBNode[], id: string): KBNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children?.length) {
      const found = findNode(n.children, id)
      if (found) return found
    }
  }
  return null
}

async function selectNode(id: string) {
  if (!(await checkUnsaved())) return
  selectedNodeId.value = id
}

async function addRootNode() {
  if (!(await checkUnsaved())) return
  const result = await wizardRef.value?.open({
    parentTree: currentTree.value,
    defaultTree: currentTree.value,
  })
  if (!result) return
  try {
    await createNode(kbId.value, {
      name: result.name,
      type: result.type,
      subtype: result.subtype,
      tree: result.tree,
      expected_inbound: result.expected_inbound,
    })
    await loadTree()
    window.$toast({ title: '已添加', type: 'success' })
  } catch (e: any) {
    window.$toast({ title: e.message || '添加失败', type: 'error' })
  }
}

async function addChildNode(parentId: string) {
  if (!(await checkUnsaved())) return
  const parent = findNode(tree.value, parentId)
  const parentTree = (parent?.tree || currentTree.value) as TreeKind
  const result = await wizardRef.value?.open({
    parentName: parent?.name || '',
    parentTree,
    defaultTree: parentTree,
  })
  if (!result) return
  try {
    await createNode(kbId.value, {
      name: result.name,
      parent_id: parentId,
      type: result.type,
      subtype: result.subtype,
      tree: result.tree,
      expected_inbound: result.expected_inbound,
    })
    await loadTree()
    window.$toast({ title: '已添加', type: 'success' })
  } catch (e: any) {
    window.$toast({ title: e.message || '添加失败', type: 'error' })
  }
}

async function handleRenameNode(nodeId: string) {
  const node = findNode(tree.value, nodeId)
  if (!node) return
  const name = await showInputDialog('重命名知识', node.name, node.name)
  if (!name || name === node.name) return
  try {
    await updateNode(kbId.value, nodeId, { name })
    await loadTree()
    window.$toast({ title: '已重命名', type: 'success' })
  } catch (e: any) {
    window.$toast({ title: e.message || '重命名失败', type: 'error' })
  }
}

async function handleDeleteNode(nodeId: string) {
  const node = findNode(tree.value, nodeId)
  const ok = await showConfirmDialog('删除节点', `确定删除「${node?.name || '该节点'}」及其所有子节点？此操作不可恢复。`)
  if (!ok) return
  try {
    await deleteNodeApi(kbId.value, nodeId)
    if (selectedNodeId.value === nodeId) selectedNodeId.value = null
    await loadTree()
    window.$toast({ title: '已删除', type: 'success' })
  } catch (e: any) {
    window.$toast({ title: e.message || '删除失败', type: 'error' })
  }
}

function onNodeSaved() { loadTree() }

async function onCanvasSave(contentData: any) {
  if (!selectedNode.value) return
  try {
    await updateNode(kbId.value, selectedNode.value.id, { content: contentData })
    await loadTree()
  } catch (e: any) {
    window.$toast({ title: e.message || '保存失败', type: 'error' })
  }
}

async function loadWikiDir() {
  try { wikiDir.value = await getWikiDirectory(kbId.value) } catch { wikiDir.value = [] }
}

async function handleCompile() {
  compiling.value = true
  try {
    const result = await compileWiki(kbId.value)
    window.$toast({ title: `已编译 ${result.compiled} 个页面`, type: 'success' })
    await loadWikiDir()
  } catch (e: any) {
    window.$toast({ title: e.message || '编译失败', type: 'error' })
  } finally {
    compiling.value = false
  }
}

async function selectWikiPage(path: string) {
  selectedWikiPath.value = path
  try {
    const page = await getWikiPage(kbId.value, path)
    selectedWikiContent.value = page.content
  } catch {
    selectedWikiContent.value = '加载失败'
  }
}

async function loadTemplates() {
  try { templates.value = await listTemplates(kbId.value) } catch { templates.value = [] }
}

function selectTemplate(tmpl: KBTemplate) { selectedTemplateId.value = tmpl.id }

async function addTemplate() {
  const name = await showInputDialog('添加模板', '输入模板名称')
  if (!name) return
  try {
    const tmpl = await createTemplate(kbId.value, { name })
    await loadTemplates()
    selectedTemplateId.value = tmpl.id
    window.$toast({ title: '已创建', type: 'success' })
  } catch (e: any) {
    window.$toast({ title: e.message || '创建失败', type: 'error' })
  }
}

function onTemplateSaved() { loadTemplates() }
function onTemplateDeleted() { selectedTemplateId.value = null; loadTemplates() }

async function onTemplateConfirmDelete(tmpl: KBTemplate) {
  const ok = await showConfirmDialog('删除模板', `确定删除模板「${tmpl.name}」？此操作不可恢复。`)
  if (!ok) return
  try {
    await deleteTemplate(kbId.value, tmpl.id)
    onTemplateDeleted()
    window.$toast({ title: '已删除', type: 'success' })
  } catch (e: any) {
    window.$toast({ title: e.message || '删除失败', type: 'error' })
  }
}

async function onProjectChange(newId: any) {
  if (!newId) return
  const prevId = kb.value?.project_id
  if (!(await checkUnsaved())) {
    // Revert CustomSelect value back to previous project
    if (prevId) currentProjectId.value = prevId
    return
  }
  try {
    const project = projects.value.find((p: any) => p.id === newId)
    const newKb = await getKBByProject(newId, project?.name)
    try { await electronAPI?.harness?.storeSet('kb_project_id', newId) } catch {}
    router.replace({ name: 'agentKnowledgeEditor', params: { kbId: String(newKb.id) } })
  } catch (e: any) {
    window.$toast({ title: e.message || '切换失败', type: 'error' })
  }
}

async function goBack() {
  if (!(await checkUnsaved())) return
  router.push({ name: 'agentDashboard' })
}
</script>

<style lang="scss" scoped>
$bg-page: #ffffff;
$bg-sidebar: #f5f5f7;
$bg-hover: #eaeaec;
$bg-active: #e3e3e6;
$text-primary: #1d1d1f;
$text-secondary: rgba(0, 0, 0, 0.55);
$text-tertiary: rgba(0, 0, 0, 0.35);
$border-color: rgba(0, 0, 0, 0.08);
$accent: #1d1d1f;

.kb-editor {
  height: 100vh;
  display: flex;
  background: $bg-page;
  color: $text-primary;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  overflow: hidden;
}

// ─── Sidebar ───

.kbe-sidebar {
  width: 300px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  background: $bg-sidebar;
  border-right: 1px solid $border-color;
  position: relative;
  overflow: hidden;

  // Subtle flowing gradient overlay
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background: linear-gradient(
      135deg,
      rgba(120, 160, 255, 0.07) 0%,
      rgba(180, 130, 255, 0.05) 30%,
      rgba(100, 200, 220, 0.06) 60%,
      rgba(120, 160, 255, 0.07) 100%
    );
    background-size: 300% 300%;
    animation: kb-sidebar-flow 12s ease infinite;
  }

  // All sidebar content must be above the overlay
  > * {
    position: relative;
    z-index: 1;
  }
}

@keyframes kb-sidebar-flow {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

// (kbe-sidebar-top removed — back button now lives in kbe-project-switch)

.kbe-back-btn {
  -webkit-app-region: no-drag;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: $text-secondary;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: $bg-hover;
    color: $text-primary;
  }
}

// Project switcher (now includes back button inline)
.kbe-project-switch {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 12px 10px;
  -webkit-app-region: drag;
}

// View switcher
.kbe-view-switch {
  display: flex;
  margin: 0 12px 10px;
  padding: 3px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.06);
}

// Tree-kind tabs (业务 / 资产)
.kbe-tree-tabs {
  display: flex;
  margin: 0 12px 8px;
  gap: 4px;
}
.kbe-tree-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 5px 0;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  font-size: 11.5px;
  font-weight: 500;
  color: $text-secondary;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: rgba(0, 0, 0, 0.04); color: $text-primary; }

  &--active {
    background: #fff;
    color: $text-primary;
    border-color: $border-color;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }
}
.kbe-tree-tab-count {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.06);
  color: $text-secondary;
  font-weight: 600;
  min-width: 16px;
  text-align: center;
}

.kbe-view-btn {
  flex: 1;
  padding: 5px 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: $text-secondary;
  cursor: pointer;
  transition: all 0.18s;
  letter-spacing: -0.12px;
  text-align: center;

  &:hover:not(.kbe-view-btn--active) {
    color: $text-primary;
  }

  &--active {
    background: $bg-page;
    color: $text-primary;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}

// Sidebar sub-header
.kbe-sidebar-subheader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
}

.kbe-sidebar-label {
  font-size: 11px;
  font-weight: 600;
  color: $text-tertiary;
  letter-spacing: 0.2px;
  text-transform: uppercase;
}

.kbe-icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover:not(:disabled) {
    background: $bg-hover;
    color: $text-primary;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// Sidebar body
.kbe-sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 6px 8px;
}

.kbe-sidebar-loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.kbe-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid $border-color;
  border-top-color: $text-primary;
  border-radius: 50%;
  animation: kbe-spin 0.6s linear infinite;

  &--sm {
    width: 14px;
    height: 14px;
  }
}

@keyframes kbe-spin {
  to { transform: rotate(360deg); }
}

.kbe-sidebar-empty {
  text-align: center;
  padding: 40px 16px;

  p {
    margin: 0 0 10px;
    font-size: 13px;
    color: $text-tertiary;
  }
}

.kbe-text-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: $bg-page;
  font-size: 12px;
  font-weight: 500;
  color: $accent;
  cursor: pointer;
  transition: background 0.15s;
  letter-spacing: -0.12px;

  &:hover {
    background: $bg-hover;
  }
}

// Item list (wiki, templates)
.kbe-item-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.kbe-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;

  &:hover {
    background: $bg-hover;
  }

  &--active {
    background: $bg-active;
  }
}

.kbe-item-text {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: $text-primary;
  letter-spacing: -0.12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kbe-item-badge {
  font-size: 11px;
  color: $text-tertiary;
  flex-shrink: 0;
  margin-left: 8px;
}

// ─── Main ───

.kbe-main {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
}

.kbe-main-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
}

.kbe-main-empty-icon {
  color: rgba(0, 0, 0, 0.1);
}

.kbe-main-empty-text {
  margin: 0;
  font-size: 14px;
  color: $text-tertiary;
  letter-spacing: -0.224px;
}

// Wiki content
.kbe-wiki-content {
  padding: 28px 36px;
}

.kbe-wiki-pre {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: $text-primary;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  letter-spacing: -0.224px;
}

// ─── Dialogs ───

.kbe-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: saturate(180%) blur(20px);
}

.kbe-dialog {
  width: 380px;
  padding: 24px;
  border-radius: 12px;
  background: $bg-page;
  box-shadow: rgba(0, 0, 0, 0.22) 3px 5px 30px 0px;
}

.kbe-dialog-title {
  margin: 0 0 16px;
  font-size: 17px;
  font-weight: 600;
  color: $text-primary;
  letter-spacing: -0.374px;
}

.kbe-dialog-desc {
  margin: 0 0 20px;
  font-size: 14px;
  color: $text-secondary;
  letter-spacing: -0.224px;
  line-height: 1.43;
}

.kbe-dialog-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  font-size: 14px;
  color: $text-primary;
  background: $bg-sidebar;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  letter-spacing: -0.224px;
  transition: border-color 0.15s;
  margin-bottom: 20px;

  &:focus {
    border-color: $accent;
    background: $bg-page;
  }

  &::placeholder {
    color: $text-tertiary;
  }
}

.kbe-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.kbe-dialog-actions--3 {
  justify-content: flex-end;
}

.kbe-dialog-cancel {
  padding: 8px 15px;
  border: none;
  border-radius: 8px;
  background: $bg-sidebar;
  color: $text-primary;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: $bg-hover;
  }
}

.kbe-dialog-confirm {
  padding: 8px 15px;
  border: none;
  border-radius: 8px;
  background: $accent;
  color: #ffffff;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover:not(:disabled) {
    opacity: 0.88;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &--danger {
    background: #ff3b30;
  }
}
</style>
