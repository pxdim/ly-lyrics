# LY Desktop — Electron POC

LY 歌詞顯示系統的桌面版概念驗證（Proof of Concept）。

將現有 Next.js 應用包裝為 Electron 桌面應用，證明架構可行性，並為未來原生 NDI 輸出預留擴充點。

## 架構

```
desktop/
  package.json      # 獨立的 Electron 依賴（不污染主專案）
  main.js           # Main process — 視窗管理、選單、螢幕偵測
  preload.js        # Preload — contextBridge 安全 API 暴露
  README.md         # 本文件
```

### 程序模型

```
┌─────────────────────────────────────────────┐
│  Electron Main Process (main.js)            │
│  - 視窗管理（Controller / Display）          │
│  - 應用程式選單                              │
│  - 螢幕偵測（自動偵測外接螢幕）              │
│  - 未來：NDI native addon 整合點            │
├─────────────────────────────────────────────┤
│  Preload (preload.js)                       │
│  - contextBridge 暴露 lyDesktop API         │
│  - 未來：NDI sender/receiver API            │
├─────────────────────────────────────────────┤
│  Renderer (Next.js app)                     │
│  - 完全複用現有 Web UI                       │
│  - 透過 window.lyDesktop 偵測桌面環境        │
│  - 不需要任何程式碼修改即可運行              │
└─────────────────────────────────────────────┘
```

### 視窗設計

| 視窗 | 路由 | 特性 |
|------|------|------|
| 控制台 | `/controller` | 標準視窗、macOS 融合標題列、DevTools（開發模式） |
| 顯示端 | `/display?mode=clean` | 無邊框、透明背景、自動偵測外接螢幕、可全螢幕 |

## 啟動方式

### 前置條件

1. 主專案 Next.js dev server 已啟動：

```bash
# 在主專案根目錄
cd /path/to/LY
npm run dev
```

2. Go 後端已啟動（WebSocket 同步需要）

### 安裝 Electron 依賴

```bash
cd desktop
npm install
```

### 開發模式

連接本地 Next.js dev server（port 3000）：

```bash
npm run start:dev
```

### 生產模式

連接部署 URL（需修改 BASE_URL 或設定環境變數）：

```bash
# 連接本地 build
npm start

# 連接遠端部署
ELECTRON_URL=https://your-domain.com npm run start:dev
```

## 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Cmd/Ctrl + 1` | 開啟/聚焦控制台 |
| `Cmd/Ctrl + 2` | 開啟/聚焦顯示端 |
| `Cmd/Ctrl + Shift + F` | 顯示端全螢幕切換 |

## 安全模型

- `contextIsolation: true` — renderer 與 Node.js 完全隔離
- `nodeIntegration: false` — renderer 無法存取 Node.js API
- `sandbox: true` — renderer process 在沙箱中運行
- 所有原生 API 透過 `contextBridge` 暴露白名單介面

## 未來 NDI 整合規劃

本 POC 的架構已為原生 NDI 輸出預留擴充點。

### 整合路徑

```
Phase 1 (目前): Electron wrapper
  - 證明 Next.js 可在 Electron 中正常運行
  - 顯示端支援無邊框、透明、全螢幕

Phase 2: offscreen rendering + frame capture
  - 使用 Electron 的 offscreen rendering API
  - BrowserWindow.webContents.capturePage() 擷取 frame
  - 建立 frame pipeline（capture → buffer → NDI sender）

Phase 3: NDI native addon
  - 使用 Node.js N-API 綁定 NDI SDK
  - 在 preload.js 暴露 NDI API
  - main process 管理 NDI sender 生命週期
```

### 預期架構（Phase 3）

```
┌────────────────────────────┐
│  Electron Main Process     │
│  ┌──────────────────────┐  │
│  │  NDI Native Addon    │  │
│  │  (N-API + NDI SDK)   │  │
│  │  - createSender()    │  │
│  │  - sendFrame(rgba)   │  │
│  │  - destroySender()   │  │
│  └──────────┬───────────┘  │
│             │ frame data   │
│  ┌──────────┴───────────┐  │
│  │  Frame Capture       │  │
│  │  capturePage() 60fps │  │
│  └──────────────────────┘  │
├────────────────────────────┤
│  Renderer (Display page)   │
│  歌詞渲染 → 被 capture     │
└────────────────────────────┘
         │
         ▼ NDI stream
   Resolume / OBS / vMix
```

### 與現有 OBS 方案的關係

本 Electron 方案與 ADR-008 中推薦的 OBS Browser Source 方案**不互斥**：

- **OBS 方案**：零開發成本，適合已有 OBS 的使用者，目前的推薦方案
- **Electron NDI 方案**：品牌化體驗，一鍵啟動，適合不想額外安裝 OBS 的使用者

兩者可並存，讓使用者根據場景選擇。

## 注意事項

- 本 POC 的 `desktop/` 目錄擁有獨立的 `package.json`，不影響主專案依賴
- Electron 二進位檔約 100MB+，僅在 `desktop/` 內安裝
- 主專案的 `.gitignore` 應排除 `desktop/node_modules/`
- Windows 使用者需將 `start:dev` 腳本改為 `cross-env ELECTRON_URL=http://localhost:3000 electron .`
