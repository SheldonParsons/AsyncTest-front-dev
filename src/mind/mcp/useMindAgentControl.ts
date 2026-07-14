import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

export type MindAgentControlStatus = 'idle' | 'active' | 'revoked' | 'restore_requested';

export type MindAgentControlState = {
  status: MindAgentControlStatus;
  controlEnabled: boolean;
  activeSessionCount: number;
  startedAt: string | null;
  lastActivityAt: string | null;
  lastToolName: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  restoreRequestedAt: string | null;
};

const IDLE_STATE: MindAgentControlState = {
  status: 'idle',
  controlEnabled: true,
  activeSessionCount: 0,
  startedAt: null,
  lastActivityAt: null,
  lastToolName: null,
  expiresAt: null,
  revokedAt: null,
  revokedReason: null,
  restoreRequestedAt: null,
};

function normalizeState(payload: any): MindAgentControlState {
  const status = ['idle', 'active', 'revoked', 'restore_requested'].includes(payload?.status)
    ? payload.status
    : 'idle';
  return {
    status,
    controlEnabled: payload?.controlEnabled !== false,
    activeSessionCount: Number(payload?.activeSessionCount) || 0,
    startedAt: payload?.startedAt ?? null,
    lastActivityAt: payload?.lastActivityAt ?? null,
    lastToolName: payload?.lastToolName ?? null,
    expiresAt: payload?.expiresAt ?? null,
    revokedAt: payload?.revokedAt ?? null,
    revokedReason: payload?.revokedReason ?? null,
    restoreRequestedAt: payload?.restoreRequestedAt ?? null,
  };
}

export function useMindAgentControl() {
  const state = ref<MindAgentControlState>({ ...IDLE_STATE });
  const requestPending = ref(false);
  const isCollapsed = ref(false);
  let removeListener: (() => void) | null = null;

  const isInteractionLocked = computed(() => state.value.status === 'active');
  const isVisible = computed(() => state.value.status !== 'idle');

  const applyState = (payload: any) => {
    const previousStatus = state.value.status;
    const nextState = normalizeState(payload);
    state.value = nextState;
    if (nextState.status === 'active' || nextState.status === 'idle') {
      isCollapsed.value = false;
    } else if (nextState.status === 'restore_requested' && previousStatus !== 'restore_requested') {
      isCollapsed.value = false;
    } else if (nextState.status === 'revoked' && previousStatus !== 'revoked') {
      isCollapsed.value = true;
    }
  };

  async function exitControl() {
    if (requestPending.value || state.value.status !== 'active') return;
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
    if (state.value.status === 'revoked' || state.value.status === 'restore_requested') {
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
    isInteractionLocked,
    isVisible,
    exitControl,
    approveRestore,
    rejectRestore,
    collapseStatus,
    expandStatus,
  };
}
