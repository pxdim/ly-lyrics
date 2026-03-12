# ADR-001: 選擇 Next.js 15 作為全端框架

**狀態:** 🟢 採用

**日期:** 2026-03-11
**決策者:** Architect
**相關角色:** Frontend Developer, Backend Developer, DevOps/SRE

---

## 背景

LY 專案需要一個現代化的全端框架來建置歌詞顯示系統。主要需求包括：
- 服務端渲染 (SSR) 支援 SEO
- API 路由用於後端邏輯
- WebSocket 支援即時通訊
- AI 友善的開發環境
- 快速開發與部署

---

## 決策

我們決定使用 **Next.js 15 (App Router)** 作為專案的全端框架。

**原因:**
1. **AI 友善**: React 生態系統最完整，AI 工具鏈成熟
2. **開發效率**: 前後端統一技術棧，減少上下文切換
3. **SSR/SSG 支援**: 靜態生成優化首頁載入
4. **API Routes**: 內建 API 端點，無需額外後端框架
5. **部署簡單**: Railway 一鍵部署，無需複雜配置
6. **型別安全**: 與 TypeScript 完美整合

---

## 替代方案

### 方案 A: SvelteKit
- **優點:** 更小的 bundle size，更快的效能
- **缺點:** 生態系統較小，AI 工具支援有限
- **為何不採用:** 專案需要大量 AI 輔助開發，SvelteKit 的 AI 支援不足

### 方案 B: Nuxt 3 (Vue)
- **優點:** Vue 3 組合式 API 易於理解
- **缺點:** 需要額外學習成本，團隊熟悉 React
- **為何不採用:** 團隊對 React 更為熟悉

### 方案 C: 前後端分離 (React + Express/Fastify)
- **優點:** 職責分離更清晰
- **缺點:** 需要維護兩個專案，部署更複雜
- **為何不採用:** 專案規模不需要如此複雜的架構

---

## 影響範圍

### 受影響的組件
- 所有前端頁面
- 所有 API 端點
- WebSocket 伺服器

### 受影響的文檔
- [architecture.md](../../spec/architecture.md)
- [api.md](../../spec/api.md)

### 需要更新的程式碼
- `app/` 目錄結構 (App Router)
- `next.config.ts`
- `package.json`

---

## 實作計劃

- [x] 架構確認
- [ ] Next.js 專案初始化
- [ ] App Router 目錄結構建立
- [ ] API Routes 設定
- [ ] WebSocket 整合

**預計完成:** 2026-03-18
**負責人:** Frontend Developer, Backend Developer

---

## 相關決策

- ADR-002: 選擇 Supabase 作為資料庫
- ADR-003: 選擇 tRPC 作為 API 層
- ADR-004: 選擇 WebSocket 作為即時通訊協議
- ADR-005: 選擇 Zustand 作為狀態管理

---

**建立日期:** 2026-03-11
**最後更新:** 2026-03-11
