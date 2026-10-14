import { assert, validateSchema, documentOperation } from './schema.js';
const copy = value => structuredClone(value);
function locate(items, id, label) { const value = items?.find(item => item.id === id); assert(value, 'NOT_FOUND', `${label}不存在：${id}`); return value; }
function insertAfter(items, value, afterId) {
  assert(!items.some(item => item.id === value.id), 'INVALID_PARAMS', `ID 已存在：${value.id}`);
  const at = afterId === null ? -1 : afterId === undefined ? items.length - 1 : items.findIndex(item => item.id === afterId);
  assert(afterId == null || at >= 0, 'NOT_FOUND', `定位点不存在：${afterId}`); items.splice(at + 1, 0, value);
}
export function editDocument(document, operations) {
  const next = copy(document);
  for (const op of operations) {
    validateSchema(op, documentOperation);
    if (op.op === 'set_page') { next.page = { ...next.page, ...op.patch }; next.pageManual = true; continue; }
    if (op.op === 'insert_block') { insertAfter(next.blocks, { ...copy(op.block), manualOverride: true }, op.afterId); continue; }
    const block = locate(next.blocks, op.blockId, '正文块');
    if (op.op === 'restore_auto') {
      assert(block.automatic, 'NO_AUTOMATIC_CONTENT', '该块没有自动内容');
      Object.assign(block, copy(block.automatic), { manualOverride: false }); delete block.editedCells; delete block.structureOverride; delete block.manualOperations; delete block.removed; continue;
    }
    block.manualOverride = true;
    if (op.op !== 'move_block') { block.manualOperations ||= []; block.manualOperations.push(copy(op)); }
    if (op.op === 'remove_block') { block.visible = false; block.removed = true; continue; }
    if (op.op === 'move_block') {
      assert(op.afterId !== block.id, 'INVALID_PARAMS', '不能移动到自身之后'); next.blocks.splice(next.blocks.indexOf(block), 1); insertAfter(next.blocks, block, op.afterId); next.orderManual = true; continue;
    }
    if (op.op === 'update_block') { Object.assign(block, copy(op.patch)); if (op.patch.rows) block.structureOverride = true; continue; }
    if (op.op === 'replace_text') {
      const positions = [];
      const scan = (target, key, description) => { if (typeof target[key] === 'string') { let at = -1; while ((at = target[key].indexOf(op.find, at + 1)) >= 0) positions.push({ target, key, at, description }); } };
      scan(block, 'content', block.id); for (const row of block.rows || []) for (const cell of row.cells) scan(cell, 'content', `${row.id}/${cell.id}`);
      assert(positions.length === 1, positions.length ? 'AMBIGUOUS_TARGET' : 'NOT_FOUND', '文本替换必须唯一命中', { candidates: positions.map(p => p.description) });
      const hit = positions[0]; hit.target[hit.key] = hit.target[hit.key].slice(0, hit.at) + op.replacement + hit.target[hit.key].slice(hit.at + op.find.length); block.structureOverride = true; continue;
    }
    assert(['table', 'keyValueTable'].includes(block.type), 'INVALID_PARAMS', '该操作需要表格块');
    if (op.op === 'set_cell') {
      const row = locate(block.rows, op.rowId, '表格行'), cell = locate(row.cells, op.cellId, '单元格');
      Object.assign(cell, copy(op.patch)); block.editedCells ||= {}; block.editedCells[`${row.id}/${cell.id}`] = true; continue;
    }
    block.structureOverride = true;
    if (op.op === 'insert_row') insertAfter(block.rows, copy(op.row), op.afterId);
    if (op.op === 'remove_row') block.rows.splice(block.rows.indexOf(locate(block.rows, op.rowId, '表格行')), 1);
    if (op.op === 'insert_column') {
      for (const row of block.rows) insertAfter(row.cells, { id: op.columnId, content: op.content || '', style: { width: op.width || 1500 } }, op.afterCellId);
      block.style.columnWidths = block.rows[0]?.cells.map(cell => cell.style?.width || 1500);
    }
    if (op.op === 'remove_column') {
      for (const row of block.rows) row.cells.splice(row.cells.indexOf(locate(row.cells, op.cellId, '列单元格')), 1);
      block.style.columnWidths = block.rows[0]?.cells.map(cell => cell.style?.width || 1500);
    }
    if (op.op === 'merge_cells') {
      assert(op.rowIds.length && op.cellIds.length, 'INVALID_PARAMS', '请选择要合并的连续矩形区域');
      const indexes = op.rowIds.map(id => block.rows.indexOf(locate(block.rows, id, '表格行')));
      assert(indexes.every((value, index) => !index || value === indexes[index - 1] + 1), 'INVALID_PARAMS', '合并行必须连续');
      for (const [index, rowId] of op.rowIds.entries()) {
        const row = locate(block.rows, rowId, '表格行'); const cells = op.cellIds.map(id => locate(row.cells, id, '单元格'));
        const starts = cells.map(cell => row.cells.indexOf(cell));
        assert(starts.every((value, i) => !i || value === starts[i - 1] + 1), 'INVALID_PARAMS', '合并列必须连续');
        const first = cells[0]; first.style = { ...first.style, gridSpan: cells.reduce((n, c) => n + (c.style?.gridSpan || 1), 0), ...(op.rowIds.length > 1 ? { vMerge: index ? 'continue' : 'restart' } : {}) };
        first.content = index ? '' : cells.map(c => c.content).filter(Boolean).join('\n'); row.cells.splice(starts[0] + 1, cells.length - 1);
      }
    }
  }
  assert(next.blocks.length <= 10000, 'INVALID_PARAMS', '报告正文块过多'); return next;
}
export function mergeDocument(previous, generated) {
  if (!previous) return generated;
  const next = copy(generated), automatic = new Map(next.blocks.map(block => [block.id, block]));
  const merged = previous.blocks.map(old => {
    const fresh = automatic.get(old.id); automatic.delete(old.id);
    if (!fresh) { assert(!old.binding || !old.manualOverride, 'DOCUMENT_MERGE_CONFLICT', `自动块 ${old.id} 已不存在；旧报告完整保留`, { blockId: old.id }); return copy(old); }
    if (!old.manualOverride) return fresh;
    if (old.manualOperations?.length) {
      try { return editDocument({ blocks: [fresh] }, old.manualOperations).blocks[0]; }
      catch (error) { assert(false, 'DOCUMENT_MERGE_CONFLICT', `正文块 ${old.id} 的手工修改无法应用到新数据，旧报告完整保留`, { blockId: old.id, cause: error.message }); }
    }
    if (old.editedCells && !old.structureOverride) {
      for (const key of Object.keys(old.editedCells)) {
        const [rowId, cellId] = key.split('/');
        const from = old.rows.find(row => row.id === rowId)?.cells.find(cell => cell.id === cellId);
        const to = fresh.rows.find(row => row.id === rowId)?.cells.find(cell => cell.id === cellId);
        assert(from && to, 'DOCUMENT_MERGE_CONFLICT', `手工修改的单元格 ${key} 已不在新数据中；旧报告完整保留`, { blockId: old.id, cell: key });
        Object.assign(to, copy(from));
      }
      return { ...fresh, manualOverride: true, editedCells: copy(old.editedCells), visible: old.visible, style: copy(old.style) };
    }
    return { ...copy(old), automatic: copy(fresh.automatic) };
  });
  next.blocks = [...merged, ...automatic.values()];
  if (previous.pageManual) { next.page = copy(previous.page); next.pageManual = true; }
  next.orderManual = previous.orderManual; return next;
}
export function templateFromDocument(document) {
  const result = copy(document);
  delete result.workspaceId; delete result.snapshotId; delete result.id; delete result.environmentId;
  result.blocks = result.blocks.map(block => {
    if (block.binding) return { id: block.id, binding: block.binding, type: block.type, style: block.style, visible: block.visible, templateBinding: true, manualOperations: block.manualOperations || [] };
    const next = { ...block }; delete next.automatic; delete next.sourceRevision; return next;
  }); return result;
}
export function applyTemplate(generated, template) {
  if (!template) return generated;
  const map = new Map(generated.blocks.map(block => [block.id, block]));
  const blocks = template.blocks.map(block => {
    const fresh = map.get(block.id); map.delete(block.id);
    return block.templateBinding && fresh ? editDocument({ blocks: [{ ...fresh, style: block.style, visible: block.visible }] }, block.manualOperations || []).blocks[0] : { ...copy(block), ...(fresh ? { automatic: fresh.automatic } : {}) };
  }); return { ...generated, page: template.page || generated.page, blocks: [...blocks, ...map.values()] };
}
