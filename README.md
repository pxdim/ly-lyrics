# LY - 歌詞顯示系統

> 市場首創的 AI 驅動歌詞顯示系統，支援即時聽歌辨識、多裝置同步、NDI 輸出到 VJ 軟體

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Status: In Planning](https://img.shields.io/badge/Status-Planning%20%F0%9F%93%8B-yellow)](https://github.com)

## 🎯 專案目標

打造一個專業級的歌詞顯示系統，解決市場現有產品的痛點：
- ❌ 缺少簡單易用的雙螢幕歌詞同步工具
- ❌ 現有產品功能過於複雜或價格昂貴
- ❌ 缺少 AI 聽歌辨識功能
- ❌ 無法直接輸出到專業 VJ 軟體

## ✨ 核心功能

| 功能 | 說明 | 狀態 |
|------|------|------|
| **AI 聽歌辨識** | 麥克風即時聽取音樂，自動識別歌詞位置 | 🟡 規劃中 |
| **NDI/Spout 輸出** | 直接輸出到 Resolume Arena 等VJ軟體 | 🟡 規劃中 |
| **多裝置同步** | 電腦、平板、手機即時同步歌詞進度 | 🟡 規劃中 |
| **控制/顯示模式** | 彈性切換控制端與顯示端 | 🟡 規劃中 |
| **歌詞管理** | 歌曲資料庫、播放列表、LRC 時間戳支援 | 🟡 規劃中 |
| **視覺效果** | 自訂行數、焦點高亮、自動滾動、主題切換 | 🟡 規劃中 |

## 🛠 技術棧

```
Frontend:  Next.js 15 (App Router) + TypeScript + Tailwind CSS
Backend:   Next.js API Routes + tRPC + WebSocket
Database:  Supabase (PostgreSQL)
AI:        Google Gemini API
Deployment: Railway
CDN:       Cloudflare Workers (可選)
NDI:       NDI.js / Spout
```

## 📚 文檔

完整專案文檔請參考 [docs/](docs/) 目錄：

| 文檔 | 說明 |
|------|------|
| [專案概述](docs/project-info.md) | 專案介紹、範圍、狀態 |
| [需求文檔](docs/requirements.md) | 功能/非功能需求 |
| [用戶故事](docs/user-stories.md) | 用戶故事與驗收標準 |
| [系統架構](docs/spec/architecture.md) | 技術架構設計 |
| [API 文檔](docs/spec/api.md) | API 端點規格 |
| [資料庫設計](docs/spec/database.md) | 資料模型與 Schema |
| [測試計劃](docs/testing.md) | 測試策略與測試案例 |
| [部署文檔](docs/deployment.md) | 部署環境與 CI/CD |
| [開發規範](docs/development.md) | 程式碼標準與 Git 工作流程 |
| [UI/UX 設計](docs/design.md) | 設計系統 |
| [使用手冊](docs/user-manual.md) | 快速開始與 FAQ |
| [里程碑](docs/milestones.md) | 專案階段與交付物 |
| [時程安排](docs/schedule.md) | 工作時間軸 |
| [進度追蹤](docs/progress.md) | 當前進度狀態 |
| [工作日誌](docs/work-log.md) | 時間戳工作記錄 |
| [變更記錄](docs/changelog.md) | 版本歷史 |
| [風險管理](docs/risks.md) | 風險識別與緩解 |
| [授權資訊](docs/licenses.md) | 授權與第三方套件 |
| [安全檢查清單](docs/security.md) | 安全檢查項目 |
| [會議記錄](docs/meetings.md) | 會議記錄與行動項目 |

## 🚀 快速開始

### 環境需求

- Node.js 18+
- pnpm 或 npm
- Supabase 帳號
- Railway 帳號
- Google Gemini API Key

### 安裝

```bash
# 安裝依賴
pnpm install

# 設定環境變數
cp .env.example .env.local

# 執行開發伺服器
pnpm dev
```

### 環境變數

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API
GOOGLE_API_KEY=your_google_api_key

# Railway (自動設定)
RAILWAY_PUBLIC_URL=your_railway_url
```

## 📅 開發階段

| 階段 | 內容 | 預估時間 | 狀態 |
|------|------|---------|------|
| Phase 1 | MVP 核心功能 | 2-3 週 | 🟡 規劃中 |
| Phase 2 | Resolume 整合 | 1-2 週 | ⚪ 未開始 |
| Phase 3 | AI 聽歌辨識 | 2-3 週 | ⚪ 未開始 |
| Phase 4 | 進階功能 | 持續 | ⚪ 未開始 |

## 🤝 參與貢獻

歡迎貢獻！請參考 [開發規範](docs/development.md)。

## 📄 授權

MIT License - 詳見 [LICENSE](LICENSE)

---

**建置狀態:** 🟡 規劃中 | **最後更新:** 2026-03-11
