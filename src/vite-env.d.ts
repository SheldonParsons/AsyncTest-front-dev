/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}


// src/vite-env.d.ts 或 src/monaco.d.ts

// 解决 python.contribution 报错
declare module 'monaco-editor/esm/vs/basic-languages/python/python.contribution';

// 解决 python 语言定义报错 (为了保险起见，建议把这个也加上)
declare module 'monaco-editor/esm/vs/basic-languages/python/python';

// 如果你将来用了 json，可能也需要加这个
declare module 'monaco-editor/esm/vs/language/json/monaco.contribution';

declare module 'monaco-editor/esm/vs/basic-languages/mysql/mysql.contribution'

declare module 'monaco-editor/esm/vs/editor/editor.main'



export interface IElectronAPI {
  toggleTrafficLights: (visible: boolean) => void;
  openExternal: (url: string) => void;
  on: (event: any, params: any) => (() => void);
  send: (event: any) => void;
  invoke: (event: any, params?: any) => Promise<any>;
  wm: any,
  platform: any,
  mcp?: {
    mindConfig: () => Promise<{
      serverName: string;
      transport: string;
      version?: string;
      capabilityRevision?: number;
      protocolRevision?: number;
      updatedAt?: string;
      timezone?: string;
      responseProfile?: string;
      command: string;
      args: string[];
      env?: Record<string, string>;
      stdioJson: Record<string, {
        type: string;
        command: string;
        args: string[];
        env?: Record<string, string>;
      }>;
      stdioJsonText: string;
      codexToml: string;
      note?: string;
      connection?: Record<string, unknown>;
    }>;
  },
  mindClipboard?: {
    writeNodeClipboard: (payload: { text: string; payload: string }) => Promise<boolean>;
    readNodeClipboard: () => Promise<string | null>;
  },
  amind: any,
  generator: any,
  projectFiles?: {
    saveCurrentFolderZip: (payload: {
      zipBytes: Uint8Array;
      defaultFileName: string;
      convertAmindToXmind?: boolean;
    }) => Promise<{
      canceled: boolean;
      filePath?: string;
      convertedCount?: number;
      failedAmindFiles?: Array<{ path: string; message: string }>;
    }>;
  },
  vibeAgent?: {
    readiness: {
      check: () => Promise<ElectronPiReadinessReport>;
      export: () => Promise<{ canceled: boolean; filePath?: string; report: ElectronPiReadinessReport }>;
    };
    startLocal?: (payload: {
      run: Record<string, unknown>;
      provider_id?: string;
      start_payload?: Record<string, unknown>;
      local_file_refs?: ElectronLocalFileRef[];
      local_context?: {
        account_id?: string;
        auth_token?: string;
        knowledge_base_url?: string;
        trace_upload_base_url?: string;
        trace_upload_headers?: Record<string, string>;
        request_text?: string;
      };
    }) => Promise<ElectronAgentStatus>;
    recoverableLocal?: (payload: { accountId: string }) => Promise<Array<Record<string, unknown>>>;
    recoverLocal?: (payload: {
      runId: string;
      accountId: string;
      projectId?: string;
      sessionId?: string;
      response: Record<string, unknown>;
      local_context?: {
        account_id?: string;
        auth_token?: string;
        knowledge_base_url?: string;
        trace_upload_base_url?: string;
        request_text?: string;
      };
    }) => Promise<ElectronAgentStatus>;
    attach: (payload: { runId: string; accountId: string }) => Promise<ElectronAgentStatus>;
    respond: (payload: { runId: string; accountId: string; pendingId: string; response: Record<string, unknown> }) => Promise<ElectronAgentCommandResult>;
    cancel: (payload: { runId: string; accountId: string; turnId: string; sessionId: string }) => Promise<ElectronAgentCommandResult>;
    status: (payload: { runId: string; accountId: string }) => Promise<ElectronAgentStatus>;
    list: (payload: { accountId: string }) => Promise<ElectronAgentStatus[]>;
    logout: (payload?: { accountId?: string }) => Promise<ElectronAgentLogoutResult>;
    localFiles: ElectronLocalFilesAPI;
    trace: ElectronTraceAPI;
    sessions?: ElectronLocalSessionAPI;
    onEvent: (callback: (event: VibeAgentEvent) => void) => (() => void);
  },
}

export interface ElectronAgentLogoutResult {
  schema: 'vibe_agent_logout.v1';
  account_id: string;
  terminated_runs: number;
  released_reservations: number;
  terminated_parked_runs: number;
  released: true;
}

