# P0 UI/UX 全面重設計 — 設計規格書

**日期**: 2026-03-16
**版本**: 1.2
**狀態**: Final (Spec Review Round 2 APPROVED)

---

## 1. 背景與動機

### 問題摘要

Code review 發現四個 P0 等級問題：

1. **Token 儲存安全漏洞** — access token 以無 `HttpOnly` 的 cookie 儲存，refresh token 在 localStorage，兩者暴露於 XSS
2. **三套並行設計系統** — `globals.css`（HSL CSS 變數）、`tokens.ts`（hex 常數）、controller 硬編碼 hex 值互相脫鉤
3. **Controller 頁面過度龐大** — ~1707 行包含 15+ 內聯元件
4. **文檔與實際程式碼嚴重脫節** — `requirements.md` 全標「Not Started」但功能大部分已完成

### 決策

將 P0 修復與 UI/UX 全面重設計合併為一次性工程，原因：

- P0-3（Controller 拆分）和 P0-4（設計系統統一）本身就是重設計的前置條件
- 逐項修 P0 後再重設計 = 改兩次，浪費工時
- 合併執行可確保所有頁面從源頭一致

---

## 2. 設計方向

**Refined Dark Tech** — 保留現有暗色霓虹品牌 DNA，大幅提升精緻度。

理由：
- 目標用戶（樂手、敬拜團隊、活動製作人）期待科技感視覺
- 現有品牌方向正確，問題在於執行品質（色彩不一致、動效缺失、程式碼龐雜）
- Display 端投影場景需要高視覺衝擊力

---

## 3. 架構決策

| 決策 | 選擇 | 理由 |
|------|------|------|
| 設計系統來源 | CSS 變數（唯一） | Tailwind 原生支援；JS 需要時用 `getComputedStyle`；刪除 `tokens.ts` |
| Token 安全 | Go 後端設 `HttpOnly; Secure; SameSite=Strict` cookie，經 Next.js proxy 傳遞 | 同源 proxy 確保 cookie domain 一致 |
| Controller 拆分 | 按功能域拆為 8-10 個元件檔 | 各元件 < 200 行，職責單一 |
| Display Clean Output | URL 參數 `?mode=clean` | 純黑背景、無 UI chrome、僅歌詞文字+發光 |

---

## 4. 統一設計系統

### 4.1 刪除項目

- `app/styles/tokens.ts` — 整個刪除
  - **前置驗證**：執行 `grep -r "from.*tokens\|from.*@/styles/tokens" app/ components/ lib/` 確認零消費者（目前已驗證：僅 `tokens.ts` 自身內部註解引用，無外部 import）
- Controller 中所有硬編碼 hex 值（`#090A0C`、`#16181D`、`#2A2D35` 等，約 30+ 處）

### 4.2 CSS 變數（唯一來源）

定義在 `globals.css` `:root` 中。格式為 **HSL 空格分隔**（Tailwind v3 慣例，支援 `bg-primary/50` opacity 修飾）。

**完整變數定義：**

```css
:root {
  /* === 背景層次 === */
  --color-void: 240 14% 1%;            /* #030304 → 最深背景 */
  --color-surface: 220 20% 4%;         /* 卡片/面板背景 (保留現有) */
  --color-elevated: 220 15% 7%;        /* 懸浮面板/Modal (保留現有) */

  /* === 品牌色 === */
  --color-primary: 190 100% 50%;       /* 電藍 (保留現有) */
  --color-secondary: 270 100% 65%;     /* 霓虹紫 (保留現有) */
  --color-accent: 150 100% 50%;        /* 霓虹綠 (保留現有) */

  /* === 文字 === */
  --color-text-primary: 0 0% 100%;     /* 主文字白 (保留現有名稱) */
  --color-text-muted: 220 10% 55%;     /* 次要文字 (保留現有) */

  /* === 邊框 === */
  --color-border-dim: 0 0% 100% / 0.08; /* 微邊框 (保留現有) */

  /* === 語意色 === */
  --color-success: 150 80% 45%;        /* 成功綠 */
  --color-warning: 35 95% 55%;         /* 警告橙 */
  --color-error: 0 85% 55%;            /* 錯誤紅 */

  /* === 發光專用 === */
  --color-glow-primary: 190 100% 50%;  /* 電藍發光 (用於 box-shadow / text-shadow) */
  --color-glow-secondary: 270 100% 65%; /* 霓虹紫發光 */
  --color-glow-accent: 150 100% 50%;   /* 霓虹綠發光 */
}
```

