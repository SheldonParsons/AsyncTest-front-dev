/** HTTP 响应头不是生成完成；期限必须覆盖流式正文直到 result 完成。 */
export function providerDeadline({ signal, timeoutMs, onTimeout }) {
  const controller = new AbortController();
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  const timer = setTimeout(() => {
    if (!combined.aborted) {
      onTimeout();
      controller.abort(new DOMException("Provider stream deadline exceeded", "TimeoutError"));
    }
  }, timeoutMs);
  timer.unref?.();
  const clear = () => clearTimeout(timer);
  combined.addEventListener("abort", clear, { once: true });
  if (combined.aborted) clear();
  return {
    signal: combined,
    dispose() {
      clear();
      combined.removeEventListener("abort", clear);
    },
  };
}
