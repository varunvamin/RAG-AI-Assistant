const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const mainWindow = new BrowserWindow({
    width: 450,
    height: 700,
    x: width - 480,
    y: height - 750,
    frame: false,             // Removes the Windows border
    transparent: true,        // Makes the window background clear
    alwaysOnTop: true,        // Stays above all other apps
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Force localhost during development
  const isDev = true; // We are currently in development mode
  
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, 'out/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Allow clicking through the transparent parts (optional but nice)
  // mainWindow.setIgnoreMouseEvents(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
