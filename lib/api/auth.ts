/**
 * 認證 API 客戶端封裝
 *
 * 直接呼叫 Go backend 的認證端點。
 * 用於客戶端元件（登入/註冊頁面）。
 *
 * @module lib/api/auth
 */

// ============================================================================
// Types（對齊 Go backend dto/auth.go）
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

/** 認證成功回應 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
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
// API Base URL
// ============================================================================

/**
 * Go backend API 基礎 URL
 * 優先使用環境變數，否則從瀏覽器位置推斷（開發環境）
 */
const API_BASE =
  process.env["NEXT_PUBLIC_GO_BACKEND_URL"] ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : "http://localhost:8080");

// ============================================================================
// API 呼叫
// ============================================================================

/**
 * 使用者登入
 *
 * @param email - 使用者 email
 * @param password - 使用者密碼
 * @returns 認證回應（含 token 及使用者資訊）
 * @throws Error 登入失敗時拋出錯誤
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
 *
 * @param email - 使用者 email
 * @param password - 使用者密碼（最少 6 字元）
 * @param name - 使用者名稱（可選）
 * @returns 認證回應（含 token 及使用者資訊）
 * @throws Error 註冊失敗時拋出錯誤
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

  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
