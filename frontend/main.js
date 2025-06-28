const { app, Tray, BrowserWindow, Menu, ipcMain, screen, shell } = require('electron');
const axios = require('axios');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const speech = require('@google-cloud/speech');

let mainWindow;
let tray;

//Set Google credentials
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, process.env.GOOGLE_APPLICATION_CREDENTIALS);
process.on('uncaughtException', (err) => {
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
      preload: path.join(__dirname, 'preload.js'),nodeIntegration: true,
      contextIsolation: true,
      nodeIntegration: false,
      media: true
    }
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
          // Call your local backend endpoint to get the auth URL
          const response = await axios.get('http://localhost:3001/api/mal/auth');
          
          if (response.data && response.data.authURL) {
            // Open the URL in the user's default browser
            shell.openExternal(response.data.authURL);
          } else {
            console.error('Invalid auth response:', response.data);
          }
        } catch (err) {
          console.error('Failed to get MAL auth URL:', err);
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



const client = new speech.SpeechClient();

ipcMain.handle('transcribe-buffer', async (event, base64Audio) => {
  try {
    const audio = { content: base64Audio };
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    };

    const request = { audio, config };
    const [response] = await client.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0]?.transcript)
      .join('\n');

    return transcription || "❌ No speech detected.";
  } catch (err) {
    console.error("🛑 Google Speech API error:", err);
    return "❌ Speech recognition failed.";
  }
});