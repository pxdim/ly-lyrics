# LY 效能評估報告

## 日期：2026-03-19

## 測試環境

| 項目 | 規格 |
|------|------|
| Next.js | 15.5.13（報告產出時版本，後已升級至 16.1.7。數據基於升級前量測，但 bundle 大小已因 dynamic import 優化而改善） |
| Build 工具 | Turbopack (dev) / Webpack (prod) |
| Go 後端 | WebSocket Hub (port 8080) |
| 量測方式 | 靜態分析 + Build Output 量測 |

---

## NFR1.2: 頁面載入時間 < 2s

### Build Output 量測結果

| 頁面 | 頁面大小 (Size) | First Load JS | 評估 |
|------|----------------|---------------|------|
| `/` (首頁) | 161 B | 106 kB | 達標 |
| `/controller` | 567 kB | 675 kB | 需關注 |
| `/display` | 6.27 kB | 114 kB | 達標 |
| `/login` | 2.5 kB | 108 kB | 達標 |
| `/register` | 2.61 kB | 108 kB | 達標 |
| Shared JS (所有頁面共用) | — | 102 kB | — |

### Controller 頁面 Bundle 分析 (567 kB)

Controller 頁面是整個應用中最大的頁面，其 First Load JS 達 675 kB。以下為主要依賴估算：

| 依賴 | node_modules 大小 | 使用位置 | tree-shake 友善度 |
|------|-------------------|----------|-------------------|
| `lucide-react` | 45 MB (raw) | 10 個檔案各匯入 1 個圖示 | 高（named import，可 tree-shake） |
| `opencc-js` | 5.5 MB (raw，含字典檔) | 1 個檔案 (`chinese-converter.ts`) | 低（字典檔無法 tree-shake） |
| `zod` | 6.0 MB (raw) | 驗證層 | 中（v4 改善） |
| `@dnd-kit` | 2.2 MB (raw) | 2 個檔案 (SortableSongItem) | 中 |
| `react-resizable-panels` | 516 KB (raw) | 1 個檔案 (controller/page.tsx) | 高 |
| `qrcode.react` | 136 KB (raw) | 1 個檔案 (QRCodePanel) | 高 |
| `zustand` | 252 KB (raw) | 全域 store | 高 |

### Code Splitting 分析

| 技術 | 使用情況 |
|------|----------|
| `next/dynamic()` | 未使用 |
| `React.lazy()` | 未使用 |
| `<Suspense>` | 僅 Display 頁面使用（包裹 `useSearchParams`，非效能用途） |
| Route-based splitting | Next.js App Router 自動啟用（各頁面獨立 chunk） |

### 評估

- **Display 頁面（核心使用者體驗）: 達標**。114 kB First Load JS 在 3G 網路下約 0.9s 傳輸時間，加上解析和渲染，預估 < 2s。
- **Controller 頁面: 需關注**。675 kB First Load JS 在 3G 網路 (1.6 Mbps) 下光傳輸就需約 3.4s，超過 2s 目標。在 4G/WiFi 環境下可達標。
- **根本原因**: Controller 頁面將所有子元件（LibraryPanel、CueGrid、LivePreview、QuickSettings、QRCodePanel、AiTrackingPanel）同步載入，缺乏 `next/dynamic` 懶載入機制。

### 優化建議

1. **P0 — Controller 頁面使用 `next/dynamic` 懶載入**
   - `QRCodePanel`、`AiTrackingPanel`、`QuickSettings` 不在首屏渲染，應改為動態匯入
   - 預估可減少 100-150 kB First Load JS
2. **P1 — opencc-js 按需載入**
   - 繁簡轉換非首屏需求，應 `dynamic import` 推遲至使用者啟用時載入
   - 字典檔 (~200 kB gzip 後) 可顯著延遲載入
3. **P2 — 考慮 `@next/bundle-analyzer` 精確分析**
   - 安裝 `@next/bundle-analyzer` 取得視覺化 treemap，精確定位大型 chunk

---

## NFR1.4: AI 辨識回應時間 < 1s

### 處理流程延遲分析

```
AudioCapture.onAudioData() → STTProvider.sendAudio()  →  STT 雲端辨識  → onTranscript()
        [< 1ms]                  [< 1ms]                [200-800ms]        [< 1ms]
                                                              ↓
                                              matchLyrics() → jumpToLine()
                                              [< 5ms CPU]      [< 1ms]
```

