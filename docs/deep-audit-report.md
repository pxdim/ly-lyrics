# LY 歌詞即時顯示系統 — 深度架構審計報告

**審計日期：** 2026-03-20
**審計者：** Software Architect Agent (Claude Opus 4.6)
**程式碼基線：** commit `b6a850b` (main branch)

---

## 總覽

| 類別 | 發現數 | HIGH | MEDIUM | LOW |
|------|--------|------|--------|-----|
| A. 技術債 | 17 | 2 | 9 | 6 |
| B. 測試品質 | 5 | 1 | 3 | 1 |
| C. 前端效能 | 4 | 0 | 2 | 2 |
| D. 安全性 | 2 | 1 | 1 | 0 |
| E. Go 後端 | 3 | 1 | 1 | 1 |
| F. 文檔一致性 | 2 | 0 | 2 | 0 |
| G. UX / 無障礙 | 4 | 1 | 2 | 1 |
| H. i18n 完整度 | 2 | 1 | 1 | 0 |
| I. 型別安全 | 2 | 0 | 1 | 1 |
| J. 依賴健康 | 3 | 1 | 1 | 1 |
| **合計** | **44** | **8** | **23** | **13** |

---

## A. 技術債掃描

### A-1. TODO / FIXME / HACK / TEMP / WORKAROUND

**發現數：0**

未找到任何待辦標記。程式碼庫在這方面非常乾淨。

### A-2. `any` 類型使用

**發現數：2 處（僅在測試檔案中）** — LOW

| 檔案 | 行號 | 內容 |
|------|------|------|
| `lib/store/store-persist.test.ts` | 58 | `mockState as any` |
| `lib/store/store-persist.test.ts` | 92 | `mockState as any` |

**評估：** 僅出現在測試中，且有 `eslint-disable-next-line` 明確標註。生產程式碼零 `any`，表現優異。

### A-3. eslint-disable 註解

**發現數：8 處** — MEDIUM

| 檔案 | 行號 | 規則 | 風險 |
|------|------|------|------|
| `app/display/page.tsx` | 152 | `react-hooks/exhaustive-deps` | MEDIUM — 可能導致 stale closure |
| `app/display/page.tsx` | 161 | `react-hooks/exhaustive-deps` | MEDIUM — cleanup effect 缺少依賴 |
| `app/controller/page.tsx` | 98 | `react-hooks/exhaustive-deps` | MEDIUM — 初始化 effect 缺少依賴 |
| `lib/stt/web-speech-provider.test.ts` | 69 | `@typescript-eslint/no-this-alias` | LOW — 測試中合理 |
| `lib/store/store-persist.test.ts` | 57, 91 | `@typescript-eslint/no-explicit-any` | LOW — 測試中合理 |
| `lib/websocket/native-client.test.ts` | 33 | `@typescript-eslint/no-this-alias` | LOW — 測試中合理 |
| `components/controller/QuickSettings.tsx` | 217 | `@next/next/no-img-element` | LOW — data URL 不需 Next Image |

**建議：** 3 處 `react-hooks/exhaustive-deps` 抑制需要重新審視。Zustand action 作為穩定引用的假設是正確的，但應以 `useRef` 或明確的 `// 穩定引用` 註釋取代 eslint-disable。

### A-4. @ts-ignore / @ts-expect-error

**發現數：0** — 表現優異。

### A-5. 超過 300 行的大型檔案

**發現數：12 個檔案** — MEDIUM

