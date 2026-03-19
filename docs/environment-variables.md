# 環境變數清單

**系統:** LY 歌詞即時顯示系統
**來源:** `backend/internal/config/config.go` (Go env tags) + `next.config.ts` (process.env) + `Dockerfile` (ARG/ENV)

---

## 1. Go 後端環境變數

來源: `backend/internal/config/config.go` -- 使用 `caarlos0/env/v11` 解析。

| 變數名 | 必要性 | 預設值 | 說明 |
|--------|--------|--------|------|
| `PORT` | 選填 | `8080` | Go 後端 HTTP 伺服器監聽埠號 |
| `DATABASE_URL` | **必填** | (無) | PostgreSQL 連線字串。格式: `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `REDIS_URL` | 選填 | `""` (空) | Redis 連線字串。未設定時 WebSocket 功能停用。格式: `redis://default:pass@host:6379` |
| `JWT_SECRET` | **生產必填** | `"dev-insecure-jwt-secret-do-not-use-in-production"` (開發環境 fallback) | JWT 簽名密鑰。生產環境未設定時啟動失敗。建議 >= 32 字元隨機字串 |
| `JWT_EXPIRY_HOURS` | 選填 | `24` | JWT access token 有效時間（小時） |
| `ENVIRONMENT` | 選填 | `development` | 執行環境。`production` 時: 啟用 cookie Secure flag、日誌級別為 INFO、強制要求 JWT_SECRET |
| `CORS_ORIGINS` | 選填 | `*` | 允許的跨域來源，逗號分隔。生產環境應設為正式網域 |
| `DEEPGRAM_API_KEY` | 選填 | `""` (空) | Deepgram STT 語音辨識 API Key。未設定時前端需自行提供 |
| `GOOGLE_STT_API_KEY` | 選填 | `""` (空) | Google Cloud Speech-to-Text API Key |
| `LRCAPI_URL` | 選填 | `""` (空) | LrcApi (HisAtri) Docker 內網地址。未設定時停用 LrcApi 歌詞搜尋 |
| `LRCAPI_AUTH_KEY` | 選填 | `""` (空) | LrcApi 認證 Key。搭配 `LRCAPI_URL` 使用 |
| `GENIUS_API_TOKEN` | 選填 | `""` (空) | Genius API Token。未設定時停用 Genius 歌詞搜尋 |
| `GEMINI_API_KEY` | 選填 | `""` (空) | Google Gemini API Key。未設定時停用 AI 歌詞搜尋 |

### 額外的非 config 變數

| 變數名 | 位置 | 說明 |
|--------|------|------|
| `ENVIRONMENT` | `backend/internal/handler/auth.go:79` | `os.Getenv("ENVIRONMENT")` 用於判斷 cookie Secure flag（`!= "development"` 時啟用） |

---

## 2. Next.js 前端環境變數

來源: `next.config.ts` + 各元件 `process.env` 引用。

### 2.1 Build-time 環境變數（Server-side）

| 變數名 | 必要性 | 預設值 | 說明 |
|--------|--------|--------|------|
| `GO_BACKEND_URL` | **必填** | `http://localhost:8080` | Go 後端 API 內部 URL，用於 Next.js rewrites proxy (`/api/*` -> Go)。Railway 部署時應使用內部網路地址 `http://ly-go-backend.railway.internal:8080` |
| `NODE_ENV` | 選填 | (Next.js 自動設定) | `production` / `development`。影響錯誤堆疊顯示、日誌級別 |
| `RAILWAY_SERVICE_LY_GO_BACKEND_URL` | 選填 | (無) | Railway 自動注入的 service URL。用於自動推導 WebSocket URL |
| `RAILWAY_ENVIRONMENT` | 選填 | (無) | Railway 自動注入。存在時視為生產環境 |

### 2.2 Client-side 環境變數 (`NEXT_PUBLIC_*`)

這些變數會被內聯到前端 JavaScript bundle 中，在 build time 固化。

| 變數名 | 必要性 | 預設值 / Fallback 邏輯 | 說明 |
|--------|--------|----------------------|------|
| `NEXT_PUBLIC_GO_WS_URL` | 選填 | Fallback 鏈: (1) 明確設定 -> (2) `RAILWAY_SERVICE_LY_GO_BACKEND_URL` 推導 -> (3) 生產環境 hardcoded `wss://ly-go-backend-production.up.railway.app/ws` -> (4) `ws://localhost:8080/ws` | Go 後端 WebSocket 公開 URL。前端直連用 |
| `NEXT_PUBLIC_USE_NATIVE_WS` | 選填 | `"true"` | 是否使用原生 WebSocket（Go backend），設為 `"true"` 啟用 |
| `NEXT_PUBLIC_APP_URL` | 選填 | `""` (空) | 應用程式公開 URL。用於產生 QR code 等功能 |

