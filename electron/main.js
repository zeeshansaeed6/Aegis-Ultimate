/**
 * Aegis Desktop Application - Main Process (Electron)
 * Standalone privacy search engine and Chromium multi-tab browser application
 * Supports native <webview> guest tabs, Chrome Downloads Manager, and Chrome Extensions
 */

const { app, BrowserWindow, ipcMain, shell, Menu, session, dialog, globalShortcut } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const https = require('https');

let mainWindow = null;
let serverInstance = null;
let serverPort = 3000;

// Track active download items: id -> DownloadItem
const activeDownloads = new Map();

// Extensions directory in user data
const extensionsDir = path.join(app.getPath('userData'), 'extensions');
if (!fs.existsSync(extensionsDir)) {
  try {
    fs.mkdirSync(extensionsDir, { recursive: true });
  } catch (e) {
    console.error('Failed to create extensions directory:', e);
  }
}

/**
 * Start the internal Express privacy server
 */
function bootLocalServer(startPort = 3000) {
  return new Promise((resolve) => {
    const { startServer } = require('../server/server');
    
    function tryPort(port) {
      const tester = http.createServer();
      tester.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} in use, trying ${port + 1}...`);
          tryPort(port + 1);
        } else {
          console.error('Server port test error:', err);
          tryPort(port + 1);
        }
      });
      tester.once('listening', () => {
        tester.close(() => {
          serverPort = port;
          serverInstance = startServer(port);
          console.log(`✓ Aegis internal privacy engine bound to http://localhost:${serverPort}`);
          resolve(serverPort);
        });
      });
      tester.listen(port);
    }

    tryPort(startPort);
  });
}

// Chromium Network & Windows Process Stability & Universal SSL Compatibility Flags
// Prevents network service utility process disconnects, crashes, and net_error -101 SSL handshake resets
app.commandLine.appendSwitch('enable-features', 'NetworkServiceInProcess');
app.commandLine.appendSwitch('disable-features', 'NetworkServiceSandbox,PostQuantumKyber,EncryptedClientHello');
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

// Authentic Google Chrome User-Agent: Prevents Google/Gmail "This browser or app may not be secure" blocks
const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
app.userAgentFallback = CHROME_USER_AGENT;

// Universal Certificate Error Bypass: guarantees no SSL handshake crash or net_error on any external website
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(true);
});

// Graceful child process resilience (suppresses noisy network worker restarts)
app.on('child-process-gone', (_event, details) => {
  if (details.type === 'Utility') {
    return; // Benign network or audio worker restart
  }
  console.log(`ℹ️ Child process (${details.type || 'unknown'}) status: ${details.reason || 'normal'}`);
});

/**
 * Configure Chromium Sessions, Permissions, and Download Interceptors
 */
function setupSessionHandlers() {
  const sessionsToConfigure = [
    session.defaultSession,
    session.fromPartition('persist:aegis_user')
  ];

  for (const sess of sessionsToConfigure) {
    if (!sess) continue;

    // Enforce Chrome User-Agent on all network requests and client headers
    sess.setUserAgent(CHROME_USER_AGENT);

    // Universal TLS & Certificate verification bypass for third-party CDNs, ad-stubs, and legacy hosts
    sess.setCertificateVerifyProc((request, callback) => {
      callback(0); // 0 = accept certificate and proceed
    });

    // Safe permission handling for multimedia, audio, video, fullscreen, clipboard
    sess.setPermissionRequestHandler((webContents, permission, callback) => {
      const allowed = ['media', 'mediaKeySystem', 'notifications', 'fullscreen', 'clipboard-read', 'clipboard-sanitized-write', 'openExternal'];
      callback(allowed.includes(permission));
    });

    sess.setPermissionCheckHandler((_webContents, _permission) => {
      return true;
    });

    // Native Google Chrome-grade Download Interceptor
    sess.on('will-download', (event, item, webContents) => {
      const downloadId = 'dl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      activeDownloads.set(downloadId, item);

      const fileName = item.getFilename() || 'download';
      const totalBytes = item.getTotalBytes() || 0;
      const savePath = item.getSavePath();
      const url = item.getURL();
      const startTime = Date.now();

      // Notify renderer of download initiation
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-started', {
          id: downloadId,
          filename: fileName,
          totalBytes: totalBytes,
          savePath: savePath,
          url: url,
          startTime: startTime
        });
      }

      item.on('updated', (event, state) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          const received = item.getReceivedBytes();
          const total = item.getTotalBytes();
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = elapsed > 0 ? Math.round(received / elapsed) : 0;

          mainWindow.webContents.send('download-progress', {
            id: downloadId,
            filename: fileName,
            receivedBytes: received,
            totalBytes: total,
            speed: speed,
            isPaused: item.isPaused(),
            state: state // 'progressing' or 'interrupted'
          });
        }
      });

      item.once('done', (event, state) => {
        activeDownloads.delete(downloadId);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-completed', {
            id: downloadId,
            filename: fileName,
            savePath: item.getSavePath(),
            totalBytes: item.getTotalBytes(),
            state: state // 'completed', 'cancelled', 'interrupted'
          });
        }
      });
    });
  }

  // Intercept guest webContents (such as <webview> tabs) to ensure Chrome identity and OAuth popup compliance
  app.on('web-contents-created', (event, contents) => {
    contents.setUserAgent(CHROME_USER_AGENT);

    // Disarm navigator.webdriver and automation signatures for Google and anti-bot verification
    contents.on('dom-ready', () => {
      contents.executeJavaScript(`
        try {
          if (navigator.webdriver) {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
          }
        } catch(e) {}
      `).catch(() => {});
    });

    // Handle OAuth Popups and child windows inside guest webviews
    contents.setWindowOpenHandler(({ url }) => {
      const isAuthPopup = /accounts\.google\.com|appleid\.apple\.com|login\.microsoftonline\.com|github\.com\/login|facebook\.com\/.*dialog|twitter\.com\/i\/oauth2|discord\.com\/api\/oauth2|auth0\.com/i.test(url);
      if (isAuthPopup) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 600,
            height: 720,
            autoHideMenuBar: true,
            backgroundColor: '#0b0f19',
            webPreferences: {
              partition: 'persist:aegis_user',
              contextIsolation: true,
              nodeIntegration: false
            }
          }
        };
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript(`
          if (typeof openInPrivateBrowser === 'function') {
            openInPrivateBrowser(${JSON.stringify(url)});
          }
        `).catch(() => {});
      }
      return { action: 'deny' };
    });
  });
}

