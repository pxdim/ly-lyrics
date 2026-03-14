# US8: AI 聽歌辨識 — 即時語音辨識自動跟歌詞

## 目標

讓系統在現場演出中「聽」音樂，透過即時語音辨識（STT）自動追蹤歌手唱到哪一句，自動控制歌詞顯示——不需要有人手動操作 Controller。

## 核心設計原則

**AI 是 Controller 的「自動操作員」**——它做的事跟人按鍵盤一模一樣（呼叫 `store.jumpToLine()`），只是觸發來源從人變成演算法。Display 端零改動。

---

## 架構總覽

```
Controller 瀏覽器
  ├── AudioCapture 模組：Web Audio API 擷取音訊（麥克風/Line-in/系統音訊）
  │     └── 音量視覺化 + Gain 控制
  ├── STT Provider 模組：音訊串流 → Deepgram（透過後端 proxy）→ 即時文字
  ├── LyricsMatcher 模組：辨識文字 + 滑動視窗 + LRC 時間戳輔助 → 匹配行索引
  └── 匹配成功 → 呼叫現有 store.jumpToLine() → WebSocket change_line

Go 後端
  └── GET /api/stt/token — 回傳 Deepgram API key（RequireAuth 保護，不暴露給未認證用戶）
      前端取得 key 後直接連線 Deepgram WebSocket（wss://api.deepgram.com/v1/listen）

Display 端
  └── 零改動（收 line_changed 就顯示，不管來源是人還是 AI）
```

---

## 設計決策

| 決策 | 選擇 | 理由 |
|------|------|------|
| 音訊來源 | 多來源支援，使用者選擇 | 現場環境多樣：麥克風、混音器 Line-in、人聲獨立軌都可能 |
| STT 引擎 | Deepgram 為預設，抽象 provider interface | 保留切換到 Gemini/Whisper/其他模型的能力 |
| 歌詞比對 | 滑動視窗 + LCS 模糊比對 + LRC 時間戳輔助 | 處理重複副歌、部分辨識、跳段等情境 |
| AI vs 手動 | 手動優先覆蓋 + 5 秒冷卻 + 一鍵開關 | 現場最怕 AI 跟人搶控制權 |
| 處理位置 | 全在前端，後端只做 API key proxy | 延遲最低、架構最乾淨、後端改動最少 |
| Provider 設定 | 前端設定頁面可切換模型 + 輸入 API key | 使用者未來可自行切換或接入自訓練模型 |

---

## 模組拆分與檔案結構

### 前端新增

```
lib/audio/
  audio-capture.ts          — Web Audio API 擷取 + GainNode + AnalyserNode 音量分析
  audio-capture.test.ts     — 單元測試（~8 cases）

lib/stt/
  types.ts                  — STTProvider interface 定義
  deepgram-provider.ts      — Deepgram 即時串流實作
  stt-provider.test.ts      — provider 測試（~6 cases）

lib/ai-tracking/
  lyrics-matcher.ts         — 滑動視窗 + LCS 模糊比對 + LRC 時間戳輔助
  lyrics-matcher.test.ts    — 比對演算法測試（~15 cases，核心邏輯）
  tracking-engine.ts        — 整合引擎：AudioCapture → STT → Matcher → store action
  tracking-engine.test.ts   — 整合測試（~8 cases）

components/ai-tracking/
  AiTrackingPanel.tsx        — Controller 裡的 AI 監聽面板（開關 + 音量 + 狀態）
  AudioInputSelector.tsx     — 音訊來源選擇 + Gain slider + 音量動畫
  AiStatusIndicator.tsx      — 即時狀態指示燈
```

### 後端新增

```
backend/internal/handler/stt.go     — GET /api/stt/token endpoint
backend/internal/config/config.go   — 新增 DEEPGRAM_API_KEY 環境變數
```

### 職責分離

- `audio-capture` 只管「聲音進來」，不知道 STT 的存在
- `stt/` 只管「音訊變文字」，不知道歌詞的存在
- `lyrics-matcher` 只管「文字找行數」，不知道音訊的存在
- `tracking-engine` 串接以上三者，是唯一知道全流程的模組