| 檔案 | 行數 | 嚴重程度 | 建議 |
|------|------|----------|------|
| `lib/store/index.ts` | 604 | MEDIUM | 拆分為 `lyrics-slice.ts`、`websocket-slice.ts`、`display-slice.ts` |
| `components/controller/PlaylistPanel.tsx` | 471 | MEDIUM | 拆分列表/建立/編輯為子元件 |
| `components/controller/ControllerHeader.tsx` | 440 | MEDIUM | 拆分 QR popover、連線資訊為獨立元件 |
| `lib/lrc/parser.ts` | 420 | LOW | 功能性工具，內聚度高，可暫不拆分 |
| `components/controller/EnhancedHeader.tsx` | 403 | MEDIUM | 拆分佈局控制、狀態列為子元件 |
| `lib/errors/AppError.ts` | 383 | LOW | 錯誤定義類別，內聚度高 |
| `components/ui/Toast.tsx` | 383 | MEDIUM | 拆分 Toast 元件 vs ToastProvider/Context |
| `components/controller/SongLibrary.tsx` | 383 | MEDIUM | 拆分搜尋/排序/列表為子元件 |
| `app/display/page.tsx` | 321 | MEDIUM | 拆分全螢幕邏輯、連線邏輯為 custom hooks |
| `lib/schemas/index.ts` | 318 | LOW | Schema 定義，內聚度高 |
| `lib/websocket/native-client.ts` | 303 | LOW | WebSocket client，內聚度合理 |
| `components/controller/QuickSettings.tsx` | 302 | LOW | 接近閾值 |

**最需優先拆分的：**
1. `lib/store/index.ts` (604 行) — 使用 Zustand slice pattern 拆分
2. `components/controller/PlaylistPanel.tsx` (471 行) — UI 元件不應超過 300 行

### A-6. console 日誌遺留

**發現數：24 處** — MEDIUM

生產程式碼中有 24 處 `console.error`、`console.warn`、`console.debug` 呼叫。其中多數是合理的錯誤日誌（如 `layout-client.tsx` 的全域錯誤處理），但以下需要檢討：

| 檔案 | 問題 |
|------|------|
| `lib/websocket/native-client.ts` | 4 處 `console.debug` — 生產環境不應輸出 |
| `components/controller/SongLibrary.tsx` | 2 處 `console.error` — 應改用 Toast 通知使用者 |
| `components/controller/PlaylistPanel.tsx` | 5 處 `console.error` — 同上 |
| `components/ai-tracking/AudioInputSelector.tsx` | 1 處 `console.error` — 應改用 Toast |

**建議：** 引入一個 logger 工具（如 `lib/utils/logger.ts`），在生產環境抑制 debug/warn 層級輸出。

---

## B. 測試品質

### B-1. 測試數量

- **CLAUDE.md 記載：** 1053 個測試、70 個測試檔案
- **實際執行結果：** 1143 個測試、78 個測試檔案
- **差異：** +90 個測試、+8 個測試檔案

MEDIUM — 文檔已過時，需更新。

### B-2. 缺少測試的元件

**發現數：4 個元件** — MEDIUM

| 檔案 | 嚴重程度 | 說明 |
|------|----------|------|
| `components/StoreHydration.tsx` | LOW | 簡單的 hydration wrapper |
| `components/controller/LibraryPanel.tsx` | MEDIUM | 組合元件，含 dynamic import 邏輯 |
| `components/controller/ToggleRow.tsx` | LOW | 純 UI 元件 |
| `components/lyrics/LyricsLine.tsx` | MEDIUM | 歌詞行渲染元件，應覆蓋樣式邏輯 |

### B-3. 缺少測試的頁面

**發現數：7 個頁面** — HIGH

| 檔案 | 嚴重程度 |
|------|----------|
| `app/controller/page.tsx` | HIGH — 核心頁面，含複雜狀態初始化 |
| `app/display/layout.tsx` | LOW — layout wrapper |
| `app/layout-client.tsx` | LOW — 全域錯誤處理 |
| `app/layout.tsx` | LOW — root layout |
| `app/login/page.tsx` | MEDIUM — 認證流程 |
| `app/page.tsx` | LOW — 首頁 |
| `app/register/page.tsx` | MEDIUM — 認證流程 |

**注意：** `app/display/page.tsx` 有 `page.test.tsx`，但 `app/controller/page.tsx` 沒有。Controller page 是系統最複雜的頁面，包含 session code 生成、WebSocket 連線初始化、佈局邏輯等，應為高優先測試目標。

### B-4. Go 後端測試覆蓋率