**與現有變數的遷移對照：**

| 現有變數 | 新變數 | 變更 |
|---------|--------|------|
| `--color-void: 3 3 4` | `--color-void: 240 14% 1%` | 修正為 HSL 格式（視覺等效） |
| `--color-text-primary` | `--color-text-primary` | **保留原名**（不改名，避免全站破壞性更名） |
| `--color-border-dim` | `--color-border-dim` | **保留原名** |
| （不存在） | `--color-success/warning/error` | 新增 |
| （不存在） | `--color-glow-*` | 新增，HSL 值與品牌色相同但語意分離 |

### 4.3 Tailwind 配置

**色彩階梯策略**：品牌色（primary/secondary/accent）保留 Tailwind shade palette（`primary-300`、`primary-600` 等在程式碼中廣泛使用），但 `DEFAULT` 值指向 CSS 變數。

```ts
// tailwind.config.ts
colors: {
  void: 'hsl(var(--color-void) / <alpha-value>)',
  surface: 'hsl(var(--color-surface) / <alpha-value>)',
  elevated: 'hsl(var(--color-elevated) / <alpha-value>)',
  primary: {
    DEFAULT: 'hsl(var(--color-primary) / <alpha-value>)',
    // 具體 shade 值以現有 tailwind.config.ts 為準，此處僅為結構示意
    50: '#E6FAFF',   // 以 tailwind.config.ts 實際值為準
    100: '#CCF5FF',
    // ... 保留 tailwind.config.ts 中既有的完整 shade palette
    900: '#003D4D',
  },
  secondary: {
    DEFAULT: 'hsl(var(--color-secondary) / <alpha-value>)',
    // ... 保留現有 shade palette
  },
  accent: {
    DEFAULT: 'hsl(var(--color-accent) / <alpha-value>)',
    // ... 保留現有 shade palette
  },
  'text-primary': 'hsl(var(--color-text-primary) / <alpha-value>)',
  'text-muted': 'hsl(var(--color-text-muted) / <alpha-value>)',
  'border-dim': 'hsl(var(--color-border-dim))',
  success: 'hsl(var(--color-success) / <alpha-value>)',
  warning: 'hsl(var(--color-warning) / <alpha-value>)',
  error: 'hsl(var(--color-error) / <alpha-value>)',
}
```

**效果**：`bg-primary` 讀 CSS 變數，`bg-primary-300` 讀 palette，`bg-primary/10` opacity 修飾正常。三種用法全部保留。

### 4.4 規範

- 所有元件一律使用語意化 Tailwind class（`bg-void`、`text-text-primary`、`border-border-dim`）
- **禁止**硬編碼 hex/rgb 色值（Clean Output 的 `#000000` 是唯一例外，因 luma key 需要精確黑）
- **禁止** `onMouseEnter/onMouseLeave` 命令式 hover，統一用 Tailwind `hover:` class
- 使用者自訂的 `displaySettings.highlightColor`（runtime 動態值）透過 inline `style` 屬性設定，不走 CSS 變數（因 CSS 變數無法從 Zustand store 自動同步）

---

## 5. 動效系統

### 5.1 Motion Tokens