---

## 型別定義與 Store 整合

### 更新 AiListeningState（types/index.ts）

取代現有的 `AiListeningState` 和 `AudioInput` 型別：

```typescript
type STTProviderType = "deepgram" | "gemini" | "whisper" | "custom";

type AiTrackingStatus = "idle" | "listening" | "matched" | "cooldown" | "error";

interface AiTrackingState {
  isActive: boolean;                    // AI 監聽開關
  status: AiTrackingStatus;            // 當前狀態
  confidence: number;                   // 最近一次匹配信心度（0-1）
  lastMatchedLine: number | null;       // 最近匹配到的行索引
  cooldownUntil: number | null;         // 冷卻結束時間戳（ms），null = 非冷卻中
  sttProvider: STTProviderType;         // 當前使用的 STT 引擎
  errorMessage: string | null;          // 錯誤訊息
}

interface AiTrackingSettings {
  sttProvider: STTProviderType;
  apiKey: string | null;                // 使用者自行輸入的 API key（null = 用伺服器端的）
  confidenceThreshold: number;          // 預設 0.6
  windowBefore: number;                 // 預設 2
  windowAfter: number;                  // 預設 3
  manualOverrideCooldown: number;       // 預設 5000ms
  fullScanThreshold: number;            // 預設 0.8
}

interface AudioInputState {
  deviceId: string | null;              // 選擇的音訊設備 ID
  gain: number;                         // 0-20 dB（store 存 dB 值，AudioCapture 用 Math.pow(10, dB/20) 轉線性值給 GainNode）
  volume: number;                       // 即時音量 0-1
  isCapturing: boolean;
}
```

### Zustand Store 新增（lib/store/index.ts）

新增 state 欄位（嵌入現有 store，不建獨立 store）：

```typescript
// 新增 State
aiTracking: AiTrackingState;
aiSettings: AiTrackingSettings;
audioInput: AudioInputState;

// 新增 Actions
startAiTracking: () => void;           // 啟動 AI 監聽
stopAiTracking: () => void;            // 停止 AI 監聽
updateAiStatus: (status: AiTrackingStatus, confidence?: number, matchedLine?: number) => void;
triggerManualOverride: () => void;      // 手動介入，啟動冷卻
updateAudioInput: (partial: Partial<AudioInputState>) => void;
updateAiSettings: (partial: Partial<AiTrackingSettings>) => void;
```

AI tracking 設定使用 `persist` middleware 持久化到 localStorage。需在現有 store 的 `partialize` 函式中加入 `aiSettings`（與 `displaySettings`、`role`、`userId` 同級）。

### 手動 vs AI 操作區分

**核心問題：** `jumpToLine()` 被 AI 和手動操作共用，如何避免 AI 觸發自己的冷卻？

**解法：** TrackingEngine 維護一個內部 flag `_isAiAction`。

```
手動操作（鍵盤/點擊）
  → Controller UI 呼叫 store.nextLine() / jumpToLine()
  → Controller UI 同時呼叫 trackingEngine.onManualOverride()
  → TrackingEngine 設定冷卻 timer

AI 操作
  → TrackingEngine 內部設定 _isAiAction = true
  → 呼叫 store.setCurrentIndex(matchedLine)
  → _isAiAction = false
  → 不觸發冷卻
```

Controller 的鍵盤/點擊 handler 需要在呼叫 store action 的同時通知 TrackingEngine。透過在 Controller 中 import TrackingEngine 實例，在現有的 onClick/onKeyDown handler 末尾加一行 `trackingEngine.onManualOverride()` 即可。

### WebSocket 回彈處理

AI 呼叫 `jumpToLine()` → 後端廣播 `line_changed` → Controller 自己也會收到這個事件。需避免：
1. 回彈事件被誤判為「外部手動操作」而觸發冷卻
2. 不必要的重複 state 更新

