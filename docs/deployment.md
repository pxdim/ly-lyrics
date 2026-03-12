# 部署文檔

## 部署概覽

LY 系統部署在 **Railway**，使用 **Supabase** 作為資料庫服務。

---

## 部署架構

```
                    ┌─────────────────┐
                    │  Cloudflare     │
                    │     CDN         │
                    └────────┬────────┘
                             │
                             ▼
    ┌────────────────────────────────────────────┐
    │            Railway App                      │
    │  ┌──────────────────────────────────────┐  │
    │  │         Next.js Application           │  │
    │  │  (Frontend + API + WebSocket)         │  │
    │  └──────────────────────────────────────┘  │
    └────────┬───────────────────────────────────┘
             │
     ┌───────┴────────┬────────────────┐
     ▼                ▼                ▼
┌─────────┐    ┌─────────────┐   ┌──────────┐
│Supabase │    │ Google Gemini │   │ Redis    │
│ (DB)    │    │  (AI)       │   │ (Cache)  │
└─────────┘    └─────────────┘   └──────────┘
```

---

## 環境設定

### 環境變數

| 變數名稱 | 說明 | 範例 |
|---------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名金鑰 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服務金鑰 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `GOOGLE_API_KEY` | Google Gemini API 金鑰 | `AIzaxxx...` |
| `RAILWAY_PUBLIC_URL` | Railway 公開 URL | `https://xxx.railway.app` |
| `RAILWAY_PRIVATE_URL` | Railway 私有 URL | `https://xxx.railway.internal` |
| `DATABASE_URL` | 資料庫連線字串 (Railway 自動設定) | `postgresql://...` |
| `REDIS_URL` | Redis 連線字串 (可選) | `redis://...` |

---

## Railway 部署

### 1. 建立專案

```bash
# 安裝 Railway CLI
npm install -g @railway/cli

# 登入
railway login

# 初始化專案
railway init
```

### 2. 設定專案

在 Railway Dashboard 中：

1. **建立新專案**
   - 名稱: `ly-lyrics-display`
   - 來源: 連接 GitHub Repository

2. **設定環境變數**
   - 在 Variables 頁面添加所有環境變數

3. **設定 Supabase**
   - URL: `https://ylwtfaczffuzyaijhhqu.supabase.co`
   - 在 Supabase Dashboard 設定 Railway 為允許的來源

### 3. Railway 設定檔

```toml
# railway.toml
[build]
  builder = "NIXPACKS"

[deploy]
  healthcheckPath = "/api/health"
  healthcheckTimeout = 300
  restartPolicyType = "ON_FAILURE"
  gracePeriodSeconds = 30

[[services]]
  name = "web"
  source = "."
  healthcheck_path = "/api/health"

  [[services.ports]]
    port = 3000
    public = true

  [[services.env]]
    KEY = "NODE_ENV"
    VALUE = "production"
```

### 4. 部署指令

```bash
# 部署到 Railway
railway up

# 查看日誌
railway logs

# 開啟網站
railway open
```

---

## Supabase 設定

### 1. 建立專案

已在 Supabase 建立專案：
- URL: `https://ylwtfaczffuzyaijhhqu.supabase.co`
- Auth Callback: `https://ylwtfaczffuzyaijhhqu.supabase.co/auth/v1/callback`

### 2. 執行資料庫遷移

```bash
# 使用 Supabase CLI
supabase migration up

# 或在 Supabase SQL Editor 執行
# 執行 spec/database.md 中的所有 SQL
```

### 3. 設定 RLS (Row Level Security)

```sql
-- 啟用 RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

-- 用戶只能存取自己的資料
CREATE POLICY "Users can view own songs"
  ON songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own songs"
  ON songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own songs"
  ON songs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own songs"
  ON songs FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Google Gemini API 設定

### 1. 取得 API Key

1. 前往 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 建立 API Key
3. 複製 Key 到 Railway 環境變數

### 2. 整合設定

```typescript
// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)

export async function transcribeAudio(audioData: Buffer) {
  // 實作音訊辨識
}
```

---

## Cloudflare CDN (可選)

### 1. 設定自訂網域

1. 在 Cloudflare 新增網域
2. 設定 CNAME 指向 Railway URL
3. 啟用 SSL/TLS

### 2. 快取規則

```
# 靜態資源快取
*.js, *.css, *.png, *.jpg, *.svg, *.woff2
快取時間: 1 年

# API 不快取
/api/*
不快取
```

---

## 健康檢查

### Health Check 端點

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      gemini: await checkGemini(),
      websocket: 'operational',
    }
  }

  return NextResponse.json(checks)
}
```

---

## 監控與日誌

### Railway 內建監控

- **Metrics**: CPU、記憶體、網路使用
- **Logs**: 即時日誌串流
- **Alerts**: 設定警報通知

### 外部監控 (可選)

| 服務 | 用途 |
|------|------|
| Sentry | 錯誤追蹤 |
| LogRocket | 使用者錄影 |
| PostHog | 分析 |

---

## CI/CD 流程

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Railway
        uses: railwayapp/cli@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          command: "up --verbose"

      - name: Run E2E tests
        run: pnpm test:e2e
```

---

## 備份與災難恢復

### 資料庫備份

- **自動備份**: Supabase 每日自動備份
- **手動備份**: 重大更新前手動匯出

### 恢復程序

```bash
# 從備份恢復
supabase db restore --file backup.sql
```

---

## 效能優化

### 1. Railway 自動擴展

```toml
# railway.toml
[deploy]
  autoRollback = true

[[services]]
  minReplicas = 1
  maxReplicas = 10
```

### 2. CDN 快取

靜態資源透過 Cloudflare CDN 快取

---

## 安全檢查清單

### 部署前

- [ ] 所有環境變數已設定
- [ ] API Key 已妥善保管
- [ ] RLS 已啟用
- [ ] HTTPS 已啟用
- [ ] 健康檢查端點正常
- [ ] 日誌記錄已啟用

---

## 相關文檔

- [系統架構](spec/architecture.md)
- [資料庫設計](spec/database.md)
- [安全檢查清單](security.md)

---

**文件版本:** 1.0
**最後更新:** 2026-03-12

---

## Railway 專案資訊

- **Project ID:** `0b6e0369-b0c3-400e-a2d4-a2c6c3062887`
- **Token:** `5fbc4ee7-578c-4d47-80ee-579db203ea26`
- **Dashboard:** https://railway.app/project/0b6e0369-b0c3-400e-a2d4-a2c6c3062887

**變更記錄:**
- v1.1 (2026-03-12): 更新 Railway 專案資訊
