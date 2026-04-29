<template>
  <div class="canvas-editor" ref="containerRef">
    <!-- Toolbar -->
    <div class="ce-toolbar">
      <div class="ce-toolbar-left">
        <span v-if="isDirty" class="ce-dirty-dot" title="有未保存的修改" />
        <span class="ce-node-name">{{ node.name }}</span>
        <span class="ce-node-type">{{ typeLabels[node.type] || node.type }}</span>
      </div>
      <div class="ce-toolbar-center">
        <button
          :class="['ce-mode-btn', { 'ce-mode-btn--active': displayMode === 'full' }]"
          @click="displayMode = 'full'"
          title="完整内容"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
          </svg>
        </button>
        <button
          :class="['ce-mode-btn', { 'ce-mode-btn--active': displayMode === 'compact' }]"
          @click="displayMode = 'compact'"
          title="摘要模式"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
        </button>
      </div>
      <div class="ce-toolbar-right">
        <button class="ce-tool-btn" @click="onRefresh" :disabled="saving" title="刷新">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
        <button v-if="displayMode === 'full'" class="ce-tool-btn" @click="addBlock" title="添加块">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button v-if="displayMode === 'full'" class="ce-tool-btn ce-tool-btn--save" @click="save" :disabled="saving" :title="saving ? saveStatusText : '保存'">
          {{ saving ? (saveStatusText || '…') : '保存' }}
        </button>
      </div>
    </div>

    <!-- Canvas (full mode only) -->
    <div
      v-if="displayMode === 'full'"
      class="ce-canvas-wrap"
      ref="canvasWrapRef"
      @pointerdown="onCanvasPointerDown"
    >
      <div
        class="ce-canvas"
        :style="{ height: canvasHeight + 'px' }"
      >
        <!-- Snap guide lines -->
        <div v-if="snapGuideX !== null" class="ce-snap-guide ce-snap-guide--v" :style="{ left: snapGuideX + 'px' }" />
        <div v-if="snapGuideY !== null" class="ce-snap-guide ce-snap-guide--h" :style="{ top: snapGuideY + 'px' }" />

        <!-- Blocks -->
        <div
          v-for="block in content.blocks"
          :key="block.id"
          :class="[
            'ce-block',
            `ce-block--${block.type}`,
            { 'ce-block--selected': selectedBlockId === block.id },
            { 'ce-block--editing': editingBlockId === block.id },
            { 'ce-block--transitioning': transitioningBlockId === block.id },
            { 'ce-block--incomplete': !(block.content || '').trim() || !(block.summary || '').trim() },
          ]"
          :style="{
            left: block.layout.x + 'px',
            top: block.layout.y + 'px',
            width: block.layout.w + 'px',
            height: block.layout.h + 'px',
            '--block-accent': blockTypeAccents[block.type] || '#1d1d1f',
          }"
          @pointerdown.capture="selectBlock(block.id)"
        >
          <!-- Block header — drag handle area -->
          <div class="ce-block-header" @pointerdown.stop="onHeaderPointerDown($event, block)" @dblclick.stop="onHeaderDblClick(block)">
            <span class="ce-block-name">
              {{ block.name || '未命名' }}
              <span v-if="staleBlockIds.has(block.id)" class="ce-stale-dot" title="内容已修改，块摘要陈旧" />
              <span
                v-else-if="!(block.content || '').trim() || !(block.summary || '').trim()"
                class="ce-block-incomplete-tag"
                :title="!(block.content || '').trim() ? '尚未填写知识描述' : '尚未生成摘要（保存时自动生成）'"
              >{{ !(block.content || '').trim() ? '缺内容' : '缺摘要' }}</span>
            </span>
            <div class="ce-block-actions">
              <button
                v-show="!isDragging || isResizing"
                class="ce-block-edit-btn"
                @click.stop="openPanel(block.id)"
                @pointerdown.stop
                title="编辑详情"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="ce-block-delete" @click.stop="deleteBlock(block.id)" title="删除">×</button>
            </div>
          </div>

          <!-- Block body: Full mode -->
          <template v-if="displayMode === 'full'">
            <div v-if="editingBlockId === block.id && editField === 'content'" class="ce-block-body">
              <textarea
                class="ce-block-textarea"
                v-model="block.content"
                placeholder="输入需求描述…"
                @blur="stopEditingField"
                @pointerdown.stop
                ref="contentTextareaRef"
                autofocus
              />
            </div>
            <div v-else class="ce-block-body ce-block-body--preview" @pointerdown.stop @click.stop="openMdDialog(block.id)">
              <p v-if="block.content" class="ce-block-content-text">{{ block.content }}</p>
              <p v-else class="ce-block-placeholder">点击查看内容…</p>
            </div>
          </template>

          <!-- Block body: Compact mode -->
          <template v-else>
            <div class="ce-block-body ce-block-body--compact" @pointerdown.stop @click.stop="openMdDialog(block.id)">
              <p class="ce-block-summary">{{ block.summary || block.content?.slice(0, 60) || '—' }}</p>
            </div>
          </template>

          <!-- Resize handles -->
          <div class="ce-resize ce-resize--top" @pointerdown.stop="onResizePointerDown($event, block, 'top')" />
          <div class="ce-resize ce-resize--left" @pointerdown.stop="onResizePointerDown($event, block, 'left')" />
          <div class="ce-resize ce-resize--bottom" @pointerdown.stop="onResizePointerDown($event, block, 'bottom')" />
          <div class="ce-resize ce-resize--br" @pointerdown.stop="onResizePointerDown($event, block, 'br')" />
          <div class="ce-resize ce-resize--right" @pointerdown.stop="onResizePointerDown($event, block, 'right')" />
        </div>
      </div>
    </div>

    <!-- Summary document (compact mode) -->
    <div v-else class="ce-summary-doc-wrap">
      <article class="ce-summary-doc">
        <header class="ce-summary-doc-header">
          <h1 class="ce-summary-doc-title">{{ node.name }}</h1>
          <span class="ce-summary-doc-type">{{ typeLabels[node.type] || node.type }}</span>
        </header>

        <section class="ce-summary-doc-section">
          <h2 class="ce-summary-doc-h2">节点摘要</h2>
          <div v-if="hasNodeSummary" class="ce-md-content" v-html="nodeSummaryDocHtml"></div>
          <div v-else class="ce-summary-doc-warn">
            <div class="ce-summary-doc-warn-text">
              <span class="ce-summary-doc-warn-icon">!</span>
              <span>节点尚未生成摘要，建议先生成节点摘要以获得完整概览</span>
            </div>
            <button class="ce-summary-doc-warn-btn" @click="openNodeSummaryDialog">生成节点摘要</button>
          </div>
        </section>

        <section v-if="summaryDocBlocks.length" class="ce-summary-doc-section">
          <h2 class="ce-summary-doc-h2">块内容（{{ summaryDocBlocks.length }}）</h2>
          <article
            v-for="block in summaryDocBlocks"
            :key="block.id"
            class="ce-summary-block"
          >
            <header class="ce-summary-block-header">
              <span class="ce-summary-block-accent" :style="{ background: blockTypeAccents[block.type] || '#1d1d1f' }"></span>
              <h3 class="ce-summary-block-name">{{ block.name || '未命名' }}</h3>
              <span class="ce-summary-block-type" :style="{ color: blockTypeAccents[block.type] || '#1d1d1f' }">
                {{ blockTypeLabels[block.type] || block.type }}
              </span>
            </header>
            <div v-if="block.summary && block.summary.trim()" class="ce-summary-block-summary">
              <div class="ce-summary-block-label">摘要</div>
              <div class="ce-md-content" v-html="renderMd(block.summary)"></div>
            </div>
            <div v-else class="ce-summary-block-summary ce-summary-block-summary--empty">
              <div class="ce-summary-block-label">摘要</div>
              <p class="ce-summary-doc-empty">尚未生成块摘要</p>
            </div>
            <div v-if="block.content && block.content.trim()" class="ce-summary-block-content">
              <div class="ce-summary-block-label">内容</div>
              <div class="ce-md-content" v-html="renderMd(block.content)"></div>
            </div>
            <div v-else class="ce-summary-block-content ce-summary-block-content--empty">
              <div class="ce-summary-block-label">内容</div>
              <p class="ce-summary-doc-empty">无内容</p>
            </div>
          </article>
        </section>
        <p v-else class="ce-summary-doc-empty ce-summary-doc-empty--center">该节点暂无块</p>
      </article>
    </div>

    <!-- Edit Dialog (centered modal) -->
    <Teleport to="body">
      <Transition name="ce-dialog-fade">
        <div v-if="panelBlockId && panelBlock" class="ce-edit-overlay">
          <div class="ce-edit-dialog" role="dialog" aria-modal="true">
            <!-- Dialog header -->
            <div class="ce-edit-dialog-header">
              <div class="ce-edit-dialog-title-row">
                <span class="ce-edit-dialog-accent" :style="{ background: blockTypeAccents[panelDraft.type] || '#1d1d1f' }"></span>
                <h2 class="ce-edit-dialog-title">编辑 {{ panelDraft.name || '未命名' }}</h2>
              </div>
              <button class="ce-edit-dialog-close" @click="panelBlockId = null" aria-label="关闭">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <!-- Dialog body -->
            <div class="ce-edit-dialog-body">
              <!-- Name + Type row -->
              <div class="ce-edit-row">
                <div class="ce-edit-field ce-edit-field--grow">
                  <label class="ce-edit-label">名称</label>
                  <input class="ce-edit-input" v-model="panelDraft.name" placeholder="未命名" />
                </div>
                <div class="ce-edit-field ce-edit-field--type">
                  <label class="ce-edit-label">类型</label>
                  <CustomSelect
                    v-model="panelDraft.type"
                    :options="blockTypes.map(bt => ({ value: bt.value, label: bt.label, color: blockTypeAccents[bt.value] }))"
                  />
                </div>
              </div>

              <!-- Block summary section -->
              <div class="ce-edit-field">
                <div class="ce-edit-summary-wrap">
                  <div class="ce-edit-split-label-row">
                    <span>摘要</span>
                    <div class="ce-ai-toolbar">
                      <button
                        class="ce-ai-btn ce-ai-btn--text"
                        @click="summaryViewMode = summaryViewMode === 'edit' ? 'preview' : 'edit'"
                        :title="summaryViewMode === 'edit' ? '切换到预览' : '切换到编辑'"
                      >{{ summaryViewMode === 'edit' ? '预览' : '编辑' }}</button>
                    </div>
                  </div>
                  <div class="ce-edit-summary-area">
                    <div v-show="summaryViewMode === 'edit'" ref="summaryMonacoContainer" class="ce-edit-summary-monaco"></div>
                    <div v-show="summaryViewMode === 'preview'" class="ce-edit-summary-preview">
                      <div v-if="summaryMdHtml" class="ce-md-content" v-html="summaryMdHtml"></div>
                      <div v-else class="ce-edit-preview-empty">暂无摘要…</div>
                    </div>
                  </div>
                  <p v-if="!panelDraft.summary?.trim()" class="ce-edit-summary-hint">
                    摘要为空时，保存后将自动生成摘要
                  </p>
                </div>
              </div>

              <!-- Knowledge description: split Monaco editor / preview -->
              <div class="ce-edit-field ce-edit-field--expand">
                <label class="ce-edit-label">知识描述</label>
                <div class="ce-edit-split">
                  <div class="ce-edit-split-pane ce-edit-split-pane--editor">
                    <div class="ce-edit-split-label-row">
                      <span>编辑 · Markdown</span>
                      <div class="ce-ai-toolbar">
                        <CustomSelect
                          v-model="selectedContentTemplateId"
                          class="ce-template-select"
                          :options="contentTemplateOptions"
                          placeholder="Prompt 模板"
                          size="sm"
                        />
                        <button
                          class="ce-ai-btn ce-ai-btn--text"
                          :disabled="!selectedContentTemplateId"
                          @click="applyContentTemplate"
                          title="引用 Prompt 模板"
                        >引用</button>
                        <button
                          class="ce-ai-btn ce-ai-btn--text"
                          @click="openListFormDialog"
                          title="使用表单生成知识描述"
                        >表单生成</button>
                        <button
                          v-if="polishOriginal !== null && polishState !== 'streaming'"
                          class="ce-ai-btn ce-ai-btn--text"
                          @click="showCompareDialog = true"
                          title="对比原文与 AI 优化版本"
                        >对比</button>
                        <button
                          v-if="polishOriginal !== null && polishState !== 'streaming'"
                          class="ce-ai-btn ce-ai-btn--text"
                          @click="restoreOriginal"
                          title="还原为原始内容"
                        >还原</button>
                        <button
                          class="ce-ai-btn ce-ai-btn--icon"
                          :class="{ 'is-streaming': polishState === 'streaming' }"
                          @click="polishWithAI"
                          title="AI 优化 Markdown"
                        >
                          <img src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/ai_full_light.svg" class="ce-ai-icon" alt="AI" />
                        </button>
                      </div>
                    </div>
                    <div ref="mdMonacoContainer" class="ce-edit-monaco"></div>
                  </div>
                  <div class="ce-edit-split-divider"></div>
                  <div class="ce-edit-split-pane ce-edit-split-pane--preview">
                    <div class="ce-edit-split-label">预览</div>
                    <div class="ce-edit-md-preview" @click="onMdLinkClick">
                      <div v-if="panelMdHtml" class="ce-md-content" v-html="panelMdHtml"></div>
                      <div v-else class="ce-edit-preview-empty">在左侧输入内容…</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- References removed — use block content to describe relationships -->

              <!-- Images -->
              <div class="ce-edit-section">
                <div class="ce-edit-section-header">
                  <span class="ce-edit-label">参考图片</span>
                  <button class="ce-edit-add-btn" @click="addDraftImage">+ 添加</button>
                </div>
                <div v-if="panelDraft.images.length === 0" class="ce-edit-empty">暂无图片</div>
                <div v-for="(img, i) in panelDraft.images" :key="img.id" class="ce-edit-img-card">
                  <img v-if="img.url" :src="img.url" class="ce-edit-img-thumb" />
                  <div class="ce-edit-img-info">
                    <span class="ce-edit-img-name">{{ img.name || '未命名' }}</span>
                    <button class="ce-edit-ref-delete" @click="removeDraftImage(i)">×</button>
                  </div>
                </div>
              </div>
            </div>
            <!-- Dialog footer -->
            <div class="ce-edit-dialog-footer">
              <button class="ce-edit-footer-close" @click="panelBlockId = null">关闭</button>
              <button class="ce-edit-footer-save" @click="savePanelDraft">保存</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    <!-- List form prompt dialog -->
    <Teleport to="body">
      <Transition name="ce-dialog-fade">
        <div v-if="showListFormDialog" class="ce-form-overlay">
          <div class="ce-form-dialog" role="dialog" aria-modal="true">
		            <header class="ce-form-header">
		              <div class="ce-form-header-title">
	                <p>表单型 Prompt 模板</p>
	                <h2>{{ formKind === 'search' ? '搜索知识描述' : '列表知识描述' }}</h2>
	              </div>
	              <div class="ce-form-kind-tabs">
	                <button :class="{ 'is-active': formKind === 'list' }" @click="switchFormKind('list')">列表</button>
	                <button :class="{ 'is-active': formKind === 'search' }" @click="switchFormKind('search')">搜索</button>
	              </div>
            </header>
            <div class="ce-form-body">
              <Transition name="ce-form-pane-swap" mode="out-in">
	              <section v-if="formKind === 'list'" key="list-form" class="ce-form-pane">
                <div class="ce-form-grid">
	                  <label class="ce-form-grid-wide ce-purpose-field">
	                    <span>总体功能描述</span>
	                    <ExpandableTextarea v-model="listFormDraft.purpose" placeholder="总结这个列表展示的内容，它是如何被统计展现出来的" />
	                  </label>
	                </div>

                <section class="ce-field-section">
	                  <header>
	                    <div>
	                      <span>列表字段</span>
	                      <p>同名列会被视为同一列下的多段内容，按钮、跳转、权限等直接写进字段描述。</p>
	                    </div>
	                    <button @click="addListField">+ 添加字段</button>
	                  </header>
                  <div class="ce-field-list ce-list-field-list">
                    <div v-if="!listFormDraft.fields.length" class="ce-field-empty">暂无字段，点击“添加字段”开始录入。</div>
	                    <article v-for="(field, fieldIndex) in listFormDraft.fields" :key="fieldIndex" class="ce-field-card" :data-field-index="fieldIndex">
	                      <div class="ce-field-card-head">
	                        <strong>{{ field.name || '未命名字段' }}</strong>
	                        <button type="button" class="ce-danger-text-btn" @click="removeListField(fieldIndex)">删除</button>
	                      </div>
                      <div class="ce-field-grid">
	                        <label>
	                          <span>列名称</span>
	                          <div class="ce-column-name-row">
	                            <input
                                v-model="field.name"
                                :disabled="isFixedListColumn(field)"
                                placeholder="例如：用户名 / 操作"
                              />
	                            <CustomSelect
	                              v-if="columnNameOptions.length"
	                              class="ce-column-name-select"
	                              :model-value="field.name"
	                              :options="columnNameOptions"
	                              placeholder="已有列"
	                              size="sm"
	                              @change="selectExistingColumnName(field, $event)"
	                            />
	                          </div>
	                        </label>
	                        <label>
	                          <span>列类型</span>
                          <CustomSelect
                            v-model="field.column_type"
                            :options="columnTypeOptions"
	                            placeholder="普通字段"
                            @change="onListColumnTypeChange(field, $event)"
	                          />
	                        </label>
	                        <label v-if="field.column_type === 'custom'">
	                          <span>自定义列类型</span>
	                          <input v-model="field.custom_column_type" placeholder="例如：组合信息 / 业务标签 / 复合操作" />
	                        </label>
	                        <label class="ce-field-wide">
	                          <div class="ce-desc-label-row">
                              <span>字段描述</span>
                              <button type="button" class="ce-control-insert-btn" @click.prevent="openControlDescriptionDialog(fieldIndex)">
                                + 内置控件
                              </button>
                            </div>
	                          <ExpandableTextarea v-model="field.description" placeholder="用自然语言描述这个列里展示什么。如果它是按钮或链接，也在这里说明点击后的页面、面板、接口、权限、确认、反馈等业务规则。" />
	                        </label>
	                      </div>
	                    </article>
	                  </div>
                </section>

                <section class="ce-optional-section">
	                  <header>
		                    <div>
		                      <span>可选说明</span>
		                      <p>按需补充分页、排序、空状态、权限等规则。</p>
		                    </div>
		                    <div>
		                      <button v-if="!optionalSections.header_description" @click="addOptionalSection('header_description')">+ 表头区域功能</button>
		                      <button v-if="!optionalSections.default_sort" @click="addOptionalSection('default_sort')">+ 默认排序</button>
		                      <button v-if="!optionalSections.empty_state" @click="addOptionalSection('empty_state')">+ 空数据说明</button>
	                      <button v-if="!optionalSections.permission" @click="addOptionalSection('permission')">+ 权限说明</button>
	                      <button v-if="!optionalSections.pagination_detail" @click="addOptionalSection('pagination_detail')">+ 分页说明</button>
	                    </div>
		                  </header>
		                  <div class="ce-optional-grid ce-list-optional-list">
		                    <div v-if="!hasListOptionalSections" class="ce-optional-empty">暂无可选说明，点击上方按钮按需补充规则。</div>
			                    <div v-if="optionalSections.header_description" class="ce-optional-item" data-optional-key="header_description">
		                      <div class="ce-optional-label">
		                        <span>表头区域功能</span>
			                        <button type="button" class="ce-optional-delete" @click.stop.prevent="removeOptionalSection('header_description')" title="删除表头区域功能">
		                          删除
		                        </button>
		                      </div>
		                      <ExpandableTextarea v-model="listFormDraft.header_description" placeholder="顶部除字段外的其他功能" />
			                    </div>
			                    <div v-if="optionalSections.default_sort" class="ce-optional-item" data-optional-key="default_sort">
		                      <div class="ce-optional-label">
		                        <span>默认排序</span>
			                        <button type="button" class="ce-optional-delete" @click.stop.prevent="removeOptionalSection('default_sort')" title="删除默认排序">
		                          删除
		                        </button>
		                      </div>
		                      <ExpandableTextarea v-model="listFormDraft.default_sort" placeholder="例如：创建时间倒序，置顶数据优先展示" />
			                    </div>
			                    <div v-if="optionalSections.empty_state" class="ce-optional-item" data-optional-key="empty_state">
		                      <div class="ce-optional-label">
		                        <span>空数据说明</span>
			                        <button type="button" class="ce-optional-delete" @click.stop.prevent="removeOptionalSection('empty_state')" title="删除空数据说明">
		                          删除
		                        </button>
		                      </div>
		                      <ExpandableTextarea v-model="listFormDraft.empty_state" placeholder="例如：无数据时展示暂无用户，并提供创建入口" />
			                    </div>
			                    <div v-if="optionalSections.permission" class="ce-optional-item" data-optional-key="permission">
		                      <div class="ce-optional-label">
		                        <span>权限说明</span>
			                        <button type="button" class="ce-optional-delete" @click.stop.prevent="removeOptionalSection('permission')" title="删除权限说明">
		                          删除
		                        </button>
		                      </div>
		                      <ExpandableTextarea v-model="listFormDraft.permission" placeholder="例如：拥有用户查看权限可见，操作按钮受编辑权限控制" />
			                    </div>
			                    <div v-if="optionalSections.pagination_detail" class="ce-optional-item" data-optional-key="pagination_detail">
		                      <div class="ce-optional-label">
		                        <span>分页功能说明</span>
			                        <button type="button" class="ce-optional-delete" @click.stop.prevent="removeOptionalSection('pagination_detail')" title="删除分页功能说明">
		                          删除
		                        </button>
		                      </div>
		                      <ExpandableTextarea v-model="listFormDraft.pagination_detail" placeholder="例如：默认每页 20 条，支持切换每页条数，翻页保留查询条件" />
			                    </div>
	                  </div>
                </section>

                <label class="ce-form-extra">
                  <span>补充说明</span>
                  <ExpandableTextarea v-model="listFormDraft.extra" placeholder="补充其他不能表格化表达的信息" />
                </label>
              </section>
	              <section v-else key="search-form" class="ce-form-pane">
	                <div class="ce-form-grid">
	                  <label class="ce-form-grid-wide ce-purpose-field">
	                    <span>总体功能描述</span>
	                    <ExpandableTextarea v-model="searchFormDraft.purpose" placeholder="描述这个搜索用于筛选什么数据，以及筛选条件如何影响下方内容" />
	                  </label>
	                </div>

	                <section class="ce-field-section">
	                  <header>
	                    <div>
	                      <span>搜索条件</span>
	                      <p>控件类型只作为辅助标记，复杂校验、默认值、数据来源、联动关系都写进条件描述。</p>
	                    </div>
	                    <button @click="addSearchField">+ 添加条件</button>
	                  </header>
	                  <div class="ce-field-list ce-search-field-list">
	                    <div v-if="!searchFormDraft.fields.length" class="ce-field-empty">暂无搜索条件，点击“添加条件”开始录入。</div>
	                    <article v-for="(field, fieldIndex) in searchFormDraft.fields" :key="fieldIndex" class="ce-field-card" :data-field-index="fieldIndex">
	                      <div class="ce-field-card-head">
	                        <strong>{{ field.name || '未命名条件' }}</strong>
	                        <button type="button" class="ce-danger-text-btn" @click="removeSearchField(fieldIndex)">删除</button>
	                      </div>
	                      <div class="ce-field-grid">
	                        <label>
	                          <span>条件名称</span>
	                          <input v-model="field.name" placeholder="例如：账号名称 / 状态 / 创建时间" />
	                        </label>
	                        <label>
	                          <span>控件类型</span>
	                          <CustomSelect
	                            v-model="field.control_type"
	                            :options="searchControlTypeOptions"
	                            placeholder="字符串输入"
	                          />
	                        </label>
	                        <label v-if="field.control_type === 'custom'">
	                          <span>自定义控件类型</span>
	                          <input v-model="field.custom_control_type" placeholder="例如：组织选择器 / 级联选择 / 组合条件" />
	                        </label>
	                        <label class="ce-field-wide">
	                          <span>条件描述</span>
	                          <ExpandableTextarea v-model="field.description" placeholder="用自然语言描述这个条件怎么填写、默认值、校验、联动、模糊/精确匹配、数据来源等规则。" />
	                        </label>
	                      </div>
	                    </article>
	                  </div>
	                </section>

	                <section class="ce-optional-section">
	                  <header>
	                    <div>
	                      <span>可选动作</span>
	                      <p>按需补充查询、重置等动作规则。</p>
	                    </div>
	                    <div>
	                      <button v-if="!searchOptionalSections.query_action" @click="addSearchOptionalSection('query_action')">+ 查询类动作</button>
	                      <button v-if="!searchOptionalSections.reset_action" @click="addSearchOptionalSection('reset_action')">+ 重置类动作</button>
	                    </div>
	                  </header>
	                  <div class="ce-optional-grid ce-search-optional-list">
	                    <div v-if="!hasSearchOptionalSections" class="ce-optional-empty">暂无可选动作，点击上方按钮按需补充动作规则。</div>
		                    <div v-if="searchOptionalSections.query_action" class="ce-optional-item" data-optional-key="query_action">
	                      <div class="ce-optional-label">
	                        <span>查询类动作</span>
		                        <button type="button" class="ce-optional-delete" @click.stop.prevent="removeSearchOptionalSection('query_action')" title="删除查询类动作">
	                          删除
	                        </button>
	                      </div>
		                      <div class="ce-action-input-group">
		                        <span>动作名称</span>
		                        <input v-model="searchFormDraft.query_action_name" placeholder="例如：查询 / 搜索 / 筛选" />
		                      </div>
		                      <div class="ce-action-input-group">
		                        <span>动作描述</span>
		                        <ExpandableTextarea v-model="searchFormDraft.query_action_description" placeholder="描述点击后如何按当前条件刷新列表、校验条件、保留分页等规则" />
		                      </div>
		                    </div>
		                    <div v-if="searchOptionalSections.reset_action" class="ce-optional-item" data-optional-key="reset_action">
	                      <div class="ce-optional-label">
	                        <span>重置类动作</span>
		                        <button type="button" class="ce-optional-delete" @click.stop.prevent="removeSearchOptionalSection('reset_action')" title="删除重置类动作">
	                          删除
	                        </button>
	                      </div>
		                      <div class="ce-action-input-group">
		                        <span>动作名称</span>
		                        <input v-model="searchFormDraft.reset_action_name" placeholder="例如：重置 / 清空 / 重置条件" />
		                      </div>
		                      <div class="ce-action-input-group">
		                        <span>动作描述</span>
		                        <ExpandableTextarea v-model="searchFormDraft.reset_action_description" placeholder="描述点击后清空哪些条件、是否恢复默认值、是否立即刷新结果等规则" />
		                      </div>
		                    </div>
	                  </div>
	                </section>

	                <label class="ce-form-extra">
	                  <span>补充说明</span>
	                  <ExpandableTextarea v-model="searchFormDraft.extra" placeholder="补充其他不能结构化表达的信息" />
	                </label>
	              </section>
              </Transition>
	              <aside class="ce-form-preview">
                <Transition name="ce-form-preview-swap" mode="out-in">
	                <div v-if="formKind === 'search'" key="search-preview" class="ce-search-visual">
	                  <div class="ce-list-visual-title">
	                    <strong>{{ panelDraft.name || '搜索预览' }}</strong>
	                    <span>搜索</span>
	                  </div>
	                  <div v-if="searchFormDraft.fields.length" class="ce-preview-chip-list">
	                    <button v-for="(field, idx) in searchFormDraft.fields" :key="idx" type="button" class="ce-preview-chip" @click="scrollToFieldCard('.ce-search-field-list', Number(idx))">
	                      {{ field.name || '未命名条件' }}
	                    </button>
	                  </div>
	                  <p v-else class="ce-list-visual-empty">添加搜索条件后可查看搜索形态。</p>
	                  <div v-if="searchOptionalSections.query_action || searchOptionalSections.reset_action" class="ce-search-visual-actions">
	                    <button v-if="searchOptionalSections.query_action">{{ searchFormDraft.query_action_name || '查询' }}</button>
	                    <button v-if="searchOptionalSections.reset_action" class="is-secondary">{{ searchFormDraft.reset_action_name || '重置' }}</button>
	                  </div>
	                </div>
	                <div v-else key="list-preview" class="ce-list-visual">
	                  <div class="ce-list-visual-title">
	                    <strong>{{ panelDraft.name || '列表预览' }}</strong>
	                    <span>列表</span>
	                  </div>
	                  <div v-if="listFormDraft.fields.length" class="ce-preview-chip-list">
	                    <button v-for="(field, idx) in listFormDraft.fields" :key="idx" type="button" class="ce-preview-chip" @click="scrollToFieldCard('.ce-list-field-list', Number(idx))">
	                      {{ listFieldPreviewLabel(field) }}
	                    </button>
	                  </div>
		                  <p v-else class="ce-list-visual-empty">添加字段后可查看列表形态。</p>
		                </div>
                </Transition>
		                <div class="ce-form-preview-header">
		                  <span>知识描述预览</span>
		                  <button @click="renderPromptForm" :disabled="formRendering">
		                    {{ formRendering ? '生成中…' : '生成' }}
		                  </button>
                </div>
                <pre>{{ listFormPreview || '点击“生成”查看知识描述预览' }}</pre>
              </aside>
            </div>
	            <footer class="ce-form-footer">
	              <button class="ce-edit-footer-close" @click="closePromptFormDialog">取消</button>
	              <button class="ce-edit-footer-save" @click="applyPromptFormToDraft">生成到知识描述</button>
	            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>
    <ControlDescriptionDialog
      v-model="showControlDescriptionDialog"
      @insert="insertControlDescription"
    />
    <!-- Markdown preview dialog -->
    <Teleport to="body">
      <Transition name="ce-dialog-fade">
        <div v-if="mdDialogBlock" class="ce-md-overlay" @click.self="closeMdDialog" @keydown.esc="closeMdDialog">
          <div class="ce-md-dialog" role="dialog" aria-modal="true">
            <div class="ce-md-dialog-header">
              <div class="ce-md-dialog-title-row">
                <span class="ce-md-dialog-accent" :style="{ background: blockTypeAccents[mdDialogBlock.type] || '#1d1d1f' }"></span>
                <h2 class="ce-md-dialog-title">{{ mdDialogBlock.name || '未命名' }}</h2>
                <span class="ce-md-dialog-type">{{ blockTypeLabels[mdDialogBlock.type] || mdDialogBlock.type }}</span>
              </div>
              <button class="ce-md-dialog-close" @click="closeMdDialog" aria-label="关闭">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <div class="ce-md-dialog-body" @click="onMdLinkClick">
              <template v-if="mdDialogBlock?.summary">
                <div class="ce-md-summary-block">
                  <span class="ce-md-summary-label">摘要</span>
                  <div class="ce-md-content" v-html="mdDialogSummaryHtml"></div>
                </div>
                <div class="ce-md-divider"></div>
              </template>
              <div v-if="mdDialogHtml" class="ce-md-content" v-html="mdDialogHtml"></div>
              <div v-else class="ce-md-empty">暂无内容</div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    <!-- AI Compare dialog -->
    <Teleport to="body">
      <Transition name="ce-dialog-fade">
        <div v-if="showCompareDialog" class="ce-compare-overlay" @click.self="showCompareDialog = false" @keydown.esc="showCompareDialog = false">
          <div class="ce-compare-dialog" role="dialog" aria-modal="true">
            <div class="ce-compare-header">
              <h2 class="ce-compare-title">对比：原始内容 vs AI 优化</h2>
              <button class="ce-md-dialog-close" @click="showCompareDialog = false" aria-label="关闭">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <div class="ce-compare-body">
              <div class="ce-compare-pane">
                <div class="ce-compare-pane-label">原始内容</div>
                <div class="ce-compare-pane-content ce-md-content" v-html="compareOriginalHtml"></div>
              </div>
              <div class="ce-compare-divider"></div>
              <div class="ce-compare-pane">
                <div class="ce-compare-pane-label">AI 优化</div>
                <div class="ce-compare-pane-content ce-md-content" v-html="compareAiHtml"></div>
              </div>
            </div>
            <div class="ce-compare-footer">
              <button class="ce-edit-footer-close" @click="showCompareDialog = false">关闭</button>
              <button class="ce-edit-footer-close" @click="restoreOriginal(); showCompareDialog = false">还原原始内容</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    <!-- Node summary dialog -->
    <Teleport to="body">
      <Transition name="ce-dialog-fade">
        <div
          v-if="showNodeSummaryDialog"
          class="ce-md-dialog-overlay"
          @click.self="showNodeSummaryDialog = false"
          @keydown.esc="showNodeSummaryDialog = false"
        >
          <div class="ce-md-dialog" role="dialog" aria-modal="true" style="max-width:760px;">
            <div class="ce-md-dialog-header">
              <h2 class="ce-md-dialog-title">
                节点摘要 · {{ node.name }}
                <span v-if="hasNodeSummary && nodeStale" class="ce-stale-badge">陈旧</span>
                <span v-else-if="!hasNodeSummary" class="ce-stale-badge ce-stale-badge--empty">未生成</span>
              </h2>
              <div style="display:flex;gap:6px;align-items:center;">
                <button class="ce-mode-btn" :class="{ 'ce-mode-btn--active': nodeSummaryViewMode === 'edit' }" @click="nodeSummaryViewMode = 'edit'">编辑</button>
                <button class="ce-mode-btn" :class="{ 'ce-mode-btn--active': nodeSummaryViewMode === 'preview' }" @click="nodeSummaryViewMode = 'preview'">预览</button>
                <button class="ce-md-dialog-close" @click="showNodeSummaryDialog = false" aria-label="关闭">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="ce-md-dialog-body" style="padding:0;">
              <textarea
                v-if="nodeSummaryViewMode === 'edit'"
                class="ce-block-textarea"
                style="width:100%; min-height:320px; padding:16px; border:none; outline:none; resize:vertical; font-family:inherit; font-size:13px; line-height:1.6;"
                v-model="nodeSummaryDraft"
                :readonly="nodeSummaryState === 'streaming'"
                placeholder="点击下方“生成摘要”由 AI 自动生成；或手工输入。"
              />
              <div v-else class="ce-md-content" style="padding:16px;" v-html="nodeSummaryHtml"></div>
            </div>
            <div class="ce-compare-footer">
              <button
                class="ce-edit-footer-close"
                @click="generateNodeSummary"
                :disabled="nodeSummaryState === 'streaming'"
              >
                {{ nodeSummaryState === 'streaming' ? '生成中…' : (hasNodeSummary ? '重新生成' : '生成摘要') }}
              </button>
              <button class="ce-edit-footer-close" @click="showNodeSummaryDialog = false">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { marked } from 'marked'