| 環節 | 延遲估算 | 來源 |
|------|----------|------|
| AudioCapture 取樣 | < 1ms | 本地 Web Audio API，即時串流 |
| sendAudio 傳輸 | < 1ms | 將 Float32Array 放入 WebSocket send buffer |
| STT 雲端辨識 (Deepgram/Gemini) | 200-800ms | 網路往返 + 模型推理，為主要瓶頸 |
| matchLyrics CPU 計算 | < 5ms | LCS 演算法（見下方分析） |
| jumpToLine 狀態更新 | < 1ms | Zustand store 同步更新 |
| WebSocket 廣播至 Display | < 50ms | 區域網路 WebSocket 傳輸 |
| **端到端總延遲** | **250-860ms** | — |

### LyricsMatcher 演算法複雜度分析

`lcsRatio(a, b)` 使用字元級 LCS（最長公共子序列）：
- **時間複雜度**: O(m * n)，m 和 n 分別為 STT 文字長度與歌詞行長度
- **空間複雜度**: O(n)，已優化為僅保留兩行陣列（非完整 DP 表）
- **典型輸入規模**: STT 片段 ~10-30 字元，歌詞行 ~10-50 字元
- **滑動視窗**: `windowBefore=2`, `windowAfter=5`，正常比對僅需計算 8 行的 LCS
- **全曲掃描**: 最差情況需掃描全部歌詞行（~50-100 行），但門檻提高至 0.7 可快速排除
- **實測估算**: 100 行歌詞 x 30 字元 STT x 50 字元歌詞 = 150,000 次比較，現代 CPU 上 < 5ms

### Cooldown 機制

- 手動操作後設有 5000ms 冷卻期（`cooldownMs`），期間忽略 AI 跳轉
- 避免人工切換與 AI 辨識衝突，但不影響辨識延遲本身

### 評估

- **達標（條件性）**: 端到端延遲 250-860ms 在理想網路環境下可滿足 < 1s 目標。
- **主要風險**: STT 雲端辨識延遲佔比超過 80%，取決於：
  - STT Provider 的伺服器位置與網路延遲
  - 中文辨識模型的推理速度
  - Interim result（非 final）目前不觸發 jumpToLine（`if (!isFinal) return;`），若啟用 interim 比對可將感知延遲降至 200-400ms
- **本地計算無瓶頸**: `matchLyrics` 在所有合理輸入規模下均 < 5ms

### 優化建議

1. **P0 — 啟用 interim transcript 比對**
   - 目前 `handleTranscript` 在 `isFinal=false` 時直接 return，浪費了 interim 結果
   - 可對 interim text 進行「試探性比對」，降低感知延遲至 200-400ms
2. **P1 — STT Provider 區域選擇**
   - 確保 STT WebSocket 端點選擇最近區域（如 Deepgram 的 `global` 端點）
3. **P2 — LRC 時間戳輔助精度**
   - 已實作 timestamp-aware 視窗擴展，可進一步縮小全曲掃描頻率

---

## NFR2.3: 同時連線 10+ 裝置

### WebSocket Hub 架構分析

```
┌─────────────────────────────────────────────┐
│                    Hub                       │
│                                             │
│  clients: map[*Client]bool                  │
│  sessions: map[string]map[*Client]bool      │
│  register/unregister: chan *Client           │
│  broadcast: chan *SessionBroadcast (buf=256) │
│                                             │
│  Run() — 單一 goroutine 主迴圈              │
│    ├─ register: 新增 client                 │
│    ├─ unregister: 移除 client + 清理 session│
│    └─ broadcast: fan-out 到 session 內 client│
└─────────────────────────────────────────────┘
         ↑           ↑           ↑
    ┌────┴───┐  ┌────┴───┐  ┌────┴───┐
    │Client 1│  │Client 2│  │Client N│
    │send:256│  │send:256│  │send:256│
    │ReadPump│  │ReadPump│  │ReadPump│
    │WritePmp│  │WritePmp│  │WritePmp│
    └────────┘  └────────┘  └────────┘
```

### 每個 Client 資源佔用

| 資源 | 大小 | 說明 |
|------|------|------|
| `send` channel buffer | 256 x []byte | 最大 256 筆待發送訊息 |
| 單則訊息最大值 | 32 KB (`maxMessageSize`) | WebSocket 讀取限制 |
| goroutines | 2 個 (ReadPump + WritePump) | 每個 client 獨立讀寫 |
| WebSocket 連線 | 1 個 TCP 連線 | 含心跳 (30s ping) |
| Client struct 記憶體 | ~200 bytes | id, sessionID, role, pointers |
| **單 client 理論最大記憶體** | **~8.2 MB** | 256 x 32KB (send buffer 全滿極端情況) |
| **單 client 典型記憶體** | **~10-50 KB** | 正常運作下 send buffer 幾乎為空 |