/**
 * Create the primary Aegis desktop window
 */
async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 980,
    minHeight: 650,
    backgroundColor: '#0b0f19',
    title: 'Aegis Private Browser & Search Suite',
    show: false,
    frame: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'public', 'app-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true, // Native Chromium guest webviews enabled for full web compatibility!
      spellcheck: true
    }
  });

  Menu.setApplicationMenu(null);

  const appUrl = `http://localhost:${serverPort}`;
  await mainWindow.loadURL(appUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized-change', false);
  });

  // Intercept child window popups and route into Aegis browser tabs
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://localhost:${serverPort}`)) {
      return { action: 'allow' };
    }
    
    mainWindow.webContents.executeJavaScript(`
      if (typeof openInPrivateBrowser === 'function') {
        openInPrivateBrowser(${JSON.stringify(url)}, ${JSON.stringify(url)});
      }
    `).catch(() => {});

    return { action: 'deny' };
  });

  // Intercept top-level navigations so clicking any web link stays inside Aegis Private Browser
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://localhost:${serverPort}`)) {
      event.preventDefault();
      mainWindow.webContents.executeJavaScript(`
        if (typeof openInPrivateBrowser === 'function') {
          openInPrivateBrowser(${JSON.stringify(url)}, ${JSON.stringify(url)});
        }
      `).catch(() => {});
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==========================================================================
// IPC Handlers: Window Controls & Desktop State
// ==========================================================================
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

ipcMain.handle('app-get-version', () => {
  return app.getVersion();
});

ipcMain.handle('app-get-memory', () => {
  return process.memoryUsage();
});

ipcMain.on('open-external-safe', (_event, url) => {
  // Always open in Aegis Private Browser tab instead of external Chrome!
  if (mainWindow && !mainWindow.isDestroyed() && url) {
    mainWindow.webContents.executeJavaScript(`
      if (typeof openInPrivateBrowser === 'function') {
        openInPrivateBrowser(${JSON.stringify(url)}, ${JSON.stringify(url)});
      }
    `).catch(() => {});
  }
});