import { streamHarnessSse } from '@/api/harness'
import type { KBNode, KBPromptFormSource, KBTemplate } from '@/types/knowledge'
import ControlDescriptionDialog from '@/components/common/general/ControlDescriptionDialog.vue'
import {
  generateBlockSummaryHttp,
  getBlockFormSource,
  listTemplates,
  renderTemplate,
  saveBlockFormSource,
} from '../api'
import {
  type KBBlock,
  type KBBlockType,
  type KBBlockImage,
  type KBNodeContentV1,
  SCHEMA_VERSION,
  createEmptyContent,
  createBlock,
  migrateLegacyContent,
} from '../schema'
import ExpandableTextarea from './ExpandableTextarea.vue'

const props = defineProps<{
  node: KBNode
  kbId: number
}>()

const emit = defineEmits<{
  (e: 'save', content: KBNodeContentV1): void
  (e: 'dirty-changed', dirty: boolean): void
  (e: 'summary-updated'): void
  (e: 'refresh'): void
}>()

// ─── Constants ───

const SNAP_THRESHOLD = 8
const SNAP_GAP = 4
const GRID_SIZE = 20
const MIN_W = 120
const MIN_H = 80
const CANVAS_PADDING = 200
const CANVAS_INSET = GRID_SIZE  // one grid cell margin on left/top/right