```css
:root {
  --duration-fast: 150ms;      /* hover、focus 回饋 */
  --duration-normal: 250ms;    /* 面板展開、toggle */
  --duration-slow: 400ms;      /* 頁面轉場、Modal */
  --duration-dramatic: 600ms;  /* Display 歌詞切換 */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

**與現有 token 的遷移對照：**

| 現有 | 新 | 變更 |
|------|-----|------|
| `--duration-fast: 150ms` | `--duration-fast: 150ms` | 不變 |
| `--duration-base: 200ms` | （刪除） | 合併入 `--duration-normal`，差異僅 50ms，不值得維護兩個近似值 |
| `--duration-normal: 300ms` | `--duration-normal: 250ms` | 微調更快以提升手感 |
| `--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)` | `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)` | 更對稱的 ease 曲線 |
| （不存在） | `--duration-slow: 400ms` | 新增 |
| （不存在） | `--duration-dramatic: 600ms` | 新增 |
| （不存在） | `--ease-spring` | 新增 |

**遷移注意**：所有使用 `--duration-base` 的地方需改為 `--duration-normal`。執行 `grep -r "duration-base" app/ components/` 確認影響範圍。

### 5.2 Layer 1 — 微互動（全站通用）

| 元素 | 動效 | 參數 |
|------|------|------|
| 按鈕 hover | 發光漸變 + 微上移 | `--duration-fast` + `--ease-out` |
| 按鈕 active | 縮放回彈 | `scale(0.97)` + `--ease-spring` |
| Input focus | 邊框發光擴散 | `box-shadow` 漸變 `--duration-normal` |
| Toggle 切換 | 滑動 + 顏色過渡 | `--duration-normal` + `--ease-in-out` |
| Toast 通知 | 右側滑入 → 自動淡出 | `--duration-normal` 進 / `--duration-slow` 出 |
| 連線指示器 | 脈動呼吸 | `pulse` keyframe 2s infinite |

### 5.3 Layer 2 — 頁面轉場與結構動畫

| 場景 | 動效 |
|------|------|
| Modal 開啟 | backdrop fade + 內容 scale(0.95→1) + fade |
| Panel 展開/收起 | height auto 動畫 + opacity |
| 歌曲列表項目 | 交錯進場 staggered fade + translateY |
| Tab 切換 | 內容 crossfade |
| 拖曳排序 | dnd-kit scale + shadow 提升 |

### 5.4 Layer 3 — Display 氛圍動效（選擇性）

| 場景 | 動效 | 備註 |
|------|------|------|
| 歌詞行切換 | 平滑滾動 + 漸入漸出 | `--duration-dramatic` |
| 當前行發光 | text-shadow 脈動 | 霓虹呼吸效果 |
| 背景（一般模式） | CSS gradient 緩慢旋轉 or 極淡 noise 紋理 | CSS only，不用 Canvas |
| 背景（Clean Output） | 純黑 `#000000` | 無任何裝飾 |

---

## 6. 共用元件庫重構

### 6.1 新增元件/Hook

| 元件/Hook | 替代 | 位置 |
|-----------|------|------|
| `useMediaQuery(query)` | 泛用 media query hook | `lib/hooks/useMediaQuery.ts` |
| `useIsMobile()` | 4 處重複的 matchMedia | `lib/hooks/useIsMobile.ts`（基於 useMediaQuery） |
| `AuthLayout` | login/register 重複的表單結構 | `components/auth/AuthLayout.tsx` |
| `Spinner` | 重複的 SVG loading spinner | `components/ui/Spinner.tsx` |
| `ConfirmDialog` | `confirm()` 原生對話框（controller line 727, 991） | `components/ui/ConfirmDialog.tsx` |
| `GlowButton` | 散落各處的按鈕 hover 邏輯 | `components/ui/GlowButton.tsx` |
| `GlowInput` | 散落各處的輸入框 focus 邏輯 | `components/ui/GlowInput.tsx` |
| `calcVisibleLines()` | LivePreview 與 LyricsDisplay 重複 | `lib/utils/visible-lines.ts` |

### 6.2 解耦修復

- `Toast.tsx`：移除對 `useLyricsStore` 的直接依賴，改用 CSS 變數 `var(--color-primary)` 讀取主題色

---

## 7. 逐頁重設計規格

