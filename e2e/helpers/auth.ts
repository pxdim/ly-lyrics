/**
 * E2E 測試用認證輔助函式
 * 直接呼叫 Go backend API 進行使用者註冊、登入、Token 刷新等操作
 */

const API_BASE = "http://localhost:8080";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * 註冊新使用者
 */
export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<AuthTokens> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      name: name ?? email.split("@")[0],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `註冊失敗 (${res.status}): ${body}`
    );
  }

  const data = await res.json();
  return {
    accessToken: data.access_token ?? data.accessToken,
    refreshToken: data.refresh_token ?? data.refreshToken,
  };
}

/**
 * 使用者登入
 */
export async function loginUser(
  email: string,
  password: string
): Promise<AuthTokens> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `登入失敗 (${res.status}): ${body}`
    );
  }

  const data = await res.json();
  return {
    accessToken: data.access_token ?? data.accessToken,
    refreshToken: data.refresh_token ?? data.refreshToken,
  };
}

/**
 * 刷新 Token
 */
export async function refreshToken(token: string): Promise<AuthTokens> {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: token }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Token 刷新失敗 (${res.status}): ${body}`
    );
  }

  const data = await res.json();
  return {
    accessToken: data.access_token ?? data.accessToken,
    refreshToken: data.refresh_token ?? data.refreshToken,
  };
}

/**
 * 取得當前使用者資訊
 */
export async function getMe(accessToken: string): Promise<UserInfo> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `取得使用者資訊失敗 (${res.status}): ${body}`
    );
  }

  const data = await res.json();
  return data.user;
}

/**
 * 產生唯一的測試用 email，避免測試間衝突
 */
export function testEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}
