import path from 'node:path';
import { mkdir, appendFile } from 'node:fs/promises';
import { BrowserWindow, app, dialog, shell, session } from 'electron';
import { createLogger, type LogSink, consoleSink } from '@guidedreel/core';
import { FileAssetStore, FileProjectRepository } from './storage';
import { AssetProtocol } from './protocol';
import { RenderManager } from './render-manager';
import { registerIpc } from './ipc';
import { buildMenu } from './menu';
import { LocalTtsEngine } from './tts/local-tts';
import { SecretStore } from './secrets';
import { APP_COPYRIGHT, APP_NAME, APP_VERSION } from './app-info';

// Must run before app.ready
AssetProtocol.registerScheme();
// Name and About panel: in development Electron would otherwise show "Electron" and its
// own version. The packaged app gets these from electron-builder's Info.plist as well.
app.setName(APP_NAME);
app.setAboutPanelOptions({
  applicationName: APP_NAME,
  applicationVersion: APP_VERSION,
  version: `Electron ${process.versions.electron}`,
  copyright: APP_COPYRIGHT,
  website: 'https://github.com/prlama55/GuidedReel',
  iconPath: path.join(__dirname, '../../build/icon.png'),
});
// Automation hook: isolated user data directory for end-to-end tests.
if (process.env['VC_E2E_USER_DATA']) app.setPath('userData', process.env['VC_E2E_USER_DATA']);

let mainWindow: BrowserWindow | null = null;
const getWindow = () => mainWindow;

/** Logs to the console in dev and to userData/logs/main.log always. */
function createFileSink(): LogSink {
  const file = path.join(app.getPath('logs'), 'main.log');
  void mkdir(path.dirname(file), { recursive: true });
  return (r) => {
    if (!app.isPackaged) consoleSink(r);
    void appendFile(file, JSON.stringify(r) + '\n').catch(() => undefined);
  };
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 14, y: 14 },
    backgroundColor: '#0b0e14',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  // Unsaved changes: ask before closing (autosave usually lands within a second).
  mainWindow.on('close', (e) => {
    if (!mainWindow || !mainWindow.isDocumentEdited() || process.env['VC_E2E_USER_DATA']) return;
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Close anyway', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      message: 'Your latest changes are still being saved.',
      detail: 'Wait a moment for “Saved” to appear, or close anyway and lose the last edit.',
    });
    if (choice === 1) e.preventDefault();
  });
  mainWindow.on('closed', () => (mainWindow = null));

  // External links open in the system browser; never navigate the app window away.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const dev = process.env['ELECTRON_RENDERER_URL'];
    if (!(dev && url.startsWith(dev)) && !url.startsWith('file:')) e.preventDefault();
  });

  const dev = process.env['ELECTRON_RENDERER_URL'];
  if (dev) void mainWindow.loadURL(dev);
  else void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  // Packaged builds get the icon from electron-builder; show it in development too.
  if (process.platform === 'darwin' && !app.isPackaged)
    app.dock?.setIcon(path.join(__dirname, '../../build/icon.png'));
  const log = createLogger('desktop:main', { level: 'info', sink: createFileSink() });
  const userData = app.getPath('userData');
  const projects = new FileProjectRepository(path.join(userData, 'projects'));
  const assets = new FileAssetStore(path.join(userData, 'assets'));
  const protocol = new AssetProtocol(assets);
  protocol.install();
  const render = new RenderManager(assets, getWindow);
  const piper = new LocalTtsEngine(userData);
  const secrets = new SecretStore(userData);
  registerIpc({ projects, assets, protocol, render, piper, secrets, getWindow });
  buildMenu(getWindow);

  // Microphone for voiceover recording; everything else stays denied.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media');
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media');

  // Tight CSP for the renderer (dev server needs inline styles from Vite HMR).
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const devUrl = process.env['ELECTRON_RENDERER_URL'];
    const csp = devUrl
      ? `default-src 'self' ${devUrl} ws: wss:; script-src 'self' 'unsafe-inline' ${devUrl}; style-src 'self' 'unsafe-inline' ${devUrl}; img-src 'self' data: blob: vc-asset: https:; media-src 'self' data: blob: vc-asset: https:; font-src 'self' data: vc-asset:; connect-src 'self' ${devUrl} ws: wss: vc-asset: https:; worker-src 'self' blob:`
      : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: vc-asset: https:; media-src 'self' data: blob: vc-asset: https:; font-src 'self' data: vc-asset:; connect-src 'self' vc-asset: https:; worker-src 'self' blob:`;
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] } });
  });

  createWindow();
  log.info('app ready', { version: APP_VERSION, userData });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
