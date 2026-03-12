# LY 專案 Multi-Agent 開發規劃

## 專案概述

**專案名稱**: LY - 歌詞顯示系統
**開發模式**: Multi-Agent Development (MAD)
**專案經理**: Raymond Chen
**預計工期**: 12 週 (2026-03-18 ~ 2026-06-01)
**團隊規模**: 10 個專業 AI Agent 同時開發

---

## 一、Agent 角色分配

### 核心團隊架構

```
┌─────────────────────────────────────────────────────────────┐
│                        Team Lead                             │
│                    (Project Manager)                         │
│  職責: 任務分發、進度追蹤、衝突解決、最終決策                   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Architecture │    │ UI/UX Design │    │  Technical   │
│    Team      │    │     Team     │    │   Writer     │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Frontend    │    │   Backend    │    │     DBA      │
│   Developer  │    │  Developer   │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   DevOps/    │    │     QA/      │    │   (Optional)  │
│     SRE      │    │   Test       │    │   Specialist  │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Agent 角色定義與技術配置

| Role | 名稱 | 專業技能 | 專案技術棧 | 主要職責 |
|------|------|---------|-----------|---------|
| **PM** | Product Manager | 需求分析、PRD 撰寫、用戶故事 | - | 需求確認、優先級排序 |
| **TL** | Team Lead | 專案管理、任務分配、衝突解決 | - | 進度追蹤、協調溝通 |
| **TW** | Technical Writer | 文檔管理、進度記錄 | Markdown | 實時更新文檔 |
| **ARCH** | Architect | 系統架構、API 設計 | Next.js 15, TypeScript, WebSocket | 技術決策、架構設計 |
| **UI/UX** | UI/UX Designer | UX 設計、互動設計 | Tailwind CSS 4.0+, Framer Motion | UI 設計、使用者流程 |
| **FE** | Frontend Developer | 組件開發、狀態管理 | React 19, Zustand, TypeScript | 前端組件實作 |
| **BE** | Backend Developer | API 開發、業務邏輯 | Node.js, tRPC, Zod | 後端 API 開發 |
| **DBA** | Database Administrator | 資料建模、優化 | PostgreSQL, Supabase | 資料庫設計與優化 |
| **DEVOPS** | DevOps/SRE | CI/CD、部署、監控 | Railway, Docker | 部署與監控 |
| **QA** | QA/Test Engineer | 測試規劃、自動化 | Vitest, Playwright | 測試計劃與執行 |

---

## 二、溝通協議

### 2.1 通訊頻道

```yaml
#announcements:           # 全體成員
  - 重大里程碑公告
  - 架構變更通知
  - 緊急問題處理

#architecture:            # ARCH, TL (全員可見)
  - 技術架構討論
  - API 規格確認
  - 技術決策記錄

#design:                  # UI/UX, FE (全員可見)
  - UI/UX 設計討論
  - 組件設計確認
  - 動畫效果規格

#api:                     # BE, FE, DBA (全員可見)
  - API 端點規格
  - 資料格式確認
  - 整合問題討論

#database:                # DBA, BE (全員可見)
  - 資料庫 Schema
  - 查詢優化
  - 遷移腳本

#general:                 # 全體成員
  - 一般討論
  - 問題諮詢
  - 經驗分享
```

### 2.2 私人通訊 (1-on-1)

```
FE ↔ UI/UX:    設計實作細節、組件規格
FE ↔ BE:       API 整合、資料格式
BE ↔ DBA:      資料結構設計、查詢優化
DEVOPS ↔ All:  部署需求、環境設定
QA ↔ All:      Bug 報告、測試結果
```

### 2.3 通訊格式

#### Broadcast (One-to-Many)

```markdown
📢 [Broadcast] From: Team Lead
Subject: Phase 1 開發啟動
Time: 2026-03-18 09:00
Priority: 🔴 High