function snapToGrid(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE
}

const typeLabels: Record<string, string> = {
  directory: '知识', page: '页面', component: '组件', standalone: '独立', module: '模块', shared: '共享资产',
}

const blockTypes: { value: KBBlockType; label: string }[] = [
  { value: 'region', label: '区域' },
  { value: 'button', label: '按钮' },
  { value: 'field', label: '字段' },
  { value: 'form', label: '表单' },
  { value: 'list', label: '列表' },
  { value: 'text', label: '文本' },
  { value: 'custom', label: '自定义' },
]

const blockTypeLabels: Record<string, string> = {
  region: '区域', button: '按钮', field: '字段', form: '表单',
  list: '列表', text: '文本', custom: '自定义',
}

const blockTypeAccents: Record<string, string> = {
  region:  '#0071e3',
  button:  '#bf5af2',
  field:   '#34c759',
  form:    '#ff9f0a',
  list:    '#5ac8fa',
  text:    '#8e8e93',
  custom:  '#ff453a',
}

// ─── State ───

const containerRef = ref<HTMLElement | null>(null)
const canvasWrapRef = ref<HTMLElement | null>(null)
const contentTextareaRef = ref<HTMLTextAreaElement | null>(null)
const mdMonacoContainer = ref<HTMLElement | null>(null)

let mdMonacoInstance: any = null
let mdMonacoModel: any = null
let mdMonacoSyncing = false

const content = reactive<KBNodeContentV1>(createEmptyContent())
const displayMode = ref<'full' | 'compact'>('full')

const selectedBlockId = ref<string | null>(null)
const editingBlockId = ref<string | null>(null)
const editField = ref<'name' | 'content' | null>(null)
const panelBlockId = ref<string | null>(null)
const mdDialogBlockId = ref<string | null>(null)

// Draft state for the edit dialog (decoupled from the actual block)
const panelDraft = reactive<{
  name: string; type: KBBlockType; content: string
  images: KBBlockImage[]; summary: string
}>({ name: '', type: 'region', content: '', images: [], summary: '' })

// AI polish state
const polishState = ref<'idle' | 'streaming' | 'done'>('idle')
const polishOriginal = ref<string | null>(null)
const showCompareDialog = ref(false)
const promptTemplates = ref<KBTemplate[]>([])
const selectedContentTemplateId = ref('')
const formSources = reactive<Record<string, KBPromptFormSource | null>>({})
const dirtyFormSourceBlockIds = ref<Set<string>>(new Set())
const showListFormDialog = ref(false)
const showControlDescriptionDialog = ref(false)
const controlDescriptionTargetFieldIndex = ref<number | null>(null)
const formKind = ref<'list' | 'search'>('list')
const formRendering = ref(false)
const listFormPreview = ref('')
const formPreviewByKind = reactive<Record<'list' | 'search', string>>({
  list: '',
  search: '',
})

const listFormDraft = reactive<any>({
  kind: 'list',
  purpose: '',
  header_description: '',
  pagination_detail: '',
  default_sort: '',
  empty_state: '',
  permission: '',
  fields: [],
  extra: '',
})

const optionalSections = reactive({
  header_description: false,
  default_sort: false,
  empty_state: false,
  permission: false,
  pagination_detail: false,
})

const searchFormDraft = reactive<any>({
  kind: 'search',
  purpose: '',
  fields: [],
  query_action_name: '',
  query_action_description: '',
  reset_action_name: '',
  reset_action_description: '',
  extra: '',
})

const searchOptionalSections = reactive({
  query_action: false,
  reset_action: false,
})

// Summary section state
const summaryViewMode = ref<'edit' | 'preview'>('edit')
const summaryState = ref<'idle' | 'streaming'>('idle')
const summaryMonacoContainer = ref<HTMLElement | null>(null)
let summaryMonacoInstance: any = null
let summaryMonacoModel: any = null
let summaryMonacoSyncing = false

// ─── Node summary state ───
const showNodeSummaryDialog = ref(false)
const nodeSummaryDraft = ref('')
const nodeSummaryState = ref<'idle' | 'streaming'>('idle')
const nodeSummaryViewMode = ref<'edit' | 'preview'>('edit')

const nodeSummaryHtml = computed(() => marked.parse(nodeSummaryDraft.value || '') as string)

// ─── Staleness detection ───
// Block stale = sha256(block.content) !== block.summary_content_hash (when summary exists)
const staleBlockIds = ref<Set<string>>(new Set())

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text || '')
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

let staleRecomputeToken = 0
async function recomputeBlockStale() {
  const token = ++staleRecomputeToken
  const next = new Set<string>()
  for (const b of content.blocks) {
    if (!b.summary || !b.summary_content_hash) continue
    const h = await sha256Hex(b.content || '')
    if (h !== b.summary_content_hash) next.add(b.id)
  }
  if (token === staleRecomputeToken) staleBlockIds.value = next
}

watch(
  () => content.blocks.map(b => `${b.id}:${(b.content || '').length}:${b.summary_content_hash || ''}:${b.summary || ''}`).join('|'),
  () => recomputeBlockStale(),
  { immediate: true },
)

// Node stale = max(child blocks.summary_updated_at) > node.summary_updated_at
const nodeStale = computed(() => {
  const updates = content.blocks
    .map(b => b.summary_updated_at)
    .filter(Boolean) as string[]
  if (!updates.length) return false
  const maxBlock = updates.sort().slice(-1)[0]
  const nodeAt = props.node?.summary_updated_at
  if (!nodeAt) return true
  return maxBlock > nodeAt
})

const hasNodeSummary = computed(() => !!(props.node?.summary && props.node.summary.trim()))

const summaryMdHtml = computed(() => marked.parse(panelDraft.summary || '') as string)

const nodeSummaryDocHtml = computed(() => marked.parse(props.node?.summary || '') as string)

const summaryDocBlocks = computed(() => {
  return [...content.blocks].sort((a, b) => {
    const ay = a.layout?.y ?? 0
    const by = b.layout?.y ?? 0
    if (ay !== by) return ay - by
    const ax = a.layout?.x ?? 0
    const bx = b.layout?.x ?? 0
    return ax - bx
  })
})

function renderMd(src: string): string {
  return marked.parse(src || '') as string
}

const compareOriginalHtml = computed(() =>
  polishOriginal.value ? marked.parse(polishOriginal.value) as string : ''
)
const compareAiHtml = computed(() =>
  polishState.value !== 'idle' ? marked.parse(panelDraft.content || '') as string : ''
)

const isDragging = ref(false)
const isResizing = ref(false)
const saving = ref(false)
const saveStatusText = ref('')
const isDirty = ref(false)
const transitioningBlockId = ref<string | null>(null)
const preExpandLayouts = new Map<string, { x: number; w: number }>()

// Snap guide lines (visible during drag)
const snapGuideX = ref<number | null>(null)
const snapGuideY = ref<number | null>(null)

const canvasHeight = computed(() => {
  if (!content.blocks.length) return 600
  return content.blocks.reduce((m, b) => Math.max(m, b.layout.y + b.layout.h), 0) + CANVAS_PADDING
})

const panelBlock = computed(() => {
  if (!panelBlockId.value) return null
  return content.blocks.find(b => b.id === panelBlockId.value) || null
})

const panelMdHtml = computed(() => {
  return marked.parse(panelDraft.content || '') as string
})

const contentTemplates = computed(() =>
  promptTemplates.value.filter(t => t.status !== 'disabled' && t.kind === 'text')
)

const contentTemplateOptions = computed(() =>
  contentTemplates.value.map(t => ({
    value: String(t.id),
    label: `${t.name} · ${templateTargetLabel(t.target)}`,
  }))
)

const columnTypeOptions = [
  { value: '', label: '普通字段' },
  { value: 'operation', label: '操作字段' },
  { value: 'selection', label: '勾选' },
  { value: 'sequence', label: '序号' },
  { value: 'custom', label: '自定义' },
]

const SELECTION_COLUMN_DESCRIPTION = '该列用于批量选择列表数据。默认不勾选，表头位置显示全选/取消全选复选框控件，用于选择或取消选择当前页可操作的数据行；行内显示复选框，用于选择当前行数据。已禁用或无权限操作的数据不可被勾选。切换分页、筛选条件或刷新列表时，清空所有复选框的勾选，还原默认。'
const SEQUENCE_COLUMN_DESCRIPTION = '该列展示当前页内的数据序号，从当前页第一条数据开始按展示顺序递增。切换分页、重新查询或刷新列表后，序号按当前页结果重新计算。'

const searchControlTypeOptions = [
  { value: '', label: '字符串输入' },
  { value: 'select', label: '下拉选择' },
  { value: 'date', label: '日期/时间' },
  { value: 'range', label: '范围输入' },
  { value: 'tree', label: '树/组织选择' },
  { value: 'custom', label: '自定义' },
]

