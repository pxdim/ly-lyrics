# 進度追蹤

## 整體進度

```
總體進度: ██████████████████░░░░ 85%

Phase 1 (MVP):       ████████████████████░ 95%
Phase 2 (Resolume):  ░░░░░░░░░░░░░░░░░░░░  0%
Phase 3 (AI):        ░░░░░░░░░░░░░░░░░░░░  0%
Phase 4 (Adv):       ░░░░░░░░░░░░░░░░░░░░  0%
```

---

## 各模組進度

### 專案管理

| 模組 | 狀態 | 完成度 |
|------|------|--------|
| 專案文檔 | 🟢 完成 | 100% |
| 需求確認 | 🟢 完成 | 100% |
| 架構設計 | 🟢 完成 | 100% |

### 前端開發

| 模組 | 狀態 | 完成度 |
|------|------|--------|
| 專案建置 | 🟢 完成 | 100% |
| 基礎佈局 | 🟢 完成 | 100% |
| 歌詞顯示組件 (LyricsDisplay, LyricsLine, LyricsControl) | 🟢 完成 | 100% |
| Controller 控制台 (Broadcast Console + 可拖曳面板) | 🟢 完成 | 100% |
| Display 顯示端 (全螢幕、霓虹光效、自動滾動) | 🟢 完成 | 100% |
| 歌曲管理介面 (新增、搜尋、刪除) | 🟢 完成 | 100% |
| 播放列表介面 (CRUD + 歌曲選擇 + 重命名) | 🟢 完成 | 100% |
| QR Code 分享 (RWD 三級：桌面側欄/平板 Popover/手機 Modal) | 🟢 完成 | 100% |
| 斷線重連 UI (ConnectionStatusBar + ConnectionIndicator) | 🟢 完成 | 100% |
| 全螢幕模式 (F 鍵快捷鍵 + 自動隱藏控制列 + Safari 相容) | 🟢 完成 | 100% |
| Zustand Store (含 persist + WebSocket 整合) | 🟢 完成 | 100% |
| 原生 WebSocket Client (重連、rejoin、事件) | 🟢 完成 | 100% |
| 響應式設計 | 🟡 進行中 | 70% |
| 前端單元測試 | 🔴 未開始 | 0% |

### 後端開發（Go）

| 模組 | 狀態 | 完成度 |
|------|------|--------|
| REST API (Songs/Playlists/Settings/Auth/LRC/Health) | 🟢 完成 | 100% |
| Ent ORM Schema (6 張表) | 🟢 完成 | 100% |
| WebSocket Hub (session 分組、事件廣播) | 🟢 完成 | 100% |
| JWT 認證 (access 24h + refresh 30d) | 🟢 完成 | 100% |
| Redis Session 持久化 (1hr TTL) | 🟢 完成 | 100% |
| 速率限制 (auth: 10 req/min) | 🟢 完成 | 100% |
| 結構化日誌 (slog JSON) | 🟢 完成 | 100% |
| 後端測試 (handler, ws, middleware, validator, service/lrc) | 🟡 部分 | 60% |

### 整合功能

| 模組 | 狀態 | 完成度 |
|------|------|--------|
| NDI 輸出 | ⚪ 未開始 | 0% |
| Spout 輸出 | ⚪ 未開始 | 0% |
| Gemini API 整合 | ⚪ 未開始 | 0% |
| 音訊處理 | ⚪ 未開始 | 0% |
| 歌詞比對 | ⚪ 未開始 | 0% |

### 測試

| 模組 | 狀態 | 完成度 |
|------|------|--------|
| Go 後端測試 | 🟡 部分 | 60% |
| 前端單元測試 | ⚪ 未開始 | 0% |
| E2E 測試 | ⚪ 未開始 | 0% |

### DevOps

| 模組 | 狀態 | 完成度 |
|------|------|--------|
| CI/CD (GitHub Actions) | 🟢 完成 | 100% |
| GitHub Repository | 🟢 完成 | 100% |
| Railway 部署 (Go + Next.js + PG + Redis) | 🟢 完成 | 100% |
| Docker 多階段建置 | 🟢 完成 | 100% |
| Husky Hooks | 🟢 完成 | 100% |

---

## 技術棧確認

| 類別 | 技術 | 版本 | 狀態 |
|------|------|------|------|
| Frontend Framework | Next.js | 15.1.0 | ✅ |
| UI Framework | React | 19.0.0 | ✅ |
| Language (FE) | TypeScript | 5.7.0 | ✅ |
| Styling | Tailwind CSS | 3.4.19 | ✅ |
| State | Zustand | 5.0.11 | ✅ |
| Validation | Zod | 4.3 | ✅ |
| Panels | react-resizable-panels | 4.7.2 | ✅ |
| QR Code | qrcode.react | 4.2.0 | ✅ |
| Backend Language | Go | 1.26.1 | ✅ |
| ORM | Ent | 0.14.5 | ✅ |
| HTTP Router | chi | 5.2.5 | ✅ |
| DB Driver | pgx | 5.8.0 | ✅ |
| Redis | go-redis | 9.18.0 | ✅ |
| WebSocket | coder/websocket | 1.8.14 | ✅ |
| JWT | golang-jwt | 5.3.1 | ✅ |

**歷史變更：**
- ~~Supabase~~ → 自架 PostgreSQL + Go 後端 (2026-03-12)
- ~~Socket.IO~~ → 原生 WebSocket (2026-03-12)
- ~~tRPC~~ → REST API (2026-03-12)
- ~~NextAuth~~ → JWT 認證 (2026-03-12)
- Tailwind 4.0+ → 3.4.19 (相容性降級)

---

## 已知問題與技術債

### 待修復
- [ ] Go WebSocket `handleNextLine` 缺少 lineIndex 上界檢查
- [ ] Go DB 連線池未配置 (MaxOpenConns/MaxIdleConns)
- [ ] Go Rate Limiter 使用 RemoteAddr 而非 X-Forwarded-For（反向代理場景）

### 待補齊測試
- [ ] Go service/song, service/playlist, service/settings 無測試
- [ ] Go redis/ 無測試
- [ ] 前端 vitest 零測試

---

## 相關文檔

- [變更記錄](changelog.md)
- [系統架構](spec/architecture.md)
- [Roadmap](ROADMAP.md)

---

**最後更新:** 2026-03-13