Content:
- Phase 1 MVP 開發正式啟動
- 所有 Agent 請確認任務分配
- 架構設計文檔已更新至 docs/spec/architecture.md
- 第一週目標: 專案建置 + 基礎組件

Action Items:
- [ ] ARCH: 確認最終架構設計 (今日)
- [ ] FE/BE: 設定開發環境 (今日)
- [ ] UI/UX: 提交首版設計稿 (2日內)
```

#### Directed (One-to-One)

```markdown
📨 [Directed] From: UI/UX Designer → To: Frontend Developer
Subject: 歌詞顯示組件設計交付
Priority: 🟠 High
ETA: 2026-03-20 18:00

Content:
- Figma 設計稿連結: [連結]
- 組件規格:
  * LyricsDisplay 組件
  * 支持 1-10 行動態顯示
  * 當前行高亮效果
  * 自動滾動動畫 (Framer Motion)

需要確認:
- 動畫效果性能可接受?
- 響應式斷點是否足夠?
```

#### Status Update (Push)

```markdown
✅ [Status Update] Role: Frontend Developer
Task: LyricsDisplay 基礎組件
Status: ✅ Complete
Completed: 2026-03-20 16:30

Deliverables:
- Files:
  * app/(display)/page.tsx
  * components/lyrics/LyricsDisplay.tsx
  * components/lyrics/LyricsLine.tsx
- Tests: components/lyrics/__tests__/LyricsDisplay.test.tsx
- Coverage: 92%

Technical Details:
- React 19 Server Components
- Tailwind CSS 4.0 styling
- Framer Motion 動畫
- Zustand state integration

Doc Updated: docs/roles/frontend-progress.md
Next: Waiting for Backend WebSocket API
Blocking: None
```

---

## 三、開發階段規劃

### Phase 1: MVP 核心功能 (2026-03-18 ~ 2026-04-08)

#### 週次分解

**Week 1: 專案建置與基礎架構**
```
Day 1-2 (Mon-Tue):
├── ARCH: 最終架構設計確認
├── DEVOPS: Railway 專案設定、CI/CD 建置
├── DBA: Supabase Schema 建立
├── FE: Next.js 專案初始化
└── BE: tRPC 設定、基礎 API 結構

Day 3-4 (Wed-Thu):
├── UI/UX: 首版設計稿 (控制端、顯示端)
├── FE: 基礎佈局組件
├── BE: 資料庫操作層實作
└── TW: 建立 docs/roles/ 進度追蹤文檔

Day 5 (Fri):
├── TL: 進度檢視會議
├── QA: 測試環境驗證
└── All: 週報與問題匯總
```

**Week 2-3: 核心功能開發**
```
Frontend (FE + UI/UX 協作):
├── 歌詞顯示組件 (LyricsDisplay)
├── 控制面板組件 (LyricsControls)
├── 歌詞管理介面 (SongEditor)
└── 播放列表介面 (PlaylistView)

Backend (BE + DBA 協作):
├── 歌曲 CRUD API
├── 播放列表 API
├── WebSocket 伺服器
└── 認證授權

QA (同步進行):
├── 單元測試框架設定
├── API 測試撰寫
└── 組件測試撰寫
```

**Week 4: 整合與測試**
```
Integration:
├── FE + BE: API 整合
├── FE + BE: WebSocket 整合
├── All: 端到端測試
└── Bug 修復