### 並發能力評估

| 指標 | 數值 | 說明 |
|------|------|------|
| **Client 上限** | 無硬性限制 | Hub 使用 map，無容量上限 |
| **Session 內 client 上限** | 無硬性限制 | 同上 |
| **廣播機制** | 非阻塞 fan-out | `select { case client.send <- msg: default: }` |
| **溢位處理** | 自動清理 | send buffer 滿的 client 被移除，避免阻塞整個 Hub |
| **鎖策略** | `sync.RWMutex` | 讀寫分離鎖，廣播用 RLock，增刪用 Lock |
| **broadcast buffer** | 256 | Hub 的 broadcast channel 緩衝 |
| **寫入逾時** | 10s | 單則訊息寫入超過 10s 則放棄 |

### 10 裝置場景估算

| 項目 | 估算 |
|------|------|
| 總 goroutines | 10 client x 2 = 20 + 1 Hub = 21 |
| 總記憶體 | 10 x 50 KB = ~500 KB（典型） |
| 廣播延遲 | < 1ms（10 個 client 的 channel send） |
| 網路頻寬 | 歌詞切換訊息 ~100-500 bytes/次，10 client x 500B = ~5 KB/次 |

### 潛在瓶頸

1. **Hub 單 goroutine 序列化**: 所有 register/unregister/broadcast 事件經由單一 goroutine 處理。在 10 裝置規模完全不是問題，但在 1000+ 裝置時可能成為瓶頸。
2. **broadcast channel buffer=256**: 若短時間內大量訊息（如快速切歌），可能堵塞。10 裝置場景下不可能觸發。
3. **無 session 內 client 數量限制**: 設計上不限制，但也意味著缺乏惡意連線保護。

### 評估

- **達標**: 架構設計完全能支撐 10+ 裝置同時連線，理論上限在數千級別。
- **Go goroutine 模型**使每個 client 僅佔 ~8 KB stack，10 個 client 的開銷微乎其微。
- **建議**: 進行實際負載測試（如使用 `k6` 的 WebSocket 模組）以取得精確數據。

### 優化建議

1. **P1 — 增加 session client 數量上限**
   - 防止惡意連線耗盡伺服器資源，建議限制每 session 最多 50 個 client
2. **P2 — 增加連線速率限制**
   - 防止短時間內大量 WebSocket 連線建立（DoS 攻擊）
3. **P3 — 考慮 WebSocket 壓縮**
   - 對於歌詞資料較大的場景，啟用 permessage-deflate 壓縮

---

## NFR5.3: 320px - 4K 響應式設計

### Tailwind 斷點使用統計

| 斷點 | 使用次數 (components/) | 使用次數 (app/) | 總計 |
|------|----------------------|-----------------|------|
| `sm:` | 1 (Spinner size variant) | 8 | 9 |
| `md:` | 12 | 4 | 16 |
| `lg:` | 1 | 0 | 1 |
| `xl:` | 1 | 0 | 1 |
| `2xl:` | 0 | 0 | 0 |

### 響應式策略分析

| 機制 | 實作狀態 | 說明 |
|------|----------|------|
| **JS 裝置偵測** | 已實作 | `useIsMobile` (< 768px)、`useIsTablet` (768-1280px) |
| **三級 RWD 佈局** | 已實作 | Controller 頁面：桌面三欄 / 平板雙欄 / 手機 Tab 分頁 |
| **CSS 斷點響應式** | 部分實作 | `sm:`, `md:` 有使用，`lg:`, `xl:`, `2xl:` 幾乎未使用 |
| **Viewport meta** | 間接設定 | Next.js 自動產生 viewport meta，layout.tsx 設有 `theme-color` |
| **最小寬度支援 (320px)** | 未明確驗證 | 無 `min-w-[320px]` 或相關 media query |

### Tailwind 斷點配置

Tailwind 配置 (`tailwind.config.ts`) 未自訂 `screens`，使用 Tailwind v3 預設值：

| 斷點 | 寬度 | 對應裝置 |
|------|------|----------|
| `sm` | 640px | 大手機（橫向） |
| `md` | 768px | 平板 |
| `lg` | 1024px | 小桌面 |
| `xl` | 1280px | 桌面 |
| `2xl` | 1536px | 大桌面 / 4K |

### JS 斷點 vs CSS 斷點不一致

