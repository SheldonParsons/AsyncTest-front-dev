#!/usr/bin/env node
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const ASYNCTEST_MIND_MCP_VERSION = '0.5.0';
export const ASYNCTEST_MIND_MCP_CAPABILITY_REVISION = 9;
export const ASYNCTEST_MIND_MCP_RESPONSE_PROFILE = 'compact-by-default';
export const ASYNCTEST_MIND_MCP_UPDATED_AT = '2026-07-13';
export const ASYNCTEST_MIND_MCP_TIMEZONE = 'Asia/Shanghai';
export const ASYNCTEST_MIND_MCP_INSTRUCTIONS = [
  'Prefer outline -> subtree when needed -> one batched write -> save.',
  'Use mind_apply_node_operations for mixed edits and mind_create_nodes for large additions.',
  'Write tools edit the open window and already return a compact changed summary.',
  'Do not close an open document or rewrite its .amind file offline unless the user explicitly asks.',
  'Do not call diagnostic tools in the normal edit path unless a result requires investigation.',
  'The first business tool call automatically starts an Agent control session and shows Agent 操作中... in AsyncTest Mind.',
  'Before finishing the user task, always call mind_end_agent_session exactly once, whether the task succeeded, failed, or no more Mind tools are needed.',
  'If MCP_CONTROL_REVOKED is returned, stop all AsyncTest Mind calls immediately. Only call mind_request_control_restore after the user explicitly asks to restore control; restoration still requires approval in AsyncTest.',
].join('\n');

const TOOL_TIERS = {
  preferred: [
    'mind_list_windows',
    'mind_get_document_outline',
    'mind_get_subtree',
    'mind_create_nodes',
    'mind_apply_node_operations',
    'mind_save_document',
    'mind_save_as_document',
  ],
  scenario: [
    'mind_read_file',
    'mind_create_document',
    'mind_import_file_subtree',
    'mind_close_window',
    'mind_close_all_windows',
  ],
  diagnostic: [
    'mind_get_mcp_capabilities',
    'mind_get_agent_briefing',
    'mind_get_operation_status',
    'mind_get_changed_summary',
    'mind_get_app_status',
    'mind_get_active_window',
  ],
  control: [
    'mind_get_control_status',
    'mind_end_agent_session',
    'mind_request_control_restore',
  ],
};

export function getAsyncTestMindMcpCapabilities() {
  return {
    server: 'asynctest-mind',
    version: ASYNCTEST_MIND_MCP_VERSION,
    capabilityRevision: ASYNCTEST_MIND_MCP_CAPABILITY_REVISION,
    updatedAt: ASYNCTEST_MIND_MCP_UPDATED_AT,
    timezone: ASYNCTEST_MIND_MCP_TIMEZONE,
    responseProfile: ASYNCTEST_MIND_MCP_RESPONSE_PROFILE,
    summary: 'AsyncTest Mind MCP 以已打开窗口内的一次批量事务为默认编辑路径，并默认返回精简响应。',
    breakingOrBehaviorChanges: [
      '编辑类工具默认只返回精简摘要。',
      'mind_create_nodes 默认不再返回 created[]；需要时请传 includeCreated=true。',
      'mind_apply_node_operations 默认不再返回 results[]；需要时请传 includeResults=true。',
      '读取类工具默认不返回备注、图片、metadata、样式和完整原始 JSON；需要时请显式传 include 参数或 mode=rawJson。',
      'MCP 写入使用单步撤销、revision 冲突保护、局部增量播放和用户停止锁。',
      '长请求一旦发送，不会跨 socket、TCP 或文件桥自动重放。',
      'MCP 业务调用会自动建立 Agent 控制会话；Agent 结束任务前必须调用 mind_end_agent_session。',
      '用户退出控制后，所有业务工具统一返回 MCP_CONTROL_REVOKED；恢复必须由 Agent 发起请求并由用户在 AsyncTest 中确认。',
    ],
    recommendedUsage: [
      '读取精简树结构时，优先使用 mind_get_subtree 或 mind_get_document_outline。',
      '在已打开窗口中批量创建节点时，优先使用 mind_create_nodes。',
      '需要把 .amind 或 .xmind 文件中的分支导入已打开窗口时，使用 mind_import_file_subtree。',
      '编辑已打开且已有文件路径的文档后，使用 mind_save_document 保存。',
      '未保存窗口需要指定保存路径时，使用 mind_save_as_document。',
      '除非用户明确要求关闭窗口，否则不要关闭窗口后离线编辑 .amind 文件。',
      '收到 USER_STOPPED 后立即停止当前对话中的所有 Mind 写调用，等待用户在 AsyncTest 中恢复。',
      '完成当前用户任务前始终调用一次 mind_end_agent_session，使 Agent 操作中状态及时消失。',
    ],
    goldenPath: [
      'mind_get_document_outline',
      'mind_get_subtree (only when local detail is needed)',
      'mind_apply_node_operations or mind_create_nodes',
      'mind_save_document or mind_save_as_document',
    ],
    toolTiers: TOOL_TIERS,
    compactResponseDefaults: {
      node: ['id', 'text', 'parentId', 'childIds', 'hasChildren'],
      outlineNode: ['id', 'text', 'childCount', 'children'],
      mutation: ['ok', 'windowKey', 'boardId', 'nodeId or changed ids', 'dirty'],
    },
    optionalIncludes: [
      'includeNotes',
      'includeImages',
      'includeMetadata',
      'includeNode',
      'includeCreated',
      'includeResults',
      'mode=rawJson',
    ],
  };
}

