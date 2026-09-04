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
assert.match(overview, /知识项/)
assert.match(overview, /getKnowledgeDocuments\(projectId/)
assert.match(overview, /source_kind\s*!==\s*'synthetic'/)
assert.doesNotMatch(overview, /模块分布|top_modules|open-module/)
assert.doesNotMatch(browser, /summary\.span_count|>跨度</)

// 空查询列出知识项，非空查询检索正文；输入态与已提交查询必须分开。
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

// 所有 hunk 共用最宽内容列；横向滚动时短行、空行和 hunk 头背景不能止于视口。
assert.match(commitDiff, /\.diff-scroll\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(max-content,\s*1fr\);[^}]*overflow:\s*auto;/)
assert.match(commitDiff, /<code>\{\{ line\.text \|\| ' ' \}\}<\/code>/)
assert.match(commitDiff, /\.diff-line\.is-add\s*\{\s*background:\s*#edf8ef;/)
assert.match(commitDiff, /\.diff-line\.is-delete\s*\{\s*background:\s*#fff1f1;/)
assert.match(commitDiff, /\.line-number\s*\{[^}]*position:\s*sticky;[^}]*left:\s*0;/)

// 固定的是分块标题文字，不是全宽背景；长标题以滚动视口为上限，不能被右边界推走。
assert.match(commitDiff, /<span class="hunk-header-label" :title="hunk.header">\{\{ hunk.header \}\}<\/span>/)
assert.match(commitDiff, /\.diff-scroll\s*\{[^}]*container-type:\s*inline-size;/)
const hunkLabelStyle = commitDiff.match(/\.hunk-header-label\s*\{([^}]*)\}/)?.[1] || ''
assert.match(hunkLabelStyle, /display:\s*inline-block;[^}]*position:\s*sticky;[^}]*left:\s*12px;/)
assert.match(hunkLabelStyle, /max-width:\s*calc\(100cqi - 24px\);[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;/)
assert.doesNotMatch(hunkLabelStyle, /\btop\s*:/, '不要把水平固定误改成纵向吸顶')
assert.match(commitDiff, /\.hunk-header\s*\{[^}]*padding:\s*3px 12px;[^}]*background:\s*#f5f5f5;/)
assert.match(commitDiff, /\.file-header\s*\{[^}]*min-height:\s*34px;[^}]*padding:\s*5px 10px;[^}]*background:\s*#fff;/)
const fileHeaderTemplate = commitDiff.match(/<button\s+class="file-header"[\s\S]*?<\/button>/)?.[0] || ''
assert.match(fileHeaderTemplate, /:title="[^"\n]*generationLabel\(change\)/, '单行 header 仍保留版本提示')
assert.doesNotMatch(fileHeaderTemplate, /<small>/, '文件 header 不应再有第二行')

// 一次刷新会推进所有面板的 revision，页签具备完整键盘语义。
assert.match(browser, /browserRevision\.value \+= 1/)
assert.ok((browser.match(/:revision="browserRevision"/g) || []).length >= 3)
assert.match(browser, /role="tablist"/)
assert.match(browser, /role="tab"/)
assert.match(browser, /aria-selected/)

console.log('vibe source browser contract: PASS (current view + search + document diff)')
