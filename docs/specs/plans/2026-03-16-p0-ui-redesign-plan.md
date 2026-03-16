# P0 UI/UX 全面重設計 — 實作計畫

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修復四項 P0 問題（Token 安全、設計系統統一、Controller 拆分、文檔對齊）並同步完成全站 UI/UX 重設計與動效升級。

**Architecture:** CSS 變數作為唯一設計 token 來源，Tailwind config 的 DEFAULT 值指向 CSS 變數、shade palette 保留原值。Token 改為 HttpOnly cookie 透過 Next.js rewrite proxy 傳遞。Controller 頁面拆為 9 個獨立元件檔。Display 新增 Clean Output 模式供 OBS/VJ 軟體截取。

**Tech Stack:** Next.js 15 + React 19 + TypeScript 5.7 + Tailwind CSS 3.4 + Zustand 5 + Vitest 4 + Go 1.26 (backend)

**Spec:** `docs/specs/2026-03-16-p0-ui-redesign-design.md` (v1.2 Final)

---

## File Structure

### 新增檔案

| 路徑 | 職責 |
|------|------|
| `lib/hooks/useMediaQuery.ts` | 泛用 media query hook |
| `lib/hooks/useMediaQuery.test.ts` | useMediaQuery 測試 |
| `lib/hooks/useIsMobile.ts` | 手機偵測 hook（基於 useMediaQuery） |
| `lib/hooks/useIsMobile.test.ts` | useIsMobile 測試 |
| `lib/utils/visible-lines.ts` | calcVisibleLines 共用邏輯 |
| `lib/utils/visible-lines.test.ts` | visible-lines 測試 |
| `components/ui/GlowButton.tsx` | 發光按鈕共用元件 |
| `components/ui/GlowButton.test.tsx` | GlowButton 測試 |
| `components/ui/GlowInput.tsx` | 發光輸入框共用元件 |
| `components/ui/GlowInput.test.tsx` | GlowInput 測試 |
| `components/ui/Spinner.tsx` | Loading spinner 共用元件 |
| `components/ui/Spinner.test.tsx` | Spinner 測試 |
| `components/ui/ConfirmDialog.tsx` | 確認對話框（取代 `confirm()`） |
| `components/ui/ConfirmDialog.test.tsx` | ConfirmDialog 測試 |
| `components/auth/AuthLayout.tsx` | 認證頁共用佈局 |
| `components/auth/AuthLayout.test.tsx` | AuthLayout 測試 |
| `components/controller/ControllerHeader.tsx` | 頂部 session code + 連線狀態 |
| `components/controller/SongLibrary.tsx` | 歌曲庫面板 |
| `components/controller/CueGrid.tsx` | 歌詞 Cue 列表 |
| `components/controller/LivePreview.tsx` | 即時預覽面板 |
| `components/controller/QuickSettings.tsx` | 快捷設定面板 |
| `components/controller/PlaylistPanel.tsx` | 播放清單面板 |
| `components/controller/MobileTabBar.tsx` | 手機版底部 Tab |
| `components/controller/ToggleRow.tsx` | 共用開關列 |

### 修改檔案

| 路徑 | 變更摘要 |
|------|---------|
| `app/globals.css` | 修正 `--color-void` HSL、新增語意色/glow 色/motion tokens、遷移 `--duration-base` → `--duration-normal` |
| `tailwind.config.ts` | DEFAULT 值指向 CSS 變數、保留 shade palette、新增 semantic color + glow shadow |
| `lib/api/auth.ts` | 刪除 `API_BASE` 直連、改走 proxy 路徑、移除 response 中 token 解析 |
| `lib/api/auth.test.ts` | 更新測試對齊新 API（proxy 路徑、無 token body） |
| `app/login/page.tsx` | 移除手動 cookie/localStorage、使用 AuthLayout + GlowInput |
| `app/register/page.tsx` | 同上 |
| `app/page.tsx` | 動效升級（staggered entrance、neon breathing） |
| `app/controller/page.tsx` | 拆分為殼層 + 9 個子元件 |
| `app/display/page.tsx` | 新增 Clean Output 模式、修復 fade-out |
| `components/ui/Toast.tsx` | 移除 `useLyricsStore` 依賴 |
| `backend/internal/handler/auth.go` | 新增 `Set-Cookie` header、response body 不回傳 token 明文 |
| `backend/internal/dto/auth.go` | 新增 `AuthCookieResponse` DTO（不含 token 欄位） |
| `backend/internal/handler/auth_test.go` | 更新測試驗證 Set-Cookie header |

### 刪除檔案

| 路徑 | 原因 |
|------|------|
| `app/styles/tokens.ts` | 零消費者，CSS 變數取代 |

---

## Chunk 1: Stage 1A — Token 安全修復

> 獨立於 UI 重設計，可與 Stage 1B 平行執行。

### Task 1: Go 後端 — 新增 Cookie DTO

**Files:**
- Modify: `backend/internal/dto/auth.go`

- [ ] **Step 1: 新增 AuthCookieResponse DTO**

在 `backend/internal/dto/auth.go` 新增不含 token 的回應結構：

```go
// AuthCookieResponse 認證回應（token 透過 Set-Cookie 傳遞，body 不含明文 token）
type AuthCookieResponse struct {
	ExpiresAt time.Time    `json:"expiresAt"`
	User      UserResponse `json:"user"`
}
```

- [ ] **Step 2: 確認編譯通過**

Run: `cd backend && go build ./...`
Expected: BUILD OK

- [ ] **Step 3: Commit**

```bash
git add backend/internal/dto/auth.go
git commit -m "feat(dto): add AuthCookieResponse without token fields"
```

---

### Task 2: Go 後端 — auth handler 設定 HttpOnly Cookie

**Files:**
- Modify: `backend/internal/handler/auth.go`

- [ ] **Step 1: 寫失敗測試 — Login 設定 Set-Cookie header**

在 `backend/internal/handler/auth_test.go` 新增測試（若已有 Login 成功測試，在該 test function 內新增 assertion）：

```go
func TestLogin_SetsCookies(t *testing.T) {
	// 使用既有的 mock UserService + JWTManager 設定
	// ... (依照 auth_test.go 既有模式)

	// 驗證 response 有 Set-Cookie header
	cookies := resp.Result().Cookies()
	var hasAccess, hasRefresh bool
	for _, c := range cookies {
		if c.Name == "access_token" {
			hasAccess = true
			assert.True(t, c.HttpOnly)
			assert.Equal(t, "/", c.Path)
			assert.Equal(t, http.SameSiteStrictMode, c.SameSite)
		}
		if c.Name == "refresh_token" {
			hasRefresh = true
			assert.True(t, c.HttpOnly)
			assert.Equal(t, "/api/auth/refresh", c.Path)
			assert.Equal(t, http.SameSiteStrictMode, c.SameSite)
		}
	}
	assert.True(t, hasAccess, "should set access_token cookie")
	assert.True(t, hasRefresh, "should set refresh_token cookie")

	// 驗證 response body 不含 token 明文
	var body map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&body)
	assert.Nil(t, body["accessToken"], "body should not contain accessToken")
	assert.Nil(t, body["refreshToken"], "body should not contain refreshToken")
}
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd backend && go test ./internal/handler/ -run TestLogin_SetsCookies -v`
Expected: FAIL（目前 handler 不設 cookie）

