# 需求文檔

## 需求概況

| 類別 | 數量 | 狀態 |
|------|------|------|
| 功能需求 | 24 | 🟡 規劃中 |
| 非功能需求 | 8 | 🟡 規劃中 |

---

## 功能需求

### FR1: 歌詞管理

| ID | 需求描述 | 優先級 | 狀態 |
|----|---------|-------|------|
| FR1.1 | 用戶可以新增歌曲，輸入歌名、歌手、歌詞 | P0 | 🔴 Not Started |
| FR1.2 | 用戶可以編輯現有歌曲資訊 | P0 | 🔴 Not Started |
| FR1.3 | 用戶可以刪除歌曲 | P0 | 🔴 Not Started |
| FR1.4 | 歌詞輸入支援一行一句格式 | P0 | 🔴 Not Started |
| FR1.5 | 支援 LRC 時間戳格式匯入 | P1 | 🔴 Not Started |
| FR1.6 | 用戶可以搜索歌詞庫中的歌曲 | P1 | 🔴 Not Started |
| FR1.7 | 用戶可以按歌名或歌手排序 | P2 | 🔴 Not Started |

### FR2: 播放列表

| ID | 需求描述 | 優先級 | 狀態 |
|----|---------|-------|------|
| FR2.1 | 用戶可以創建播放列表 | P0 | 🔴 Not Started |
| FR2.2 | 用戶可以添加歌曲到播放列表 | P0 | 🔴 Not Started |
| FR2.3 | 用戶可以從播放列表移除歌曲 | P0 | 🔴 Not Started |
| FR2.4 | 播放列表支援拖曳排序 | P1 | 🔴 Not Started |
| FR2.5 | 用戶可以刪除播放列表 | P1 | 🔴 Not Started |

### FR3: 歌詞顯示

| ID | 需求描述 | 優先級 | 狀態 |
|----|---------|-------|------|
| FR3.1 | 支援自訂顯示行數 (1-10行) | P0 | 🔴 Not Started |
| FR3.2 | 當前歌詞行高亮顯示 | P0 | 🔴 Not Started |
| FR3.3 | 非當前行變暗或縮小顯示 | P0 | 🔴 Not Started |
| FR3.4 | 歌詞自動滾動動畫 | P0 | 🔴 Not Started |
| FR3.5 | 支援字體大小調整 | P1 | 🔴 Not Started |
| FR3.6 | 支援行距調整 | P2 | 🔴 Not Started |

### FR4: 主題與外觀

| ID | 需求描述 | 優先級 | 狀態 |
|----|---------|-------|------|
| FR4.1 | 支援深色/淺色主題切換 | P0 | 🔴 Not Started |
| FR4.2 | 支援自訂背景顏色 | P1 | 🔴 Not Started |
| FR4.3 | 支援背景圖片上傳 | P1 | 🔴 Not Started |
| FR4.4 | 支援背景影片 (Phase 2+) | P2 | 🔴 Not Started |

### FR5: 多裝置同步

| ID | 需求描述 | 優先級 | 狀態 |
|----|---------|-------|------|
| FR5.1 | 控制端操作即時同步到顯示端 | P0 | 🔴 Not Started |
| FR5.2 | 支援多個顯示端同時連線 | P0 | 🔴 Not Started |
| FR5.3 | WebSocket 連線斷線自動重連 | P0 | 🔴 Not Started |
| FR5.4 | 支援桌面、平板、手機響應式佈局 | P0 | 🔴 Not Started |

### FR6: 控制功能

| ID | 需求描述 | 優先級 | 狀態 |
|----|---------|-------|------|
| FR6.1 | 支援上一句/下一句按鈕 | P0 | 🔴 Not Started |
| FR6.2 | 支援鍵盤快捷鍵控制 | P1 | 🔴 Not Started |
| FR6.3 | 支援點擊歌詞行跳轉 | P1 | 🔴 Not Started |
| FR6.4 | 支援自動/手動模式切換 | P1 | 🔴 Not Started |

### FR7: AI 聽歌辨識 (Phase 3)

