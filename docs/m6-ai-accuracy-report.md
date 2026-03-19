# M6 AI 聽歌辨識準確率分析報告

## 日期：2026-03-19

## 1. 系統架構分析

### 管線流程圖

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    TrackingEngine                       │
                    │  (串接全流程的唯一整合模組)                              │
                    │                                                         │
  Microphone/       │  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
  Line-in ──────────┼─►│ AudioCapture │───►│ STTProvider  │───►│  Lyrics   │  │
                    │  │              │    │              │    │  Matcher  │  │
                    │  │ Web Audio API│    │ Deepgram     │    │           │──┼──► jumpToLine()
                    │  │ PCM Float32  │    │ Google Cloud │    │ LCS 比對  │  │    (store 更新)
                    │  │ 4096 samples │    │ Web Speech   │    │ 滑動視窗  │  │
                    │  └──────────────┘    └──────────────┘    └───────────┘  │
                    │         │                    │                  │        │
                    │         ▼                    ▼                  ▼        │
                    │   音量 RMS 分析         onTranscript       MatchResult   │
                    │   (UI 音量表)          (interim/final)    (index+信心度) │
                    └─────────────────────────────────────────────────────────┘
```

### 各環節延遲分析

| 環節 | 延遲來源 | 理論延遲估算 | 說明 |
|------|---------|-------------|------|
| **AudioCapture** | ScriptProcessorNode buffer size | **~85ms** | `bufferSize=4096`，在 48kHz 取樣率下為 4096/48000 = 85ms；16kHz 則為 256ms |
| **Float32 -> Int16 轉換** | CPU 同步計算 | **<1ms** | 線性轉換，每 chunk 4096 筆資料 |
| **網路傳輸（STT 上行）** | WebSocket 傳送 PCM 到雲端 | **10-50ms** | 取決於用戶網路延遲、上行頻寬 |
| **STT 雲端辨識** | 語音模型推理 | **150-600ms** | 佔整體延遲 80%+，Deepgram endpointing=300ms + utterance_end_ms=800ms |
| **STT 結果下行** | WebSocket 回傳 JSON | **10-50ms** | 結果 payload 極小（< 1KB） |
| **LyricsMatcher 比對** | LCS 演算法 + 滑動視窗 | **<5ms** | O(m*n) 但 m,n 通常 <50 字元，視窗內 7 行 + 必要時全掃描 |
| **Store 更新 -> UI 渲染** | React state update + DOM | **<16ms** | 單次 setState，React batch 處理 |

**端到端理論總延遲：250-860ms**（與 NFR1.4 備註一致）

#### 延遲瓶頸分析

STT 雲端辨識佔整體延遲的 **70-85%**。以下為細項拆解：

- **Deepgram**：`endpointing=300ms`（偵測語句結束的靜音時長）+ `utterance_end_ms=800ms`（完整斷句靜音閾值）。在歌曲場景中，歌詞之間的間隔短（通常 0.5-2s），endpointing 300ms 是合理的低延遲設定。然而 `utterance_end_ms=800ms` 意味著即使辨識完成，仍需等待 800ms 靜音才會送出 final 結果。
- **Google Cloud**：透過 Go 後端代理，後端緩衝 2 秒音訊後送出辨識（見程式碼註解），額外增加 ~2000ms 延遲。
- **Web Speech API**：瀏覽器內建引擎（Chrome 使用 Google STT），延遲不可控，通常 200-500ms。

---

## 2. LyricsMatcher 演算法分析

### 演算法描述

LyricsMatcher 使用 **LCS（Longest Common Subsequence，最長公共子序列）** 計算文字相似度，結合 **滑動視窗** 與 **全曲掃描** 兩階段策略，將 STT 辨識出的文字片段定位到歌詞的行索引。

#### LCS 相似度計算（`lcsRatio`）

- 字元級 LCS，大小寫不敏感
- 相似度比率定義：`LCS 長度 / max(a 長度, b 長度)`
- 空間優化：僅保留兩行陣列，O(n) 空間複雜度
- 時間複雜度：O(m * n)，其中 m, n 為兩字串長度

#### 匹配流程（`matchLyrics`）

```
Step 1: 計算滑動視窗範圍
  windowStart = max(0, currentIndex - windowBefore)     // 預設 -2
  windowEnd   = min(lyrics.length-1, currentIndex + windowAfter)  // 預設 +5