- [ ] **Step 3: 實作 setCookies helper + 修改 Login/Register/Refresh handler**

在 `auth.go` 新增 helper：

```go
// setCookies 設定 HttpOnly cookie 傳遞 token
func (h *AuthHandler) setCookies(w http.ResponseWriter, _ *http.Request, accessToken, refreshToken string) {
	// 開發環境不要求 Secure（localhost 無 HTTPS）
	secure := os.Getenv("ENVIRONMENT") != "development"

	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		MaxAge:   86400, // 24h
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/api/auth/refresh",
		MaxAge:   2592000, // 30d
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
	})
}
```

修改 `Login` handler 末段：

```go
	// 設定 HttpOnly cookie
	h.setCookies(w, r, accessToken, refreshToken)

	writeJSON(w, http.StatusOK, dto.AuthCookieResponse{
		ExpiresAt: time.Now().Add(h.jwtManager.AccessExpiry()),
		User: dto.UserResponse{
			ID:            u.ID,
			Email:         u.Email,
			Name:          u.Name,
			EmailVerified: u.EmailVerified,
			CreatedAt:     u.CreatedAt,
			UpdatedAt:     u.UpdatedAt,
		},
	})
```

同樣修改 `Register` 和 `Refresh` handler。

- [ ] **Step 4: 執行測試確認通過**

Run: `cd backend && go test ./internal/handler/ -run TestLogin_SetsCookies -v`
Expected: PASS

- [ ] **Step 5: 補充 Register 和 Refresh 的 cookie 測試**

新增 `TestRegister_SetsCookies` 和 `TestRefresh_SetsCookies`，模式與 Step 1 相同。

- [ ] **Step 6: 執行全部 auth 測試確認綠燈**

Run: `cd backend && go test ./internal/handler/ -v`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add backend/internal/handler/auth.go backend/internal/handler/auth_test.go
git commit -m "feat(auth): set HttpOnly cookies for tokens, remove token from response body"
```

---

### Task 2.5: Go 後端 — Refresh handler 從 Cookie 讀取 token

**Files:**
- Modify: `backend/internal/handler/auth.go`
- Modify: `backend/internal/handler/auth_test.go`

> **關鍵**：Refresh handler 必須從 HttpOnly cookie 讀取 refresh token，而非 request body。
> JavaScript 無法存取 HttpOnly cookie，無法將其放入 JSON body。

- [ ] **Step 1: 寫失敗測試 — Refresh 從 cookie 讀取 token**

```go
func TestRefresh_ReadsCookieNotBody(t *testing.T) {
	// 設定 mock：user exists, token valid
	// ...

	// 建立 request — body 為空，token 放在 cookie
	req := httptest.NewRequest("POST", "/api/auth/refresh", nil)
	req.AddCookie(&http.Cookie{
		Name:  "refresh_token",
		Value: validRefreshToken,
	})

	resp := httptest.NewRecorder()
	handler.Refresh(resp, req)

	assert.Equal(t, http.StatusOK, resp.Code)

	// 驗證回應有新的 Set-Cookie
	cookies := resp.Result().Cookies()
	var hasAccess bool
	for _, c := range cookies {
		if c.Name == "access_token" {
			hasAccess = true
		}
	}
	assert.True(t, hasAccess)
}
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `cd backend && go test ./internal/handler/ -run TestRefresh_ReadsCookieNotBody -v`
Expected: FAIL（目前 Refresh 從 body 讀取）

- [ ] **Step 3: 修改 Refresh handler 從 cookie 讀取**

```go
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	// 從 HttpOnly cookie 讀取 refresh token
	cookie, err := r.Cookie("refresh_token")
	if err != nil || cookie.Value == "" {
		writeError(w, "AUTH_TOKEN_EXPIRED", "Refresh token 缺失", http.StatusUnauthorized)
		return
	}
	refreshTokenValue := cookie.Value

	claims, err := h.jwtManager.ValidateRefreshToken(refreshTokenValue)
	if err != nil {
		writeError(w, "AUTH_TOKEN_EXPIRED", "Refresh token 無效或過期", http.StatusUnauthorized)
		return
	}

	// ... 餘下邏輯不變（JTI 驗證、新 token 產生、setCookies）
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `cd backend && go test ./internal/handler/ -run TestRefresh -v`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handler/auth.go backend/internal/handler/auth_test.go
git commit -m "fix(auth): Refresh handler reads token from cookie instead of body"
```

---

### Task 2.6: 驗證 lib/auth/session.ts 無需修改

**Files:**
- Verify: `lib/auth/session.ts`

> `session.ts` 使用 Next.js server-side `cookies()` 讀取 `access_token`，然後以 `Authorization: Bearer` header 呼叫 Go backend 的 `/api/auth/me`。此流程在 cookie-based auth 後仍然正確：
> - Server Component 透過 `cookies()` 可讀取 HttpOnly cookie（Next.js 內建支援）
> - Go backend 的 `/api/auth/me` 仍使用 `Authorization` header 認證（auth middleware 未改動）
> - 無需修改。

- [ ] **Step 1: 確認 session.ts 不需改動**

驗證：`session.ts` 的 `getAccessToken()` 讀取 `cookies().get("access_token")`，Go 後端設 cookie name 也是 `access_token`。名稱一致，流程不變。

- [ ] **Step 2: 執行後端 auth 測試確認無回歸**

Run: `cd backend && go test ./internal/handler/ -v`
Expected: ALL PASS

---

### Task 3: 前端 — auth.ts 改走 proxy 路徑

**Files:**
- Modify: `lib/api/auth.ts`
- Modify: `lib/api/auth.test.ts`

- [ ] **Step 1: 寫失敗測試 — login 呼叫 proxy 路徑**

在 `lib/api/auth.test.ts` 中找到或新增測試：

```ts
import { login, register } from "./auth";

describe("auth API (proxy path)", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("login calls /api/auth/login (proxy path, not direct Go backend)", async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ expiresAt: "2026-04-01T00:00:00Z", user: { id: "1", email: "a@b.com", name: null, emailVerified: false, createdAt: "", updatedAt: "" } }), { status: 200 })
    );

    await login("a@b.com", "password");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    );
  });

  it("login does not return accessToken or refreshToken", async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ expiresAt: "2026-04-01T00:00:00Z", user: { id: "1", email: "a@b.com" } }), { status: 200 })
    );

    const result = await login("a@b.com", "password");
    expect(result).not.toHaveProperty("accessToken");
    expect(result).not.toHaveProperty("refreshToken");
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run lib/api/auth.test.ts`
Expected: FAIL（目前 auth.ts 仍呼叫 `API_BASE` + 回傳 token）

