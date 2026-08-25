import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const browser = read('src/views/electron_views/vibe/browser/index.vue')
const overview = read('src/views/electron_views/vibe/browser/components/OverviewPanel.vue')
const search = read('src/views/electron_views/vibe/browser/components/SearchPanel.vue')
const reader = read('src/views/electron_views/vibe/browser/components/SourceReader.vue')
const commits = read('src/views/electron_views/vibe/browser/components/CommitPanel.vue')
const commitDiff = read('src/views/electron_views/vibe/browser/components/CommitDiffDetail.vue')
const api = read('src/views/electron_views/vibe/api.ts')

// 总览只描述现行投影；来源账本保留为审计信息，不再把旧模块当成现状。
assert.match(overview, /现行文档/)
assert.match(overview, /getKnowledgeDocuments\(projectId/)
assert.match(overview, /source_kind\s*!==\s*'synthetic'/)
assert.doesNotMatch(overview, /模块分布|top_modules|open-module/)
assert.doesNotMatch(browser, /summary\.span_count|>跨度</)

// 空查询列出现行文档，非空查询检索正文；输入态与已提交查询必须分开。
assert.match(search, /const inputQuery = ref/)
assert.match(search, /const submittedQuery = ref/)
assert.match(search, /getKnowledgeDocuments\(projectId/)
assert.match(search, /searchKnowledge\(projectId/)
assert.match(search, /搜索暂时不可用/)
assert.match(browser, /initial-query="searchQuery"/)
assert.match(browser, /@query-change="updateSearchQuery"/)
assert.doesNotMatch(search, /class="clear"/)
assert.match(search, /firstMatchOffset\(item\)/)
assert.match(search, /item\.start_offset[\s\S]*relativeOffset/)
assert.match(search, /highlight\(snippet\(item\)\)/)
assert.match(search, /matchOffset - 100/)
assert.match(search, /::-webkit-search-cancel-button:hover/)
assert.match(search, /::-webkit-search-cancel-button[\s\S]*cursor: pointer/)
assert.match(browser, /:requested-query="searchQuery"/)
assert.match(reader, /jumpToSearchMatch\(offset, props\.requestedQuery\)/)
assert.match(reader, /document\.createRange\(\)/)
assert.match(reader, /target\.getBoundingClientRect\(\)/)
assert.match(reader, /source-search-target/)
assert.doesNotMatch(reader, /if \(props\.requestedOffset\)/)
assert.match(reader, /detailLoading\.value = false\s+await resetScroll\(\)/)

// 变更合同以逻辑文档为单位，逐行携带行号与 add/delete/context 语义。
assert.match(api, /kind:\s*'context'\s*\|\s*'add'\s*\|\s*'delete'/)
assert.match(api, /document_changes:\s*KnowledgeDocumentChange\[\]/)
assert.match(commits, /import CommitDiffDetail from '.\/CommitDiffDetail\.vue'/)
assert.match(commits, /<CommitDiffDetail/)
assert.match(commitDiff, /v-for="change in documentChanges"/)
assert.match(commitDiff, /linePrefix\(line\.kind\)/)
assert.match(commitDiff, /\.detail-pane\s*\{[^}]*height:\s*100%;[^}]*overflow-y:\s*auto;/)
assert.match(commitDiff, /v-if="detail\.tombstones\.length" class="tombstone-changes"/)
assert.match(commitDiff, /line\.old_line/)
assert.match(commitDiff, /line\.new_line/)
assert.match(commitDiff, /:aria-expanded="isExpanded\(change\.id\)"/)
assert.match(commitDiff, /\+\{\{ change\.additions \}\}/)
assert.match(commitDiff, /-\{\{ change\.deletions \}\}/)
assert.doesNotMatch(commitDiff, /class="file-index"/)
assert.match(commitDiff, /added: '录入'/)
assert.match(commitDiff, /modified: '修改'/)
assert.match(commitDiff, /deleted: '删除'/)
assert.match(commitDiff, /viewerIdPrefix/)
assert.match(commitDiff, /:aria-controls="diffDomId\(change\.id\)"/)

// 一次刷新会推进所有面板的 revision，页签具备完整键盘语义。
assert.match(browser, /browserRevision\.value \+= 1/)
assert.ok((browser.match(/:revision="browserRevision"/g) || []).length >= 3)
assert.match(browser, /role="tablist"/)
assert.match(browser, /role="tab"/)
assert.match(browser, /aria-selected/)

console.log('vibe source browser contract: PASS (current view + search + document diff)')
