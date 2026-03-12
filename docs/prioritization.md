# 功能優先級清單

**建立日期:** 2026-03-12
**最後更新:** 2026-03-12
**負責人:** Product Manager

---

## 優先級定義

| 優先級 | 定義 | 時間目標 |
|--------|------|----------|
| **P0** | �須完成才能啟動 | 本週內 |
| **P1** | 重要功能，影響用戶體驗 | 2 週內 |
| **P2** | 增強功能，可延後 | 1 個月內 |

---

## Phase 1 剩餘任務優先級

### 🔴 P0 - 核心前端組件 (必須完成)

#### 1. LyricsDisplay 組件
**描述:** 顯示歌詞、高亮當前行、支援自動滾動
**驗收標準:**
- [ ] 顯示指定行數的歌詞 (1-10 行可調)
- [ ] 當前行高亮顯示
- [ ] 支援深色/淺色主題
- [ ] 響應式設計 (手機/平板/桌面)
- [ ] 連接 Zustand Store

**檔案:** `app/components/lyrics/LyricsDisplay.tsx`

---

#### 2. LyricsControl 組件
**描述:** 上一句/下一句按鈕、跳轉控制
**驗收標準:**
- [ ] 上一句按鈕 (到第一行時停用)
- [ ] 下一句按鈕 (到最後一行時停用)
- [ ] 快速跳轉下拉選單
- [ ] WebSocket 同步控制

**檔案:** `app/components/lyrics/LyricsControl.tsx`

---

#### 3. SongSelector 組件
**描述:** 歌曲選擇下拉選單
**驗收標準:**
- [ ] 下拉選單顯示所有歌曲
- [ ] 搜尋過濾功能
- [ ] 切換歌曲時更新顯示

**檔案:** `app/components/lyrics/SongSelector.tsx`

---

#### 4. SettingsPanel 組件
**描述:** 顯示設定調整面板
**驗收標準:**
- [ ] 顯示行數調整 (1-10)
- [ ] 字體大小調整
- [ ] 主題切換 (深色/淺色)
- [ ] 設定即時預覽

**檔案:** `app/components/settings/SettingsPanel.tsx`

---

#### 5. Zustand Store 整合
**描述:** 狀態管理完整整合
**驗收標準:**
- [ ] `lyricsStore` 定義完成
- [ ] 所有組件連接到 Store
- [ ] 狀態持久化 (localStorage)
- [ ] WebSocket 事件更新 Store

**檔案:** `lib/stores/lyricsStore.ts`

---

### 🟠 P1 - WebSocket 實測與優化

#### 6. WebSocket 連線測試
**描述:** 實際驗證 WebSocket 連線
**驗收標準:**
- [ ] 控制端連線成功
- [ ] 顯示端連線成功
- [ ] 控制端操作同步到顯示端
- [ ] 多顯示端同時連線測試

**測試檔案:** `tests/websocket/connection.test.ts`

---

#### 7. 錯誤處理優化
**描述:** 統一 API 錯誤處理
**驗收標準:**
- [ ] API 錯誤統一格式
- [ ] 用戶友好的錯誤訊息
- [ ] 錯誤日誌記錄
- [ ] 逾時重試機制

**檔案:** `lib/utils/errorHandler.ts`

---

#### 8. 單元測試
**描述:** 核心功能單元測試
**驗收標準:**
- [ ] songService.ts 測試覆蓋率 > 80%
- [ ] lyricsStore 測試覆蓋率 > 80%
- [ ] 組件測試 (LyricsDisplay)

**測試目錄:** `__tests__/`

---

### 🟡 P2 - 進階功能

#### 9. LRC 時間戳匯入
**描述:** 支援 LRC 格式歌詞匯入
**驗收標準:**
- [ ] 解析 LRC 格式
- [ ] 自動提取時間戳
- [ ] 歌詞與時間戳綁定

**檔案:** `lib/utils/lrcParser.ts`

---

#### 10. API 速率限制
**描述:** 防止 API 濫用
**驗收標準:**
- [ ] 每用戶每分鐘請求限制
- [ ] 超限回傳 429 錯誤
- [ ] Redis 快取 (可選)

**檔案:** `lib/middleware/rateLimit.ts`

---

#### 11. 用戶認證整合
**描述:** Supabase Auth 整合
**驗收標準:**
- [ ] 登入/註冊頁面
- [ ] JWT Token 驗證
- [ ] 受保護路由

**檔案:** `app/(auth)/login/page.tsx`

---

## 各角色剩餘任務

### Frontend Developer
```
P0 (本週):
├── LyricsDisplay 組件
├── LyricsControl 組件
├── SongSelector 組件
├── SettingsPanel 組件
└── Zustand Store 整合

P1 (下週):
├── WebSocket 連線測試
└── 組件測試
```

### Backend Developer
```
P0 (已完成):
├── ✅ API Routes
├── ✅ 資料庫 Service
└── ✅ WebSocket Server

P1 (本週):
├── 錯誤處理優化
└── API 測試案例
```

### UI/UX Designer
```
P0 (本週):
├── Design System Token 定義
│   ├── 顏色系統 (Primary, Secondary, Accent)
│   ├── 字體系統 (標題、內文、歌詞)
│   ├── 間距系統 (Spacing scale)
│   └── 圓角系統 (Border radius)
└── 組件設計規格
    ├── LyricsDisplay 尺寸/動畫
    ├── 按鈕樣式
    └── 輸入框樣式
```

### QA/Test Engineer
```
P1 (本週):
├── 更新測試計劃 (REST API)
├── API 測試案例撰寫
└── 測試環境設定
```

---

## Phase 2-4 功能優先級

### Phase 2: Resolume 整合 (P1)
- [ ] NDI 輸出頁面
- [ ] 透明背景模式
- [ ] 輸出解析度設定

### Phase 3: AI 聽歌辨識 (P1)
- [ ] 麥克風錄音組件
- [ ] Gemini API 整合
- [ ] 歌詞比對演算法

### Phase 4: 進階功能 (P2)
- [ ] LRC 時間戳播放
- [ ] 歌詞搜尋/篩選
- [ ] 多國語言支援

---

## 本週 Sprint 目標 (Week 1)

**目標日期:** 2026-03-19

**完成定義 (DoD):**
1. 5 個核心前端組件完成
2. Zustand Store 整合完成
3. UI/UX Design System Token 定義完成
4. 所有組件通過 TypeScript 型別檢查
5. 建置成功無錯誤

**每日站會重點:**
- Day 1: Design System Token + LyricsDisplay
- Day 2: LyricsControl + SongSelector
- Day 3: SettingsPanel + Zustand Store
- Day 4: 組件整合測試
- Day 5: Code Review + 修復

---

## 下週 Sprint 目標 (Week 2)

**目標日期:** 2026-03-26

1. WebSocket 實際連線測試
2. 錯誤處理優化
3. 單元測試撰寫
4. E2E 測試準備

---

**相關文檔:**
- [進度追蹤](progress.md)
- [里程碑](milestones.md)
- [Multi-Agent 計劃](multi-agent-development-plan.md)
