export const ASYNCTEST_MIND_MCP_VERSION = '0.6.1';
export const ASYNCTEST_MIND_MCP_CAPABILITY_REVISION = 12;
export const ASYNCTEST_MIND_MCP_PROTOCOL_REVISION = 2;
export const ASYNCTEST_MIND_MCP_RESPONSE_PROFILE = 'compact-by-default';
export const ASYNCTEST_MIND_MCP_UPDATED_AT = '2026-07-18';
export const ASYNCTEST_MIND_MCP_TIMEZONE = 'Asia/Shanghai';

const ERROR_DEFINITIONS = {
  USER_STOPPED: {
    recoverable: true,
    retryAllowed: false,
    suggestedAction: 'Stop the current operation. Do not retry until the user explicitly resumes this window.',
  },
  MCP_CONTROL_REVOKED: {
    recoverable: true,
    retryAllowed: false,
    suggestedAction: 'Stop all AsyncTest Mind tool calls. Wait until the user explicitly asks to restore control.',
  },
  REVISION_MISMATCH: {
    recoverable: true,
    retryAllowed: true,
    suggestedAction: 'Read the latest document state, then retry with the current revision.',
  },
  AMBIGUOUS_WINDOW: {
    recoverable: true,
    retryAllowed: true,
    suggestedAction: 'Call mind_list_windows, choose the intended windowKey, then retry with that explicit windowKey.',
  },
  WINDOW_NOT_FOUND: {
    recoverable: true,
    retryAllowed: true,
    suggestedAction: 'Call mind_list_windows and choose an existing windowKey.',
  },
  BRIDGE_UNAVAILABLE: {
    recoverable: true,
    retryAllowed: true,
    suggestedAction: 'Open or restart AsyncTest, then retry.',
  },
  BRIDGE_NOT_READY: {
    recoverable: true,
    retryAllowed: true,
    suggestedAction: 'Wait until AsyncTest Mind is ready, then retry.',
  },
  MCP_VERSION_MISMATCH: {
    recoverable: true,
    retryAllowed: false,
    suggestedAction: 'Restart the AI Agent so it loads the MCP version embedded in the current AsyncTest application.',
  },
  INVALID_ARGUMENT: {
    recoverable: true,
    retryAllowed: true,
    suggestedAction: 'Check the required parameters and retry with corrected values.',
  },
  OPERATION_ABORTED: {
    recoverable: true,
    retryAllowed: false,
    suggestedAction: 'Read the current document state before deciding whether to continue.',
  },
  INTERNAL_ERROR: {
    recoverable: false,
    retryAllowed: false,
    suggestedAction: 'Report the error and avoid repeating the same call without investigation.',
  },
};

export function getAsyncTestMindMcpIdentity() {
  return {
    version: ASYNCTEST_MIND_MCP_VERSION,
    capabilityRevision: ASYNCTEST_MIND_MCP_CAPABILITY_REVISION,
    protocolRevision: ASYNCTEST_MIND_MCP_PROTOCOL_REVISION,
    updatedAt: ASYNCTEST_MIND_MCP_UPDATED_AT,
  };
}

export function compareMindMcpIdentity(identity) {
  const current = getAsyncTestMindMcpIdentity();
  if (!identity?.version || !Number.isFinite(Number(identity?.capabilityRevision))) {
    return { mismatch: true, reason: 'legacy-or-unknown', current };
  }
  if (Number(identity.protocolRevision || 0) !== current.protocolRevision) {
    return { mismatch: true, reason: 'protocol-revision', current };
  }
  if (identity.version !== current.version || Number(identity.capabilityRevision) !== current.capabilityRevision) {
    return { mismatch: true, reason: 'version-or-capability', current };
  }
  return { mismatch: false, reason: null, current };
}

export function assertMindMcpIdentityCompatible(identity) {
  const comparison = compareMindMcpIdentity(identity);
  if (!comparison.mismatch) return comparison;
  throw createMindMcpError(
    'MCP_VERSION_MISMATCH',
    '当前 AI Agent 使用的 AsyncTest Mind MCP 与应用内置版本不一致，请重启 AI Agent。',
    {
      details: {
        connected: identity || null,
        expected: comparison.current,
        reason: comparison.reason,
      },
    }
  );
}

export function createMindMcpError(code, message, options = {}) {
  const definition = ERROR_DEFINITIONS[code] || ERROR_DEFINITIONS.INTERNAL_ERROR;
  const error = new Error(message || code);
  error.code = code;
  error.recoverable = options.recoverable ?? definition.recoverable;
  error.retryAllowed = options.retryAllowed ?? definition.retryAllowed;
  error.suggestedAction = options.suggestedAction || definition.suggestedAction;
  if (options.details && typeof options.details === 'object') error.details = options.details;
  return error;
}

export function normalizeMindMcpError(error, fallbackCode = 'INTERNAL_ERROR') {
  const code = error?.code || fallbackCode;
  const definition = ERROR_DEFINITIONS[code] || ERROR_DEFINITIONS[fallbackCode] || ERROR_DEFINITIONS.INTERNAL_ERROR;
  return {
    code,
    message: typeof error?.message === 'string' ? error.message : String(error || code),
    recoverable: error?.recoverable ?? definition.recoverable,
    retryAllowed: error?.retryAllowed ?? definition.retryAllowed,
    suggestedAction: error?.suggestedAction || definition.suggestedAction,
    ...(error?.details && typeof error.details === 'object' ? { details: error.details } : {}),
  };
}
