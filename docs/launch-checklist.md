# M7 正式上線檢查清單

**目標上線日期:** 2026-06-01
**系統:** LY 歌詞即時顯示系統
**部署平台:** Railway (雙 service 架構)

---

## 1. 部署前準備

### 1.1 程式碼品質

- [ ] 前端所有測試通過 (`npx vitest run` -- 目前 1028 tests)
- [ ] 後端所有測試通過 (`cd backend && go test ./... -v -short -count=1`)
- [ ] 前端 TypeScript 型別檢查通過 (`npx tsc --noEmit`)
- [ ] ESLint 無錯誤 (`npm run lint`)
- [ ] `npm audit` 0 critical / high vulnerabilities
- [ ] Go 後端 `go vet ./...` 無警告
- [ ] 測試覆蓋率 >= 80%（目前 82%）
- [ ] CI pipeline (`.github/workflows/ci.yml`) 全綠

### 1.2 環境變數確認

#### Go 後端 (`ly-go-backend` service)

| 變數 | 已設定 | 值正確 |
|------|--------|--------|
| `DATABASE_URL` | [ ] | [ ] |
| `REDIS_URL` | [ ] | [ ] |
| `JWT_SECRET` | [ ] | [ ] |
| `JWT_EXPIRY_HOURS` | [ ] | [ ] |
| `ENVIRONMENT=production` | [ ] | [ ] |
| `CORS_ORIGINS` | [ ] | [ ] |
| `PORT` (預設 8080) | [ ] | [ ] |

#### Go 後端 -- 選填服務

| 變數 | 已設定 | 說明 |
|------|--------|------|
| `DEEPGRAM_API_KEY` | [ ] | STT 語音辨識（選填） |
| `GOOGLE_STT_API_KEY` | [ ] | Google Cloud STT（選填） |
| `LRCAPI_URL` | [ ] | LrcApi 歌詞搜尋（選填） |
| `LRCAPI_AUTH_KEY` | [ ] | LrcApi 認證 Key（選填） |
| `GENIUS_API_TOKEN` | [ ] | Genius 歌詞搜尋（選填） |
| `GEMINI_API_KEY` | [ ] | Gemini AI 歌詞搜尋（選填） |

#### Next.js 前端 (`ly-frontend` service)

| 變數 | 已設定 | 值正確 |
|------|--------|--------|
| `GO_BACKEND_URL` (build-time ARG) | [ ] | [ ] |
| `NEXT_PUBLIC_GO_WS_URL` (build-time，有 fallback) | [ ] | [ ] |
| `NEXT_PUBLIC_USE_NATIVE_WS=true` | [ ] | [ ] |
| `NEXT_PUBLIC_APP_URL` | [ ] | [ ] |
| `NODE_ENV=production` | [ ] | [ ] |

### 1.3 基礎設施確認

- [ ] Railway PostgreSQL 服務正常運作
- [ ] Railway Redis 服務正常運作
- [ ] PostgreSQL 連線池上限 25 (Go 後端 `SetMaxOpenConns(25)`)，未超過 Railway plan 限制
- [ ] Redis 記憶體用量在配額內
- [ ] 資料庫 migration / schema 已套用（Ent auto-migration）
- [ ] SSL/TLS 證書有效（Railway 自動管理）
- [ ] 自訂網域 DNS 設定正確（如有）
- [ ] CORS_ORIGINS 設定為正式網域（非 `*`）

### 1.4 安全檢查

- [ ] `JWT_SECRET` 為強隨機字串（>= 32 字元），非預設開發值
- [ ] `ENVIRONMENT=production` 已設定（啟用 cookie Secure flag）
- [ ] Cookie 設定為 `HttpOnly + Secure + SameSite=Strict`
- [ ] Rate limiting 已啟用（Auth: 10/min, CRUD: 60/min, STT: 5/min, Settings: 30/min）
- [ ] `poweredByHeader: false` 已設定（Next.js config）
- [ ] HTTP/2 已停用（保留 WebSocket upgrade 必要的 hop-by-hop headers）
- [ ] 無 API key 或密碼硬編碼在程式碼中
- [ ] `.env.local` 未被 Git 追蹤（已在 `.gitignore`）
- [ ] Go 後端以非 root 使用者執行 (`appuser`)
- [ ] Next.js 以非 root 使用者執行 (`nextjs:nodejs`)
- [ ] `npm audit` 無已知 critical 漏洞