| 偵測方式 | Mobile 切點 | Tablet 切點 | 備註 |
|----------|-------------|-------------|------|
| `useIsMobile` (JS) | < 768px | — | 與 Tailwind `md:` 一致 |
| `useIsTablet` (JS) | — | 768-1280px | 與 Tailwind `xl:` 一致 |
| Tailwind CSS | `md:` 768px | `lg:` 1024px | CSS 和 JS 的 tablet/desktop 切點不同 |

JS hook 中 tablet 上界為 1280px（`xl`），而 Tailwind 預設 `lg` 為 1024px，兩者定義有差異。Controller 頁面主要透過 JS hook 而非 CSS 斷點控制佈局切換，因此實際行為一致，但開發者認知上可能混淆。

### 覆蓋程度評估

| 範圍 | 覆蓋度 | 說明 |
|------|--------|------|
| **320px (最小手機)** | 中等 | 手機版有 Tab 分頁佈局，但未針對 320px 做微調 |
| **375-428px (主流手機)** | 良好 | `useIsMobile` 觸發手機專用佈局 |
| **768-1024px (平板)** | 良好 | `useIsTablet` 觸發雙欄佈局 |
| **1280px+ (桌面)** | 良好 | 三欄佈局 + resizable panels |
| **2560px+ (2K)** | 未驗證 | 無 `2xl:` 斷點使用，可能留白過多 |
| **3840px (4K)** | 未驗證 | 字體未使用相對單位上限，可能偏小 |

### Display 頁面特殊考量

Display 頁面作為投影輸出端，覆蓋 320px-4K 更為關鍵：
- 使用 `sm:`, `md:` 斷點調整間距與字體大小
- 歌詞字體有獨立 scale (`lyrics-xs` 到 `lyrics-4xl`)
- Clean Output 模式 (`?mode=clean`) 為全螢幕黑底白字，天然適配所有解析度

### 評估

- **部分達標**: 320px-1280px 範圍覆蓋良好，但 2K-4K 高解析度端缺乏驗證和針對性適配。
- **優點**: Controller 三級佈局（手機/平板/桌面）設計完善，使用 JS hook 確保佈局切換正確。
- **不足**: CSS 斷點使用偏少（僅 `sm:` 和 `md:` 為主），高解析度端（`xl:`, `2xl:`）幾乎沒有針對性樣式。

### 優化建議

1. **P1 — 增加 320px 最小寬度測試**
   - 使用 Playwright 或手動測試驗證 320px 寬度下無水平捲動、無文字溢出
2. **P1 — 增加 2K/4K 適配**
   - Display 頁面的歌詞字體在 4K 解析度下可能偏小，考慮使用 `2xl:` 斷點增大字體
   - Controller 三欄佈局在 4K 下可能留白過多，考慮設定 `max-w-screen-2xl` 居中
3. **P2 — 統一 JS/CSS 斷點定義**
   - 在 `tailwind.config.ts` 中新增自訂 `screens` 使其與 JS hook 斷點一致
   - 或將 Controller 佈局從 JS hook 改為純 CSS 斷點控制

---

## 總結

| NFR | 目標 | 狀態 | 說明 |
|-----|------|------|------|
| NFR1.2 頁面載入 | < 2s | 條件性達標 | Display 達標；Controller (675 kB) 在慢速網路下可能超標 |
| NFR1.4 AI 辨識 | < 1s | 條件性達標 | 端到端 250-860ms，取決於 STT Provider 網路延遲 |
| NFR2.3 並發連線 | 10+ | 達標 | Hub 架構可輕鬆支撐數百連線，10 裝置無壓力 |
| NFR5.3 響應式 | 320px-4K | 部分達標 | 320px-1280px 良好，2K-4K 端缺乏驗證 |

### 高優先順序行動項目

| 優先級 | 項目 | 預估效益 |
|--------|------|----------|
| P0 | Controller 頁面 `next/dynamic` 懶載入 | First Load JS 減少 100-150 kB |
| P0 | 啟用 AI interim transcript 比對 | 感知延遲降至 200-400ms |
| P1 | opencc-js 動態匯入 | 減少字典檔同步載入開銷 |
| P1 | 320px 最小寬度 E2E 測試 | 確保極小螢幕無破版 |
| P1 | 2K/4K Display 字體適配 | 高解析度投影體驗提升 |
| P2 | `@next/bundle-analyzer` 精確分析 | 定位其他大型依賴 |
| P2 | WebSocket 負載測試 (k6) | 取得精確並發數據 |

---

*報告產出方式：Build Output 靜態分析 + 原始碼架構審查*
*建議下一步：安裝 `@next/bundle-analyzer` 進行精確 bundle 分析，並使用 Lighthouse CI 取得實測 Core Web Vitals 數據*
