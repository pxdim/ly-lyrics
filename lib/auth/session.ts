/**
 * Session Helpers
 *
 * 伺服器元件與 API 路由的認證輔助函式。
 * 使用 Go 後端 JWT token 進行認證驗證。
 *
 * @module lib/auth/session
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppError } from "@/lib/errors/AppError";

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

// ============================================================================
// Session Helpers
// ============================================================================

const GO_BACKEND_URL = process.env["GO_BACKEND_URL"] || "http://localhost:8080";

/**
 * 從 cookie 中取得 access token
 */
async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value ?? null;
}

/**
 * 取得當前已認證的使用者
 * @returns 已認證使用者或 null
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${GO_BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * 要求認證 — 未認證則重導至登入頁
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }
  return user;
}

/**
 * 取得使用者 ID（未認證時回傳 demo user ID）
 */
export async function getUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (user) return user.id;
  // Demo 使用者由 Go 後端管理
  return "00000000-0000-0000-0000-000000000001";
}

/**
 * 檢查是否為 demo 使用者
 */
export async function isDemoUser(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.id === "00000000-0000-0000-0000-000000000001";
}

/**
 * 要求特定使用者
 */
export async function requireUser(allowedIds: string[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!allowedIds.includes(user.id)) {
    throw new AppError(
      "AUTH_FORBIDDEN",
      "You don't have permission to access this resource",
      undefined,
      "error"
    );
  }
  return user;
}

/**
 * API 路由認證檢查
 */
export async function apiAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError(
      "AUTH_UNAUTHORIZED",
      "Authentication required",
      undefined,
      "error"
    );
  }
  return user;
}