---

## 2. 部署執行

### 2.1 部署步驟

- [ ] 確認 main branch 為最新穩定版本
- [ ] Git tag 建立版本號 (`v1.0.0`)
- [ ] Railway Go 後端服務部署成功
- [ ] Railway Next.js 前端服務部署成功
- [ ] 部署日誌無錯誤

### 2.2 健康檢查

- [ ] Go 後端 health check 回應正常：`GET /api/go-health` 回傳 200
- [ ] Docker HEALTHCHECK 執行正常（每 30 秒，timeout 5 秒）
- [ ] Next.js 前端頁面載入正常
- [ ] Railway dashboard 顯示兩個 service 皆為 healthy

### 2.3 功能驗證

- [ ] 使用者註冊流程正常
- [ ] 使用者登入流程正常（HttpOnly cookie 正確設定）
- [ ] 歌詞 CRUD 操作正常
- [ ] 播放清單 CRUD 操作正常
- [ ] WebSocket 連線建立成功
- [ ] Controller 與 Display 頁面即時同步（延遲 < 100ms）
- [ ] Clean Output mode (`?mode=clean`) 正常運作
- [ ] 歌詞搜尋功能正常（LRClib 為必要，其餘選填）
- [ ] 響應式設計三級斷點正常
- [ ] API proxy (`/api/*` -> Go backend) 正常運作

### 2.4 WebSocket 專項驗證

- [ ] WSS 連線建立成功
- [ ] Session code 認證正常
- [ ] 多 client 同步正常
- [ ] 斷線重連正常
- [ ] 同步延遲 < 100ms

---

## 3. 部署後確認

### 3.1 監控與告警

- [ ] Railway dashboard 監控指標正常（CPU、記憶體、網路）
- [ ] 結構化日誌輸出正常（JSON 格式，`log/slog`）
- [ ] 外部 uptime monitoring 已設定（參見 `docs/monitoring.md`）
- [ ] 告警通知管道已設定（Email / Slack / Discord）

### 3.2 備份確認

- [ ] PostgreSQL 自動備份策略確認（參見 `docs/backup-strategy.md`）
- [ ] 手動備份執行一次並驗證可還原
- [ ] Redis 資料持久化策略確認

### 3.3 效能基準記錄

- [ ] API 回應時間基準（p50, p95, p99）
- [ ] WebSocket 連線建立時間
- [ ] 頁面載入時間（首次 / 後續）
- [ ] 記憶體使用基準
- [ ] CPU 使用基準

### 3.4 文件更新

- [ ] 使用者手冊已完成 (`docs/user-manual.md`)
- [ ] 部署文件已更新 (`docs/deployment.md`)
- [ ] Changelog 已更新 (`docs/changelog.md`)
- [ ] M7 里程碑狀態已更新 (`docs/milestones.md`)

---

## 4. 上線後第一週觀察

### 4.1 每日檢查（D+1 至 D+7）

- [ ] 錯誤率 < 0.1%
- [ ] API p99 延遲 < 500ms
- [ ] WebSocket 斷線率 < 1%
- [ ] 記憶體無持續增長（無 memory leak）
- [ ] Redis 記憶體使用穩定
- [ ] 資料庫連線數穩定（不超過 25）

### 4.2 回滾計畫

若上線後發現嚴重問題：

1. **判斷標準**: 錯誤率 > 5% 或核心功能（登入/同步）無法使用
2. **回滾方式**: Railway dashboard -> 選擇上一個成功的 deployment -> Redeploy
3. **回滾時間**: 預估 < 5 分鐘
4. **通知**: 回滾後立即通知所有使用者

---

## 簽核

| 角色 | 姓名 | 日期 | 簽核 |
|------|------|------|------|
| 開發負責人 | | | [ ] |
| 測試負責人 | | | [ ] |
| SRE / 運維 | | | [ ] |

---

**文件版本:** 1.0
**建立日期:** 2026-03-19
**最後更新:** 2026-03-19