const columnNameOptions = computed(() => {
  const names = new Set<string>()
  for (const field of listFormDraft.fields || []) {
    const name = String(field?.name || '').trim()
    if (name) names.add(name)
  }
  return Array.from(names).map(name => ({ value: name, label: name }))
})

const hasListOptionalSections = computed(() =>
  optionalSections.header_description ||
  optionalSections.default_sort ||
  optionalSections.empty_state ||
  optionalSections.permission ||
  optionalSections.pagination_detail
)

const hasSearchOptionalSections = computed(() =>
  searchOptionalSections.query_action ||
  searchOptionalSections.reset_action
)

function searchControlTypeLabel(field: any) {
  if (field?.control_type === 'custom') return String(field?.custom_control_type || '').trim() || '自定义'
  return searchControlTypeOptions.find(opt => opt.value === field?.control_type)?.label || '字符串输入'
}

function isFixedListColumn(field: any) {
  return field?.column_type === 'selection' || field?.column_type === 'sequence'
}

function listFieldPreviewLabel(field: any) {
  if (field?.column_type === 'selection') return '勾选列：全选/行勾选'
  if (field?.column_type === 'sequence') return '序号列：当前页序号'
  return field?.name || '未命名字段'
}

function templateTargetLabel(target?: string) {
  return ({
    block_knowledge_description: '块知识描述',
    navigation_description: '导航说明',
    node_description: '节点说明',
  } as Record<string, string>)[target || ''] || '通用'
}

const mdDialogBlock = computed(() => {
  if (!mdDialogBlockId.value) return null
  return content.blocks.find(b => b.id === mdDialogBlockId.value) || null
})

const mdDialogHtml = computed(() => {
  const c = mdDialogBlock.value?.content
  if (!c) return ''
  return marked.parse(c) as string
})

const mdDialogSummaryHtml = computed(() => {
  const s = mdDialogBlock.value?.summary
  if (!s) return ''
  return marked.parse(s) as string
})

function onMdLinkClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const anchor = target.closest('a') as HTMLAnchorElement | null
  if (!anchor) return
  const href = anchor.getAttribute('href')
  if (!href) return
  e.preventDefault()
  e.stopPropagation()
  window.electronAPI.openExternal(href)
}

// ─── Sync from prop ───

watch(() => props.node, (n) => {
  const parsed = n?.content ? migrateLegacyContent(n.content) : createEmptyContent()
  content.schema_version = parsed.schema_version ?? SCHEMA_VERSION
  content.blocks = Array.isArray(parsed.blocks) ? parsed.blocks : []
  content.canvas = parsed.canvas || { zoom: 1, panX: 0, panY: 0 }
  selectedBlockId.value = null
  editingBlockId.value = null
  panelBlockId.value = null
  isDirty.value = false
  nodeSummaryDraft.value = n?.summary || ''
  nodeSummaryState.value = 'idle'
  showNodeSummaryDialog.value = false
}, { immediate: true })

// ─── Save ───

function markDirty() {
  if (!isDirty.value) {
    isDirty.value = true
    emit('dirty-changed', true)
  }
}

async function save() {
  saving.value = true
  content.canvas = { zoom: 1, panX: 0, panY: 0 }

  // 1) Identify blocks that need summary auto-generation:
  //    content non-empty AND (summary empty OR content hash ≠ stored hash)
  const needSummary: { id: string; contentHash: string }[] = []
  for (const b of content.blocks) {
    const c = (b.content || '').trim()
    if (!c) continue
    const h = await sha256Hex(b.content || '')
    const hasSummary = !!(b.summary && b.summary.trim())
    if (!hasSummary || h !== (b.summary_content_hash || '')) {
      needSummary.push({ id: b.id, contentHash: h })
    }
  }

  // 2) Persist canvas content first (so new blocks exist server-side with their IDs).
  saveStatusText.value = '保存中…'
  emit('save', JSON.parse(JSON.stringify(content)))
  await new Promise(r => setTimeout(r, 200))
  await persistDirtyFormSources()

  // 3) For each block needing summary, call HTTP endpoint serially.
  if (needSummary.length && props.node?.id && props.kbId) {
    for (let i = 0; i < needSummary.length; i++) {
      const { id, contentHash } = needSummary[i]
      saveStatusText.value = `生成摘要 ${i + 1}/${needSummary.length}`
      try {
        const res = await generateBlockSummaryHttp(props.kbId, props.node.id, id)
        const block = content.blocks.find(b => b.id === id)
        if (block) {
          block.summary = res.summary
          block.summary_content_hash = contentHash
          block.summary_updated_at = new Date().toISOString()
        }
      } catch (e: any) {
        console.error('[block summary auto-gen failed]', id, e)
      }
    }
    // Refresh tree so parents see fresh block summaries.
    emit('refresh')
  }

  saveStatusText.value = ''
  saving.value = false
  isDirty.value = false
  emit('dirty-changed', false)
  window.$toast({ title: '保存成功', type: 'success' })
}

function onRefresh() {
  if (isDirty.value) {
    const ok = confirm('当前有未保存的修改，刷新将丢失这些修改。是否继续？')
    if (!ok) return
  }
  emit('refresh')
}

defineExpose({ save })

// ─── Markdown dialog ───

function openMdDialog(id: string) {
  mdDialogBlockId.value = id
}

function closeMdDialog() {
  mdDialogBlockId.value = null
}

// ─── AI Markdown Polish ───

async function polishWithAI() {
  if (polishState.value === 'streaming') {
    window.$toast({ title: 'AI 正在生成中，请稍候', type: 'info' })
    return
  }
  const textContent = panelDraft.content.trim()
  if (!textContent) {
    window.$toast({ title: '请先编写内容', type: 'info' })
    return
  }
  // Save original before overwriting
  polishOriginal.value = panelDraft.content
  polishState.value = 'streaming'
  // Disable Monaco during streaming
  if (mdMonacoInstance) mdMonacoInstance.updateOptions({ readOnly: true })
  // Clear current content
  panelDraft.content = ''

  try {
    await streamHarnessSse('/kb/polish-markdown', { content: textContent }, {
      onChunk: (content) => {
        panelDraft.content += content
      },
      onDone: () => {
        polishState.value = 'done'
        if (mdMonacoInstance) mdMonacoInstance.updateOptions({ readOnly: false })
      },
      onError: (message) => {
        window.$toast({ title: message || 'AI 优化失败', type: 'error' })
        panelDraft.content = polishOriginal.value || ''
        polishOriginal.value = null
        polishState.value = 'idle'
        if (mdMonacoInstance) mdMonacoInstance.updateOptions({ readOnly: false })
      },
    })
  } catch (e: any) {
    window.$toast({ title: 'AI 优化失败', type: 'error' })
    panelDraft.content = polishOriginal.value || ''
    polishOriginal.value = null
    polishState.value = 'idle'
    if (mdMonacoInstance) mdMonacoInstance.updateOptions({ readOnly: false })
  }
}

function restoreOriginal() {
  if (polishOriginal.value === null) return
  panelDraft.content = polishOriginal.value
  polishOriginal.value = null
  polishState.value = 'idle'
  showCompareDialog.value = false
}

async function loadPromptTemplates() {
  if (promptTemplates.value.length) return
  try {
    promptTemplates.value = await listTemplates(props.kbId)
    if (selectedContentTemplateId.value && !contentTemplates.value.some(t => String(t.id) === selectedContentTemplateId.value)) {
      selectedContentTemplateId.value = ''
    }
  } catch {
    promptTemplates.value = []
  }
}

async function applyContentTemplate() {
  const templateId = Number(selectedContentTemplateId.value)
  if (!templateId) return
  try {
    const result = await renderTemplate(props.kbId, {
      template_id: templateId,
      target: 'block_knowledge_description',
      mode: 'text',
      data: {
        name: panelDraft.name,
        block_name: panelDraft.name,
        block_type: blockTypeLabels[panelDraft.type] || panelDraft.type,
        node_name: props.node.name,
      },
    })
    if (!result.content?.trim()) return
    panelDraft.content = panelDraft.content?.trim()
      ? `${panelDraft.content.trim()}\n\n${result.content.trim()}`
      : result.content.trim()
  } catch (e: any) {
    window.$toast?.({ title: e.message || '引用 Prompt 模板失败', type: 'error' })
  }
}

async function loadBlockFormSource(blockId: string) {
  for (const kind of ['list', 'search'] as const) {
    const key = formSourceKey(blockId, kind)
    if (Object.prototype.hasOwnProperty.call(formSources, key)) continue
    try {
      formSources[key] = await getBlockFormSource(props.kbId, blockId, kind)
    } catch {
      formSources[key] = null
    }
  }
}

function openListFormDialog() {
  const blockId = panelBlockId.value
  const preferredKind = panelDraft.type === 'field' ? 'search' : 'list'
  formPreviewByKind.list = hydrateActiveFormFromSource(blockId, 'list')
  formPreviewByKind.search = hydrateActiveFormFromSource(blockId, 'search')
  formKind.value = preferredKind
  listFormPreview.value = formPreviewByKind[preferredKind]
  showListFormDialog.value = true
}

function formSourceKey(blockId: string, kind: 'list' | 'search') {
  return `${blockId}:${kind}`
}

function hydrateActiveFormFromSource(blockId: string | null, kind: 'list' | 'search') {
  const source = blockId ? formSources[formSourceKey(blockId, kind)] : null
  if (kind === 'search') {
    hydrateSearchFormDraft(source?.data || {
      purpose: '',
      fields: [],
    })
  } else {
    hydrateListFormDraft(source?.data || {
    purpose: '',
    fields: [],
  })
  }
  return source?.generated_content || ''
}

function switchFormKind(kind: 'list' | 'search') {
  formPreviewByKind[formKind.value] = listFormPreview.value
  formKind.value = kind
  listFormPreview.value = formPreviewByKind[kind] || ''
}

function resetPromptFormDialogDrafts() {
  hydrateListFormDraft({
    purpose: '',
    fields: [],
  })
  hydrateSearchFormDraft({
    purpose: '',
    fields: [],
  })
  formPreviewByKind.list = ''
  formPreviewByKind.search = ''
  listFormPreview.value = ''
  formKind.value = 'list'
}

function closePromptFormDialog() {
  showControlDescriptionDialog.value = false
  controlDescriptionTargetFieldIndex.value = null
  showListFormDialog.value = false
  resetPromptFormDialogDrafts()
}

function hydrateListFormDraft(data: Record<string, any>) {
  listFormDraft.kind = 'list'
  listFormDraft.purpose = data.purpose || ''
  listFormDraft.header_description = data.header_description || ''
  listFormDraft.pagination_detail = data.pagination_detail || ''
  listFormDraft.default_sort = data.default_sort || ''
  listFormDraft.empty_state = data.empty_state || ''
  listFormDraft.permission = data.permission || ''
  listFormDraft.fields = Array.isArray(data.fields) ? JSON.parse(JSON.stringify(data.fields)) : []
  listFormDraft.extra = data.extra || ''
  optionalSections.header_description = !!listFormDraft.header_description
  optionalSections.default_sort = !!listFormDraft.default_sort
  optionalSections.empty_state = !!listFormDraft.empty_state
  optionalSections.permission = !!listFormDraft.permission
  optionalSections.pagination_detail = !!listFormDraft.pagination_detail
}

function snapshotListFormData() {
  return JSON.parse(JSON.stringify({
    kind: 'list',
    purpose: listFormDraft.purpose,
    header_description: listFormDraft.header_description,
    pagination_detail: listFormDraft.pagination_detail,
    default_sort: listFormDraft.default_sort,
    empty_state: listFormDraft.empty_state,
    permission: listFormDraft.permission,
    fields: listFormDraft.fields,
    extra: listFormDraft.extra,
  }))
}

function hydrateSearchFormDraft(data: Record<string, any>) {
  searchFormDraft.kind = 'search'
  searchFormDraft.purpose = data.purpose || ''
  searchFormDraft.fields = Array.isArray(data.fields) ? JSON.parse(JSON.stringify(data.fields)) : []
  searchFormDraft.query_action_name = data.query_action_name || ''
  searchFormDraft.query_action_description = data.query_action_description || ''
  searchFormDraft.reset_action_name = data.reset_action_name || ''
  searchFormDraft.reset_action_description = data.reset_action_description || ''
  searchFormDraft.extra = data.extra || ''
  searchOptionalSections.query_action = !!(searchFormDraft.query_action_name || searchFormDraft.query_action_description)
  searchOptionalSections.reset_action = !!(searchFormDraft.reset_action_name || searchFormDraft.reset_action_description)
}

function snapshotSearchFormData() {
  return JSON.parse(JSON.stringify({
    kind: 'search',
    purpose: searchFormDraft.purpose,
    fields: searchFormDraft.fields,
    query_action_name: searchFormDraft.query_action_name,
    query_action_description: searchFormDraft.query_action_description,
    reset_action_name: searchFormDraft.reset_action_name,
    reset_action_description: searchFormDraft.reset_action_description,
    extra: searchFormDraft.extra,
  }))
}

function snapshotPromptFormData() {
  return formKind.value === 'search' ? snapshotSearchFormData() : snapshotListFormData()
}

function addListField() {
  listFormDraft.fields.push({
    name: '',
    column_type: '',
    custom_column_type: '',
    description: '',
  })
  scrollToNewFieldCard('.ce-list-field-list')
}

function removeListField(index: number | string) {
  listFormDraft.fields.splice(Number(index), 1)
}

function selectExistingColumnName(field: any, value: string | number) {
  if (isFixedListColumn(field)) return
  const selectedName = String(value)
  const source = (listFormDraft.fields || []).find((item: any) =>
    item !== field &&
    String(item?.name || '').trim() === selectedName &&
    (item?.column_type || item?.custom_column_type)
  ) || (listFormDraft.fields || []).find((item: any) =>
    item !== field &&
    String(item?.name || '').trim() === selectedName
  )
  field.name = selectedName
  if (source) {
    field.column_type = source.column_type || ''
    field.custom_column_type = source.custom_column_type || ''
  }
}

function onListColumnTypeChange(field: any, value: string | number) {
  const type = String(value)
  if (type === 'selection') {
    field.name = '勾选'
    field.custom_column_type = ''
    field.description = SELECTION_COLUMN_DESCRIPTION
    return
  }
  if (type === 'sequence') {
    field.name = '序号'
    field.custom_column_type = ''
    field.description = SEQUENCE_COLUMN_DESCRIPTION
    return
  }
  if (type !== 'custom') {
    field.custom_column_type = ''
  }
}

function openControlDescriptionDialog(fieldIndex: number | string) {
  controlDescriptionTargetFieldIndex.value = Number(fieldIndex)
  showControlDescriptionDialog.value = true
}

function insertControlDescription(text: string) {
  const index = controlDescriptionTargetFieldIndex.value
  if (index == null) return
  const field = listFormDraft.fields?.[index]
  if (!field) return
  const current = String(field.description || '').trim()
  field.description = current ? `${current}\n${text}` : text
}

function removeOptionalSection(key: 'header_description' | 'default_sort' | 'empty_state' | 'permission' | 'pagination_detail') {
  optionalSections[key] = false
  listFormDraft[key] = ''
}