**解法：** TrackingEngine 維護一個 `_lastAiLineIndex: number | null` 欄位。呼叫 `jumpToLine()` 前記錄目標行，收到 `line_changed` 回彈時比對：
- 如果 `lineIndex === _lastAiLineIndex`，是 AI 自己觸發的回彈 → 忽略，不觸發冷卻
- 如果 `lineIndex !== _lastAiLineIndex`，是來自另一個 Controller 的手動操作 → 觸發冷卻
- 呼叫 `onManualOverride()` 時清除 `_lastAiLineIndex`

### 清理舊型別

實作時需從 `types/index.ts` 移除以下舊定義：
- `AudioInput` interface（被 `AudioInputState` 取代）
- `AiListeningState` interface（被 `AiTrackingState` 取代）
- `apiProvider: "gemini" | "whisper" | "local"`（被 `STTProviderType` 取代）

同時移除 `lib/websocket/types.ts` 中的 `ai_listening_toggle` 事件型別（AI 監聽完全在前端處理，不需要 WebSocket 事件）。

---

## 核心演算法：LyricsMatcher

### 比對流程

```
STT 回傳片段："天空下起了小"
         ↓
Step 1: 計算搜尋範圍
  - 當前行 = 5
  - 滑動視窗 = [3, 4, 5, 6, 7, 8]（前 2 後 3 行）
  - 若有 LRC 時間戳 + 已知播放時間 → 進一步縮小範圍
         ↓
Step 2: 模糊比對
  - 對搜尋範圍內每一行計算 LCS（最長公共子序列）相似度
  - 歌詞[6] = "天空下起了小雨" → 相似度 0.88 ✅
  - 歌詞[5] = "我走在回家的路上" → 相似度 0.05
         ↓
Step 3: 決策
  - 最高分 ≥ 信心門檻（0.6）→ 切到該行
  - 最高分 < 門檻 → 不動作
  - 手動覆蓋冷卻中 → 不動作
```

### 特殊情境處理

| 情境 | 處理方式 |
|------|---------|
| 純音樂/間奏 | STT 回傳空或低信心 → 不切行，停在原處 |
| 重複副歌 | 滑動視窗偏向「往前」（後面的行權重 +0.1） |
| 手動介入 | 設定 5 秒冷卻，冷卻期間 AI 不動作 |
| STT 辨識出垃圾文字 | 低相似度，低於門檻，自動忽略 |
| 歌手跳段 | 視窗內全低分時擴大搜尋到全曲，但需更高門檻（0.8） |

### 可調參數

| 參數 | 預設值 | 說明 |
|------|--------|------|
| `confidenceThreshold` | 0.6 | 低於此分數不切行 |
| `windowBefore` | 2 | 往回看幾行 |
| `windowAfter` | 3 | 往前看幾行 |
| `manualOverrideCooldown` | 5000ms | 手動操作後的冷卻時間 |
| `fullScanThreshold` | 0.8 | 跳段全曲搜尋時的最低門檻 |

所有參數可在前端設定頁面調整。

---

## 音訊擷取：AudioCapture

### 功能

- 列出可用音訊裝置（`navigator.mediaDevices.enumerateDevices()`）
- 支援麥克風、Line-in、系統音訊等任何音訊輸入
- Gain 控制：0dB ~ +20dB，使用 Web Audio API `GainNode`
- 即時音量分析：使用 `AnalyserNode` 取得音量值（0-1）
- 音量視覺化：CSS 動畫渲染指示條，綠 → 黃 → 紅

### 音訊處理鏈

```
MediaStream (from getUserMedia)
  → GainNode (使用者調整增益)
  → AnalyserNode (音量分析，供 UI 顯示)
  → MediaStreamDestination (供 STT provider 使用)
```

---

## STT Provider Interface

### 抽象介面

