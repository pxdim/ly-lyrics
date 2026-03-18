/**
 * Session Helpers 單元測試
 *
 * 覆蓋範圍：
 * - getCurrentUser: 有 token / 無 token / API 錯誤 / 網路錯誤
 * - requireAuth: 已認證 / 未認證重導
 * - getUserId: 已認證回傳 ID / 未認證回傳 demo ID
 * - isDemoUser: 一般使用者 / demo 使用者 / 未認證
 * - requireUser: 允許的使用者 / 不允許的使用者
 * - apiAuth: 已認證 / 未認證拋錯
 *
 * Mock 策略：
 * - next/navigation（redirect）：框架依賴，必須 mock
 * - next/headers（cookies）：框架依賴，必須 mock
 * - fetch：外部 HTTP 依賴，必須 mock
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AppError } from "@/lib/errors/AppError";

// ============================================================================
// Mocks
// ============================================================================

// 模擬 next/navigation — redirect 拋出特殊錯誤以中斷流程
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    // 模擬 Next.js redirect 的行為：拋出 NEXT_REDIRECT 錯誤
    throw new Error("NEXT_REDIRECT");
  },
}));

// 模擬 next/headers — cookies() 回傳 cookie store
const mockCookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: mockCookieGet }),
}));

// 模擬 fetch
const mockFetch = vi.fn();

// ============================================================================
// 測試主體
// ============================================================================

// 動態 import 以確保 mock 生效
let getCurrentUser: typeof import("./session").getCurrentUser;
let requireAuth: typeof import("./session").requireAuth;
let getUserId: typeof import("./session").getUserId;
let isDemoUser: typeof import("./session").isDemoUser;
let requireUser: typeof import("./session").requireUser;
let apiAuth: typeof import("./session").apiAuth;

beforeEach(async () => {
  mockCookieGet.mockReset();
  mockRedirect.mockReset();
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);

  // 重新 import 以確保每次使用最新 mock 狀態
  const mod = await import("./session");
  getCurrentUser = mod.getCurrentUser;
  requireAuth = mod.requireAuth;
  getUserId = mod.getUserId;
  isDemoUser = mod.isDemoUser;
  requireUser = mod.requireUser;
  apiAuth = mod.apiAuth;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// 輔助函式
// ============================================================================

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

/** 設定 cookie 中有 access_token */
function setCookieToken(token: string) {
  mockCookieGet.mockImplementation((name: string) =>
    name === "access_token" ? { value: token } : undefined
  );
}

/** 設定 cookie 中無 access_token */
function setCookieEmpty() {
  mockCookieGet.mockReturnValue(undefined);
}

/** 模擬後端 /api/auth/me 成功回應 */
function mockAuthMeSuccess(user: {
  id: string;
  email: string;
  name: string | null;
}) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ user }),
  });
}

/** 模擬後端 /api/auth/me 失敗回應 */
function mockAuthMeFailure(status = 401) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error: "unauthorized" }),
  });
}

// ============================================================================
// getCurrentUser
// ============================================================================

describe("getCurrentUser", () => {
  it("returns user when token is valid and API responds successfully", async () => {
    setCookieToken("valid-token");
    mockAuthMeSuccess({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    });

    const user = await getCurrentUser();

    expect(user).toEqual({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    });
  });

  it("sends correct Authorization header and cache option", async () => {
    setCookieToken("my-jwt-token");
    mockAuthMeSuccess({ id: "u1", email: "a@b.com", name: null });

    await getCurrentUser();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/auth/me");
    expect((options.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer my-jwt-token"
    );
    expect(options.cache).toBe("no-store");
  });

  it("returns null when no access_token cookie exists", async () => {
    setCookieEmpty();

    const user = await getCurrentUser();

    expect(user).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null when API returns non-OK response", async () => {
    setCookieToken("expired-token");
    mockAuthMeFailure(401);

    const user = await getCurrentUser();

    expect(user).toBeNull();
  });

  it("returns null when fetch throws network error", async () => {
    setCookieToken("valid-token");
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const user = await getCurrentUser();

    expect(user).toBeNull();
  });

  it("maps null name from API response", async () => {
    setCookieToken("token");
    mockAuthMeSuccess({ id: "u1", email: "a@b.com", name: null });

    const user = await getCurrentUser();

    expect(user?.name).toBeNull();
  });

  it("handles missing name field by defaulting to null", async () => {
    setCookieToken("token");
    // 後端回傳的 user 物件沒有 name 欄位
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: "u1", email: "a@b.com" },
        }),
    });

    const user = await getCurrentUser();

    expect(user?.name).toBeNull();
  });
});

