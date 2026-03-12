# Supabase 設定指南

**專案:** LY - 歌詞顯示系統
**資料庫:** Supabase PostgreSQL
**建立日期:** 2026-03-12

---

## 連線資訊

```
Host: ylwtfaczffuzyaijhhqu.supabase.co
Port: 5432
Database: postgres
```

---

## 設定步驟

### 步驟 1: 安裝 Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Linux
curl -fsSL https://supabase.com/install.sh | bash

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 步驟 2: 連線到專案

```bash
# 登入 Supabase
supabase login

# 連線到專案
supabase link --project-ref ylwtfaczffuzyaijhhqu
```

### 步驟 3: 執行資料庫遷移

```bash
# 執行遷移建立資料表
supabase db push

# 或者在 Supabase Dashboard 的 SQL Editor 中執行
# 打開 supabase/migrations/001_initial_schema.sql
# 複製全部 SQL 到 SQL Editor 執行
```

### 步驟 4: 驗證資料表建立

在 Supabase Dashboard 的 **Table Editor** 中應該看到以下資料表：

| 資料表 | 說明 |
|--------|------|
| `songs` | 歌曲資料 |
| `playlists` | 播放列表 |
| `playlist_songs` | 播放列表歌曲關聯 |
| `user_settings` | 用戶設定 |
| `sessions` | 同步會話 |
| `session_clients` | 會話客戶端 |
| `ai_listening_logs` | AI 監聽日誌 |

---

## 手動設定（Dashboard 操作）

如果無法使用 CLI，可以在 Supabase Dashboard 手動執行：

### 1. 開啟 SQL Editor

前往 `https://supabase.com/dashboard/project/ylwtfaczffuzyaijhhqu/sql/new`

### 2. 執行遷移檔案

打開 `supabase/migrations/001_initial_schema.sql`，複製全部內容貼上並執行。

### 3. 驗證 RLS 政策

在 **Authentication** → **Policies** 頁面確認以下政策已建立：

- `songs`: Users can view/insert/update/delete their own songs
- `playlists`: Users can view/insert/update/delete their own playlists
- `user_settings`: Users can view/update their own settings
- `sessions`: Users can view/update their own sessions

---

## 環境變數設定

確保 `.env.local` 包含以下設定：

```env
NEXT_PUBLIC_SUPABASE_URL=https://ylwtfaczffuzyaijhhqu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 取得 API 金鑰

1. 前往 Supabase Dashboard → **Settings** → **API**
2. 複製以下金鑰：
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 常見問題排查

### 問題 1: RLS 政策阻擄查詢

**症狀:** 查詢返回空結果

**解決:**
```sql
-- 檢查目前用戶
SELECT auth.uid();

-- 暫時停用 RLS（僅用於開發）
ALTER TABLE songs DISABLE ROW LEVEL SECURITY;
```

### 問題 2: 外鍵錯誤

**症狀:** `insert or update on table violates foreign key constraint`

**解決:** 確保 `auth.users` 表中有所需用戶，或先建立用戶。

### 問題 3: 遷移執行失敗

**症狀:** SQL 執行錯誤

**解決:** 按順序執行：
1. 先建立 Functions
2. 再建立 Tables
3. 最後建立 Indexes、Triggers、RLS

---

## 測試查詢

### 測試資料連線

```sql
-- 檢查歌曲數量
SELECT COUNT(*) FROM songs;

-- 檢查用戶設定
SELECT * FROM user_settings;

-- 檢查活動會話
SELECT * FROM v_active_sessions;
```

### 測試 RLS 政策

```sql
-- 設定測試用戶 ID
SET request.jwt.claim.sub = 'your-user-id-uuid';

-- 測試查詢
SELECT * FROM songs WHERE user_id = 'your-user-id-uuid';
```

---

## 備份與還原

### 匯出資料庫

```bash
# 使用 CLI
supabase db dump -f backup.sql

# 或在 Dashboard SQL Editor
SELECT * FROM songs;
```

### 還原資料庫

```bash
# 使用 CLI
supabase db reset --db-url "postgresql://..."

# 或執行備份 SQL 檔案
psql -h ylwtfaczffuzyaijhhqu.supabase.co -U postgres -d postgres -f backup.sql
```

---

## 相關文檔

- [資料庫設計](../spec/database.md)
- [型別定義](../spec/types.md)
- [部署文檔](../deployment.md)

---

**文檔版本:** 1.0.0
**最後更新:** 2026-03-12
