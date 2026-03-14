# S03: 登入 / 註冊頁面 UI

## 目標
建立完整的使用者登入與註冊頁面，使用現有 Dark Tech 設計系統，表單直接呼叫 Go backend API，JWT token 存入 cookie。

## 參考檔案（請先讀取）
- `app/page.tsx` — 首頁設計風格參考
- `app/controller/page.tsx` — 頁面結構參考（前 50 行即可）
- `lib/auth/session.ts` — 現有 JWT session 管理
- `app/globals.css` — 設計系統 CSS 變數
- `backend/internal/dto/auth.go` — Go API 請求/回應格式（accessToken, refreshToken, user）
- `tailwind.config.ts` — Tailwind 設定

## 新建檔案
- `app/login/page.tsx` — 登入頁面
- `app/register/page.tsx` — 註冊頁面
- `lib/api/auth.ts` — 認證 API 客戶端封裝

## 設計決策（已確定，不需討論）

### API 格式（Go backend）
- POST `/api/auth/login` — body: `{ email, password }` → response: `{ accessToken, refreshToken, user: { id, email, name } }`
- POST `/api/auth/register` — body: `{ email, password, name }` → response: 同上
- 錯誤回應: `{ error: { code, message } }`

### Token 儲存策略
- `accessToken` 存入 `document.cookie`（名稱 `access_token`，httpOnly=false 讓前端能讀，path=/）
- `refreshToken` 存入 `localStorage`（用於自動刷新）
- 登入成功後 `router.push("/controller")`

### 頁面設計
- 置中卡片式佈局（max-w-md mx-auto mt-20）
- Dark Tech 風格：深色背景（bg-gray-900/95）、cyan accent（border-cyan-500）、霓虹 glow
- 表單欄位：email + password（登入）/ email + password + name（註冊）
- 底部切換連結：「還沒有帳號？註冊」/「已有帳號？登入」
- 載入狀態：按鈕 disabled + spinner
- 錯誤顯示：紅色邊框 + 錯誤訊息文字

## 實作要求

### lib/api/auth.ts
```typescript
const API_BASE = process.env["NEXT_PUBLIC_GO_BACKEND_URL"] ||
  (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:8080` : "http://localhost:8080");

export async function login(email: string, password: string) { ... }
export async function register(email: string, password: string, name: string) { ... }
```
回傳 `{ accessToken, refreshToken, user }` 或 throw Error。

### 登入頁面
- `"use client"` 客戶端元件
- useState 管理 email、password、error、loading
- onSubmit 呼叫 `login()`
- 成功後設 cookie + redirect
- Enter 鍵提交表單

### 註冊頁面
- 同上模式，多一個 name 欄位
- 密碼最少 6 字元驗證（前端 + 後端都驗）
- 成功後同樣設 cookie + redirect

## 測試要求（可選但建議）
由於這是純 UI 頁面，E2E 測試比單元測試更合適。
但至少為 `lib/api/auth.ts` 寫基本的型別測試確認 export 正確。

## 驗收標準
- [ ] /login 頁面可正常渲染
- [ ] /register 頁面可正常渲染
- [ ] 表單提交呼叫正確 API
- [ ] 成功後 cookie 設定正確、redirect 到 /controller
- [ ] 錯誤訊息正確顯示
- [ ] Dark Tech 設計風格一致
- [ ] npx vitest run 通過
- [ ] npm run build 通過
- [ ] 兩個頁面互有連結切換

## Commit
```
feat(auth): add login and register pages with JWT authentication
```
