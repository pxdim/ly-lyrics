# ADR-002: 選擇 Supabase 作為資料庫與認證服務

**狀態:** 🟢 採用

**日期:** 2026-03-11
**決策者:** Architect
**相關角色:** Database Administrator, Backend Developer, DevOps/SRE

---

## 背景

LY 專案需要一個資料庫解決方案來儲存：
- 歌曲資料
- 播放列表
- 用戶設定
- 用戶認證資訊

需求包括：
- 快速建置與部署
- 內建認證功能
- 免費層支援小型專案
- Railway 易於整合

---

## 決策

我們決定使用 **Supabase (PostgreSQL)** 作為資料庫與認證服務。

**原因:**
1. **Railway 內建整合**: Railway 專案可直接連接 Supabase
2. **免費層足夠**: 500MB 資料庫空間，足以支援 MVP
3. **內建認證**: Supabase Auth 提供完整的用戶認證
4. **即時功能**: Supabase Realtime 可作為 WebSocket 備選方案
5. **TypeScript 支援**: 官方 SDK 型別完整
6. **RLS 支援**: Row Level Security 保護用戶資料

---

## 替代方案

### 方案 A: Railway PostgreSQL (內建)
- **優點:** 與 Railway 深度整合，無需額外服務
- **缺點:** 需要自行實作認證系統
- **為何不採用:** 開發時間較長，認證系統複雜

### 方案 B: MongoDB + Atlas
- **優點:** 文件型資料庫，歌詞儲存更靈活
- **缺點:** 需要額外認證服務
- **為何不採用:** 專案需求關聯性強，關聯式資料庫更合適

### 方案 C: PlanetScale (MySQL)
- **優點:** 免費層無限請求
- **缺點:** 不支援外鍵約束
- **為何不採用:** 專案需要資料完整性保證

---

## 影響範圍

### 受影響的組件
- 資料庫 Schema 設計
- 用戶認證流程
- 資料庫查詢層

### 受影響的文檔
- [database.md](../../spec/database.md)
- [architecture.md](../../spec/architecture.md)

### 需要更新的程式碼
- `lib/db/supabase.ts`
- `lib/db/schema.ts`
- `.env.local`

### Supabase 專案資訊
- URL: `https://ylwtfaczffuzyaijhhqu.supabase.co`
- Auth Callback: `https://ylwtfaczffuzyaijhhqu.supabase.co/auth/v1/callback`

---

## 實作計劃

- [x] Supabase 專案建立
- [ ] 資料表 Schema 建立
- [ ] RLS Policy 設定
- [ ] Supabase Client 整合
- [ ] 認證流程實作

**預計完成:** 2026-03-19
**負責人:** Database Administrator, Backend Developer

---

## 相關決策

- ADR-001: 選擇 Next.js 作為全端框架
- ADR-003: 選擇 Google Gemini API 作為 AI 服務

---

**建立日期:** 2026-03-11
**最後更新:** 2026-03-11
