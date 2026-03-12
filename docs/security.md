# 安全檢查清單

## 安全概況

| 類別 | 狀態 |
|------|------|
| 認證與授權 | 🟡 待實作 |
| 資料保護 | 🟡 待實作 |
| API 安全 | 🟡 待實作 |
| WebSocket 安全 | 🟡 待實作 |
| 輸入驗證 | 🟡 待實作 |

---

## 1. 認證與授權

### 1.1 用戶認證

- [ ] 使用 Supabase Auth 進行用戶認證
- [ ] 支援 Email/Password 登入
- [ ] 支援 OAuth (Google) 登入
- [ ] JWT Token 驗證
- [ ] Token 過期時間設定 (7天)
- [ ] Refresh Token 機制

### 1.2 Row Level Security (RLS)

```sql
-- 啟用 RLS
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 用戶只能存取自己的資料
CREATE POLICY "Users can view own data" ON songs
  FOR SELECT USING (auth.uid() = user_id);
```

### 1.3 API 權限檢查

- [ ] 每個 API 端點驗證 JWT
- [ ] 服務端角色 (service_role) 金鑰保護
- [ ] 跨用戶存取檢查

---

## 2. 資料保護

### 2.1 敏感資料處理

- [ ] API Key 儲存在環境變數
- [ ] 不將敏感資料寫入日誌
- [ ] 錯誤訊息不洩漏系統資訊

### 2.2 資料傳輸

- [ ] 強制使用 HTTPS
- [ ] WebSocket 使用 WSS
- [ ] 資料庫連線加密

### 2.3 資料儲存

- [ ] 密碼使用 bcrypt 雜湊 (Supabase 自動處理)
- [ ] 敏感資料不儲存在前端
- [ ] 資料庫備份加密

---

## 3. API 安全

### 3.1 速率限制

```typescript
// API 速率限制
const rateLimit = {
  windowMs: 60 * 1000, // 1 分鐘
  max: 100, // 最多 100 請求
  standardHeaders: true,
  legacyHeaders: false,
}
```

- [ ] 一般 API: 100 請求/分鐘
- [ ] WebSocket: 60 訊息/分鐘
- [ ] AI API: 10 請求/分鐘

### 3.2 輸入驗證

- [ ] 使用 Zod 驗證所有輸入
- [ ] SQL 注入防護 (Supabase 自動處理)
- [ ] XSS 防護 (React 自動處理)
- [ ] CSRF 防護

```typescript
import { z } from 'zod'

const CreateSongSchema = z.object({
  title: z.string().min(1).max(255).transform(sanitize),
  artist: z.string().max(255).optional().transform(sanitize),
  lyrics: z.string().min(1).transform(sanitize),
})
```

### 3.3 錯誤處理

- [ ] 不洩漏系統資訊
- [ ] 統一錯誤回應格式
- [ ] 記錄錯誤但不記錄敏感資料

---

## 4. WebSocket 安全

### 4.1 連線驗證

```typescript
// WebSocket 連線時驗證 JWT
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token

  try {
    const user = await verifyToken(token)
    socket.data.user = user
    next()
  } catch (err) {
    next(new Error('Authentication error'))
  }
})
```

### 4.2 訊息驗證

- [ ] 驗證所有接收的訊息格式
- [ ] 限制訊息大小
- [ ] 過濾惡意內容

### 4.3 房間隔離

- [ ] 每個用戶只能加入自己的房間
- [ ] 防止跨房間存取

---

## 5. 前端安全

### 5.1 Content Security Policy (CSP)

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self' wss://*.supabase.co",
    ].join('; '),
  },
]
```

### 5.2 環境變數

- [ ] 敏感資料使用 `NEXT_PUBLIC_*` 前綴慎用
- [ ] API Key 不暴露在前端

### 5.3 第三方腳本

- [ ] 最小化第三方腳本
- [ ] 使用 Subresource Integrity (SRI)

---

## 6. 依賴管理

### 6.1 套件掃描

```bash
# 檢查已知漏洞
pnpm audit

# 自動修復
pnpm audit fix
```

### 6.2 定期更新

- [ ] 每週檢查套件更新
- [ ] 優先更新安全修復
- [ ] 測試後再部署

---

## 7. 部署安全

### 7.1 環境變數

- [ ] 使用 Railway Secrets 管理
- [ ] 不將 .env 檔案提交到 Git
- [ ] .env.example 提供範本

### 7.2 Git 安全

```bash
# .gitignore
.env
.env.local
.env.*.local
*.key
*.pem
```

### 7.3 日誌管理

- [ ] 不記錄敏感資料
- [ ] 日誌定期清理
- [ ] 錯誤追蹤使用 Sentry

---

## 8. 合規性

### 8.1 GDPR (如適用)

- [ ] 用戶資料刪除功能
- [ ] 資料匯出功能
- [ ] 隱私政策

### 8.2 資料保留

- [ ] 刪除用戶後 30 天內清除資料
- [ ] 日誌保留 90 天

---

## 安全檢查清單

### 開發階段

- [ ] 程式碼審查
- [ ] 安全掃描
- [ ] 測試惡意輸入

### 部署前

- [ ] 所有環境變數已設定
- [ ] HTTPS 已啟用
- [ ] RLS 已啟用
- [ ] 速率限制已設定
- [ ] 錯誤處理不洩漏資訊

### 定期檢查

- [ ] 依賴套件漏洞掃描
- [ ] 存取日誌審查
- [ ] 安全策略更新

---

## 相關文檔

- [部署文檔](deployment.md)
- [開發規範](development.md)
- [風險管理](risks.md)

---

**文件版本:** 1.0
**最後更新:** 2026-03-11
