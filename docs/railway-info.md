# Railway 專案資訊

**建立日期:** 2026-03-12
**專案狀態:** ✅ 已建立

---

## 專案連結

- **Project ID:** `0b6e0369-b0c3-400e-a2d4-a2c6c3062887`
- **Token:** `5fbc4ee7-578c-4d47-80ee-579db203ea26`
- **Dashboard:** https://railway.app/project/0b6e0369-b0c3-400e-a2d4-a2c6c3062887

---

## CLI 使用

```bash
# 安裝 Railway CLI
npm install -g @railway/cli

# 登入
railway login --token 5fbc4ee7-578c-4d47-80ee-579db203ea26

# 連接到專案
railway link --project-id 0b6e0369-b0c3-400e-a2d4-a2c6c3062887

# 查看專案狀態
railway status

# 查看日誌
railway logs

# 部署
railway up

# 開啟 Dashboard
railway open
```

---

## 環境變數設定

在 Railway Dashboard 中設定以下環境變數：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://qpkhhnzsbfvouhyhtwjz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=your_gemini_key_here
```

---

## 部署指令

```bash
# 連接並部署
railway link
railway up

# 查看部署日誌
railway logs --app name

# 重啟服務
railway restart
```

---

**最後更新:** 2026-03-12
