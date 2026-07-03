/**
 * Mind Agent Bridge —— 仅开发环境使用。
 *
 * 作用：让外部 Agent（Claude）把"测试用例指令"写进项目里的
 *   .mind-agent/ops.jsonl 文件，由 Vite dev 插件（见 vite/mindAgentPlugin.ts）
 *   通过 HMR 通道推送到本模块，再调用思维导图现有命令系统逐条执行，
 *   于是开发者能在 dev 窗口里看到节点"动画式"逐个生成。
 *
 * 该模块不包含任何生产逻辑，只在 import.meta.env.DEV 下被动态加载。
 */

export type MindAgentOp =
  | { op: 'reset'; runId?: string }
  | { op: 'anchor'; ref: string; parent: string; index: number }
  | { op: 'node'; ref: string; parent: string; text: string; style?: string }
  | { op: 'setRootText'; text: string }
  | { op: 'setNodeText'; ref: string; text: string }
  | { op: 'setChildText'; parent: string; index: number; text: string }
  | { op: 'deleteChildrenExcept'; parent: string; keepIndex: number }
  | { op: 'relation'; from: string; to: string; label?: string }
  | { op: 'save' };

export interface MindAgentApi {
  /** 返回主根节点 id（指令里 parent 用 "$root" 指向它）。*/
  getRootNodeId: () => string | null;
  /** 返回某节点的常规子节点 id 列表（按显示顺序）。*/
  getChildIds: (parentId: string) => string[];
  /** 在 parentId 下新增子节点，返回新节点 id。*/
  addChild: (parentId: string, text: string, style?: string) => string | null;
  /** 修改已有节点的文本。*/
  setNodeText: (nodeId: string, text: string) => boolean;
  /** 删除某节点（及其子树）。*/
  deleteNode: (nodeId: string) => boolean;
  /** 在两个节点之间建连线。*/
  addRelation: (fromId: string, toId: string, label?: string) => boolean;
  /** 保存当前文档（本地 .amind）。*/
  save: () => Promise<boolean> | boolean;
  /** 选中/聚焦某节点（用于可视化高亮）。*/
  focus?: (nodeId: string) => void;
}

const ROOT_REF = '$root';
/** 每条指令之间的间隔（ms），用于"逐个长出来"的动画观感。*/
const DEFAULT_STEP_DELAY = 200;

export function setupMindAgentBridge(api: MindAgentApi, options?: { stepDelayMs?: number }) {
  if (!import.meta.hot) return;
  const stepDelay = options?.stepDelayMs ?? DEFAULT_STEP_DELAY;

  const refToId = new Map<string, string>();
  let currentRunId: string | null = null;
  let applied = 0;
  let running = false;
  let queued: MindAgentOp[] | null = null;

  function resolveId(ref: string): string | null {
    if (!ref || ref === ROOT_REF) return api.getRootNodeId();
    return refToId.get(ref) ?? null;
  }

  async function applyOne(op: MindAgentOp): Promise<void> {
    switch (op.op) {
      case 'reset': {
        refToId.clear();
        return;
      }
      case 'anchor': {
        const parentId = resolveId(op.parent);
        const childIds = parentId ? api.getChildIds(parentId) : [];
        const target = childIds[op.index];
        if (target) refToId.set(op.ref, target);
        else console.warn('[mind-agent] anchor 索引越界，跳过：', op, '现有子节点数', childIds.length);
        return;
      }
      case 'node': {
        const parentId = resolveId(op.parent);
        if (!parentId) {
          console.warn('[mind-agent] 找不到父节点，跳过：', op);
          return;
        }
        const id = api.addChild(parentId, op.text, op.style);
        if (id) {
          refToId.set(op.ref, id);
          api.focus?.(id);
        }
        return;
      }
      case 'setRootText': {
        const rootId = api.getRootNodeId();
        if (rootId) {
          api.setNodeText(rootId, op.text);
          api.focus?.(rootId);
        }
        return;
      }
      case 'setNodeText': {
        const nodeId = resolveId(op.ref);
        if (nodeId) {
          api.setNodeText(nodeId, op.text);
          api.focus?.(nodeId);
        } else {
          console.warn('[mind-agent] 找不到目标节点，跳过：', op);
        }
        return;
      }
      case 'setChildText': {
        const parentId = resolveId(op.parent);
        const childIds = parentId ? api.getChildIds(parentId) : [];
        const target = childIds[op.index];
        if (target) {
          api.setNodeText(target, op.text);
          api.focus?.(target);
        } else {
          console.warn('[mind-agent] 子节点索引越界，跳过：', op, '现有子节点数', childIds.length);
        }
        return;
      }
      case 'deleteChildrenExcept': {
        const parentId = resolveId(op.parent);
        const childIds = parentId ? api.getChildIds(parentId) : [];
        // 倒序删除，避免索引位移；保留 keepIndex 对应的节点。
        for (let i = childIds.length - 1; i >= 0; i -= 1) {
          if (i === op.keepIndex) continue;
          api.deleteNode(childIds[i]);
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, stepDelay));
        }
        return;
      }
      case 'relation': {
        const fromId = resolveId(op.from);
        const toId = resolveId(op.to);
        if (fromId && toId) api.addRelation(fromId, toId, op.label);
        else console.warn('[mind-agent] 连线端点未就绪，跳过：', op);
        return;
      }
      case 'save': {
        await api.save();
        return;
      }
    }
  }

  async function drain(): Promise<void> {
    if (running) return;
    running = true;
    try {
      while (queued && applied < queued.length) {
        const op = queued[applied];
        // eslint-disable-next-line no-await-in-loop
        await applyOne(op);
        applied += 1;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, stepDelay));
      }
    } catch (error) {
      console.error('[mind-agent] 执行指令出错：', error);
    } finally {
      running = false;
    }
  }

  function handleOps(ops: MindAgentOp[]) {
    // 通过首条 reset 指令的 runId 判定是否新一轮：换 runId 则清空进度与引用表。
    const head = ops[0];
    const runId = head && head.op === 'reset' ? head.runId ?? 'run' : null;
    if (runId !== null && runId !== currentRunId) {
      currentRunId = runId;
      applied = 0;
      refToId.clear();
    }
    // 文件被截断/缩短：视为新一轮。
    if (queued && ops.length < applied) {
      applied = 0;
      refToId.clear();
    }
    queued = ops;
    void drain();
  }

  import.meta.hot.on('mind-agent:ops', (payload: { ops?: MindAgentOp[] }) => {
    handleOps(Array.isArray(payload?.ops) ? payload.ops : []);
  });
  // 通知插件：客户端已就绪，请把当前 ops 文件内容推过来。
  import.meta.hot.send('mind-agent:ready');
  console.info('[mind-agent] 桥接已就绪，等待 .mind-agent/ops.jsonl 指令…');
}
