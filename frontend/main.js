const win = new BrowserWindow({
  width: 400,
  height: 600,
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  resizable: false,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js')
  }
});