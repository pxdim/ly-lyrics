/**
 * useMediaQuery Hook 單元測試
 *
 * 覆蓋範圍：初始值、媒體查詢變化回應、清理 listener
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMediaQuery } from "./useMediaQuery";

describe("useMediaQuery", () => {
  let listeners: Map<string, ((e: MediaQueryListEvent) => void)[]>;

  beforeEach(() => {
    listeners = new Map();
    window.matchMedia = vi.fn((query: string) => {
      const mql = {
        matches: false,
        media: query,
        addEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (!listeners.has(query)) listeners.set(query, []);
          listeners.get(query)!.push(handler);
        }),
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList;
      return mql;
    });
  });

  it("非匹配的查詢初始值為 false", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
  });

  it("unmount 時清理 event listener", () => {
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    unmount();
    // 取得 matchMedia 回傳的 mql 物件
    const calls = (window.matchMedia as ReturnType<typeof vi.fn>).mock.results;
    expect(calls.length).toBeGreaterThan(0);
    const mql = calls[0]!.value as MediaQueryList;
    expect(mql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
