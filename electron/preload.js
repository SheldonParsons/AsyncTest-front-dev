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
        openFolder: (payload) => ipcRenderer.invoke('amind:openFolder', payload),

        recents: () => ipcRenderer.invoke('amind:recents'),
        recentEntries: () => ipcRenderer.invoke('amind:recentEntries'),
        removeRecent: (payload) => ipcRenderer.invoke('amind:removeRecent', payload),
        openDialog: () => ipcRenderer.invoke('amind:openDialog'),
        read: (payload) => ipcRenderer.invoke('amind:read', payload),

        docGet: (payload) => ipcRenderer.invoke('amind:docGet', payload),
        docUpdate: (payload) => ipcRenderer.invoke('amind:docUpdate', payload),

        save: (payload) => ipcRenderer.invoke('amind:save', payload),
        saveAsDialog: (payload) => ipcRenderer.invoke('amind:saveAsDialog', payload),
        exportXmindDialog: (payload) => ipcRenderer.invoke('amind:exportXmindDialog', payload),
        saveRecentPreview: (payload) => ipcRenderer.invoke('amind:saveRecentPreview', payload),

        assetAddFromFile: (payload) => ipcRenderer.invoke('amind:assetAddFromFile', payload),
        assetAddFromBytes: (payload) => ipcRenderer.invoke('amind:assetAddFromBytes', payload),
        assetGetBytes: (payload) => ipcRenderer.invoke('amind:assetGetBytes', payload),
    },
});