### 2.3 Dockerfile Build ARG

| 變數名 | 預設值 | 說明 |
|--------|--------|------|
| `GO_BACKEND_URL` | `http://ly-go-backend.railway.internal:8080` | Dockerfile `ARG`，build 階段傳入 Next.js。Railway 部署時使用內部網路地址 |

---

## 3. 環境別配置參考

### 3.1 本地開發 (`.env.example`)

```bash
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
PORT=3000

# Go Backend
GO_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_GO_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_USE_NATIVE_WS=true

# Lyrics Providers (選填)
LRCAPI_URL=http://localhost:28883/api
LRCAPI_AUTH_KEY=your_lrcapi_auth_key_here
GENIUS_API_TOKEN=your_genius_api_token_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3.2 E2E 測試 (`.env.test`)

```bash
DATABASE_URL=postgres://ly_test:ly_test_pass@localhost:5433/ly_test?sslmode=disable
REDIS_URL=redis://localhost:6380
JWT_SECRET=test-secret-key-for-e2e-do-not-use-in-production
JWT_EXPIRY_HOURS=1
ENVIRONMENT=development
PORT=8080
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
GO_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_GO_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_USE_NATIVE_WS=true
```

### 3.3 Railway 生產環境

#### Go 後端 Service (`ly-go-backend`)

```bash
DATABASE_URL=<Railway PostgreSQL 自動注入>
REDIS_URL=<Railway Redis 自動注入>
JWT_SECRET=<強隨機字串，>= 32 字元>
JWT_EXPIRY_HOURS=24
ENVIRONMENT=production
CORS_ORIGINS=https://lys.pxdim.com
PORT=8080

# 選填 -- 歌詞搜尋 providers
GENIUS_API_TOKEN=<Genius API Token>
GEMINI_API_KEY=<Gemini API Key>
LRCAPI_URL=<LrcApi 內網地址>
LRCAPI_AUTH_KEY=<LrcApi Auth Key>

# 選填 -- STT providers
DEEPGRAM_API_KEY=<Deepgram API Key>
GOOGLE_STT_API_KEY=<Google Cloud STT Key>
```

#### Next.js 前端 Service (`ly-frontend`)

```bash
GO_BACKEND_URL=http://ly-go-backend.railway.internal:8080
NEXT_PUBLIC_APP_URL=https://lys.pxdim.com
NEXT_PUBLIC_USE_NATIVE_WS=true
# NEXT_PUBLIC_GO_WS_URL 可不設定，next.config.ts 會自動推導
NODE_ENV=production
```

---

## 4. 安全注意事項

### 4.1 敏感變數（絕對不可出現在程式碼或 Git 中）

| 變數 | 風險等級 | 洩漏影響 |
|------|---------|---------|
| `DATABASE_URL` | Critical | 資料庫完全存取 |
| `JWT_SECRET` | Critical | 可偽造任意使用者 token |
| `REDIS_URL` | High | Redis 資料存取 |
| `GENIUS_API_TOKEN` | Medium | API 額度被盜用 |
| `GEMINI_API_KEY` | Medium | API 費用被盜用 |
| `DEEPGRAM_API_KEY` | Medium | API 費用被盜用 |
| `GOOGLE_STT_API_KEY` | Medium | API 費用被盜用 |

### 4.2 `NEXT_PUBLIC_*` 變數安全性

以 `NEXT_PUBLIC_` 開頭的變數會被內聯到前端 bundle，對所有使用者可見。目前的 `NEXT_PUBLIC_*` 變數均為非敏感資訊（WebSocket URL、功能開關、應用 URL），設計正確。

### 4.3 已知風險

| 風險 | 描述 | 建議 |
|------|------|------|
| CORS `*` 預設值 | 開發環境預設允許所有來源 | 生產環境必須設定 `CORS_ORIGINS` 為特定網域 |
| JWT 開發 fallback | 開發環境使用固定 fallback 密鑰 | 僅供開發使用，生產環境強制設定 `JWT_SECRET` |
| `next.config.ts` hardcoded WS URL | 生產環境 fallback 為 `wss://ly-go-backend-production.up.railway.app/ws` | 若網域變更需同步更新 |

---

**文件版本:** 1.0
**建立日期:** 2026-03-19
**最後更新:** 2026-03-19
