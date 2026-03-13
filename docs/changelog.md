# 變更記錄

## 版本歷史

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
