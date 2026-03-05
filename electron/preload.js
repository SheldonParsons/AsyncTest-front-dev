// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // 定义一个发送消息的方法
    toggleTrafficLights: (visible) => ipcRenderer.send('set-traffic-lights', visible),
    openExternal: (url) => ipcRenderer.send('open-url', url),
    // 发送消息：从 Vue 到 Main
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, callback) => {
        const subscription = (event, ...args) => callback(event, ...args);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
    }
});