```typescript
interface STTProvider {
  readonly name: string;
  connect(config: STTConfig): Promise<void>;
  disconnect(): void;
  sendAudio(chunk: Float32Array): void;
  onTranscript: (callback: (text: string, isFinal: boolean) => void) => void;
  onError: (callback: (error: Error) => void) => void;
  isConnected(): boolean;
}

interface STTConfig {
  language: string;       // "zh-TW", "en-US" 等
  sampleRate: number;     // 通常 16000
  apiKey: string;         // 從後端取得或使用者自行輸入的 key
}
```

### Deepgram 實作

連線流程：
1. 前端呼叫 `GET /api/stt/token`（RequireAuth）取得 Deepgram API key
2. 前端用取得的 key 直接建立 WebSocket 連線到 `wss://api.deepgram.com/v1/listen?language=zh-TW&model=nova-2&interim_results=true`
3. `sendAudio()` 將 Float32Array 轉為 Int16 PCM 後寫入 WebSocket binary frame
4. Deepgram 回傳 JSON 包含 `channel.alternatives[0].transcript` 和 `is_final` 欄位

- 支援 interim results（即時部分辨識）和 final results（完整句子）
- interim 用於即時 UI 回饋，final 用於正式比對切行
- 如果使用者在設定頁面自行輸入 API key，則跳過後端 token endpoint，直接使用使用者的 key

### 未來擴充

Provider interface 允許未來新增：
- `GeminiProvider` — Google Gemini Multimodal 即時音訊
- `WhisperProvider` — 本地 Whisper 模型（需後端 Python sidecar）
- 自訓練模型 — 任何符合 interface 的實作

---

## UI 元件

### AiTrackingPanel（主面板）

放在 Controller 的 Cue Grid 區域上方，佔一橫條：

```
┌─────────────────────────────────────────────────────┐
│ 🎙 AI 監聽   [ON/OFF 開關]                    ⚙ 設定 │
│                                                      │
│ 音訊來源: [▾ MacBook 麥克風    ]   Gain: ───●──── +6dB│
│ ████████████░░░░░░░░  音量指示條（即時動畫）          │
│                                                      │
│ 狀態: ● 監聽中  信心度: 0.85  匹配行: 第 6 行        │
│       ○ 冷卻中 (手動介入後 3s)                       │
└─────────────────────────────────────────────────────┘
```

### AudioInputSelector

- 下拉選單列出所有可用音訊設備
- Gain slider：0dB ~ +20dB
- 音量指示條：即時動畫，綠 → 黃 → 紅

### AiStatusIndicator

| 狀態 | 顏色 | 說明 |
|------|------|------|
| 監聽中 | cyan 呼吸光效 | AI 正在聽，隨時準備比對 |
| 已匹配 | emerald 閃一下 | 剛成功匹配到新行 |
| 冷卻中 | amber | 手動介入後暫停，顯示倒數 |
| 無信號/錯誤 | red | 沒有音訊輸入或 STT 連線失敗 |

### STT 設定面板

在現有設定區新增一個區塊：

- 模型選擇下拉（Deepgram Nova-2 為預設）
- API Key 輸入欄位 + 測試連線按鈕
- 進階參數：信心門檻、視窗範圍、冷卻時間（slider）

---

## 資料流

### 啟動流程

```
使用者按下 AI 開關 ON
  → AudioCapture.start(deviceId, gain)
  → STTProvider.connect(proxy token)
  → TrackingEngine 開始循環：
      AudioCapture 音訊 chunk (每 100ms，可調)
        → STTProvider 串流送出
        → STT 回傳文字片段（interim / final）
        → LyricsMatcher.match(text, currentIndex, lyrics, lrcTimestamps)
        → 匹配成功且非冷卻中
          → store.setCurrentIndex(matchedLine)
          → WebSocket 自動廣播到 Display
```

### 手動介入流程

```
使用者手動按方向鍵 / 點擊行
  → TrackingEngine.onManualOverride()
  → 設定冷卻 timer (5s)
  → AI 暫停比對
  → 5s 後自動恢復追蹤
```

### 關閉流程

```
使用者按下 AI 開關 OFF
  → TrackingEngine.stop()
  → STTProvider.disconnect()
  → AudioCapture.stop()
  → 清理所有資源
```

