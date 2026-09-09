/** 检测生成无进展，不限制持续产生有效增量的请求总时长。 */
export function providerDeadline({ signal, timeoutMs, onTimeout }) {
  const controller = new AbortController();
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  let timer;
  let disposed = false;
  const expire = () => {
    if (!combined.aborted) {
      onTimeout();
      controller.abort(new DOMException("Provider stream made no progress", "TimeoutError"));
    }
  };
  const progress = () => {
    clearTimeout(timer);
    if (disposed || combined.aborted) return;
    timer = setTimeout(expire, timeoutMs);
    timer.unref?.();
  };
  progress();
  const clear = () => clearTimeout(timer);
  combined.addEventListener("abort", clear, { once: true });
  if (combined.aborted) clear();
  return {
    signal: combined,
    progress,
    dispose() {
      disposed = true;
      clear();
      combined.removeEventListener("abort", clear);
    },
  };
}