- [ ] **Step 3: 重寫 auth.ts**

```ts
/**
 * 認證 API 客戶端封裝
 *
 * 透過 Next.js rewrite proxy 呼叫 Go backend。
 * Token 由 Go 後端透過 Set-Cookie header 設定，前端不碰 token。
 *
 * @module lib/api/auth
 */

// ============================================================================
// Types（對齊 Go backend dto/auth.go AuthCookieResponse）
// ============================================================================

/** 認證使用者資訊 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 認證成功回應（Token 透過 HttpOnly cookie 傳遞，body 不含 token） */
export interface AuthResponse {
  expiresAt: string;
  user: AuthUser;
}

/** 認證錯誤回應 */
export interface AuthErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// ============================================================================
// API 呼叫
// ============================================================================

/**
 * 使用者登入
 * Token 由後端設定為 HttpOnly cookie，前端不處理 token。
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: { message: "登入失敗" } }));
    throw new Error(errorData.error?.message ?? "登入失敗");
  }

  return response.json();
}

/**
 * 使用者註冊
 * Token 由後端設定為 HttpOnly cookie，前端不處理 token。
 */
export async function register(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  const body: Record<string, string> = { email, password };
  if (name) {
    body["name"] = name;
  }

  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: { message: "註冊失敗" } }));
    throw new Error(errorData.error?.message ?? "註冊失敗");
  }

  return response.json();
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run lib/api/auth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/api/auth.ts lib/api/auth.test.ts
git commit -m "fix(auth): use proxy path, remove token from response body"
```

---

### Task 4: 前端 — Login/Register 移除手動 token 操作

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`

- [ ] **Step 0: 寫失敗測試 — login 頁面不操作 cookie/localStorage**

> 因 Login/Register 頁面在 Stage 3 才會被完整重寫為使用共用元件（Task 18），
> 此處僅做行為修正。測試確認 token 不被手動處理。

驗證方式：在 Task 3 的 auth.test.ts 中已確認 `login()` 不回傳 token。
此 Task 的驗證重點是 page 級別不呼叫 `document.cookie` 和 `localStorage`。
使用 `npx tsc --noEmit` 型別檢查 + grep 驗證：

```bash
grep -n "document.cookie\|localStorage" app/login/page.tsx app/register/page.tsx
```

Expected: 修改後無結果。

- [ ] **Step 1: 修改 login/page.tsx — 移除 cookie/localStorage 操作**

刪除 `handleSubmit` 中的：
```ts
// 刪除這兩行
document.cookie = `access_token=${result.accessToken}; path=/; SameSite=Lax`;
localStorage.setItem("refresh_token", result.refreshToken);
```

修改為：
```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    await login(email, password);
    // Token 由後端透過 Set-Cookie 設定，前端不碰
    router.push("/controller");
  } catch (err) {
    setError(err instanceof Error ? err.message : "登入失敗，請稍後再試");
  } finally {
    setLoading(false);
  }
}
```

- [ ] **Step 2: 修改 register/page.tsx — 同樣移除 token 操作**

同 Step 1 模式修改 `handleSubmit`。

- [ ] **Step 3: 手動驗證（型別檢查）**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 4: Commit**

```bash
git add app/login/page.tsx app/register/page.tsx
git commit -m "fix(auth): remove manual token storage from login/register pages"
```

---

## Chunk 2: Stage 1B — 設計系統基礎建設

> 可與 Stage 1A 平行執行。後續所有 UI 工作依賴此階段。

### Task 5: 修正 globals.css CSS 變數 + 新增 token

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: 修正 `--color-void` 為 HSL + 新增所有缺失 token**

修改 `app/globals.css` `:root` 區塊：

```css
@layer base {
  :root {
    /* === 背景層次 === */
    --color-void: 240 14% 1%;            /* 修正：原 "3 3 4" 是 RGB 非 HSL */
    --color-surface: 220 20% 4%;
    --color-elevated: 220 15% 7%;

    /* === 品牌色 === */
    --color-primary: 190 100% 50%;
    --color-secondary: 270 100% 65%;
    --color-accent: 150 100% 50%;

    /* === 文字 === */
    --color-text-primary: 0 0% 100%;
    --color-text-muted: 220 10% 55%;

    /* === 邊框 === */
    --color-border-dim: 0 0% 100% / 0.08;

    /* === 語意色（新增）=== */
    --color-success: 150 80% 45%;
    --color-warning: 35 95% 55%;
    --color-error: 0 85% 55%;

    /* === 發光專用（新增）=== */
    --color-glow-primary: 190 100% 50%;
    --color-glow-secondary: 270 100% 65%;
    --color-glow-accent: 150 100% 50%;

    /* === 動效 timing（更新 + 新增）=== */
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
    --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

    /* === 動效 duration（更新 + 新增）=== */
    --duration-fast: 150ms;
    --duration-normal: 250ms;       /* 原 300ms 微調；原 --duration-base 合併至此 */
    --duration-slow: 400ms;         /* 新增 */
    --duration-dramatic: 600ms;     /* 新增 */
  }
}
```

注意：移除 `--duration-base: 200ms;` 行。

- [ ] **Step 2: 搜尋 `--duration-base` 使用處並遷移**

Run: `grep -r "duration-base" app/ components/ lib/ --include="*.tsx" --include="*.ts" --include="*.css"`

將所有 `var(--duration-base)` 替換為 `var(--duration-normal)`。

- [ ] **Step 3: 替換 .btn-neon 和 .input-tech 的硬編碼 rgba**

在 `globals.css` 中，將 `.btn-neon` 的 `box-shadow: 0 0 10px rgba(0, 217, 255, 0.3)` 改為：
```css
box-shadow: 0 0 10px hsl(var(--color-glow-primary) / 0.3);
```

`.btn-neon:hover` 的 `box-shadow` 改為：
```css
box-shadow: 0 0 20px hsl(var(--color-glow-primary) / 0.5);
```

`.input-tech:focus` 的 `box-shadow` 改為：
```css
box-shadow: 0 0 0 3px hsl(var(--color-glow-primary) / 0.1);
```

- [ ] **Step 4: 確認動效 keyframes 統一在 tailwind.config.ts 定義**

> **注意**：所有新增動畫 keyframes 統一在 `tailwind.config.ts` 定義（Task 6），避免 globals.css 和 Tailwind config 重複定義。
> 此步驟僅確認 globals.css 中既有的 `fadeIn`、`slideIn`、`neon-pulse` keyframes 不與 Task 6 新增的衝突。
> globals.css 不新增任何 keyframes。

- [ ] **Step 5: 型別檢查 + 開發伺服器視覺確認**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 6: Commit**

```bash
git add app/globals.css
git commit -m "feat(design-system): fix CSS vars to HSL, add semantic/glow colors, add motion tokens"
```

---

### Task 6: 重寫 tailwind.config.ts — DEFAULT 指向 CSS 變數

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: 更新 tailwind.config.ts colors**

修改 `colors` 區塊，DEFAULT 值指向 CSS 變數，shade palette 保留原值：

```ts
colors: {
  // 背景層次
  void: 'hsl(var(--color-void) / <alpha-value>)',
  surface: 'hsl(var(--color-surface) / <alpha-value>)',
  elevated: 'hsl(var(--color-elevated) / <alpha-value>)',

  // Primary Electric Blue
  primary: {
    DEFAULT: 'hsl(var(--color-primary) / <alpha-value>)',
    50: '#E6FAFF',
    100: '#CCF5FF',
    200: '#99EBFF',
    300: '#66E0FF',
    400: '#33D6FF',
    500: '#00D9FF',
    600: '#00AECC',
    700: '#008299',
    800: '#005566',
    900: '#002933',
  },

  // Secondary Neon Purple
  secondary: {
    DEFAULT: 'hsl(var(--color-secondary) / <alpha-value>)',
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7',
    600: '#9333EA',
    700: '#7E22CE',
    800: '#6B21A8',
    900: '#581C87',
  },

  // Accent Neon Green
  accent: {
    DEFAULT: 'hsl(var(--color-accent) / <alpha-value>)',
    50: '#E6FFF3',
    100: '#CCFFE7',
    200: '#99FFCE',
    300: '#66FFB5',
    400: '#33FF9C',
    500: '#00FF88',
    600: '#00CC6D',
    700: '#009952',
    800: '#006637',
    900: '#00331B',
  },

  // Text colors（僅 nested object，避免重複）
  text: {
    primary: 'hsl(var(--color-text-primary) / <alpha-value>)',
    muted: 'hsl(var(--color-text-muted) / <alpha-value>)',
    dim: 'hsl(var(--color-text-muted) / 0.7)',
  },

  // Border（全部使用 CSS 變數，禁止硬編碼）
  border: {
    dim: 'hsl(var(--color-border-dim))',
    primary: 'hsl(var(--color-primary) / 0.3)',
  },

  // Semantic colors（新增）
  success: 'hsl(var(--color-success) / <alpha-value>)',
  warning: 'hsl(var(--color-warning) / <alpha-value>)',
  error: 'hsl(var(--color-error) / <alpha-value>)',
},
```

- [ ] **Step 2: 更新 boxShadow 使用 CSS 變數**

```ts
boxShadow: {
  'glow-sm': '0 0 5px hsl(var(--color-glow-primary) / 0.5)',
  'glow-md': '0 0 10px hsl(var(--color-glow-primary) / 0.6)',
  'glow-lg': '0 0 20px hsl(var(--color-glow-primary) / 0.7), 0 0 40px hsl(var(--color-glow-primary) / 0.4)',
  'glow-accent': '0 0 10px hsl(var(--color-glow-accent) / 0.5)',
  'inner-glow': 'inset 0 0 20px hsl(var(--color-glow-primary) / 0.1)',
},
```

- [ ] **Step 3: 新增 fade-out 動畫到 Tailwind config**

在 `animation` 中新增：
```ts
'fade-out': 'fadeOut 300ms ease-in forwards',           // UI 元素快速淡出
'fade-out-slow': 'fadeOut 3s ease-out forwards',        // Display 歌曲資訊 3 秒淡出
'scale-in': 'scaleIn 400ms cubic-bezier(0.16, 1, 0.3, 1)',
'shake': 'shake 250ms cubic-bezier(0.16, 1, 0.3, 1)',
```

在 `keyframes` 中新增：
```ts
scaleIn: {
  '0%': { opacity: '0', transform: 'scale(0.95)' },
  '100%': { opacity: '1', transform: 'scale(1)' },
},
shake: {
  '0%, 100%': { transform: 'translateX(0)' },
  '20%, 60%': { transform: 'translateX(-4px)' },
  '40%, 80%': { transform: 'translateX(4px)' },
},
```

> **注意**：`fadeOut` keyframe 已存在於 tailwind.config.ts。新增兩個 animation 變體（`fade-out` 300ms 和 `fade-out-slow` 3s）共用同一 keyframe。Display Song Info Overlay 使用 `animate-fade-out-slow`。

- [ ] **Step 4: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(design-system): tailwind DEFAULT colors point to CSS vars, add semantic colors"
```

