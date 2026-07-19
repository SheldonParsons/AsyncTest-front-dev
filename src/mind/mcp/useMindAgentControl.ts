import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

export type MindAgentControlStatus = 'idle' | 'connected' | 'executing' | 'revoked' | 'restore_requested';

export type ConnectedMindMcpClient = {
  clientId: string;
  version: string | null;
  capabilityRevision: number | null;
  protocolRevision: number | null;
  mismatch: boolean;
  mismatchReason: string | null;
  lastActivityAt: string | null;
};

export type MindAgentControlState = {
  status: MindAgentControlStatus;
  controlEnabled: boolean;
  activeSessionCount: number;
  activeExecutionCount: number;
  executingWindowKeys: string[];
  lockedWindowKeys: string[];
  startedAt: string | null;
  lastActivityAt: string | null;
  lastToolName: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  restoreRequestedAt: string | null;
  hasVersionMismatch: boolean;
  connectedMcpClients: ConnectedMindMcpClient[];
};

const IDLE_STATE: MindAgentControlState = {
  status: 'idle',
  controlEnabled: true,
  activeSessionCount: 0,
  activeExecutionCount: 0,
  executingWindowKeys: [],
  lockedWindowKeys: [],
  startedAt: null,
  lastActivityAt: null,
  lastToolName: null,
  expiresAt: null,
  revokedAt: null,
  revokedReason: null,
  restoreRequestedAt: null,
  hasVersionMismatch: false,
  connectedMcpClients: [],
};

function normalizeState(payload: any): MindAgentControlState {
  const rawStatus = payload?.status === 'active' ? 'executing' : payload?.status;
  const status = ['idle', 'connected', 'executing', 'revoked', 'restore_requested'].includes(rawStatus)
    ? rawStatus
    : 'idle';
  return {
    status,
    controlEnabled: payload?.controlEnabled !== false,
    activeSessionCount: Number(payload?.activeSessionCount) || 0,
    activeExecutionCount: Number(payload?.activeExecutionCount) || 0,
    executingWindowKeys: Array.isArray(payload?.executingWindowKeys)
      ? [...new Set(payload.executingWindowKeys.map((value: unknown) => String(value || '').trim()).filter(Boolean))]
      : [],
    lockedWindowKeys: Array.isArray(payload?.lockedWindowKeys)
      ? [...new Set(payload.lockedWindowKeys.map((value: unknown) => String(value || '').trim()).filter(Boolean))]
      : [],
    startedAt: payload?.startedAt ?? null,
    lastActivityAt: payload?.lastActivityAt ?? null,
    lastToolName: payload?.lastToolName ?? null,
    expiresAt: payload?.expiresAt ?? null,
    revokedAt: payload?.revokedAt ?? null,
    revokedReason: payload?.revokedReason ?? null,
    restoreRequestedAt: payload?.restoreRequestedAt ?? null,
    hasVersionMismatch: payload?.hasVersionMismatch === true,
    connectedMcpClients: Array.isArray(payload?.connectedMcpClients) ? payload.connectedMcpClients : [],
  };
}

export function useMindAgentControl(getWindowKey: () => string | null | undefined) {
  const state = ref<MindAgentControlState>({ ...IDLE_STATE });
  const requestPending = ref(false);
  const isCollapsed = ref(false);
  let removeListener: (() => void) | null = null;

  const isCurrentWindowTargeted = computed(() => {
    const windowKey = String(getWindowKey() || '').trim();
    return !!windowKey && state.value.lockedWindowKeys.includes(windowKey);
  });
  const isInteractionLocked = computed(() =>
    state.value.status === 'executing' && isCurrentWindowTargeted.value
  );
  const isCurrentWindowExecuting = computed(() => {
    const windowKey = String(getWindowKey() || '').trim();
    return !!windowKey && state.value.executingWindowKeys.includes(windowKey);
  });
  const isVisible = computed(() =>
    (state.value.status !== 'idle' || state.value.hasVersionMismatch)
    && (state.value.status !== 'executing' || isCurrentWindowExecuting.value)
  );

  const applyState = (payload: any) => {
    const previousStatus = state.value.status;
    const nextState = normalizeState(payload);
    state.value = nextState;
    if (nextState.status === 'executing' || nextState.status === 'idle') {
      isCollapsed.value = false;
    } else if (nextState.status === 'connected') {
      isCollapsed.value = !nextState.hasVersionMismatch;
    } else if (nextState.status === 'restore_requested' && previousStatus !== 'restore_requested') {
      isCollapsed.value = false;
    } else if (nextState.status === 'revoked' && previousStatus !== 'revoked') {
      isCollapsed.value = true;
    }
  };

  async function exitControl() {
    if (requestPending.value || !['connected', 'executing'].includes(state.value.status)) return;
    requestPending.value = true;
    try {
      applyState(await window.electronAPI.invoke('mind:mcpExitControl'));
    } finally {
      requestPending.value = false;
    }
  }

  async function approveRestore() {
    if (requestPending.value || state.value.status !== 'restore_requested') return;
    requestPending.value = true;
    try {
      applyState(await window.electronAPI.invoke('mind:mcpApproveControlRestore'));
    } finally {
      requestPending.value = false;
    }
  }

  async function rejectRestore() {
    if (requestPending.value || state.value.status !== 'restore_requested') return;
    requestPending.value = true;
    try {
      applyState(await window.electronAPI.invoke('mind:mcpRejectControlRestore'));
    } finally {
      requestPending.value = false;
    }
  }

  function collapseStatus() {
    if (state.value.hasVersionMismatch || state.value.status === 'revoked' || state.value.status === 'restore_requested') {
      isCollapsed.value = true;
    }
  }

  function expandStatus() {
    if (state.value.status !== 'idle') isCollapsed.value = false;
  }

  onMounted(async () => {
    removeListener = window.electronAPI.on('mind:mcp-control', (_event: unknown, payload: any) => {
      applyState(payload);
    });
    applyState(await window.electronAPI.invoke('mind:mcpGetControlStatus'));
  });

  onBeforeUnmount(() => {
    removeListener?.();
    removeListener = null;
  });

  return {
    state,
    requestPending,
    isCollapsed,
    isCurrentWindowTargeted,
    isCurrentWindowExecuting,
    isInteractionLocked,
    isVisible,
    exitControl,
    approveRestore,
    rejectRestore,
    collapseStatus,
    expandStatus,
  };
}
