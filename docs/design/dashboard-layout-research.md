# LY 控制台自由佈局調研報告

**調研日期**：2026-03-19
**調研者**：UX Researcher Agent
**目標**：為 LY 歌詞控制台設計可自由拖曳佈局的技術方案與設計規範

---

## 目錄

1. [現狀分析](#1-現狀分析)
2. [佈局模式分類](#2-佈局模式分類)
3. [產品調研](#3-產品調研)
4. [技術方案對比](#4-技術方案對比)
5. [最佳實踐](#5-最佳實踐)
6. [推薦方案](#6-推薦方案)
7. [設計規範](#7-設計規範)
8. [預設佈局建議](#8-預設佈局建議)
9. [RWD 策略](#9-rwd-策略)
10. [實作路線圖](#10-實作路線圖)

---

## 1. 現狀分析

### 1.1 現有架構

LY 控制台目前使用 `react-resizable-panels` (v4.7.2) 實作三欄式佈局：

```
桌面版 (>=1280px)：
┌──────────┬────────────────────┬──────────────────┐
│ StatusBar (full width, h-12)                      │
├──────────┼────────────────────┼──────────────────┤
│ Songs    │                    │ LivePreview      │
│ Library  │     CueGrid        │ (16:9 preview)   │
│ 20%      │     45%            ├──────────────────┤
│          │                    │ AiTracking       │
│          │                    │ + QuickSettings  │
│          │                    │ 55%              │
└──────────┴────────────────────┴──────────────────┘

平板版 (768px-1279px)：固定 2/5 + 3/5 雙欄
手機版 (<768px)：Tab 分頁（歌曲/歌詞/設定）+ 底部 MobileTabBar
```

### 1.2 現有面板清單

| # | 面板名稱 | 元件 | 最小合理寬度 | 最小合理高度 | 使用頻率 |
|---|---------|------|-------------|-------------|---------|
| 1 | 歌曲庫 (Songs + Playlists) | `LibraryPanel` | 240px | 300px | 高 — 選歌 |
| 2 | 歌詞 Cue Grid | `CueGrid` | 320px | 400px | 極高 — 核心操作 |
| 3 | 即時預覽 | `LivePreview` | 280px | 200px | 高 — 確認輸出 |
| 4 | 快速設定 | `QuickSettings` | 240px | 200px | 中 — 調整參數 |
| 5 | AI 聽歌追蹤 | `AiTrackingPanel` | 240px | 120px | 低-中 — 可折疊 |
| 6 | QR Code | `QRCodePanel` | 180px | 200px | 低 — 初始連線 |
| 7 | Transport 控制 | (內嵌於 CueGrid) | N/A | 60px | 極高 — 持續操作 |
| 8 | 狀態列 | `StatusBar` | full width | 48px | 常駐 |

### 1.3 現有問題

1. **佈局固定**：三欄比例可調（`react-resizable-panels`），但面板位置不可互換
2. **面板不可隱藏**：無法隱藏不需要的面板（如 AI Tracking）釋放空間
3. **無預設模板**：不同使用情境（排練 vs 正式演出）只能手動調整
4. **右欄過載**：LivePreview + AiTracking + QuickSettings 擠在 35% 寬度

---

## 2. 佈局模式分類

經調研 18 款產品，歸納出五種主流自由佈局模式：

### 模式 A：Grid Snap 模式

**代表**：Grafana、Home Assistant、Monday.com、Jira Dashboard

```
┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐  12 欄 Grid
│ Panel A (4 cols)│ Panel B │  面板吸附到 grid 交叉點
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤  自動 compact 填滿空隙
│ Panel C (full width)      │  resize 以 grid 為單位
└─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘
```

**特點**：
- 面板位置/尺寸以 grid 單位量化（如 12 欄 x N 行）
- 拖曳時自動吸附到最近的 grid 位置
- 支援 vertical / horizontal / free-form compaction
- 面板之間有固定間距（gutter）

**適用場景**：監控面板、數據 Dashboard、卡片式管理介面

### 模式 B：Split Pane / Resizable Panel 模式

**代表**：VS Code、react-resizable-panels（LY 現用）

```
┌──────┬──────────────────┬──────────┐
│      │                  │          │
│      ├────── Separator ─┤          │  面板以百分比分配空間
│ 20%  │      50%         │   30%    │  只能調整分隔線位置
│      │                  │          │  面板順序固定
│      │                  │          │
└──────┴──────────────────┴──────────┘
```

**特點**：
- 面板以百分比或像素分配容器空間
- 只有分隔線（separator）可拖曳，面板本身不移動
- 支援巢狀（水平 Group 內嵌垂直 Group）
- 簡單直覺，無需記憶複雜操作

**適用場景**：IDE、文字編輯器、簡單三欄佈局

### 模式 C：Dock / Tab System 模式

**代表**：OBS Studio、DaVinci Resolve、FlexLayout、Golden Layout

```
┌──────────────────────────────────────┐
│ [Tab A] [Tab B]        ┌─ Floating ─┐│
├──────┬─────────────────│ Panel F     ││
│      │ [Tab C] [Tab D] │             ││
│ Dock │                 └─────────────┘│
│ Left │                  │ Dock Bottom │
│      │                  │ [Tab E]     │
└──────┴──────────────────┴─────────────┘
```

**特點**：
- 面板可 dock 到容器邊緣或彼此內部形成 tab group
- 面板可 undock 成浮動視窗（floating window）
- 支援 popout 到獨立瀏覽器視窗（golden-layout、FlexLayout）
- 拖曳時顯示 drop zone indicator（四邊+中央 tab）

**適用場景**：專業製作軟體（DAW、NLE、VJ 軟體）、複雜多面板 IDE

### 模式 D：Page / View Preset 模式

**代表**：DaVinci Resolve（6 頁面）、Ableton Live（Session/Arrangement）、Linear（Board/List/Table）

```
┌─── 頁面導航 ──────────────────────────┐
│ [Media] [Edit] [Color] [Audio] [Ship] │
├───────────────────────────────────────┤
│                                       │
│   每個頁面有固定的面板排列             │
│   頁面內可微調（resize），但           │
│   面板組合由頁面類型決定               │
│                                       │
└───────────────────────────────────────┘
```

**特點**：
- 預定義多個「工作區」，每個工作區有固定的面板組合
- 使用者切換工作區而非自由拖曳面板
- 工作區內可微調（resize、collapse），但大結構固定
- 學習成本最低，但靈活性最差

**適用場景**：工作流程明確分階段的軟體

### 模式 E：Hybrid — Grid + Dock 混合模式

**代表**：Retool、Appsmith、Resolume Arena

```
┌────────────────────────────────────────┐
│ Fixed Header / Toolbar                 │
├──── Dockable ──┬─── Grid Canvas ───────┤
│ Side Panel     │ ┌────┐ ┌──────────┐  │
│ (dock/undock)  │ │ W1 │ │   W2     │  │
│                │ └────┘ └──────────┘  │
│                │ ┌──────────────────┐  │
│                │ │      W3         │  │
│                │ └──────────────────┘  │
└────────────────┴───────────────────────┘
```

**特點**：
- 核心區域使用 Grid Snap 自由放置 widget
- 邊欄使用 Dock 機制（可摺疊、可 dock 到不同邊）
- 結合兩者優點：Grid 的直覺性 + Dock 的空間效率

**適用場景**：低代碼平台、複雜 Dashboard

---

## 3. 產品調研

### 3.1 專業廣播/製作軟體

#### OBS Studio

| 項目 | 分析 |
|------|------|
| **佈局類型** | 模式 C — Qt Dock System |
| **拖曳機制** | 面板標題列為 drag handle；拖曳時顯示藍色 drop zone overlay（上/下/左/右/中央 tab） |
| **預設佈局** | 無官方預設模板，但可匯出/匯入 Scene Collection |
| **持久化** | 本地設定檔（JSON），隨 profile 儲存 |
| **RWD** | 無 — 桌面專用軟體 |
| **鎖定** | 有「Lock UI」選項防止誤觸 dock 拖曳 |
| **啟示** | Lock UI 是現場演出的關鍵功能；drop zone overlay 清楚指示放置位置 |

#### Resolume Arena

| 項目 | 分析 |
|------|------|
| **佈局類型** | 模式 E — 混合（固定功能區 + 可折疊面板） |
| **拖曳機制** | 面板不可自由拖曳，但可折疊/展開各區段；Clip Grid 內 clip 可拖曳重排 |
| **預設佈局** | 3 種預設 Layout（Advanced / Simple / Arena） |
| **持久化** | 本地設定檔 |
| **RWD** | 無 — 桌面專用 |
| **鎖定** | 無顯式鎖定，但面板結構固定不會誤觸 |
| **啟示** | 預設佈局模板降低上手門檻；VJ 軟體的「Simple」模式只留核心面板 |

#### vMix

| 項目 | 分析 |
|------|------|
| **佈局類型** | 模式 C — 自定義多視窗排列 |
| **拖曳機制** | 視窗可自由拖曳、可浮動（pop-out） |
| **預設佈局** | 可儲存/載入自定義佈局 |
| **持久化** | 本地 XML 設定檔 |
| **RWD** | 無 |
| **鎖定** | 支援鎖定佈局 |
| **啟示** | 儲存/載入佈局適合不同演出場景快速切換 |

#### Ableton Live

| 項目 | 分析 |
|------|------|
| **佈局類型** | 模式 D — Session View / Arrangement View 雙頁面 |
| **拖曳機制** | 面板不可自由拖曳；Clip 在 Session 網格內可拖曳 |
| **預設佈局** | 兩種核心視圖 + 可 toggle 的 Browser / Detail View |
| **持久化** | 隨專案檔儲存 |
| **鎖定** | 不需要（結構固定） |
| **啟示** | 兩種核心工作模式對應不同工作流；toggle 顯示/隱藏面板釋放空間 |

#### DaVinci Resolve

| 項目 | 分析 |
|------|------|
| **佈局類型** | 模式 D — 6 個固定頁面（Media/Cut/Edit/Fusion/Color/Fairlight/Deliver） |
| **拖曳機制** | 頁面內部分面板可 resize，但位置固定 |
| **預設佈局** | 每個頁面有專屬面板組合 |
| **持久化** | User Preferences |
| **RWD** | 無 |
| **啟示** | 頁面導航 + 面板固定組合 = 零學習成本切換工作流 |

### 3.2 開發者工具 / IDE

#### VS Code

| 項目 | 分析 |
|------|------|
| **佈局類型** | 模式 C — 區域 Dock（Activity Bar + Side Bar + Editor Groups + Panel） |
| **拖曳機制** | 面板標題列拖曳；可在 Primary/Secondary Side Bar 間拖曳；Editor 可拖曳到浮動視窗 |
| **預設佈局** | View > Editor Layout 提供多種預設（2 欄、3 欄、Grid 等） |
| **持久化** | 自動持久化至 workspace state；關閉重開自動恢復 |
| **RWD** | 無（桌面 app） |
| **鎖定** | 無顯式鎖定 |
| **啟示** | 自動持久化佈局是最佳體驗；Activity Bar 作為面板快速切換入口 |

#### Figma

| 項目 | 分析 |
|------|------|
| **佈局類型** | 模式 B + 浮動面板 |
| **拖曳機制** | 左右面板固定位置可 resize；部分面板（如 Dev Mode）可浮動 |
| **預設佈局** | Design / Prototype / Dev Mode 三種模式 |
| **持久化** | 雲端自動同步 |
| **RWD** | 有基本的面板 collapse（小螢幕自動收合側欄） |
| **啟示** | 模式切換 + 浮動面板是 Web App 的務實選擇 |

#### Notion

| 項目 | 分析 |
|------|------|
| **佈局類型** | Block-based column layout（非面板拖曳） |
| **拖曳機制** | Block 左側 drag handle（六點 grip icon）；拖曳到其他 block 旁形成 column |
| **預設佈局** | Template Gallery |
| **持久化** | 雲端 |
| **RWD** | Column 自動堆疊為單欄 |
| **啟示** | 六點 grip icon 是最廣泛認知的 drag handle 設計 |

### 3.3 Dashboard / 監控

#### Grafana

| 項目 | 分析 |
|------|------|
| **佈局類型** | 模式 A — 12 欄 Grid Snap |
| **拖曳機制** | 面板標題列拖曳移動；右下角 handle 拖曳 resize；grid snap 對齊 |
| **預設佈局** | Dashboard Template Library（社群共享） |
| **持久化** | JSON Model 儲存至伺服器；可匯出/匯入 JSON |
| **RWD** | Kiosk mode 自適應；但面板不會自動 reflow |
| **鎖定** | 有「Make editable」toggle，預設為唯讀模式 |
| **啟示** | 12 欄 Grid 是 Dashboard 的事實標準；JSON 序列化支援版本控制與分享 |

#### Home Assistant (Lovelace)

| 項目 | 分析 |
|------|------|
| **佈局類型** | 模式 A — Sections View（Grid）+ Masonry View（自動排列） |
| **拖曳機制** | Sections View 支援 tap-and-hold 拖曳重排；Masonry 自動排列 |
| **預設佈局** | 多種 View Type（Sections/Masonry/Panel/Sidebar） |
| **持久化** | YAML 設定 + UI Editor（寫入 .storage） |
| **RWD** | Sections View 可設定最大欄數；自動收合 |
| **鎖定** | 分離 Edit Mode / View Mode |
| **啟示** | Edit Mode / View Mode 分離是現場演出軟體的必備模式 |

### 3.4 專案管理

#### Linear

| 項目 | 分析 |
|------|------|
| **佈局類型** | 模式 D — Board / List / Table 視圖切換 |
| **拖曳機制** | Board view 內 card 可拖曳跨 column；List/Table 可拖曳排序 |
| **預設佈局** | 3 種核心視圖 + Custom View |
| **持久化** | 雲端 per-user |
| **RWD** | 響應式設計，小螢幕隱藏次要資訊 |
| **啟示** | View Type 切換是輕量化的佈局自訂方案 |

#### Monday.com

| 項目 | 分析 |
|------|------|
| **佈局類型** | 模式 A — Dashboard Widget Grid |
| **拖曳機制** | Widget 可拖曳 + resize；Grid snap |
| **預設佈局** | Widget Gallery + Dashboard Template |
| **持久化** | 雲端 |
| **鎖定** | Owner/Editor 權限控制 |
| **啟示** | Widget Gallery 讓使用者快速新增面板；resize handle 在右下角 |

### 3.5 低代碼 / 可視化建站

#### Retool

| 項目 | 分析 |
|------|------|
| **佈局類型** | 模式 E — 12 欄 Grid Canvas + Dock 側欄 |
| **拖曳機制** | Component 從左側 palette 拖入 canvas；canvas 上 grid snap |
| **預設佈局** | Template Library |
| **持久化** | 雲端 per-app |
| **RWD** | Mobile Layout 獨立設定 |
| **鎖定** | Edit / Preview mode |
| **啟示** | 桌面和手機佈局獨立設定是最務實的 RWD 方案 |

#### Appsmith

| 項目 | 分析 |
|------|------|
| **佈局類型** | 模式 A — Grid Canvas |
| **拖曳機制** | Widget 自由拖曳 + resize；grid snap |
| **預設佈局** | Template Library |
| **持久化** | 雲端 |
| **RWD** | Auto Layout mode（Flexbox-based）vs Fixed Layout |
| **啟示** | Flexbox-based Auto Layout 在 RWD 表現更好 |

---

## 4. 技術方案對比

### 4.1 候選方案總覽

| 方案 | GitHub Stars | Bundle (min+gz) | 佈局模式 | React 19 | TypeScript | 維護狀態 |
|------|-------------|-----------------|---------|----------|------------|---------|
| **react-grid-layout** | 22.1k | ~21 kB | Grid Snap | v2 支援 | v2 原生 TS | 活躍（v2 重寫） |
| **react-mosaic** | 4.7k | ~42 kB | Dock/Tab | 支援 R16-19 | 原生 TS | 活躍 |
| **FlexLayout** (caplin) | 1.3k | ~28 kB | Dock/Tab | 支援 | 原生 TS | 活躍 |
| **golden-layout** | 6.7k | ~30 kB | Dock/Tab | 需 wrapper | 部分 TS | v3 開發中（不穩定） |
| **react-resizable-panels** | 5.2k | ~9 kB | Split Pane | 支援 | 原生 TS | 活躍 (v4.7.3) |
| **@dnd-kit** (自建) | 15k+ | ~13 kB | 自定義 | 支援 | 原生 TS | 活躍 |

### 4.2 功能矩陣

| 功能 | react-grid-layout | react-mosaic | FlexLayout | golden-layout | react-resizable-panels | @dnd-kit 自建 |
|------|-------------------|--------------|------------|---------------|----------------------|--------------|
| Grid Snap | 原生支援 | 不支援 | 不支援 | 不支援 | 不支援 | 需自建 |
| 面板拖曳移動 | 原生支援 | 原生支援 | 原生支援 | 原生支援 | 不支援 | 需自建 |
| 面板 Resize | 原生支援 | 分隔線拖曳 | 分隔線拖曳 | 分隔線拖曳 | 分隔線拖曳 | 需自建 |
| Tab 群組 | 不支援 | 原生支援 | 原生支援 | 原生支援 | 不支援 | 需自建 |
| 浮動視窗 | 不支援 | 不支援 | 支援 (popout) | 支援 (popout) | 不支援 | 需自建 |
| 佈局序列化 | JSON 陣列 | JSON 樹 | JSON Model | JSON | autoSaveId | 需自建 |
| 響應式斷點 | 原生支援 | 不支援 | 有限 | 不支援 | 不支援 | 需自建 |
| 面板折疊 | 不支援 | 不支援 | 支援 | 支援 | 原生支援 | 需自建 |
| 鎖定佈局 | static prop | 不支援 | 不支援 | 不支援 | 不支援 | 需自建 |
| 無障礙 (a11y) | 有限 | 有限 | 有限 | 有限 | 良好 (ARIA) | 良好 |
| CSS 匯入 | 需要 2 個 CSS | 需要 1 個 CSS | 需要 CSS | 需要 CSS | 不需要 | 不需要 |
| 學習曲線 | 中 | 中-高 | 高 | 高 | 低 | 高（自建） |
| 與現有系統相容 | 需遷移 | 需遷移 | 需遷移 | 需遷移 | 已整合 | 可增量 |

### 4.3 方案詳評

#### 方案 1：react-grid-layout (v2) — Grid Snap Dashboard

**優勢**：
- 最成熟的 React Grid 佈局方案（22.1k stars）
- v2 全 TypeScript 重寫，API 更現代
- 原生支援響應式斷點（Responsive 元件）
- 佈局序列化為簡單 JSON 陣列，易於 localStorage / Zustand 持久化
- 支援 static items（不可拖曳）、drag handle、compaction 策略
- 與 Grafana 同源的佈局模型，使用者有認知基礎

**劣勢**：
- 需要匯入額外 CSS（`react-grid-layout/css/styles.css` + `react-resizable/css/styles.css`）
- Grid 模型不支援 tab 群組（面板不能疊加）
- 需要遷移現有 `react-resizable-panels` 佈局
- 面板內容的 aspect ratio 限制（如 LivePreview 16:9）需額外處理

**適合度**：★★★★☆

#### 方案 2：react-mosaic — VS Code 風格 Tile Layout

**優勢**：
- n-ary 樹模型支援任意嵌套分割
- 原生 tab 支援（`MosaicTabsNode`）
- 直覺的 split/merge 操作
- 受控 + 非受控兩種 API

**劣勢**：
- Bundle 較大（42 kB gzipped）
- 依賴 Blueprint 主題系統，與 LY Neon Brutalist Glass 主題衝突
- 沒有 Grid Snap，面板大小不夠精確
- 響應式支援不佳

**適合度**：★★★☆☆

#### 方案 3：FlexLayout (caplin) — 專業 Dock System

**優勢**：
- 最接近 OBS/DaVinci Resolve 的面板體驗
- 支援 tab、splitter、border tabset、popout window
- JSON Model 序列化完善
- 支援 sub-model（巢狀佈局）
- 手機/平板有基本支援

**劣勢**：
- Stars 較少（1.3k），社群資源有限
- 學習曲線高，API 較複雜
- 需要 CSS 匯入，客製化主題工作量大
- Popout window 在瀏覽器縮放時有問題
- Bundle 28 kB，中等

**適合度**：★★★☆☆

#### 方案 4：golden-layout — 經典 Dock Layout

**優勢**：
- 歷史悠久（6.7k stars），功能完善
- 原生 popout window 支援
- 完整的 save/restore 佈局

**劣勢**：
- v3 開發中且不穩定
- React 需要額外 wrapper
- 底層不是 React-first，與 React 19 整合可能有問題
- Bundle 30 kB
- 主題系統老舊

**適合度**：★★☆☆☆

#### 方案 5：react-resizable-panels 擴展 — 漸進增強

**優勢**：
- 已在專案中使用（零遷移成本）
- 最小 bundle（9 kB gzipped）
- 原生 TypeScript、React 19 支援
- 良好的無障礙支援（WAI-ARIA）
- 支援面板折疊（collapse）
- 自動持久化（`autoSaveId`）

**劣勢**：
- 面板位置不可互換（只能調整分隔線）
- 不支援 tab 群組
- 不支援 Grid Snap
- 擴展能力有限，無法實現自由拖曳

**適合度**：★★★☆☆（如果不需要自由拖曳面板位置）

#### 方案 6：@dnd-kit 自建 — 完全客製化

**優勢**：
- 已在專案中使用（用於 SortablePlaylist）
- 完全客製化，完美符合需求
- 最小外部依賴
- 性能最佳（只含需要的功能）

**劣勢**：
- 開發成本極高（需自建 Grid Snap、Resize、序列化、響應式）
- 測試成本高（edge case 多）
- 維護負擔完全在團隊身上
- 缺乏社群支援和現成範例

**適合度**：★★☆☆☆（除非有特殊需求無法由現有方案滿足）

---

## 5. 最佳實踐

### 5.1 通用 DO / DON'T

#### DO（必做）

| # | 實踐 | 原因 | 實例 |
|---|------|------|------|
| 1 | 提供 3-4 種預設佈局模板 | 大多使用者不會自訂佈局 | Resolume: Advanced/Simple/Arena |
| 2 | 分離 Edit Mode / View Mode | 防止演出中誤觸佈局 | Home Assistant、Grafana |
| 3 | 自動持久化佈局到 localStorage | 使用者不應每次重新配置 | VS Code 自動記憶、Grafana autosave |
| 4 | 面板有清楚的 drag handle | 區分「拖曳面板」和「與面板互動」 | Notion 六點 grip、Grafana 標題列 |
| 5 | 提供「重設為預設佈局」按鈕 | 使用者可能把佈局搞亂 | OBS、vMix |
| 6 | 面板可摺疊/隱藏 | 不需要的面板應可隱藏釋放空間 | VS Code、Ableton |
| 7 | 拖曳時顯示 drop zone indicator | 使用者需要知道面板會放在哪 | OBS 藍色 overlay、VS Code 高亮 |
| 8 | 面板有最小尺寸限制 | 防止面板縮到無法使用 | 所有方案都支援 minSize |
| 9 | 使用 CSS Transform 定位 | GPU 加速，避免 reflow | react-grid-layout、dnd-kit |
| 10 | 鍵盤快捷鍵切換面板可見性 | 進階使用者效率 | VS Code Ctrl+B、Ctrl+J |

#### DON'T（禁止）

| # | 反模式 | 原因 | 後果 |
|---|--------|------|------|
| 1 | 手機上使用自由拖曳佈局 | 觸控精度不足、螢幕太小 | UX 災難 |
| 2 | 預設就進入 Edit Mode | 使用者可能不知道自己在移動面板 | 演出中誤觸 |
| 3 | 面板間無間距（gutter） | 視覺混亂、拖曳目標不清 | 操作困難 |
| 4 | 允許面板完全遮蓋其他面板 | 使用者找不到被遮蓋的面板 | 功能失蹤 |
| 5 | 每次拖曳都觸發 API 持久化 | 效能問題 + API 壓力 | 卡頓、資源浪費 |
| 6 | 讓 Transport 控制被佈局遮蓋 | 演出中必須隨時可及 | 演出事故 |
| 7 | 面板 resize 觸發內容重繪 | 拖曳分隔線時 FPS 下降 | 視覺卡頓 |

### 5.2 各模式特有最佳實踐

#### Grid Snap 模式

- **DO**：使用 12 欄 Grid（與 CSS Grid、Bootstrap 一致的心智模型）
- **DO**：設定 rowHeight = colWidth（正方形 cell 最直覺）
- **DO**：預設使用 vertical compaction（面板自動上浮填滿空隙）
- **DON'T**：允許面板重疊
- **DON'T**：Grid 間距小於 8px（觸控目標太小）

#### Dock / Tab 模式

- **DO**：Drop zone indicator 使用四向箭頭 + 中央 tab icon
- **DO**：Tab 群組限制最多 4-5 個 tab（太多看不到 tab 標題）
- **DON'T**：預設展示太多 tab（新使用者會困惑）
- **DON'T**：允許核心面板（如 CueGrid）被完全關閉

#### Split Pane 模式

- **DO**：設定合理的 minSize / maxSize 百分比
- **DO**：Separator 寬度至少 5px（觸控友善）
- **DO**：Separator hover 時顯示高亮色
- **DON'T**：超過 3 層巢狀（太深會讓使用者迷失）

---

## 6. 推薦方案

### 6.1 推薦：模式 D + 模式 B 混合 — 預設佈局模板 + Split Pane 微調

經過全面分析，針對 LY 歌詞控制台的特殊使用情境（教會敬拜、演唱會現場操作），推薦以下方案：

#### 方案架構

```
┌─── Layout Preset Switcher ─────────────────────────────────┐
│ [Focus] [Standard] [Full] [Minimal] [Custom]               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   react-resizable-panels (已有) 為核心佈局引擎              │
│   + 預設佈局模板系統 (Zustand store)                        │
│   + 面板可見性 toggle (顯示/隱藏面板)                       │
│   + Layout Lock 模式 (防止演出中誤觸)                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 選擇理由

| 考量因素 | 分析 |
|---------|------|
| **使用情境** | 教會敬拜/演唱會是高壓現場環境，操作者需要的是「快速切換工作模式」而非「自由拖曳每個面板」 |
| **使用者技術水平** | 教會志工/VJ 操作者多非技術人員，過於靈活的 UI 反而增加認知負擔 |
| **遷移成本** | `react-resizable-panels` 已整合，零遷移成本 |
| **Bundle 影響** | 不需引入新 library（0 kB 額外 bundle） |
| **RWD 相容** | 現有三級 RWD（桌面/平板/手機）可延續 |
| **開發成本** | 預設佈局模板 + toggle 機制，開發量遠小於完整 Grid/Dock 系統 |
| **風險** | 最低 — 建立在已驗證的基礎上增量添加 |

#### 替代方案對照

| 方案 | 開發成本 | 使用者價值 | 風險 | 結論 |
|------|---------|-----------|------|------|
| A: react-grid-layout (Grid Snap) | 高（3-4 週） | 高 — 自由度最高 | 中 — 需遷移 | 備選方案 — 若使用者回饋強烈需要自由佈局 |
| **B: 預設模板 + Split Pane** | **低（1-2 週）** | **中-高 — 覆蓋主要需求** | **低** | **推薦方案** |
| C: FlexLayout (Dock/Tab) | 極高（4-6 週） | 最高 — 專業級 | 高 — 學習曲線 | 過度設計 — LY 面板數量（8個）不足以需要 Dock 系統 |

### 6.2 備選升級路徑：react-grid-layout v2

如果未來使用者回饋強烈要求自由拖曳，可升級至 react-grid-layout v2：

```
第一階段（推薦方案）：預設佈局模板 + Split Pane
    ↓ 使用者回饋要求更多自由度
第二階段（升級路徑）：react-grid-layout v2 Grid Snap
    ↓ 使用者要求 tab 群組 / 浮動面板
第三階段（遠期）：FlexLayout Dock System
```

### 6.3 推薦方案實作架構

```typescript
// lib/store/layout-store.ts

interface PanelConfig {
  id: string;
  visible: boolean;
  // react-resizable-panels 的 size 由 autoSaveId 自動持久化
}

interface LayoutPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  panels: PanelConfig[];
  // 對應 react-resizable-panels 的 Panel defaultSize 設定
  panelSizes: Record<string, number>; // panel id -> defaultSize %
  orientation: 'two-column' | 'three-column' | 'focus';
}

interface LayoutStore {
  // 預設佈局
  presets: LayoutPreset[];
  activePresetId: string;

  // 面板可見性
  panelVisibility: Record<string, boolean>;
  togglePanel: (panelId: string) => void;

  // 佈局鎖定
  isLayoutLocked: boolean;
  toggleLayoutLock: () => void;

  // 預設切換
  applyPreset: (presetId: string) => void;

  // 自訂佈局（記住使用者的微調）
  customLayout: LayoutPreset | null;
  saveCurrentAsCustom: () => void;
}
```

---

## 7. 設計規範

### 7.1 面板卡片規範

```
┌─────────────── Panel Card ──────────────────┐
│ ┌─ Header (h=36px, bg=elevated) ──────────┐ │
│ │ [≡] Panel Title    [_] [□] [×]          │ │
│ │  ↑                  ↑   ↑   ↑           │ │
│ │  drag handle    collapse max close       │ │
│ ├─────────────────────────────────────────┤ │
│ │                                         │ │
│ │            Content Area                 │ │
│ │         (overflow: auto)                │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│                                  ◢ resize   │
└─────────────────────────────────────────────┘
```

| 設計元素 | 規格 | 設計 Token |
|---------|------|-----------|
| Panel Header 高度 | 36px | `h-9` |
| Panel Header 背景 | elevated | `bg-elevated` |
| Panel Title 字型 | 11px, mono, uppercase, tracking-wider | `text-[11px] font-mono tracking-wider uppercase` |
| Panel Title 顏色 | text-muted | `text-text-muted` |
| Drag Handle | 6-dot grip icon, 16x16px | `text-text-muted/50 hover:text-text-primary` |
| Panel Border | 1px border-dim | `border border-border-dim` |
| Panel Border Radius | 0 (Brutalist 風格) | `rounded-none` |
| Panel 間距 (Gap) | 4px (桌面) / 0 (平板/手機) | `gap-1` |
| Separator 寬度 | 5px（現有值） | `w-[5px]` 或 `h-[5px]` |
| Separator Hover | primary/20 | `hover:bg-primary/20` |
| Separator Active | primary/30 | `active:bg-primary/30` |

### 7.2 面板尺寸約束

| 面板 | minWidth | minHeight | 建議 defaultSize | maxSize |
|------|----------|-----------|-----------------|---------|
| Songs Library | 200px / 12% | 250px | 20% | 35% |
| CueGrid | 300px / 30% | 350px | 45% | 70% |
| LivePreview | 250px / 15% | 180px (16:9) | 35% (含右欄) | 50% |
| QuickSettings | 200px | 150px | 含在右欄 | - |
| AiTracking | 200px | 80px (collapsed) | 含在右欄 | - |
| QR Code | 160px | 180px | 含在右欄 | - |
| Transport | full width | 48px | 固定 | 固定 |
| StatusBar | full width | 48px | 固定 | 固定 |

### 7.3 顏色規範（Neon Brutalist Glass 適配）

| 狀態 | 顏色 Token | 用途 |
|------|-----------|------|
| 面板邊框（預設） | `border-border-dim` | 靜態邊框 |
| 面板邊框（hover） | `border-primary/30` | 滑鼠懸停 |
| 面板邊框（拖曳中） | `border-primary` | 拖曳活動指示 |
| Drop Zone 指示 | `bg-primary/10 border-primary/50` | 放置目標高亮 |
| 面板 Header（活動） | `bg-primary/5` | 當前聚焦面板 |
| Layout Lock 指示 | `text-amber-400` | 鎖定狀態圖示 |
| Preset 按鈕（選中） | `bg-primary/10 border-primary/30 text-primary` | 當前佈局模板 |
| Preset 按鈕（未選） | `bg-surface border-border-dim text-text-muted` | 非當前模板 |

### 7.4 動畫規範

| 動畫 | 時長 | Easing | 觸發時機 |
|------|------|--------|---------|
| 面板 collapse/expand | 200ms | ease-out | 點擊 collapse 按鈕 |
| Preset 切換轉場 | 300ms | ease-in-out | 切換佈局模板 |
| Separator 拖曳 | 0ms (即時) | - | 拖曳分隔線 |
| Panel visibility toggle | 150ms | ease-out | 顯示/隱藏面板 |
| Layout Lock 圖示 | 200ms | ease | 切換鎖定狀態 |

---

## 8. 預設佈局建議

### 8.1 Focus Mode（專注模式）— 正式演出

**使用情境**：正式演出、敬拜進行中，只需要 CueGrid 和 LivePreview

```
┌────────────────────────────────────────────────────────────┐
│ StatusBar  [Focus] [Standard] [Full] [Minimal]  [🔒 Lock] │
├────────────────────────────────────────┬───────────────────┤
│                                        │                   │
│                                        │   LivePreview     │
│             CueGrid                    │   (16:9)          │
│             (核心操作區)                │                   │
│                                        │                   │
│             70%                        │   30%             │
│                                        │                   │
├────────────────────────────────────────┴───────────────────┤
│ Transport Controls (上一句 / 進度 / 下一句)                 │
└────────────────────────────────────────────────────────────┘

隱藏面板：Songs Library、QuickSettings、AiTracking、QR Code
```

### 8.2 Standard Mode（標準模式）— 預設

**使用情境**：日常操作，三欄完整佈局

```
┌────────────────────────────────────────────────────────────┐
│ StatusBar  [Focus] [Standard] [Full] [Minimal]  [🔒 Lock] │
├──────────┬────────────────────┬────────────────────────────┤
│          │                    │ LivePreview (16:9)          │
│ Songs    │     CueGrid        ├────────────────────────────┤
│ Library  │                    │ QuickSettings              │
│ 20%      │     45%            │ 35%                        │
│          │                    │                            │
└──────────┴────────────────────┴────────────────────────────┘

隱藏面板：AiTracking（可選展開）、QR Code
等同於現有佈局
```

### 8.3 Full Mode（完整模式）— 排練/設定

**使用情境**：排練前調整設定、首次設定連線

```
┌────────────────────────────────────────────────────────────┐
│ StatusBar  [Focus] [Standard] [Full] [Minimal]  [🔒 Lock] │
├──────────┬────────────────────┬────────────────────────────┤
│          │                    │ LivePreview (16:9)          │
│ Songs    │                    ├────────────────────────────┤
│ Library  │     CueGrid        │ AiTracking                 │
│          │                    ├────────────────────────────┤
│ 20%      │     40%            │ QuickSettings              │
│          │                    │ + QR Code                  │
│          │                    │ 40%                        │
└──────────┴────────────────────┴────────────────────────────┘

所有面板可見
```

### 8.4 Minimal Mode（簡約模式）— 小螢幕/次要操作員

**使用情境**：筆電小螢幕、副操作員只需切歌

```
┌────────────────────────────────────────────────────────────┐
│ StatusBar  [Focus] [Standard] [Full] [Minimal]  [🔒 Lock] │
├──────────────────────┬─────────────────────────────────────┤
│                      │                                     │
│    Songs Library     │          CueGrid                    │
│                      │                                     │
│    35%               │          65%                        │
│                      │                                     │
└──────────────────────┴─────────────────────────────────────┘

隱藏面板：LivePreview、QuickSettings、AiTracking、QR Code
```

### 8.5 佈局切換器 UI 設計

```
┌── Layout Preset Bar (h=32px, 嵌入 StatusBar 或獨立列) ──────┐
│                                                             │
│  [🎯 Focus] [📐 Standard] [🔧 Full] [📱 Minimal] │ [✏️ Edit] [🔒]  │
│     ↑ active (primary bg)  ↑ inactive (surface bg)         │
│                                         ↑ toggle edit mode │
│                                                  ↑ lock    │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. RWD 策略

### 9.1 斷點與佈局對應

| 斷點 | 寬度 | 佈局引擎 | 自由佈局 | 預設模式 |
|------|------|---------|---------|---------|
| 桌面 | >=1280px | react-resizable-panels + Preset | 支援（可拖曳 separator） | Standard |
| 平板 | 768-1279px | 固定雙欄（40/60） | 有限（可 toggle 面板） | Standard（精簡版） |
| 手機 | <768px | Tab 分頁 | 不支援 | Tab Navigation |

### 9.2 面板降級策略

| 面板 | 桌面 | 平板 | 手機 |
|------|------|------|------|
| StatusBar | 完整版 | 完整版 | 精簡版 (MobileStatusBar) |
| Songs Library | Panel (可 resize) | 左欄 40% (固定) | Tab「歌曲」 |
| CueGrid | Panel (可 resize) | 右欄 60% (固定) | Tab「歌詞」 |
| LivePreview | Panel (可 resize) | 隱藏（可 toggle） | 隱藏 |
| QuickSettings | Panel (可 resize) | Bottom Sheet | Tab「設定」 |
| AiTracking | 可折疊 Panel | 摺疊式 | Tab「設定」 |
| QR Code | Popover | Modal | Modal |
| Transport | 固定底部列 | 固定底部列 | 內嵌於 CueGrid |

### 9.3 手機端不使用自由佈局的理由

基於研究資料的明確結論：

1. **觸控精度不足**：手指觸控精度 ~10mm，drag handle 的 hit area 必須至少 44x44px（Apple HIG），面板 header 會佔用過多垂直空間
2. **螢幕空間有限**：手機螢幕最多容納 1-2 個面板，自由排列毫無意義
3. **誤觸風險極高**：現場演出中誤觸拖曳 = 事故
4. **業界共識**：所有調研產品（Grafana、Retool、Appsmith）在手機端都回退到線性佈局或 tab 導航
5. **LY 現有方案已經是最佳實踐**：MobileTabBar + 三分頁是手機端的正確做法

---

## 10. 實作路線圖

### Phase 1：Layout Preset System（1-2 週）

**目標**：實現佈局模板切換 + 面板可見性控制

**工作項目**：

1. 建立 `LayoutStore` (Zustand + persist) 管理佈局狀態
2. 定義 4 種預設佈局模板（Focus / Standard / Full / Minimal）
3. 實作 `LayoutPresetBar` 元件（嵌入 StatusBar）
4. 實作面板 visibility toggle 邏輯
5. 利用 `react-resizable-panels` 的 `autoSaveId` 持久化面板大小
6. 佈局切換動畫（CSS transition）

**技術風險**：低 — 不引入新 library

### Phase 2：Layout Lock + Panel Collapse（1 週）

**目標**：演出模式保護 + 面板空間優化

**工作項目**：

1. 實作 Layout Lock toggle（鎖定後 separator 不可拖曳）
2. 利用 `react-resizable-panels` 的 `collapsible` prop 實作面板折疊
3. 面板 Header 加入 collapse/expand 按鈕
4. 鍵盤快捷鍵支援（如 Ctrl+1/2/3/4 切換預設）

### Phase 3（可選）：Custom Layout Save/Load（1 週）

**目標**：使用者可儲存自訂佈局

**工作項目**：

1. 「Save Current Layout」功能
2. 自訂佈局命名
3. 匯出/匯入佈局 JSON（進階功能）

### Phase 4（遠期，依使用者回饋決定）：Grid Snap 升級

**目標**：若使用者回饋強烈需要自由拖曳面板位置

**工作項目**：

1. 引入 react-grid-layout v2
2. 遷移現有面板為 Grid 項目
3. 實作 Responsive 斷點設定
4. 遷移佈局持久化到 Grid Layout JSON

---

## 附錄

### A. 調研產品與佈局模式對照表

| 產品 | 類別 | 佈局模式 | 主要特色 |
|------|------|---------|---------|
| OBS Studio | 廣播 | C: Dock | Lock UI、tab group |
| Resolume Arena | VJ | E: Hybrid | 3 種預設 Layout |
| vMix | 廣播 | C: Dock | Save/Load Layout |
| Ableton Live | DAW | D: Page/View | Session/Arrangement 雙視圖 |
| DaVinci Resolve | NLE | D: Page/View | 6 頁面固定組合 |
| VS Code | IDE | C: Dock | 自動持久化、Editor Layout 預設 |
| Figma | Design | B+Float | Mode 切換、浮動面板 |
| Notion | Productivity | Block Drag | 六點 grip handle |
| Grafana | Dashboard | A: Grid Snap | 12 欄 Grid、JSON 序列化 |
| Home Assistant | IoT | A: Grid Snap | Edit/View Mode 分離 |
| Linear | PM | D: View Switch | Board/List/Table |
| Monday.com | PM | A: Grid Snap | Widget Gallery |
| Jira | PM | A: Grid Snap | Gadget 拖曳 |
| Retool | Low-Code | E: Hybrid | Mobile Layout 獨立 |
| Appsmith | Low-Code | A: Grid Snap | Auto Layout (Flexbox) |

### B. react-grid-layout v2 升級評估（備選方案詳細）

若未來升級至 react-grid-layout v2，以下為技術評估：

**安裝**：
```bash
npm install react-grid-layout@^2.0.0
```

**佈局定義**：
```typescript
const layout = [
  { i: 'songs',    x: 0,  y: 0, w: 3,  h: 12, minW: 2, minH: 6 },
  { i: 'cueGrid',  x: 3,  y: 0, w: 5,  h: 12, minW: 4, minH: 8 },
  { i: 'preview',  x: 8,  y: 0, w: 4,  h: 6,  minW: 3, minH: 4 },
  { i: 'settings', x: 8,  y: 6, w: 4,  h: 6,  minW: 3, minH: 4 },
];
```

**Responsive 斷點**：
```typescript
const breakpoints = { lg: 1280, md: 768, sm: 480 };
const cols = { lg: 12, md: 8, sm: 1 };
```

**與 Zustand persist 整合**：
```typescript
// Layout 序列化為 JSON 陣列，直接存入 Zustand persist
interface GridLayoutStore {
  layouts: Record<string, Layout[]>; // breakpoint -> layout
  onLayoutChange: (layout: Layout[], layouts: Layouts) => void;
}
```

### C. 參考資源

- [react-grid-layout v2 README](https://github.com/react-grid-layout/react-grid-layout) — 22.1k stars
- [react-mosaic README](https://github.com/nomcopter/react-mosaic) — 4.7k stars
- [FlexLayout README](https://github.com/caplin/FlexLayout) — 1.3k stars
- [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) — 5.2k stars（LY 現用）
- [golden-layout](https://github.com/golden-layout/golden-layout) — 6.7k stars
- [@dnd-kit](https://github.com/clauderic/dnd-kit) — 15k+ stars（LY 現用）

---

**調研結論**：推薦以「預設佈局模板 + react-resizable-panels 微調 + Layout Lock」作為 LY 控制台的自由佈局方案。此方案開發成本最低（1-2 週）、遷移風險最低（零遷移）、且最符合現場演出操作者的真實需求。若未來使用者回饋需要更高自由度，可漸進升級至 react-grid-layout v2。
