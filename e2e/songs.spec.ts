/**
 * E2E 測試：Songs CRUD
 *
 * 測試建歌 → 列表 → 取得單首 → 編輯 → 刪除
 * 使用已認證使用者，直接呼叫 Go backend API
 */

import { test, expect } from "@playwright/test";
import { registerUser, testEmail } from "./helpers/auth";
import { cleanupSongs } from "./helpers/api";

const API_BASE = process.env["GO_BACKEND_URL"] || "http://localhost:8080";

test.describe("Songs CRUD", () => {
  let token: string;
  let songId: string;

  test.beforeAll(async () => {
    const tokens = await registerUser(testEmail(), "TestPass123!");
    token = tokens.accessToken;
  });

  test.afterAll(async () => {
    await cleanupSongs(token);
  });

  test("建立歌曲 → 201", async () => {
    const res = await fetch(`${API_BASE}/api/songs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: "E2E 測試歌曲",
        artist: "測試歌手",
        lyrics: ["第一行", "第二行", "第三行"],
        language: "zh",
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    songId = data.id;
    expect(data.title).toBe("E2E 測試歌曲");
    expect(data.lyrics).toEqual(["第一行", "第二行", "第三行"]);
  });

  test("列表查詢包含剛建的歌", async () => {
    const res = await fetch(`${API_BASE}/api/songs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    const found = data.data.find((s: { id: string }) => s.id === songId);
    expect(found).toBeTruthy();
    expect(found.title).toBe("E2E 測試歌曲");
  });

  test("取得單首歌曲", async () => {
    const res = await fetch(`${API_BASE}/api/songs/${songId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.lyrics).toEqual(["第一行", "第二行", "第三行"]);
  });

  test("更新歌名", async () => {
    const res = await fetch(`${API_BASE}/api/songs/${songId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: "更新後的歌名" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("更新後的歌名");
  });

  test("刪除歌曲後 GET 回 404", async () => {
    // Go backend 刪除回傳 200 + { success: true, deletedSong: {...} }
    const delRes = await fetch(`${API_BASE}/api/songs/${songId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status).toBe(200);
    const delData = await delRes.json();
    expect(delData.success).toBe(true);

    // 確認已刪除 — GET 回 404
    const getRes = await fetch(`${API_BASE}/api/songs/${songId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status).toBe(404);
  });
});
