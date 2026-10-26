export const ASYNCTEST_MIND_MCP_VERSION = '0.8.0';
export const ASYNCTEST_MIND_MCP_CAPABILITY_REVISION = 16;
export const ASYNCTEST_MIND_MCP_MIN_COMPATIBLE_CAPABILITY_REVISION = 12;
export const ASYNCTEST_MIND_MCP_PROTOCOL_REVISION = 2;
export const ASYNCTEST_MIND_MCP_RESPONSE_PROFILE = 'compact-by-default';
export const ASYNCTEST_MIND_MCP_UPDATED_AT = '2026-10-26';
export const ASYNCTEST_MIND_MCP_TIMEZONE = 'Asia/Shanghai';

const ERROR_DEFINITIONS = {
  FILE_IN_USE: {
    recoverable: true, retryAllowed: false,
    suggestedAction: 'Choose another outputFilePath, or ask the user to save and close the target document. Never auto-close an open document to bypass this protection.',
  },
  FILE_ALREADY_EXISTS: {
    recoverable: true, retryAllowed: true,
    suggestedAction: 'Choose another outputFilePath, or pass overwrite=true only when overwriting is intended.',
  },
  SAME_FILE: {
    recoverable: true, retryAllowed: true,
    suggestedAction: 'Choose a distinct output file; symbolic and hard-link aliases of the source are not allowed.',
  },
  FILE_NOT_FOUND: {
    recoverable: true, retryAllowed: true,
    suggestedAction: 'Check the absolute source path and that the output parent directory exists.',
  },
  FILE_PERMISSION_DENIED: {
    recoverable: true, retryAllowed: true,
    suggestedAction: 'Choose a readable source and a writable output directory.',
  },
  FILE_CHANGED: {
    recoverable: true, retryAllowed: false,
    suggestedAction: 'Inspect the latest source and output files before requesting another conversion.',
  },
  INVALID_FILE: {
    recoverable: true, retryAllowed: false,
    suggestedAction: 'Inspect or repair the source file. Conversion produced no new output; do not retry the same damaged or unsupported content.',
  },
  UNSUPPORTED_CONTENT: {
    recoverable: true, retryAllowed: false,
    suggestedAction: 'Explain the unsupported content to the user. Do not remove content or report successful conversion.',
  },
  USER_STOPPED: {
    recoverable: true,
    retryAllowed: false,
    suggestedAction: 'Stop the current operation. Do not retry until the user explicitly resumes this window.',
  },
  MCP_CONTROL_REVOKED: {
    recoverable: true,
    retryAllowed: false,
    suggestedAction: 'Stop business calls. If the user clearly asks to reconnect or resume Mind control in ordinary language, read mind_get_control_status and call mind_request_control_restore when revoked. Guide them to click 允许恢复 in Mind, then check controlEnabled before continuing. Users do not need to type tool names; never restore without their request.',
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
  OPERATION_IN_PROGRESS: {
    recoverable: true,
    retryAllowed: false,
    suggestedAction: 'Call mind_get_operation_status, wait for the current transaction to finish, and do not submit a duplicate write.',
  },
  RENDERER_RESPONSE_TIMEOUT: {
    recoverable: true,
    retryAllowed: false,
    suggestedAction: 'Call mind_get_operation_status and read the current document before deciding whether a retry is needed.',
  },
  TRANSACTION_NOT_FOUND: {
    recoverable: true,
    retryAllowed: false,
    suggestedAction: 'Read the current document state instead of repeating an unknown transaction.',
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
  const capabilityRevision = Number(identity.capabilityRevision);
  if (
    capabilityRevision < ASYNCTEST_MIND_MCP_MIN_COMPATIBLE_CAPABILITY_REVISION ||
    capabilityRevision > current.capabilityRevision
  ) {
    return { mismatch: true, reason: 'incompatible-capability', current };
  }
  if (identity.version !== current.version || capabilityRevision !== current.capabilityRevision) {
    return { mismatch: false, reason: 'compatible-older-capability', current, upgradeAvailable: true };
  }
  return { mismatch: false, reason: null, current, upgradeAvailable: false };
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
