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
  // name 為空字串時不帶入，對應 Go backend 的 omitempty
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
