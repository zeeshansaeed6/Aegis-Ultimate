/**
 * Aegis Desktop Application - Preload Script
 * Secure IPC bridge between Electron Main Process and Aegis Web App
 * Exposes Native Chromium Webview, Chrome Downloads, and Chrome Extensions APIs
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aegisDesktop', {
  isDesktop: true,
  platform: process.platform,
  
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // App info & utilities
  getVersion: () => ipcRenderer.invoke('app-get-version'),
  getMemoryUsage: () => ipcRenderer.invoke('app-get-memory'),
  openExternal: (url) => ipcRenderer.send('open-external-safe', url),
  toggleDevTools: () => ipcRenderer.send('devtools-toggle'),
  captureScreenshot: () => ipcRenderer.invoke('page-capture-screenshot'),
  exportPDF: () => ipcRenderer.invoke('page-export-pdf'),

  // Events
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window-maximized-change', (_event, isMaximized) => callback(isMaximized));
  },
  onSpotlightTrigger: (callback) => {
    ipcRenderer.on('spotlight-trigger', () => callback());
  },

  // Chrome Download Manager API
  downloads: {
    getDownloadsDir: () => ipcRenderer.invoke('get-downloads-dir'),
    cancel: (id) => ipcRenderer.send('download-cancel', id),
    pause: (id) => ipcRenderer.send('download-pause', id),
    resume: (id) => ipcRenderer.send('download-resume', id),
    showInFolder: (path) => ipcRenderer.send('download-show-in-folder', path),
    openFile: (path) => ipcRenderer.send('download-open-file', path),
    onStarted: (callback) => {
      ipcRenderer.on('download-started', (_event, data) => callback(data));
    },
    onProgress: (callback) => {
      ipcRenderer.on('download-progress', (_event, data) => callback(data));
    },
    onCompleted: (callback) => {
      ipcRenderer.on('download-completed', (_event, data) => callback(data));
    }
  },

  // Chrome Extensions Engine API
  extensions: {
    list: () => ipcRenderer.invoke('extensions-list'),
    loadUnpacked: () => ipcRenderer.invoke('extensions-load-unpacked'),
    remove: (id) => ipcRenderer.invoke('extensions-remove', id),
    getCatalog: () => ipcRenderer.invoke('extensions-get-catalog')
  }
});
