const { app, Tray, BrowserWindow, Menu, ipcMain, screen, shell, session } = require('electron');
const axios = require('axios');
require('dotenv').config();
const path = require('path');

// Add targeted command line switches to suppress chunked upload errors
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('--log-level', '2'); // Only show warnings and errors
app.commandLine.appendSwitch('--disable-background-networking');
app.commandLine.appendSwitch('--disable-default-apps');

let mainWindow;
let tray;

process.on('uncaughtException', (err) => {
  // Suppress specific Chromium network errors related to chunked uploads
  if (err.message && err.message.includes('chunked_data_pipe_upload_data_stream')) {
    return; // Silently ignore this specific error
  }
  console.error('Uncaught Exception:', err);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    frame: false,
    skipTaskbar: true,
    resizable: false,
    alwaysOnTop: true,
    transparent: true,
    focusable: true,
    webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        enableRemoteModule: false,
        sandbox: false,
        webSecurity: true, // Keep security but handle errors
        allowRunningInsecureContent: false,
        experimentalFeatures: false
    }
  });

  // Handle web contents creation and network errors
  mainWindow.webContents.on('did-create-window', (childWindow) => {
    // Configure child windows with same error handling
    childWindow.webContents.on('console-message', (event, level, message) => {
      if (message.includes('chunked_data_pipe_upload_data_stream') || 
          message.includes('OnSizeReceived failed')) {
        event.preventDefault();
      }
    });
  });

  // Suppress console errors related to chunked uploads
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (message.includes('chunked_data_pipe_upload_data_stream') || 
        message.includes('OnSizeReceived failed') ||
        message.includes('Error: -2')) {
      return; // Don't log these specific errors
    }
    console.log(`Console [${level}]:`, message);
  });

  // Handle session network errors
  const ses = mainWindow.webContents.session;
  
  // Intercept and handle network requests that might cause chunked upload errors
  ses.webRequest.onErrorOccurred((details) => {
    if (details.error && (
        details.error.includes('UPLOAD_FILE_CHANGED') ||
        details.error.includes('CHUNKED_ENCODING_ERROR') ||
        details.url.includes('speech.googleapis.com')
    )) {
      // Silently handle speech API errors
      return;
    }
  });

  // Set up request headers to prevent chunked upload issues
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    if (details.url.includes('speech.googleapis.com') || 
        details.url.includes('google.com/speech-api')) {
      // Add headers to prevent chunked encoding issues
      details.requestHeaders['Connection'] = 'close';
      details.requestHeaders['Transfer-Encoding'] = 'identity';
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  const windowWidth = 400;
  const windowHeight = 600;
  let moving = false;

  function moveSmoothlyTo(xTarget, yTarget, speed = 5, callback) {
    const { x: startX, y: startY } = mainWindow.getBounds();
    const dx = xTarget - startX;
    const dy = yTarget - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.floor(distance / speed));
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const newX = Math.round(startX + dx * progress);
      const newY = Math.round(startY + dy * progress);
      mainWindow.setBounds({ x: newX, y: newY, width: windowWidth, height: windowHeight });

      if (step >= steps) {
        clearInterval(interval);
        if (callback) callback();
      }
    }, 16);
  }

  function moveToRandomPoint() {
    if (moving) return;
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const maxX = screenWidth - windowWidth;
    const maxY = screenHeight - windowHeight;
    const targetX = Math.floor(Math.random() * maxX);
    const targetY = Math.floor(Math.random() * maxY);

    moving = true;
    moveSmoothlyTo(targetX, targetY, 10, () => {
      moving = false;
      const delay = Math.floor(Math.random() * 10000) + 10000;
      setTimeout(moveToRandomPoint, delay);
    });
  }

  moveToRandomPoint();

  ipcMain.on('trigger-move', () => {
    moveToRandomPoint();
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Talk to Maid',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('trigger-voice-recording');
        }
      }
    },
    { label: 'Mute', click: () => {} },
    {
      label: 'Connect MyAnimeList',
      click: async () => {
        try {
          // Add timeout and proper error handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          // Call your local backend endpoint to get the auth URL
          const response = await axios.get('http://localhost:3001/api/mal/auth', {
            timeout: 10000, // 10 second timeout
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (response.data && response.data.authURL) {
            // Open the URL in the user's default browser
            shell.openExternal(response.data.authURL);
          } else {
            console.error('Invalid auth response:', response.data);
            // Show error to user via main window
            if (mainWindow) {
              mainWindow.webContents.send('show-error', 'Failed to get MyAnimeList auth URL - invalid response');
            }
          }
        } catch (err) {
          console.error('Failed to get MAL auth URL:', err);
          
          // Provide user-friendly error messages
          let errorMessage = 'Failed to connect to MyAnimeList';
          
          if (err.code === 'ECONNREFUSED' || err.message.includes('localhost:3001')) {
            errorMessage = 'Backend server not running. Please start the backend server first.';
          } else if (err.code === 'ENOTFOUND' || err.message.includes('network')) {
            errorMessage = 'Network connection failed. Check your internet connection.';
          } else if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
            errorMessage = 'Request timed out. Please try again.';
          }
          
          // Send error to renderer process for display
          if (mainWindow) {
            mainWindow.webContents.send('show-error', errorMessage);
          }
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('AniMaid');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});