| ID | 需求描述 | 優先級 | 狀態 |
|----|---------|-------|------|
| FR7.1 | 系統可以透過麥克風錄音 | P0 | 🔴 Not Started |
| FR7.2 | AI 可以識別環境音樂的歌詞 | P0 | 🔴 Not Started |
| FR7.3 | AI 自動定位當前歌詞位置 | P0 | 🔴 Not Started |
| FR7.4 | 支援手動校正 AI 辨識結果 | P1 | 🔴 Not Started |

### FR8: NDI/Spout 輸出 (Phase 2)

| ID | 需求描述 | 優先級 | 狀態 |
|----|---------|-------|------|
| FR8.1 | 支援 NDI 協議輸出 | P0 | 🔴 Not Started |
| FR8.2 | 支援 Spout 協議輸出 (Windows) | P1 | 🔴 Not Started |
| FR8.3 | 支援透明背景輸出 | P0 | 🔴 Not Started |
| FR8.4 | 支援輸出解析度調整 | P1 | 🔴 Not Started |
| FR8.5 | 支援綠除去顏色設定 | P2 | 🔴 Not Started |

---

## 非功能需求

### NFR1: 效能

| ID | 需求描述 | 目標值 | 狀態 |
|----|---------|-------|------|
| NFR1.1 | 雙頁同步延遲 | < 100ms | 🔴 Not Started |
| NFR1.2 | 頁面載入時間 | < 2s | 🔴 Not Started |
| NFR1.3 | NDI 輸出延遲 | < 50ms | 🔴 Not Started |
| NFR1.4 | AI 辨識回應時間 | < 1s | 🔴 Not Started |

### NFR2: 可用性

| ID | 需求描述 | 目標值 | 狀態 |
|----|---------|-------|------|
| NFR2.1 | 瀏覽器支援 | Chrome, Safari, Edge 最新版 | 🔴 Not Started |
| NFR2.2 | 裝置支援 | Desktop, Tablet, Mobile | 🔴 Not Started |
| NFR2.3 | 同時連線數 | 10+ 裝置 | 🔴 Not Started |
| NFR2.4 | 離線可用性 | 控制端需網路，顯示端可短暫離線 | 🔴 Not Started |

### NFR3: 安全性

| ID | 需求描述 | 狀態 |
|----|---------|------|
| NFR3.1 | 用戶數據加密儲存 | 🔴 Not Started |
| NFR3.2 | WebSocket 連線驗證 | 🔴 Not Started |
| NFR3.3 | API 速率限制 | 🔴 Not Started |
| NFR3.4 | XSS/CSRF 防護 | 🔴 Not Started |

### NFR4: 可維護性

| ID | 需求描述 | 狀態 |
|----|---------|------|
| NFR4.1 | 程式碼測試覆蓋率 > 80% | 🔴 Not Started |
| NFR4.2 | API 文檔完整 | 🔴 Not Started |
| NFR4.3 | 錯誤日誌記錄 | 🔴 Not Started |

### NFR5: 相容性

| ID | 需求描述 | 狀態 |
|----|---------|------|
| NFR5.1 | 支援現代瀏覽器 WebGL | 🔴 Not Started |
| NFR5.2 | 支援 WebSocket Secure (WSS) | 🔴 Not Started |
| NFR5.3 | 響應式設計支援 320px - 4K | 🔴 Not Started |

---

## 優先級定義

| 優先級 | 說明 |
|--------|------|
| **P0** | 必須有，MVP 核心功能 |
| **P1** | 應該有，重要功能 |
| **P2** | 可以有，增強功能 |

---

## 需求變更記錄

| 版本 | 日期 | 變更內容 | 變更原因 |
|------|------|---------|---------|
| 1.0 | 2026-03-11 | 初始版本 | 專案啟動 |

---

## 相關文檔

- [用戶故事](user-stories.md)
- [系統架構](spec/architecture.md)
- [API 文檔](spec/api.md)

---

**文件版本:** 1.0
**最後更新:** 2026-03-11
