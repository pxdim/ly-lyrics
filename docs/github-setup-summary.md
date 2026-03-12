# LY 專案 - GitHub 自動化設定完成

## ✅ 已完成項目

### 1. GitHub Actions 工作流

| 檔案 | 功能 | 觸發條件 |
|------|------|---------|
| `.github/workflows/ci.yml` | CI 檢查 (TypeScript, Lint, Build) | Push to main/develop, PR |
| `.github/workflows/supabase-migrate.yml` | 自動執行資料庫遷移 | 變更 migration 檔案 |
| `.github/workflows/deploy.yml` | 自動部署到 Railway | Push to main |

### 2. Git Hooks (Husky)

| Hook | 功能 |
|------|------|
| `.husky/pre-commit` | Commit 前執行 type-check 和 lint |
| `.husky/commit-msg` | 強制 Conventional Commits 格式 |

### 3. 文檔

- `docs/github-setup-guide.md` - 完整的 GitHub 設定指南

---

## 📋 待辦清單

### 必須完成 (首次使用)

#### 1. 初始化 Git Repository
```bash
git init
git add .
git commit -m "feat: initial commit with full stack setup"
```

#### 2. 設定 GitHub Secrets

前往 GitHub Repository → Settings → Secrets and variables → Actions

**Supabase Secrets:**
- `SUPABASE_ACCESS_TOKEN` - [取得方式](https://supabase.com/dashboard/account/tokens)
- `SUPABASE_PROJECT_ID` - Dashboard → Project Settings → General

**Railway Secrets (可選):**
- `RAILWAY_TOKEN` - Railway Dashboard → Account → API Tokens
- `RAILWAY_PROJECT_ID` - Railway Project → Settings

#### 3. 更新本地環境變數

確認 `.env.local` 中的 Supabase URL 正確：
```env
NEXT_PUBLIC_SUPABASE_URL=https://正確的專案ID.supabase.co
```

---

## 🎯 使用方式

### 自動 CI/CD
```bash
# 開發功能
git checkout -b feat/new-feature
git add .
git commit -m "feat: add song search feature"  # 格式會被檢查
git push

# 合併到 main 後自動：
# 1. 執行 CI 檢查
# 2. 執行 Supabase 遷移
# 3. 部署到 Railway
```

### 手動觸發遷移
```
GitHub → Actions → Supabase Migrations → Run workflow
```

---

## 🔧 本地開發流程

### 1. 修復 Supabase 連線
```bash
# 檢查環境變數
cat .env.local | grep SUPABASE

# 測試連線
curl -I https://你的專案ID.supabase.co
```

### 2. 執行資料庫遷移
```bash
# 方式 A: 在 Supabase Dashboard SQL Editor 執行
# 複製 supabase/migrations/001_initial_schema.sql 的內容

# 方式 B: 使用 Supabase CLI (需要先安裝)
supabase link --project-ref YOUR_PROJECT_ID
supabase db push
```

### 3. 啟動開發伺服器
```bash
# 標準模式 (無 WebSocket)
npm run dev

# WebSocket 模式
npm run dev:ws
```

---

## 📁 專案結構

```
ly/
├── .github/
│   └── workflows/
│       ├── ci.yml                   # CI 工作流
│       ├── deploy.yml               # 部署工作流
│       └── supabase-migrate.yml     # 遷移工作流
├── .husky/
│   ├── pre-commit                   # Commit 前檢查
│   └── commit-msg                   # 訊息格式檢查
├── app/
│   ├── api/
│   │   ├── songs/route.ts           # ✅ REST API
│   │   ├── songs/[id]/route.ts      # ✅ REST API
│   │   ├── playlists/route.ts       # ✅ API
│   │   ├── settings/route.ts        # ✅ API
│   │   └── ws/route.ts              # ✅ WebSocket 資訊
│   ├── controller/page.tsx          # 控制端頁面
│   └── display/page.tsx             # 顯示端頁面
├── lib/
│   ├── services/
│   │   └── songService.ts           # ✅ Supabase 服務層
│   ├── store/
│   │   └── index.ts                 # ✅ Zustand Store
│   ├── supabase/
│   │   ├── client.ts                # ✅ Supabase 客戶端
│   │   └── types.ts                 # ✅ 資料庫類型
│   └── websocket/
│       ├── server.ts                # ✅ WebSocket 伺服器
│       └── client.ts                # ✅ WebSocket 客戶端
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # ✅ 資料庫遷移
└── docs/
    ├── github-setup-guide.md        # ✅ GitHub 設定指南
    └── development-summary-2026-03-12.md
```

---

## 🧪 驗證清單

完成以下項目後即可驗證所有功能：

- [ ] Git 已初始化並推送到 GitHub
- [ ] GitHub Secrets 已設定
- [ ] Supabase URL 正確可連線
- [ ] 資料庫遷移已執行
- [ ] `npm run build` 成功
- [ ] `npm run type-check` 無錯誤
- [ ] `npm run lint` 無錯誤
- [ ] API 端點回傳正確資料
- [ ] GitHub Actions 工作流可正常執行

---

## 🚀 下一步建議

1. **修復 Supabase 連線** - 確認正確的專案 URL
2. **初始化 Git** - `git init && git add . && git commit`
3. **推送到 GitHub** - 建立遠端 repository
4. **設定 Secrets** - 按照 `docs/github-setup-guide.md` 說明
5. **測試 GitHub Actions** - 推送程式碼觸發 CI

---

**文件建立時間:** 2026-03-12
**狀態:** 等待 Supabase 認證資訊更新
