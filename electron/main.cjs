// Electron main process (CommonJS on purpose — package.json is "type": "module").
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#0b0b0f',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Open external links in the user's browser instead of a new Electron window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the built client bundle. Requires `vite build` with base: './'.
  win.loadFile(path.join(__dirname, '..', 'dist', 'public', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});