import fs from "node:fs";
import path from "node:path";
import type { Plugin, ViteDevServer } from "vite";

/**
 * Mind Agent 开发插件 —— 仅在 dev server 生效。
 *
 * 监听项目根目录下的 .mind-agent/ops.jsonl（JSON Lines，每行一条指令），
 * 文件变化时把解析后的指令数组通过 HMR 自定义事件推送给前端
 * （前端 src/mind/dev/agentBridge.ts 接收并逐条执行）。
 *
 * 外部 Agent 只需向该文件写入指令即可，无需访问浏览器/本机网络。
 */

const OPS_REL_PATH = ".mind-agent/ops.jsonl";
const EVENT = "mind-agent:ops";
const READY = "mind-agent:ready";

function parseOps(raw: string): unknown[] {
  const ops: unknown[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;
    try {
      ops.push(JSON.parse(trimmed));
    } catch (error) {
      console.warn("[mind-agent] 跳过无法解析的指令行：", trimmed);
    }
  }
  return ops;
}

export function mindAgentPlugin(): Plugin {
  let opsPath = "";

  function readAndSend(server: ViteDevServer) {
    let ops: unknown[] = [];
    try {
      if (fs.existsSync(opsPath)) {
        ops = parseOps(fs.readFileSync(opsPath, "utf-8"));
      }
    } catch (error) {
      console.error("[mind-agent] 读取 ops 文件失败：", error);
    }
    server.ws.send({ type: "custom", event: EVENT, data: { ops } });
  }

  return {
    name: "vite-plugin-mind-agent",
    apply: "serve",
    configureServer(server) {
      const root = server.config.root || process.cwd();
      opsPath = path.resolve(root, OPS_REL_PATH);
      const opsDir = path.dirname(opsPath);
      try {
        fs.mkdirSync(opsDir, { recursive: true });
        if (!fs.existsSync(opsPath)) fs.writeFileSync(opsPath, "", "utf-8");
      } catch (error) {
        console.error("[mind-agent] 初始化 ops 目录失败：", error);
      }

      server.watcher.add(opsPath);
      const onChange = (changed: string) => {
        if (path.resolve(changed) === opsPath) readAndSend(server);
      };
      server.watcher.on("add", onChange);
      server.watcher.on("change", onChange);

      // 前端就绪时主动推一次当前内容。
      server.ws.on(READY, () => readAndSend(server));

      server.config.logger.info(
        `[mind-agent] 监听指令文件: ${path.relative(root, opsPath)}`
      );
    },
  };
}

export default mindAgentPlugin;
