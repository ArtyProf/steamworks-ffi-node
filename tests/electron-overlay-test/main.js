const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Prevent Chromium from pausing the renderer when the window is occluded
// (e.g. Steam overlay native window appears on top). Without this, rAF and
// beginFrameSubscription stop firing while the Steam overlay is open, causing
// the native overlay window to freeze on the last captured frame.
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// Resolve steamworks-ffi-node path for both dev and packaged builds.
// In development: use the parent package's dist directly.
// In production (electron-builder --dir): files are copied to Resources/sdk/
const sdkBase = app.isPackaged
  ? path.join(process.resourcesPath, 'sdk')
  : path.join(__dirname, '..', '..');

// When packaged, koffi lives in Resources/sdk/node_modules — add it to NODE_PATH
// so any require('koffi') inside dist/index.js resolves correctly.
if (app.isPackaged) {
  const Module = require('module');
  process.env.NODE_PATH = path.join(sdkBase, 'node_modules');
  Module._initPaths();
}

const SteamworksSDK = require(path.join(sdkBase, 'dist', 'index.js')).default;

const steam = SteamworksSDK.getInstance();
let mainWindow = null;
let overlayEnabled = false;

// App ID 480 = Spacewar (the standard Steam SDK test app)
const APP_ID = 480;

const steamReady = steam.init({ appId: APP_ID });
if (!steamReady) {
  console.warn('[Main] Steam init failed — is Steam running? Continuing without Steam.');
}

// Steam callbacks at 1-second intervals (1 Hz is enough)
setInterval(() => steam.runCallbacks(), 1000);

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: 'Steam Overlay Test',
    backgroundColor: '#0d1117',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Disable background throttling so rAF keeps firing even when another
  // native window (Steam overlay, our own overlay window) occludes this one.
  mainWindow.webContents.setBackgroundThrottling(false);

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.webContents.once('did-finish-load', () => {
    // Send Steam init status to renderer
    mainWindow.webContents.send('steam-status', {
      ready: steamReady,
      overlayAvailable: steam.isOverlayAvailable(),
      userName: steamReady ? (steam.friends?.getPersonaName?.() ?? 'Unknown') : null,
    });

    if (steamReady && steam.isOverlayAvailable()) {
      // Short delay to let the window fully render before attaching overlay
      setTimeout(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;

        overlayEnabled = steam.addElectronSteamOverlay(mainWindow, {
          title: 'Steam Overlay Test',
          fps: 60,
        });

        console.log(`[Main] Steam overlay: ${overlayEnabled ? 'enabled ✓' : 'failed ✗'}`);
        mainWindow.webContents.send('overlay-ready', overlayEnabled);
      }, 500);
    }
  });

  // On macOS, the close button hides the window instead of quitting.
  // Cmd+Q triggers before-quit which sets this flag, allowing the window to close.
  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin' && !app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Heartbeat: main process setInterval is never throttled by Chromium.
  // Every 200ms while the window is visible we send a ping to the renderer.
  // The renderer restarts its rAF loop if it hasn't fired in >300ms.
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      mainWindow.webContents.send('heartbeat');
    }
  }, 200);

  // Re-show the window when the dock icon is clicked.
  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
});

// IPC: renderer asks to open Steam overlay programmatically
ipcMain.on('open-steam-overlay', () => {
  if (steamReady) {
    steam.overlay?.activateGameOverlay?.('Friends');
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  app.isQuiting = true;
  if (steamReady) steam.shutdown();
});
