const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  triggerMove: () => ipcRenderer.send('trigger-move')
});
