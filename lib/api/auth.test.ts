/**
 * 認證 API 客戶端單元測試
 *
 * 覆蓋範圍：login / register 函式的成功與失敗路徑、
 * proxy 路徑與 credentials 設定、型別 export 正確性
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { login, register } from "./auth";
import type { AuthResponse, AuthUser } from "./auth";

// Mock fetch
const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** 建立模擬成功回應（Cookie 模式：body 不含 token） */
function createMockAuthResponse(): AuthResponse {
  return {
    expiresAt: "2026-03-15T00:00:00Z",
    user: {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      emailVerified: false,
      createdAt: "2026-03-14T00:00:00Z",
      updatedAt: "2026-03-14T00:00:00Z",
    },
  };
}

describe("login", () => {
  it("送出正確的 POST 請求並回傳 AuthResponse", async () => {
    const mockResponse = createMockAuthResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await login("test@example.com", "password123");

    expect(mockFetch).toHaveBeenCalledOnce();
    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    const [url, options] = call;
    expect(url).toContain("/api/auth/login");
    expect(options.method).toBe("POST");
    expect((options.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(options.body as string)).toEqual({
      email: "test@example.com",
      password: "password123",
    });
    expect(result).toEqual(mockResponse);
  });

  it("API 回傳錯誤時 throw Error 並包含錯誤訊息", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          error: { code: "AUTH_INVALID_CREDENTIALS", message: "帳號或密碼錯誤" },
        }),
    });

    await expect(login("bad@example.com", "wrong")).rejects.toThrow("帳號或密碼錯誤");
  });

  it("API 回傳非 JSON 錯誤時使用預設訊息", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(login("test@example.com", "pw")).rejects.toThrow("登入失敗");
  });

  it("網路錯誤時 throw Error", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(login("test@example.com", "pw")).rejects.toThrow("Failed to fetch");
  });
});

describe("register", () => {
  it("送出正確的 POST 請求並回傳 AuthResponse", async () => {
    const mockResponse = createMockAuthResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await register("test@example.com", "password123", "Test User");

    expect(mockFetch).toHaveBeenCalledOnce();
    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    const [url, options] = call;
    expect(url).toContain("/api/auth/register");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body as string)).toEqual({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });
    expect(result).toEqual(mockResponse);
  });

  it("name 為空字串時不帶入 body", async () => {
    const mockResponse = createMockAuthResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await register("test@example.com", "password123", "");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body).toEqual({
      email: "test@example.com",
      password: "password123",
    });
    expect(body.name).toBeUndefined();
  });

  it("API 回傳錯誤時 throw Error 並包含錯誤訊息", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({
          error: { code: "AUTH_EMAIL_EXISTS", message: "此 email 已被註冊" },
        }),
    });

    await expect(register("dup@example.com", "pw1234", "Dup")).rejects.toThrow(
      "此 email 已被註冊"
    );
  });
});

describe("proxy 路徑與 credentials", () => {
  it("login 呼叫 /api/auth/login（proxy 路徑，非直連 Go backend）", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockAuthResponse()),
    });

    await login("a@b.com", "password");

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    // 應為相對路徑 /api/auth/login，不含 localhost:8080 或其他 host
    expect(url).toBe("/api/auth/login");
    expect(options.credentials).toBe("include");
  });

  it("login 回應不包含 accessToken 或 refreshToken", async () => {
    // 模擬 Go backend cookie 模式回應：body 不含 token
    const cookieResponse = {
      expiresAt: "2026-04-01T00:00:00Z",
      user: { id: "1", email: "a@b.com", name: null, emailVerified: false, createdAt: "", updatedAt: "" },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(cookieResponse),
    });

    const result = await login("a@b.com", "password");
    expect(result).not.toHaveProperty("accessToken");
    expect(result).not.toHaveProperty("refreshToken");
  });

  it("register 呼叫 /api/auth/register（proxy 路徑）且帶 credentials: include", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createMockAuthResponse()),
    });

    await register("a@b.com", "password", "Test");

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/auth/register");
    expect(options.credentials).toBe("include");
  });
});

describe("型別 export", () => {
  it("AuthResponse 型別不含 token 欄位，僅含 expiresAt 和 user", () => {
    const response: AuthResponse = createMockAuthResponse();
    expect(response.expiresAt).toBeDefined();
    expect(response.user.id).toBeDefined();
    expect(response.user.email).toBeDefined();
  });

  it("AuthUser 的 name 可以為 null", () => {
    const user: AuthUser = {
      id: "1",
      email: "a@b.com",
      name: null,
      emailVerified: false,
      createdAt: "",
      updatedAt: "",
    };
    expect(user.name).toBeNull();
  });
});
