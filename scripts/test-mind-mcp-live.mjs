import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';
import { createRecentStore } from '../electron/amind/recentStore.js';

const performanceNodeCount = Math.max(
  100,
  Math.min(5000, Number.parseInt(process.argv.find((arg) => arg.startsWith('--nodes='))?.split('=')[1] || '642', 10) || 642),
);
const runId = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
const titlePrefix = `__MCP_LIVE_QA__${runId}`;
const savedFilePath = path.join(os.tmpdir(), `${titlePrefix}.amind`);
const createdWindowKeys = new Set();
const temporaryFilePaths = new Set([savedFilePath]);
const testResults = [];
const measurements = {};

const child = spawn(process.execPath, ['asynctest-mind-mcp.mjs'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'inherit'],
});
const output = readline.createInterface({ input: child.stdout });
const pending = new Map();
let nextRequestId = 1;
let originalWindowKey = null;
let mainWindowKey = null;
let mainRootId = null;
let mainRevision = null;

output.on('line', (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  const requestState = pending.get(message.id);
  if (!requestState) return;
  pending.delete(message.id);
  if (message.error) {
    requestState.reject(new Error(message.error.message || JSON.stringify(message.error)));
  } else {
    requestState.resolve(message.result);
  }
});

child.once('exit', (code, signal) => {
  if (!pending.size) return;
  const error = new Error(`MCP stdio process exited early (code=${code}, signal=${signal})`);
  for (const requestState of pending.values()) requestState.reject(error);
  pending.clear();
});

function request(method, params = {}) {
  const id = nextRequestId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function roundMs(value) {
  return Math.round(value * 100) / 100;
}

async function callTool(name, args = {}) {
  const startedAt = performance.now();
  const response = await request('tools/call', { name, arguments: args });
  const elapsedMs = roundMs(performance.now() - startedAt);
  const text = response?.content?.find((item) => item.type === 'text')?.text || '{}';
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }
  if (response?.isError) {
    const error = new Error(payload?.error?.message || `${name} failed`);
    error.code = payload?.error?.code;
    error.payload = payload;
    error.elapsedMs = elapsedMs;
    throw error;
  }
  return {
    payload,
    elapsedMs,
    traceId: response?._meta?.traceId ?? null,
  };
}

async function expectToolError(name, args, expectedCode) {
  try {
    await callTool(name, args);
  } catch (error) {
    assertEqual(error.code, expectedCode, `${name} error code`);
    return error;
  }
  throw new Error(`${name} should have failed with ${expectedCode}`);
}

async function runTest(name, test) {
  const startedAt = performance.now();
  try {
    const detail = await test();
    const elapsedMs = roundMs(performance.now() - startedAt);
    testResults.push({ name, status: 'passed', elapsedMs, ...(detail === undefined ? {} : { detail }) });
    process.stderr.write(`PASS ${name} (${elapsedMs} ms)\n`);
  } catch (error) {
    const elapsedMs = roundMs(performance.now() - startedAt);
    testResults.push({
      name,
      status: 'failed',
      elapsedMs,
      error: error instanceof Error ? error.message : String(error),
    });
    process.stderr.write(`FAIL ${name} (${elapsedMs} ms): ${error instanceof Error ? error.message : String(error)}\n`);
    throw error;
  }
}

function getBridgeEndpoint() {
  if (process.platform === 'win32') return { type: 'pipe', path: '\\\\.\\pipe\\asynctest-mind-mcp' };
  const baseDir = process.platform === 'darwin' ? '/private/tmp' : os.tmpdir();
  return { type: 'socket', path: path.join(baseDir, 'asynctest-mind-mcp.sock') };
}