export function getAsyncTestMindAgentBriefing() {
  return {
    server: 'asynctest-mind',
    version: ASYNCTEST_MIND_MCP_VERSION,
    capabilityRevision: ASYNCTEST_MIND_MCP_CAPABILITY_REVISION,
    purpose: 'Refresh an old Agent conversation with the current AsyncTest Mind editing contract.',
    goldenPath: [
      'Read mind_get_document_outline first.',
      'Use mind_get_subtree only when the target branch needs more context.',
      'Send one mind_apply_node_operations request for mixed edits, or mind_create_nodes for a large tree.',
      'Save with mind_save_document; use mind_save_as_document only for an unsaved window.',
    ],
    hardRules: [
      'Edit the open window. Never close it to rewrite .amind offline.',
      'Do not call capabilities, status, validation, or changed-summary tools in a normal edit path.',
      'Write responses already contain the compact decision summary.',
      'If USER_STOPPED is returned, make no more Mind write calls until the user explicitly resumes in AsyncTest.',
      'Always call mind_end_agent_session exactly once before finishing the user task.',
      'If MCP_CONTROL_REVOKED is returned, stop every Mind call. Request restoration only after the user explicitly asks, and wait for AsyncTest approval.',
    ],
    toolTiers: TOOL_TIERS,
  };
}

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
    name: 'mind_get_mcp_capabilities',
    description: '[Diagnostic] Get version, behavior changes, and tool tiers. Call only after an MCP update or when an old conversation has stale assumptions; do not call in a normal edit flow.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    localHandler: getAsyncTestMindMcpCapabilities,
  },
  {
    name: 'mind_get_agent_briefing',
    description: '[Diagnostic] Refresh an old conversation with the current golden path and hard rules. Call after an MCP update, not before normal edits.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    localHandler: getAsyncTestMindAgentBriefing,
  },
  {
    name: 'mind_get_control_status',
    description: '[Control] Read the application-wide Agent control state. This is one of the only tools allowed after MCP_CONTROL_REVOKED.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    bridgeMethod: 'mind.controlStatus',
  },
  {
    name: 'mind_end_agent_session',
    description: '[Required finalizer] Call exactly once before finishing the current user task, whether it succeeded, failed, or no more Mind calls are needed. This closes the Agent 操作中... state; it does not close any Mind window.',
    inputSchema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Optional short completion reason.' },
      },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.endAgentSession',
  },
  {
    name: 'mind_request_control_restore',
    description: '[Control] Call only after MCP_CONTROL_REVOKED and only when the user explicitly asks to restore control. This merely requests restoration; the user must still approve it inside AsyncTest before business tools work again.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    bridgeMethod: 'mind.requestControlRestore',
  },
  {
    name: 'mind_get_operation_status',
    description: 'Diagnostic only. Get the current visual write operation state for a Mind window. Normal edits do not need to call this tool.',
    inputSchema: {
      type: 'object',
      properties: { windowKey: { type: 'string' } },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.operationStatus',
  },
  {
    name: 'mind_get_changed_summary',
    description: 'Diagnostic drill-down for a completed transaction. Write tools already return a compact changed summary, so call this only when transaction details are needed.',
    inputSchema: {
      type: 'object',
      properties: {
        transactionId: { type: 'string' },
        windowKey: { type: 'string', description: 'Omit when transactionId is provided.' },
      },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.changedSummary',
  },
  {
    name: 'mind_get_app_status',
    description: '[Diagnostic] Check bridge availability. Normal document work should start with mind_list_windows instead.',
    inputSchema: {
      type: 'object',
      properties: {
        includeRuntimeState: { type: 'boolean', description: 'Default false. When true, asks each renderer for dirty/isSaving state.' },
      },
      additionalProperties: false,
    },
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
    description: '[Preferred] Start here when the target window is unknown. List open Mind windows compactly; request runtime state only when dirty/save state affects the decision.',
    inputSchema: {
      type: 'object',
      properties: {
        includeRuntimeState: { type: 'boolean', description: 'Default false. When true, asks each renderer for dirty/isSaving state.' },
      },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.listWindows',
  },
  {
    name: 'mind_create_file',
    description: 'Low-level helper to create a .amind file through AsyncTest Mind internals. Prefer mind_create_document for agent workflows; never construct or zip .amind files yourself.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        title: { type: 'string' },
        rootText: { type: 'string' },
        children: { type: 'array', items: { type: 'object' } },
        rootMarkers: { type: 'array', items: { type: 'string' } },
        rootSecrecy: { type: 'object' },
        overwrite: { type: 'boolean' },
        openWindow: { type: 'boolean' },
      },
      required: ['filePath'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.createFile',
  },
  {
    name: 'mind_create_document',
    description: 'Create a Mind document using AsyncTest Mind internals. If filePath is provided, save it as .amind; if open=true, open it in a Mind window. Use this instead of directly modifying .amind files.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        title: { type: 'string' },
        rootText: { type: 'string' },
        children: { type: 'array', items: { type: 'object' } },
        rootMarkers: { type: 'array', items: { type: 'string' } },
        rootSecrecy: { type: 'object' },
        overwrite: { type: 'boolean' },
        open: { type: 'boolean' },
      },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.createDocument',
  },
  {
    name: 'mind_get_active_window',
    description: 'Get the currently focused AsyncTest Mind window, or the first open Mind window.',
    inputSchema: {
      type: 'object',
      properties: {
        includeRuntimeState: { type: 'boolean', description: 'Default false. When true, asks renderer for dirty/isSaving state.' },
      },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.getActiveWindow',
  },
  {
    name: 'mind_get_document_outline',
    description: '[Preferred] First content read for an open document. Defaults to depth=1 and limit=80, and reports truncation; request only the relevant detailed subtree next.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        depth: { type: 'number', description: 'Default 1. Increase only when the whole deeper outline is needed.' },
        limit: { type: 'number', description: 'Default 80 returned nodes. Increase explicitly only when needed.' },
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
    description: '[Preferred] Focused read after outline identifies a target. Include ancestors or siblings only when local context is needed.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        nodeId: { type: 'string' },
        depth: { type: 'number' },
        includeAncestors: { type: 'boolean', description: 'Default false. Include the compact root-to-parent chain.' },
        includeSiblings: { type: 'boolean', description: 'Default false. Include direct siblings of the target node.' },
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
        includeNode: { type: 'boolean', description: 'Default false. Include the updated node only when needed.' },
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
        includeNode: { type: 'boolean', description: 'Default false. Include the updated node only when needed.' },
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
        includeNode: { type: 'boolean', description: 'Default false. Include the updated node only when needed.' },
      },
      required: ['nodeId', 'metadata'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.updateNodeMetadata',
  },
  {
    name: 'mind_set_node_markers',
    description: 'Replace all marker keys on a node.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        boardId: { type: 'string' },
        nodeId: { type: 'string' },
        markers: { type: 'array', items: { type: 'string' } },
        includeNode: { type: 'boolean', description: 'Default false. Include the updated node only when needed.' },
      },
      required: ['nodeId', 'markers'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.setNodeMarkers',
  },
  {
    name: 'mind_add_node_marker',
    description: 'Add a marker key to a node.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        boardId: { type: 'string' },
        nodeId: { type: 'string' },
        markerKey: { type: 'string' },
        includeNode: { type: 'boolean', description: 'Default false. Include the updated node only when needed.' },
      },
      required: ['nodeId', 'markerKey'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.addNodeMarker',
  },
  {
    name: 'mind_remove_node_marker',
    description: 'Remove a marker key from a node.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        boardId: { type: 'string' },
        nodeId: { type: 'string' },
        markerKey: { type: 'string' },
        includeNode: { type: 'boolean', description: 'Default false. Include the updated node only when needed.' },
      },
      required: ['nodeId', 'markerKey'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.removeNodeMarker',
  },
  {
    name: 'mind_set_root_secrecy',
    description: 'Set or clear secrecy level on a root node.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        boardId: { type: 'string' },
        nodeId: { type: 'string' },
        secrecy: {
          anyOf: [
            { type: 'null' },
            {
              type: 'object',
              properties: {
                level: { type: 'string', enum: ['top-secret', 'confidential', 'secret'] },
                durationYears: { type: 'number' },
                markedAt: { type: 'string' },
              },
              required: ['level'],
              additionalProperties: false,
            },
          ],
        },
        includeNode: { type: 'boolean', description: 'Default false. Include the updated root node only when needed.' },
      },
      required: ['secrecy'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.setRootSecrecy',
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
        includeNode: { type: 'boolean', description: 'Default false. Include the created node only when needed.' },
      },
      required: ['parentId', 'text'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.createNode',
  },
  {
    name: 'mind_create_nodes',
    description: '[Preferred] Add many nodes or a large tree in one open-window transaction. Do not loop single-node tools, close the window, or modify .amind files directly.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        parentId: { type: 'string' },
        nodes: { type: 'array', items: { type: 'object' } },
        maxNodes: { type: 'number', description: 'Safety limit, default 1000 and max 5000.' },
        saveAfterApply: { type: 'boolean' },
        includeCreated: { type: 'boolean', description: 'Default false. Include per-node creation details only when needed.' },
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
        includeDeletedIds: { type: 'boolean', description: 'Default false. Include all deleted node ids only when needed.' },
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
        includeNode: { type: 'boolean', description: 'Default false. Include the moved node only when needed.' },
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
    description: '[Preferred] Apply mixed edits as one revision-protected, single-undo open-window transaction. Use mind_create_nodes for large pure additions. Use dryRun only when the requested edit is genuinely risky.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        operations: { type: 'array', items: { type: 'object' } },
        saveAfterApply: { type: 'boolean' },
        rollbackOnError: { type: 'boolean' },
        dryRun: { type: 'boolean', description: 'Default false. Validate and summarize without committing; use only for genuinely risky edits.' },
        expectedRevision: { type: 'string' },
        includeResults: { type: 'boolean', description: 'Default false. Include per-operation results only when needed.' },
      },
      required: ['operations'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.applyNodeOperations',
  },
  {
    name: 'mind_save_document',
    description: 'Save an existing opened Mind document after window-based edits. If the document is unsaved, use mind_save_as_document instead.',
    inputSchema: {
      type: 'object',
      properties: { windowKey: { type: 'string' } },
      additionalProperties: false,
    },
    bridgeMethod: 'mind.saveDocument',
  },
  {
    name: 'mind_save_as_document',
    description: 'Save an open Mind document to a specified .amind file path. Use this for unsaved windows; never close the window and modify .amind files directly.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        filePath: { type: 'string' },
        overwrite: { type: 'boolean' },
      },
      required: ['filePath'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.saveAsDocument',
  },
  {
    name: 'mind_update_document_title',
    description: 'Update the document manifest title for an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['title'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.updateDocumentTitle',
  },
  {
    name: 'mind_update_board_title',
    description: 'Update a board title in an open Mind document.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        boardId: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['title'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.updateBoardTitle',
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
        includeAncestors: { type: 'boolean' },
        includeSiblings: { type: 'boolean' },
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
    description: 'Read .amind or .xmind file content without opening a window. This is read-only for analysis/import preview; to modify an open document, use window editing tools such as mind_create_nodes or mind_import_file_subtree.',
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
    description: 'Read a lightweight outline from a .amind or .xmind file without opening it. Defaults to depth=1 and limit=80, and reports truncation; request a relevant file subtree next.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        depth: { type: 'number', description: 'Default 1. Increase only when the whole deeper outline is needed.' },
        limit: { type: 'number', description: 'Default 80 returned nodes. Increase explicitly only when needed.' },
        format: { type: 'string', enum: ['json', 'markdown'] },
      },
      required: ['filePath'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.readFileOutline',
  },
  {
    name: 'mind_read_file_subtree',
    description: 'Read a subtree from a .amind or .xmind file without opening it. Read-only; use mind_import_file_subtree to copy it into an open document.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        nodeId: { type: 'string' },
        depth: { type: 'number' },
        includeAncestors: { type: 'boolean' },
        includeSiblings: { type: 'boolean' },
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
    description: 'Search nodes in a .amind or .xmind file without opening it. Read-only; use window editing tools for modifications.',
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
    name: 'mind_import_file_subtree',
    description: 'Import a subtree from a .amind or .xmind file into an already open Mind window. Preferred when copying branches from existing files; do not close the target window or manually rewrite .amind files.',
    inputSchema: {
      type: 'object',
      properties: {
        sourceFilePath: { type: 'string' },
        sourceNodeId: { type: 'string', description: 'Omit to import the source root node.' },
        sourceBoardId: { type: 'string' },
        targetWindowKey: { type: 'string' },
        targetParentId: { type: 'string' },
        targetBoardId: { type: 'string' },
        titleOverride: { type: 'string' },
        includeNotes: { type: 'boolean' },
        includeImages: { type: 'boolean', description: 'Default false. Image asset copying is not guaranteed across files yet.' },
        includeIdMap: { type: 'boolean', description: 'Default false. Include the potentially large source-to-target node id map only when needed.' },
        index: { type: 'number' },
        expectedRevision: { type: ['string', 'number'], description: 'Optional optimistic concurrency guard.' },
        dryRun: { type: 'boolean', description: 'Validate and summarize the import without changing the open window.' },
        saveAfterApply: { type: 'boolean' },
      },
      required: ['sourceFilePath', 'targetParentId'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.importFileSubtree',
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
    description: 'Close a specific AsyncTest Mind window. Do not call this tool unless the user explicitly asks to close a window. mode is required: save, discard, or prompt.',
    inputSchema: {
      type: 'object',
      properties: {
        windowKey: { type: 'string' },
        mode: { type: 'string', enum: ['save', 'discard', 'prompt'] },
      },
      required: ['windowKey', 'mode'],
      additionalProperties: false,
    },
    bridgeMethod: 'mind.closeWindow',
  },
  {
    name: 'mind_close_all_windows',
    description: 'Close all open AsyncTest Mind windows. Do not call this tool unless the user explicitly asks to close windows. mode is required: save, discard, or prompt.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['save', 'discard', 'prompt'] },
      },
      required: ['mode'],
      additionalProperties: false,
    },
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
const mcpClientId = `stdio-${process.pid}-${randomUUID()}`;
const FILE_BRIDGE_TIMEOUT_MS = 45000;
const FILE_BRIDGE_POLL_MS = 80;
const SOCKET_CONNECT_TIMEOUT_MS = 5000;
const SOCKET_RESPONSE_TIMEOUT_MS = 120000;

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

function createBridgeErrorFromPayload(payload, fallbackMessage = 'AsyncTest bridge request failed') {
  const error = new Error(payload?.message || fallbackMessage);
  if (payload && typeof payload === 'object') {
    error.code = payload.code;
    error.recoverable = payload.recoverable;
    error.suggestedAction = payload.suggestedAction;
    error.retryAllowed = payload.retryAllowed;
    if (payload.details && typeof payload.details === 'object') error.details = payload.details;
  }
  return error;
}

function createBridgeConnectionError(message) {
  const error = new Error(message);
  error.code = 'BRIDGE_UNAVAILABLE';
  error.recoverable = true;
  error.safeToRetry = true;
  return error;
}

function formatToolError(error) {
  const payload = {
    ok: false,
    code: error?.code || 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : String(error),
    recoverable: error?.recoverable,
    suggestedAction: error?.suggestedAction,
    ...(typeof error?.retryAllowed === 'boolean' ? { retryAllowed: error.retryAllowed } : {}),
    ...(error?.details && typeof error.details === 'object' ? { details: error.details } : {}),
  };
  return JSON.stringify(payload, null, 2);
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
    let requestSent = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      fn(value);
    };

    socket.setTimeout(SOCKET_CONNECT_TIMEOUT_MS, () => {
      const error = requestSent
        ? new Error('Timed out waiting for AsyncTest Mind to finish the request.')
        : createBridgeConnectionError('Timed out connecting to AsyncTest. Open AsyncTest first.');
      finish(reject, error);
    });

    socket.on('connect', () => {
      requestSent = true;
      socket.setTimeout(SOCKET_RESPONSE_TIMEOUT_MS);
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
        else finish(reject, createBridgeErrorFromPayload(response.error));
      } catch (error) {
        finish(reject, error);
      }
    });

    socket.on('error', (cause) => {
      if (requestSent) {
        const error = new Error(`AsyncTest bridge connection closed while executing ${method}.`);
        error.cause = cause;
        finish(reject, error);
      } else {
        finish(reject, createBridgeConnectionError('Cannot connect to AsyncTest. Open AsyncTest first.'));
      }
    });
  }).catch((error) => {
    if (error?.safeToRetry === true) return tryEndpoint(index + 1, error);
    throw error;
  });
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
      throw createBridgeErrorFromPayload(response.error, 'AsyncTest file bridge request failed');
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
    if (socketError?.safeToRetry !== true) throw socketError;
    try {
      return await callFileBridge(method, params);
    } catch (fileError) {
      const socketMessage = socketError instanceof Error ? socketError.message : String(socketError);
      const fileMessage = fileError instanceof Error ? fileError.message : String(fileError);
      const error = new Error(`${fileMessage} Socket bridge: ${socketMessage}`);
      error.code = fileError?.code || socketError?.code;
      error.recoverable = fileError?.recoverable ?? socketError?.recoverable;
      error.suggestedAction = fileError?.suggestedAction ?? socketError?.suggestedAction;
      throw error;
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
  bridgeParams.mcpClientId = mcpClientId;
  bridgeParams.mcpToolName = params.name;
  if (params.name === 'mind_read_file_outline') bridgeParams = { ...bridgeParams, mode: 'outline' };
  if (params.name === 'mind_read_file_subtree') bridgeParams = { ...bridgeParams, mode: 'subtree' };
  if (params.name === 'mind_search_file_nodes') bridgeParams = { ...bridgeParams, mode: 'search' };
  if (params.name === 'mind_import_file_subtree' && input.targetWindowKey) {
    bridgeParams = { ...bridgeParams, windowKey: input.targetWindowKey };
  }
  if (
    ['mind_get_document_outline', 'mind_read_file_outline'].includes(params.name)
  ) {
    if (bridgeParams.depth == null) bridgeParams.depth = 1;
    if (bridgeParams.limit == null) bridgeParams.limit = 80;
  }
  if (
    ['mind_read_open_document', 'mind_read_file'].includes(params.name)
    && (!bridgeParams.mode || bridgeParams.mode === 'outline')
    && bridgeParams.depth == null
  ) {
    bridgeParams.depth = 1;
    if (bridgeParams.limit == null) bridgeParams.limit = 80;
  }

  try {
    let result;
    if (typeof tool.localHandler === 'function') {
      await callAppBridge('mind.touchAgentSession', bridgeParams);
      result = await tool.localHandler(bridgeParams);
    } else {
      result = await callAppBridge(tool.bridgeMethod, bridgeParams);
    }
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
          text: formatToolError(error),
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
      serverInfo: { name: 'asynctest-mind', version: ASYNCTEST_MIND_MCP_VERSION },
      instructions: ASYNCTEST_MIND_MCP_INSTRUCTIONS,
    });
    return;
  }

  if (method === 'tools/list') {
    writeResult(id, {
      tools: tools.map(({ bridgeMethod, localHandler, ...tool }) => tool),
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
  let transportCleanupStarted = false;
  const cleanupAgentSession = async (reason) => {
    if (transportCleanupStarted) return;
    transportCleanupStarted = true;
    await callAppBridge('mind.endAgentSession', {
      mcpClientId,
      mcpToolName: 'transport-cleanup',
      reason,
    }).catch(() => {});
  };
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
  process.stdin.on('end', () => {
    void cleanupAgentSession('transport-closed');
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