---

### Task 7: 刪除 tokens.ts

**Files:**
- Delete: `app/styles/tokens.ts`

- [ ] **Step 1: 驗證零消費者**

Run: `grep -r "from.*tokens\|from.*@/styles/tokens\|from.*app/styles/tokens" app/ components/ lib/ --include="*.ts" --include="*.tsx"`
Expected: 無結果（或僅有 tokens.ts 自身）

- [ ] **Step 2: 刪除**

Run: `rm app/styles/tokens.ts`

- [ ] **Step 3: 型別檢查確認無破壞**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 4: Commit**

```bash
git add app/styles/tokens.ts
git commit -m "refactor(design-system): delete tokens.ts, CSS vars are single source of truth"
```

---

### Task 8: 修復 scanlines CSS 重複

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: 移除 `.scanlines::before` pseudo-element**

Home 頁面和 Display 頁面都使用 `bg-scanlines`（Tailwind backgroundImage utility），不使用 `.scanlines::before` CSS。移除 globals.css 中 `.scanlines::before { ... }` 整個區塊。

- [ ] **Step 2: 視覺確認 Home 和 Display 頁面 scanlines 仍正常**

Home 頁面使用 `<div className="... bg-scanlines ...">`，由 Tailwind `backgroundImage.scanlines` 提供，不受影響。

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "fix(css): remove duplicate .scanlines::before, keep bg-scanlines Tailwind utility"
```

---

## Chunk 3: Stage 2 — 共用元件庫

> 依賴 Chunk 2（設計系統）完成。

### Task 9: useMediaQuery + useIsMobile hooks

**Files:**
- Create: `lib/hooks/useMediaQuery.ts`
- Create: `lib/hooks/useMediaQuery.test.ts`
- Create: `lib/hooks/useIsMobile.ts`
- Create: `lib/hooks/useIsMobile.test.ts`

- [ ] **Step 1: 寫 useMediaQuery 失敗測試**

```ts
// lib/hooks/useMediaQuery.test.ts
import { renderHook, act } from "@testing-library/react";
import { useMediaQuery } from "./useMediaQuery";

