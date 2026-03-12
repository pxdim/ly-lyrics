# Supabase 到自託管架構遷移指南

**日期:** 2026-03-12
**狀態:** ✅ 完成
**目標分支:** `feature/migrate-from-supabase`

---

## 📋 概述

本指南說明如何從 Supabase 平台遷移到完全自託管的架構，使用 Railway 託管的 PostgreSQL 和 Redis，搭配 NextAuth.js 進行身份驗證。

### 遷移架構對比

| 組件 | 遷移前 (Supabase) | 遷移後 (自託管) |
|------|-------------------|-----------------|
| 資料庫 | Supabase PostgreSQL | Railway PostgreSQL |
| 認證 | Supabase Auth | NextAuth.js |
| Session | Supabase Client | Redis + JWT |
| Real-time | Supabase Realtime | Socket.IO + Redis |
| 檔案儲存 | Supabase Storage | PostgreSQL JSONB |

---

## 🚀 快速開始

### 前置需求

1. Railway 帳號 (https://railway.app)
2. GitHub 權限 (用於 PR 和部署)
3. 本地開發環境 (Node.js 22+)

### 執行步驟

```bash
# 1. 切換到遷移分支
git checkout feature/migrate-from-supabase

# 2. 安裝新依賴
npm install

# 3. 複製環境變數範本
cp .env.example .env.local

# 4. 配置環境變數 (見下節)
# 編輯 .env.local

# 5. 啟動開發伺服器
npm run dev
```

---

## 🔧 環境變數配置

### 必需變數

```bash
# ==================== Database ====================
DATABASE_URL=postgresql://user:password@host:5432/dbname

# ==================== Redis ====================
REDIS_URL=redis://host:6379
REDIS_ENABLED=true

# ==================== NextAuth.js ====================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### 生成 NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

### Railway 環境變數

在 Railway Dashboard 設置：

```bash
DATABASE_URL=${{ Postgres.DATABASE_URL }}
REDIS_URL=${{ Redis.REDIS_URL }}
NEXTAUTH_URL=${{ RailwayPublic.Domain }}
NEXTAUTH_SECRET=<從 secrets 設置>
NEXT_PUBLIC_APP_URL=${{ RailwayPublic.Domain }}
```

---

## 📊 資料庫遷移

### 1. 建立 Railway PostgreSQL 服務

1. 登入 Railway Dashboard
2. 新建 Project → 選擇 PostgreSQL
3. 等待服務啟動完成

### 2. 執行 Schema

選擇以下方式之一：

**方式 A: Railway CLI**
```bash
npm install -g @railway/cli
railway login
railway link
railway postgresql
cat lib/db/schema.sql | railway postgresql exec
```

**方式 B: 連線執行**
```bash
# 獲取連線字串
railway variables

# 使用 psql 執行
psql $DATABASE_URL < lib/db/schema.sql
```

### 3. 驗證 Schema

```sql
-- 檢查表格
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- 應該看到: users, songs, playlists, playlist_songs, settings, sessions
```

---

## 🔑 用戶遷移

### Supabase 用戶導出

```bash
# 使用 Supabase CLI
supabase db dump -f backup.sql
```

### 導入到新 PostgreSQL

```sql
-- 轉換 Supabase auth.users 到新 users 表
INSERT INTO users (id, email, password_hash, name, email_verified)
SELECT
  id,
  email,
  -- 需要重新哈希或使用臨時密碼
  crypt('temp_password', gen_salt('bf')),
  raw_user_meta_data->>'name',
  email_confirmed_at IS NOT NULL
FROM auth.users;
```

### Demo 用戶

系統會自動建立 Demo 用戶：

```sql
-- 或手動建立
INSERT INTO users (id, email, password_hash, name, email_verified)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo@ly-lyrics.local',
  '$2a$10$...', -- bcrypt hash
  'Demo User',
  true
);
```

---

## 🔄 API 變更

### 認證變更

| 遷移前 | 遷移後 |
|--------|--------|
| `supabase.auth.signUp()` | `POST /api/auth/signin` |
| `supabase.auth.signIn()` | `POST /api/auth/signin` |
| `supabase.auth.signOut()` | `POST /api/auth/signout` |
| `supabase.auth.getUser()` | `await getCurrentUser()` |

### 數據庫查詢變更

**遷移前 (Supabase):**
```typescript
const { data, error } = await supabase
  .from('songs')
  .select('*')
  .eq('user_id', userId);
