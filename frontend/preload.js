const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  triggerMove: () => ipcRenderer.send('trigger-move'),
  
  // Backend API communication
  backend: {
    // Gemini API calls
    generateText: (prompt, options = {}) => 
      ipcRenderer.invoke('backend-api', 'POST', '/api/gemini/generate', { prompt, options }),
    
    waifuChat: (prompt, options = {}) => 
      ipcRenderer.invoke('backend-api', 'POST', '/api/gemini/waifu', { prompt, options }),
    
    sendMessage: (message, sessionId, options = {}) => 
      ipcRenderer.invoke('backend-api', 'POST', '/api/gemini/send-message', { message, sessionId, options }),
    
    // TTS API calls
    speak: (text, options = {}) => 
      ipcRenderer.invoke('backend-api', 'POST', '/api/tts/speak', { text, options }),
    
    waifuSpeak: (text, provider = 'web', options = {}) => 
      ipcRenderer.invoke('backend-api', 'POST', '/api/tts/waifu-speak', { text, provider, options }),
    
    getVoices: (provider = 'web') => 
      ipcRenderer.invoke('backend-api', 'GET', `/api/tts/voices?provider=${provider}`),
    
    // MAL API calls
    malAuth: () => 
      ipcRenderer.invoke('backend-api', 'GET', '/api/mal/auth'),
    
    // Health check
    healthCheck: () => 
      ipcRenderer.invoke('backend-api', 'GET', '/health')
  }
});
