# ADR-004: 選擇 WebSocket 作為即時通訊協議

**狀態:** 🟢 採用

**日期:** 2026-03-11
**決策者:** Architect
**相關角色:** Frontend Developer, Backend Developer, DevOps/SRE

---

## 背景

LY 專案需要即時同步歌詞位置，從控制端到多個顯示端。

需求包括：
- 低延遲 (< 100ms)
- 雙向通訊
- 多裝置同時連線
- 自動重連機制

---

## 決策

我們決定使用 **WebSocket (Socket.io)** 作為即時通訊協議。

**原因:**
1. **低延遲**: WebSocket 全雙工通訊，延遲最低
2. **雙向通訊**: 支援控制端與顯示端雙向互動
3. **自動重連**: Socket.io 內建自動重連機制
4. **房間機制**: 易於實作 Session 管理
5. **成熟穩定**: 經過大量專案驗證

---

## 替代方案

### 方案 A: Server-Sent Events (SSE)
- **優點:** 實作簡單，瀏覽器原生支援
- **缺點:** 只能單向通訊 (伺服器 → 客戶端)
- **為何不採用:** 需要雙向通訊

### 方案 B: Supabase Realtime
- **優點:** 與 Supabase 深度整合
- **缺點:** 延遲較高，調試困難
- **為何不採用:** 需要更低延遲的方案

### 方案 C: 輪詢 (Polling)
- **優點:** 實作最簡單
- **缺點:** 延遲高，資源浪費
- **為何不採用:** 效能不佳

---

## 影響範圍

### 受影響的組件
- WebSocket 伺服器
- WebSocket 客戶端
- Session 管理

### 受影響的文檔
- [api.md](../../spec/api.md)
- [architecture.md](../../spec/architecture.md)

### 需要更新的程式碼
- `lib/websocket/server.ts`
- `lib/websocket/client.ts`
- `lib/websocket/events.ts`
- `app/api/websocket/route.ts`

### Railway 部署注意事項
- Railway 支援 WebSocket，但需要確認配置
- 可能需要使用 `upgrade` 標頭處理

---

## 實作計劃

- [ ] WebSocket 伺服器實作
- [ ] 事件定義與處理
- [ ] Session 管理
- [ ] 自動重連邏輯
- [ ] 心跳檢測機制

**預計完成:** 2026-03-25
**負責人:** Backend Developer, Frontend Developer

---

## 效能目標

```yaml
延遲:
  - 本地測試: < 20ms
  - 同區域: < 50ms
  - 跨區域: < 100ms

連線數:
  - 單 Session: 10+ 裝置
  - 總連線: 受 Railway 限制
```

---

## 相關決策

- ADR-001: 選擇 Next.js 作為全端框架
- ADR-005: 選擇 Zustand 作為狀態管理

---

**建立日期:** 2026-03-11
**最後更新:** 2026-03-11