function addOptionalSection(key: 'header_description' | 'default_sort' | 'empty_state' | 'permission' | 'pagination_detail') {
  optionalSections[key] = true
  scrollToOptionalItem('.ce-list-optional-list', key)
}

function addSearchField() {
  searchFormDraft.fields.push({
    name: '',
    control_type: '',
    custom_control_type: '',
    description: '',
  })
  scrollToNewFieldCard('.ce-search-field-list')
}

async function scrollToNewFieldCard(listSelector: string) {
  await nextTick()
  const cards = document.querySelectorAll(`${listSelector} .ce-field-card`)
  const card = cards[cards.length - 1] as HTMLElement | undefined
  card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function scrollToOptionalItem(listSelector: string, key: string) {
  await nextTick()
  const item = document.querySelector(`${listSelector} .ce-optional-item[data-optional-key="${key}"]`) as HTMLElement | null
  item?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function scrollToFieldCard(listSelector: string, index: number) {
  const card = document.querySelector(`${listSelector} .ce-field-card[data-field-index="${index}"]`) as HTMLElement | null
  card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function removeSearchField(index: number | string) {
  searchFormDraft.fields.splice(Number(index), 1)
}

function removeSearchOptionalSection(key: 'query_action' | 'reset_action') {
  searchOptionalSections[key] = false
  if (key === 'query_action') {
    searchFormDraft.query_action_name = ''
    searchFormDraft.query_action_description = ''
  } else {
    searchFormDraft.reset_action_name = ''
    searchFormDraft.reset_action_description = ''
  }
}

function addSearchOptionalSection(key: 'query_action' | 'reset_action') {
  searchOptionalSections[key] = true
  scrollToOptionalItem('.ce-search-optional-list', key)
}

async function renderPromptForm() {
  formRendering.value = true
  try {
    const result = await renderTemplate(props.kbId, {
      target: 'block_knowledge_description',
      mode: 'form',
      data: snapshotPromptFormData(),
    })
    listFormPreview.value = result.content || ''
    formPreviewByKind[formKind.value] = listFormPreview.value
    if (result.warnings?.length) {
      window.$toast?.({ title: result.warnings.join('；'), type: 'info' })
    }
  } catch (e: any) {
    window.$toast?.({ title: e.message || '生成知识描述失败', type: 'error' })
  } finally {
    formRendering.value = false
  }
}

async function applyPromptFormToDraft() {
  if (!listFormPreview.value.trim()) {
    await renderPromptForm()
  }
  if (!listFormPreview.value.trim()) return
  panelDraft.type = formKind.value === 'search' ? 'region' : 'list'
  panelDraft.content = listFormPreview.value.trim()
  const blockId = panelBlockId.value
  if (blockId) {
    const key = formSourceKey(blockId, formKind.value)
    formSources[key] = {
      id: formSources[key]?.id || '',
      kb_id: props.kbId,
      target_type: 'block',
      target_id: blockId,
      node_id: props.node.id,
      block_id: blockId,
      template_id: null,
      template_version: 1,
      kind: formKind.value,
      data: snapshotPromptFormData(),
      generated_content: listFormPreview.value.trim(),
    }
    const next = new Set(dirtyFormSourceBlockIds.value)
    next.add(key)
    dirtyFormSourceBlockIds.value = next
  }
  closePromptFormDialog()
}

async function persistDirtyFormSources() {
  if (!dirtyFormSourceBlockIds.value.size) return
  for (const key of dirtyFormSourceBlockIds.value) {
    const source = formSources[key]
    if (!source) continue
    try {
      await saveBlockFormSource(props.kbId, source.block_id || source.target_id, {
        template_id: source.template_id,
        template_version: source.template_version,
        kind: source.kind,
        data: source.data,
        generated_content: source.generated_content,
      })
    } catch (e) {
      console.error('[save block form source failed]', key, e)
    }
  }
  dirtyFormSourceBlockIds.value = new Set()
}

// ─── Block CRUD ───

function addBlock() {
  const wrap = canvasWrapRef.value
  const scrollX = wrap ? wrap.scrollLeft : 0
  const scrollY = wrap ? wrap.scrollTop : 0
  const maxY = content.blocks.reduce((max, b) => Math.max(max, b.layout.y + b.layout.h), 0)
  const block = createBlock('新块', 'region', snapToGrid(scrollX + CANVAS_INSET), snapToGrid(Math.max(maxY + CANVAS_INSET, scrollY + CANVAS_INSET)))
  // Prevent overlap on creation
  while (content.blocks.some(b => rectsOverlap(block.layout, b.layout, 0))) {
    block.layout.y += GRID_SIZE
  }
  content.blocks.push(block)
  selectedBlockId.value = block.id
  markDirty()
}

function deleteBlock(id: string) {
  const idx = content.blocks.findIndex(b => b.id === id)
  if (idx >= 0) {
    content.blocks.splice(idx, 1)
    if (selectedBlockId.value === id) selectedBlockId.value = null
    if (editingBlockId.value === id) editingBlockId.value = null
    if (panelBlockId.value === id) panelBlockId.value = null
    markDirty()
  }
}

function onBlockTypeChange(block: KBBlock, value: string) {
  block.type = value as KBBlockType
  markDirty()
}

function openPanel(blockId: string) {
  panelBlockId.value = panelBlockId.value === blockId ? null : blockId
}

async function savePanelDraft() {
  const block = content.blocks.find(b => b.id === panelBlockId.value)
  if (!block) return
  block.name = panelDraft.name
  block.type = panelDraft.type
  block.content = panelDraft.content
  block.summary = panelDraft.summary
  block.images = JSON.parse(JSON.stringify(panelDraft.images))
  panelBlockId.value = null
  isDirty.value = true
  emit('dirty-changed', true)
  recomputeBlockStale()
}

function addDraftImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      panelDraft.images.push({ id: crypto.randomUUID(), url: reader.result as string, name: file.name })
    }
    reader.readAsDataURL(file)
  }
  input.click()
}
function removeDraftImage(index: number) { panelDraft.images.splice(index, 1) }

function selectBlock(id: string) {
  selectedBlockId.value = id
}

// ─── Inline editing ───

function startEditingContent(blockId: string) {
  editingBlockId.value = blockId
  editField.value = 'content'
  nextTick(() => {
    const ta = contentTextareaRef.value
    if (Array.isArray(ta)) (ta as any)[0]?.focus()
    else ta?.focus()
  })
}

function stopEditingField() {
  editingBlockId.value = null
  editField.value = null
  markDirty()
}

// ─── Monaco editor for panel ───

async function initPanelMonaco() {
  if (!mdMonacoContainer.value) return
  const m = await import('monaco-editor/esm/vs/editor/editor.main')
  await import('monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution')

  // Define a clean light theme once
  m.editor.defineTheme('ce-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword.md', foreground: '0071e3' },
      { token: 'string.link.md', foreground: '0071e3' },
      { token: 'comment.md', foreground: '8e8e93' },
      { token: 'strong.md', foreground: '1d1d1f', fontStyle: 'bold' },
      { token: 'emphasis.md', foreground: '1d1d1f', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1d1d1f',
      'editor.lineHighlightBackground': '#f5f5f700',
      'editor.selectionBackground': '#0071e330',
      'editorLineNumber.foreground': '#c7c7cc',
      'editorLineNumber.activeForeground': '#8e8e93',
      'editorCursor.foreground': '#1d1d1f',
      'editor.inactiveSelectionBackground': '#0071e318',
      'editorIndentGuide.background': '#f2f2f7',
      'editorGutter.background': '#f8f8f8',
      'scrollbarSlider.background': '#00000012',
      'scrollbarSlider.hoverBackground': '#00000020',
    },
  })

  mdMonacoModel = m.editor.createModel(panelDraft.content || '', 'markdown')
  mdMonacoInstance = m.editor.create(mdMonacoContainer.value, {
    model: mdMonacoModel,
    theme: 'ce-light',
    automaticLayout: true,
    fontSize: 13,
    lineHeight: 21,
    fontFamily: "'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
    fontLigatures: false,
    wordWrap: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    lineNumbers: 'on',
    glyphMargin: false,
    folding: false,
    lineDecorationsWidth: 0,
    renderLineHighlight: 'none',
    overviewRulerBorder: false,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
    padding: { top: 12, bottom: 12 },
    suggest: { showWords: false },
    quickSuggestions: false,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    renderWhitespace: 'none',
    renderValidationDecorations: 'off',
    bracketPairColorization: { enabled: false },
  })

  mdMonacoInstance.onDidChangeModelContent(() => {
    if (mdMonacoSyncing) return
    const val = mdMonacoInstance.getValue()
    if (panelDraft.content !== val) {
      panelDraft.content = val
      // Draft changes don't mark canvas dirty
    }
  })
}

function disposePanelMonaco() {
  if (mdMonacoInstance) { mdMonacoInstance.dispose(); mdMonacoInstance = null }
  if (mdMonacoModel) { mdMonacoModel.dispose(); mdMonacoModel = null }
}

// ─── Monaco editor for summary ───