### 7.1 Home 首頁 (`/`)

- Server Component，SEO 友好（已確認無 `"use client"`，`lucide-react` icon 在 Server Component tree-shaking 正常）
- 品牌標題霓虹呼吸動畫
- 三張特色卡片交錯進場（staggered entrance，100ms delay）
- 兩個 CTA 按鈕：hover glow spread + translateY(-2px)
- 背景：CSS gradient 緩慢旋轉（非 Canvas）
- 修復 scanlines 效果：`globals.css` 定義 `.scanlines::before` pseudo-element 但 JSX 中使用 `bg-scanlines`（Tailwind backgroundImage 工具類）。統一為 Tailwind `bg-scanlines` 方案，移除 `.scanlines::before` CSS

### 7.2 Login + Register (`/login`、`/register`)

- 共用 `AuthLayout` 元件（logo + glass-card + footer link）
- 表單使用 `GlowInput` 元件
- 移除前端 cookie/localStorage token 操作（Token 安全修復整合）
- Login/Register 成功後前端只需 `router.push()`，不碰 token
- 動效：card scaleIn 進場、input focus glow、submit loading spinner、錯誤 shake

### 7.3 Controller (`/controller`)

**拆分方案 — 現有內聯元件到新檔案的對照：**

| 新檔案 | 來源（controller/page.tsx 內聯元件） | 狀態管理 |
|--------|--------------------------------------|---------|
| `ControllerPage.tsx` | 頁面外殼、RWD 佈局切換邏輯、session 初始化 | 直接讀 store |
| `ControllerHeader.tsx` | 頂部 session code 顯示、連線狀態 | props: `sessionCode`, `connectionState` |
| `SongLibrary.tsx` | `LibraryPanel` 含搜尋、歌曲列表、CRUD 按鈕 | 直接讀 store（songs, currentSong） |
| `CueGrid.tsx` | 歌詞 Cue 列表、點擊跳轉、LIVE 標記、鍵盤快捷鍵 | 直接讀 store（lyrics, currentIndex） |
| `LivePreview.tsx` | Program Out 預覽（使用共用 `calcVisibleLines`） | 直接讀 store（lyrics, displaySettings） |
| `QuickSettings.tsx` | 顯示設定面板（行數、字體、主題、動畫、行距） | 直接讀 store（displaySettings） |
| `PlaylistPanel.tsx` | 播放清單 CRUD、`SortablePlaylist` 整合 | 直接讀 store + `usePlaylistReorder` |
| `MobileTabBar.tsx` | 手機版底部 Tab（歌曲/歌詞/設定/QR） | props: `activeTab`, `onTabChange` |
| `ToggleRow.tsx` | 共用開關列（已有 `role="switch"` 無障礙） | props only |

**狀態管理策略**：Zustand store 維持集中式不拆分。大多數子元件直接用 selector 讀 store（與現有模式一致），僅純展示元件（MobileTabBar、ToggleRow、ControllerHeader）透過 props。

**佈局**：桌面三欄（~20% + ~45% + ~35%），保留 `react-resizable-panels` v4 percentage-based sizing（import 為 `{ Panel, Group, Separator }`），與現有行為一致。手機底部 Tab Bar 四分頁。

所有 `confirm()` 呼叫（line 727, 991）改用 `ConfirmDialog`。

### 7.4 Display (`/display`)

**一般模式**：
- 深色漸層背景 + 極淡動態 noise 紋理
- 歌詞切換：平滑滾動 + opacity 過渡（`--duration-dramatic`）
- 當前行：霓虹 text-shadow 脈動
- 3 秒 idle 自動隱藏 UI chrome（修復 fade-out keyframe — 目前 `globals.css` 缺少 `fade-out` keyframe 導致動畫靜默失效）
- 全螢幕 F 鍵快捷鍵保留

