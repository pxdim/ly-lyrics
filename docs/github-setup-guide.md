# GitHub Actions 自動化設定指南

## 概述

LY 專案已整合 GitHub Actions 實現以下自動化：
- ✅ 自動執行 Supabase 資料庫遷移
- ✅ CI (TypeScript 檢查、Lint、Build)
- ✅ 自動部署到 Railway
- ✅ 自動建立 Releases

---

## 第一次設定：GitHub Secrets

### 1. Supabase Secrets

前往 GitHub Repository → Settings → Secrets and variables → Actions

新增以下 Secrets：

| Secret 名稱 | 說明 | 如何取得 |
|-------------|------|----------|
| `SUPABASE_ACCESS_TOKEN` | Supabase API Token | [Supabase Dashboard](https://supabase.com/dashboard/account/tokens) → Create Access Token |
| `SUPABASE_PROJECT_ID` | 專案 ID | Dashboard → Project Settings → General → Project Reference |
| `NEXT_PUBLIC_SUPABASE_URL` | API URL | Dashboard → Project Settings → API → URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon Key | Dashboard → Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key | Dashboard → Project Settings → API → service_role (保密!) |

### 2. Railway Secrets

| Secret 名稱 | 說明 | 如何取得 |
|-------------|------|----------|
| `RAILWAY_TOKEN` | Railway API Token | [Railway Dashboard](https://railway.app/account) → API Tokens |
| `RAILWAY_PROJECT_ID` | 專案 ID | Railway Project → Settings → Project ID |

---

## 如何取得 Supabase API Token

### 步驟 1：前往 Access Tokens 頁面
```
https://supabase.com/dashboard/account/tokens
```

### 步驟 2：建立新的 Access Token
1. 點擊「Create new token」
2. 命名為 `github-actions`
3. 選擇權限：`project:read` 和 `project:migrate`
4. 點擊「Create」

### 步驟 3：複製 Token
⚠️ **只會顯示一次！** 立即複製並貼到 GitHub Secrets

---

## 如何取得 Supabase Project ID

### 方式 1：從 Dashboard
1. 開啟您的專案
2. Settings → General
3. 複製「Project Reference」

### 方式 2：從 URL
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID
```

Project ID 就是 URL 中的 `YOUR_PROJECT_ID` 部分

---

## 使用 GitHub Actions 觸發遷移

### 自動觸發
推送到 `main` 或 `develop` 分支，且變更了 `supabase/migrations/` 中的檔案：

```bash
git add supabase/migrations/*
git commit -m "feat: add user_settings table"
git push
```

### 手動觸發
1. 前往 GitHub Repository
2. 點擊「Actions」標籤
3. 選擇「Supabase Migrations」
4. 點擊「Run workflow」

---

## 工作流說明

### `.github/workflows/supabase-migrate.yml`
執行資料庫遷移到 Supabase

```yaml
# 觸發條件：
- 推送到 main/develop 分支
- supabase/migrations/ 有變更
- 手動觸發

# 執行步驟：
1. Checkout 程式碼
2. 安裝 Supabase CLI
3. 連結專案
4. 執行 supabase db push
5. 驗證遷移
```

### `.github/workflows/ci.yml`
CI 程式碼品質檢查

```yaml
# 執行：
- TypeScript 類型檢查
- ESLint 檢查
- Build 測試
- 單元測試
```

### `.github/workflows/deploy.yml`
自動部署到 Railway

```yaml
# 觸發條件：
- 推送到 main 分支

# 執行：
1. Build 專案
2. 部署到 Railway
3. 健康檢查
```

---

## 本地使用 Supabase CLI

### 安裝 CLI
```bash
npm install -g supabase
# 或
brew install supabase/tap/supabase
```

### 連結專案
```bash
supabase init --project-id YOUR_PROJECT_ID
```

### 本地開發
```bash
# 啟動本地 Supabase
supabase start

# 查看狀態
supabase status

# 執行遷移
supabase db push

# 重置資料庫
supabase db reset
```

### 生成類型
```bash
supabase gen types typescript --local > lib/supabase/types.ts
```

---

## 故障排除

### Q: GitHub Actions 失敗顯示「Project not found」
**A:** 檢查 `SUPABASE_PROJECT_ID` Secret 是否正確

### Q: Migration 失敗
**A:**
1. 檢查 migration SQL 語法
2. 確認 Supabase Access Token 有 `project:migrate` 權限
3. 在 Actions Log 中查看完整錯誤訊息

### Q: 連線失敗 (DNS 錯誤)
**A:**
1. 確認專案 ID 正確
2. 檢查專案是否處於暫停狀態
3. 驗證網路連線

---

## 最佳實踐

### 1. 遷移命名規範
```
001_initial_schema.sql
002_add_user_settings.sql
003_add_playlists.sql
004_fix_timestamps.sql
```

### 2. 遷移順序
- 永遠**新增** migration，不要修改已存在的
- 使用 `001_`, `002_` 前綴確保順序
- 每個 migration 應該是冪等的 (idempotent)

### 3. 測試遷移
```bash
# 在本地先測試
supabase db reset

# 確認無誤後再推送
git push
```

---

## 相關文檔

- [Supabase CLI 文檔](https://supabase.com/docs/guides/cli)
- [GitHub Actions 文檔](https://docs.github.com/en/actions)
- [Railway 部署文檔](https://docs.railway.app/deploy)

---

**最後更新:** 2026-03-12
