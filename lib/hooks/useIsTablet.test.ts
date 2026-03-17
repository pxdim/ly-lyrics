/**
 * useIsTablet Hook 單元測試
 *
 * 覆蓋範圍：平板視窗偵測（768px - 1279px）、桌面/手機視窗回傳 false、
 * 傳入正確的 breakpoint 給 useMediaQuery
 */

import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsTablet } from "./useIsTablet";

vi.mock("./useMediaQuery", () => ({
  useMediaQuery: vi.fn(),
}));

import { useMediaQuery } from "./useMediaQuery";

describe("useIsTablet", () => {
  it("螢幕寬度在 768px - 1279px 時回傳 true", () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
  });

  it("螢幕寬度不在 768px - 1279px 時回傳 false", () => {
    vi.mocked(useMediaQuery).mockReturnValue(false);
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);
  });

  it("使用正確的 breakpoint 呼叫 useMediaQuery", () => {
    vi.mocked(useMediaQuery).mockReturnValue(false);
    renderHook(() => useIsTablet());
    expect(useMediaQuery).toHaveBeenCalledWith(
      "(min-width: 768px) and (max-width: 1279.98px)",
    );
  });
});
