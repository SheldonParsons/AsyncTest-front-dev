const { contextBridge, ipcRenderer } = require('electron');

// These are deliberately explicit channels.  Agent-private frames must not
// travel through the legacy generic `send/invoke` bridge.
const vibeLocalFiles = {
    pick: ({ accountId } = {}) => ipcRenderer.invoke('vibeAgent:localFilePick', {
        ...(accountId ? { account_id: accountId } : {}),
    }),
    preview: ({ refId, accountId }) => ipcRenderer.invoke('vibeAgent:localFilePreview', {
        ref_id: refId,
        ...(accountId ? { account_id: accountId } : {}),
    }),
};

const vibeTrace = {
    create: (payload) => ipcRenderer.invoke('vibeAgent:traceCreate', payload),
    append: (payload) => ipcRenderer.invoke('vibeAgent:traceAppend', payload),
    finish: (payload) => ipcRenderer.invoke('vibeAgent:traceFinish', payload),
    list: (payload) => ipcRenderer.invoke('vibeAgent:traceList', payload),
    detail: (payload) => ipcRenderer.invoke('vibeAgent:traceDetail', payload),
    payload: (payload) => ipcRenderer.invoke('vibeAgent:tracePayload', payload),
    export: (payload) => ipcRenderer.invoke('vibeAgent:traceExport', payload),
    remove: (payload) => ipcRenderer.invoke('vibeAgent:traceRemove', payload),
    upload: (payload) => ipcRenderer.invoke('vibeAgent:traceUpload', payload),
    resume: (payload) => ipcRenderer.invoke('vibeAgent:traceResume', payload),
    waitUpload: (payload) => ipcRenderer.invoke('vibeAgent:traceUploadWait', payload),
    uploadStatus: (payload) => ipcRenderer.invoke('vibeAgent:traceUploadStatus', payload),
    onUploadStatus: (callback) => {
        if (typeof callback !== 'function') throw new TypeError('vibeAgent.trace.onUploadStatus callback 必须是函数');
        void ipcRenderer.invoke('vibeAgent:traceSubscribe').catch(() => {});
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on('vibeAgent:trace-upload-status', handler);
        return () => ipcRenderer.removeListener('vibeAgent:trace-upload-status', handler);
    },
};