Step 2: LRC 時間戳輔助（若有）
  根據 elapsedMs +/- 5000ms 擴展視窗邊界

Step 3: 視窗內比對
  - 逐行計算 lcsRatio(text, lyric)
  - currentIndex 之後的行加 forwardBias (+0.1) 加成
  - 取最高分

Step 4: 判定
  if (bestInWindow >= confidenceThreshold) → 回傳匹配結果
  else → 進入全曲掃描

Step 5: 全曲掃描（跳過已比對的視窗範圍）
  if (bestFullScan >= fullScanThreshold) → 回傳匹配結果
  else → 回傳 null（無匹配）
```

### 匹配策略參數

| 參數 | 程式碼預設值 | Store 預設值 | 說明 |
|------|-------------|-------------|------|
| `confidenceThreshold` | 0.45 | 0.45 | 視窗內匹配最低信心度門檻。中文 STT 準確度較低，故放寬至 0.45（非典型值 0.6-0.8） |
| `windowBefore` | 2 | 2 | 向前回溯行數（處理 STT 延遲導致的位置落後） |
| `windowAfter` | 5 | 5 | 向後延伸行數（提升跳轉容錯，預測播放進度） |
| `fullScanThreshold` | 0.7 | 0.7 | 全曲掃描所需的更高門檻（防止誤跳） |
| `forwardBias` | 0.1 | — | 對 currentIndex 之後的行加分，解決重複副歌往前推進問題 |
| `cooldownMs` | 5000 | 5000 | 手動介入後的冷卻期（ms），期間忽略 AI 跳行 |

### Forward Bias 機制

重複歌詞（如副歌）是歌詞匹配的經典難題。LyricsMatcher 透過 `forwardBias=0.1` 解決：

- 當 STT 文字同時匹配歌詞第 0 行和第 4 行（相同內容的副歌），且 `currentIndex=3`
- 第 4 行（在 currentIndex 之後）獲得 +0.1 加成
- 結果：優先選擇「往前推進」的位置，避免回跳到已唱過的段落

**限制**：`forwardBias=0.1` 是固定值。若 LCS 分數差距超過 0.1（例如 STT 辨識結果更接近第一段副歌的微妙措辭差異），bias 可能不足以克服。

### LRC 時間戳輔助

當歌曲有 LRC 時間戳資料時，匹配器會：

1. 計算 `elapsedMs`（追蹤開始後的經過時間）
2. 以 `elapsedMs +/- 5000ms` 為時間視窗，擴展（不縮減）空間滑動視窗
3. 時間戳僅作為視窗擴展參考，不影響信心度計算

**分析**：此機制可在歌曲進度已知時提供額外定位線索，但精確度取決於追蹤啟動時機是否與歌曲起始時間對齊。若操作者在歌曲中途啟動追蹤，`elapsedMs` 將嚴重偏移。

### 理論準確率評估

#### 中文歌詞

| 情境 | 預估準確率 | 分析 |
|------|-----------|------|
| 標準國語歌（咬字清晰） | 75-90% | STT 對清晰國語辨識率高，LCS 匹配可靠 |
| 重複副歌（2-3 次重複） | 60-80% | forwardBias 可解決多數情況，但 3+ 次重複的晚期副歌可能誤判 |
| 快節奏歌曲 | 50-70% | STT 在快速語流下遺漏字詞嚴重，LCS 分數可能低於門檻 |
| 方言 / 台語 / 粵語 | 30-50% | STT 配置固定為 `zh-TW`，對非國語發音辨識率極低 |
| 合唱 / 和聲 | 40-60% | 多聲部干擾 STT 引擎，辨識碎片化 |

#### 英文歌詞

| 情境 | 預估準確率 | 分析 |
|------|-----------|------|
| 標準英文歌（清晰發音） | 80-95% | 英文 STT 模型成熟，LCS 字元級匹配效果佳 |
| 快節奏 Rap/Hip-hop | 40-60% | 連音、俚語、快速語流嚴重影響辨識 |
| 英文歌但 STT 設 zh-TW | 10-30% | 語言模型不匹配，辨識結果近乎無意義 |

#### 混合語言

| 情境 | 預估準確率 | 分析 |
|------|-----------|------|
| 中英混合歌詞 | 50-70% | STT 語言模型只能設定一種語言，切換段落時辨識率驟降 |
| 日韓穿插 | 20-40% | `zh-TW` 模型對日韓語音幾乎無效 |

**關鍵限制**：目前 `useAiTracking` hook 中語言固定為 `zh-TW`（第 116 行 `language: "zh-TW"`），不支援動態切換語言。英文歌需手動變更設定。

---

## 3. STT Provider 比較

| 特性 | Web Speech API | Deepgram Nova-2 | Google Cloud STT |
|------|---------------|-----------------|-------------------|
| **引擎** | 瀏覽器內建（Chrome=Google STT） | Deepgram Nova-2 | Google Chirp（透過 Go 後端代理） |
| **連線方式** | 瀏覽器直接處理 | 前端 WebSocket 直連 Deepgram | 前端 WS → Go 後端 → Google API |
| **音訊處理** | 瀏覽器自行管理麥克風 | Float32→Int16 PCM 串流 | Float32→Int16 PCM → 後端 2 秒緩衝 |
| **中文辨識品質** | 佳（Chrome 實為 Google STT） | 良（Nova-2 中文有明顯進步） | 極佳（Chirp 模型中文辨識領先） |
| **英文辨識品質** | 良 | 極佳（英文為 Deepgram 強項） | 極佳 |
| **interim 結果** | 支援（`interimResults=true`） | 支援（`interim_results=true`） | 取決於後端實作 |
| **keywords 提示** | 不支援 | 支援（最多 100 個，權重 5） | 不支援（前端未傳遞） |
| **延遲（估算）** | 200-500ms | 300-700ms（endpointing=300ms） | 2000-3000ms（後端 2 秒緩衝） |
| **API Key 暴露** | 無需 Key | 透過 WebSocket subprotocol 傳送 | Key 在 Go 後端，不暴露 |
| **費用** | 免費 | ~$0.0043/min（Nova-2） | ~$0.006-0.016/min（Chirp） |
| **瀏覽器支援** | 僅 Chrome/Edge | 全部（WebSocket） | 全部（WebSocket） |
| **自動重啟** | 有（onend 自動 restart） | 無（斷線報錯） | 無（斷線報錯） |
| **適用場景** | 免費試用、Chrome 用戶、低延遲需求 | 生產環境、需要 keywords 提升準確率 | 最高中文辨識品質、安全性要求高 |

### Provider 選擇建議

| 場景 | 推薦 Provider | 理由 |
|------|-------------|------|
| 教會敬拜（中文為主） | Google Cloud | Chirp 中文辨識最佳，API key 不暴露 |
| 教會敬拜（預算有限） | Web Speech | 免費且 Chrome 底層使用 Google STT |
| 英文歌為主 | Deepgram | Nova-2 英文辨識率最高，keywords 提示有效 |
| 低延遲要求 | Web Speech | 無網路往返，瀏覽器本地處理 |
| 中英混合 | Deepgram | keywords 可同時提供中英文歌詞提示 |

### Deepgram Keywords 機制分析

Deepgram Provider 將歌詞內容作為 `keywords` 參數傳入，每個 keyword 加權重 5（最高 10）。此機制可大幅提升特定用語的辨識率：

- 取不重複歌詞行，限制 100 行以內（避免 URL 過長）
- 歌詞中的專有名詞（人名、地名、宗教用語）可因此正確辨識
- **限制**：URL 長度上限可能在長歌詞場景被觸及（100 行 * 每行平均 20 字元 * URL encode ≈ 6KB query string）

---

## 4. 已知限制與風險

### 4.1 環境噪音影響

| 風險 | 影響程度 | 說明 |
|------|---------|------|
| 現場樂團伴奏 | **高** | 樂器聲壓過歌聲時，STT 無法有效分離人聲 |
| 會眾合唱 | **中** | 多人同時唱，STT 可能辨識到多個人聲的混合 |
| 音響回授 | **低** | 若麥克風收到喇叭放大後的聲音，可能造成雙重辨識 |
| PA 系統直接輸入 | **極低** | Line-in 輸入品質最佳，但需額外硬體（混音器 AUX send） |

### 4.2 歌手發音不清楚

- 歌手個人風格化發音（氣聲、轉音、顫音）降低 STT 辨識率
- 歌手即興改變旋律或延長音符時，STT 等待 endpointing 超時
- 特殊唱法（whistle voice、falsetto）幾乎無法辨識

### 4.3 重複歌詞段落（副歌）

- `forwardBias=0.1` 在 2-3 次重複時運作良好
- 但若副歌重複 4 次以上，且中間穿插相似橋段，bias 可能不足
- 全曲掃描的 `fullScanThreshold=0.7` 可能在此場景造成誤跳到錯誤的副歌位置

### 4.4 即興改詞

- 歌手即興添加 ad-lib 或修改歌詞，STT 辨識出非預期文字
- LCS 容許部分匹配（子序列），可容忍少量即興
- 但大幅改詞（超過 55% 內容不同）時，信心度將低於 0.45 門檻，不會觸發跳行

### 4.5 語言固定為 zh-TW

- `useAiTracking` hook 中語言硬編碼為 `"zh-TW"`
- 唱英文歌時，zh-TW 模型會嘗試將英文發音映射到中文字，辨識結果無意義
- **建議**：將語言設定加入 `AiTrackingSettings`，允許使用者切換

### 4.6 Google Cloud Provider 高延遲

- Go 後端緩衝 2 秒音訊後才送出辨識，額外增加 ~2000ms 延遲
- 在 NFR1.4 的 <1s 要求下，Google Cloud Provider 無法達標
- 整體端到端延遲預估：2500-3500ms

### 4.7 ScriptProcessorNode 已棄用

- `AudioCapture` 使用 `ScriptProcessorNode`（已被 W3C 標記為 deprecated）
- 替代方案為 `AudioWorkletNode`，但 API 更複雜
- 短期內瀏覽器仍支援，但中長期有被移除風險

### 4.8 只處理 Final 結果

- `TrackingEngine.handleTranscript` 在第 129 行 `if (!isFinal) return;` 過濾掉所有 interim 結果
- Interim 結果雖然顯示在 UI（透過 `onTranscriptCallback`），但不觸發匹配
- **影響**：降低整體延遲感知，但犧牲了即時反應速度
- **權衡**：使用 interim 結果匹配會增加誤跳風險（interim 結果不穩定、可能被後續修正）

---

## 5. 建議的量化測試方案

### 5.1 測試環境

#### 測試歌曲集

| # | 歌曲 | 語言 | 特性 | 測試重點 |
|---|------|------|------|---------|
| C1 | 慢板敬拜歌（如《有一天》） | 中文 | 慢速、咬字清晰、少重複 | 基線準確率 |
| C2 | 中板讚美詩（如《恩典之路》） | 中文 | 中速、有副歌重複 2 次 | 副歌處理 |
| C3 | 快板敬拜歌（如《讓讚美飛揚》） | 中文 | 快速、多重複 | 高速辨識 + 重複處理 |
| C4 | 長歌詞敬拜歌（40+ 行） | 中文 | 歌詞量大 | 全掃描效能 |
| C5 | 台語 / 方言歌曲 | 台語 | 非國語 | 方言辨識極限 |
| E1 | 慢板英文敬拜（如 "10,000 Reasons"） | 英文 | 清晰、慢速 | 英文基線 |
| E2 | 中速英文（如 "Good Good Father"） | 英文 | 中速、重複多 | 英文副歌 |
| E3 | 快板英文（如 "This Is Amazing Grace"） | 英文 | 快速 | 高速英文 |
| E4 | 英文 Rap 段落 | 英文 | 極快速、連音 | 極限壓力 |
| M1 | 中英混合歌曲 | 混合 | 段落切換語言 | 混合語言 |

#### 音訊來源

| 來源 | 說明 | 優先級 |
|------|------|-------|
| **直接音訊輸入（Line-in）** | 混音器 AUX send → 音訊介面 → 瀏覽器 | 最佳品質，但需硬體 |
| **近場麥克風** | 麥克風距喇叭 30cm | 模擬理想現場 |
| **環境麥克風** | 內建麥克風，距喇叭 2-5m | 模擬真實使用場景 |
| **錄音播放** | 預錄音檔直接播放 | 可重複測試，確保一致性 |

**推薦**：使用「錄音播放」作為自動化測試的標準輸入，確保可重複性。再以「環境麥克風」進行現場驗證。

### 5.2 量測指標定義

#### 行級準確率（Line-Level Accuracy）

```
行級準確率 = 正確跳轉次數 / 總歌詞行數 * 100%