Documentation:
├── API 文檔完善
├── 使用者文檔撰寫
└── 部署指南
```

### Phase 2: Resolume 整合 (2026-04-09 ~ 2026-04-22)

```
Week 5-6:
├── FE: NDI 輸出頁面
├── FE: 透明背景實作
├── DEVOPS: NDI.js 整合測試
└── QA: Resolume 整合測試
```

### Phase 3: AI 聽歌辨識 (2026-04-23 ~ 2026-05-13)

```
Week 7-10:
├── BE: Gemini API 整合
├── BE: 音訊處理服務
├── BE: 歌詞比對演算法
├── FE: 麥克風錄音 UI
├── FE: AI 控制面板
└── QA: 準確率與效能測試
```

### Phase 4: 進階功能與上線 (2026-05-14 ~ 2026-06-01)

```
Week 11-12:
├── All: LRC 時間戳支援
├── All: 搜索功能
├── All: 多國語言支援
├── DEVOPS: 生產環境部署
└── QA: 完整測試與驗收
```

---

## 四、任務分解矩陣

### 4.1 Phase 1 任務分配

| Task ID | 任務名稱 | 負責 Agent | 依賴 | 預估工時 | 優先級 |
|---------|---------|-----------|------|---------|--------|
| P1-ARCH-01 | 最終架構設計確認 | ARCH | - | 4h | 🔴 |
| P1-DEVOPS-01 | Railway 專案設定 | DEVOPS | P1-ARCH-01 | 2h | 🔴 |
| P1-DEVOPS-02 | CI/CD 建置 | DEVOPS | P1-DEVOPS-01 | 4h | 🔴 |
| P1-DBA-01 | Supabase Schema 建立 | DBA | P1-ARCH-01 | 4h | 🔴 |
| P1-FE-01 | Next.js 專案初始化 | FE | P1-ARCH-01 | 2h | 🔴 |
| P1-BE-01 | tRPC 設定 | BE | P1-FE-01 | 3h | 🔴 |
| P1-UIUX-01 | 首版設計稿 | UI/UX | P1-ARCH-01 | 8h | 🔴 |
| P1-FE-02 | 基礎佈局組件 | FE | P1-UIUX-01 | 8h | 🔴 |
| P1-BE-02 | 資料庫操作層 | BE | P1-DBA-01 | 8h | 🔴 |
| P1-FE-03 | LyricsDisplay 組件 | FE | P1-FE-02, P1-UIUX-01 | 12h | 🔴 |
| P1-FE-04 | LyricsControls 組件 | FE | P1-FE-02, P1-UIUX-01 | 12h | 🔴 |
| P1-FE-05 | SongEditor 組件 | FE | P1-FE-02, P1-UIUX-01 | 8h | 🟠 |
| P1-BE-03 | 歌曲 CRUD API | BE | P1-BE-02 | 8h | 🔴 |
| P1-BE-04 | 播放列表 API | BE | P1-BE-02 | 6h | 🟠 |
| P1-BE-05 | WebSocket 伺服器 | BE | P1-BE-03 | 12h | 🔴 |
| P1-BE-06 | 認證授權 | BE | P1-BE-02 | 4h | 🟠 |
| P1-QA-01 | 測試框架設定 | QA | P1-FE-01, P1-BE-01 | 4h | 🔴 |
| P1-QA-02 | API 測試 | QA | P1-BE-03 | 6h | 🔴 |
| P1-QA-03 | 組件測試 | QA | P1-FE-03, P1-FE-04 | 8h | 🔴 |
| P1-QA-04 | 整合測試 | QA | P1-BE-05, P1-FE-03 | 8h | 🔴 |
| P1-TW-01 | 進度文檔建置 | TW | - | 2h | 🔴 |
| P1-TW-02 | API 文檔 | TW | P1-BE-03 | 4h | 🟠 |

### 4.2 並行開發策略

```
┌─────────────────────────────────────────────────────────────┐
│                    Week 2-3 並行開發圖                       │
└─────────────────────────────────────────────────────────────┘

Stream A (Frontend Focus):          Stream B (Backend Focus):
├── FE: LyricsDisplay 組件           ├── BE: 歌曲 CRUD API
├── FE: LyricsControls 組件          ├── BE: 播放列表 API
├── UI/UX: 設計支援                  ├── DBA: 資料庫優化
└── QA: 前端測試                      └── QA: API 測試

Stream C (Infrastructure):
├── DEVOPS: CI/CD 優化
├── ARCH: 技術問題支援
└── TW: 文檔同步更新