**Clean Output 模式** (`?mode=clean`)：
- 背景：純黑 `#000000`（luma key 需要絕對黑，這是全站唯一允許的硬編碼色值）
- 隱藏所有 UI：無 ConnectionStatusBar、無 ConnectionIndicator、無 LyricsControl、無 session 輸入
- 僅顯示：歌詞文字 + 霓虹 glow 效果
- 文字顏色/glow 跟隨 Controller 設定
- WebSocket 即時同步不受影響
- **斷線行為**：Clean Output 不顯示任何重連 UI（投影觀眾不應看到技術問題）。Controller 端的 ConnectionIndicator 會顯示斷線狀態，操作員在 Controller 端監控即可。若 3 秒內未重連成功，歌詞靜止在最後一次同步位置。
- 用途：OBS 視窗擷取 → luma key 去背 → 疊在 VJ 素材上

---

## 8. Token 安全修復

### 8.1 Cookie Domain 策略

**關鍵問題**：`lib/api/auth.ts` 目前直接呼叫 Go 後端（port 8080），繞過 Next.js proxy。若 Go 在 port 8080 設 `Set-Cookie`，cookie domain 為 `localhost:8080`，瀏覽器不會在請求 port 3000 時帶上這個 cookie。

**解法**：將 `lib/api/auth.ts` 的 `API_BASE` 改為透過 Next.js proxy（即呼叫 `/api/auth/login` 而非 `http://localhost:8080/api/auth/login`）。Next.js rewrite 已將 `/api/*` 代理到 Go 後端，`Set-Cookie` header 會被透明傳回。瀏覽器看到的 cookie domain 是 Next.js origin（port 3000），完全同源。

```
修改前: 瀏覽器 → Go :8080 直接 → cookie domain 不匹配
修改後: 瀏覽器 → Next.js :3000/api/* → rewrite → Go :8080 → Set-Cookie 透過 proxy 傳回 → cookie domain = :3000 ✓
```

### 8.2 Go 後端改動

- `internal/handler/auth.go`：login/register/refresh handler 的 response 新增 `Set-Cookie` header
  - Access token: `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
  - Refresh token: `HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh; Max-Age=2592000`
- Response body 不再回傳 token 明文（僅回傳 `{ success: true, user: {...} }`）
- 開發環境（`ENVIRONMENT=development`）時 `Secure` flag 可省略（localhost 不支援 HTTPS）

### 8.3 前端改動

- `lib/api/auth.ts`：**刪除 `API_BASE` 直連邏輯**，改為呼叫 proxy 路徑（`/api/auth/login`、`/api/auth/register`、`/api/auth/refresh`）
- `app/login/page.tsx`：移除 `document.cookie = ...` 和 `localStorage.setItem()`，成功後直接 `router.push('/controller')`
- `app/register/page.tsx`：同上
- `lib/api/songs.ts`、`lib/api/playlists.ts`：已透過 proxy 路徑 `/api/songs` 呼叫（同源請求自動帶 cookie），**無需改動**
- `lib/auth/session.ts`：server-side 透過 `cookies()` 讀取 HttpOnly cookie（Next.js App Router 內建支援）

### 8.4 不受影響

- WebSocket 連線（使用 session code 認證，不依賴 cookie）
- `lib/api/songs.ts`、`lib/api/playlists.ts`（已走 proxy，同源自動帶 cookie）

---

## 9. 平行化執行計劃

```
Stage 1 ─── 平行雙線 ────────────────────────────

  Thread A: Token 安全修復（獨立 Agent）
    ├── Go auth handler Set-Cookie
    ├── lib/api/auth.ts 改走 proxy 路徑
    ├── 前端 login/register 移除手動 token 操作
    └── 測試更新（auth.test.ts + E2E auth 流程）

  Thread B: 設計系統基礎建設
    ├── 修正 globals.css CSS 變數（--color-void HSL 修正 + 新增語意色/glow 色）
    ├── 重寫 tailwind.config.ts（DEFAULT 讀 CSS 變數 + 保留 shade palette）
    ├── 驗證 tokens.ts 零消費者後刪除
    ├── 新增動效 keyframes + motion tokens（含 --duration-base → --duration-normal 遷移）
    └── 升級 utility class

