/** Only an explicit Panel action changes this shared user preference. */
export interface WorkspacePanelPreference {
  collapsed: boolean
  revision: number
}

/** Temporary automatic collapse belongs to one conversation's Viewer cycle. */
export interface WorkspacePanelViewerState {
  requestedOpen: boolean
  autoCollapsedPanelRevision: number | null
}

export function workspacePanelCollapsed(
  preference: WorkspacePanelPreference,
  state: WorkspacePanelViewerState,
): boolean {
  return preference.collapsed || (
    state.requestedOpen
    && state.autoCollapsedPanelRevision !== null
    && state.autoCollapsedPanelRevision === preference.revision
  )
}

/** Opening another tab in an already-open Viewer must not restart the cycle. */
export function requestWorkspaceViewerOpen(
  state: WorkspacePanelViewerState,
  preference: WorkspacePanelPreference,
  open: boolean,
): WorkspacePanelViewerState {
  if (open === state.requestedOpen) return state
  return {
    requestedOpen: open,
    autoCollapsedPanelRevision: open && !workspacePanelCollapsed(preference, state)
      ? preference.revision
      : null,
  }
}

/** Even a same-value explicit choice invalidates every older automatic intent. */
export function setWorkspacePanelPreference(
  preference: WorkspacePanelPreference,
  collapsed: boolean,
): WorkspacePanelPreference {
  return { collapsed, revision: preference.revision + 1 }
}