Stream D (Integration):
├── BE: WebSocket 伺服器 (等待 Stream B 完成)
└── FE: WebSocket 客戶端整合 (等待 Stream A 完成)
```

---

## 五、文檔架構

### 5.1 角色進度文檔結構

```
docs/
├── roles/
│   ├── README.md                    # 角色文檔說明
│   ├── pm-progress.md               # PM 進度
│   ├── teamlead-progress.md         # Team Lead 進度
│   ├── techwriter-progress.md       # Technical Writer 進度
│   ├── architect-progress.md        # Architect 進度
│   ├── uiux-progress.md             # UI/UX Designer 進度
│   ├── frontend-progress.md         # Frontend Developer 進度
│   ├── backend-progress.md          # Backend Developer 進度
│   ├── dba-progress.md              # DBA 進度
│   ├── devops-progress.md           # DevOps 進度
│   └── qa-progress.md               # QA 進度
│
├── meetings/
│   ├── daily-standup/
│   │   ├── 2026-03-18.md
│   │   ├── 2026-03-19.md
│   │   └── ...
│   └── milestone-reviews/
│       ├── phase1-complete.md
│       └── ...
│
└── design/
    ├── decisions/                   # ADR (Architecture Decision Records)
    │   ├── 001-choose-nextjs.md
    │   ├── 002-choose-trpc.md
    │   ├── 003-choose-zustand.md
    │   └── ...
    ├── ui-design.md                 # UI 設計規範
    └── database-schema.md           # 資料庫 Schema 設計
```

### 5.2 進度文檔模板

```markdown
# [Role] Progress Report

**Role:** [角色名稱]
**Agent ID:** [Agent ID]
**Update Time:** [更新時間]

## 當前狀態

| Phase | 任務 | 狀態 | 完成度 |
|-------|------|------|--------|
| Phase 1 | [任務名稱] | 🟡 進行中 | 50% |

## 已完成任務

### [Task ID] - [任務名稱]
- **完成時間:** [日期]
- **交付物:**
  - [文件列表]
- **測試狀態:** ✅ 通過 / ⚠️ 部分通過
- **相關文檔:** [連結]

## 進行中任務

### [Task ID] - [任務名稱]
- **預計完成:** [日期]
- **目前進度:** [描述]
- **遇到問題:** [如有]
- **需要協助:** [如有]

## 待辦任務

### [Task ID] - [任務名稱]
- **優先級:** 🔴🟠🟡🟢
- **預計開始:** [日期]
- **依賴:** [其他任務]

## 技術債務與改進

- [技術債務記錄]
- [改進建議]

## 下週計劃

- [ ] [待辦事項 1]
- [ ] [待辦事項 2]

## 溝通記錄

### [日期] - [主題]
- **參與者:** [角色]
- **討論內容:** [摘要]
- **結論:** [決定]
```

---

## 六、同步機制

### 6.1 每日站會 (Daily Standup)

```yaml
時間: 每日 09:00 (15 分鐘)
參與者: All Agents
格式: 📢 Broadcast

議程:
  1. 昨日完成 (2 min/人)
  2. 今日計劃 (2 min/人)
  3. 遇到阻礙 (1 min/人)
  4. 需要協調 (5 min 總討論)

輸出: docs/meetings/daily-standup/YYYY-MM-DD.md
```

### 6.2 週進度審查

```yaml
時間: 每週五 16:00 (30 分鐘)
參與者: All Agents
格式: 會議記錄

議程:
  1. 本週完成項目
  2. 未完成項目與原因
  3. 下週計劃確認
  4. 風險識別與緩解

輸出: docs/meetings/weekly-review/YYYY-MM-DD.md
```

### 6.3 里程碑審查

```yaml
時間: 每個 Phase 結束時 (1 小時)
參與者: All Agents
格式: 里程碑報告

議程:
  1. Phase 目標達成檢視
  2. 交付物驗收
  3. 問題與經驗總結
  4. 下一 Phase 規劃調整

