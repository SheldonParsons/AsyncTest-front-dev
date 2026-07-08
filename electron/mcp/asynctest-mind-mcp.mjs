#!/usr/bin/env node
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

function getEndpoint() {
  return getEndpoints()[0];
}

function getEndpoints() {
  if (process.platform === 'win32') {
    return [
      { type: 'pipe', path: '\\\\.\\pipe\\asynctest-mind-mcp' },
      { type: 'tcp', host: '127.0.0.1', port: 37651 },
    ];
  }
  const baseDir = process.platform === 'darwin' ? '/private/tmp' : os.tmpdir();
  return [
    { type: 'socket', path: path.join(baseDir, 'asynctest-mind-mcp.sock') },
    { type: 'tcp', host: '127.0.0.1', port: 37651 },
  ];
}

const tools = [
  {
    name: 'mind_get_app_status',
    description: 'Check whether AsyncTest Mind bridge is available and list currently open Mind windows.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    bridgeMethod: 'mind.status',
  },
  {
    name: 'mind_get_recent_files',
    description: 'Get recently opened .amind files from AsyncTest.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    bridgeMethod: 'mind.recentFiles',
  },
  {
    name: 'mind_create_window',
    description: 'Create a new unsaved AsyncTest Mind window.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Optional document title.' },
      },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.createWindow',
  },
  {
    name: 'mind_list_windows',
    description: 'List currently open AsyncTest Mind windows.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    bridgeMethod: 'mind.listWindows',
  },
  {
    name: 'mind_get_active_window',
    description: 'Get the currently focused AsyncTest Mind window, or the first open Mind window.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    bridgeMethod: 'mind.getActiveWindow',
  },
  {
    name: 'mind_get_document_outline',
    description: 'Read a lightweight outline of an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        depth: { type: 'number', description: 'Optional max depth. Omit for all levels.' },
      },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.getDocumentOutline',
  },
  {
    name: 'mind_get_window_document',
    description: 'Get document metadata for an open Mind window.',
    inputSchema: {
      type: 'object',
      properties: { windowKey: { type: 'string' } },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.getWindowDocument',
  },
  {
    name: 'mind_get_node',
    description: 'Read one node from an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        nodeId: { type: 'string' },
        includeNotes: { type: 'boolean' },
        includeImages: { type: 'boolean' },
        includeMetadata: { type: 'boolean' },
      },
      required: ['nodeId'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.getNode',
  },
  {
    name: 'mind_get_nodes',
    description: 'Read multiple nodes from an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        nodeIds: { type: 'array', items: { type: 'string' } },
        includeNotes: { type: 'boolean' },
        includeImages: { type: 'boolean' },
        includeMetadata: { type: 'boolean' },
      },
      required: ['nodeIds'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.getNodes',
  },
  {
    name: 'mind_get_subtree',
    description: 'Read a node and descendants from an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        nodeId: { type: 'string' },
        depth: { type: 'number' },
        includeNotes: { type: 'boolean' },
        includeImages: { type: 'boolean' },
        includeMetadata: { type: 'boolean' },
      },
      required: ['nodeId'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.getSubtree',
  },
  {
    name: 'mind_get_parent_chain',
    description: 'Read the path from a node to the root in an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        nodeId: { type: 'string' },
        includeNotes: { type: 'boolean' },
        includeImages: { type: 'boolean' },
        includeMetadata: { type: 'boolean' },
      },
      required: ['nodeId'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.getParentChain',
  },
  {
    name: 'mind_get_children',
    description: 'Read direct children of a node in an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        nodeId: { type: 'string' },
        includeContent: { type: 'boolean' },
        includeNotes: { type: 'boolean' },
        includeImages: { type: 'boolean' },
        includeMetadata: { type: 'boolean' },
      },
      required: ['nodeId'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.getChildren',
  },
  {
    name: 'mind_search_nodes',
    description: 'Search node text and notes in an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        query: { type: 'string' },
        limit: { type: 'number' },
        caseSensitive: { type: 'boolean' },
        includeNotes: { type: 'boolean' },
        includeImages: { type: 'boolean' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.searchNodes',
  },
  {
    name: 'mind_find_nodes_by_filter',
    description: 'Find nodes by structured filters in an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        hasNote: { type: 'boolean' },
        hasImage: { type: 'boolean' },
        hasChildren: { type: 'boolean' },
        textIncludes: { type: 'string' },
        limit: { type: 'number' },
        includeNotes: { type: 'boolean' },
        includeImages: { type: 'boolean' },
        includeMetadata: { type: 'boolean' },
      },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.findNodesByFilter',
  },
  {
    name: 'mind_get_selection',
    description: 'Get selected node ids in an open Mind window.',
    inputSchema: {
      type: 'object',
      properties: { windowKey: { type: 'string' } },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.getSelection',
  },
  {
    name: 'mind_set_selection',
    description: 'Select nodes in an open Mind window.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        nodeIds: { type: 'array', items: { type: 'string' } },
        primaryId: { type: 'string' },
      },
      required: ['nodeIds'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.setSelection',
  },
  {
    name: 'mind_update_node_text',
    description: 'Update node text in an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        nodeId: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['nodeId', 'text'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.updateNodeText',
  },
  {
    name: 'mind_update_node_note',
    description: 'Update node note in an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        nodeId: { type: 'string' },
        note: { type: 'string' },
      },
      required: ['nodeId', 'note'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.updateNodeNote',
  },
  {
    name: 'mind_update_node_metadata',
    description: 'Patch node metadata such as icon, collapsed, markers, style, secrecy, or arbitrary extra fields.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        nodeId: { type: 'string' },
        metadata: { type: 'object' },
      },
      required: ['nodeId', 'metadata'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.updateNodeMetadata',
  },
  {
    name: 'mind_create_node',
    description: 'Create a child node in an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        parentId: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['parentId', 'text'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.createNode',
  },
  {
    name: 'mind_create_nodes',
    description: 'Create multiple child nodes or a small tree under a parent node.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        parentId: { type: 'string' },
        nodes: { type: 'array', items: { type: 'object' } },
      },
      required: ['parentId', 'nodes'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.createNodes',
  },
  {
    name: 'mind_delete_node',
    description: 'Delete a node in an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        nodeId: { type: 'string' },
        deleteSubtree: { type: 'boolean' },
      },
      required: ['nodeId'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.deleteNode',
  },
  {
    name: 'mind_move_node',
    description: 'Move a node under a new parent and optionally choose an insertion index.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        nodeId: { type: 'string' },
        newParentId: { type: 'string' },
        index: { type: 'number' },
      },
      required: ['nodeId', 'newParentId'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.moveNode',
  },
  {
    name: 'mind_copy_subtree',
    description: 'Copy a subtree under a new parent and return the new node id map.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        nodeId: { type: 'string' },
        newParentId: { type: 'string' },
        index: { type: 'number' },
      },
      required: ['nodeId', 'newParentId'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.copySubtree',
  },
  {
    name: 'mind_apply_node_operations',
    description: 'Apply multiple node operations to an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        operations: { type: 'array', items: { type: 'object' } },
        saveAfterApply: { type: 'boolean' },
      },
      required: ['operations'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.applyNodeOperations',
  },
  {
    name: 'mind_save_document',
    description: 'Save an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: { windowKey: { type: 'string' } },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.saveDocument',
  },
  {
    name: 'mind_read_open_document',
    description: 'Read content from an open Mind document, including unsaved changes.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        mode: { type: 'string', enum: ['outline', 'node', 'subtree', 'search', 'rawJson'] },
        nodeId: { type: 'string' },
        query: { type: 'string' },
        depth: { type: 'number' },
        includeNotes: { type: 'boolean' },
        includeImages: { type: 'boolean' },
        includeMetadata: { type: 'boolean' },
        limit: { type: 'number' },
        format: { type: 'string', enum: ['json', 'markdown'] },
      },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.readOpenDocument',
  },
  {
    name: 'mind_export_document',
    description: 'Export an open Mind document as outline JSON, markdown, or raw JSON.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        format: { type: 'string', enum: ['outline', 'markdown', 'rawJson'] },
        depth: { type: 'number' },
      },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.exportDocument',
  },
  {
    name: 'mind_read_file',
    description: 'Read .amind or .xmind file content without opening a window.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        mode: { type: 'string', enum: ['outline', 'node', 'subtree', 'search', 'rawJson'] },
        nodeId: { type: 'string' },
        query: { type: 'string' },
        depth: { type: 'number' },
        includeNotes: { type: 'boolean' },
        includeImages: { type: 'boolean' },
        includeMetadata: { type: 'boolean' },
        limit: { type: 'number' },
      },
      required: ['filePath'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.readFile',
  },
  {
    name: 'mind_read_file_outline',
    description: 'Read a lightweight outline from a .amind or .xmind file without opening it.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        depth: { type: 'number' },
        format: { type: 'string', enum: ['json', 'markdown'] },
      },
      required: ['filePath'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.readFileOutline',
  },
  {
    name: 'mind_read_file_subtree',
    description: 'Read a subtree from a .amind or .xmind file without opening it.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        nodeId: { type: 'string' },
        depth: { type: 'number' },
        includeNotes: { type: 'boolean' },
        includeImages: { type: 'boolean' },
        includeMetadata: { type: 'boolean' },
      },
      required: ['filePath', 'nodeId'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.readFileSubtree',
  },
  {
    name: 'mind_search_file_nodes',
    description: 'Search nodes in a .amind or .xmind file without opening it.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        query: { type: 'string' },
        limit: { type: 'number' },
        includeNotes: { type: 'boolean' },
        includeImages: { type: 'boolean' },
      },
      required: ['filePath', 'query'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.searchFileNodes',
  },
  {
    name: 'mind_focus_window',
    description: 'Focus an open AsyncTest Mind window.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
      },
      required: ['windowKey'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.focusWindow',
  },
  {
    name: 'mind_close_window',
    description: 'Save and close a specific AsyncTest Mind window.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
      },
      required: ['windowKey'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.closeWindow',
  },
  {
    name: 'mind_close_all_windows',
    description: 'Save and close all open AsyncTest Mind windows.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    bridgeMethod: 'mind.closeAllWindows',
  },
  {
    name: 'mind_open_amind_file',
    description: 'Open a specified .amind file in a Mind window.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
      },
      required: ['filePath'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.openAmindFile',
  },
  {
    name: 'mind_open_xmind_file',
    description: 'Import a specified .xmind file and open it in a new Mind window.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
      },
      required: ['filePath'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.openXmindFile',
  },
];