| 套件 | 覆蓋率 | 嚴重程度 |
|------|--------|----------|
| `internal/handler` | 56.5% | MEDIUM — Handler 是 API 邊界，應 > 80% |
| `internal/validator` | 66.7% | MEDIUM — 驗證邏輯應接近 100% |
| `internal/redis` | 69.8% | MEDIUM |
| `internal/service` | 72.7% | LOW |
| `internal/ws` | 76.6% | LOW |
| `internal/provider` | 82.3% | OK |
| `internal/middleware` | 84.6% | OK |
| `internal/auth` | 89.0% | OK |
| `internal/config` | 100% | OK |
| `cmd/server` | 0% | LOW — 啟動碼，可接受 |
| `internal/server` | 0% | MEDIUM — 路由設定，應有整合測試 |

### B-5. 測試覆蓋率（前端）

未安裝 `@vitest/coverage-v8` 或 `@vitest/coverage-istanbul`，無法產出覆蓋率報告。

MEDIUM — 應安裝覆蓋率工具並納入 CI。

---

## C. 前端效能

### C-1. Build 輸出

Next.js 16.1.7 Turbopack build 成功。build 輸出未顯示 bundle 分析（需安裝 `@next/bundle-analyzer`）。

MEDIUM — 建議加入 bundle analyzer 確認 chunk 大小。

### C-2. Dynamic Import 使用

已使用 dynamic import 的元件：
- `LivePreview`, `QuickSettings`, `AiTrackingPanel`, `PlaylistPanel` (controller page)
- `AddSongModal` (SongLibrary)
- `LyricsSearchPanel` (AddSongModal)
- `PlaylistPanel` (LibraryPanel)

**應考慮懶載入但未使用的：** LOW
- `components/lrc/LrcDropZone.tsx` — 僅在匯入時需要
- `components/lyrics-search/` 下的元件 — 部分已透過 `LyricsSearchPanel` dynamic import 涵蓋

**評估：** Dynamic import 策略合理，關鍵大型元件已懶載入。

### C-3. useEffect 清理函式

全面檢查所有 useEffect，結論如下：

- **有正確 cleanup 的：** 大多數 effect 都有正確的 return cleanup（removeEventListener、clearTimeout、clearInterval）
- **無 cleanup 但合理的：**
  - `ThemeApplier.tsx:19` — 設定 DOM attribute，無需清理
  - `StoreHydration.tsx:15` — 一次性 rehydrate，無需清理
  - `SongLibrary.tsx:101` — 初始載入 effect，無需清理
  - `PlaylistPanel.tsx:70` — 初始載入 effect，無需清理
  - `LyricsDisplay.tsx:74` — scrollIntoView，無需清理
  - `CueGrid.tsx:35` — scrollIntoView，無需清理
  - `LyricsSearchInput.tsx:29` — focus，無需清理
  - `AddSongModal.tsx:65` — 狀態重置，無需清理

- **潛在問題：**
  - `lib/hooks/use-ai-tracking.ts:151` — `audioCaptureRef.current?.setGain()` 無 cleanup，但 gain 設定是冪等操作 — LOW

**評估：** 所有 addEventListener 都有對應的 removeEventListener，未發現記憶體洩漏風險。

### C-4. 重複的 media query 監聽

`components/controller/AddSongModal.tsx` 和 `components/lyrics/LyricsDisplay.tsx` 各自獨立實作了 `window.matchMedia("(max-width: 767px)")` 監聽，而系統已有 `lib/hooks/useIsMobile.ts` hook。

LOW — 應統一使用 `useIsMobile` hook，減少重複。

---

## D. 安全性

### D-1. CSP (Content-Security-Policy) 缺失

HIGH

`next.config.ts` 中未設定任何安全 headers（CSP、X-Frame-Options、X-Content-Type-Options 等）。雖然 `poweredByHeader: false` 已設定，但缺少：

```
Content-Security-Policy
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy
```

**建議：** 在 `next.config.ts` 中加入 `headers()` 函式，或在 Go 後端 middleware 中設定。

### D-2. XSS 攻擊面

在生產程式碼中未發現任何不安全的 HTML 注入方式、動態程式碼執行、直接 DOM innerHTML 操作。僅測試檔案中使用 `container.innerHTML` 進行斷言。

