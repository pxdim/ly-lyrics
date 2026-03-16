# 變更記錄

## 版本歷史

### v0.7.0 - 2026-03-17

**P0 UI 重新設計 — Controller 頁面拆分**

#### 新功能
- **Display Clean Output 模式** (`?mode=clean`) — 供 OBS/Resolume/VJ 軟體擷取
  - 純黑 `#000000` 背景（適用 luma key 合成）
  - 只渲染歌詞文字，無任何 UI chrome（無 ConnectionStatusBar、ConnectionIndicator、LyricsControl、Song Info Overlay）
  - 未連線時顯示純黑等待畫面（不顯示同步碼輸入 UI）
  - 斷線時歌詞凍結、不降低透明度、不顯示重連 UI

#### 修復
- **Song Info Overlay fade-out 動畫** — 改用 Tailwind config 定義的 `animate-fade-out-slow` 取代 inline `animate-[fade-out_3s_ease-out_forwards]`

#### 重構
- **Controller page.tsx 從 1707 行拆分為 172 行組裝層 + 9 個子元件**
  - `ToggleRow` — 純展示開關列元件（role="switch" 無障礙支援）
  - `MobileTabBar` — 手機版底部分頁導航列
  - `ControllerHeader` — 桌面/平板版 StatusBar + 手機版 MobileStatusBar + MobileQRTab
  - `QuickSettings` — 顯示端設定面板（行數/字體/行距/高亮色/主題/開關）
  - `LivePreview` — 16:9 即時預覽面板（使用共用 calcVisibleLines）
  - `CueGrid` — 歌詞 Cue List（鍵盤快捷鍵/自動滾動/Transport）
  - `SongLibrary` — 歌曲庫 CRUD（搜尋/新增/刪除/匯出 LRC）
  - `PlaylistPanel` — 播放清單管理（建立/重命名/刪除/拖曳排序）
  - `LibraryPanel` — Songs/Playlists Tab 切換容器

#### 改善
- **替換所有 `confirm()` 為 ConfirmDialog**（SongLibrary + PlaylistPanel）
- **提取 `useIsTablet` hook**（lib/hooks/useIsTablet.ts，含 3 個測試）
- **使用共用 `useIsMobile` / `useIsTablet` hook** 取代頁面內嵌的 matchMedia 邏輯
- **LivePreview 改用 `calcVisibleLines`** 取代重複的行範圍計算

---

### v0.6.1 - 2026-03-14

**P0 品質鞏固 — 測試覆蓋補齊**

#### 新增
- **Vitest 單元測試大幅擴充**
  - Zustand Store 測試 40 cases（歌詞導航、歌曲操作、連線狀態、業務事件、Session、播放控制、顯示設定、Selectors）
  - NativeWSClient 測試 28 cases（連線管理、事件發送/接收、內部事件、重連邏輯、Session 恢復、事件監聽器管理）
  - 前端測試總計 110 cases（新增 68 + 既有 42）
- **Playwright E2E 基礎設施**
  - `docker-compose.test.yml`（PostgreSQL 16 port 5433 + Redis 7 port 6380）
  - `playwright.config.ts`（Go backend + Next.js webServer 設定）
  - `e2e/helpers/auth.ts`、`e2e/helpers/api.ts`（認證/歌曲 API helper）
- **Playwright E2E 測試 Specs**
  - Auth 流程 5 cases（註冊、登入、refresh token、/auth/me、錯誤密碼）
  - Songs CRUD 5 cases（建立、列表、取得、更新、刪除）
  - WebSocket 同步 5 cases（Controller/Display 載入、操作同步、斷線恢復）

#### 修復
- Store `nextLine()`/`jumpToLine()`/`setCurrentIndex()` 空歌詞 bug — lyrics 為空時 `Math.min(1, -1)` 產生 -1 索引，新增 early return guard

---

### v0.6.0 - 2026-03-13

**Display UX 強化 — QR Code、斷線重連、全螢幕**

#### 新增
- QR Code 分享功能（Controller 頁面）
  - `QRCodePanel` 元件：RWD 三級自適應佈局（桌面側欄 / 平板 Popover / 手機 Modal）
  - 掃碼即連：QR Code 編碼 Display URL 含 `?code=` 參數
  - 一鍵複製連結功能
  - `qrcode.react` v4.2.0 依賴
- 斷線重連 UI（Display 頁面）
  - `ConnectionStatusBar`：頂部橫幅提示斷線/重連狀態，重連中顯示倒數
  - `ConnectionIndicator`：右上角連線狀態指示燈（綠/黃/紅三色）
  - WebSocket 新增 `_reconnecting` / `_reconnect_exhausted` 內部事件
- 全螢幕模式（Display 頁面）
  - `F` 鍵快捷鍵切換全螢幕
  - 全螢幕時控制列與狀態指示器 3 秒無操作自動隱藏，滑鼠移動時重新顯示
  - Safari `webkitRequestFullscreen` / `webkitfullscreenchange` 相容
  - `LyricsControl` 新增全螢幕切換按鈕（`Maximize2` / `Minimize2` 圖示）
  - iOS Safari 不支援 Fullscreen API 時自動隱藏按鈕
- Session 房間碼持久化（`sessionStorage`），重新整理後自動回填

#### 改善
- Zustand Store `isConnected: boolean` 重構為 `connectionState: 'connected' | 'reconnecting' | 'disconnected'` 三態
- WebSocket Client 新增 `resetAndReconnect()` 方法
- Tailwind config 新增 `fadeOut` keyframe 動畫
- **RWD 三級響應式佈局** — 全站支援 Desktop(≥1280px) / Tablet(768-1279px) / Mobile(<768px)
  - Controller 手機版：底部 Tab Bar 四分頁（歌曲/歌詞/設定/QR），取代桌面三欄
  - Controller 平板版：雙欄佈局（40% 歌曲庫 + 60% CueGrid）
  - Home/Display/AddSongModal/LyricsControl/LyricsDisplay 響應式字體與間距