export interface ElectronPiReadinessReport {
  schema: 'electron_pi_readiness.v1';
  ok: boolean;
  app_version: string;
  platform: string;
  arch: string;
  node_version: string;
  protocol_version: number;
  agent_core_version: string | null;
  pi_ai_version: string | null;
  pi_coding_agent_version: string | null;
  undici_version: string | null;
  runner_spawn: boolean;
  dependencies_loaded: boolean;
  timestamp: string;
  error_code?: string;
}

export interface ElectronLocalSessionAPI {
  create: (payload: { accountId: string; sessionId?: string; projectId?: string; title?: string; providerId?: string; draft?: string }) => Promise<ElectronLocalSessionManifest>;
  manifest: (payload: { sessionId: string; accountId: string }) => Promise<ElectronLocalSessionManifest>;
  list: (payload: { accountId: string; projectId?: string; limit?: number }) => Promise<ElectronLocalSessionManifest[]>;
  events: (payload: { sessionId: string; accountId: string; afterSequence?: number; limit?: number }) => Promise<ElectronLocalSessionEvent[]>;
  append: (payload: { sessionId: string; accountId: string; role: string; content?: string; meta?: Record<string, unknown>; attachments?: unknown[] }) => Promise<ElectronLocalSessionEvent>;
  update: (payload: { sessionId: string; accountId: string; title?: string; providerId?: string; draft?: string }) => Promise<ElectronLocalSessionManifest>;
  updateTitle: (payload: { sessionId: string; accountId: string; title: string }) => Promise<ElectronLocalSessionManifest>;
  remove: (payload: { sessionId: string; accountId: string }) => Promise<{ session_id: string; removed: boolean }>;
}

export interface ElectronLocalSessionManifest {
  schema: 'vibe.agent.session.v1';
  session_id: string;
  account_id: string;
  project_id: string;
  title: string;
  provider_id: string;
  llm_provider_id?: string;
  draft: string;
  created_at: string;
  updated_at: string;
  next_sequence: number;
  status: string;
  pi_session?: {
    schema: 'vibe.pi_session.v1';
    format_version: 3;
    relative_path: 'pi-session/session.jsonl';
    initialized: boolean;
    pi_session_id?: string;
    migrated_through_sequence?: number;
    entry_count?: number;
    context_message_count?: number;
    last_entry_id?: string;
    last_opened_at?: string;
    last_open_mode?: 'create' | 'open';
  };
}

export interface ElectronLocalSessionEvent {
  schema: 'vibe.agent.session_event.v1';
  event_id: string;
  session_id: string;
  sequence: number;
  role: string;
  content: string;
  meta: Record<string, unknown>;
  attachments: unknown[];
  created_at: string;
}

export interface ElectronLocalFileRef {
  schema: 'local_file_ref.v1';
  ref_id: string;
  name: string;
  mime: string;
  size: number;
  last_modified: number;
}

export interface ElectronLocalFilesAPI {
  pick: (payload?: { accountId?: string; account_id?: string }) => Promise<{
    schema: 'vibe_agent_local_file_selection.v1';
    canceled: boolean;
    files: ElectronLocalFileRef[];
  }>;
  preview: (payload: { refId?: string; ref_id?: string; accountId?: string; account_id?: string }) => Promise<{
    schema: 'local_file_preview.v1';
    ref_id: string;
    name: string;
    mime: string;
    size: number;
    text: string;
    truncated: boolean;
  }>;
}

export interface ElectronTraceAPI {
  create: (payload: { accountId: string; traceId?: string; sessionId?: string; goalId?: string; runId?: string; metadata?: Record<string, unknown> }) => Promise<ElectronTraceManifest>;
  append: (payload: ElectronTraceAppendPayload) => Promise<ElectronTraceEvent>;
  finish: (payload: ElectronTraceFinishPayload) => Promise<ElectronTraceEvent>;
  list: (payload: { accountId: string; limit?: number }) => Promise<ElectronTraceManifest[]>;
  detail: (payload: { traceId: string; accountId: string; projectId?: string; includePayload?: boolean; afterSequence?: number; limit?: number }) => Promise<{ manifest: ElectronTraceManifest; events: ElectronTraceEvent[]; next_sequence?: number; has_more?: boolean }>;
  payload: (payload: { traceId: string; accountId: string; projectId?: string; payloadRef: string }) => Promise<string>;
  export: (payload: { traceId: string; accountId: string; projectId?: string; destinationPath: string }) => Promise<{ trace_id: string; path: string }>;
  remove: (payload: { traceId: string; accountId: string; projectId?: string }) => Promise<{ trace_id: string; removed: boolean }>;
  upload: (payload: { traceId: string; accountId: string; baseUrl: string; headers?: Record<string, string>; chunkSize?: number; force?: boolean }) => Promise<ElectronTraceUploadStatus>;
  resume: (payload: { accountId: string; baseUrl: string; headers?: Record<string, string>; limit?: number }) => Promise<{ schema: string; queued: ElectronTraceUploadStatus[] }>;
  waitUpload: (payload: { traceId: string; accountId: string }) => Promise<ElectronTraceUploadStatus | null>;
  uploadStatus: (payload: { traceId: string; accountId: string }) => Promise<ElectronTraceUploadStatus>;
  onUploadStatus: (callback: (event: ElectronTraceUploadStatus) => void) => (() => void);
}

