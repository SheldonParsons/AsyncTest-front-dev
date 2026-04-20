/**
 * JSON import/export service for mind-map documents.
 *
 * Export: active board's node tree → clean JSON (text + children hierarchy)
 * Import: JSON node tree → AmindDoc
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AMIND_SCHEMA_VERSION } from './constants.js';

// ─── helpers ───────────────────────────────────────

function getPlainText(node) {
  if (!node || typeof node !== 'object') return '';
  if (typeof node.text === 'string') return node.text.trim();
  if (node.text && typeof node.text === 'object' && typeof node.text.plain === 'string') {
    return node.text.plain.trim();
  }
  if (typeof node.textPlain === 'string') return node.textPlain.trim();
  if (typeof node.title === 'string') return node.title.trim();
  return '';
}

// ─── Export: Doc → JSON (active board node tree) ───

function buildNodeTree(nodeId, nodes) {
  const node = nodes[nodeId];
  if (!node) return null;
  const text = getPlainText(node) || '';
  const children = Array.isArray(node.children) ? node.children : [];
  const result = { text };
  if (children.length) {
    result.children = children
      .map((childId) => buildNodeTree(childId, nodes))
      .filter(Boolean);
  }
  return result;
}

export function docToJson(doc) {
  if (!doc?.mind?.minds) return JSON.stringify({ text: '思维导图' }, null, 2);

  const activeMindId = doc.mind.activeMindId || doc.mind.order?.[0];
  const board = activeMindId ? doc.mind.minds[activeMindId] : null;
  if (!board) return JSON.stringify({ text: '思维导图' }, null, 2);

  const nodes = board.nodes || {};
  const roots = Array.isArray(board.roots) ? board.roots : [];
  if (!roots.length) return JSON.stringify({ text: '思维导图' }, null, 2);

  if (roots.length === 1) {
    const tree = buildNodeTree(roots[0].rootId, nodes);
    return JSON.stringify(tree || { text: '思维导图' }, null, 2);
  }

  const trees = roots
    .map((r) => buildNodeTree(r.rootId, nodes))
    .filter(Boolean);
  return JSON.stringify(trees, null, 2);
}

// ─── Import: JSON → Doc ────────────────────────────

function flattenToNodes(parsedNode, parentId, nodesOut) {
  const nodeId = parentId ? randomUUID().slice(0, 12) : 'root';
  const children = Array.isArray(parsedNode.children) ? parsedNode.children : [];
  const childrenIds = [];

  for (const child of children) {
    if (!child || typeof child !== 'object') continue;
    const childId = flattenToNodes(child, nodeId, nodesOut);
    childrenIds.push(childId);
  }

  nodesOut[nodeId] = {
    id: nodeId,
    text: typeof parsedNode.text === 'string' ? parsedNode.text : '思维导图',
    children: childrenIds,
    images: [],
  };

  return nodeId;
}

function createEmptyBoard(id, title) {
  return {
    id,
    title,
    roots: [{
      rootId: 'root',
      pos: { x: 200, y: 140 },
      layout: { direction: 'right', hGap: 60, vGap: 18 },
    }],
    nodes: {
      root: { id: 'root', text: title, children: [], images: [] },
    },
    relations: [],
    view: { viewport: {} },
  };
}

export function jsonToDoc(jsonText, fileName) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`JSON 解析失败: ${err.message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSON 内容不是有效的节点数据');
  }

  // Support single root object or array of roots
  let rootParsed;
  if (Array.isArray(parsed)) {
    if (!parsed.length) throw new Error('JSON 数组为空');
    rootParsed = {
      text: fileName ? path.basename(fileName, '.json') : '思维导图',
      children: parsed,
    };
  } else {
    rootParsed = parsed;
  }

  const nodes = {};
  flattenToNodes(rootParsed, null, nodes);

  const title = (typeof rootParsed.text === 'string' && rootParsed.text) || '思维导图';
  const now = new Date().toISOString();

  return {
    manifest: {
      schemaVersion: AMIND_SCHEMA_VERSION,
      app: 'AsyncTest Mind',
      createdAt: now,
      updatedAt: now,
      title,
      renderStylePreset: 'clean',
    },
    mind: {
      version: 1,
      activeMindId: 'mind-1',
      order: ['mind-1', 'mind-2', 'mind-3'],
      minds: {
        'mind-1': {
          id: 'mind-1',
          title,
          roots: [{
            rootId: 'root',
            pos: { x: 200, y: 140 },
            layout: { direction: 'right', hGap: 60, vGap: 18 },
          }],
          nodes,
          relations: [],
          view: { viewport: {} },
        },
        'mind-2': createEmptyBoard('mind-2', '画板 2'),
        'mind-3': createEmptyBoard('mind-3', '画板 3'),
      },
    },
  };
}

// ─── File I/O ──────────────────────────────────────

export async function readJsonFile(filePath) {
  const abs = path.resolve(filePath);
  const content = await fs.readFile(abs, 'utf-8');
  return { path: abs, content };
}

export async function writeJsonFile(filePath, jsonContent) {
  const abs = path.resolve(filePath);
  await fs.writeFile(abs, jsonContent, 'utf-8');
  return { path: abs };
}
