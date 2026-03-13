# 部署文檔

## 部署概覽

LY 系統部署在 **Railway**，採用前後端分離架構：
- **Go 後端**：REST API + WebSocket + Ent ORM
- **Next.js 前端**：純前端靜態 + SSR
- **PostgreSQL**：Railway 內建
- **Redis**：Railway 內建（WebSocket session 持久化）

---

## 部署架構

```
                         ┌─────────────────────────┐
                         │      Railway Platform     │
                         │                           │
  使用者 ──── HTTPS ────►│  ┌───────────────────┐   │
                         │  │  Next.js 前端      │   │
                         │  │  (node:22-alpine)  │   │
                         │  │  Port: 8080        │   │
                         │  └─────────┬─────────┘   │
                         │            │              │
                         │    /api/* rewrites        │
                         │    /ws 直連               │
                         │            │              │
                         │  ┌─────────▼─────────┐   │
  使用者 ── WSS ────────►│  │  Go 後端           │   │
                         │  │  (alpine:3.21)     │   │
                         │  │  Port: 8080        │   │
                         │  └───┬───────────┬───┘   │
                         │      │           │        │
                         │      ▼           ▼        │
                         │  ┌────────┐ ┌────────┐   │
                         │  │Postgres│ │ Redis  │   │
                         │  │  SQL   │ │        │   │
                         │  └────────┘ └────────┘   │
                         └─────────────────────────┘
```

---

## Railway Services

| Service | 說明 | Docker | Port |
|---------|------|--------|------|
| `ly-go-backend` | Go API + WebSocket | `backend/Dockerfile` | 8080 |
| `ly-frontend` | Next.js 前端 | `./Dockerfile` | 8080 |
| PostgreSQL | 資料庫（Railway 內建） | — | 5432 |
| Redis | Session 快取（Railway 內建） | — | 6379 |

---

## 環境變數

### Go 後端 (`ly-go-backend`)

| 變數 | 說明 | 必要 | 範例 |
|------|------|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 | ✅ | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis 連線字串 | 選填 | `redis://default:pass@host:6379` |
| `JWT_SECRET` | JWT 簽名密鑰 | ✅ | 隨機字串 |
| `JWT_EXPIRY_HOURS` | Access Token 有效期（小時） | 選填 | `24` |
| `PORT` | 伺服器監聽端口 | 選填 | `8080` |
| `ENVIRONMENT` | 環境模式 | 選填 | `production` |
| `CORS_ORIGINS` | 允許的 CORS 來源（逗號分隔） | 選填 | `https://lys.pxdim.com` |

### Next.js 前端 (`ly-frontend`)

| 變數 | 說明 | 必要 | 範例 |
|------|------|------|------|
| `GO_BACKEND_URL` | Go 後端內部 URL（rewrites 用） | ✅ | `http://ly-go-backend.railway.internal:8080` |
| `NEXT_PUBLIC_GO_WS_URL` | Go WebSocket 公開 URL | 選填 | `wss://ly-go-backend-production.up.railway.app/ws` |
| `NEXT_PUBLIC_USE_NATIVE_WS` | 啟用原生 WebSocket | 選填 | `true` |
| `NODE_ENV` | Node 環境 | 選填 | `production` |

**注意：** `NEXT_PUBLIC_GO_WS_URL` 在 build time 不可用時，`next.config.ts` 會自動推導為 `wss://ly-go-backend-production.up.railway.app/ws`。

---

## Docker 建置

### Go 後端 (`backend/Dockerfile`)

```dockerfile
# 多階段建置：golang:1.26-alpine → alpine:3.21
# 產出：~15MB 靜態二進位檔
# 健康檢查：GET /api/go-health（每 30 秒）
```

```bash
# 本地建置測試
cd backend
docker build -t ly-go-backend .
docker run -p 8080:8080 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=dev-secret \
  ly-go-backend
```

### Next.js 前端 (`Dockerfile`)

```dockerfile
# 多階段建置：node:22-alpine（deps → build → runner）
# 非 root 使用者執行（nextjs:nodejs）
```

```bash
# 本地建置測試
docker build -t ly-frontend \
  --build-arg GO_BACKEND_URL=http://localhost:8080 .
docker run -p 3000:8080 ly-frontend
```

---

## 部署步驟

### Railway 首次部署

1. **建立 Railway 專案**（透過 Dashboard 或 CLI）
2. **新增 PostgreSQL**（Railway 內建，自動提供 `DATABASE_URL`）
3. **新增 Redis**（Railway 內建，自動提供 `REDIS_URL`）
4. **部署 Go 後端**
   - 設定 Root Directory: `backend/`
   - 設定環境變數：`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`
5. **部署 Next.js 前端**
   - 設定 Root Directory: `/`（專案根目錄）
   - 設定環境變數：`GO_BACKEND_URL`（指向 Go service internal URL）

### 持續部署

Railway 自動偵測 GitHub push → 觸發建置 → 部署。

```bash
# 手動部署（如需要）
git push origin main    # 觸發自動部署
```

---

## 健康檢查

| 端點 | 說明 |
|------|------|
| `GET /api/go-health` | Go 後端健康檢查（含 DB ping） |

Go Dockerfile 內建 healthcheck：
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:8080/api/go-health || exit 1
```

---

## 監控

### Railway 內建
- **Metrics**: CPU、記憶體、網路使用
- **Logs**: 即時日誌串流
- **Alerts**: 部署失敗通知

### Go 後端日誌
- 使用 `log/slog` 結構化日誌（JSON 格式）
- 所有 HTTP 請求自動記錄（method, path, status, duration）

---

## 本地開發完整流程

```bash
# 1. 啟動 PostgreSQL（Docker 或本機）
docker run -d --name ly-postgres \
  -e POSTGRES_DB=ly -e POSTGRES_PASSWORD=dev \
  -p 5432:5432 postgres:15-alpine

# 2. 啟動 Redis（可選）
docker run -d --name ly-redis -p 6379:6379 redis:7-alpine

# 3. 啟動 Go 後端
cd backend
DATABASE_URL=postgresql://postgres:dev@localhost:5432/ly \
JWT_SECRET=dev-secret \
ENVIRONMENT=development \
go run ./cmd/server

# 4. 啟動 Next.js 前端（另一個終端）
cd ..  # 回到專案根目錄
npm run dev
```

開啟瀏覽器：
- 首頁: http://localhost:3000
- Controller: http://localhost:3000/controller
- Display: http://localhost:3000/display

---

## 相關文檔

- [系統架構](spec/architecture.md)
- [開發規範](development.md)

---

**文件版本:** 2.0
**最後更新:** 2026-03-13

**變更記錄:**
- v2.0 (2026-03-13): 全面改寫 — 對齊 Go 後端 + Railway 雙 service 部署，移除 Supabase/Gemini/Cloudflare
- v1.1 (2026-03-12): 更新 Railway 專案資訊
- v1.0 (2026-03-12): 初始版本