```

**遷移後 (直接查詢):**
```typescript
const songs = await getSongs({ userId });
```

---

## 📡 WebSocket 變更

### Session 存儲

**遷移前:** 記憶體 Map
**遷移後:** Redis 持久化

### 重新連線處理

```typescript
// 客戶端需要處理重新連線
wsClient.on('reconnect', () => {
  wsClient.joinSession(sessionId, role);
});
```

---

## 🧪 測試驗證

### 1. 資料庫連線測試

```bash
curl http://localhost:3000/api/health
# 應返回: {"status":"ok"}
```

### 2. 認證測試

```bash
# 註冊新用戶
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 登入
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. 歌曲 CRUD 測試

```bash
# 建立歌曲
curl -X POST http://localhost:3000/api/songs \
  -H "Content-Type: application/json" \
  -d '{"title":"測試歌曲","lyrics":["第一句","第二句"]}'

# 查詢歌曲
curl http://localhost:3000/api/songs
```

### 4. LRC 匯入測試

```bash
# 匯入 LRC
curl -X POST http://localhost:3000/api/songs/{id}/import \
  -H "Content-Type: application/json" \
  -d '{"lrcContent":"[00:01.00]第一句\n[00:05.00]第二句"}'
```

---

## ⚠️ 常見問題

### Q1: 資料庫連線失敗

**症狀:** `connection refused` 或 `ECONNREFUSED`

**解決:**
```bash
# 檢查 DATABASE_URL 格式
postgresql://user:password@host:port/database

# Railway 連線字串包含 sslmode=require
# 需要添加 ?sslmode=require
```

### Q2: NextAuth session 過期

**症狀:** 頻繁要求重新登入

**解決:**
```typescript
// lib/auth/config.ts
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 天
}
```

### Q3: Redis 連線失敗

**症狀:** WebSocket session 不持久化

**解決:**
```bash
# 檢查 Redis URL
redis://default:password@host:port

# 或暫時禁用 Redis (使用記憶體)
REDIS_ENABLED=false
```

### Q4: LRC 解析錯誤

**症狀:** 匯入 LRC 檔案失敗

**解決:**
- 確認 LRC 格式: `[mm:ss.xx]歌詞`
- 檢查編碼 (UTF-8)
- 使用線上 LRC 驗證工具

---

## 📋 部署檢查清單

- [ ] Railway PostgreSQL 已建立
- [ ] Railway Redis 已建立
- [ ] 資料庫 schema 已執行
- [ ] 環境變數已配置
- [ ] NEXTAUTH_SECRET 已生成
- [ ] Demo 用戶已建立
- [ ] API 路由測試通過
- [ ] WebSocket 連線正常
- [ ] LRC 匯入/匯出測試
- [ ] 健康檢查通過

---

## 🔄 回滾計劃

如遷移失敗需要回滾：

```bash
# 1. 回滾到 main 分支
git checkout main
git pull

# 2. 恢復 Supabase 依賴
npm install @supabase/supabase-js @supabase/ssr

# 3. 恢復環境變數
# 使用 .env.example 舊版本
```

---

## 📚 相關文檔

- [Railway 文檔](https://docs.railway.app)
- [NextAuth.js 文檔](https://next-auth.js.org)
- [node-postgres 文檔](https://node-postgres.com)
- [ioredis 文檔](https://github.com/luin/ioredis)

---

**最後更新:** 2026-03-12
**維護者:** LY 團隊