const toolByName = new Map(tools.map((tool) => [tool.name, tool]));
let bridgeRequestId = 1;
const FILE_BRIDGE_TIMEOUT_MS = 45000;
const FILE_BRIDGE_POLL_MS = 80;

async function appendDebugLog(message, detail) {
  try {
    const line = JSON.stringify({
      time: new Date().toISOString(),
      pid: process.pid,
      message,
      ...(detail === undefined ? {} : { detail }),
    });
    await fs.appendFile(path.join(os.tmpdir(), 'asynctest-mind-mcp.log'), `${line}\n`, 'utf8');
  } catch {
    // Logging must never break the stdio transport.
  }
}

function getFileBridgeDir() {
  return path.join(os.tmpdir(), 'asynctest-mind-mcp-bridge');
}

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function writeResult(id, result) {
  writeMessage({ jsonrpc: '2.0', id, result });
}

function writeError(id, code, message, data) {
  writeMessage({
    jsonrpc: '2.0',
    id,
    error: { code, message, ...(data === undefined ? {} : { data }) },
  });
}

function sanitizeForMcpOutput(value) {
  if (typeof value === 'string') {
    if (value.startsWith('data:') && value.includes(';base64,')) return null;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForMcpOutput(item));
  }
  if (!value || typeof value !== 'object') return value;

  const result = {};
  for (const [key, childValue] of Object.entries(value)) {
    if (key.toLowerCase().endsWith('url') && typeof childValue === 'string' && childValue.startsWith('data:')) {
      result[key] = null;
      continue;
    }
    result[key] = sanitizeForMcpOutput(childValue);
  }
  return result;
}

