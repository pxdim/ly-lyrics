# 安全檢查清單

## 安全概況

| 類別 | 狀態 |
|------|------|
| 認證與授權 | ✅ 已實作 |
| 資料保護 | ✅ 已實作 |
| API 安全 | ✅ 已實作 |
| WebSocket 安全 | ✅ 已實作 |
| 輸入驗證 | ✅ 已實作 |

---

## 1. 認證與授權

### 1.1 用戶認證

- [x] 使用自建 Go 後端 JWT 認證系統
- [x] 支援 Email/Password 登入
- [x] JWT Token 驗證（HS256 HMAC-SHA256）
- [x] Access Token 有效期設定（預設 24 小時，可由 `JWT_EXPIRY_HOURS` 調整）
- [x] Refresh Token 機制（30 天有效期，支援 JTI 撤銷與輪換）

### 1.2 密碼安全

- [x] bcrypt hash 儲存（cost=10，OWASP 建議 10+）
- [x] 自動 salt（bcrypt 內建，每次 hash 結果不同）
- [x] 密碼長度限制：8-72 bytes（同時檢查 rune 下限與 byte 上限）
- [x] 密碼**從未以明文儲存或傳輸**

### 1.3 JWT 安全

- [x] Secret 從環境變數 `JWT_SECRET` 讀取
- [x] 生產環境空 secret 時**拒絕啟動**（防止 token 偽造）
- [x] 開發環境 fallback 值名稱含警告（`dev-insecure-jwt-secret-do-not-use-in-production`）
- [x] `ValidateToken` 驗證 `SigningMethodHMAC`，防止 `alg: none` 攻擊
- [x] Access / Refresh token 有明確的 `TokenType` 欄位區分

### 1.4 Cookie 安全

- [x] `HttpOnly: true` — 防止 XSS JavaScript 讀取 token
- [x] `Secure: true`（生產環境）— 強制 HTTPS 傳輸
- [x] `SameSite: Strict` — 防止 CSRF 跨站請求偽造
- [x] Refresh token path 限定 `/api/auth/refresh` — 最小暴露面

### 1.5 資源擁有權

- [x] Song CRUD：Update/Delete 驗證 `userID` 匹配，非擁有者回傳 `403 Forbidden`
- [x] Playlist CRUD：同上
- [x] Settings：以 `user_id` 隔離，使用者僅能存取自己的設定

---

## 2. 資料保護

### 2.1 敏感資料分類

| 資料類型 | 敏感等級 | 保護措施 |
|----------|---------|---------|
| 密碼 | 高 | bcrypt hash（cost=10），永不明文儲存 |
| JWT Secret | 高 | 環境變數，生產環境強制要求 |
| JWT Token | 中 | HttpOnly cookie，不在 response body 回傳 |
| Email | 低 | 資料庫層級保護，API 不批量暴露 |
| 歌詞/播放清單/設定 | 無 | 非敏感公開內容，傳輸層 HTTPS 保護 |

### 2.2 資料傳輸

- [x] Railway 平台自動提供 HTTPS（TLS 在 load balancer 終端）
- [x] WebSocket 使用 WSS 協議
- [x] `poweredByHeader: false` — 不洩漏框架資訊

### 2.3 資料儲存

- [x] 密碼使用 bcrypt 雜湊（Go `golang.org/x/crypto/bcrypt`）
- [x] Token 不儲存在 localStorage（使用 HttpOnly cookie）
- [x] 歌詞等業務資料**不實作應用層加密** — 為非敏感公開內容，加密會增加查詢複雜度與效能開銷，無安全收益

### 2.4 環境變數管理

- [x] `.env` 在 `.gitignore` 中，不會被提交到版本控制
- [x] API Key（Deepgram、Google STT、Genius、Gemini）皆從環境變數讀取
- [x] 程式碼中無 hardcoded secret（測試檔案中的 test secret 僅用於單元測試）

---

## 3. API 安全

### 3.1 速率限制

Go 後端已實作 per-IP 滑動視窗速率限制：

| 端點類別 | 限制 |
|---------|------|
| Auth（登入/註冊） | 10 req/min |
| STT（語音辨識） | 5 req/min |
| Settings | 30 req/min |
| CRUD（歌曲/播放清單） | 60 req/min |
| WebSocket | 不限速（由 Hub 管理） |

### 3.2 輸入驗證

- [x] Go `go-playground/validator` 驗證所有 DTO
- [x] Ent schema 層級 `MaxLen` 約束（title 255、email 255、password_hash 255）
- [x] SQL 注入防護（Ent ORM 參數化查詢）
- [x] XSS 防護（React 自動 escape + HttpOnly cookie）

### 3.3 錯誤處理

- [x] 統一錯誤碼格式（`AUTH_INVALID_CREDENTIALS`、`SYS_INTERNAL_ERROR` 等）
- [x] 不洩漏系統內部資訊（stack trace、DB query 不出現在 response）
- [x] 結構化日誌記錄（`log/slog` JSON handler），敏感資料不寫入日誌

---

## 4. WebSocket 安全

### 4.1 連線驗證

- [x] WebSocket 使用 session code 認證（非 JWT）
- [x] Session code 為隨機生成，綁定特定使用者

### 4.2 訊息安全

- [x] Go Hub 架構管理連線池
- [x] 房間隔離（session code 為 namespace）

---

## 5. 前端安全

### 5.1 框架層保護

- [x] React 自動 escape HTML 輸出（防止 XSS）
- [x] Next.js `poweredByHeader: false`（不洩漏框架資訊）
- [x] API proxy（Next.js rewrite `/api/*` → Go :8080），前端不直接連後端

### 5.2 環境變數

- [x] 敏感 API Key 不暴露在前端
- [x] `NEXT_PUBLIC_*` 僅用於非敏感設定（WebSocket URL 等）

---

## 6. 依賴管理

### 6.1 套件掃描

```bash
# 前端套件漏洞檢查
npm audit

# Go 套件漏洞檢查
cd backend && go list -m all | nancy sleuth
```

### 6.2 Git 安全

```gitignore
# .gitignore 已包含
.env
.env*.local
.env.production
*.key
*.pem
```

---

## 7. 安全評估摘要（NFR3.1）

**評估日期**：2026-03-19
**評估範圍**：用戶資料加密儲存

### 結論：已充分滿足

| 安全控制 | 實作方式 | 狀態 |
|---------|---------|------|
| 密碼加密儲存 | bcrypt hash（cost=10, 自動 salt） | ✅ |
| JWT Secret 保護 | 環境變數 `JWT_SECRET`，生產環境強制要求 | ✅ |
| Token 傳輸保護 | HttpOnly + Secure + SameSite=Strict cookie | ✅ |
| 傳輸層加密 | HTTPS（Railway TLS）+ WSS | ✅ |
| 業務資料加密 | 不適用 — 歌詞/設定為非敏感公開內容 | N/A |

**備註**：對歌詞、播放清單、顯示設定等業務資料實施應用層加密（AES/ChaCha20）屬於 security theater（安全劇場）。這些資料本質上是公開的教會敬拜歌詞，加密不會提升安全性，反而增加查詢延遲、阻礙全文搜尋、增加維護成本。

---

## 相關文檔

- [部署文檔](deployment.md)
- [需求文檔](requirements.md)
- [API 文檔](spec/api.md)

---

**文件版本:** 2.0
**最後更新:** 2026-03-19

**變更記錄:**
- v2.0 (2026-03-19): 全面改寫 — 對齊 Go 後端實際安全實作，移除 Supabase 相關過時內容，新增 NFR3.1 安全評估摘要
- v1.0 (2026-03-11): 初始版本（模板）