輸出: docs/meetings/milestone-reviews/phase[N]-complete.md
```

---

## 七、衝突解決協議

### 7.1 衝突分級

```yaml
🔴 P0 - 阻塞性問題:
  定義: 阻礙開發進行，無法繼續
  響應時間: 2 小時內
  解決者: TL → ARCH → TL 決策

🟠 P1 - 高優先級問題:
  定義: 影響功能實作，但有替代方案
  響應時間: 24 小時內
  解決者: 相關角色協商 → ARCH 評估

🟡 P2 - 中優先級問題:
  定義: 改進性建議或非關鍵問題
  響應時間: 3 天內
  解決者: 相關角色自行協商
```

### 7.2 衝突解決流程

```
┌─────────────────────────────────────────────────────────────┐
│                      衝突發生                                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌───────────────┐                   ┌───────────────┐
│ 直接溝通解決   │                   │ 無法解決       │
│ (相關角色)     │                   │ 升級處理       │
└───────────────┘                   └───────┬───────┘
        │                                   │
        │                                   ▼
        │                          ┌───────────────┐
        │                          │ ARCH 評估     │
        │                          │ (技術問題)     │
        │                          └───────┬───────┘
        │                                   │
        │                          ┌────────┴────────┐
        │                          ▼                 ▼
        │                   ┌───────────┐    ┌───────────┐
        │                   │ TL 最終   │    │ 記錄 ADR  │
        │                   │ 決策      │    │ (持不同意見)│
        │                   └───────────┘    └───────────┘
        │                          │
        └──────────────────────────┴────────────┐
                                           │
                                           ▼
                                    ┌───────────────┐
                                    │ 全體遵循決策   │
                                    └───────────────┘
```

---

## 八、交付物驗收標準

### 8.1 程式碼品質

```yaml
TypeScript:
  - strict mode 啟用
  - 100% type coverage
  - 無 any 型別 (除非有註解說明)

Testing:
  - 單元測試覆蓋率 > 80%
  - 關鍵路徑 E2E 測試
  - 測試命名清晰 (should/when 格式)

Code Review:
  - 所有 PR 需要至少 1 個審查
  - CI 檢查通過 (lint, test, type-check)
  - 無合併衝突
```

### 8.2 文檔完整性

```yaml
Code Documentation:
  - 複雜函數需要 JSDoc
  - 公開 API 需要完整文檔
  - README.md 說明用途與使用方式

Project Documentation:
  - 角色進度文檔每日更新
  - 技術決策有 ADR 記錄
  - API 變更有 Changelog
```

### 8.3 功能驗收

```yaml
MVP Phase 1:
  - 歌曲 CRUD 功能完整
  - WebSocket 同步延遲 < 100ms
  - 支援 3 種裝置尺寸 (Desktop, Tablet, Mobile)
  - 深色/淺色主題切換

Phase 2:
  - NDI 輸出正常
  - 在 Resolume Arena 中成功顯示
  - 透明背景正常運作

Phase 3:
  - AI 辨識準確率 > 85%
  - 辨識回應時間 < 1s
  - 支援中英文歌詞
