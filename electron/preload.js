const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    toggleTrafficLights: (visible) => ipcRenderer.send('set-traffic-lights', visible),
    openExternal: (url) => ipcRenderer.send('open-url', url),
    send: (channel, data) => ipcRenderer.send(channel, data),
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),

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

        // 新增：renderer 回应“是否允许关闭”
        closeResponse: ({ key, allow }) => ipcRenderer.invoke('wm:closeResponse', { key, allow }),
    },

    platform: process.platform,

    amind: {
        new: (payload) => ipcRenderer.invoke('amind:new', payload),
        newAndOpenWindow: (payload) => ipcRenderer.invoke('amind:newAndOpenWindow', payload),
        openFileInWindow: (payload) => ipcRenderer.invoke('amind:openFileInWindow', payload),
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

    harness: {
        chatStream: (payload) => ipcRenderer.invoke('harness:chatStream', payload),
        onChatStream: (callback) => {
            const handler = (event, data) => callback(data);
            ipcRenderer.on('harness:chat-stream', handler);
            return () => ipcRenderer.removeListener('harness:chat-stream', handler);
        },
        request: (method, path, body) => ipcRenderer.invoke('harness:request', { method, path, body }),
        storeGet: (key) => ipcRenderer.invoke('harness:storeGet', key),
        storeSet: (key, value) => ipcRenderer.invoke('harness:storeSet', key, value),
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
