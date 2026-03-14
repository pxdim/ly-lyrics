import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registerServiceWorker } from "./registerServiceWorker";

describe("registerServiceWorker", () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // 還原 navigator
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("呼叫 navigator.serviceWorker.register 並傳入 /sw.js", async () => {
    const mockRegister = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", {
      value: { serviceWorker: { register: mockRegister } },
      writable: true,
      configurable: true,
    });

    await registerServiceWorker();

    expect(mockRegister).toHaveBeenCalledOnce();
    expect(mockRegister).toHaveBeenCalledWith("/sw.js");
  });

  it("瀏覽器不支援 serviceWorker 時靜默跳過", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      writable: true,
      configurable: true,
    });

    // 不應拋出錯誤
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });

  it("註冊失敗時靜默處理不拋出錯誤", async () => {
    const mockRegister = vi
      .fn()
      .mockRejectedValue(new Error("HTTPS required"));
    Object.defineProperty(globalThis, "navigator", {
      value: { serviceWorker: { register: mockRegister } },
      writable: true,
      configurable: true,
    });

    // 不應拋出錯誤
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });
});