**評估：** 安全。無 XSS 攻擊面。

### D-3. WebSocket URL 硬編碼

MEDIUM

`next.config.ts:25` 硬編碼了 production WebSocket URL：
```typescript
return "wss://ly-go-backend-production.up.railway.app/ws";
```

雖然有環境變數的 fallback 邏輯，但硬編碼的 production URL 應改為必填的環境變數，避免部署到不同環境時遺漏。

---

## E. Go 後端

### E-1. 忽略 Redis 錯誤

HIGH — `backend/internal/ws/events.go` 中有 9 處 `_ = h.redisClient.SetSession(ctx, state)`

| 行號 | 說明 |
|------|------|
| 100, 243, 269, 292, 350, 417, 444 | `SetSession` 錯誤被靜默忽略 |
| 198 | `DeleteSession` 錯誤被靜默忽略 |
| 206 | `SetSession` 錯誤被靜默忽略 |

**風險：** Redis 連線中斷時，session 狀態將不一致，但不會產生任何日誌或告警。即使不中斷業務流程，至少應記錄 warning 層級日誌。

**Playlist service 中的 `_ = tx.Rollback()`（行 152, 162, 173, 216, 223）是合理的**，因為 rollback 通常在已有錯誤的情況下呼叫，再次失敗無法處理。

### E-2. log.Println 使用

LOW — 僅在 ent 生成的 `client.go` 中出現（`log.Println`），這是 ORM 框架的預設行為，非手動程式碼。

### E-3. go vet

通過，無任何警告。

---

## F. 文檔一致性

### F-1. 測試數量不一致

MEDIUM

| 來源 | 測試檔案數 | 測試案例數 |
|------|-----------|-----------|
| `CLAUDE.md` | 70 | 1053 |
| 實際 `npx vitest run` | 78 | 1143 |

**需更新：** `CLAUDE.md` 中的測試數量。

### F-2. Milestones 狀態

MEDIUM

`docs/milestones.md` 標記 M4 為已完成，並記載「測試從 285 增至 1053（70 個測試檔案）」，但實際已達 1143/78。M6 備註中的「待完成」項目（準確率量測報告、回應時間基準測試）狀態需確認是否仍為待辦。

---

## G. UX / 無障礙

### G-1. aria-* 屬性使用

24 處 `aria-*` 屬性分布在 12 個檔案中。主要集中在：
- `AiTrackingPanel.tsx` (4 處)
- `LyricsControl.tsx` (4 處)
- `Spinner.tsx` (2 處)
- `Toast.tsx` (1 處)
- `AudioInputSelector.tsx` (2 處)
- `ToggleRow.tsx` (2 處)

HIGH — 許多互動元件缺少 aria 屬性：

| 元件 | 缺少的無障礙屬性 |
|------|------------------|
| `PlaylistPanel.tsx` | 清單項目缺少 `aria-label`，刪除按鈕缺少確認角色 |
| `SongLibrary.tsx` | 搜尋輸入框缺少 `aria-label` |
| `EnhancedHeader.tsx` | 多個 icon button 只有 `title`，缺少 `aria-label` |
| `ControllerHeader.tsx` | 同上 |
| `AddSongModal.tsx` | Modal 缺少 `role="dialog"` 和 `aria-modal="true"` |
| `LyricsPreviewModal.tsx` | 同上 |
| `ConfirmDialog.tsx` | 同上（有 ESC 處理但缺少 ARIA role） |

### G-2. `<img>` alt 屬性

所有 `<img>` 標籤（僅 1 處，在 `QuickSettings.tsx`）都有 `alt` 屬性。通過。

### G-3. tabIndex 使用

僅 2 個生產元件使用 `tabIndex`：
- `LrcDropZone.tsx` (tabIndex=0)
- `ToggleRow.tsx` (tabIndex=0)

LOW — 其餘互動元素（如歌詞行點擊、設定切換）應考慮添加 tabIndex 以支援鍵盤導航。

### G-4. onKeyDown 處理

僅 4 個檔案有 `onKeyDown` handler，且主要是搜尋框的 Enter 鍵處理。