// ============================================================================
// requireAuth
// ============================================================================

describe("requireAuth", () => {
  it("returns user when authenticated", async () => {
    setCookieToken("valid-token");
    mockAuthMeSuccess({ id: "u1", email: "a@b.com", name: "User" });

    const user = await requireAuth();

    expect(user).toEqual({ id: "u1", email: "a@b.com", name: "User" });
  });

  it("redirects to /login when not authenticated", async () => {
    setCookieEmpty();

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects when API returns failure", async () => {
    setCookieToken("bad-token");
    mockAuthMeFailure();

    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });
});

// ============================================================================
// getUserId
// ============================================================================

describe("getUserId", () => {
  it("returns user ID when authenticated", async () => {
    setCookieToken("token");
    mockAuthMeSuccess({ id: "real-user-id", email: "a@b.com", name: null });

    const id = await getUserId();

    expect(id).toBe("real-user-id");
  });

  it("returns demo user ID when not authenticated", async () => {
    setCookieEmpty();

    const id = await getUserId();

    expect(id).toBe(DEMO_USER_ID);
  });

  it("returns demo user ID when API fails", async () => {
    setCookieToken("bad");
    mockAuthMeFailure();

    const id = await getUserId();

    expect(id).toBe(DEMO_USER_ID);
  });
});

// ============================================================================
// isDemoUser
// ============================================================================

describe("isDemoUser", () => {
  it("returns true when user ID matches demo user ID", async () => {
    setCookieToken("token");
    mockAuthMeSuccess({ id: DEMO_USER_ID, email: "demo@ly.app", name: null });

    const result = await isDemoUser();

    expect(result).toBe(true);
  });

  it("returns false when user ID is not demo user", async () => {
    setCookieToken("token");
    mockAuthMeSuccess({ id: "real-user", email: "a@b.com", name: null });

    const result = await isDemoUser();

    expect(result).toBe(false);
  });

  it("returns false when not authenticated", async () => {
    setCookieEmpty();

    const result = await isDemoUser();

    expect(result).toBe(false);
  });
});

// ============================================================================
// requireUser
// ============================================================================

describe("requireUser", () => {
  it("returns user when ID is in allowed list", async () => {
    setCookieToken("token");
    mockAuthMeSuccess({ id: "u1", email: "a@b.com", name: "User" });

    const user = await requireUser(["u1", "u2", "u3"]);

    expect(user.id).toBe("u1");
  });

  it("throws AUTH_FORBIDDEN when user ID is not in allowed list", async () => {
    setCookieToken("token");
    mockAuthMeSuccess({ id: "u999", email: "a@b.com", name: "User" });

    try {
      await requireUser(["u1", "u2"]);
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("AUTH_FORBIDDEN");
    }
  });

  it("redirects to login when not authenticated (before checking allowed list)", async () => {
    setCookieEmpty();

    await expect(requireUser(["u1"])).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });
});

// ============================================================================
// apiAuth
// ============================================================================

describe("apiAuth", () => {
  it("returns user when authenticated", async () => {
    setCookieToken("token");
    mockAuthMeSuccess({ id: "u1", email: "a@b.com", name: "API User" });

    const user = await apiAuth();

    expect(user).toEqual({ id: "u1", email: "a@b.com", name: "API User" });
  });

  it("throws AUTH_UNAUTHORIZED when not authenticated", async () => {
    setCookieEmpty();

    try {
      await apiAuth();
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("AUTH_UNAUTHORIZED");
      expect((error as AppError).userMessage).toBe("Authentication required");
    }
  });

  it("throws AUTH_UNAUTHORIZED when API returns failure", async () => {
    setCookieToken("bad-token");
    mockAuthMeFailure();

    try {
      await apiAuth();
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("AUTH_UNAUTHORIZED");
    }
  });
});
