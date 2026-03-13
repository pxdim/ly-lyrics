# 開發規範

## 開發概覽

LY 系統採用前後端分離架構，開發涉及兩種語言：
- **前端**：TypeScript + Next.js + React
- **後端**：Go + Ent ORM + chi Router

---

## 專案結構

```
ly-lyrics/
├── app/                    # Next.js App Router 頁面
│   ├── controller/         # Controller 控制台
│   ├── display/            # Display 顯示端
│   ├── layout.tsx          # 根佈局
│   └── page.tsx            # 首頁
├── components/             # React 元件
│   ├── controller/         # Controller 專用
│   ├── lyrics/             # 歌詞顯示
│   ├── settings/           # 設定面板
│   └── ui/                 # UI 基礎元件
├── lib/                    # 前端核心函式庫
│   ├── api/                # API 呼叫封裝
│   ├── auth/               # JWT session
│   ├── websocket/          # WebSocket 客戶端
│   ├── store/              # Zustand Store
│   ├── schemas/            # Zod 驗證
│   ├── lrc/                # LRC 解析
│   └── errors/             # 錯誤型別
├── backend/                # Go 後端
│   ├── cmd/server/         # 程式入口
│   └── internal/           # 內部模組（handler, service, auth, ws, redis, ent, dto）
├── docs/                   # 文檔
├── Dockerfile              # 前端 Docker
└── package.json            # 前端依賴
```

---

## 程式碼規範

### TypeScript 前端

| 類型 | 慣例 | 範例 |
|------|------|------|
| 元件 | PascalCase | `LyricsDisplay.tsx` |
| 函數 | camelCase | `getNextLine()` |
| 常數 | UPPER_SNAKE_CASE | `MAX_DISPLAY_LINES` |
| 型別 | PascalCase | `Song`, `LyricsState` |
| 檔案 | PascalCase（元件）/ camelCase（函式庫） | `LyricsLine.tsx`, `songs.ts` |

### Go 後端

| 類型 | 慣例 | 範例 |
|------|------|------|
| Package | lowercase | `handler`, `service` |
| 公開函數 | PascalCase | `ListSongs()`, `GetByID()` |
| 私有函數 | camelCase | `parseRequest()` |
| 結構體 | PascalCase | `SongResponse`, `Config` |
| 常數 | PascalCase 或 UPPER_SNAKE_CASE | `DemoUserID` |
| 檔案 | snake_case | `song.go`, `rate_limit.go` |

---

## 開發指令

### 前端

```bash
npm run dev          # 啟動開發伺服器（Turbopack, port 3000）
npm run build        # 生產建置
npm run lint         # ESLint 檢查
npm run type-check   # TypeScript 型別檢查
npm run test         # Vitest 單元測試
npm run test:e2e     # Playwright E2E 測試
```

### Go 後端

```bash
cd backend

go run ./cmd/server              # 啟動開發伺服器（port 8080）
go build -o server ./cmd/server  # 編譯
go test ./...                    # 執行所有測試
go test ./... -v                 # 詳細測試輸出
go test -run TestName ./internal/service/  # 執行特定測試
go generate ./...                # Ent ORM 程式碼產生
go vet ./...                     # 靜態分析
```

---

## Git 工作流程

### 分支策略

```
main          ───────> 生產環境（Railway 自動部署）
               │
feature/*     ───────> 功能開發
               │
fix/*         ───────> Bug 修復
```

### Commit 訊息規範

```
<type>(<scope>): <subject>
```

**Type:** `feat` / `fix` / `docs` / `refactor` / `test` / `chore`

**Scope 範例:** `frontend`, `backend`, `ws`, `auth`, `controller`, `display`

```bash
# 範例
feat(controller): add resizable panel layout
fix(backend): resolve bcrypt hash compatibility
docs: update architecture documentation
```

---

## 環境變數

### 前端 `.env.local`

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
GO_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_GO_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_USE_NATIVE_WS=true
```

### Go 後端（直接設定或用 `.env`）

```env
DATABASE_URL=postgresql://postgres:dev@localhost:5432/ly
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
PORT=8080
```

---

## 開發流程

### 1. 啟動開發環境

```bash
# 啟動 PostgreSQL + Redis（Docker）
docker compose up -d  # 如有 docker-compose.yml

# 啟動 Go 後端
cd backend && go run ./cmd/server &

# 啟動前端
npm run dev
```

### 2. 開發新功能

```bash
# 建立功能分支
git checkout main
git pull origin main
git checkout -b feature/new-feature

# 開發...

# 提交
git add <files>
git commit -m "feat(scope): description"
git push origin feature/new-feature
```

### 3. 提交前檢查

```bash
# 前端
npm run type-check && npm run lint

# 後端
cd backend && go vet ./... && go test ./...
```

**Pre-commit Hook (Husky)：**
自動執行 TypeScript 型別檢查 + ESLint。

---

## Code Review 檢查清單

### 功能性
- [ ] 功能符合需求
- [ ] 邊界情況已處理
- [ ] 錯誤處理完善

### 程式碼品質
- [ ] 遵循命名慣例
- [ ] 無重複程式碼
- [ ] 函數職責單一

### 前後端一致性
- [ ] API 合約一致（JSON field name, 型別）
- [ ] Go DTO JSON tag 使用 camelCase
- [ ] 錯誤回應格式統一

### 安全性
- [ ] 無硬編碼密碼/Token
- [ ] 輸入驗證完整（Zod / Go validator）
- [ ] SQL injection 防護（Ent ORM 自動處理）

---

## 相關文檔

- [系統架構](spec/architecture.md)
- [API 文檔](spec/api.md)
- [部署文檔](deployment.md)

---

**文件版本:** 2.0
**最後更新:** 2026-03-13

**變更記錄:**
- v2.0 (2026-03-13): 全面改寫 — 新增 Go 後端開發流程，移除 tRPC/Supabase/pnpm 引用
- v1.0 (2026-03-11): 初始版本