export interface ElectronTraceAppendPayload {
  traceId: string;
  accountId: string;
  projectId?: string;
  kind?: string;
  name?: string;
  spanId?: string;
  parentSpanId?: string;
  status?: string;
  attributes?: Record<string, unknown>;
  payload?: unknown;
}

export interface ElectronTraceFinishPayload extends Omit<ElectronTraceAppendPayload, 'kind'> {}

export interface ElectronTraceManifest {
  schema: 'vibe.agent.trace.v1';
  trace_id: string;
  account_id: string;
  session_id: string;
  goal_id: string;
  run_id: string;
  project_id: string;
  execution_host: 'electron';
  created_at: string;
  updated_at: string;
  next_sequence: number;
  event_count: number;
  status: string;
  metadata: Record<string, unknown>;
}

export interface ElectronTraceEvent {
  schema: 'vibe.agent.trace.v1';
  protocol_version: number;
  event_id: string;
  trace_id: string;
  session_id: string;
  goal_id: string;
  run_id: string;
  sequence: number;
  kind: string;
  name: string;
  span_id: string;
  parent_span_id?: string;
  timestamp: string;
  status: string;
  attributes: Record<string, unknown>;
  payload_ref?: string;
  payload_sha256?: string;
  payload_bytes?: number;
  payload?: unknown;
}

export interface ElectronTraceUploadStatus {
  schema: 'vibe.agent.trace.upload.v1';
  trace_id: string;
  status: 'queued' | 'uploading' | 'uploaded' | 'failed' | 'idle';
  upload_id?: string;
  chunk_index?: number;
  total_chunks?: number;
  code?: string;
  result?: unknown;
}

export interface ElectronAgentRun {
  schema: 'electron_agent_run.v1';
  execution_host: 'electron';
  run_id: string;
  turn_id: string;
  request_id: string;
  session_id: string;
  project?: string;
  project_id?: string;
  host_id?: string;
  protocol_version: number;
}

export interface ElectronAgentStatus {
  execution_host: 'electron';
  run_id: string;
  turn_id: string;
  session_id: string;
  project_id?: string;
  account_id?: string;
  runId: string;
  turnId: string;
  sessionId: string;
  state: 'queued' | 'connecting' | 'running' | 'waiting_user' | 'cancelling' | 'closed' | 'completed' | 'failed' | 'aborted' | 'cancelled';
  lifecycle?: 'queued' | 'running' | 'waiting_user' | 'terminal';
  protocolVersion: number;
  agentCoreVersion: string;
  piAgentCoreVersion: string;
  piAiVersion: string;
  piCodingAgentVersion: string;
  executionMode?: 'local';
  startedAt?: number;
  assistantPartialText?: string;
  traceId?: string;
  goalId?: string;
  pendingInteraction?: Record<string, unknown>;
  pending_interaction?: Record<string, unknown>;
}

export interface ElectronAgentCommandResult {
  accepted: boolean;
  unknown?: boolean;
  code?: string;
  commandId?: string;
  runId: string;
  pendingId?: string;
}

export interface VibeAgentEvent {
  schema: 'vibe_agent_event.v1';
  runId: string;
  turnId: string;
  sessionId: string;
  type: 'state' | 'assistant_delta' | 'canonical_delta' | 'interaction' | 'interaction_request' | 'pi_frame' | 'session_title' | 'session_title_error' | 'done' | 'error' | 'terminal' | 'trace_error' | 'interaction_observer_error' | 'candidate_observer_error';
  state?: string;
  text?: string;
  title?: string;
  journalDelta?: Record<string, unknown>;
  code?: string;
  frameType?: string;
  messageId?: string;
  replyTo?: string;
  payload?: unknown;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
    $toast: (options: { title: string; type?: string; position?: 'bottom-right' | 'bottom-left'; duration?: number; actionText?: string }) => void;
    $updateHeaderLoginStatus: () => void;
  }
}
