# LY - 歌詞顯示系統

> 專業級即時歌詞顯示系統，支援多裝置同步、Controller/Display 雙模式、WebSocket 即時通訊

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Status: Active Development](https://img.shields.io/badge/Status-Active%20Development-brightgreen)](https://github.com)

## 專案目標

打造一個專業級的歌詞顯示系統，適用於現場演出、教會敬拜、直播活動等場景：
- Controller 端控制歌詞進度，Display 端全螢幕顯示
- 多裝置即時同步（延遲 < 100ms）
- LRC 時間戳匯入/匯出
- 可自訂顯示設定（字體、配色、行數、動畫）

## 系統架構

```
┌──────────────────────────────────┐
│       Next.js 前端 (:3000)       │
│  Controller Page │ Display Page  │
│  Zustand Store + WebSocket Client│
└──────────┬───────────┬───────────┘
           │ /api/*    │ /ws
           │ (proxy)   │ (直連)
           ▼           ▼
┌──────────────────────────────────┐
│       Go 後端 (:8080)            │
│  chi Router + Ent ORM            │
│  REST API + WebSocket Hub        │
└──────┬────────────┬──────────────┘
       │            │
       ▼            ▼
┌────────────┐ ┌─────────┐
│ PostgreSQL │ │  Redis   │
│  (資料庫)  │ │ (Session)│
└────────────┘ └─────────┘
```

## 技術棧

### 前端

| 技術 | 版本 | 用途 |
|------|------|------|
| Next.js | 15 | React 全端框架（純前端模式，API 透過 rewrites 代理到 Go） |
| React | 19 | UI 框架 |
| TypeScript | 5.7 | 型別安全 |
| Tailwind CSS | 3.4 | 樣式系統 |
| Zustand | 5.0 | 狀態管理（含 persist middleware） |
| Zod | 4.3 | 請求/回應驗證 |
| react-resizable-panels | 4.7 | Controller 面板拖曳調整 |

### 後端（Go）

| 技術 | 版本 | 用途 |
|------|------|------|
| Go | 1.26 | 伺服器語言 |
| Ent ORM | 0.14 | 型別安全 ORM + 程式碼產生 |
| chi | 5.2 | HTTP 路由器 |
| pgx | 5.8 | PostgreSQL 驅動 |
| go-redis | 9.18 | Redis 客戶端 |
| coder/websocket | 1.8 | 原生 WebSocket |
| golang-jwt | 5.3 | JWT 認證 |
| bcrypt | — | 密碼雜湊 |

### 基礎設施

| 技術 | 用途 |
|------|------|
| Railway | 雲端部署（Go 後端 + Next.js 前端 + PostgreSQL + Redis） |
| Docker | 多階段建置（Go: alpine, Next.js: node:22-alpine） |

## 核心功能

| 功能 | 說明 | 狀態 |
|------|------|------|
| **歌曲管理** | CRUD 歌曲、搜尋、歌詞管理 | ✅ 完成 |
| **播放列表** | 建立播放列表、歌曲排序 | ✅ 完成 |
| **LRC 匯入/匯出** | 標準 LRC 格式時間戳支援 | ✅ 完成 |
| **多裝置同步** | Controller ↔ Display 即時 WebSocket 同步 | ✅ 完成 |
| **Controller 控制台** | Broadcast Console 風格、可調面板、歌曲庫、即時預覽 | ✅ 完成 |
| **Display 顯示端** | 全螢幕歌詞顯示、霓虹光效、自動滾動 | ✅ 完成 |
| **顯示設定** | 字體大小/顏色、行數、主題、動畫、背景色 | ✅ 完成 |
| **JWT 認證** | 註冊/登入、Access + Refresh Token | ✅ 完成 |
| **Demo 模式** | 未登入使用 Demo User 自動存取 | ✅ 完成 |
| **AI 聽歌辨識** | 麥克風即時聽取，自動識別歌詞位置 | 🟡 規劃中 |
| **NDI/Spout 輸出** | 輸出到 Resolume Arena 等 VJ 軟體 | 🟡 規劃中 |

## 快速開始

### 環境需求

- Node.js 22+
- Go 1.26+
- PostgreSQL 15+
- Redis 7+（可選，WebSocket session 持久化）

### 安裝與啟動

```bash
# 1. 複製專案
git clone https://github.com/pxdim/ly-lyrics.git
cd ly-lyrics

# 2. 設定環境變數
cp .env.example .env.local
# 編輯 .env.local 填入 DATABASE_URL 等設定

# 3. 安裝前端依賴
npm install

# 4. 安裝 Go 後端依賴
cd backend && go mod download && cd ..

# 5. 啟動 Go 後端（port 8080）
cd backend && go run ./cmd/server &

# 6. 啟動前端開發伺服器（port 3000）
npm run dev
```

### 環境變數

```env
# === 前端 ===
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GO_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_USE_NATIVE_WS=true

# === Go 後端 ===
GO_BACKEND_URL=http://localhost:8080

# === Go 後端自身的環境變數（在 backend 目錄下設定）===
# DATABASE_URL=postgresql://user:pass@localhost:5432/ly
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=your-secret-key
# ENVIRONMENT=development
# CORS_ORIGINS=http://localhost:3000
```

## 專案結構

```
ly-lyrics/
├── app/                          # Next.js App Router
│   ├── controller/               # Controller 控制台頁面
│   │   └── page.tsx              # Broadcast Console 風格 UI
│   ├── display/                  # Display 顯示端頁面
│   │   └── page.tsx              # 全螢幕歌詞顯示
│   ├── layout.tsx                # 根佈局（Orbitron + Exo 2 + JetBrains Mono）
│   ├── page.tsx                  # 首頁（導航到 Controller/Display）
│   └── globals.css               # 全域樣式
├── components/                   # React 元件
│   ├── controller/               # Controller 專用元件
│   │   └── AddSongModal.tsx      # 新增歌曲對話框
│   ├── lyrics/                   # 歌詞顯示元件
│   │   ├── LyricsDisplay.tsx     # 主顯示元件（含可見行計算）
│   │   ├── LyricsLine.tsx        # 單行歌詞（霓虹光效）
│   │   ├── LyricsControl.tsx     # 控制按鈕
│   │   └── SongSelector.tsx      # 歌曲選擇器
│   ├── settings/                 # 設定面板
│   └── ui/                       # UI 基礎元件（Toast）
├── lib/                          # 前端核心函式庫
│   ├── api/songs.ts              # Song API 呼叫封裝
│   ├── auth/session.ts           # JWT session 管理
│   ├── websocket/                # WebSocket 客戶端
│   │   ├── native-client.ts      # 原生 WS Client（連 Go 後端）
│   │   └── types.ts              # WS 事件型別定義
│   ├── store/index.ts            # Zustand Store（全域狀態）
│   ├── schemas/index.ts          # Zod 驗證 schema
│   ├── lrc/parser.ts             # LRC 解析器（前端用）
│   └── errors/AppError.ts        # 錯誤型別定義
├── backend/                      # Go 後端
│   ├── cmd/server/main.go        # 程式入口
│   ├── internal/
│   │   ├── config/               # 環境變數配置
│   │   ├── server/               # HTTP server + chi router + middleware
│   │   ├── handler/              # HTTP handler（song, playlist, settings, auth, lrc, health, ws）
│   │   ├── service/              # 業務邏輯層（song, playlist, settings, user, lrc）
│   │   ├── auth/                 # JWT 產生/驗證 + auth middleware
│   │   ├── ws/                   # WebSocket Hub + Client + Events + Protocol
│   │   ├── redis/                # Redis 連線 + Session 持久化
│   │   ├── ent/schema/           # Ent ORM Schema（6 張表）
│   │   ├── dto/                  # API Request/Response DTO
│   │   ├── middleware/           # Rate limiter
│   │   └── validator/            # 請求驗證
│   ├── migrations/               # Atlas DB migration
│   ├── Dockerfile                # Go 多階段 Docker 建置
│   ├── Makefile
│   ├── go.mod
│   └── go.sum
├── docs/                         # 專案文檔
├── Dockerfile                    # Next.js 前端 Docker 建置
├── next.config.ts                # Next.js 設定（API rewrites 到 Go）
├── tailwind.config.ts            # Tailwind 設定
├── tsconfig.json                 # TypeScript 設定
└── package.json                  # 前端依賴
```

## 文檔索引

| 文檔 | 說明 |
|------|------|
| [系統架構](docs/spec/architecture.md) | 技術架構、資料流、組件設計 |
| [API 文檔](docs/spec/api.md) | REST API + WebSocket 事件規格 |
| [資料庫設計](docs/spec/database.md) | Ent ORM Schema、ER 圖 |
| [部署文檔](docs/deployment.md) | Railway 部署、Docker、環境變數 |
| [開發規範](docs/development.md) | 程式碼標準、Git 工作流程 |
| [用戶故事](docs/user-stories.md) | 用戶故事與完成狀態 |
| [變更記錄](docs/changelog.md) | 版本歷史 |

## 授權

MIT License - 詳見 [LICENSE](LICENSE)

---

**最後更新:** 2026-03-13