```

---

## 九、工具與環境

### 9.1 開發工具

```yaml
版本控制:
  - Git + GitHub
  - 分支策略: feature/*, bugfix/*, hotfix/*
  - PR template 必填

IDE:
  - VS Code (推薦)
  - 統一使用 .editorconfig
  - 統一 extension (ESLint, Prettier)

通訊:
  - Claude Code 內建 SendMessage
  - 文檔同步更新
```

### 9.2 CI/CD Pipeline

```yaml
On Pull Request:
  - lint: ESLint + Prettier check
  - type-check: tsc --noEmit
  - test: vitest run
  - build: next build

On Main Branch:
  - 所有 PR 檢查通過後
  - 自動部署到 Railway (preview)
  - 標記版本後部署到 production
```

---

## 十、啟動清單

### 10.1 開發前準備

```yaml
Day 0 (2026-03-17):
  [ ] TL: 創建 Team (TeamCreate)
  [ ] TL: 發送啟動通知 (Broadcast)
  [ ] TW: 建立 docs/roles/ 結構
  [ ] ARCH: 確認最終架構文檔

Day 1 (2026-03-18):
  [ ] All: 第一次 Daily Standup
  [ ] All: 確認任務分配
  [ ] DEVOPS: Railway 專案設定
  [ ] FE: Next.js 專案初始化
  [ ] BE: tRPC 設定
```

### 10.2 角色啟動任務

```yaml
PM (Product Manager):
  - [ ] 確認 Phase 1 需求優先級
  - [ ] 更新 requirements.md 狀態

Team Lead:
  - [ ] 創建 Agent Team
  - [ ] 發送啟動 Broadcast
  - [ ] 建立進度追蹤機制

Technical Writer:
  - [ ] 建立 docs/roles/ 模板
  - [ ] 設定每日進度更新格式

Architect:
  - [ ] 確認架構設計無衝突
  - [ ] 準備 ADR-001 模板

UI/UX Designer:
  - [ ] 準備設計系統
  - [ ] 規劃首版設計稿交付

Frontend Developer:
  - [ ] 設定本地開發環境
  - [ ] 初始化 Next.js 專案

Backend Developer:
  - [ ] 設定本地開發環境
  - [ ] 初始化 tRPC 結構

DBA:
  - [ ] 確認 Supabase Schema
  - [ ] 準備遷移腳本

DevOps/SRE:
  - [ ] Railway 專案建立
  - [ ] CI/CD pipeline 設定

QA/Test Engineer:
  - [ ] 測試框架規劃
  - [ ] 測試環境需求確認
```

---

## 十一、成功指標

### 11.1 專案指標

```yaml
開發效率:
  - Phase 1 按時完成 (2026-04-08)
  - 每週交付可演示功能
  - 程式碼審查週轉 < 1 天

品質指標:
  - 測試覆蓋率 > 80%
  - 無 P0/P1 bug 進入下一 Phase
  - TypeScript strict mode 無錯誤

協作效率:
  - 文檔即時更新率 > 95%
  - 溝通延遲 < 2 小時 (優先級問題)
  - 衝突在 24 小時內解決
```

### 11.2 技術指標

```yaml
效能:
  - 同步延遲 < 100ms
  - 頁面載入 < 2s
  - NDI 輸出延遲 < 50ms
  - AI 辨識回應 < 1s

可用性:
  - 支援 Chrome, Safari, Edge 最新版
  - 支援 Desktop, Tablet, Mobile
  - 同時連線 10+ 裝置
```

---

## 十二、風險管理

### 12.1 已識別風險

| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|---------|
| NDI 瀏覽器支援有限 | 高 | 中 | 提前 POC 驗證 |
| AI 辨識延遲過高 | 中 | 中 | 預處理索引優化 |
| WebSocket 連線不穩 | 中 | 低 | 實作自動重連 |
| 多 Agent 溝通混亂 | 高 | 中 | 嚴格遵循通訊協議 |

### 12.2 應急預案

```yaml
技術障礙:
  - 立即廣播問題
  - ARCH 4 小時內評估替代方案
  - TL 決策方向調整

時程延遲:
  - 評估延遲影響範圍
  - 調整後續里程碑
  - 增加並行開發力度

品質問題:
  - 暫停新功能開發
  - 集中資源修復
  - QA 全面回歸測試
```

---

## 相關文檔

- [專案概述](../project-info.md)
- [需求文檔](../requirements.md)
- [系統架構](../spec/architecture.md)
- [時程安排](../schedule.md)
- [里程碑](../milestones.md)

---

**文件版本:** 1.0
**建立日期:** 2026-03-12
**建立者:** Raymond Chen (Project Manager)
**審核者:** 待審核
