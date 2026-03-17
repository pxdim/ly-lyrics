/**
 * useIsMobile Hook 單元測試
 *
 * 覆蓋範圍：手機視窗偵測（< 768px）、桌面視窗回傳 false、
 * 傳入正確的 breakpoint 給 useMediaQuery
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsMobile } from "./useIsMobile";

vi.mock("./useMediaQuery", () => ({
  useMediaQuery: vi.fn(),
}));

import { useMediaQuery } from "./useMediaQuery";

describe("useIsMobile", () => {
  it("螢幕寬度 < 768px 時回傳 true", () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("螢幕寬度 >= 768px 時回傳 false", () => {
    vi.mocked(useMediaQuery).mockReturnValue(false);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("使用正確的 breakpoint 呼叫 useMediaQuery", () => {
    vi.mocked(useMediaQuery).mockReturnValue(false);
    renderHook(() => useIsMobile());
    expect(useMediaQuery).toHaveBeenCalledWith("(max-width: 767.98px)");
  });
});
