// 仅处理传输失败；调用方先证明操作可安全重试，业务结果不由此模块重放。
export function retryableTransport(error, signal) {
  if (signal?.aborted) return false;
  const status = Number(error?.status || 0);
  if (status) return [408, 429, 500, 502, 503, 504].includes(status);
  return error?.name === 'AbortError' || error?.name === 'TimeoutError'
    || /fetch failed|network|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(String(error?.message || error?.code || ''));
}

export function retryAfterMs(value, now = Date.now()) {
  if (value == null || value === '') return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(String(value));
  return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}

export function waitForRetry(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason || new Error('operation_aborted')); return; }
    const clear = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
    const abort = () => { clear(); reject(signal.reason || new Error('operation_aborted')); };
    // 避免超大 Retry-After 被 setTimeout 溢出为立即重试。
    const chunk = Math.min(ms, 2_147_000_000);
    const timer = setTimeout(() => {
      clear();
      if (ms > chunk) waitForRetry(ms - chunk, signal).then(resolve, reject);
      else resolve();
    }, chunk);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export async function retryTransport(operation, { signal, onRetry, sleep = waitForRetry, continuous = false } = {}) {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    try { return await operation(); }
    catch (error) {
      if ((!continuous && attempt >= 3) || !retryableTransport(error, signal)) throw error;
      const base = attempt < 3 ? 1000 * 2 ** attempt : Math.min(60000, 15000 * 2 ** Math.min(attempt - 3, 2));
      const delay = Math.max(base, Number(error.retryAfterMs || 0));
      await onRetry?.({ attempt: attempt + 1, delay_ms: delay, status: Number(error.status || 0) });
      await sleep(delay, signal);
    }
  }
}