function directBridgeRequest(method, params = {}) {
  const endpoint = getBridgeEndpoint();
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(endpoint.path);
    const requestId = `live-${randomUUID()}`;
    let buffer = '';
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Direct bridge request timed out: ${method}`));
    }, 5000);

    const finish = (callback, value) => {
      clearTimeout(timeout);
      socket.end();
      callback(value);
    };

    socket.once('error', (error) => finish(reject, error));
    socket.once('connect', () => {
      socket.write(`${JSON.stringify({ id: requestId, method, params })}\n`);
    });
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex < 0) return;
      try {
        finish(resolve, JSON.parse(buffer.slice(0, newlineIndex)));
      } catch (error) {
        finish(reject, error);
      }
    });
  });
}

function findOutlineNode(nodes, predicate) {
  for (const node of Array.isArray(nodes) ? nodes : []) {
    if (predicate(node)) return node;
    const child = findOutlineNode(node.children, predicate);
    if (child) return child;
  }
  return null;
}

function findSubtreeNode(node, predicate) {
  if (!node) return null;
  if (predicate(node)) return node;
  for (const child of Array.isArray(node.children) ? node.children : []) {
    const result = findSubtreeNode(child, predicate);
    if (result) return result;
  }
  return null;
}

function buildBalancedNodes(count) {
  const branchCount = Math.min(6, count);
  const nodes = Array.from({ length: branchCount }, (_, branchIndex) => ({
    text: `性能测试分支 ${branchIndex + 1}`,
    children: [],
  }));
  let remaining = count - branchCount;
  let sequence = 1;

  while (remaining > 0) {
    const branch = nodes[(sequence - 1) % branchCount];
    const group = { text: `测试分组 ${sequence}`, children: [] };
    branch.children.push(group);
    remaining -= 1;
    if (remaining <= 0) break;
    const leafCount = Math.min(10, remaining);
    for (let index = 0; index < leafCount; index += 1) {
      group.children.push({ text: `测试节点 ${sequence}-${index + 1}` });
    }
    remaining -= leafCount;
    sequence += 1;
  }
  return nodes;
}

function defaultUserDataPath() {
  if (process.env.ASYNCTEST_USER_DATA_PATH) return process.env.ASYNCTEST_USER_DATA_PATH;
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'async-test');
  if (process.platform === 'win32') return path.join(process.env.APPDATA || os.homedir(), 'async-test');
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'async-test');
}

function isLiveQaFilePath(filePath) {
  return path.basename(String(filePath || '')).startsWith('__MCP_LIVE_QA__');
}

async function removeLiveQaEntriesFromRecentFile(filePath) {
  try {
    const entries = JSON.parse(await fs.readFile(filePath, 'utf8'));
    if (!Array.isArray(entries)) return;
    const removed = entries.filter((entry) => isLiveQaFilePath(entry?.filePath || entry));
    const cleaned = entries.filter((entry) => !isLiveQaFilePath(entry?.filePath || entry));
    await fs.writeFile(filePath, JSON.stringify(cleaned, null, 2), 'utf8');
    for (const entry of removed) {
      if (entry?.previewPath) await fs.rm(entry.previewPath, { force: true }).catch(() => {});
    }
  } catch {
    // Missing recent files are valid in a fresh development profile.
  }
}

async function cleanupStaleLiveQaArtifacts() {
  const windows = await callTool('mind_list_windows').catch(() => null);
  for (const windowEntry of windows?.payload || []) {
    if (!String(windowEntry?.title || '').startsWith('__MCP_LIVE_QA__')) continue;
    await callTool('mind_manage_windows', {
      action: 'close_window',
      windowKey: windowEntry.windowKey,
      mode: 'discard',
    }).catch(() => {});
  }

  const tempNames = await fs.readdir(os.tmpdir()).catch(() => []);
  for (const name of tempNames) {
    if (!name.startsWith('__MCP_LIVE_QA__') || !name.endsWith('.amind')) continue;
    await fs.rm(path.join(os.tmpdir(), name), { force: true }).catch(() => {});
  }

  const recentStore = createRecentStore({ userDataPath: defaultUserDataPath() });
  await removeLiveQaEntriesFromRecentFile(recentStore.storePath);
  await removeLiveQaEntriesFromRecentFile(recentStore.backupStorePath);
}

async function closeTrackedWindow(windowKey) {
  if (!windowKey || !createdWindowKeys.has(windowKey)) return;
  await callTool('mind_manage_windows', {
    action: 'close_window',
    windowKey,
    mode: 'discard',
  }).catch(() => {});
  createdWindowKeys.delete(windowKey);
}

async function cleanup() {
  for (const windowKey of [...createdWindowKeys].reverse()) {
    await closeTrackedWindow(windowKey);
  }

  if (originalWindowKey) {
    const windows = await callTool('mind_list_windows').catch(() => null);
    if (windows?.payload?.some((item) => item.windowKey === originalWindowKey)) {
      await callTool('mind_manage_windows', {
        action: 'focus_window',
        windowKey: originalWindowKey,
      }).catch(() => {});
    }
  }

  const recentStore = createRecentStore({ userDataPath: defaultUserDataPath() });
  for (const filePath of temporaryFilePaths) {
    await recentStore.remove(filePath).catch(() => {});
    await fs.rm(filePath, { force: true }).catch(() => {});
  }
  await removeLiveQaEntriesFromRecentFile(recentStore.backupStorePath);

  await callTool('mind_end_agent_session', { reason: 'live-suite-complete' }).catch(() => {});
  child.stdin.end();
  output.close();
  child.kill('SIGTERM');
}

async function main() {
  await fs.rm(savedFilePath, { force: true });

  await runTest('MCP initialize and advertised tool contract', async () => {
    const initialized = await request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'asynctest-mind-live-suite', version: '1.0.0' },
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    assertEqual(initialized?.serverInfo?.name, 'asynctest-mind', 'server name');
    assertEqual(initialized?.serverInfo?.version, '0.7.2', 'server version');
    assert(initialized?.instructions?.includes('mind_get_operation_status'), 'initialize instructions should explain status recovery');

    const listed = await request('tools/list');
    const names = listed?.tools?.map((tool) => tool.name) || [];
    assertEqual(names.length, 17, 'advertised tool count');
    for (const required of [
      'mind_get_operation_status',
      'mind_create_nodes',
      'mind_apply_node_operations',
      'mind_save_document',
      'mind_read_file',
    ]) {
      assert(names.includes(required), `tools/list should include ${required}`);
    }
    return { version: initialized.serverInfo.version, toolCount: names.length };
  });

  await cleanupStaleLiveQaArtifacts();

  await runTest('Capability discovery tells the Agent how to wait and recover', async () => {
    const capabilities = await callTool('mind_get_mcp_capabilities');
    assertEqual(capabilities.payload.version, '0.7.2', 'capability version');
    assertEqual(capabilities.payload.capabilityRevision, 14, 'capability revision');
    assertEqual(capabilities.payload.protocolRevision, 2, 'protocol revision');
    assertEqual(capabilities.payload.advertisedToolCount, 17, 'capability tool count');
    assert(
      capabilities.payload.recommendedUsage?.some((item) => item.includes('mind_get_operation_status')),
      'recommended usage should explain operation status recovery',
    );
    return {
      version: capabilities.payload.version,
      capabilityRevision: capabilities.payload.capabilityRevision,
      protocolRevision: capabilities.payload.protocolRevision,
    };
  });

  await runTest('Bridge compatibility accepts rev12 and rejects stale protocol clients', async () => {
    const compatibleClientId = `live-compatible-${runId}`;
    const compatible = await directBridgeRequest('mind.listWindows', {
      mcpClientId: compatibleClientId,
      mcpToolName: 'compatibility-test',
      mcpIdentity: {
        version: '0.6.1',
        capabilityRevision: 12,
        protocolRevision: 2,
        updatedAt: '2026-08-12',
      },
    });
    assertEqual(compatible.ok, true, 'rev12 compatibility');

    const staleClientId = `live-stale-${runId}`;
    const stale = await directBridgeRequest('mind.listWindows', {
      mcpClientId: staleClientId,
      mcpToolName: 'compatibility-test',
      mcpIdentity: {
        version: '0.5.0',
        capabilityRevision: 10,
        protocolRevision: 1,
        updatedAt: '2026-01-01',
      },
    });
    assertEqual(stale.ok, false, 'stale client should fail');
    assertEqual(stale.error?.code, 'MCP_VERSION_MISMATCH', 'stale client error code');
    assertEqual(stale.error?.retryAllowed, false, 'stale client retry guidance');

    await directBridgeRequest('mind.endAgentSession', { mcpClientId: compatibleClientId, reason: 'compatibility-test' }).catch(() => {});
    await directBridgeRequest('mind.endAgentSession', { mcpClientId: staleClientId, reason: 'compatibility-test' }).catch(() => {});
    return { compatibleRevision: 12, rejectedProtocolRevision: 1 };
  });

  const activeWindow = await callTool('mind_get_active_window').catch(() => null);
  originalWindowKey = activeWindow?.payload?.windowKey || null;

  await runTest('New document is immediately readable without a renderer readiness race', async () => {
    const timings = [];
    for (let index = 1; index <= 3; index += 1) {
      const startedAt = performance.now();
      const created = await callTool('mind_create_document', {
        title: `${titlePrefix}-readiness-${index}`,
        rootText: `Readiness root ${index}`,
        children: [],
        open: true,
      });
      const windowKey = created.payload.windowKey;
      assert(windowKey, 'readiness document should return windowKey');
      createdWindowKeys.add(windowKey);
      const outline = await callTool('mind_get_document_outline', { windowKey, depth: 1, limit: 10 });
      assertEqual(outline.payload.roots?.[0]?.text, `Readiness root ${index}`, 'immediate outline root');
      timings.push(roundMs(performance.now() - startedAt));
      await closeTrackedWindow(windowKey);
    }
    const maxMs = Math.max(...timings);
    assert(maxMs < 5000, `immediate create/read took too long: ${maxMs} ms`);
    measurements.readinessCreateAndReadMs = timings;
    return { timingsMs: timings, maxMs };
  });

  await runTest('Explicit window targeting prevents accidental writes with multiple tabs', async () => {
    const created = await callTool('mind_create_document', {
      title: `${titlePrefix}-main`,
      rootText: 'MCP Live QA Root',
      children: [],
      open: true,
    });
    mainWindowKey = created.payload.windowKey;
    assert(mainWindowKey, 'main test document should return windowKey');
    createdWindowKeys.add(mainWindowKey);
    const outline = await callTool('mind_get_document_outline', { windowKey: mainWindowKey, depth: 1, limit: 20 });
    mainRootId = outline.payload.roots?.[0]?.id;
    assert(mainRootId, 'main root id should exist');

    const guard = await callTool('mind_create_document', {
      title: `${titlePrefix}-ambiguity-guard`,
      rootText: 'Ambiguity guard',
      children: [],
      open: true,
    });
    const guardWindowKey = guard.payload.windowKey;
    createdWindowKeys.add(guardWindowKey);
    const ambiguous = await expectToolError('mind_create_nodes', {
      parentId: mainRootId,
      nodes: [{ text: 'This must never be created' }],
    }, 'AMBIGUOUS_WINDOW');
    assertEqual(ambiguous.payload?.error?.retryAllowed, true, 'ambiguous write retry guidance');
    assert(ambiguous.payload?.error?.suggestedAction?.includes('mind_list_windows'), 'ambiguous write should suggest listing windows');
    await closeTrackedWindow(guardWindowKey);
    return { protectedWindowKey: mainWindowKey, errorCode: ambiguous.code };
  });

  const nodeIds = {};
  await runTest('Hierarchical batch creation returns IDs and renders progressively', async () => {
    const created = await callTool('mind_create_nodes', {
      windowKey: mainWindowKey,
      parentId: mainRootId,
      maxNodes: 10,
      includeCreated: true,
      nodes: [
        {
          id: 'alpha',
          text: 'Alpha',
          note: 'note-alpha',
          markers: ['priority-1'],
          children: [{ id: 'alpha-child', text: 'Alpha child' }],
        },
        { id: 'beta', text: 'Beta' },
      ],
    });
    assertEqual(created.payload.createdCount, 3, 'hierarchical created count');
    assertEqual(created.payload.created?.length, 3, 'created detail count');
    nodeIds.alpha = created.payload.idMap?.alpha;
    nodeIds.alphaChild = created.payload.idMap?.['alpha-child'];
    nodeIds.beta = created.payload.idMap?.beta;
    assert(nodeIds.alpha && nodeIds.alphaChild && nodeIds.beta, 'idMap should resolve all client ids');
    mainRevision = created.payload.revision;
    assert(mainRevision, 'write should return a revision');
    assert(created.payload.execution, 'write should return execution timings');
    return {
      createdCount: created.payload.createdCount,
      revision: mainRevision,
      execution: created.payload.execution,
      wallMs: created.elapsedMs,
    };
  });

  await runTest('Outline, search, and focused subtree reads agree', async () => {
    const outline = await callTool('mind_get_document_outline', { windowKey: mainWindowKey, depth: 4, limit: 50 });
    const alphaChild = findOutlineNode(outline.payload.roots, (node) => node.text === 'Alpha child');
    assertEqual(alphaChild?.id, nodeIds.alphaChild, 'outline Alpha child id');

    const search = await callTool('mind_search_nodes', {
      windowKey: mainWindowKey,
      query: 'Alpha child',
      limit: 10,
    });
    assert(search.payload.results?.some((node) => node.id === nodeIds.alphaChild), 'search should find Alpha child');

    const subtree = await callTool('mind_get_subtree', {
      windowKey: mainWindowKey,
      nodeId: nodeIds.alpha,
      depth: 3,
      includeAncestors: true,
      includeSiblings: true,
      includeNotes: true,
      includeMetadata: true,
    });
    assertEqual(subtree.payload.subtree?.note, 'note-alpha', 'subtree note');
    assert(subtree.payload.subtree?.metadata?.markers?.includes('priority-1'), 'subtree markers');
    assertEqual(subtree.payload.ancestors?.at(-1)?.id, mainRootId, 'subtree ancestor');
    assert(subtree.payload.siblings?.some((node) => node.id === nodeIds.beta), 'subtree sibling');
    return { outlineNodeCount: outline.payload.nodeCount, searchMatches: search.payload.results.length };
  });

  await runTest('Dry run validates changes without mutating content or revision', async () => {
    const dryRun = await callTool('mind_apply_node_operations', {
      windowKey: mainWindowKey,
      expectedRevision: mainRevision,
      dryRun: true,
      includeResults: true,
      operations: [{ type: 'update_text', nodeId: nodeIds.alpha, text: 'SHOULD NOT APPLY' }],
    });
    assertEqual(dryRun.payload.dryRun, true, 'dry run flag');
    assertEqual(dryRun.payload.revision, mainRevision, 'dry run revision');
    const subtree = await callTool('mind_get_subtree', {
      windowKey: mainWindowKey,
      nodeId: nodeIds.alpha,
      depth: 0,
    });
    assertEqual(subtree.payload.subtree?.text, 'Alpha', 'dry run should not update text');
    return { revision: dryRun.payload.revision, changedPreview: dryRun.payload.changed };
  });

  const staleRevision = mainRevision;
  await runTest('Mixed edits commit atomically with one revision', async () => {
    const changed = await callTool('mind_apply_node_operations', {
      windowKey: mainWindowKey,
      expectedRevision: mainRevision,
      includeResults: true,
      operations: [
        { type: 'update_text', nodeId: nodeIds.alpha, text: 'Alpha Updated' },
        { type: 'update_note', nodeId: nodeIds.alpha, note: 'note-updated' },
        { type: 'update_metadata', nodeId: nodeIds.alpha, metadata: { markers: ['priority-2', 'star'], collapsed: false } },
        { type: 'create_node', parentId: nodeIds.beta, text: 'Beta child' },
        { type: 'set_root_secrecy', nodeId: mainRootId, secrecy: { level: 'confidential', durationYears: 1 } },
        { type: 'update_document_title', title: `${titlePrefix}-updated` },
      ],
    });
    assertEqual(changed.payload.appliedCount, 6, 'mixed applied count');
    assertEqual(changed.payload.results?.length, 6, 'mixed operation results');
    nodeIds.betaChild = changed.payload.results?.[3]?.nodeId;
    assert(nodeIds.betaChild, 'mixed transaction should return created node id');
    mainRevision = changed.payload.revision;

    const alpha = await callTool('mind_get_subtree', {
      windowKey: mainWindowKey,
      nodeId: nodeIds.alpha,
      depth: 0,
      includeNotes: true,
      includeMetadata: true,
    });
    assertEqual(alpha.payload.subtree?.text, 'Alpha Updated', 'mixed text update');
    assertEqual(alpha.payload.subtree?.note, 'note-updated', 'mixed note update');
    assert(alpha.payload.subtree?.metadata?.markers?.includes('star'), 'mixed marker update');

    const root = await callTool('mind_get_subtree', {
      windowKey: mainWindowKey,
      nodeId: mainRootId,
      depth: 0,
      includeMetadata: true,
    });
    assertEqual(root.payload.subtree?.metadata?.secrecy?.level, 'confidential', 'root secrecy update');
    return { appliedCount: changed.payload.appliedCount, revision: mainRevision, changed: changed.payload.changed };
  });

  await runTest('Stale revisions return actionable retry guidance', async () => {
    const revisionError = await expectToolError('mind_apply_node_operations', {
      windowKey: mainWindowKey,
      expectedRevision: staleRevision,
      operations: [{ type: 'update_text', nodeId: nodeIds.alpha, text: 'STALE WRITE' }],
    }, 'REVISION_MISMATCH');
    assertEqual(revisionError.payload?.error?.retryAllowed, true, 'revision mismatch tool guidance');
    assert(revisionError.payload?.error?.suggestedAction?.includes('latest'), 'revision mismatch should suggest reading latest state');

    const status = await callTool('mind_get_operation_status', { windowKey: mainWindowKey });
    assertEqual(status.payload.status, 'failed', 'failed operation status');
    assertEqual(status.payload.errorCode, 'REVISION_MISMATCH', 'failed operation error code');
    assertEqual(status.payload.retryAllowed, true, 'failed operation retry guidance');
    assertEqual(status.payload.agentAction, 'retry', 'failed operation Agent action');
    return {
      errorCode: revisionError.code,
      agentAction: status.payload.agentAction,
      retryAllowed: status.payload.retryAllowed,
    };
  });

  await runTest('Copy, move, and delete operations preserve tree consistency', async () => {
    const copied = await callTool('mind_apply_node_operations', {
      windowKey: mainWindowKey,
      expectedRevision: mainRevision,
      includeResults: true,
      operations: [{ type: 'copy_subtree', nodeId: nodeIds.alpha, newParentId: nodeIds.beta }],
    });
    nodeIds.alphaCopy = copied.payload.results?.[0]?.rootCopyId;
    assert(nodeIds.alphaCopy, 'copy_subtree should return rootCopyId');
    mainRevision = copied.payload.revision;

    const reorganized = await callTool('mind_apply_node_operations', {
      windowKey: mainWindowKey,
      expectedRevision: mainRevision,
      includeResults: true,
      operations: [
        { type: 'move_node', nodeId: nodeIds.alphaChild, newParentId: nodeIds.beta },
        { type: 'delete_node', nodeId: nodeIds.alphaCopy, deleteSubtree: true, includeDeletedIds: true },
      ],
    });
    mainRevision = reorganized.payload.revision;
    const beta = await callTool('mind_get_subtree', {
      windowKey: mainWindowKey,
      nodeId: nodeIds.beta,
      depth: 3,
    });
    assert(findSubtreeNode(beta.payload.subtree, (node) => node.id === nodeIds.alphaChild), 'moved child should be under Beta');
    await expectToolError('mind_get_subtree', {
      windowKey: mainWindowKey,
      nodeId: nodeIds.alphaCopy,
      depth: 1,
    }, 'INTERNAL_ERROR');
    return { revision: mainRevision, changed: reorganized.payload.changed };
  });

  await runTest('Save-as, normal save, and read-only file access persist changes', async () => {
    const savedAs = await callTool('mind_save_as_document', {
      windowKey: mainWindowKey,
      filePath: savedFilePath,
      overwrite: true,
    });
    assertEqual(path.resolve(savedAs.payload.filePath), path.resolve(savedFilePath), 'save-as path');
    const fileStat = await fs.stat(savedFilePath);
    assert(fileStat.size > 0, 'saved .amind file should not be empty');

    const persistedText = `Persisted ${runId}`;
    const changed = await callTool('mind_apply_node_operations', {
      windowKey: mainWindowKey,
      expectedRevision: mainRevision,
      operations: [{ type: 'update_text', nodeId: nodeIds.betaChild, text: persistedText }],
    });
    mainRevision = changed.payload.revision;
    const saved = await callTool('mind_save_document', { windowKey: mainWindowKey });
    assertEqual(path.resolve(saved.payload.filePath), path.resolve(savedFilePath), 'normal save path');

    const fileSearch = await callTool('mind_read_file', {
      filePath: savedFilePath,
      mode: 'search',
      query: persistedText,
      limit: 10,
    });
    assert(fileSearch.payload.results?.some((node) => node.id === nodeIds.betaChild), 'read_file should see persisted text');
    measurements.savedFileBytes = fileStat.size;
    return { fileBytes: fileStat.size, saveAsMs: savedAs.elapsedMs, saveMs: saved.elapsedMs };
  });

  await runTest('File subtree import works inside an open target window', async () => {
    const target = await callTool('mind_create_document', {
      title: `${titlePrefix}-import-target`,
      rootText: 'Import target',
      children: [],
      open: true,
    });
    const targetWindowKey = target.payload.windowKey;
    createdWindowKeys.add(targetWindowKey);
    const targetOutline = await callTool('mind_get_document_outline', { windowKey: targetWindowKey, depth: 1, limit: 10 });
    const targetRootId = targetOutline.payload.roots?.[0]?.id;
    assert(targetRootId, 'import target root id');

    const sourceOutline = await callTool('mind_read_file', {
      filePath: savedFilePath,
      mode: 'outline',
      depth: 4,
      limit: 100,
    });
    const sourceRootId = (sourceOutline.payload.outline || sourceOutline.payload).roots?.[0]?.id;
    assert(sourceRootId, 'source root id');

    const imported = await callTool('mind_import_file_subtree', {
      sourceFilePath: savedFilePath,
      sourceNodeId: sourceRootId,
      targetWindowKey,
      targetParentId: targetRootId,
      titleOverride: 'Imported QA branch',
      includeNotes: true,
      includeIdMap: true,
    });
    assert(imported.payload.changed?.created > 0, 'import should create nodes');
    assert(Object.keys(imported.payload.idMap || {}).length > 0, 'import should return id map');
    const search = await callTool('mind_search_nodes', {
      windowKey: targetWindowKey,
      query: 'Imported QA branch',
      limit: 10,
    });
    assertEqual(search.payload.results?.length, 1, 'imported root search result');
    await closeTrackedWindow(targetWindowKey);
    return { importedCount: imported.payload.changed.created, wallMs: imported.elapsedMs };
  });

  await runTest('Saved document reopens and is immediately readable', async () => {
    const oldWindowKey = mainWindowKey;
    await closeTrackedWindow(oldWindowKey);
    mainWindowKey = null;
    const opened = await callTool('mind_manage_windows', {
      action: 'open_amind',
      filePath: savedFilePath,
    });
    mainWindowKey = opened.payload.windowKey;
    assert(mainWindowKey, 'reopened document should return windowKey');
    createdWindowKeys.add(mainWindowKey);
    const outline = await callTool('mind_get_document_outline', {
      windowKey: mainWindowKey,
      depth: 4,
      limit: 100,
    });
    assert(findOutlineNode(outline.payload.roots, (node) => node.text === `Persisted ${runId}`), 'reopened outline should contain persisted update');
    return { reopenedWindowKey: mainWindowKey, nodeCount: outline.payload.nodeCount };
  });

  await runTest('Concurrent writes are rejected while progress remains observable', async () => {
    const perfDoc = await callTool('mind_create_document', {
      title: `${titlePrefix}-performance-${performanceNodeCount}`,
      rootText: 'MCP performance root',
      children: [],
      open: true,
    });
    const perfWindowKey = perfDoc.payload.windowKey;
    createdWindowKeys.add(perfWindowKey);
    const perfOutline = await callTool('mind_get_document_outline', { windowKey: perfWindowKey, depth: 1, limit: 10 });
    const perfRootId = perfOutline.payload.roots?.[0]?.id;
    assert(perfRootId, 'performance root id');

    const startedAt = performance.now();
    const mutationPromise = callTool('mind_create_nodes', {
      windowKey: perfWindowKey,
      parentId: perfRootId,
      nodes: buildBalancedNodes(performanceNodeCount),
      maxNodes: performanceNodeCount,
    });
    mutationPromise.catch(() => {});
    let firstObservedStatus = null;
    let progressPollCount = 0;
    while (performance.now() - startedAt < 5000) {
      const status = await callTool('mind_get_operation_status', { windowKey: perfWindowKey });
      progressPollCount += 1;
      if (status.payload.inProgress === true) {
        firstObservedStatus = status.payload;
        break;
      }
      await delay(2);
    }
    assert(firstObservedStatus, 'first write should enter an observable in-progress state');
    const concurrentErrorPromise = expectToolError('mind_apply_node_operations', {
      windowKey: perfWindowKey,
      operations: [{ type: 'update_text', nodeId: perfRootId, text: 'Concurrent write must not win' }],
    }, 'OPERATION_IN_PROGRESS');

    let firstProgressMs = null;
    while (performance.now() - startedAt < 10000) {
      const status = await callTool('mind_get_operation_status', { windowKey: perfWindowKey });
      progressPollCount += 1;
      if ((status.payload.completedCount ?? 0) > 0) {
        firstProgressMs = roundMs(performance.now() - startedAt);
        break;
      }
      if (status.payload.terminal === true && status.payload.status !== 'idle') break;
      await delay(5);
    }

    const [mutation, concurrentError] = await Promise.all([mutationPromise, concurrentErrorPromise]);
    const finalStatus = await callTool('mind_get_operation_status', { windowKey: perfWindowKey });
    assert(firstObservedStatus, 'Agent should observe an operation status');
    assertEqual(firstObservedStatus.retryAllowed, false, 'in-progress status retry guidance');
    assertEqual(firstObservedStatus.agentAction, 'wait', 'in-progress Agent action');
    assert(firstProgressMs != null, 'Agent should observe visible progress before completion');
    assertEqual(concurrentError.payload?.error?.retryAllowed, false, 'concurrent write retry guidance');
    assert(concurrentError.payload?.error?.suggestedAction?.includes('mind_get_operation_status'), 'concurrent write should suggest status polling');
    assertEqual(finalStatus.payload.status, 'completed', 'final operation status');
    assertEqual(finalStatus.payload.progressPercent, 100, 'final operation progress');
    assertEqual(finalStatus.payload.agentAction, 'continue', 'completed Agent action');
    assertEqual(finalStatus.payload.retryAllowed, false, 'completed operation must not be repeated');
    assertEqual(mutation.payload.changed?.created, performanceNodeCount, 'performance created count');
    assert(mutation.payload.execution?.renderPassCount > 1, 'large write should render progressively');
    assert(mutation.payload.execution?.firstRenderMs != null, 'large write should report first render time');

    const diagnostics = await callTool('mind_get_diagnostics', { traceId: mutation.traceId, limit: 5 });
    const diagnostic = diagnostics.payload.entries?.find((entry) => entry.traceId === mutation.traceId);
    assert(diagnostic, 'diagnostics should contain the mutation trace');

    const wallMs = roundMs(performance.now() - startedAt);
    assert(firstProgressMs < 1000, `first visible progress is too slow: ${firstProgressMs} ms`);
    assert(wallMs < 10000, `large write is too slow: ${wallMs} ms`);
    measurements.performance = {
      nodeCount: performanceNodeCount,
      wallMs,
      firstProgressMs,
      mutationToolMs: mutation.elapsedMs,
      firstRenderMs: mutation.payload.execution.firstRenderMs,
      totalRendererMs: mutation.payload.execution.totalMs,
      renderPassCount: mutation.payload.execution.renderPassCount,
      progressPollCount,
      firstObservedStatus: {
        status: firstObservedStatus.status,
        health: firstObservedStatus.health,
        agentAction: firstObservedStatus.agentAction,
        retryAllowed: firstObservedStatus.retryAllowed,
      },
      finalStatus: {
        status: finalStatus.payload.status,
        progressPercent: finalStatus.payload.progressPercent,
        agentAction: finalStatus.payload.agentAction,
        retryAllowed: finalStatus.payload.retryAllowed,
      },
      diagnostic: {
        totalMs: diagnostic.totalMs,
        rendererMs: diagnostic.rendererMs,
        stdioRoundTripMs: diagnostic.stdioRoundTripMs,
      },
    };
    await closeTrackedWindow(perfWindowKey);
    return measurements.performance;
  });
}

let fatalError = null;
try {
  await main();
} catch (error) {
  fatalError = error;
} finally {
  await cleanup();
}

const passed = testResults.filter((result) => result.status === 'passed').length;
const failed = testResults.filter((result) => result.status === 'failed').length;
process.stdout.write(`${JSON.stringify({
  ok: failed === 0 && !fatalError,
  runId,
  passed,
  failed,
  performanceNodeCount,
  measurements,
  tests: testResults,
  cleanup: {
    remainingTrackedWindows: createdWindowKeys.size,
    temporaryFilesRemoved: [...temporaryFilePaths],
    originalWindowRestored: originalWindowKey,
  },
  ...(fatalError ? { fatalError: fatalError instanceof Error ? fatalError.message : String(fatalError) } : {}),
}, null, 2)}\n`);

if (fatalError || failed > 0) process.exitCode = 1;