// ==========================================================================
// IPC Handlers: Screenshot & Clean PDF Exporter
// ==========================================================================
ipcMain.handle('page-capture-screenshot', async () => {
  if (!mainWindow) return { success: false, error: 'Main window unavailable' };
  try {
    const nativeImage = await mainWindow.webContents.capturePage();
    const buffer = nativeImage.toPNG();
    const fileName = `Aegis_Screenshot_${Date.now()}.png`;
    const filePath = path.join(app.getPath('downloads'), fileName);
    fs.writeFileSync(filePath, buffer);
    return {
      success: true,
      filePath,
      fileName,
      dataUrl: nativeImage.toDataURL()
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('page-export-pdf', async () => {
  if (!mainWindow) return { success: false, error: 'Main window unavailable' };
  try {
    const pdfBuffer = await mainWindow.webContents.printToPDF({
      printBackground: true,
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
    });
    const fileName = `Aegis_Export_${Date.now()}.pdf`;
    const filePath = path.join(app.getPath('downloads'), fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    return {
      success: true,
      filePath,
      fileName
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ==========================================================================
// IPC Handlers: Chrome Download Manager
// ==========================================================================
ipcMain.handle('get-downloads-dir', () => {
  return app.getPath('downloads');
});

ipcMain.on('download-cancel', (_event, id) => {
  const item = activeDownloads.get(id);
  if (item && !item.isDone()) {
    item.cancel();
    activeDownloads.delete(id);
  }
});

ipcMain.on('download-pause', (_event, id) => {
  const item = activeDownloads.get(id);
  if (item && !item.isPaused()) {
    item.pause();
  }
});

ipcMain.on('download-resume', (_event, id) => {
  const item = activeDownloads.get(id);
  if (item && item.canResume()) {
    item.resume();
  }
});

ipcMain.on('download-show-in-folder', (_event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  } else {
    shell.openPath(app.getPath('downloads'));
  }
});

ipcMain.on('download-open-file', (_event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.openPath(filePath);
  }
});

// ==========================================================================
// IPC Handlers: Chrome Extensions Engine
// ==========================================================================
ipcMain.handle('extensions-list', () => {
  try {
    const loaded = session.defaultSession.getAllExtensions();
    return loaded.map(ext => ({
      id: ext.id,
      name: ext.name,
      version: ext.version,
      description: ext.manifest?.description || '',
      homepage: ext.manifest?.homepage_url || '',
      enabled: true,
      path: ext.path
    }));
  } catch (err) {
    console.error('Failed to list extensions:', err);
    return [];
  }
});

ipcMain.handle('extensions-load-unpacked', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Unpacked Chrome Extension Directory (Containing manifest.json)',
      properties: ['openDirectory']
    });

    if (result.canceled || !result.filePaths.length) {
      return { success: false, cancelled: true };
    }

    const folderPath = result.filePaths[0];
    const manifestPath = path.join(folderPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      return { success: false, error: 'Selected folder does not contain a manifest.json file.' };
    }

    const ext = await session.defaultSession.loadExtension(folderPath, { allowFileAccess: true });
    return {
      success: true,
      extension: {
        id: ext.id,
        name: ext.name,
        version: ext.version,
        description: ext.manifest?.description || ''
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('extensions-remove', async (_event, extensionId) => {
  try {
    await session.defaultSession.removeExtension(extensionId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('extensions-get-catalog', () => {
  return [
    {
      id: 'cjpalhdlnbpafiamejdnhcphjbkeiagm',
      name: 'uBlock Origin',
      author: 'Raymond Hill',
      category: 'Privacy & Security',
      description: 'An efficient, wide-spectrum content blocker. Easy on memory and CPU.',
      icon: '🛡️',
      webstoreUrl: 'https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm'
    },
    {
      id: 'eimadpbcbfnmbkopoojfekhnkhdbieeh',
      name: 'Dark Reader',
      author: 'Alexander Shutau',
      category: 'Appearance',
      description: 'Invert brightness of web pages with eye-friendly dark mode for every website.',
      icon: '🌙',
      webstoreUrl: 'https://chromewebstore.google.com/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh'
    },
    {
      id: 'pkehgijcmpdhfbdbbnkijodmdjhbjlgp',
      name: 'Privacy Badger',
      author: 'Electronic Frontier Foundation (EFF)',
      category: 'Privacy',
      description: 'Automatically learns to block invisible trackers and surveillance cookies.',
      icon: '🦡',
      webstoreUrl: 'https://chromewebstore.google.com/detail/privacy-badger/pkehgijcmpdhfbdbbnkijodmdjhbjlgp'
    },
    {
      id: 'fmkadmapgofadopljbjfkapdkoienihi',
      name: 'React Developer Tools',
      author: 'Meta',
      category: 'Developer Tools',
      description: 'Inspect React component hierarchies, state, and props in the DevTools.',
      icon: '⚛️',
      webstoreUrl: 'https://chromewebstore.google.com/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi'
    }
  ];
});

// Open DevTools on active window or webview
ipcMain.on('devtools-toggle', () => {
  if (mainWindow) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  }
});

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('✓ Another Aegis instance is already active. Focusing window...');
  process.exit(0);
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      setupSessionHandlers();
      await bootLocalServer(3000);
      await createMainWindow();

      // Register Global System-Wide Spotlight Shortcut
      try {
        const summonSpotlight = () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('spotlight-trigger');
          }
        };

        const registeredAltSpace = globalShortcut.register('Alt+Space', summonSpotlight);
        if (!registeredAltSpace) {
          console.log('ℹ️ Alt+Space handled by OS, using CommandOrControl+Alt+Space...');
        }
        globalShortcut.register('CommandOrControl+Alt+Space', summonSpotlight);
        console.log('✓ Global Desktop Spotlight shortcut registered (Alt+Space / Ctrl+Alt+Space)');
      } catch (err) {
        console.warn('Global shortcut registration note:', err.message);
      }
    } catch (err) {
      console.error('Failed to launch Aegis Desktop App:', err);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Clean shutdown
app.on('window-all-closed', () => {
  if (serverInstance && typeof serverInstance.close === 'function') {
    serverInstance.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverInstance && typeof serverInstance.close === 'function') {
    serverInstance.close();
  }
});