async function initSummaryMonaco() {
  if (!summaryMonacoContainer.value) return
  const m = await import('monaco-editor/esm/vs/editor/editor.main')
  await import('monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution')

  // Re-use the same ce-light theme (defineTheme is idempotent)
  m.editor.defineTheme('ce-light', {
    base: 'vs', inherit: true,
    rules: [
      { token: 'keyword.md', foreground: '0071e3' },
      { token: 'string.link.md', foreground: '0071e3' },
      { token: 'comment.md', foreground: '8e8e93' },
      { token: 'strong.md', foreground: '1d1d1f', fontStyle: 'bold' },
      { token: 'emphasis.md', foreground: '1d1d1f', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1d1d1f',
      'editor.lineHighlightBackground': '#f5f5f700',
      'editor.selectionBackground': '#0071e330',
      'editorLineNumber.foreground': '#c7c7cc',
      'editorLineNumber.activeForeground': '#8e8e93',
      'editorCursor.foreground': '#1d1d1f',
      'editor.inactiveSelectionBackground': '#0071e318',
      'editorIndentGuide.background': '#f2f2f7',
      'editorGutter.background': '#f8f8f8',
      'scrollbarSlider.background': '#00000012',
      'scrollbarSlider.hoverBackground': '#00000020',
    },
  })

  summaryMonacoModel = m.editor.createModel(panelDraft.summary || '', 'markdown')
  summaryMonacoInstance = m.editor.create(summaryMonacoContainer.value, {
    model: summaryMonacoModel,
    theme: 'ce-light',
    automaticLayout: true,
    fontSize: 13,
    lineHeight: 21,
    fontFamily: "'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
    fontLigatures: false,
    wordWrap: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    lineNumbers: 'on',
    glyphMargin: false,
    folding: false,
    lineDecorationsWidth: 4,
    renderLineHighlight: 'none',
    overviewRulerBorder: false,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
    padding: { top: 10, bottom: 10 },
    suggest: { showWords: false },
    quickSuggestions: false,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    renderWhitespace: 'none',
    renderValidationDecorations: 'off',
    bracketPairColorization: { enabled: false },
  })

  summaryMonacoInstance.onDidChangeModelContent(() => {
    if (summaryMonacoSyncing) return
    const val = summaryMonacoInstance.getValue()
    if (panelDraft.summary !== val) panelDraft.summary = val
  })
}

function disposeSummaryMonaco() {
  if (summaryMonacoInstance) { summaryMonacoInstance.dispose(); summaryMonacoInstance = null }
  if (summaryMonacoModel) { summaryMonacoModel.dispose(); summaryMonacoModel = null }
}

// ─── Generate block summary ───

async function generateBlockSummary() {
  if (summaryState.value === 'streaming') {
    window.$toast({ title: 'AI 正在生成摘要，请稍候', type: 'info' })
    return
  }
  const block = content.blocks.find(b => b.id === panelBlockId.value)
  if (!block || !props.node) {
    window.$toast({ title: '无法确定块信息', type: 'error' })
    return
  }
  const kbId = props.node.kb_id
  if (!kbId) {
    window.$toast({ title: '未找到知识库 ID', type: 'error' })
    return
  }

  summaryState.value = 'streaming'
  if (summaryMonacoInstance) summaryMonacoInstance.updateOptions({ readOnly: true })
  panelDraft.summary = ''

  try {
    await streamHarnessSse(
      `/kb/${kbId}/node/${props.node.id}/block/${block.id}/summary/stream`,
      { content: panelDraft.content },
      {
        onChunk: (content) => {
          panelDraft.summary += content
        },
        onDone: () => {
          summaryState.value = 'idle'
          if (summaryMonacoInstance) summaryMonacoInstance.updateOptions({ readOnly: false })
        },
        onError: (message) => {
          window.$toast({ title: message || '摘要生成失败', type: 'error' })
          summaryState.value = 'idle'
          if (summaryMonacoInstance) summaryMonacoInstance.updateOptions({ readOnly: false })
        },
      },
    )
  } catch (e: any) {
    window.$toast({ title: '摘要生成失败', type: 'error' })
    summaryState.value = 'idle'
    if (summaryMonacoInstance) summaryMonacoInstance.updateOptions({ readOnly: false })
  }
}

// ─── Generate node summary ───

function openNodeSummaryDialog() {
  nodeSummaryDraft.value = props.node?.summary || ''
  showNodeSummaryDialog.value = true
}

async function generateNodeSummary() {
  if (nodeSummaryState.value === 'streaming') {
    window.$toast({ title: 'AI 正在生成节点摘要，请稍候', type: 'info' })
    return
  }
  if (!props.node || !props.kbId) return

  nodeSummaryState.value = 'streaming'
  nodeSummaryDraft.value = ''

  try {
    await streamHarnessSse(
      `/kb/${props.kbId}/node/${props.node.id}/summary/stream`,
      {},
      {
        onChunk: (content) => {
          nodeSummaryDraft.value += content
        },
        onDone: () => {
          nodeSummaryState.value = 'idle'
          // Refresh parent so node.summary / summary_updated_at propagate.
          emit('summary-updated')
        },
        onError: (message) => {
          window.$toast({ title: message || '节点摘要生成失败', type: 'error' })
          nodeSummaryState.value = 'idle'
        },
      },
    )
  } catch (e: any) {
    window.$toast({ title: '节点摘要生成失败', type: 'error' })
    nodeSummaryState.value = 'idle'
  }
}

// Watch panelBlockId to open/close Monaco and populate draft
watch(panelBlockId, async (newId, oldId) => {
  if (oldId && !newId) {
    disposePanelMonaco()
    disposeSummaryMonaco()
    // Reset AI polish state when dialog closes
    polishOriginal.value = null
    polishState.value = 'idle'
    showCompareDialog.value = false
    summaryViewMode.value = 'edit'
    summaryState.value = 'idle'
    if (showListFormDialog.value) closePromptFormDialog()
    selectedContentTemplateId.value = ''
    return
  }
  if (newId) {
    await loadPromptTemplates()
    await loadBlockFormSource(newId)
    const block = content.blocks.find(b => b.id === newId)
    if (!block) return
    // Populate draft from block
    panelDraft.name = block.name
    panelDraft.type = block.type
    panelDraft.content = block.content || ''
    panelDraft.summary = block.summary || ''
    panelDraft.images = JSON.parse(JSON.stringify(block.images || []))
    disposePanelMonaco()
    disposeSummaryMonaco()
    await nextTick()
    await nextTick()
    await initPanelMonaco()
    await initSummaryMonaco()
  }
}, { flush: 'post' })

// Keep Monaco in sync when panelDraft.content changes externally
watch(() => panelDraft.content, (val) => {
  if (!mdMonacoInstance || val === undefined) return
  if (mdMonacoInstance.getValue() !== val) {
    mdMonacoSyncing = true
    mdMonacoInstance.setValue(val)
    mdMonacoSyncing = false
  }
})

// Keep summary Monaco in sync when panelDraft.summary changes externally (e.g. streaming)
watch(() => panelDraft.summary, (val) => {
  if (!summaryMonacoInstance || val === undefined) return
  if (summaryMonacoInstance.getValue() !== val) {
    summaryMonacoSyncing = true
    summaryMonacoInstance.setValue(val)
    summaryMonacoSyncing = false
  }
})

// ─── Overlap detection (enforces SNAP_GAP minimum distance) ───

interface Rect { x: number; y: number; w: number; h: number }

function rectsOverlap(a: Rect, b: Rect, gap: number): boolean {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y
}

function wouldOverlap(rect: Rect, excludeId: string): boolean {
  return content.blocks.some(b => b.id !== excludeId && rectsOverlap(rect, b.layout, 0))
}

// ─── Snap logic ───

interface SnapResult { value: number; guide: number }

function findSnap(
  edges: number[],
  targets: number[],
  threshold: number,
  disabled: boolean,
): SnapResult | null {
  if (disabled) return null
  let best: SnapResult | null = null
  let bestDist = threshold + 1
  for (const edge of edges) {
    for (const target of targets) {
      const d = Math.abs(edge - target)
      if (d < bestDist) {
        bestDist = d
        best = { value: edges[0] + (target - edge), guide: target }
      }
    }
  }
  return best
}

// Move snap: targets are gap-offset positions (my edge → maintain SNAP_GAP from neighbor)
function collectSnapTargetsX(excludeId: string): number[] {
  const targets = [CANVAS_INSET]
  for (const b of content.blocks) {
    if (b.id === excludeId) continue
    targets.push(b.layout.x - SNAP_GAP, b.layout.x + b.layout.w + SNAP_GAP)
  }
  return targets
}

function collectSnapTargetsY(excludeId: string): number[] {
  const targets = [CANVAS_INSET]
  for (const b of content.blocks) {
    if (b.id === excludeId) continue
    targets.push(b.layout.y - SNAP_GAP, b.layout.y + b.layout.h + SNAP_GAP)
  }
  return targets
}

// ─── Drag state ───

type ResizeEdge = 'left' | 'right' | 'bottom' | 'top' | 'br'

let dragState: {
  type: 'move' | 'resize'
  edge?: ResizeEdge
  blockId: string
  startX: number
  startY: number
  origX: number
  origY: number
  origW: number
  origH: number
  startScrollX: number
  startScrollY: number
  suppressSnapX: boolean
  suppressSnapY: boolean
} | null = null

// Auto-scroll during drag near edges
let autoScrollRAF: number | null = null
let lastPointerX = 0
let lastPointerY = 0
const AUTO_SCROLL_ZONE = 40
const AUTO_SCROLL_SPEED = 12

function onCanvasPointerDown(e: PointerEvent) {
  if (e.button === 0 && (e.target as HTMLElement).closest('.ce-canvas-wrap') === e.currentTarget) {
    selectedBlockId.value = null
    editingBlockId.value = null
  }
}

function isSnappedX(block: KBBlock): boolean {
  const targets = collectSnapTargetsX(block.id)
  const edges = [block.layout.x, block.layout.x + block.layout.w]
  return edges.some(e => targets.some(t => Math.abs(e - t) < 1))
}

function isSnappedY(block: KBBlock): boolean {
  const targets = collectSnapTargetsY(block.id)
  const edges = [block.layout.y, block.layout.y + block.layout.h]
  return edges.some(e => targets.some(t => Math.abs(e - t) < 1))
}

function onHeaderPointerDown(e: PointerEvent, block: KBBlock) {
  if (e.button !== 0) return
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON') return
  selectedBlockId.value = block.id
  const wrap = canvasWrapRef.value
  dragState = {
    type: 'move',
    blockId: block.id,
    startX: e.clientX,
    startY: e.clientY,
    origX: block.layout.x,
    origY: block.layout.y,
    origW: block.layout.w,
    origH: block.layout.h,
    startScrollX: wrap ? wrap.scrollLeft : 0,
    startScrollY: wrap ? wrap.scrollTop : 0,
    suppressSnapX: isSnappedX(block),
    suppressSnapY: isSnappedY(block),
  }
  isDragging.value = false
  lastPointerX = e.clientX
  lastPointerY = e.clientY
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onHeaderDblClick(block: KBBlock) {
  const wrap = canvasWrapRef.value
  if (!wrap) return
  const maxRight = wrap.clientWidth - CANVAS_INSET

  // Find the usable horizontal band for this block considering neighbors on the same row
  let bandLeft = CANVAS_INSET
  let bandRight = maxRight
  for (const b of content.blocks) {
    if (b.id === block.id) continue
    // Check vertical overlap (same row)
    if (b.layout.y < block.layout.y + block.layout.h && b.layout.y + b.layout.h > block.layout.y) {
      const bRight = b.layout.x + b.layout.w
      if (bRight <= block.layout.x) {
        // Block is to the left (touching or gap) — use its right edge as our left boundary
        bandLeft = Math.max(bandLeft, bRight)
      } else if (b.layout.x >= block.layout.x + block.layout.w) {
        // Block is to the right — use its left edge as our right boundary
        bandRight = Math.min(bandRight, b.layout.x)
      }
    }
  }

  // All block edges are grid-aligned; CANVAS_INSET is also GRID_SIZE.
  // No extra snapping needed — bandLeft is already a grid multiple, bandRight = maxRight exactly.

  const isAtMax = block.layout.x === bandLeft && block.layout.w === bandRight - bandLeft

  if (isAtMax && preExpandLayouts.has(block.id)) {
    const saved = preExpandLayouts.get(block.id)!
    preExpandLayouts.delete(block.id)
    transitioningBlockId.value = block.id
    block.layout.x = saved.x
    block.layout.w = saved.w
    markDirty()
    setTimeout(() => { transitioningBlockId.value = null }, 300)
  } else {
    const newW = bandRight - bandLeft
    if (newW >= MIN_W) {
      preExpandLayouts.set(block.id, { x: block.layout.x, w: block.layout.w })
      transitioningBlockId.value = block.id
      block.layout.x = bandLeft
      block.layout.w = newW
      markDirty()
      setTimeout(() => { transitioningBlockId.value = null }, 300)
    }
  }
}

function onResizePointerDown(e: PointerEvent, block: KBBlock, edge: ResizeEdge) {
  if (e.button !== 0) return
  selectedBlockId.value = block.id
  const wrap = canvasWrapRef.value
  dragState = {
    type: 'resize',
    edge,
    blockId: block.id,
    startX: e.clientX,
    startY: e.clientY,
    origX: block.layout.x,
    origY: block.layout.y,
    origW: block.layout.w,
    origH: block.layout.h,
    startScrollX: wrap ? wrap.scrollLeft : 0,
    startScrollY: wrap ? wrap.scrollTop : 0,
    suppressSnapX: false,
    suppressSnapY: false,
  }
  isDragging.value = true
  isResizing.value = true
  lastPointerX = e.clientX
  lastPointerY = e.clientY
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function applyDragUpdate() {
  if (!dragState) return
  const wrap = canvasWrapRef.value
  const block = content.blocks.find(b => b.id === dragState!.blockId)
  if (!block || !wrap) return

  const maxRight = wrap.clientWidth - CANVAS_INSET
  const scrollDX = wrap.scrollLeft - dragState.startScrollX
  const scrollDY = wrap.scrollTop - dragState.startScrollY
  const dx = (lastPointerX - dragState.startX) + scrollDX
  const dy = (lastPointerY - dragState.startY) + scrollDY

  if (dragState.type === 'move') {
    let newX = snapToGrid(Math.max(CANVAS_INSET, dragState.origX + dx))
    let newY = snapToGrid(Math.max(CANVAS_INSET, dragState.origY + dy))

    // Clamp right edge
    if (newX + block.layout.w > maxRight) newX = maxRight - block.layout.w
    newX = Math.max(CANVAS_INSET, newX)
    newY = Math.max(CANVAS_INSET, newY)

    // Free movement during drag — no overlap check here
    block.layout.x = newX
    block.layout.y = newY
    snapGuideX.value = null
    snapGuideY.value = null

  } else if (dragState.type === 'resize') {
    const edge = dragState.edge!
    let newX = dragState.origX
    let newY = dragState.origY
    let newW = dragState.origW
    let newH = dragState.origH
    const origRight = dragState.origX + dragState.origW
    const origBottom = dragState.origY + dragState.origH

    if (edge === 'left') {
      newX = snapToGrid(Math.max(CANVAS_INSET, dragState.origX + dx))
      newW = origRight - newX
      if (newW < MIN_W) { newW = MIN_W; newX = origRight - newW }
    } else if (edge === 'right') {
      const rawRight = snapToGrid(origRight + dx)
      newW = Math.max(MIN_W, rawRight - newX)
      if (newX + newW > maxRight) newW = maxRight - newX
    } else if (edge === 'top') {
      newY = snapToGrid(Math.max(CANVAS_INSET, dragState.origY + dy))
      newH = origBottom - newY
      if (newH < MIN_H) { newH = MIN_H; newY = origBottom - newH }
    } else if (edge === 'bottom') {
      const rawBottom = snapToGrid(origBottom + dy)
      newH = Math.max(MIN_H, rawBottom - newY)
    } else { // br
      const rawRight = snapToGrid(origRight + dx)
      const rawBottom = snapToGrid(origBottom + dy)
      newW = Math.max(MIN_W, rawRight - newX)
      newH = Math.max(MIN_H, rawBottom - newY)
      if (newX + newW > maxRight) newW = maxRight - newX
    }

    const candidate: Rect = { x: newX, y: newY, w: newW, h: newH }
    if (!wouldOverlap(candidate, block.id)) {
      block.layout.x = newX
      block.layout.y = newY
      block.layout.w = newW
      block.layout.h = newH
    }
    snapGuideX.value = null
    snapGuideY.value = null
  }
}

function onPointerMove(e: PointerEvent) {
  if (!dragState) return
  lastPointerX = e.clientX
  lastPointerY = e.clientY

  const dx = e.clientX - dragState.startX
  const dy = e.clientY - dragState.startY
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.value = true

  applyDragUpdate()
  startAutoScroll()
}

function onPointerUp() {
  stopAutoScroll()

  if (dragState && isDragging.value && dragState.type === 'move') {
    const block = content.blocks.find(b => b.id === dragState!.blockId)
    if (block) {
      const candidate: Rect = { x: block.layout.x, y: block.layout.y, w: block.layout.w, h: block.layout.h }
      if (wouldOverlap(candidate, block.id)) {
        // Bounce back to original position with transition
        transitioningBlockId.value = block.id
        block.layout.x = dragState.origX
        block.layout.y = dragState.origY
        setTimeout(() => { transitioningBlockId.value = null }, 320)
      } else {
        markDirty()
      }
    }
  } else if (dragState && isDragging.value) {
    markDirty()
  }

  dragState = null
  snapGuideX.value = null
  snapGuideY.value = null
  setTimeout(() => { isDragging.value = false; isResizing.value = false }, 50)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

// ─── Auto-scroll near container edges during drag ───

function startAutoScroll() {
  if (autoScrollRAF !== null) return
  autoScrollTick()
}

function stopAutoScroll() {
  if (autoScrollRAF !== null) {
    cancelAnimationFrame(autoScrollRAF)
    autoScrollRAF = null
  }
}

function autoScrollTick() {
  autoScrollRAF = null
  if (!dragState) return
  const wrap = canvasWrapRef.value
  if (!wrap) return

  const rect = wrap.getBoundingClientRect()
  let scrollDy = 0

  const bottomDist = rect.bottom - lastPointerY
  const topDist = lastPointerY - rect.top

  if (bottomDist >= 0 && bottomDist < AUTO_SCROLL_ZONE) {
    scrollDy = AUTO_SCROLL_SPEED * (1 - bottomDist / AUTO_SCROLL_ZONE)
  } else if (topDist >= 0 && topDist < AUTO_SCROLL_ZONE) {
    scrollDy = -AUTO_SCROLL_SPEED * (1 - topDist / AUTO_SCROLL_ZONE)
  }

  if (scrollDy !== 0) {
    wrap.scrollTop += Math.round(scrollDy)
    applyDragUpdate()
  }

  autoScrollRAF = requestAnimationFrame(autoScrollTick)
}

// ─── Images ───

function addImage(block: KBBlock) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      block.images.push({ id: crypto.randomUUID(), url: reader.result as string, name: file.name })
      markDirty()
    }
    reader.readAsDataURL(file)
  }
  input.click()
}
function removeImage(block: KBBlock, index: number) { block.images.splice(index, 1); markDirty() }

// ─── Cleanup ───

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showListFormDialog.value || panelBlockId.value) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    closeMdDialog()
  }
  if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    save()
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('keydown', onKeyDown)
  disposePanelMonaco()
  disposeSummaryMonaco()
  stopAutoScroll()
})

window.addEventListener('keydown', onKeyDown)
</script>

<style lang="scss" scoped>
$bg-page: #ffffff;
$bg-sidebar: #f5f5f7;
$bg-hover: #eaeaec;
$bg-block: #ffffff;
$bg-block-header: rgba(0, 0, 0, 0.025);
$text-primary: #1d1d1f;
$text-secondary: rgba(0, 0, 0, 0.52);
$text-tertiary: rgba(0, 0, 0, 0.32);
$border-color: rgba(0, 0, 0, 0.11);
$accent: #1d1d1f;
$block-shadow: none;
$block-shadow-selected: none;

.canvas-editor {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-page;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

// ─── Toolbar ───

.ce-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  min-height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid $border-color;
  background: $bg-page;
  z-index: 10;
}

.ce-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.ce-dirty-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f5a623;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(245, 166, 35, 0.25);
}

.ce-stale-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 6px;
  border-radius: 50%;
  background: #f5a623;
  vertical-align: middle;
  box-shadow: 0 0 0 2px rgba(245, 166, 35, 0.2);
}

.ce-block-incomplete-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(255, 159, 10, 0.12);
  color: #b96a00;
  border: 1px solid rgba(255, 159, 10, 0.35);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.3;
  vertical-align: middle;
}

.ce-edit-summary-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #8a4a00;
  background: rgba(255, 159, 10, 0.08);
  border: 1px solid rgba(255, 159, 10, 0.22);
  border-radius: 6px;
  padding: 6px 10px;
  line-height: 1.4;
}

.ce-empty-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 6px;
  border-radius: 50%;
  background: #c7c7cc;
  vertical-align: middle;
}