contextBridge.exposeInMainWorld('electronAPI', {
    toggleTrafficLights: (visible) => ipcRenderer.send('set-traffic-lights', visible),
    openExternal: (url) => ipcRenderer.send('open-url', url),
    send: (channel, data) => ipcRenderer.send(channel, data),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),

    vibeAgent: {
        readiness: {
            check: () => ipcRenderer.invoke('vibeAgent:readinessCheck'),
            export: () => ipcRenderer.invoke('vibeAgent:readinessExport'),
        },
        // Local mode starts the Agent directly in Electron Main. The renderer only
        // supplies a validated start descriptor; provider credentials are
        // injected by Main and never exposed through this API.
        startLocal: ({ run, start_payload: startPayload, provider_id: providerId, local_context: localContext, local_file_refs: localFileRefs }) =>
            ipcRenderer.invoke('vibeAgent:startLocal', {
                run,
                start_payload: startPayload,
                ...(providerId ? { provider_id: providerId } : {}),
                ...(localContext ? { local_context: localContext } : {}),
                ...(localFileRefs ? { local_file_refs: localFileRefs } : {}),
            }),
        recoverableLocal: (payload = {}) => ipcRenderer.invoke('vibeAgent:recoverableLocal', payload),
        recoverLocal: ({ runId, accountId, projectId, sessionId, response, local_context: localContext }) =>
            ipcRenderer.invoke('vibeAgent:recoverLocal', {
                run_id: runId,
                account_id: accountId,
                ...(projectId ? { project_id: projectId } : {}),
                ...(sessionId ? { session_id: sessionId } : {}),
                response,
                ...(localContext ? { local_context: localContext } : {}),
            }),
        attach: ({ runId, accountId }) => ipcRenderer.invoke('vibeAgent:attach', { runId, accountId }),
        respond: ({ runId, accountId, pendingId, response }) =>
            ipcRenderer.invoke('vibeAgent:respond', { runId, accountId, pendingId, response }),
        cancel: ({ runId, accountId, turnId, sessionId }) =>
            ipcRenderer.invoke('vibeAgent:cancel', { runId, accountId, turnId, sessionId }),
        status: ({ runId, accountId }) => ipcRenderer.invoke('vibeAgent:status', { runId, accountId }),
        list: (payload = {}) => ipcRenderer.invoke('vibeAgent:list', payload),
        logout: ({ accountId } = {}) => ipcRenderer.invoke('vibeAgent:logout', {
            ...(accountId ? { account_id: accountId } : {}),
        }),
        localFiles: vibeLocalFiles,
        trace: vibeTrace,
        sessions: {
            create: (payload) => ipcRenderer.invoke('vibeAgent:sessionCreate', payload),
            manifest: (payload) => ipcRenderer.invoke('vibeAgent:sessionManifest', payload),
            list: (payload) => ipcRenderer.invoke('vibeAgent:sessionList', payload),
            events: (payload) => ipcRenderer.invoke('vibeAgent:sessionEvents', payload),
            history: (payload) => ipcRenderer.invoke('vibeAgent:sessionHistory', payload),
            append: (payload) => ipcRenderer.invoke('vibeAgent:sessionAppend', payload),
            update: (payload) => ipcRenderer.invoke('vibeAgent:sessionUpdate', payload),
            updateTitle: (payload) => ipcRenderer.invoke('vibeAgent:sessionTitle', payload),
            remove: (payload) => ipcRenderer.invoke('vibeAgent:sessionRemove', payload),
        },
        onEvent: (callback) => {
            if (typeof callback !== 'function') throw new TypeError('vibeAgent.onEvent callback 必须是函数');
            const handler = (_event, payload) => callback(payload);
            ipcRenderer.on('vibeAgent:event', handler);
            return () => ipcRenderer.removeListener('vibeAgent:event', handler);
        },
    },

    on: (channel, callback) => {
        const subscription = (event, ...args) => callback(event, ...args);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
    },

    wm: {
        open: (options) => ipcRenderer.invoke('wm:open', options),
        close: (key) => ipcRenderer.invoke('wm:close', key),
        focus: (key) => ipcRenderer.invoke('wm:focus', key),
        list: () => ipcRenderer.invoke('wm:list'),
        popupMenu: (options) => ipcRenderer.invoke('wm:popupMenu', options),
        sendTo: (targetKey, channel, payload) =>
            ipcRenderer.invoke('wm:sendTo', { targetKey, channel, payload }),
        broadcast: (channel, payload) =>
            ipcRenderer.invoke('wm:broadcast', { channel, payload }),
        control: (key, action) => ipcRenderer.invoke('wm:control', { key, action }),
        isMaximized: (key) => ipcRenderer.invoke('wm:isMaximized', key),

        // 新增：renderer 回应“是否允许关闭”
        closeResponse: ({ key, allow }) => ipcRenderer.invoke('wm:closeResponse', { key, allow }),
    },

    platform: process.platform,

    mcp: {
        mindConfig: () => ipcRenderer.invoke('mcp:mindConfig'),
    },

    mindClipboard: {
        writeNodeClipboard: (payload) => ipcRenderer.invoke('clipboard:writeMindNodes', payload),
        readNodeClipboard: () => ipcRenderer.invoke('clipboard:readMindNodes'),
    },

    amind: {
        new: (payload) => ipcRenderer.invoke('amind:new', payload),
        newAndOpenWindow: (payload) => ipcRenderer.invoke('amind:newAndOpenWindow', payload),
        openFileInWindow: (payload) => ipcRenderer.invoke('amind:openFileInWindow', payload),
        createFileAndOpen: (payload) => ipcRenderer.invoke('amind:createFileAndOpen', payload),
        openRemoteBufferInWindow: (payload) => ipcRenderer.invoke('amind:openRemoteBufferInWindow', payload),
        openFolder: (payload) => ipcRenderer.invoke('amind:openFolder', payload),
        fileExists: (payload) => ipcRenderer.invoke('amind:fileExists', payload),

        recents: () => ipcRenderer.invoke('amind:recents'),
        recentEntries: () => ipcRenderer.invoke('amind:recentEntries'),
        removeRecent: (payload) => ipcRenderer.invoke('amind:removeRecent', payload),
        openDialog: () => ipcRenderer.invoke('amind:openDialog'),
        read: (payload) => ipcRenderer.invoke('amind:read', payload),

        docGet: (payload) => ipcRenderer.invoke('amind:docGet', payload),
        docUpdate: (payload) => ipcRenderer.invoke('amind:docUpdate', payload),
        workspaceGet: () => ipcRenderer.invoke('amind:workspaceGet'),
        workspaceActivateDocument: (payload) => ipcRenderer.invoke('amind:workspaceActivateDocument', payload),
        workspaceCloseDocument: (payload) => ipcRenderer.invoke('amind:workspaceCloseDocument', payload),

        save: (payload) => ipcRenderer.invoke('amind:save', payload),
        saveAsDialog: (payload) => ipcRenderer.invoke('amind:saveAsDialog', payload),
        buildUploadPayload: (payload) => ipcRenderer.invoke('amind:buildUploadPayload', payload),
        exportXmindDialog: (payload) => ipcRenderer.invoke('amind:exportXmindDialog', payload),
        exportXmindDocDialog: (payload) => ipcRenderer.invoke('amind:exportXmindDocDialog', payload),
        exportAmindDialog: (payload) => ipcRenderer.invoke('amind:exportAmindDialog', payload),
        exportMarkdownDialog: (payload) => ipcRenderer.invoke('amind:exportMarkdownDialog', payload),
        exportJsonDialog: (payload) => ipcRenderer.invoke('amind:exportJsonDialog', payload),
        saveRecentPreview: (payload) => ipcRenderer.invoke('amind:saveRecentPreview', payload),
        prepareMindFonts: () => ipcRenderer.invoke('amind:prepareMindFonts'),
        retryMindFontDownload: (payload) => ipcRenderer.invoke('amind:retryMindFontDownload', payload),
        readMindFontFace: (payload) => ipcRenderer.invoke('amind:readMindFontFace', payload),

        assetAddFromFile: (payload) => ipcRenderer.invoke('amind:assetAddFromFile', payload),
        assetAddFromBytes: (payload) => ipcRenderer.invoke('amind:assetAddFromBytes', payload),
        assetGetBytes: (payload) => ipcRenderer.invoke('amind:assetGetBytes', payload),
    },

    generator: {
        runZendao: (payload) => ipcRenderer.invoke('generator:runZendao', payload),
        getLatestZendaoRun: () => ipcRenderer.invoke('generator:getLatestZendaoRun'),
        getRecentExports: () => ipcRenderer.invoke('generator:getRecentExports'),
        saveRecentExport: (payload) => ipcRenderer.invoke('generator:saveRecentExport', payload),
        dumpCacheSnapshot: (payload) => ipcRenderer.invoke('generator:dumpCacheSnapshot', payload),
        exportDocxPackage: (payload) => ipcRenderer.invoke('generator:exportDocxPackage', payload),
    },

    projectFiles: {
        saveCurrentFolderZip: (payload) => ipcRenderer.invoke('projectFiles:saveCurrentFolderZip', payload),
    },

    lsp: {
        start: () => ipcRenderer.invoke('lsp:start'),
        stop: () => ipcRenderer.invoke('lsp:stop'),
        status: () => ipcRenderer.invoke('lsp:status'),
        didOpen: (payload) => ipcRenderer.invoke('lsp:didOpen', payload),
        didChange: (payload) => ipcRenderer.invoke('lsp:didChange', payload),
        didClose: (payload) => ipcRenderer.invoke('lsp:didClose', payload),
        completion: (payload) => ipcRenderer.invoke('lsp:completion', payload),
        hover: (payload) => ipcRenderer.invoke('lsp:hover', payload),
        signatureHelp: (payload) => ipcRenderer.invoke('lsp:signatureHelp', payload),
        definition: (payload) => ipcRenderer.invoke('lsp:definition', payload),
    },

    python: {
        checkEnv: () => ipcRenderer.invoke('python:check-env'),
        run: (payload) => ipcRenderer.invoke('python:run', payload),
        stop: () => ipcRenderer.invoke('python:stop'),
        selectBinary: () => ipcRenderer.invoke('python:select-binary'),
        getConfig: () => ipcRenderer.invoke('python:get-config'),
        resetBinary: () => ipcRenderer.invoke('python:reset-binary'),
        onOutput: (callback) => {
            const handler = (event, data) => callback(data);
            ipcRenderer.on('python:output', handler);
            return () => ipcRenderer.removeListener('python:output', handler);
        },
        onExit: (callback) => {
            const handler = (event, data) => callback(data);
            ipcRenderer.on('python:exit', handler);
            return () => ipcRenderer.removeListener('python:exit', handler);
        },
    },
});
