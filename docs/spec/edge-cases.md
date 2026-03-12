# 邊緣情況處理

## 概述

本文檔列舉 LY 系統可能遇到的所有邊緣情況，並定義預期的處理方式。這是 AI 開發和測試的重要參考。

---

## 一、網路相關邊緣情況

### 1.1 WebSocket 連線

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| 伺服器重啟時，客戶端嘗試連線 | 自動重連 | 指數退避重連 (1s, 2s, 4s, 8s) |
| 控制端斷線後重連 | 恢復狀態 | 從伺服器請求當前 session 狀態 |
| 顯示端斷線 | 控制端繼續運作 | 顯示端重連後同步最新狀態 |
| 所有裝置同時斷線 | 保留 session 30 分鐘 | 超時後清除 session |
| 網路切換 (WiFi → 4G) | 維持連線 | 自動偵測並適應 |
| 弱網路環境 | 降級處理 | 關閉動畫、減少頻率 |
| 超過 10 台裝置嘗試連線 | 拒絕新連線 | 回傳 429 Too Many Displays |
| 控制端同時開啟多個分頁 | 最後一分頁生效 | 其他分頁顯示「已在他處開啟」 |

### 1.2 資料傳輸

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| 訊息發送失敗 | 重新發送 | 最多重試 3 次 |
| 收到重複的 messageId | 忽略重複訊息 | 使用 Set 追蹤已處理的 messageId |
| 收到未預期的訊息類型 | 記錄並忽略 | console.error + 繼續運作 |
| 訊息順序錯亂 | 使用 timestamp 排序 | 確保正確的執行順序 |
| 大量訊息同時到達 | 限流處理 | 最多每秒處理 100 則訊息 |

### 1.3 實作範例

```typescript
// WebSocket 重連策略
export class WebSocketManager {
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelays = [1000, 2000, 4000, 8000, 16000] // 指數退避

  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onError('無法連線到伺服器，請檢查網路連線')
      return
    }

    const delay = this.reconnectDelays[this.reconnectAttempts]
    await new Promise(resolve => setTimeout(resolve, delay))

    this.reconnectAttempts++
    // 嘗試重新連線...
  }
}
```

---

## 二、歌曲與歌詞相關邊緣情況

### 2.1 歌詞內容

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| 空歌詞陣列 | 顯示「無歌詞」 | 禁用控制按鈕 |
| 歌詞全為空行 | 自動過濾 | 移除所有空行後再處理 |
| 超長單行 (>200 字) | 自動換行 | 在 100 字處換行 |
| 特殊字符 (emoji 🎵) | 正常顯示 | 確保字體支援 |
| 混合語言歌詞 | 正常顯示 | 使用 Unicode 字體 |
| 歌詞含 HTML/Script | 轉義處理 | 防止 XSS 攻擊 |
| 全形/半形混合 | 正常顯示 | 自動標準化 |
| 直式文字 (泰文/日文) | 支援直書 | 使用 writing-mode: vertical-rl |

### 2.2 歌詞操作

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| currentLineIndex < 0 | 自動修正為 0 | Math.max(0, index) |
| currentLineIndex ≥ 長度 | 自動修正為最後一行 | Math.min(max, index) |
| 跳到不存在的行 | 無效操作 | 安靜忽略或顯示 toast |
| 快速連續點擊下一行 | 防抖處理 | 300ms 內只處理一次 |
| 切換歌曲時重置位置 | 重置為 0 | 載入新歌曲時自動重置 |
| 刪除當前歌曲 | 清空顯示 | 回到待機狀態 |

### 2.3 實作範例

```typescript
// 歌詞預處理
export function preprocessLyrics(rawLyrics: string[]): string[] {
  return rawLyrics
    // 1. 移除空行
    .filter(line => line.trim().length > 0)
    // 2. 移除前後空白
    .map(line => line.trim())
    // 3. 轉義 HTML
    .map(line => escapeHtml(line))
    // 4. 處理超長行
    .map(line => {
      if (line.length > 200) {
        // 每 100 字換行
        return line.match(/.{1,100}/g)?.join('\n') || line
      }
      return line
    })
    // 5. 平整
    .flat()
}

// 索引邊界保護
export function clampLineIndex(index: number, maxIndex: number): number {
  return Math.max(0, Math.min(index, maxIndex))
}
```

---

## 三、AI 聽歌相關邊緣情況

### 3.1 麥克風與音訊

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| 用戶拒絕麥克風權限 | 顯示錯誤提示 | 引導用戶到設定頁面 |
| 麥克風被其他應用占用 | 等待或提示錯誤 | 適當的錯誤訊息 |
| 環境噪音過大 | 降低準確度但仍運作 | 提示用戶移至安靜環境 |
| 無聲音輸入 | 超時處理 | 30 秒無聲音後自動停止 |
| 音量過小/過大 | 正常處理 | Gemini 自動音量調整 |
| 多人同時說話 | 取樣到最後聲到的 | 無法避免，由 AI 判斷 |
| 背景音樂干擾 | 優先識別人聲 | Gemini 內建人聲分離 |

