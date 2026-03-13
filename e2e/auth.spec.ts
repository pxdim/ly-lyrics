/**
 * E2E 測試：Auth 流程
 *
 * 測試註冊 → 登入 → token refresh → /auth/me → 錯誤密碼
 * 直接呼叫 Go backend API，不經過 Next.js
 */

import { test, expect } from "@playwright/test";
import {
  registerUser,
  loginUser,
  refreshToken,
  getMe,
  testEmail,
} from "./helpers/auth";

const API_BASE = process.env["GO_BACKEND_URL"] || "http://localhost:8080";

test.describe("Auth 流程", () => {
  const password = "TestPass123!";
  let email: string;

  test.beforeAll(() => {
    email = testEmail();
  });

  test("註冊新帳號 → 201 + 取得 token", async () => {
    const tokens = await registerUser(email, password, "E2E User");
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
  });

  test("用同帳號登入 → 200 + token", async () => {
    const tokens = await loginUser(email, password);
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
  });

  test("用 token 取得使用者資訊 (/auth/me)", async () => {
    const tokens = await loginUser(email, password);
    const me = await getMe(tokens.accessToken);
    expect(me.email).toBe(email);
  });

  test("Refresh token 取得新 access token", async () => {
    const tokens = await loginUser(email, password);
    const newTokens = await refreshToken(tokens.refreshToken);
    expect(newTokens.accessToken).toBeTruthy();
    // 新 token 應與舊 token 不同
    expect(newTokens.accessToken).not.toBe(tokens.accessToken);
  });

  test("錯誤密碼登入 → 401", async () => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "wrong-password" }),
    });
    expect(res.status).toBe(401);
  });
});