function callBridge(method, params = {}) {
  const endpoints = getEndpoints();
  const id = bridgeRequestId++;

  function tryEndpoint(index, lastError) {
    const endpoint = endpoints[index];
    if (!endpoint) {
      return Promise.reject(lastError || new Error('Cannot connect to AsyncTest. Open AsyncTest first.'));
    }

    return new Promise((resolve, reject) => {
    const socket = endpoint.type === 'tcp'
      ? net.createConnection(endpoint.port, endpoint.host)
      : net.createConnection(endpoint.path);
    let buffer = '';
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      fn(value);
    };

    socket.setTimeout(10000, () => {
      finish(reject, new Error('Timed out connecting to AsyncTest. Open AsyncTest first.'));
    });

    socket.on('connect', () => {
      socket.write(`${JSON.stringify({ id, method, params })}\n`);
    });

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex < 0) return;
      const line = buffer.slice(0, newlineIndex).trim();
      if (!line) return;
      try {
        const response = JSON.parse(line);
        if (response.ok) finish(resolve, response.result);
        else finish(reject, new Error(response.error?.message || 'AsyncTest bridge request failed'));
      } catch (error) {
        finish(reject, error);
      }
    });

    socket.on('error', () => {
      finish(reject, new Error('Cannot connect to AsyncTest. Open AsyncTest first.'));
    });
  }).catch((error) => tryEndpoint(index + 1, error));
  }

  return tryEndpoint(0);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function callFileBridge(method, params = {}) {
  const bridgeDir = getFileBridgeDir();
  await fs.mkdir(bridgeDir, { recursive: true });

  const id = bridgeRequestId++;
  const requestId = `${process.pid}-${Date.now()}-${randomUUID()}`;
  const requestPath = path.join(bridgeDir, `request-${requestId}.json`);
  const requestTmpPath = `${requestPath}.tmp`;
  const responsePath = path.join(bridgeDir, `response-${requestId}.json`);

  await appendDebugLog('file-bridge-request', { method, requestPath, responsePath });
  await fs.writeFile(
    requestTmpPath,
    JSON.stringify({ id, method, params, responsePath, createdAt: Date.now() }),
    'utf8'
  );
  await fs.rename(requestTmpPath, requestPath);

  const startedAt = Date.now();
  while (Date.now() - startedAt < FILE_BRIDGE_TIMEOUT_MS) {
    try {
      const response = await readJsonFile(responsePath);
      await fs.rm(responsePath, { force: true }).catch(() => {});
      await appendDebugLog('file-bridge-response', { method, ok: response.ok });
      if (response.ok) return response.result;
      throw new Error(response.error?.message || 'AsyncTest file bridge request failed');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    await sleep(FILE_BRIDGE_POLL_MS);
  }

  await fs.rm(requestPath, { force: true }).catch(() => {});
  await fs.rm(requestTmpPath, { force: true }).catch(() => {});
  await appendDebugLog('file-bridge-timeout', { method, bridgeDir });
  throw new Error('Timed out connecting to AsyncTest. Open AsyncTest first.');
}

async function callAppBridge(method, params = {}) {
  try {
    return await callBridge(method, params);
  } catch (socketError) {
    try {
      return await callFileBridge(method, params);
    } catch (fileError) {
      const socketMessage = socketError instanceof Error ? socketError.message : String(socketError);
      const fileMessage = fileError instanceof Error ? fileError.message : String(fileError);
      throw new Error(`${fileMessage} Socket bridge: ${socketMessage}`);
    }
  }
}

async function handleToolsCall(id, params = {}) {
  const tool = toolByName.get(params.name);
  if (!tool) {
    writeError(id, -32602, `Unknown tool: ${params.name}`);
    return;
  }

  const input = params.arguments || {};
  let bridgeParams =
    params.name === 'mind_create_window'
      ? { payload: input.title ? { title: input.title } : {} }
      : { ...input };
  if (params.name === 'mind_read_file_outline') bridgeParams = { ...bridgeParams, mode: 'outline' };
  if (params.name === 'mind_read_file_subtree') bridgeParams = { ...bridgeParams, mode: 'subtree' };
  if (params.name === 'mind_search_file_nodes') bridgeParams = { ...bridgeParams, mode: 'search' };

  try {
    const result = await callAppBridge(tool.bridgeMethod, bridgeParams);
    const safeResult = sanitizeForMcpOutput(result);
    writeResult(id, {
      content: [
        {
          type: 'text',
          text: JSON.stringify(safeResult, null, 2),
        },
      ],
    });
  } catch (error) {
    writeResult(id, {
      isError: true,
      content: [
        {
          type: 'text',
          text: error instanceof Error ? error.message : String(error),
        },
      ],
    });
  }
}

async function handleMessage(message) {
  if (!message || message.jsonrpc !== '2.0') return;
  const { id, method, params } = message;

  if (method === 'initialize') {
    writeResult(id, {
      protocolVersion: params?.protocolVersion || '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'asynctest-mind', version: '0.1.0' },
    });
    return;
  }

  if (method === 'tools/list') {
    writeResult(id, {
      tools: tools.map(({ bridgeMethod, ...tool }) => tool),
    });
    return;
  }

  if (method === 'tools/call') {
    await handleToolsCall(id, params);
    return;
  }

  if (method?.startsWith('notifications/')) return;

  if (id !== undefined) {
    writeError(id, -32601, `Method not found: ${method}`);
  }
}

export function startMindMcpStdioServer() {
  void appendDebugLog('stdio-server-start', {
    argv: process.argv,
    cwd: process.cwd(),
    node: process.version,
    platform: process.platform,
  });
  let inputBuffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    inputBuffer += chunk;
    let newlineIndex = inputBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = inputBuffer.slice(0, newlineIndex).trim();
      inputBuffer = inputBuffer.slice(newlineIndex + 1);
      newlineIndex = inputBuffer.indexOf('\n');
      if (!line) continue;
      try {
        void handleMessage(JSON.parse(line));
      } catch (error) {
        void appendDebugLog('message-parse-error', { message: error instanceof Error ? error.message : String(error) });
        writeError(null, -32700, error instanceof Error ? error.message : String(error));
      }
    }
  });
  process.on('uncaughtException', (error) => {
    void appendDebugLog('uncaughtException', { message: error.message, stack: error.stack });
    writeError(null, -32603, error.message);
  });
  process.on('unhandledRejection', (reason) => {
    void appendDebugLog('unhandledRejection', {
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startMindMcpStdioServer();
}