MEDIUM — 大量點擊操作（如歌詞行選擇、播放清單選歌）缺少鍵盤等效操作。

---

## H. i18n 完整度

### H-1. 語言檔案 Key 數量 vs 使用量

- **zh-TW.json key 數量：** 253
- **`t(` 呼叫：** 1912 處（包含測試中的 mock）
- **使用 `useTranslations` 的生產元件：** 僅 5 個（ControllerHeader, EnhancedHeader, display/page, register/page, login/page, QuickSettings）

HIGH — 大量元件仍使用硬編碼中文字串，i18n 遷移進度極低。

### H-2. 硬編碼中文字串（非測試、非註解）

**發現數：82 處** — MEDIUM

主要分布：

| 元件 | 硬編碼中文數 | 範例 |
|------|-------------|------|
| `components/controller/PlaylistPanel.tsx` | 10+ | 「返回播放清單」「刪除播放清單」「確定要刪除此播放清單嗎？」 |
| `components/lyrics-search/LyricsSearchInput.tsx` | 6+ | 「歌曲名」「歌手」「歌詞」 |
| `components/lyrics-search/LyricsResultCard.tsx` | 5+ | 「酷狗」「網易雲」「咪咕」 |
| `components/ui/Toast.tsx` | 5+ | 「錯誤」「成功」「警告」「提示」 |
| `components/ui/ConfirmDialog.tsx` | 2 | 「確認」「取消」 |
| `components/ui/ErrorBoundary.tsx` | 1 | 「發生未預期的錯誤」 |
| `components/display/ConnectionIndicator.tsx` | 3 | 「已連接」「重連中」「已離線」 |
| `components/controller/MobileTabBar.tsx` | 3 | 「歌曲」「歌詞」「設定」 |
| `components/controller/DashboardCard.tsx` | 2 | 「最小化」「最大化」 |
| `components/lyrics/LyricsControl.tsx` | 2 | 「退出全螢幕」「全螢幕」 |
| `components/lyrics/ControlModeToggle.tsx` | 2 | 「切換為手動模式」「切換為自動模式」 |

**評估：** `CLAUDE.md` 已記載「元件中的硬編碼字串尚未替換為 `t()` 呼叫」，這是已知的技術債。但既然 `messages/*.json` 已有 253 個 key，應優先遷移上述元件。

---

## I. 型別安全

### I-1. `as unknown as` 強制轉型

**發現數：5 處（全在測試中）** — LOW

用於 mock 物件的型別轉換，在測試中是合理的做法。生產程式碼中零處使用。

### I-2. 非空斷言 `!.`

**發現數：30+ 處** — MEDIUM

- **測試中：** 約 25 處，用於斷言前的 `result!.lineIndex`，合理。
- **生產中：** 2 處在 `lib/stt/web-speech-provider.ts`（行 108, 113），`this.recognition!` 可能在初始化失敗時拋出。

**建議：** `web-speech-provider.ts` 中的 `this.recognition!` 應改為 null check + 提早返回。

### I-3. tsconfig.json 嚴格設定

**評估：** 非常嚴格，表現優異。

已啟用的嚴格選項：
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride: true`
- `allowUnusedLabels: false`
- `allowUnreachableCode: false`
- `exactOptionalPropertyTypes: true`
- `noFallthroughCasesInSwitch: true`
- `noImplicitReturns: true`
- `noPropertyAccessFromIndexSignature: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

這是我見過最嚴格的 TypeScript 設定之一。

---

## J. 依賴健康

### J-1. 過時套件

HIGH — 以下套件有重大版本更新：

| 套件 | 當前版本 | 最新版本 | 風險 |
|------|----------|----------|------|
| `tailwindcss` | 3.4.19 | 4.2.2 | HIGH — 大版本升級，API 變更大 |
| `eslint` | 9.39.4 | 10.0.3 | MEDIUM — 大版本升級 |
| `husky` | 8.0.3 | 9.1.7 | MEDIUM — 大版本，設定方式改變 |
| `@types/node` | 22.19.15 | 25.5.0 | LOW — 型別定義 |
| `jsdom` | 28.1.0 | 29.0.0 | LOW — 測試依賴 |
| `eslint-config-next` | 15.5.12 | 16.2.0 | LOW — 應隨 Next.js 版本升級 |