正確跳轉定義：
- AI 跳到的行索引與「人類觀察到的正確行索引」一致
- 允許 ±1 行的容差（因 STT 延遲，前一行或後一行皆可接受）
```

#### 端到端延遲（End-to-End Latency）

```
延遲 = jumpToLine 觸發時間 - 歌手開始唱該行的時間

量測方法：
- 在 TrackingEngine.handleTranscript 中加入 performance.now() 記錄
- 使用 LRC 時間戳作為「歌手開始唱的時間」參考
```

#### 首次命中時間（Time to First Match）

```
首次命中時間 = 第一次 jumpToLine 觸發時間 - engine.start() 時間

量測意義：用戶啟動 AI 追蹤後，多久能看到第一次自動跳行
```

#### 誤跳率（False Jump Rate）

```
誤跳率 = 錯誤跳轉次數 / 總跳轉次數 * 100%

錯誤跳轉定義：
- AI 跳到的行索引與正確行索引差距 > 1 行
- 特別標記：回跳到已唱過的段落（更嚴重的誤跳）
```

#### 遺漏率（Miss Rate）

```
遺漏率 = 未觸發跳轉的歌詞行數 / 總歌詞行數 * 100%

未觸發定義：
- 歌手已唱完該行，但 AI 從未跳到該行
- 通常因 STT 辨識失敗或信心度未達門檻
```

### 5.3 測試腳本設計

#### 半自動化測試流程

由於 STT 需要真實音訊輸入，完全自動化需要模擬音訊設備（virtual audio device），故建議半自動化方案：

```
Phase 1: 準備
  1. 預錄測試歌曲音檔（.wav 格式，16kHz, mono）
  2. 準備對應的 LRC 時間戳檔案（作為 ground truth）
  3. 在瀏覽器中載入測試歌曲到 LY 系統