.ce-stale-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 6px;
  font-size: 10px;
  line-height: 14px;
  font-weight: 500;
  color: #fff;
  background: #f5a623;
  border-radius: 4px;
  vertical-align: middle;

  &--empty {
    background: #c7c7cc;
  }
}

.ce-node-name {
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
  letter-spacing: -0.224px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ce-node-type {
  font-size: 11px;
  font-weight: 500;
  color: $text-tertiary;
  padding: 2px 7px;
  border-radius: 4px;
  background: $bg-sidebar;
  letter-spacing: -0.08px;
  white-space: nowrap;
}

.ce-toolbar-center {
  display: flex;
  align-items: center;
  gap: 2px;
  background: $bg-sidebar;
  border-radius: 6px;
  padding: 2px;
}

.ce-mode-btn {
  width: 28px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: $text-tertiary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &--active {
    background: $bg-page;
    color: $text-primary;
    border: 1px solid $border-color;
  }

  &:hover:not(&--active) {
    color: $text-secondary;
  }
}

.ce-toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  justify-content: flex-end;
}

.ce-tool-btn {
  height: 28px;
  min-width: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  padding: 0 6px;
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: $bg-hover;
    color: $text-primary;
  }

  &--save {
    background: $accent;
    color: #fff;
    padding: 0 14px;
    font-size: 12px;
    letter-spacing: -0.12px;

    &:hover { opacity: 0.88; background: $accent; color: #fff; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }
}

// ─── Canvas ───

.ce-canvas-wrap {
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
  background-color: #ffffff;
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
  background-size: 20px 20px;
}

.ce-canvas {
  position: relative;
  min-width: 100%;
  min-height: 100%;
}

// ─── Snap guides ───

.ce-snap-guide {
  position: absolute;
  z-index: 50;
  pointer-events: none;

  &--v {
    top: 0;
    bottom: 0;
    width: 1px;
    background: rgba(29, 29, 31, 0.2);
  }

  &--h {
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(29, 29, 31, 0.2);
  }
}

// ─── Blocks ───

.ce-block {
  position: absolute;
  box-sizing: border-box;
  background: $bg-block;
  border: 1px solid $border-color;
  border-top: 3px solid var(--block-accent, rgba(0, 0, 0, 0.15));
  border-radius: 0 0 8px 8px;
  cursor: default;
  display: flex;
  flex-direction: column;
  transition: border-color 0.12s;
  user-select: none;
  overflow: visible;

  &:hover:not(.ce-block--selected) {
    border-color: rgba(0, 0, 0, 0.22);
    border-top-color: var(--block-accent, rgba(0, 0, 0, 0.22));
  }

  &--selected {
    border-color: rgba(0, 0, 0, 0.38);
    border-top: 3px solid var(--block-accent, #1d1d1f);
  }

  &--editing {
    cursor: text;
  }

  &--transitioning {
    transition: left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

// Edit button — inline in header, next to type select
.ce-block-edit-btn {
  width: 22px;
  height: 22px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 5px;
  background: $bg-page;
  color: $text-tertiary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.12s, color 0.1s, background 0.1s;

  .ce-block:hover & {
    opacity: 1;
  }

  &:hover {
    color: $text-primary;
    background: $bg-sidebar;
  }
}

.ce-block-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px 5px;
  min-height: 22px;
  cursor: grab;
  background: $bg-block-header;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  &:active {
    cursor: grabbing;
  }
}

.ce-block-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
  letter-spacing: -0.12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.ce-block-name-input {
  flex: 1;
  border: none;
  border-bottom: 1px solid $accent;
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
  background: transparent;
  outline: none;
  padding: 0 0 1px;
  letter-spacing: -0.12px;
  font-family: inherit;
  min-width: 0;
}

.ce-block-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.12s;

  .ce-block:hover &,
  .ce-block--selected & {
    opacity: 1;
  }
}

.ce-block-delete {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: $text-tertiary;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s, color 0.1s;

  &:hover {
    background: rgba(255, 59, 48, 0.08);
    color: #ff3b30;
  }
}

// Block body
.ce-block-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0 10px 6px;
  display: flex;
  flex-direction: column;

  &--preview {
    cursor: pointer;
  }

  &--compact {
    padding: 0 10px 8px;
    cursor: pointer;
  }
}

.ce-block-content-text {
  margin: 0;
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.5;
  letter-spacing: -0.12px;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: hidden;
}

.ce-block-placeholder {
  margin: 0;
  font-size: 12px;
  color: $text-tertiary;
  font-style: italic;
}

.ce-block-summary {
  margin: 0;
  font-size: 12px;
  color: $text-secondary;
  letter-spacing: -0.12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ce-block-textarea {
  width: 100%;
  flex: 1;
  border: none;
  font-size: 12px;
  color: $text-primary;
  background: transparent;
  outline: none;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  letter-spacing: -0.12px;
  min-height: 0;
  overflow: auto;
}

// ─── Resize handles ───

.ce-resize {
  position: absolute;
  opacity: 0;
  transition: opacity 0.12s;
  z-index: 2;

  .ce-block:hover &,
  .ce-block--selected & {
    opacity: 1;
  }

  &--left {
    top: 8px;
    bottom: 8px;
    left: 0;
    width: 5px;
    cursor: ew-resize;
  }

  &--right {
    top: 8px;
    bottom: 8px;
    right: 0;
    width: 5px;
    cursor: ew-resize;
  }

  &--top {
    left: 8px;
    right: 8px;
    top: 0;
    height: 5px;
    cursor: ns-resize;
  }

  &--bottom {
    left: 8px;
    right: 8px;
    bottom: 0;
    height: 5px;
    cursor: ns-resize;
  }

  &--br {
    right: 0;
    bottom: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;

    &::after {
      content: '';
      position: absolute;
      right: 3px;
      bottom: 3px;
      width: 8px;
      height: 8px;
      border-right: 2px solid rgba(0, 0, 0, 0.15);
      border-bottom: 2px solid rgba(0, 0, 0, 0.15);
      border-radius: 0 0 2px 0;
    }
  }
}

// ─── Edit Dialog ───

.ce-edit-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.36);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.ce-edit-dialog {
  background: #fff;
  border-radius: 16px;
  width: calc(100vw - 80px);
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.ce-edit-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
  gap: 12px;
}

.ce-edit-dialog-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ce-edit-dialog-accent {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  flex-shrink: 0;
}

.ce-edit-dialog-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
  letter-spacing: -0.3px;
}

.ce-edit-dialog-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: $text-tertiary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;

  &:hover { background: $bg-hover; color: $text-primary; }
}

.ce-edit-dialog-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ce-edit-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.ce-edit-field {
  display: flex;
  flex-direction: column;
  gap: 5px;

  &--grow { flex: 1; min-width: 0; }
  &--type { flex-shrink: 0; width: 110px; }
  &--expand {
    height: 320px;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }
}

.ce-edit-label {
  font-size: 11px;
  font-weight: 600;
  color: $text-tertiary;
  letter-spacing: 0.2px;
  text-transform: uppercase;
}

.ce-edit-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid $border-color;
  border-radius: 8px;
  font-size: 13px;
  color: $text-primary;
  background: $bg-sidebar;
  outline: none;
  font-family: inherit;
  letter-spacing: -0.12px;
  box-sizing: border-box;
  transition: border-color 0.15s, background 0.15s;

  &:focus { border-color: rgba(0,0,0,0.3); background: #fff; }
  &--sm { padding: 6px 8px; font-size: 12px; }
}

// ─── Split editor / preview ───

.ce-edit-split {
  display: flex;
  gap: 0;
  flex: 1;
  min-height: 0;
  border: 1px solid $border-color;
  border-radius: 10px;
  overflow: hidden;
}

.ce-edit-split-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;

  &--editor { border-right: 1px solid $border-color; }
}

.ce-edit-split-label {
  font-size: 10px;
  font-weight: 600;
  color: $text-tertiary;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  padding: 0 12px;
  border-bottom: 1px solid $border-color;
  background: $bg-sidebar;
  flex-shrink: 0;
  height: 30px;
  display: flex;
  align-items: center;
}

.ce-edit-split-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 0 12px;
  border-bottom: 1px solid $border-color;
  background: $bg-sidebar;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  color: $text-tertiary;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  height: 30px;
}

.ce-ai-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ce-template-select {
  width: 128px;
}

.ce-ai-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  border-radius: 5px;
  background: transparent;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--text {
    font-size: 11px;
    font-weight: 500;
    color: $text-secondary;
    padding: 3px 8px;
    text-transform: none;
    letter-spacing: 0;
    height: 22px;
    background: transparent;

    &:hover:not(:disabled) {
      background: rgba(0,0,0,0.06);
      color: $text-primary;
    }
  }

  &--icon {
    width: 26px;
    height: 26px;
    padding: 3px;
    background: #000;
    border-radius: 6px;

    &:hover:not(:disabled) {
      background: #222;
      transform: scale(1.05);
    }

    &.is-streaming {
      animation: ce-ai-pulse 1.2s ease-in-out infinite;
    }
  }
}

.ce-ai-icon {
  width: 18px;
  height: 18px;
  display: block;
}

@keyframes ce-ai-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ─── Compare Dialog ─── */

.ce-compare-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.ce-compare-dialog {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.1);
  width: calc(100vw - 80px);
  max-width: 1200px;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ce-compare-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  flex-shrink: 0;
}

.ce-compare-title {
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0;
}

.ce-compare-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.ce-compare-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ce-compare-pane-label {
  font-size: 10px;
  font-weight: 600;
  color: $text-tertiary;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  background: $bg-sidebar;
  flex-shrink: 0;
}

.ce-compare-pane-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.ce-compare-divider {
  width: 1px;
  background: rgba(0,0,0,0.08);
  flex-shrink: 0;
}

.ce-compare-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid rgba(0,0,0,0.08);
  flex-shrink: 0;
}

