const { app, Tray, BrowserWindow, Menu, ipcMain} = require('electron');
const path = require('path');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

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
      
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

// bounce around
const { screen } = require('electron');

const windowWidth = 800;
const windowHeight = 600;

let moving = false;

function moveSmoothlyTo(xTarget, yTarget, speed = 5, callback) {
  const { x: startX, y: startY } = mainWindow.getBounds();
  let x = startX;
  let y = startY;

  const dx = xTarget - x;
  const dy = yTarget - y;
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
  }, 16); // ~60fps
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
    const delay = Math.floor(Math.random() * 10000)+10000; // moves every 10-20 seconds
    setTimeout(moveToRandomPoint, delay);
  });
}

// Start the loop
moveToRandomPoint();

ipcMain.on('trigger-move', () => {
  moveToRandomPoint();
});

}

function createTray(){
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {label: 'Quit', click: () => { app.isQuiting = true; app.quit();}},
    {label: 'Mute', click: () => {}}
    
     
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
