const { contextBridge, ipcRenderer } = require('electron');
require('dotenv').config();

contextBridge.exposeInMainWorld('api', {
  triggerMove: () => ipcRenderer.send('trigger-move'),
  onShowChatWindow: (callback) => {
    ipcRenderer.on('show-chat-window', callback);
  },
  getGeminiKey: () => process.env.GEMINI_KEY
});