Phase 2: 執行
  1. 啟動 AI 追蹤
  2. 使用虛擬音訊設備（如 BlackHole / VB-Cable）播放音檔
  3. TrackingEngine 處理音訊 → STT → 匹配
  4. 記錄所有 jumpToLine 呼叫（行索引 + 時間戳）

Phase 3: 分析
  1. 對比 jumpToLine 記錄與 LRC ground truth
  2. 計算行級準確率、延遲、誤跳率、遺漏率
  3. 產出報告
```

#### 建議的測試紀錄 Hook（非侵入式）

以下為建議加入的測試紀錄機制（僅開發環境啟用），用於收集準確率數據：

```typescript
// 測試用 — 記錄所有 AI 跳行事件
interface AiJumpRecord {
  timestamp: number;       // performance.now()
  lineIndex: number;       // 跳到的行索引
  confidence: number;      // 匹配信心度
  sttText: string;         // STT 辨識出的文字
  lyricsLine: string;      // 對應的歌詞行
  elapsedMs: number;       // 自追蹤開始的經過時間
}

// 在 TrackingEngine.handleTranscript 中記錄
// if (result) {
//   this.jumpRecords.push({
//     timestamp: performance.now(),
//     lineIndex: result.lineIndex,
//     confidence: result.confidence,
//     sttText: text,
//     lyricsLine: lyrics[result.lineIndex],
//     elapsedMs: Date.now() - this._startTime!,
//   });
// }
```

#### LyricsMatcher 單元級準確率測試

不依賴 STT 引擎，可直接對 `matchLyrics` 函式做大量模擬測試：

```typescript
// 模擬 STT 輸出的變異（模擬真實 STT 誤差）
function simulateSttOutput(original: string, errorRate: number): string {
  const chars = [...original];
  const result: string[] = [];
  for (const char of chars) {
    if (Math.random() > errorRate) {
      result.push(char);
    }
    // errorRate 機率下省略該字元（模擬漏字）
  }
  return result.join('');
}

