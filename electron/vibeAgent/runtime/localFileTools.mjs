/** Bind Pi's public local execution tools to the child-owned Node environment. */
import { createDocumentReadTool } from "./localDocumentParser.mjs";

export const LOCAL_FILE_TOOL_NAMES = Object.freeze(["read", "write", "edit", "bash"]);

export function createLocalFileTools({ core, codingAgent, NodeExecutionEnv, documentParsers = null, cwd = process.cwd() } = {}) {
  if (!core || !codingAgent || typeof NodeExecutionEnv !== "function") {
    throw new Error("pi_local_file_runtime_unavailable");
  }
  const factories = [
    codingAgent.createReadToolDefinition,
    codingAgent.createWriteToolDefinition,
    codingAgent.createEditToolDefinition,
    codingAgent.createBashToolDefinition,
  ];
  if (factories.some((factory) => typeof factory !== "function")) {
    throw new Error("pi_local_file_exports_unavailable");
  }
  const env = new NodeExecutionEnv({ cwd: String(cwd || process.cwd()), shellEnv: process.env });
  const cleanups = [];
  const tools = factories.map((factory, index) => {
    const tool = factory(String(cwd || process.cwd()));
    if (index === 0 && documentParsers) {
      const adapted = createDocumentReadTool({ core, env, officialRead: tool, parsers: documentParsers });
      if (typeof adapted.cleanup === "function") cleanups.push(adapted.cleanup);
      return adapted;
    }
    return tool;
  });
  const cleanup = async () => {
    await Promise.allSettled(cleanups.map((dispose) => dispose()));
  };
  const runtime = { env, tools };
  // Additive/non-enumerable keeps the historical `{ env, tools }` shape for
  // callers that inspect or serialize the adapter while exposing teardown to
  // the runner.
  Object.defineProperty(runtime, "cleanup", { value: cleanup, enumerable: false });
  return runtime;
}
