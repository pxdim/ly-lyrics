# ADR-005: 選擇 tRPC 作為 API 層

**狀態:** 🟢 採用

**日期:** 2026-03-11
**決策者:** Architect
**相關角色:** Frontend Developer, Backend Developer

---

## 背景

LY 專案需要型別安全的 API 通訊方式，避免前後端型別不一致的問題。

需求包括：
- 端到端型別安全
- 自動生成 API 客戶端
- 支援 React Query 整合
- 開發體驗良好

---

## 決策

我們決定使用 **tRPC** 作為 API 層框架。

**原因:**
1. **型別安全**: 前後端共用型別定義，編譯時期錯誤檢查
2. **自動生成**: 無需手寫 API 客戶端程式碼
3. **React Query 整合**: 內建快取與重新驗證機制
4. **開發效率**: API 變更自動反映到前端
5. **與 Next.js 完美整合**: 同一專案內使用

---

## 替代方案

### 方案 A: REST API + Swagger
- **優點:** 標準化，易於理解
- **缺點:** 需要手動維護型別定義
- **為何不採用:** 開發效率較低

### 方案 B: GraphQL
- **優點:** 靈活的查詢語言
- **缺點:** 學習曲線陡峭，配置複雜
- **為何不採用:** 專案規模不需要如此複雜的方案

### 方案 C: 純 REST + 手動型別
- **優點:** 最簡單
- **缺點:** 型別不同步風險高
- **為何不採用:** 專案重視型別安全

---

## 影響範圍

### 受影響的組件
- 所有 API 端點
- 前端 API 客戶端
- 型別定義

### 受影響的文檔
- [api.md](../../spec/api.md)
- [types.md](../../spec/types.md)

### 需要更新的程式碼
- `lib/trpc/init.ts`
- `lib/trpc/router.ts`
- `lib/trpc/context.ts`
- `lib/trpc/routers/` (各個 router)

### tRPC Router 結構
```typescript
appRouter = router({
  songs: songsRouter,
  playlists: playlistsRouter,
  settings: settingsRouter,
})
```

---

## 實作計劃

- [ ] tRPC 初始化
- [ ] Context 建立
- [ ] Router 結構定義
- [ ] songs router 實作
- [ ] playlists router 實作
- [ ] 前端客戶端整合

**預計完成:** 2026-03-20
**負責人:** Backend Developer

---

## 相關決策

- ADR-001: 選擇 Next.js 作為全端框架
- ADR-006: 選擇 Zustand 作為狀態管理

---

**建立日期:** 2026-03-11
**最後更新:** 2026-03-11
