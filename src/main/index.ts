import { app, BrowserWindow, Menu, protocol } from 'electron';
import path from 'path';
import createProtocol from 'umi-plugin-electron-builder/lib/createProtocol';
// import installExtension, {
//   REACT_DEVELOPER_TOOLS,
// } from 'electron-devtools-installer';

const isDevelopment = process.env.NODE_ENV === 'development';
let mainWindow: BrowserWindow;

Menu.setApplicationMenu(null);

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } },
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: isDevelopment ? 1200 : 800,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:8000');
    mainWindow.webContents.openDevTools();
  } else {
    createProtocol('app');
    mainWindow.loadURL('app://./index.html');
  }
}

app.on('ready', async () => {
  // if (isDevelopment) {
  //   await installExtension(REACT_DEVELOPER_TOOLS);
  // }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
