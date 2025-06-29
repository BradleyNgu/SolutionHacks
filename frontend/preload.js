const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  triggerMove: () => ipcRenderer.send('trigger-move'),
  onVoiceRecordingTriggered: (callback) => {
    ipcRenderer.on('trigger-voice-recording', callback);
  },
  onShowError: (callback) => {
    ipcRenderer.on('show-error', callback);
  },
  setTextModalOpen: (isOpen) => ipcRenderer.send('text-modal-open-state', isOpen)
});
