const { app, BrowserWindow, screen, globalShortcut } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 450,
    height: 700,
    center: true,             // This will put it right in the middle
    frame: false,             // Removes the Windows border
    transparent: true,        // Makes the window background clear
    alwaysOnTop: true,        // Stays above all other apps
    resizable: true,
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

  const { session, desktopCapturer } = require('electron');

  // 1. Zero-Interaction Screen Picker (Always picks the first screen)
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      if (sources.length > 0) {
        callback({ video: sources[0] });
      }
    });
  });

  // 2. Auto-Allow Permissions (No more popups)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const autoAllow = ['display-capture', 'media', 'audioCapture', 'videoCapture'];
    callback(autoAllow.includes(permission));
  });



  // Allow clicking through the transparent parts (optional but nice)
  // mainWindow.setIgnoreMouseEvents(false);
}

app.whenReady().then(() => {
  createWindow();

  // Register Global Hotkey to toggle Assistant
  globalShortcut.register('CommandOrControl+Space', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  // Unregister all shortcuts when app quits
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
