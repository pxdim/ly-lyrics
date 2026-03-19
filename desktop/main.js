/**
 * LY Desktop — Electron Main Process
 *
 * 將現有 Next.js 應用包裝為桌面應用。
 * 開發模式連接本地 dev server，生產模式可指向部署 URL 或未來的 static export。
 *
 * 架構原則：
 * - main process 只負責視窗管理與原生 API 橋接
 * - 所有 UI 邏輯仍由 Next.js renderer 負責
 * - preload.js 透過 contextBridge 暴露安全的原生 API
 */

const { app, BrowserWindow, Menu, screen } = require('electron');
const path = require('path');

// -- 環境設定 --
// 開發模式：設定 ELECTRON_URL=http://localhost:3000
// 生產模式：連接部署 URL 或本地 server
const BASE_URL = process.env.ELECTRON_URL || 'http://localhost:3000';
const IS_DEV = process.env.NODE_ENV !== 'production';

/** @type {BrowserWindow | null} */
let controllerWindow = null;

/** @type {BrowserWindow | null} */
let displayWindow = null;

/**
 * 建立控制台視窗
 * 載入 /controller 路由，主要操作介面
 */
function createControllerWindow() {
  // 避免重複開啟
  if (controllerWindow && !controllerWindow.isDestroyed()) {
    controllerWindow.focus();
    return;
  }

  controllerWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    titleBarStyle: 'hiddenInset', // macOS 融合標題列
    title: 'LY 控制台',
  });

  controllerWindow.loadURL(`${BASE_URL}/controller`);

  if (IS_DEV) {
    controllerWindow.webContents.openDevTools({ mode: 'detach' });
  }

  controllerWindow.on('closed', () => {
    controllerWindow = null;
  });
}

/**
 * 建立顯示端視窗
 * 載入 /display?mode=clean 路由，設計為無邊框全螢幕投影用途。
 *
 * 視窗特性：
 * - 無邊框（frame: false）— 投影場景不需要標題列
 * - 透明背景 — 為未來 NDI alpha 通道輸出預留
 * - 預設開在第二螢幕（如果有的話）
 */
function createDisplayWindow() {
  // 避免重複開啟
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.focus();
    return;
  }

  // 偵測外接螢幕，優先在第二螢幕開啟
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const externalDisplay = displays.find(
    (d) => d.id !== primaryDisplay.id
  );

  const targetBounds = externalDisplay
    ? externalDisplay.bounds
    : primaryDisplay.bounds;

  displayWindow = new BrowserWindow({
    x: targetBounds.x,
    y: targetBounds.y,
    width: targetBounds.width,
    height: targetBounds.height,
    frame: false,
    transparent: true,
    fullscreen: !!externalDisplay, // 外接螢幕自動全螢幕
    alwaysOnTop: false, // 預設不置頂，使用者可透過選單切換
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    title: 'LY 顯示端',
  });

  displayWindow.loadURL(`${BASE_URL}/display?mode=clean`);

  displayWindow.on('closed', () => {
    displayWindow = null;
  });
}

/**
 * 應用程式選單
 * 提供視窗管理、顯示端控制等功能
 */
function buildMenu() {
  const isMac = process.platform === 'darwin';

  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [
    // macOS 應用程式選單
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { label: '關於 LY', role: 'about' },
              { type: 'separator' },
              { label: '隱藏 LY', role: 'hide' },
              { label: '隱藏其他', role: 'hideOthers' },
              { label: '全部顯示', role: 'unhide' },
              { type: 'separator' },
              { label: '結束', role: 'quit' },
            ],
          },
        ]
      : []),
    // 視窗選單
    {
      label: '視窗',
      submenu: [
        {
          label: '控制台',
          accelerator: 'CmdOrCtrl+1',
          click: () => createControllerWindow(),
        },
        {
          label: '顯示端（投影）',
          accelerator: 'CmdOrCtrl+2',
          click: () => createDisplayWindow(),
        },
        { type: 'separator' },
        {
          label: '顯示端置頂',
          type: 'checkbox',
          checked: false,
          click: (menuItem) => {
            if (displayWindow && !displayWindow.isDestroyed()) {
              displayWindow.setAlwaysOnTop(menuItem.checked);
            }
          },
        },
        {
          label: '顯示端全螢幕',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            if (displayWindow && !displayWindow.isDestroyed()) {
              displayWindow.setFullScreen(
                !displayWindow.isFullScreen()
              );
            }
          },
        },
        { type: 'separator' },
        { label: '最小化', role: 'minimize' },
        { label: '關閉', role: 'close' },
      ],
    },
    // 開發工具（僅開發模式）
    ...(IS_DEV
      ? [
          {
            label: '開發',
            submenu: [
              { label: '重新載入', role: 'reload' },
              { label: '強制重新載入', role: 'forceReload' },
              { label: '開發者工具', role: 'toggleDevTools' },
            ],
          },
        ]
      : []),
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// -- 應用程式生命週期 --

app.whenReady().then(() => {
  buildMenu();
  createControllerWindow();

  // macOS: 點擊 dock icon 時重新開啟視窗
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControllerWindow();
    }
  });
});

// 所有視窗關閉時結束應用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
