const EXPECTED_CLOSED_OUTPUT_CODES = new Set([
  'EPIPE',
  'ERR_STREAM_DESTROYED',
  'ERR_STREAM_WRITE_AFTER_END',
]);

const guardedStreams = new WeakMap();

export function isClosedProcessOutputError(error) {
  return EXPECTED_CLOSED_OUTPUT_CODES.has(error?.code);
}

function ensureStreamGuard(stream, streamName) {
  if (!stream || typeof stream.on !== 'function') return null;

  const existing = guardedStreams.get(stream);
  if (existing) return existing;

  const state = {
    streamName,
    brokenPipeDetected: false,
    brokenPipeListeners: new Set(),
    unexpectedErrorListeners: new Set(),
  };

  state.handleError = (error) => {
    if (isClosedProcessOutputError(error)) {
      state.brokenPipeDetected = true;
      for (const listener of state.brokenPipeListeners) {
        try {
          listener({ error, streamName: state.streamName });
        } catch {
          // A closed process output stream must never trigger another console write.
        }
      }
      return;
    }

    if (state.unexpectedErrorListeners.size) {
      for (const listener of state.unexpectedErrorListeners) listener({ error, streamName: state.streamName });
      return;
    }

    // Preserve Node's default behavior for output failures that are not normal pipe shutdowns.
    setImmediate(() => {
      throw error;
    });
  };

  stream.on('error', state.handleError);
  guardedStreams.set(stream, state);
  return state;
}

export function installProcessOutputSafety({
  stdout = process.stdout,
  stderr = process.stderr,
  onBrokenPipe,
  onUnexpectedError,
} = {}) {
  const states = [
    ensureStreamGuard(stdout, 'stdout'),
    ensureStreamGuard(stderr, 'stderr'),
  ].filter(Boolean);

  for (const state of states) {
    if (typeof onBrokenPipe === 'function') state.brokenPipeListeners.add(onBrokenPipe);
    if (typeof onUnexpectedError === 'function') state.unexpectedErrorListeners.add(onUnexpectedError);
  }

  return {
    hasClosedOutput: () => states.some((state) => state.brokenPipeDetected),
    dispose() {
      for (const state of states) {
        if (typeof onBrokenPipe === 'function') state.brokenPipeListeners.delete(onBrokenPipe);
        if (typeof onUnexpectedError === 'function') state.unexpectedErrorListeners.delete(onUnexpectedError);
      }
    },
  };
}