### 3.2 AI 辨識結果

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| 辨識結果不在歌詞中 | 低信心度結果 | confidence < 0.3 時不跳轉 |
| 辨識到間奏/開口音 | 忽略不跳轉 | 檢測到非歌詞內容時保持原行 |
| 辨識語言與歌詞不同 | 跨語言匹配 | 使用翻譯工具輔助 |
| 辨識速度慢於播放 | 指示「處理中」 | 顯示載入動畫 |
| API 回應空字串 | 視為無匹配 | 不更新當前行 |
| 信心度低但可能是正確的 | 顯示確認對話框 | confidence < 0.5 時詢問用戶 |
| 連續多次失敗 | 建議切換到手動模式 | 失敗 5 次後提示 |

### 3.3 實作範例

```typescript
// AI 錯誤處理
export function handleAiError(error: Error, failCount: number) {
  const errorHandlers: Record<string, () => void> = {
    'PermissionDenied': () => {
      showNotification('請允許麥克風權限以使用 AI 聽歌功能', 'error')
    },
    'NotAllowedError': () => {
      showNotification('無法存取麥克風，請關閉其他使用麥克風的應用', 'error')
    },
    'NetworkError': () => {
      if (failCount < 3) {
        showNotification(`網路不穩，正在重試... (${failCount}/3)`, 'warning')
      } else {
        showNotification('網路連線失敗，請稍後再試', 'error')
        stopAiListening()
      }
    },
    'QuotaExceeded': () => {
      showNotification('今日 AI 使用次數已用盡，請明天再試', 'error')
      stopAiListening()
    },
  }

  // 根據錯誤類型執行對應處理
  const handler = errorHandlers[error.name] || (() => {
    showNotification('AI 辨識失敗，請稍後再試', 'error')
  })

  handler()
}

// 低信心度確認
export function handleLowConfidenceResult(result: MatchResult, transcript: string) {
  if (result.confidence < 0.5) {
    showConfirmDialog({
      title: '確認歌詞位置',
      message: `AI 辨識到：「${transcript}」\n匹配到：「${result.matchedLyric}」\n\n信心度較低 (${(result.confidence * 100).toFixed(0)}%)，是否跳轉？`,
      onConfirm: () => jumpToLine(result.lineIndex),
      onCancel: () => {
        // 不跳轉，保持當前行
      },
    })
  }
}
```

---

## 四、顯示相關邊緣情況

### 4.1 響應式斷點

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| 手機直式 (< 375px) | 單行顯示 | settings.displayLines = 1 |
| 手機橫式 (375px - 768px) | 2 行顯示 | settings.displayLines = 2 |
| 平板 (768px - 1024px) | 3-4 行顯示 | settings.displayLines = 3 |
| 桌面 (> 1024px) | 使用設定值 | settings.displayLines = 用戶設定 |
| 超寬螢幕 (> 2560px) | 限制最大寬度 | max-width: 1920px |
| 異常 DPI (Retina) | 使用 device pixel ratio | 自動適應 |

### 4.2 主題與樣式

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| 系統深色模式啟用 | 使用深色主題 | 偵好系統設定 |
| 透明背景 (NDI 輸出) | 確保透明 | background: transparent |
| 用戶自訂背景圖片 | 調整對比度 | 自動計算文字顏色 |
| 字體載入失敗 | 降級到系統字體 | font-family: fallback |
| 動畫被停用 | 無動畫但仍可運作 | prefers-reduced-motion |

### 4.3 實作範例