---

## 後端變更

### GET /api/stt/token

- 回傳伺服器端設定的 Deepgram API key，供前端建立直連 WebSocket
- 使用 `RequireAuth` middleware（不是 `OptionalAuth`），確保只有登入使用者可取得
- 回應格式：`{ "token": "dg-xxxx", "provider": "deepgram" }`
- 環境變數：`DEEPGRAM_API_KEY`
- 若環境變數未設定，回傳 `503 Service Unavailable`（提示使用者在前端設定自己的 key）

### config.go 新增

```go
DeepgramAPIKey string `env:"DEEPGRAM_API_KEY" envDefault:""`
```

---

## 錯誤處理

| 錯誤 | 處理 | UI 回饋 |
|------|------|---------|
| 麥克風權限拒絕 | 顯示提示引導授權 | 紅色狀態 + 說明文字 |
| STT 連線失敗 | 3 次重試，間隔 2/4/8 秒 | 狀態顯示「重連中...」 |
| STT 連線中斷 | 自動重連（AudioCapture 持續運行，重連成功後繼續送音訊） | 黃色狀態 |
| API key 無效/餘額不足 | 停止 AI，提示檢查設定 | 紅色 + 引導到設定頁 |
| 長時間無匹配（>30s） | 不主動停止，但顯示提示 | 「未偵測到人聲」 |

---

## 歌詞格式要求

**不需要特殊格式。** 現有的一行一句純文字歌詞（`string[]`）就夠用。

有 LRC 時間戳時會自動利用來提升準確度，但非必要條件。

---

## 測試策略

| 模組 | 測試重點 | 預估 cases |
|------|---------|-----------|
| `lyrics-matcher` | LCS 演算法、滑動視窗、門檻過濾、重複副歌、跳段搜尋、LRC 輔助 | ~15 |
| `audio-capture` | Gain 計算、音量分析、裝置切換、start/stop 生命週期 | ~8 |
| `stt/deepgram-provider` | 連線、斷線重連、interim/final 文字解析 | ~6 |
| `tracking-engine` | 整合流程、手動覆蓋冷卻、開關狀態機 | ~8 |
| `stt.go`（後端） | token proxy endpoint | ~3 |
| **總計** | | **~40** |

---

## 已知限制

| 限制 | 嚴重度 | 緩解方式 |
|------|--------|---------|
| 純音樂段落無法辨識 | 中 | 不切行，等人聲恢復；或使用者手動跳過 |
| 合唱/和聲可能混淆 STT | 中 | 依賴模糊比對的容錯能力 |
| 饒舌/快速歌詞跟不上 | 中 | 調低信心門檻；未來可加 vocal separation |
| 中文 + 台語混合辨識較弱 | 中 | 未來切換到支援台語的模型 |
| 需要網路（Deepgram） | 中 | 未來可切換到本地 Whisper |
| 延遲 1-3 秒 | 低 | 歌詞顯示場景可接受 |

---

## 參考檔案

### 現有接入點

- `types/index.ts:158-162` — 已有 `AudioInput` 和 `AiListeningState` 型別定義
- `lib/store/index.ts` — Zustand store，`jumpToLine()` 是核心接入 action
- `lib/websocket/types.ts` — WebSocket 事件型別
- `app/controller/page.tsx` — Controller UI，新增 AiTrackingPanel
- `backend/internal/config/config.go` — 環境變數定義
- `backend/internal/server/routes.go` — 路由註冊

### 需要修改的現有檔案

- `app/controller/page.tsx` — 加入 AiTrackingPanel 元件
- `lib/store/index.ts` — 新增 AI tracking 相關 state 和 actions
- `backend/internal/config/config.go` — 新增 DEEPGRAM_API_KEY
- `backend/internal/server/routes.go` — 註冊 /api/stt/token 路由
- `types/index.ts` — 取代現有 `AiListeningState` / `AudioInput` 為新的 `AiTrackingState` / `AudioInputState` / `AiTrackingSettings`