Stage 2 ─── 共用元件（依賴 Stage 1B）─────────────

    ├── useMediaQuery / useIsMobile
    ├── GlowButton / GlowInput / Spinner / ConfirmDialog
    ├── AuthLayout
    ├── calcVisibleLines()
    ├── Toast 解耦
    └── 各元件 TDD 測試

Stage 3 ─── 頁面重設計（部分可平行）───────────────

  Thread C: Home + Auth（較簡單）
  Thread D: Controller + Display（較複雜）

Stage 4 ─── 收尾 ─────────────────────────────────

    ├── 全站硬編碼色值掃描確認為零（Clean Output #000000 除外）
    ├── 文檔更新對齊實際（requirements.md、milestones.md、changelog.md）
    ├── CLAUDE.md 專案說明更新
    └── 完整測試套件通過
```

### AI 開發工作流程（每個頁面）

1. **Pencil MCP 設計探索** — 建立 .pen 設計稿，取得 style guide，視覺驗證
2. **frontend-design Skill 實作** — 以設計稿為參考產出 production code
3. **TDD 紅綠燈** — 新元件/重構元件必須先寫失敗測試
4. **視覺驗證** — 開發伺服器確認實際效果

---

## 10. 測試策略

| 層級 | 覆蓋範圍 | 工具 |
|------|---------|------|
| 新增共用元件 | 全部 TDD | Vitest + Testing Library |
| 重構元件 | Toast 解耦、calcVisibleLines 提取 | Vitest |
| Token 安全 | Go Set-Cookie + 前端不碰 token + auth.ts 走 proxy | Go test + E2E |
| Clean Output | `?mode=clean` 無 UI、純黑背景 | Vitest + 手動視覺 |
| 動效 | 不做自動化測試 | 手動視覺確認 |
| 回歸 | `npm test` 全綠零 warning | CI |

---

## 11. Definition of Done

- [ ] 全站零硬編碼色值（`grep -rE "#[0-9a-fA-F]{6}" app/ components/ lib/` 結果僅有 Clean Output 的 `#000000`）
- [ ] `app/styles/tokens.ts` 已刪除
- [ ] `--color-void` 已修正為 HSL 格式
- [ ] Token 不在 JavaScript 可存取位置（HttpOnly cookie + 無 localStorage token）
- [ ] `lib/api/auth.ts` 透過 proxy 路徑呼叫，不直連 Go 後端
- [ ] Controller 主檔 < 200 行，拆為 8+ 獨立元件
- [ ] Display Clean Output 模式正常運作（純黑 + 僅歌詞 + WebSocket 同步）
- [ ] Display 斷線時 Clean Output 靜止歌詞、不顯示重連 UI
- [ ] 所有新元件有單元測試
- [ ] `npm test` 全綠、零 warning
- [ ] 文檔與實際程式碼對齊
- [ ] 動效在 Desktop Chrome + Safari 正常
- [ ] `--duration-base` 已全部遷移為 `--duration-normal`

---

## 12. 全站一致性規範

| 項目 | 規範 |
|------|------|
| 色彩 | 一律語意化 Tailwind class，禁止 hex/rgb（Clean Output `#000000` 除外） |
| 動效 | 一律使用 motion token CSS 變數，禁止魔術數字 |
| 斷點 | Mobile `<768px` / Tablet `768-1279px` / Desktop `≥1280px`（對應 Tailwind `md` / `xl` breakpoint） |
| 字體 | Orbitron（標題）/ Exo 2（內文）/ JetBrains Mono（等寬）— 不變 |
| Hover | 統一 Tailwind `hover:` class，禁止命令式 DOM 操作 |
| 無障礙 | 所有互動元件保留 `role`、`aria-*`、`focus-visible` ring |
| Runtime 動態色 | `displaySettings.highlightColor` 等使用者自訂值透過 inline `style` 設定 |

---

**文件版本**: 1.1
**最後更新**: 2026-03-16