// 測試案例產生器
function generateTestCases(lyrics: string[], errorRates: number[]) {
  const cases = [];
  for (const [index, line] of lyrics.entries()) {
    for (const rate of errorRates) {
      cases.push({
        input: simulateSttOutput(line, rate),
        expectedIndex: index,
        errorRate: rate,
      });
    }
  }
  return cases;
}
```

此方法可快速驗證 LyricsMatcher 在不同 STT 錯誤率下的匹配穩定性，無需等待雲端 STT 結果。

---

## 6. M6 驗收標準評估

| 驗收標準 | 目標 | 分析結果 | 達標評估 | 建議 |
|---------|------|---------|---------|------|
| **辨識準確率 > 85%** | M6 | 理論估算 75-90%（理想環境中文），實際數據待測 | **條件性達標** | 使用 Line-in 直輸 + Deepgram keywords 提示，有望達 85%+；環境麥克風場景可能落至 60-75% |
| **回應時間 < 1s** | NFR1.4 | Web Speech: 200-500ms; Deepgram: 300-700ms; Google Cloud: 2500-3500ms | **部分達標** | Web Speech 和 Deepgram 可穩定達標；Google Cloud 因後端 2 秒緩衝無法達標 |
| **中英文支援** | M6 | 語言硬編碼 `zh-TW`，英文歌需手動切換配置 | **部分達標** | 技術上已支援多語言 STT，但 UI 缺少語言切換功能 |

### 準確率達標路徑分析

以 **85% 行級準確率**為目標，各場景的達標難度：

| 場景 | 當前預估 | 達標差距 | 改善建議 |
|------|---------|---------|---------|
| Line-in + 清晰中文歌 | 85-92% | 已達標 | 維持現有參數 |
| 環境麥克風 + 清晰中文歌 | 70-82% | -3~15% | 提高 Gain、使用指向性麥克風 |
| 現場樂團 + 合唱 | 50-65% | -20~35% | 需人聲分離前處理 |
| 英文歌 + 正確語言設定 | 82-95% | 已達標 | 確保 STT 語言設為 `en-US` |
| 快節奏歌曲 | 55-72% | -13~30% | 降低 `confidenceThreshold` 至 0.35、增加 `windowAfter` 至 8 |

---

## 7. 優化建議

### 7.1 高優先級（立即可執行）

#### (a) 語言設定動態化

**問題**：`useAiTracking.ts` 第 116 行 `language: "zh-TW"` 硬編碼。

**建議**：將語言加入 `AiTrackingSettings`，在 UI 提供 dropdown 選擇（zh-TW / en-US / ja-JP 等），或根據歌曲 metadata 自動推斷。

**預估改善**：英文歌準確率從 10-30% 提升至 80-95%。

#### (b) Google Cloud 後端緩衝改為串流

**問題**：Go 後端緩衝 2 秒音訊後送出，延遲 ~2500ms。

**建議**：改為真正的串流辨識（Google Cloud STT v2 Streaming API），每收到音訊 chunk 立即送出。

**預估改善**：Google Cloud Provider 延遲從 2500-3500ms 降至 300-800ms。

#### (c) 利用 Interim 結果做預匹配

**問題**：僅使用 final 結果匹配，延遲較高。

**建議**：對 interim 結果做「試探性匹配」，若信心度 > 0.8（遠高於 final 門檻），先行跳轉；若後續 final 結果修正了行索引，再更正。

**預估改善**：使用者感知延遲減少 200-500ms，但需小心設定高門檻避免誤跳增加。

### 7.2 中優先級（需一定開發量）

#### (d) ScriptProcessorNode 替換為 AudioWorkletNode

**問題**：`ScriptProcessorNode` 已被 W3C 棄用。

**建議**：遷移至 `AudioWorkletNode`，在獨立音訊執行緒中處理 PCM 轉換，避免主執行緒阻塞。

**預估改善**：音訊處理更穩定，減少因主執行緒忙碌導致的音訊丟失。

#### (e) 動態調整 confidenceThreshold

**問題**：固定門檻 0.45 不適用所有場景。

**建議**：根據歷史匹配成功率動態調整：
- 連續 5 次匹配成功 → 門檻提高至 0.55（減少誤跳）
- 連續 5 次未匹配 → 門檻降低至 0.35（增加容錯）

**預估改善**：整體準確率提升 3-8%，同時降低遺漏率。

#### (f) 多行合併匹配

**問題**：STT 辨識結果可能跨越多行歌詞（特別是短歌詞行場景）。

**建議**：除了逐行匹配外，嘗試將相鄰 2-3 行合併後再與 STT 文字比對，取最佳結果。

**預估改善**：短歌詞行的匹配率提升 10-15%。

### 7.3 長期優化（架構級改動）

#### (g) 人聲分離前處理

**問題**：現場環境中樂器聲干擾 STT。

**建議**：在 `AudioCapture` 與 STT 之間加入 Web Audio API 的 BiquadFilterNode（帶通濾波器 300Hz-3kHz 人聲頻段），或使用 TensorFlow.js 載入人聲分離模型。

**預估改善**：現場環境準確率從 50-65% 提升至 65-80%。

#### (h) 雙 Provider 交叉驗證

**問題**：單一 STT Provider 有各自的辨識弱點。

**建議**：同時使用兩個 Provider（如 Web Speech + Deepgram），取兩者的 LCS 匹配最高分，或當一個 Provider 無結果時使用另一個的結果。

**預估改善**：整體準確率提升 5-10%，但增加 API 費用和複雜度。

#### (i) 學習式匹配參數調整

**問題**：`forwardBias`、`confidenceThreshold` 等參數需手動調校。

**建議**：建立離線測試框架，以標註好的測試集自動搜索最佳參數組合（grid search / Bayesian optimization）。

**預估改善**：參數最佳化後，整體準確率可提升 5-15%。

---

## 附錄 A: 程式碼檔案索引

| 檔案 | 角色 | 測試檔案 |
|------|------|---------|
| `lib/ai-tracking/tracking-engine.ts` | 全流程串接引擎（AudioCapture → STT → Matcher → jumpToLine） | `tracking-engine.test.ts` |
| `lib/ai-tracking/lyrics-matcher.ts` | LCS 演算法 + 滑動視窗匹配 | `lyrics-matcher.test.ts` |
| `lib/audio/audio-capture.ts` | Web Audio API 音訊擷取（麥克風/Line-in） | — |
| `lib/stt/types.ts` | STTProvider 介面定義 | — |
| `lib/stt/deepgram-provider.ts` | Deepgram Nova-2 串流 STT | `stt-provider.test.ts` |
| `lib/stt/google-cloud-provider.ts` | Google Cloud STT（透過 Go 後端代理） | `google-cloud-provider.test.ts` |
| `lib/stt/web-speech-provider.ts` | 瀏覽器內建 Web Speech API | `web-speech-provider.test.ts` |
| `lib/hooks/use-ai-tracking.ts` | React hook — TrackingEngine 生命週期管理 | — |
| `components/ai-tracking/AiTrackingPanel.tsx` | AI 追蹤控制面板 UI | `AiTrackingPanel.test.tsx` |
| `components/ai-tracking/AiStatusIndicator.tsx` | AI 狀態指示燈 | `AiStatusIndicator.test.tsx` |
| `components/ai-tracking/AudioInputSelector.tsx` | 音訊輸入選擇器 | `AudioInputSelector.test.tsx` |

## 附錄 B: 現有測試覆蓋

| 測試檔案 | 測試數量 | 覆蓋範圍 |
|---------|---------|---------|
| `lyrics-matcher.test.ts` | 11 | LCS 演算法正確性、滑動視窗匹配、forwardBias、LRC 時間戳輔助、邊界條件 |
| `tracking-engine.test.ts` | 7 | 啟動/停止生命週期、final/interim 處理、cooldown 機制、self-echo 防護 |
| `stt-provider.test.ts` | — | STT Provider 介面合規性測試 |
| `google-cloud-provider.test.ts` | — | Google Cloud Provider 連線/斷線/音訊處理 |
| `web-speech-provider.test.ts` | — | Web Speech API 連線/斷線/自動重啟 |

**測試缺口**：
- 無端到端準確率測試（需真實音訊 + STT 回應模擬）
- 無壓力測試（大量歌詞行的匹配效能）
- 無 AudioCapture 的實機測試（依賴瀏覽器 API）
- LyricsMatcher 測試僅覆蓋 11 個案例，缺少大規模模糊匹配測試

---

**報告撰寫者**：AI/ML Performance Benchmarker
**分析日期**：2026-03-19
**報告狀態**：基於程式碼靜態分析的理論評估。實際準確率數據需透過第 5 節的量化測試方案取得。
**整體評估**：AI 聽歌辨識管線架構完整、模組化良好，LCS 匹配演算法設計合理。在理想條件下（Line-in 輸入、清晰發音、Deepgram + keywords）有望達到 M6 驗收標準的 85% 行級準確率。主要風險在於：(1) 語言硬編碼限制英文歌支援、(2) Google Cloud Provider 延遲過高、(3) 現場噪音環境大幅降低辨識率。建議優先處理語言動態化和 interim 結果預匹配，可在不大幅修改架構的前提下顯著提升使用者體驗。