**建議：**
1. Tailwind CSS 4 是破壞性變更，需獨立評估遷移成本
2. Husky 9 遷移相對簡單，建議優先處理
3. `eslint-config-next` 應升級至 16.x 以匹配 Next.js 16

### J-2. 小版本可更新

| 套件 | 當前 | 可用 |
|------|------|------|
| `next` | 16.1.7 | 16.2.0 |
| `zustand` | 5.0.11 | 5.0.12 |
| `react-resizable-panels` | 4.7.2 | 4.7.3 |
| `@vitejs/plugin-react` | 5.1.4 | 5.2.0 |

MEDIUM — 建議定期更新 patch/minor 版本。

### J-3. 前端覆蓋率工具缺失

LOW — `devDependencies` 中缺少 `@vitest/coverage-v8`，導致無法產出覆蓋率報告。

---

## 修復優先順序建議

### 立即處理（1-2 週）

| 優先 | 項目 | 影響 |
|------|------|------|
| P0 | D-1: 設定 CSP security headers | 安全性 |
| P0 | E-1: Go 後端 Redis 錯誤處理 | 可靠性 — session 狀態靜默丟失 |
| P0 | B-3: 為 `app/controller/page.tsx` 補寫測試 | 核心頁面無測試 |

### 短期處理（2-4 週）

| 優先 | 項目 | 影響 |
|------|------|------|
| P1 | H-1/H-2: 完成 i18n 遷移（至少核心元件） | 國際化 |
| P1 | A-5: 拆分 `lib/store/index.ts` (604行) | 可維護性 |
| P1 | G-1: 為 Modal 元件加入 ARIA role | 無障礙 |
| P1 | F-1: 更新 CLAUDE.md 測試數量 | 文檔準確性 |
| P1 | A-6: 引入 logger 工具替換 console.* | 日誌管理 |
| P1 | J-1: 升級 husky 至 9.x | 依賴健康 |
| P1 | B-5: 安裝前端覆蓋率工具 | 測試品質可見性 |

### 中期處理（1-2 月）

| 優先 | 項目 | 影響 |
|------|------|------|
| P2 | A-5: 拆分大型元件（PlaylistPanel, ControllerHeader 等） | 可維護性 |
| P2 | A-3: 消除 react-hooks/exhaustive-deps 抑制 | 程式碼品質 |
| P2 | J-1: 評估 Tailwind CSS 4 遷移 | 依賴現代化 |
| P2 | D-3: WebSocket URL 硬編碼改為環境變數 | 部署彈性 |
| P2 | B-4: 提升 Go handler 測試覆蓋率至 80%+ | 後端品質 |
| P2 | G-4: 增加鍵盤操作支援 | 無障礙 |
| P2 | B-2: 補齊 LibraryPanel、LyricsLine 測試 | 測試覆蓋 |

---

## 架構層面的正面評價

在提出改進建議之前，值得肯定以下做得很好的地方：

1. **TypeScript 嚴格設定**：啟用了幾乎所有嚴格選項，生產程式碼零 `any`、零 `@ts-ignore`
2. **安全基礎**：無不安全 HTML 注入、無動態程式碼執行、無直接 DOM innerHTML 操作
3. **零 TODO/FIXME**：程式碼庫中沒有遺留的待辦事項
4. **Effect cleanup**：所有 addEventListener 都有對應的 removeEventListener
5. **Dynamic import 策略**：關鍵大型元件已正確懶載入
6. **Go 後端**：go vet 通過、核心模組覆蓋率 70-89%、無生產日誌殘留
7. **測試數量**：1143 個測試案例、78 個測試檔案，展現了對測試品質的重視
8. **i18n 語言檔一致性**：三個語言檔案行數完全一致（315 行），key 對齊

---

*此報告基於程式碼庫的靜態分析產出。建議搭配手動 code review 和 runtime profiling 進行更深入的評估。*
