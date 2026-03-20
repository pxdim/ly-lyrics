# LY — 歌詞即時顯示系統

用於教會敬拜、演唱會等場景的即時歌詞投影系統。控制端操作歌詞切換，顯示端即時同步呈現。

## 技術棧

| 類別 | 技術 | 版本 |
|------|------|------|
| 前端框架 | Next.js (App Router, Turbopack dev) | 16 |
| UI 函式庫 | React | 19 |
| 語言 | TypeScript | 5.7 |
| 後端 | Go (port 8080, Next.js rewrite proxy) | — |
| 狀態管理 | Zustand (persist middleware) | 5 |
| 樣式 | Tailwind CSS + CSS 變數設計系統 | 3.4 |
| 單元測試 | Vitest + @testing-library/react + jsdom | 4 |
| E2E 測試 | Playwright | 1.58 |
| 圖示 | lucide-react | — |
| 拖曳 | @dnd-kit | — |
| QR Code | qrcode.react | — |
| 繁簡轉換 | opencc-js | — |
| 驗證 | zod | — |
| 國際化 | next-intl | 4 |
| Git Hooks | Husky pre-commit | — |

## 資料夾結構

```
app/                → Next.js App Router 頁面
  controller/       → 控制台頁面
  display/          → 歌詞顯示頁面
  login/            → 登入
  register/         → 註冊
components/         → React 元件
  ai-tracking/      → AI 聽歌追蹤
  auth/             → AuthLayout 共用認證佈局
  controller/       → Controller 子元件 (9 個)
  display/          → Display 元件 (ConnectionStatusBar, ConnectionIndicator)
  lyrics/           → 歌詞相關 (LyricsDisplay, LyricsControl, CueGrid, LivePreview)
  lyrics-search/    → 歌詞搜尋 (6 個元件)
  lrc/              → LRC 格式匯入匯出
  playlist/         → 播放清單 (SortablePlaylist)
  ui/               → 共用 UI (GlowButton, GlowInput, Spinner, ConfirmDialog, Toast)
lib/                → 工具庫
  ai-tracking/      → AI 聽歌追蹤引擎 (TrackingEngine, LyricsMatcher)
  api/              → API client (auth, songs, playlists, lyrics-search)
  audio/            → 音訊擷取
  auth/             → Session 管理
  errors/           → AppError 錯誤類別
  hooks/            → 自訂 hooks (useMediaQuery, useIsMobile, useDebounce, useOnlineStatus, etc.)
  i18n/             → i18n 設定 (config.ts: locales/defaultLocale)
  pwa/              → Service Worker 註冊
  schemas/          → Zod 驗證 schemas
  store/            → Zustand store
  stt/              → STT 語音辨識 providers (Deepgram, Google Cloud, Web Speech)
  utils/            → 工具函式 (visible-lines, chinese-converter)
  websocket/        → WebSocket client
i18n/               → next-intl 請求層設定 (request.ts)
messages/           → 語言檔案 (zh-TW.json, zh-CN.json, en.json)
desktop/            → Electron 桌面版 POC
docs/               → 專案文檔
backend/            → Go 後端 (如存在)
```

## 常用指令

```bash
npm run dev          # 啟動開發伺服器 (Turbopack)
npm run build        # 生產環境建置
npm run lint         # ESLint
npm run type-check   # TypeScript 類型檢查
npx vitest run       # 執行所有單元測試 (1189 tests)
npm run test:e2e     # Playwright E2E 測試
```

## 設計系統

- **唯一 token 來源**：`app/globals.css` CSS 變數
- **Tailwind config**：DEFAULT 指向 CSS 變數，不可繞過
- **主題**：Neon Brutalist Glass（烈焰橘 `--accent` + 冰藍 `--secondary` + 霓虹綠 `--success`）
- **字體**：Archivo Black (heading) + Noto Sans TC (body) + JetBrains Mono (mono)
- **鐵律**：零硬編碼 hex/rgba — Clean Output `#000000` 背景為唯一例外

## 測試

- **81 個測試檔案**，1189 個測試案例
- **框架**：Vitest + @testing-library/react + jsdom
- **Mock 策略**：真實程式碼優先，僅 mock 不可避免的外部依賴（navigator.mediaDevices、WebSocket、fetch）
- **TDD**：遵循紅綠燈法（Red-Green-Refactor），所有功能開發必須先有失敗測試

## 架構決策

| 決策 | 選擇 | 原因 |
|------|------|------|
| 前後端通訊 | Next.js rewrite proxy → Go :8080 | 前端不直接連後端，統一入口避免 CORS |
| 即時同步 | WebSocket (session code 認證) | 低延遲雙向通訊，符合 <100ms 目標 |
| Token 儲存 | HttpOnly cookie | 防止 XSS 竊取 token |
| 狀態管理 | Zustand + persist | 輕量、支援 localStorage 持久化 |
| 影像輸出 | Clean Output mode (?mode=clean) | 替代 NDI/Spout，供 OBS/VJ 軟體擷取 |
| 國際化 | next-intl (基礎架構已建立，元件尚未替換) | Next.js App Router 官方推薦 i18n 方案 |
| i18n | next-intl | App Router 官方推薦，支援 server components |
| 桌面版 POC | Electron | 驗證現有 React 可直接包裝，未來原生 NDI |
| 離線支援 | Service Worker v2 | 三層快取策略，Display 端離線靜止歌詞 |

## 特殊規則

1. **Token 安全**：HttpOnly cookie 存儲 JWT，前端永不接觸 token 明文
2. **WebSocket 認證**：使用 session code（非 JWT）進行 WebSocket 連線驗證
3. **Clean Output**：Display 頁加 `?mode=clean` 參數，純黑背景 `#000000` + 白字，供 OBS 視窗擷取或 VJ 軟體使用
4. **API Proxy**：所有 `/api/*` 請求由 Next.js rewrite 轉發至 Go 後端 `:8080`
5. **繁簡轉換**：使用 opencc-js 支援繁體/簡體歌詞轉換
6. **國際化（i18n）**：使用 next-intl，語言檔案位於 `messages/`，設定位於 `lib/i18n/config.ts` 和 `i18n/request.ts`。支援 zh-TW（預設）、zh-CN、en。目前為基礎架構，元件中的硬編碼字串尚未替換為 `t()` 呼叫

## 分支策略

- `main`：主要開發分支
- 功能開發在 feature branch 完成後合併回 main
