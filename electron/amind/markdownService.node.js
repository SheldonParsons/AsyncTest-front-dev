/**
 * Markdown ↔ Mind-map conversion service.
 *
 * Export: AmindDoc → Markdown (heading-based hierarchy)
 * Import: Markdown → AmindDoc (parse headings + list items into node tree)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AMIND_SCHEMA_VERSION } from './constants.js';

// ─── Export: Doc → Markdown ────────────────────────

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

/**
 * Recursively render a node and its children as Markdown.
 * - depth 0 (root) → `# title`
 * - depth 1..5 → `## .. ######`
 * - depth 6+ → bullet list with indentation
 */
function renderNode(nodeId, nodes, depth) {
  const node = nodes[nodeId];
  if (!node) return '';
  const text = getPlainText(node) || '(empty)';
  const children = Array.isArray(node.children) ? node.children : [];

  let line = '';
  if (depth <= 5) {
    const hashes = '#'.repeat(depth + 1);
    line = `${hashes} ${text}\n`;
  } else {
    const indent = '  '.repeat(depth - 6);
    line = `${indent}- ${text}\n`;
  }

  let childrenMd = '';
  for (const childId of children) {
    childrenMd += renderNode(childId, nodes, depth + 1);
  }

  if (depth <= 5 && childrenMd) {
    return `${line}\n${childrenMd}`;
  }
  return `${line}${childrenMd}`;
}

export function docToMarkdown(doc) {
  if (!doc?.mind?.minds) return '# 思维导图\n';

  const activeMindId = doc.mind.activeMindId || doc.mind.order?.[0];
  const board = activeMindId ? doc.mind.minds[activeMindId] : null;
  if (!board) return '# 思维导图\n';

  const nodes = board.nodes || {};
  const roots = Array.isArray(board.roots) ? board.roots : [];
  if (!roots.length) return '# 思维导图\n';

  let md = '';
  for (const root of roots) {
    md += renderNode(root.rootId, nodes, 0);
  }
  return md;
}

// ─── Import: Markdown → Doc ────────────────────────

/**
 * Parse markdown text into a tree of { text, children[] }.
 *
 * Rules:
 * - `# heading` becomes the root node (or top-level nodes)
 * - `## .. ######` become child nodes at corresponding depth
 * - `- item` / `* item` become child nodes (list depth adds to heading depth)
 * - Plain text lines are merged into the parent node's text
 */
function parseMarkdown(mdText) {
  const lines = mdText.split(/\r?\n/);
  // virtualRoot holds all top-level items
  const virtualRoot = { text: '', children: [] };
  // Stack tracks [ { node, depth } ] for nesting
  const stack = [{ node: virtualRoot, depth: -1 }];

  function currentParent() {
    return stack[stack.length - 1];
  }

  function pushChild(text, depth) {
    const child = { text: text.trim(), children: [] };
    // Pop stack until we find a parent with lesser depth
    while (stack.length > 1 && currentParent().depth >= depth) {
      stack.pop();
    }
    currentParent().node.children.push(child);
    stack.push({ node: child, depth });
    return child;
  }

  for (const rawLine of lines) {
    const line = rawLine;

    // Heading: # .. ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const depth = headingMatch[1].length - 1; // # = 0, ## = 1, etc.
      pushChild(headingMatch[2], depth);
      continue;
    }

    // List item: - or * (with indentation)
    const listMatch = line.match(/^(\s*)([-*+])\s+(.+)/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const listDepth = 6 + Math.floor(indent / 2); // list items start at depth 6
      pushChild(listMatch[3], listDepth);
      continue;
    }

    // Non-empty plain line → append to current node
    const trimmed = line.trim();
    if (trimmed && stack.length > 1) {
      const current = currentParent().node;
      current.text = current.text ? `${current.text}\n${trimmed}` : trimmed;
    }
  }

  return virtualRoot;
}

function buildNodeTree(parsedNode, parentId, nodesOut) {
  const nodeId = parentId ? randomUUID().slice(0, 12) : 'root';
  const childrenIds = [];

  for (const child of parsedNode.children) {
    const childId = buildNodeTree(child, nodeId, nodesOut);
    childrenIds.push(childId);
  }

  nodesOut[nodeId] = {
    id: nodeId,
    text: parsedNode.text || '思维导图',
    children: childrenIds,
    images: [],
  };

  return nodeId;
}

export function markdownToDoc(mdText, fileName) {
  const parsed = parseMarkdown(mdText);

  // If the MD has exactly one top-level item, use it as root.
  // Otherwise, create a synthetic root.
  let rootParsed;
  if (parsed.children.length === 1) {
    rootParsed = parsed.children[0];
  } else if (parsed.children.length > 1) {
    rootParsed = {
      text: fileName ? path.basename(fileName, '.md') : '思维导图',
      children: parsed.children,
    };
  } else {
    rootParsed = {
      text: fileName ? path.basename(fileName, '.md') : '思维导图',
      children: [],
    };
  }

  const nodes = {};
  buildNodeTree(rootParsed, null, nodes);

  const title = rootParsed.text || '思维导图';
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

// ─── File I/O helpers ──────────────────────────────

export async function readMarkdownFile(filePath) {
  const abs = path.resolve(filePath);
  const content = await fs.readFile(abs, 'utf-8');
  return { path: abs, content };
}

export async function writeMarkdownFile(filePath, mdContent) {
  const abs = path.resolve(filePath);
  await fs.writeFile(abs, mdContent, 'utf-8');
  return { path: abs };
}
