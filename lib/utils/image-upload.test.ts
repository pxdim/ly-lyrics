/**
 * 背景圖片上傳工具函式 — 測試
 *
 * 驗證圖片檔案格式、大小限制、以及轉換為 data URL。
 */

import { describe, it, expect } from "vitest";
import { validateImageFile, fileToDataUrl } from "./image-upload";

// 建立模擬 File 的工具函式
function createMockFile(
  name: string,
  size: number,
  type: string,
): File {
  // 建立指定大小的 ArrayBuffer 內容
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe("validateImageFile", () => {
  it("接受 2MB 以下的 JPEG 檔案", () => {
    const file = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");
    const result = validateImageFile(file);
    expect(result).toEqual({ valid: true });
  });

  it("接受 2MB 以下的 PNG 檔案", () => {
    const file = createMockFile("bg.png", 500 * 1024, "image/png");
    const result = validateImageFile(file);
    expect(result).toEqual({ valid: true });
  });

  it("接受 2MB 以下的 WebP 檔案", () => {
    const file = createMockFile("bg.webp", 800 * 1024, "image/webp");
    const result = validateImageFile(file);
    expect(result).toEqual({ valid: true });
  });

  it("接受剛好 2MB 的檔案（邊界值）", () => {
    const file = createMockFile("exact.jpg", 2 * 1024 * 1024, "image/jpeg");
    const result = validateImageFile(file);
    expect(result).toEqual({ valid: true });
  });

  it("拒絕超過 2MB 的檔案", () => {
    const file = createMockFile("huge.jpg", 2 * 1024 * 1024 + 1, "image/jpeg");
    const result = validateImageFile(file);
    expect(result).toEqual({
      valid: false,
      error: "圖片大小不可超過 2MB",
    });
  });

  it("拒絕 GIF 格式檔案", () => {
    const file = createMockFile("anim.gif", 100 * 1024, "image/gif");
    const result = validateImageFile(file);
    expect(result).toEqual({
      valid: false,
      error: "僅支援 JPG、PNG、WebP 格式",
    });
  });

  it("拒絕 SVG 格式檔案", () => {
    const file = createMockFile("icon.svg", 10 * 1024, "image/svg+xml");
    const result = validateImageFile(file);
    expect(result).toEqual({
      valid: false,
      error: "僅支援 JPG、PNG、WebP 格式",
    });
  });

  it("拒絕非圖片類型檔案", () => {
    const file = createMockFile("doc.pdf", 500 * 1024, "application/pdf");
    const result = validateImageFile(file);
    expect(result).toEqual({
      valid: false,
      error: "僅支援 JPG、PNG、WebP 格式",
    });
  });

  it("拒絕 0 位元組的空檔案", () => {
    const file = createMockFile("empty.jpg", 0, "image/jpeg");
    const result = validateImageFile(file);
    expect(result).toEqual({
      valid: false,
      error: "檔案不可為空",
    });
  });
});

describe("fileToDataUrl", () => {
  it("將圖片檔案轉換為 data URL 字串", async () => {
    // jsdom 的 FileReader 支援 readAsDataURL
    const content = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG 魔術位元組
    const file = new File([content], "test.png", { type: "image/png" });

    const result = await fileToDataUrl(file);

    // data URL 格式為 data:<mime>;base64,<data>
    expect(result).toMatch(/^data:image\/png;base64,/);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("空檔案仍產生 data URL（由呼叫端先驗證大小）", async () => {
    const file = new File([], "empty.png", { type: "image/png" });
    const result = await fileToDataUrl(file);
    expect(result).toMatch(/^data:/);
  });
});
