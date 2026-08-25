export const MIND_RENDERER_IDLE_TIMEOUT_MS = 30000;
export const MIND_RENDERER_HARD_TIMEOUT_MS = 300000;

const LONG_RUNNING_RENDERER_METHODS = new Set([
  'mind.commitDocumentTransaction',
]);

export function getMindRendererTimeoutPolicy(method) {
  return {
    idleTimeoutMs: MIND_RENDERER_IDLE_TIMEOUT_MS,
    hardTimeoutMs: MIND_RENDERER_HARD_TIMEOUT_MS,
    keepWaitingAfterIdle: LONG_RUNNING_RENDERER_METHODS.has(method),
  };
}
