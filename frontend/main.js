const { app, Tray, BrowserWindow, Menu, Screen } = require('electron');
const path = require('path');

  

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    frame: false,
    skipTaskbar: true,
    resizable: false,
    alwaysOnTop: true,
    transparent: true,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

// bounce around
let x = 100;
let y = 100;
let dx = 5;
let dy = 5;
const width = 800;
const height = 600;

setInterval(() => {
  const { width: screenWidth, height: screenHeight } = require('electron').screen.getPrimaryDisplay().workAreaSize;

  // Reverse direction if hitting screen edges
  if (x + width >= screenWidth || x <= 0) dx *= -1;
  if (y + height >= screenHeight || y <= 0) dy *= -1;

  x += dx;
  y += dy;

  if (mainWindow) {
    mainWindow.setBounds({ x, y, width, height });
  }
}, 16); // ~60fps

}

function createTray(){
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('My App');
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
