# Supabase 專案資訊

**專案建立日期:** 2026-03-12
**專案狀態:** ✅ 已建立並設定完成

---

## 專案連結

- **Dashboard:** https://supabase.com/dashboard/project/qpkhhnzsbfvouhyhtwjz
- **Project ID:** `qpkhhnzsbfvouhyhtwjz`
- **API URL:** `https://qpkhhnzsbfvouhyhtwjz.supabase.co`
- **SQL Editor:** https://supabase.com/dashboard/project/qpkhhnzsbfvouhyhtwjz/sql
- **Table Editor:** https://supabase.com/dashboard/project/qpkhhnzsbfvouhyhtwjz/editor

---

## ⚠️ 必須手動完成：建立 Demo 用戶

由於 `songs` 表有外鍵約束 `songs_user_id_fkey` 參考 `auth.users`，需要先建立用戶才能新增歌曲。

### 步驟 1：前往 SQL Editor

點擊以下連結或手動導航：
```
https://supabase.com/dashboard/project/qpkhhnzsbfvouhyhtwjz/sql/new
```

### 步驟 2：執行以下 SQL

```sql
-- 建立 Demo 用戶
INSERT INTO auth.users (
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo@ly-lyrics.local',
  NOW(),
  '{"name": "Demo User"}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;
```

### 步驟 3：執行資料庫遷移

在同一個 SQL Editor 中，依次執行 `supabase/migrations/001_initial_schema.sql` 的內容。

或使用 Supabase CLI：
```bash
supabase link --project-ref qpkhhnzsbfvouhyhtwjz
supabase db push
```

---

## GitHub Repository

- **Repo:** https://github.com/pxdim/ly-lyrics
- **已推送的 commits:** 2

---

## 測試 API

完成上述步驟後，測試 API：

```bash
# 啟動開發伺服器
npm run dev

# 測試新增歌曲
curl -X POST http://localhost:3000/api/songs \
  -H "Content-Type: application/json" \
  -d '{"title":"測試歌曲","lyrics":["第一句","第二句"]}'

# 查詢歌曲
curl http://localhost:3000/api/songs
```

---

## 環境變數 (.env.local)

已設定：
- `NEXT_PUBLIC_SUPABASE_URL` = `https://qpkhhnzsbfvouhyhtwjz.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (已設定)
- `SUPABASE_SERVICE_ROLE_KEY` = (已設定)

---

**最後更新:** 2026-03-12