- **前端測試基礎建設** — Vitest 4.0 + jsdom 環境
  - LRC Parser 單元測試 36 cases（parseTimeTag, parseLRC, serializeLRC, 往返一致性等）
  - Session Code 生成器測試 6 cases（格式驗證、排除混淆字元、唯一性）
- **Go 後端測試補齊** — 新增 4 模組 1077 行測試
  - `service/song_test.go`、`service/playlist_test.go`、`service/settings_test.go`
  - `redis/session_test.go`（miniredis 整合測試）

---

### v0.5.1 - 2026-03-13

**播放列表完善 & Bug 修復**

#### 新增
- 播放列表完整 CRUD 功能
  - 後端 `PUT /api/playlists/:id`、`DELETE /api/playlists/:id` 端點
  - 前端 `lib/api/playlists.ts` API 封裝
  - Controller 頁面播放列表管理 UI（新增、重命名、刪除、歌曲選擇）
- Display 歌詞 look-ahead bias 算法（自動將當前行顯示在可視區上方三分之一）
- Session 同步碼機制（`lib/websocket/session-code.ts`：6 碼大寫英數）

#### 修復
- WebSocket 重連迴圈問題（HTTP server timeout 導致）
- React hydration error #418（Controller 頁面）
- Controller → Display 歌曲選擇 WebSocket 同步失敗
- 12 個前後端高嚴重度 Bug 一次性修復
- 前端殘留高嚴重度問題修復

#### 改善
- 清理 dead code、強化 TypeScript strict mode
- Go 後端 config 測試補齊

---

### v0.5.0 - 2026-03-13

**Controller 頁面重設計**

#### 新增
- Controller 頁面重新設計為 Broadcast Console 風格
  - 可拖曳調整大小的面板（react-resizable-panels v4.7）
  - 歌曲庫（搜尋、新增、刪除）
  - 歌詞列表（點擊跳轉、LIVE 標記、空白鍵播放/暫停）
  - 即時預覽面板（精確複製 Display 顯示效果）
  - 快捷設定面板（顯示行數、字體大小、主題、動畫）
- AddSongModal 對話框重新設計匹配 console 主題

#### 改善
- 移除部分 `lucide-react` 依賴，改用 inline SVG
- Controller 面板支援鍵盤操作（空白鍵、方向鍵）

---

### v0.4.0 - 2026-03-13

**Go 後端完成遷移**

#### 新增
- Go 後端完整實作（110+ Go 檔案）
  - chi Router + Ent ORM + pgx 連線池
  - REST API: Songs CRUD, Settings, Playlists, Auth, LRC 匯入/匯出
  - WebSocket Hub: 原生 WebSocket、session 分組廣播
  - JWT 認證: access token (24h) + refresh token (30d)
  - Redis session 持久化（1hr TTL）
  - bcrypt 密碼雜湊（與 Node.js bcrypt 相容）
  - 速率限制（auth: 10 req/min）
  - 結構化日誌（slog JSON）
- Go Dockerfile（多階段 alpine build，~15MB 產出）
- Demo User 機制（未認證時自動使用）

#### 移除
- Node.js API routes（`app/api/`）— 僅保留 `_errors.ts` 輔助檔
- `server.ts` Socket.IO server
- Server-only Node.js 依賴（pg, ioredis, socket.io, next-auth, bcrypt）

---

### v0.3.0 - 2026-03-12

**Supabase → 自架 PostgreSQL 遷移**

#### 新增
- Railway PostgreSQL + Redis 服務
- 自架 PostgreSQL 資料庫 schema（6 張表）
- Next.js API rewrites 代理到 Go 後端
- 原生 WebSocket 客戶端（`lib/websocket/native-client.ts`）
- JWT-based 認證取代 NextAuth/Supabase Auth
- LRC 檔案匯入/匯出功能

#### 移除
- Supabase 所有相關依賴與設定
- `@supabase/ssr`, `@supabase/supabase-js`
- Supabase Auth、RLS policy
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 環境變數

---

### v0.2.0 - 2026-03-12

**MVP 核心功能實作**

#### 新增
- 歌詞顯示頁面（Display）— 全螢幕、霓虹光效、自動滾動
- 控制頁面（Controller）— 歌曲選擇、歌詞控制
- Zustand 狀態管理（LyricsState + persist middleware）
- WebSocket 即時同步（Controller ↔ Display）
- 歌曲 CRUD API
- 顯示設定（字體、配色、行數、動畫）
- Dark Tech 設計系統（Orbitron + Exo 2 + JetBrains Mono）
- Tailwind CSS 自訂主題 + CSS 變數

---

### v0.1.0 - 2026-03-11

**專案啟動**

#### 新增
- 專案文檔結構建立（18+ 核心文檔）
- 技術棧選擇: Next.js 15 + TypeScript + Tailwind CSS
- 部署目標: Railway
- 專案骨架建立

---

## 變更類型

| 標籤 | 說明 |
|------|------|
| `新增` | 新功能 |
| `改善` | 功能改善 |
| `修復` | Bug 修復 |
| `移除` | 功能移除 |
| `安全` | 安全相關 |
| `效能` | 效能優化 |
| `文檔` | 文檔更新 |
| `breaking` | 破壞性變更 |

---

## 相關文檔

- [系統架構](spec/architecture.md)

---

**文件版本:** 2.0
**最後更新:** 2026-03-13