.ce-edit-monaco {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

// ─── Summary section ───

.ce-edit-summary-wrap {
  border: 1px solid $border-color;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100px;
  flex-shrink: 0;
}

.ce-edit-summary-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

.ce-edit-summary-monaco {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.ce-edit-summary-preview {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  background: #fff;
}

.ce-edit-md-preview {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  background: #fff;
}

.ce-edit-preview-empty {
  font-size: 13px;
  color: $text-tertiary;
  font-style: italic;
}

// ─── Refs / Images sections ───

.ce-edit-section { display: flex; flex-direction: column; gap: 6px; }

.ce-edit-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ce-edit-add-btn {
  border: none;
  background: transparent;
  font-size: 12px;
  color: $text-secondary;
  cursor: pointer;
  padding: 0;
  letter-spacing: -0.12px;

  &:hover { color: $text-primary; }
}

.ce-edit-empty {
  font-size: 12px;
  color: $text-tertiary;
  padding: 4px 0;
}

.ce-edit-ref-delete {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: $text-tertiary;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;

  &:hover { background: rgba(255, 59, 48, 0.08); color: #ff3b30; }
}

.ce-edit-img-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  background: $bg-sidebar;
  border: 1px solid $border-color;
}

.ce-edit-img-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.ce-edit-img-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ce-edit-img-name {
  font-size: 12px;
  color: $text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// ─── Edit Dialog Footer ───

.ce-edit-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid $border-color;
  flex-shrink: 0;
}

.ce-edit-footer-close {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: $bg-sidebar;
  color: $text-primary;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s;
  &:hover { background: $bg-hover; }
}

.ce-edit-footer-save {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #1d1d1f;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s;
  &:hover { background: #333; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

// ─── Form Prompt Dialog ───

.ce-form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.36);
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 34px;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.ce-form-dialog {
  width: min(1320px, calc(100vw - 68px));
  height: min(860px, calc(100vh - 68px));
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 32px 80px rgba(0, 0, 0, .22);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ce-form-header {
  height: 62px;
  padding: 0 18px 0 22px;
  border-bottom: 1px solid $border-color;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto minmax(220px, 1fr);
  align-items: center;
  gap: 16px;
  flex-shrink: 0;

  p,
  h2 {
    margin: 0;
  }

  p {
    font-size: 11px;
    color: $text-tertiary;
  }

  h2 {
    font-size: 16px;
  }
}

.ce-form-header-title {
  min-width: 0;
}

.ce-form-close {
  justify-self: end;
}

.ce-form-body {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 16px;
  padding: 16px;
  background:
    linear-gradient(90deg, rgba(29, 29, 31, .035) 1px, transparent 1px),
    linear-gradient(#f7f7f8, #f2f2f4);
  background-size: 22px 22px, auto;
  overflow: hidden;
}

.ce-form-pane {
  min-height: 0;
  max-height: 100%;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 4px 2px 2px;
  overscroll-behavior: contain;
}

.ce-form-grid {
  position: relative;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  background: #fff;
  border: 1px solid rgba(29, 29, 31, .14);
  border-left: 3px solid #6b7280;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .04), 0 10px 24px rgba(0, 0, 0, .035);

  label {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  span {
    font-size: 11px;
    color: $text-tertiary;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    button {
      border: none;
      background: transparent;
      color: #ff3b30;
      font-size: 11px;
      cursor: pointer;
      padding: 0;
    }
  }

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid $border-color;
    border-radius: 7px;
    padding: 7px 9px;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    resize: vertical;
  }
}

.ce-form-grid-wide {
  grid-column: 1 / -1;
}

.ce-purpose-field {
  span {
    color: $text-primary;
    font-size: 12px;
    font-weight: 700;
  }

  textarea {
    min-height: 104px;
    font-size: 13px;
    line-height: 1.6;
  }

  textarea:focus {
    border-color: rgba(29, 29, 31, .42);
    box-shadow: 0 0 0 3px rgba(29, 29, 31, .06);
  }
}

.ce-form-extra {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fff;
  border: 1px solid rgba(29, 29, 31, .14);
  border-left: 3px solid #9ca3af;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .035);

  span {
    font-size: 11px;
    color: $text-tertiary;
  }

  input,
  textarea {
    width: 100%;
    border: 1px solid $border-color;
    border-radius: 7px;
    padding: 8px 9px;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
  }

  textarea {
    resize: vertical;
  }

  input {
    border: 1px solid $border-color;
    border-radius: 7px;
    padding: 7px 9px;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
  }
}

.ce-optional-section,
.ce-field-section {
  background: #fff;
  border: 1px solid rgba(29, 29, 31, .14);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .035), 0 8px 18px rgba(0, 0, 0, .025);
}

.ce-optional-section {
  border-left: 3px solid #9ca3af;
  flex-shrink: 0;
  min-height: 54px;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.ce-optional-grid {
  min-height: 0;
  overflow: visible;
}

.ce-optional-empty {
  grid-column: 1 / -1;
  padding: 28px;
  color: $text-tertiary;
  text-align: center;
  font-size: 12px;
}

.ce-field-section {
  border-left: 3px solid #52525b;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.ce-optional-section > header {
  position: sticky;
  top: -1px;
  z-index: 8;
  margin-top: -1px;
  border-top: 1px solid rgba(29, 29, 31, .14);
  border-bottom: 1px solid rgba(0, 0, 0, .06);
  border-radius: 12px 12px 0 0;
  background: linear-gradient(180deg, #fff 0%, #fff 70%, #f8f8f9 100%);
}

.ce-optional-section > header,
.ce-field-section > header {
  border-bottom: 1px solid rgba(0, 0, 0, .06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: linear-gradient(180deg, #fff, #f8f8f9);

  span {
    font-size: 12px;
    font-weight: 600;
    color: $text-primary;
  }

  p {
    margin: 2px 0 0;
    font-size: 11px;
    color: $text-tertiary;
  }

  button {
    height: 26px;
    border: none;
    border-radius: 7px;
    background: #1d1d1f;
    color: #fff;
    padding: 0 9px;
    font-size: 12px;
    cursor: pointer;
  }
}

.ce-optional-section > header,
.ce-field-section > header {
  min-height: 36px;
  padding: 7px 12px;
}

.ce-field-section > header {
  position: sticky;
  top: -1px;
  z-index: 8;
  margin-top: -1px;
  border-top: 1px solid rgba(29, 29, 31, .14);
  border-bottom: 1px solid rgba(0, 0, 0, .06);
  border-radius: 12px 12px 0 0;
  background: linear-gradient(180deg, #fff 0%, #fff 70%, #f8f8f9 100%);
}

.ce-optional-section > header > div:last-child {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  button {
    background: #f2f2f7;
    color: $text-secondary;
  }
}

.ce-optional-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  padding: 14px;

  label {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .ce-optional-item {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid rgba(0, 0, 0, .12);
    border-radius: 10px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, .03);
    animation: ce-field-card-in .22s ease both;
  }

  span {
    font-size: 11px;
    color: $text-tertiary;
  }

  .ce-optional-label {
    min-height: 38px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px solid rgba(0, 0, 0, .06);
    background: #fafafa;

    span {
      font-size: 13px;
      font-weight: 600;
      color: $text-primary;
    }
  }

  input,
  textarea {
    width: 100%;
    border: 1px solid $border-color;
    border-radius: 7px;
    padding: 8px 9px;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    background: #fff;
  }

  textarea {
    resize: none;
  }
}

.ce-optional-item > .kb-expandable-textarea,
.ce-optional-item > .ce-action-input-group {
  padding: 14px;
}

.ce-optional-item > .ce-action-input-group + .ce-action-input-group {
  padding-top: 0;
}

.ce-action-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  span {
    font-size: 11px;
    color: $text-tertiary;
  }
}

.ce-optional-delete {
  @extend .ce-danger-text-btn;
}

.ce-danger-text-btn {
  height: 24px;
  min-width: 42px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(255, 59, 48, .24);
  border-radius: 6px;
  background: rgba(255, 59, 48, .08);
  color: #d70015;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition:
    background .15s ease,
    border-color .15s ease,
    color .15s ease;

  &:hover {
    background: #ff3b30;
    border-color: #ff3b30;
    color: #fff;
  }
}

.ce-field-empty {
  padding: 28px;
  color: $text-tertiary;
  text-align: center;
  font-size: 12px;
}

.ce-field-list {
  overflow: visible;
  overscroll-behavior: contain;
}

.ce-field-card {
  margin: 14px;
  border: 1px solid rgba(0, 0, 0, .12);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .03);
  animation: ce-field-card-in .22s ease both;
}

.ce-field-card-head {
  height: 38px;
  padding: 0 14px;
  border-bottom: 1px solid rgba(0, 0, 0, .06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fafafa;

  strong {
    font-size: 13px;
    color: $text-primary;
  }

  button { flex-shrink: 0; }
}

@keyframes ce-field-card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ce-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;

  label {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  span {
    font-size: 11px;
    color: $text-tertiary;
  }

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid $border-color;
    border-radius: 7px;
    padding: 0 9px;
    min-height: 34px;
    font-size: 12px;
    font-family: inherit;
    box-sizing: border-box;
    resize: vertical;
  }

  textarea {
    padding-top: 7px;
    padding-bottom: 7px;
  }
}

.ce-field-wide {
  grid-column: 1 / -1;
}

.ce-desc-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ce-control-insert-btn {
  height: 24px;
  padding: 0 9px;
  border: 1px solid rgba(29, 29, 31, .14);
  border-radius: 7px;
  background: #fff;
  color: rgba(29, 29, 31, .76);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition:
    background .15s ease,
    border-color .15s ease,
    color .15s ease;

  &:hover {
    border-color: #1d1d1f;
    background: #1d1d1f;
    color: #fff;
  }
}

.ce-column-name-row {
  display: flex;
  gap: 8px;
  align-items: stretch;

  input {
    flex: 1;
    min-width: 0;
  }
}

.ce-column-name-select {
  width: 104px;
  flex-shrink: 0;

  :deep(.csel-trigger) {
    min-height: 34px;
    height: 34px;
  }
}

.ce-form-preview {
  min-height: 0;
  background: #fff;
  border: 1px solid rgba(29, 29, 31, .16);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .04), 0 10px 24px rgba(0, 0, 0, .04);
}

.ce-list-visual {
  flex-shrink: 0;
  padding: 14px;
  border-bottom: 1px solid $border-color;
  background: #fafafa;
}

.ce-list-visual-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;

  strong {
    font-size: 13px;
    color: $text-primary;
  }

  span {
    font-size: 11px;
    color: $text-tertiary;
    background: #f2f2f7;
    border-radius: 999px;
    padding: 3px 8px;
  }
}

.ce-preview-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ce-preview-chip {
  max-width: 100%;
  height: 28px;
  padding: 0 10px;
  border: 1px solid rgba(0, 0, 0, .08);
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  background: #fff;
  color: $text-primary;
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color .15s ease,
    background .15s ease,
    box-shadow .15s ease;

  &:hover {
    border-color: rgba(29, 29, 31, .22);
    background: #f7f7f8;
    box-shadow: 0 1px 4px rgba(0, 0, 0, .06);
  }
}

.ce-list-visual-empty {
  margin: 0;
  color: $text-tertiary;
  font-size: 12px;
  border: 1px dashed $border-color;
  border-radius: 8px;
  padding: 22px 12px;
  text-align: center;
  background: #fff;
}

.ce-form-kind-tabs {
  justify-self: center;
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid rgba(29, 29, 31, .1);
  border-radius: 10px;
  background: #f3f3f4;

  button {
    height: 28px;
    border: none;
    border-radius: 7px;
    min-width: 58px;
    padding: 0 14px;
    background: transparent;
    color: $text-secondary;
    font-size: 12px;
    cursor: pointer;
    transition:
      background .16s ease,
      color .16s ease,
      box-shadow .16s ease,
      transform .16s ease;

    &.is-active {
      background: #fff;
      color: $text-primary;
      box-shadow: 0 1px 5px rgba(0, 0, 0, .11);
      transform: translateY(-1px);
    }
  }
}

.ce-form-pane-swap-enter-active,
.ce-form-pane-swap-leave-active {
  transition:
    opacity .18s ease,
    transform .18s ease;
}

.ce-form-pane-swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.ce-form-pane-swap-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.ce-form-preview-swap-enter-active,
.ce-form-preview-swap-leave-active {
  transition:
    opacity .16s ease,
    transform .16s ease;
}

.ce-form-preview-swap-enter-from {
  opacity: 0;
  transform: translateX(5px);
}

.ce-form-preview-swap-leave-to {
  opacity: 0;
  transform: translateX(-5px);
}

.ce-search-visual {
  flex-shrink: 0;
  padding: 14px;
  border-bottom: 1px solid $border-color;
  background: #fafafa;
}

.ce-search-visual-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;

  button {
    height: 28px;
    border: none;
    border-radius: 7px;
    padding: 0 12px;
    background: #1d1d1f;
    color: #fff;
    font-size: 12px;

    &.is-secondary {
      background: #f2f2f7;
      color: $text-secondary;
    }
  }
}

.ce-form-preview-header {
  height: 38px;
  padding: 0 12px;
  border-bottom: 1px solid $border-color;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;

  button {
    height: 26px;
    border: none;
    border-radius: 7px;
    background: #1d1d1f;
    color: #fff;
    padding: 0 10px;
    font-size: 12px;
    cursor: pointer;

    &:disabled {
      opacity: .5;
      cursor: not-allowed;
    }
  }
}

.ce-form-preview pre {
  flex: 1;
  min-height: 0;
  overflow: auto;
  margin: 0;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
  color: $text-secondary;
  font-size: 12px;
  line-height: 1.6;
}

.ce-form-footer {
  height: 56px;
  padding: 0 18px;
  border-top: 1px solid $border-color;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

// ─── Markdown Preview Dialog ───

.ce-md-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.36);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.ce-md-dialog {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 960px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.ce-md-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
  gap: 12px;
}

.ce-md-dialog-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.ce-md-dialog-accent {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  flex-shrink: 0;
}

.ce-md-dialog-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
  letter-spacing: -0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ce-md-dialog-type {
  font-size: 11px;
  font-weight: 500;
  color: $text-tertiary;
  background: $bg-sidebar;
  padding: 2px 7px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.ce-md-dialog-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: $text-tertiary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;

  &:hover { background: $bg-hover; color: $text-primary; }
}

.ce-md-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
}

.ce-md-empty {
  font-size: 14px;
  color: $text-tertiary;
  text-align: center;
  padding: 40px 0;
}

.ce-md-summary-block {
  background: #f8f8f8;
  border-radius: 8px;
  padding: 14px 16px 12px;
  margin-bottom: 8px;

  .ce-md-summary-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 8px;
  }

  .ce-md-content {
    font-size: 13px;
    color: $text-secondary;
  }
}

.ce-md-divider {
  height: 1px;
  background: $border-color;
  margin: 16px 0;
}

.ce-md-content {
  font-size: 14px;
  line-height: 1.75;
  color: $text-primary;
  letter-spacing: -0.14px;

  :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
    margin: 1.2em 0 0.4em;
    font-weight: 600;
    letter-spacing: -0.3px;
    line-height: 1.3;
    color: $text-primary;
    &:first-child { margin-top: 0; }
  }
  :deep(h1) { font-size: 22px; }
  :deep(h2) { font-size: 18px; }
  :deep(h3) { font-size: 15px; }
  :deep(h4) { font-size: 13px; }

  :deep(p) { margin: 0 0 0.9em; &:last-child { margin-bottom: 0; } }

  :deep(code) {
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
    font-size: 12.5px;
    background: $bg-sidebar;
    border: 1px solid $border-color;
    border-radius: 4px;
    padding: 1px 5px;
  }

  :deep(pre) {
    background: #f5f5f7;
    border: 1px solid $border-color;
    border-radius: 8px;
    padding: 14px 16px;
    overflow-x: auto;
    margin: 0.8em 0;
    code {
      background: none;
      border: none;
      padding: 0;
      font-size: 13px;
    }
  }

  :deep(ul), :deep(ol) {
    margin: 0 0 0.9em;
    padding-left: 1.5em;
    li { margin-bottom: 0.3em; }
  }

  :deep(blockquote) {
    margin: 0.8em 0;
    padding: 10px 16px;
    border-left: 3px solid rgba(0, 0, 0, 0.12);
    background: $bg-sidebar;
    border-radius: 0 6px 6px 0;
    color: $text-secondary;
  }

  :deep(a) { color: #0071e3; text-decoration: none; &:hover { text-decoration: underline; } }

  :deep(hr) {
    border: none;
    border-top: 1px solid $border-color;
    margin: 1.2em 0;
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin: 0.8em 0;
    th, td {
      border: 1px solid $border-color;
      padding: 7px 12px;
      text-align: left;
    }
    th { background: $bg-sidebar; font-weight: 600; }
    tr:hover td { background: rgba(0,0,0,0.015); }
  }
}

.ce-dialog-fade-enter-active { transition: opacity 0.18s ease; }
.ce-dialog-fade-leave-active { transition: opacity 0.14s ease; }
.ce-dialog-fade-enter-from,
.ce-dialog-fade-leave-to { opacity: 0; }
.ce-dialog-fade-enter-active .ce-md-dialog,
.ce-dialog-fade-enter-active .ce-edit-dialog { transition: transform 0.18s ease; }
.ce-dialog-fade-enter-from .ce-md-dialog,
.ce-dialog-fade-enter-from .ce-edit-dialog { transform: scale(0.96) translateY(8px); }

// ─── Summary document (compact mode) ───
.ce-summary-doc-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: linear-gradient(180deg, #fbfbfd 0%, #f5f5f7 100%);
  padding: 32px 24px 64px;
}

.ce-summary-doc {
  max-width: 760px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid $border-color;
  border-radius: 14px;
  padding: 36px 40px 44px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03), 0 8px 24px rgba(0, 0, 0, 0.04);
}

.ce-summary-doc-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid $border-color;
  margin-bottom: 24px;
}

.ce-summary-doc-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: $text-primary;
  margin: 0;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.ce-summary-doc-type {
  font-size: 12px;
  font-weight: 500;
  color: $text-secondary;
  background: $bg-sidebar;
  border: 1px solid $border-color;
  padding: 2px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.ce-summary-doc-section {
  margin-bottom: 32px;
  &:last-child { margin-bottom: 0; }
}

.ce-summary-doc-h2 {
  font-size: 13px;
  font-weight: 600;
  color: $text-secondary;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin: 0 0 14px;
}

.ce-summary-doc-empty {
  margin: 0;
  font-size: 13px;
  color: #9b9b9f;
  font-style: italic;
}

.ce-summary-doc-empty--center {
  text-align: center;
  padding: 24px 0;
}

.ce-summary-doc-warn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  background: rgba(255, 159, 10, 0.08);
  border: 1px solid rgba(255, 159, 10, 0.28);
  border-radius: 10px;
}

.ce-summary-doc-warn-text {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #8a4a00;
  flex: 1;
  min-width: 0;
}

.ce-summary-doc-warn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ff9f0a;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.ce-summary-doc-warn-btn {
  flex-shrink: 0;
  padding: 6px 14px;
  background: #1d1d1f;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, transform 0.08s;

  &:hover { background: #000; }
  &:active { transform: scale(0.97); }
}

.ce-summary-block {
  position: relative;
  margin-bottom: 18px;
  padding: 18px 20px;
  background: #fcfcfd;
  border: 1px solid $border-color;
  border-radius: 10px;
  &:last-child { margin-bottom: 0; }
}

.ce-summary-block-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.08);
}

.ce-summary-block-accent {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  flex-shrink: 0;
}

.ce-summary-block-name {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.2px;
  color: $text-primary;
  word-break: break-word;
}

.ce-summary-block-type {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.04);
  white-space: nowrap;
}

.ce-summary-block-summary,
.ce-summary-block-content {
  margin-top: 12px;
  &:first-of-type { margin-top: 0; }
}

.ce-summary-block-summary {
  padding: 10px 14px;
  background: rgba(0, 113, 227, 0.04);
  border-left: 3px solid rgba(0, 113, 227, 0.4);
  border-radius: 0 6px 6px 0;
}

.ce-summary-block-summary--empty,
.ce-summary-block-content--empty {
  background: transparent;
  border-left: none;
  padding: 0;
}

.ce-summary-block-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: $text-secondary;
  margin-bottom: 6px;
}
</style>
