import { spawn } from 'node:child_process';
import process from 'node:process';
import readline from 'node:readline';

const nodeCount = Math.max(1, Math.min(5000, Number.parseInt(process.argv[2] || '642', 10) || 642));
const keepOpen = process.argv.includes('--keep-open');
const child = spawn(process.execPath, ['asynctest-mind-mcp.mjs'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'inherit'],
});
const output = readline.createInterface({ input: child.stdout });
const pending = new Map();
let nextId = 1;

output.on('line', (line) => {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message || JSON.stringify(message.error)));
  else request.resolve(message.result);
});

function request(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callTool(name, args = {}) {
  const startedAt = performance.now();
  const response = await request('tools/call', { name, arguments: args });
  const elapsedMs = Math.round((performance.now() - startedAt) * 100) / 100;
  const text = response?.content?.find((item) => item.type === 'text')?.text || '{}';
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }
  if (response?.isError) {
    const error = new Error(payload?.error?.message || `${name} failed`);
    error.payload = payload;
    throw error;
  }
  return { response, payload, elapsedMs, traceId: response?._meta?.traceId ?? null };
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

let windowKey = null;
try {
  await request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'mind-benchmark', version: '1.0.0' } });
  const capabilities = await callTool('mind_get_mcp_capabilities');
  const created = await callTool('mind_create_document', {
    title: keepOpen ? `MCP ${nodeCount} 节点渐进显示测试` : `MCP ${nodeCount} 节点性能测试`,
    rootText: 'MCP 性能测试',
    open: true,
  });
  windowKey = created.payload.windowKey;
  const outline = await callTool('mind_get_document_outline', { windowKey, depth: 1, limit: 20 });
  const rootId = outline.payload?.roots?.[0]?.id;
  if (!windowKey || !rootId) throw new Error('Benchmark document target was not created correctly');

  const mutationPromise = callTool('mind_create_nodes', {
    windowKey,
    parentId: rootId,
    nodes: buildBalancedNodes(nodeCount),
    maxNodes: nodeCount,
  });
  const mutationStartedAt = performance.now();
  let statusDuringMutation = null;
  let firstProgressWallMs = null;
  while (performance.now() - mutationStartedAt < 10000) {
    const observedStatus = await callTool('mind_get_operation_status', { windowKey });
    statusDuringMutation ||= observedStatus.payload;
    if ((observedStatus.payload?.completedCount ?? 0) > 0) {
      firstProgressWallMs = Math.round((performance.now() - mutationStartedAt) * 100) / 100;
      statusDuringMutation = observedStatus.payload;
      break;
    }
    if (observedStatus.payload?.terminal === true && observedStatus.payload?.status !== 'idle') break;
    await delay(5);
  }
  const mutation = await mutationPromise;
  const status = await callTool('mind_get_operation_status', { windowKey });
  const diagnostics = await callTool('mind_get_diagnostics', { traceId: mutation.traceId, limit: 5 });

  process.stdout.write(`${JSON.stringify({
    requestedNodeCount: nodeCount,
    windowKey,
    keptOpen: keepOpen,
    mcpVersion: capabilities.payload.version,
    capabilityRevision: capabilities.payload.capabilityRevision,
    mutationWallMs: mutation.elapsedMs,
    mutationTraceId: mutation.traceId,
    transactionId: mutation.payload.transactionId,
    changed: mutation.payload.changed,
    execution: mutation.payload.execution,
    firstProgressWallMs,
    operationStatusDuringMutation: statusDuringMutation,
    operationStatus: status.payload,
    diagnostics: diagnostics.payload.entries,
  }, null, 2)}\n`);
} finally {
  if (windowKey && !keepOpen) {
    await callTool('mind_manage_windows', { action: 'close_window', windowKey, mode: 'discard' }).catch(() => {});
  }
  await callTool('mind_end_agent_session', { reason: 'benchmark-complete' }).catch(() => {});
  child.stdin.end();
  output.close();
  child.kill('SIGTERM');
}
