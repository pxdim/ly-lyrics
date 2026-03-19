/**
 * useOnlineStatus hook 測試
 *
 * 測試離線偵測功能，驗證 hook 正確追蹤 navigator.onLine 狀態變化。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// 載入前需先 mock navigator.onLine（測試中不可直接賦值）
let onLineValue = true;
Object.defineProperty(globalThis.navigator, "onLine", {
  get: () => onLineValue,
  configurable: true,
});

import { useOnlineStatus } from "./useOnlineStatus";

describe("useOnlineStatus", () => {
  // 儲存原始 addEventListener / removeEventListener 以供驗證
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    onLineValue = true;
    addSpy = vi.spyOn(window, "addEventListener");
    removeSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("初始狀態為 navigator.onLine 的值（線上）", () => {
    onLineValue = true;
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it("初始狀態為 navigator.onLine 的值（離線）", () => {
    onLineValue = false;
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it("監聽 online 和 offline 事件", () => {
    renderHook(() => useOnlineStatus());

    const eventNames = addSpy.mock.calls.map((call: [string, ...unknown[]]) => call[0]);
    expect(eventNames).toContain("online");
    expect(eventNames).toContain("offline");
  });

  it("觸發 offline 事件時狀態變為 false", () => {
    onLineValue = true;
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      onLineValue = false;
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current).toBe(false);
  });

  it("觸發 online 事件時狀態變為 true", () => {
    onLineValue = false;
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      onLineValue = true;
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current).toBe(true);
  });

  it("unmount 時移除事件監聽器", () => {
    const { unmount } = renderHook(() => useOnlineStatus());
    unmount();

    const removedEvents = removeSpy.mock.calls.map((call: [string, ...unknown[]]) => call[0]);
    expect(removedEvents).toContain("online");
    expect(removedEvents).toContain("offline");
  });
});
