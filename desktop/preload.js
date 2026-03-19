/**
 * LY Desktop — Preload Script
 *
 * 透過 contextBridge 安全地暴露原生 API 給 renderer process。
 * contextIsolation: true 確保 renderer 無法直接存取 Node.js API。
 *
 * 未來 NDI 整合時，NDI 相關 API 會在這裡暴露，例如：
 *   ndi: {
 *     startSender(name, width, height) {},
 *     sendFrame(buffer) {},
 *     stopSender() {},
 *     listReceivers() {},
 *   }
 */

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('lyDesktop', {
  /** 當前平台：'darwin' | 'win32' | 'linux' */
  platform: process.platform,

  /** 是否在 Electron 環境中運行 */
  isElectron: true,

  /** 應用版本（對應 package.json） */
  version: '0.1.0',
});