```typescript
// 響應式行數調整
export function getResponsiveDisplayLines(userSetting: number): number {
  const width = window.innerWidth

  if (width < 375) return 1
  if (width < 768) return 2
  if (width < 1024) return Math.min(3, userSetting)

  return userSetting
}

// 監聽視窗尺寸變化
useEffect(() => {
  const handleResize = () => {
    const responsiveLines = getResponsiveDisplayLines(displaySettings.displayLines)
    updateDisplaySettings({ displayLines: responsiveLines })
  }

  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

---

## 五、多裝置同步邊緣情況

### 5.1 同步衝突

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| 兩個控制端同時操作 | 最後操作優先 | WebSocket 以最後訊息為準 |
| 控制端與顯示端狀態不一致 | 以控制端為準 | 顯示端接收同步後更新 |
| 顯示端延遲過高 | 顯示警告訊息 | 延遲 > 500ms 時警告 |
| 部分顯示端未收到更新 | 重發訊息 | ACK 機制，未 ACK 則重發 |
| 顯示端掉線後重連 | 發送完整狀態 | 包含 currentSong, currentIndex |
| 同一首歌多個 session | 獨立運作 | 不共享狀態，允許多場 |

### 5.2 Session 管理

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| Session ID 重複 | 生成新 ID | 萬號碰撞時自動重新生成 |
| Session 過期 | 顯示「連線已斷開」 | 30 分鐘無活動後過期 |
| 控制端關閉分頁 | 顯示端顯示「控制端已離開」 | 偵聽 beforeunload |
| 顯示端長時間無活動 | 自動斷線 | 5 分鐘無心跳時斷線 |

---

## 六、NDI/Spout 輸出邊緣情況

### 6.1 NDI 輸出

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| NDI 接收端未啟動 | 正常輸出 | NDI 自動發現 |
| 解析度不匹配 | 適應接收端 | 自動調整輸出解析度 |
| 幀率不符 | 以輸出為準 | 告知接收端正確幀率 |
| NDI SDK 載入失敗 | 降級為 HTTP 串流 | 提供備選方案 |
| 透明背景失效 | 使用綠背景 | 提供色鍵選項 |

### 6.2 Spout 輸出 (Windows)

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| Spout 接收端未找到 | 顯示警告 | 列出可用的接收端 |
| 輸出名稱重複 | 自動添加後綴 | LY-Lyrics-1, LY-Lyrics-2 |
| 輸出中切換歌曲 | 即時更新 | 重新發送幀到 Spout |

---

## 七、資料持久化邊緣情況

### 7.1 本地儲存

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| LocalStorage 已滿 | 清理舊資料 | 只保留最近 10 筆記錄 |
| Private Browsing 模式 | 使用記憶體儲存 | Session Storage 作為備選 |
| 寫入失敗 | 記錄到記憶體 | 提醒用戶可能無法儲存 |
| 讀取損壞的資料 | 使用預設值 | try-catch 包裝 |

### 7.2 Supabase 同步

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| 網路斷線時儲存 | 本地佇列，恢復後上傳 | 使用 Dexie.js 本地資料庫 |
| 衝突更新 | 伺服器優先 | 伺服器版本覆蓋本地版本 |
| 刪除操作無法同步 | 標記為待刪除 | 下次同步時執行 |
| 大量歌曲同步 | 分批上傳 | 每批 10 首歌 |

---

## 八、使用者操作邊緣情況

### 8.1 快速操作

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| 快速連續點擊 | 防抖處理 | 300ms 內只執行一次 |
| 長按按鈕 | 觸發特殊功能 | 長按下一行 = 快進 5 行 |
| 滑動手勢 | 對應控制 | 上滑=下一行，下滑=上一行 |
| 鍵盤快捷鍵衝突 | 以應用為準 | 攔截 preventDefault |
| 雙擊/三擊 | 執行動作 | 雙擊歌詞 = 跳轉 |

### 8.2 誤操作防護

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| 誤刪除歌曲 | 確認對話框 | 「確定要刪除嗎？」 |
| 切換歌曲未儲存 | 提示儲存 | 「有未儲存的變更」 |
| 離開頁面前 | 提醒 | 「有正在進行的聽歌」 |
| 關閉分頁 | 自動儲存狀態 | beforeunload 事件 |

---

## 九、系統資源邊緣情況

### 9.1 記憶體

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| 歌詞列表過長 (>1000 首) | 虛擬滾動 | 使用 react-window |
| 音訊快取過大 | 定期清理 | 每 5 分鐘清理一次 |
| WebSocket 訊息堆積 | 限制快取大小 | 最多保留 100 則 |

### 9.2 CPU

| 情況 | 預期行為 | 處理方式 |
|------|----------|----------|
| 動畫過多 | 降級 | 使用 CSS transform |
| 頻繁重渲染 | 節流 | React.memo + useCallback |
| 大量計算 | Web Worker | 將歌詞比對移到 Worker |

---

## 十、實作檢查清單

### 10.1 開發前檢查

```markdown
## 邊緣情況實作檢查清單

### 網路
- [ ] WebSocket 斷線重連機制
- [ ] 網路狀態指示器
- [ ] 離線模式處理
- [ ] 弱網路降級

### 歌詞
- [ ] 空歌詞處理
- [ ] 超長行換行
- [ ] 特殊字符支援
- [ ] 索引邊界保護

### AI
- [ ] 麥克風權限處理
- [ ] 低信心度確認
- [ ] API 失敗重試
- [ ] 配額限制

### 顯示
- [ ] 響應式斷點
- [ ] 系統深色模式
- [ ] 透明背景支援
- [ ] 動畫降級

### 多裝置
- [ ] 同步衝突處理
- [ ] 顯示端延遲警告
- [ ] Session 過期處理
- [ ] 重連狀態恢復
```

---

## 相關文檔

- [核心型別定義](types.md)
- [組件契約](component-contracts.md)
- [錯誤處理](error-handling.md)

---

**文件版本:** 1.0
**最後更新:** 2026-03-11