describe("useMediaQuery", () => {
  let listeners: Map<string, ((e: MediaQueryListEvent) => void)[]>;

  beforeEach(() => {
    listeners = new Map();
    window.matchMedia = vi.fn((query: string) => {
      const mql = {
        matches: false,
        media: query,
        addEventListener: vi.fn((_, handler) => {
          if (!listeners.has(query)) listeners.set(query, []);
          listeners.get(query)!.push(handler);
        }),
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList;
      return mql;
    });
  });

  it("returns false initially for non-matching query", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
  });

  it("cleans up listener on unmount", () => {
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    unmount();
    const mql = window.matchMedia("(min-width: 768px)");
    expect(mql.removeEventListener).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run lib/hooks/useMediaQuery.test.ts`
Expected: FAIL（模組不存在）

- [ ] **Step 3: 實作 useMediaQuery**

```ts
// lib/hooks/useMediaQuery.ts
"use client";

import { useState, useEffect } from "react";

/**
 * 泛用 media query hook
 * @param query - CSS media query string, e.g. "(min-width: 768px)"
 * @returns 是否符合 media query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run lib/hooks/useMediaQuery.test.ts`
Expected: PASS

- [ ] **Step 5: 寫 useIsMobile 失敗測試**

```ts
// lib/hooks/useIsMobile.test.ts
import { renderHook } from "@testing-library/react";
import { useIsMobile } from "./useIsMobile";

// Mock useMediaQuery
vi.mock("./useMediaQuery", () => ({
  useMediaQuery: vi.fn(),
}));

import { useMediaQuery } from "./useMediaQuery";

describe("useIsMobile", () => {
  it("returns true when screen < 768px", () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false when screen >= 768px", () => {
    vi.mocked(useMediaQuery).mockReturnValue(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("calls useMediaQuery with max-width: 767.98px", () => {
    vi.mocked(useMediaQuery).mockReturnValue(false);
    renderHook(() => useIsMobile());
    expect(useMediaQuery).toHaveBeenCalledWith("(max-width: 767.98px)");
  });
});
```

- [ ] **Step 6: 執行測試確認失敗**

Run: `npx vitest run lib/hooks/useIsMobile.test.ts`
Expected: FAIL

- [ ] **Step 7: 實作 useIsMobile**

```ts
// lib/hooks/useIsMobile.ts
"use client";

import { useMediaQuery } from "./useMediaQuery";

/**
 * 手機視窗偵測 hook（< 768px）
 * 取代 Controller 等頁面中重複的 matchMedia 邏輯
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767.98px)");
}
```

- [ ] **Step 8: 執行測試確認通過**

Run: `npx vitest run lib/hooks/useIsMobile.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add lib/hooks/useMediaQuery.ts lib/hooks/useMediaQuery.test.ts lib/hooks/useIsMobile.ts lib/hooks/useIsMobile.test.ts
git commit -m "feat(hooks): add useMediaQuery and useIsMobile hooks"
```

---

### Task 10: Spinner 共用元件

**Files:**
- Create: `components/ui/Spinner.tsx`
- Create: `components/ui/Spinner.test.tsx`

- [ ] **Step 1: 寫 Spinner 失敗測試**

```tsx
// components/ui/Spinner.test.tsx
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders with default size", () => {
    render(<Spinner />);
    const svg = screen.getByRole("status");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("h-5", "w-5");
  });

  it("renders with custom size", () => {
    render(<Spinner size="lg" />);
    const svg = screen.getByRole("status");
    expect(svg).toHaveClass("h-8", "w-8");
  });

  it("applies custom className", () => {
    render(<Spinner className="text-red-500" />);
    const svg = screen.getByRole("status");
    expect(svg).toHaveClass("text-red-500");
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run components/ui/Spinner.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 Spinner**

```tsx
// components/ui/Spinner.tsx
"use client";

import type { FC } from "react";

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
} as const;

interface SpinnerProps {
  size?: keyof typeof sizeClasses;
  className?: string;
}

export const Spinner: FC<SpinnerProps> = ({ size = "md", className = "" }) => (
  <svg
    className={`animate-spin ${sizeClasses[size]} ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    role="status"
    aria-label="Loading"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run components/ui/Spinner.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui/Spinner.tsx components/ui/Spinner.test.tsx
git commit -m "feat(ui): add Spinner shared component"
```

---

### Task 11: GlowButton 共用元件

**Files:**
- Create: `components/ui/GlowButton.tsx`
- Create: `components/ui/GlowButton.test.tsx`

- [ ] **Step 1: 寫 GlowButton 失敗測試**

```tsx
// components/ui/GlowButton.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { GlowButton } from "./GlowButton";

describe("GlowButton", () => {
  it("renders children", () => {
    render(<GlowButton>Click me</GlowButton>);
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("calls onClick when clicked", () => {
    const handler = vi.fn();
    render(<GlowButton onClick={handler}>Click</GlowButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("shows spinner when loading", () => {
    render(<GlowButton loading>Submit</GlowButton>);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies variant styles", () => {
    render(<GlowButton variant="secondary">Sec</GlowButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("secondary");
  });

  it("is disabled when disabled prop is true", () => {
    render(<GlowButton disabled>Nope</GlowButton>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run components/ui/GlowButton.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 GlowButton**

```tsx
// components/ui/GlowButton.tsx
"use client";

import { type ButtonHTMLAttributes, type FC, type ReactNode } from "react";
import { Spinner } from "./Spinner";

const variantClasses = {
  primary:
    "bg-gradient-to-br from-primary to-primary-600 text-void shadow-glow-sm hover:shadow-glow-md hover:-translate-y-0.5 active:scale-[0.97]",
  secondary:
    "bg-gradient-to-br from-secondary to-secondary-600 text-white shadow-[0_0_10px_hsl(var(--color-glow-secondary)/0.3)] hover:shadow-[0_0_20px_hsl(var(--color-glow-secondary)/0.5)] hover:-translate-y-0.5 active:scale-[0.97]",
  ghost:
    "bg-transparent border border-border-dim text-text-primary hover:border-primary hover:shadow-glow-sm active:scale-[0.97]",
} as const;

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  loading?: boolean;
  children: ReactNode;
}

export const GlowButton: FC<GlowButtonProps> = ({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}) => (
  <button
    className={`
      px-6 py-3 rounded-xl font-heading font-semibold uppercase tracking-wider
      transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]
      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none
      ${variantClasses[variant]}
      ${className}
    `}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? (
      <span className="inline-flex items-center gap-2">
        <Spinner size="sm" />
        {children}
      </span>
    ) : (
      children
    )}
  </button>
);
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run components/ui/GlowButton.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui/GlowButton.tsx components/ui/GlowButton.test.tsx
git commit -m "feat(ui): add GlowButton shared component with variants"
```

---

### Task 12: GlowInput 共用元件

**Files:**
- Create: `components/ui/GlowInput.tsx`
- Create: `components/ui/GlowInput.test.tsx`

- [ ] **Step 1: 寫 GlowInput 失敗測試**

```tsx
// components/ui/GlowInput.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { GlowInput } from "./GlowInput";

describe("GlowInput", () => {
  it("renders with label", () => {
    render(<GlowInput label="Email" id="email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders error message", () => {
    render(<GlowInput label="Email" id="email" error="Required" />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("applies error styling when error is present", () => {
    render(<GlowInput label="Email" id="email" error="Required" />);
    const input = screen.getByLabelText("Email");
    expect(input.className).toContain("border-error");
  });

  it("forwards input props", () => {
    render(<GlowInput label="Email" id="email" type="email" required />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toBeRequired();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run components/ui/GlowInput.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 GlowInput**

```tsx
// components/ui/GlowInput.tsx
"use client";

import type { InputHTMLAttributes, FC, Ref } from "react";

interface GlowInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  ref?: Ref<HTMLInputElement>;
}

/** React 19 ref-as-prop 模式，不需 forwardRef */
export const GlowInput: FC<GlowInputProps> = ({
  label,
  error,
  hint,
  id,
  className = "",
  ref,
  ...props
}) => (
  <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-body text-text-muted">
      {label}
      {hint && <span className="text-text-dim ml-1">{hint}</span>}
    </label>
    <input
      ref={ref}
      id={id}
      className={`
        w-full px-4 py-3 bg-surface border rounded-xl
        text-text-primary placeholder-text-muted
        transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]
        focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--color-glow-primary)/0.1)]
        ${error ? "border-error" : "border-border-dim"}
        ${className}
      `}
      {...props}
    />
    {error && (
      <p className="text-sm text-error font-body">{error}</p>
    )}
  </div>
);
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run components/ui/GlowInput.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui/GlowInput.tsx components/ui/GlowInput.test.tsx
git commit -m "feat(ui): add GlowInput shared component with error state"
```

---

### Task 13: ConfirmDialog 共用元件

**Files:**
- Create: `components/ui/ConfirmDialog.tsx`
- Create: `components/ui/ConfirmDialog.test.tsx`

- [ ] **Step 1: 寫 ConfirmDialog 失敗測試**

```tsx
// components/ui/ConfirmDialog.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  const defaultProps = {
    open: true,
    title: "確認刪除",
    message: "確定要刪除這首歌嗎？",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders when open", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("確認刪除")).toBeInTheDocument();
    expect(screen.getByText("確定要刪除這首歌嗎？")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("確認刪除")).not.toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("確認"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("取消"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when backdrop clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId("confirm-backdrop"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders destructive variant", () => {
    render(<ConfirmDialog {...defaultProps} variant="destructive" />);
    const confirmBtn = screen.getByText("確認");
    expect(confirmBtn.className).toContain("error");
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run components/ui/ConfirmDialog.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 ConfirmDialog**

```tsx
// components/ui/ConfirmDialog.tsx
"use client";

import { type FC, useEffect, useCallback } from "react";
import { GlowButton } from "./GlowButton";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText = "確認",
  cancelText = "取消",
  variant = "default",
  onConfirm,
  onCancel,
}) => {
  // ESC 鍵關閉
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    },
    [onCancel]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        data-testid="confirm-backdrop"
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative glass-card p-6 max-w-sm w-full mx-4 animate-scale-in">
        <h3 className="font-heading font-semibold text-lg text-text-primary mb-2">
          {title}
        </h3>
        <p className="font-body text-sm text-text-muted mb-6">{message}</p>

        <div className="flex justify-end gap-3">
          <GlowButton variant="ghost" onClick={onCancel}>
            {cancelText}
          </GlowButton>
          <GlowButton
            variant={variant === "destructive" ? "ghost" : "primary"}
            className={variant === "destructive" ? "border-error text-error hover:bg-error/10" : ""}
            onClick={onConfirm}
          >
            {confirmText}
          </GlowButton>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run components/ui/ConfirmDialog.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ui/ConfirmDialog.tsx components/ui/ConfirmDialog.test.tsx
git commit -m "feat(ui): add ConfirmDialog shared component (replaces native confirm)"
```

---

### Task 14: AuthLayout 共用元件

**Files:**
- Create: `components/auth/AuthLayout.tsx`
- Create: `components/auth/AuthLayout.test.tsx`

- [ ] **Step 1: 寫 AuthLayout 失敗測試**

```tsx
// components/auth/AuthLayout.test.tsx
import { render, screen } from "@testing-library/react";
import { AuthLayout } from "./AuthLayout";

describe("AuthLayout", () => {
  it("renders title", () => {
    render(
      <AuthLayout title="登入歌詞顯示系統">
        <div>form content</div>
      </AuthLayout>
    );
    expect(screen.getByText("LY")).toBeInTheDocument();
    expect(screen.getByText("登入歌詞顯示系統")).toBeInTheDocument();
  });

  it("renders children inside glass card", () => {
    render(
      <AuthLayout title="Test">
        <input data-testid="my-input" />
      </AuthLayout>
    );
    expect(screen.getByTestId("my-input")).toBeInTheDocument();
  });

  it("renders footer content", () => {
    render(
      <AuthLayout title="Test" footer={<span>footer text</span>}>
        <div />
      </AuthLayout>
    );
    expect(screen.getByText("footer text")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run components/auth/AuthLayout.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 AuthLayout**

```tsx
// components/auth/AuthLayout.tsx
"use client";

import type { FC, ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const AuthLayout: FC<AuthLayoutProps> = ({
  title,
  children,
  footer,
}) => (
  <main className="min-h-screen flex items-center justify-center p-4 bg-void text-text-primary relative overflow-hidden">
    {/* 背景效果 */}
    <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-50" />

    <div className="w-full max-w-md relative z-10">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading font-bold tracking-wider">
          <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            LY
          </span>
        </h1>
        <p className="mt-2 font-body text-text-muted">{title}</p>
      </div>

      {/* Card */}
      <div className="glass-card p-8 animate-scale-in">
        {children}
        {footer && (
          <div className="mt-6 text-center text-sm font-body text-text-muted">
            {footer}
          </div>
        )}
      </div>
    </div>
  </main>
);
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run components/auth/AuthLayout.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/auth/AuthLayout.tsx components/auth/AuthLayout.test.tsx
git commit -m "feat(auth): add AuthLayout shared component for login/register"
```

---

### Task 15: calcVisibleLines 共用工具

**Files:**
- Create: `lib/utils/visible-lines.ts`
- Create: `lib/utils/visible-lines.test.ts`

- [ ] **Step 1: 寫 calcVisibleLines 失敗測試**

```ts
// lib/utils/visible-lines.test.ts
import { calcVisibleLines } from "./visible-lines";

describe("calcVisibleLines", () => {
  it("returns correct range for normal case", () => {
    const result = calcVisibleLines({
      currentIndex: 5,
      totalLines: 20,
      visibleCount: 7,
    });
    // 當前行應在可見區上方 1/3 處
    expect(result.start).toBeLessThanOrEqual(5);
    expect(result.end).toBeGreaterThan(5);
    expect(result.end - result.start).toBe(7);
  });

  it("clamps to start when currentIndex is near beginning", () => {
    const result = calcVisibleLines({
      currentIndex: 1,
      totalLines: 20,
      visibleCount: 7,
    });
    expect(result.start).toBe(0);
  });

  it("clamps to end when currentIndex is near end", () => {
    const result = calcVisibleLines({
      currentIndex: 18,
      totalLines: 20,
      visibleCount: 7,
    });
    expect(result.end).toBe(20);
  });

  it("handles empty lyrics", () => {
    const result = calcVisibleLines({
      currentIndex: 0,
      totalLines: 0,
      visibleCount: 7,
    });
    expect(result.start).toBe(0);
    expect(result.end).toBe(0);
  });

  it("handles visibleCount larger than totalLines", () => {
    const result = calcVisibleLines({
      currentIndex: 2,
      totalLines: 3,
      visibleCount: 7,
    });
    expect(result.start).toBe(0);
    expect(result.end).toBe(3);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run lib/utils/visible-lines.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 calcVisibleLines**

```ts
// lib/utils/visible-lines.ts

interface CalcVisibleLinesInput {
  currentIndex: number;
  totalLines: number;
  visibleCount: number;
}

interface CalcVisibleLinesResult {
  start: number;
  end: number;
}

/**
 * 計算可見行範圍（look-ahead bias：當前行在上方 1/3）
 * 供 LyricsDisplay 和 LivePreview 共用
 */
export function calcVisibleLines({
  currentIndex,
  totalLines,
  visibleCount,
}: CalcVisibleLinesInput): CalcVisibleLinesResult {
  if (totalLines === 0) {
    return { start: 0, end: 0 };
  }

  const effectiveVisible = Math.min(visibleCount, totalLines);

  // 當前行放在上方 1/3 位置
  const offset = Math.floor(effectiveVisible / 3);
  let start = currentIndex - offset;

  // Clamp
  if (start < 0) start = 0;
  if (start + effectiveVisible > totalLines) {
    start = totalLines - effectiveVisible;
  }
  if (start < 0) start = 0;

  return {
    start,
    end: start + effectiveVisible,
  };
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run lib/utils/visible-lines.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/utils/visible-lines.ts lib/utils/visible-lines.test.ts
git commit -m "feat(utils): add calcVisibleLines shared utility"
```

---

### Task 16: Toast 解耦 — 移除 useLyricsStore 依賴

**Files:**
- Modify: `components/ui/Toast.tsx`

- [ ] **Step 1: 移除 useLyricsStore import**

在 `Toast.tsx` 中：
- 刪除 `import { useLyricsStore } from "@/lib/store";`
- 在 `ToastItem` 中刪除 `const displaySettings = useLyricsStore((state) => state.displaySettings);`
- 將 `style={{ boxShadow: \`0 4px 20px ${displaySettings.highlightColor}20\` }}` 改為 `style={{ boxShadow: '0 4px 20px hsl(var(--color-glow-primary) / 0.12)' }}`
- 將 `style={{ color: displaySettings.highlightColor }}` 改為移除此 inline style（Toast title 使用 CSS class 而非動態色）

- [ ] **Step 2: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 3: 執行全部測試確認無回歸**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add components/ui/Toast.tsx
git commit -m "fix(toast): decouple from useLyricsStore, use CSS variables instead"
```

---

## Chunk 4: Stage 3 — 頁面重設計

### Task 17: Home 頁面動效升級

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 新增 staggered entrance + neon breathing 動效**

在 `globals.css` 新增 staggered entrance 工具 class：
```css
.stagger-1 { animation-delay: 100ms; }
.stagger-2 { animation-delay: 200ms; }
.stagger-3 { animation-delay: 300ms; }
```

修改 Home 頁面 FeatureCard 區塊，加入 `animate-slide-in` + `stagger-*` class：

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
  <div className="animate-slide-in stagger-1 opacity-0 fill-mode-forwards">
    <FeatureCard ... />
  </div>
  <div className="animate-slide-in stagger-2 opacity-0 fill-mode-forwards">
    <FeatureCard ... />
  </div>
  <div className="animate-slide-in stagger-3 opacity-0 fill-mode-forwards">
    <FeatureCard ... />
  </div>
</div>
```

修改品牌標題加入 neon breathing：
```tsx
<h1 className="... focus-glow">
```

CTA 按鈕使用 `transition-all duration-[var(--duration-fast)]`。

- [ ] **Step 2: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat(home): add staggered entrance animations and neon breathing"
```

---

### Task 18: Login + Register 頁面重設計

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`

- [ ] **Step 1: 重寫 Login 頁面使用共用元件**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { GlowInput } from "@/components/ui/GlowInput";
import { GlowButton } from "@/components/ui/GlowButton";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/controller");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="登入歌詞顯示系統"
      footer={
        <p>
          還沒有帳號？{" "}
          <Link
            href="/register"
            className="text-primary hover:text-primary-300 transition-colors duration-[var(--duration-fast)]"
          >
            註冊
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-sm font-body animate-shake">
            {error}
          </div>
        )}

        <GlowInput
          label="Email"
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={loading}
        />

        <GlowInput
          label="密碼"
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••"
          disabled={loading}
        />

        <GlowButton
          type="submit"
          loading={loading}
          className="w-full"
        >
          {loading ? "登入中..." : "登入"}
        </GlowButton>
      </form>
    </AuthLayout>
  );
}
```

- [ ] **Step 2: 重寫 Register 頁面（同樣模式）**

同 Login 模式，使用 `AuthLayout` + `GlowInput` + `GlowButton`，保留密碼長度前端驗證。

- [ ] **Step 3: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 4: Commit**

```bash
git add app/login/page.tsx app/register/page.tsx
git commit -m "feat(auth): redesign login/register with AuthLayout, GlowInput, GlowButton"
```

---

### Task 19: Controller 拆分 — 提取子元件

> 這是最大的 Task，需要分步驟提取。每一步提取一個元件。

**Files:**
- Create: `components/controller/ToggleRow.tsx`
- Create: `components/controller/ControllerHeader.tsx`
- Create: `components/controller/MobileTabBar.tsx`
- Create: `components/controller/QuickSettings.tsx`
- Create: `components/controller/LivePreview.tsx`
- Create: `components/controller/CueGrid.tsx`
- Create: `components/controller/SongLibrary.tsx`
- Create: `components/controller/PlaylistPanel.tsx`
- Modify: `app/controller/page.tsx`

**策略**：由內而外，先提取無依賴的展示元件（ToggleRow、MobileTabBar、ControllerHeader），再提取有 store 讀取的功能元件。每提取一個元件後 commit，確保每步可回退。

> **注意**：`page.tsx` 作為組裝殼（不另建 `ControllerPage.tsx`），因為 Next.js App Router 的 `page.tsx` 本身就是路由入口，多一層包裝無必要。這是對 spec 中 `ControllerPage.tsx` 的有意偏離。

**既有元件整合對照**：

| 既有元件 | 整合至新元件 |
|---------|------------|
| `AddSongModal` | `SongLibrary.tsx` 內部 import |
| `LrcDropZone` | `SongLibrary.tsx` 內部 import |
| `QRCodePanel` | `page.tsx`（桌面側欄）/ `MobileTabBar`（手機 QR Tab） |
| `SortablePlaylist` | `PlaylistPanel.tsx` 內部 import |
| `AiTrackingPanel` | `page.tsx`（獨立面板，暫保留原位） |
| `usePlaylistReorder` | `PlaylistPanel.tsx` 內部使用 |
| `useKeyboardShortcuts` | `CueGrid.tsx` 內部使用 |

- [ ] **Step 1: 提取 ToggleRow（純 props 元件）**

從 controller/page.tsx 中找到 ToggleRow 定義（搜尋 `function ToggleRow` 或 `role="switch"`），提取到 `components/controller/ToggleRow.tsx`，保留 `role="switch"` 無障礙屬性。

- [ ] **Step 2: 提取 MobileTabBar**

- [ ] **Step 3: 提取 ControllerHeader**

- [ ] **Step 4: 提取 QuickSettings**

依賴 ToggleRow、直接讀 store `displaySettings`。

- [ ] **Step 5: 提取 LivePreview**

使用共用 `calcVisibleLines`，直接讀 store。

- [ ] **Step 6: 提取 CueGrid**

含鍵盤快捷鍵、LIVE 標記、點擊跳轉。直接讀 store。

- [ ] **Step 7: 提取 SongLibrary**

含搜尋、CRUD 按鈕。直接讀 store。

- [ ] **Step 8: 提取 PlaylistPanel**

含 SortablePlaylist 整合。

- [ ] **Step 9: 重寫 page.tsx 為組裝殼**

page.tsx 只負責：
- RWD 佈局切換（桌面 `react-resizable-panels` / 手機 Tab 切換）
- Session 初始化
- Import + 組裝子元件

目標：page.tsx < 200 行。

- [ ] **Step 10: 將所有 `confirm()` 呼叫替換為 ConfirmDialog**

找到 controller 中 `confirm(` 呼叫處（原 line 727, 991），替換為 `ConfirmDialog` 元件 + state 管理。

- [ ] **Step 11: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 12: 執行全部測試**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 13: Commit（每個子元件一個 commit，或最終一個整合 commit）**

```bash
git add components/controller/ app/controller/page.tsx
git commit -m "refactor(controller): split 1707-line page into 9 focused components"
```

---

### Task 20: Display — Clean Output 模式

**Files:**
- Modify: `app/display/page.tsx`

- [ ] **Step 1: 新增 Clean Output 模式偵測**

在 `DisplayPage` 中讀取 `?mode=clean`：

```tsx
const isCleanOutput = searchParams.get("mode") === "clean";
```

- [ ] **Step 2: Clean Output 連線後渲染**

```tsx
// Connected - Display Lyrics
if (isCleanOutput) {
  return (
    <div className="fixed inset-0 w-full h-full" style={{ background: "#000000" }}>
      {/* Clean Output: 純黑背景 + 歌詞文字 + glow，無任何 UI chrome */}
      {/* LyricsDisplay 會讀取 displaySettings.highlightColor，文字色/glow 跟隨 Controller 設定 */}
      <div style={{ opacity: connectionState === "disconnected" ? 1 : 1 }}>
        {/* Clean Output 斷線時不降低 opacity（歌詞靜止在最後同步位置） */}
        <LyricsDisplay />
      </div>
    </div>
  );
}
```

無 `ConnectionStatusBar`、無 `ConnectionIndicator`、無 `LyricsControl`、無 Song Info Overlay。

**Clean Output 斷線行為**（spec 要求）：
- 不顯示任何重連 UI（投影觀眾不應看到技術問題）
- 歌詞靜止在最後一次同步位置
- 操作員在 Controller 端監控連線狀態

- [ ] **Step 3: Clean Output 連線畫面也需特殊處理**

當 `isCleanOutput && !isConnected` 時，不顯示同步碼輸入界面，直接顯示純黑等待畫面：
```tsx
if (!isConnected && isCleanOutput) {
  return <div className="fixed inset-0" style={{ background: "#000000" }} />;
}
```

Clean Output 場景下使用 URL `?code=XXXXXX&mode=clean` 自動連線。

- [ ] **Step 4: 修復 fade-out 動畫**

在 Song Info Overlay 中，將 `animate-[fade-out_3s_ease-out_forwards]` 改為 Tailwind config 定義的：
```tsx
<div className="fixed top-6 left-6 animate-fade-out-slow z-40">
```

使用 Task 6 中新增的 `animate-fade-out-slow`（3s duration）。

- [ ] **Step 5: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 6: Commit**

```bash
git add app/display/page.tsx
git commit -m "feat(display): add Clean Output mode (?mode=clean) for OBS/VJ capture"
```

---

## Chunk 5: Stage 4 — 收尾

### Task 21: 全站硬編碼色值掃描

- [ ] **Step 1: 執行掃描**

Run: `grep -rE "#[0-9a-fA-F]{6}" app/ components/ lib/ --include="*.tsx" --include="*.ts" --include="*.css" | grep -v node_modules | grep -v ".test."`

Expected: 僅有 `tailwind.config.ts` 中的 shade palette 和 Display Clean Output 的 `#000000`。

- [ ] **Step 2: 修復任何遺漏的硬編碼色值**

Controller 子元件中約 30+ 處硬編碼 hex，逐一替換為語意化 Tailwind class。

- [ ] **Step 3: Commit（若有修改）**

```bash
git commit -m "fix(design-system): replace remaining hardcoded hex values with CSS var classes"
```

---

### Task 22: 文檔更新

**Files:**
- Modify: `docs/changelog.md`

- [ ] **Step 1: 更新 changelog**

在 `docs/changelog.md` 頂部新增 v0.8.0 條目，包含：
- Token 安全修復（HttpOnly cookie）
- 設計系統統一（CSS 變數唯一來源）
- Controller 拆分（9 個元件）
- Display Clean Output 模式
- 共用元件庫（GlowButton、GlowInput、Spinner、ConfirmDialog、AuthLayout）
- 動效系統（Motion tokens + 3 層動效）

- [ ] **Step 2: Commit**

```bash
git add docs/changelog.md
git commit -m "docs: update changelog for v0.8.0 P0 UI/UX redesign"
```

---

### Task 23: 全套測試確認

- [ ] **Step 1: 前端測試**

Run: `npx vitest run`
Expected: ALL PASS，零 warning

- [ ] **Step 2: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 3: Go 後端測試**

Run: `cd backend && go test ./...`
Expected: ALL PASS

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: 無錯誤

---

## 平行化執行指引

```
Stage 1（平行）:
  Agent A: Task 1, 2, 2.5, 2.6, 3, 4 (Token 安全)
  Agent B: Task 5, 6, 7, 8 (設計系統)

Stage 2（序列，依賴 Stage 1B）:
  Agent C: Task 9-16 (共用元件)

Stage 3（部分平行，依賴 Stage 2）:
  Agent D: Task 17-18 (Home + Auth 頁面)
  Agent E: Task 19-20 (Controller 拆分 + Display Clean Output)

Stage 4（序列，全部完成後）:
  Agent F: Task 21-23 (收尾)
```

---

**計畫版本**: 1.0
**對應設計規格**: `docs/specs/2026-03-16-p0-ui-redesign-design.md` v1.2
