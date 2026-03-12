# ADR-006: 選擇 Zustand 作為狀態管理方案

**狀態:** 🟢 採用

**日期:** 2026-03-11
**決策者:** Architect
**相關角色:** Frontend Developer

---

## 背景

LY 專案需要管理前端狀態，包括：
- 當前歌曲
- 當前歌詞行索引
- 顯示設定
- WebSocket 連線狀態
- AI 聽歌狀態

---

## 決策

我們決定使用 **Zustand** 作為狀態管理方案。

**原因:**
1. **簡潔**: API 簡單易用，學習成本低
2. **輕量**: Bundle size 小 (~1KB)
3. **TypeScript 支援**: 完整型別推斷
4. **無需 Provider**: 不需要包裹組件樹
5. **DevTools**: 可選的中介軟體支援
6. **持久化**: 內建 persist 中介軟體

---

## 替代方案

### 方案 A: Redux Toolkit
- **優點:** 生態系統完整，最佳實踐
- **缺點:** Bundle size 較大，學習曲線陡峭
- **為何不採用:** 專案狀態複雜度不需要如此重的方案

### 方案 B: Jotai
- **優點:** 原子化狀態，更靈活
- **缺點:** 需要更多樣板程式碼
- **為何不採用:** Zustand 更適合集中式狀態

### 方案 C: React Context
- **優點:** 原生支援
- **缺點:** 效能問題，重渲染
- **為何不採用:** 不適合複雜狀態管理

---

## 影響範圍

### 受影響的組件
- 所有需要狀態的組件
- WebSocket 整合

### 受影響的文檔
- [state-management.md](../../spec/state-management.md)
- [architecture.md](../../spec/architecture.md)

### 需要更新的程式碼
- `stores/lyricsStore.ts`
- `stores/useLyricsStore.ts`

### Store 結構
```typescript
interface LyricsState {
  // State
  currentSong: Song | null
  currentLineIndex: number
  displaySettings: DisplaySettings
  connectionStatus: ConnectionStatus
  sessionId: string
  connectedDisplays: number
  aiListening: AiListeningState

  // Actions
  setCurrentSong: (song: Song) => void
  nextLine: () => void
  prevLine: () => void
  jumpToLine: (index: number) => void
  updateSettings: (settings: Partial<DisplaySettings>) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  toggleAiListening: () => void
}
```

---

## 實作計劃

- [ ] Zustand 設定
- [ ] LyricsState store 建立
- [ ] Actions 實作
- [ ] Persist middleware 設定
- [ ] DevTools 整合 (開發模式)

**預計完成:** 2026-03-21
**負責人:** Frontend Developer

---

## 相關決策

- ADR-001: 選擇 Next.js 作為全端框架
- ADR-004: 選擇 WebSocket 作為即時通訊協議

---

**建立日期:** 2026-03-11
**最後更新:** 2026-03-11
