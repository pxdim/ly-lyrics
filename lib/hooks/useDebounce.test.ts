/**
 * useDebouncedCallback Hook 單元測試
 *
 * 覆蓋範圍：基本防抖行為、delay 後執行、多次呼叫合併、
 * timer 重置、不同 delay 值、callback 參數傳遞
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedCallback } from "./useDebounce";

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("在 delay 時間內不立即執行 callback", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 150));

    act(() => {
      result.current("arg1");
    });

    // 尚未到達 delay 時間，callback 不應被呼叫
    expect(callback).not.toHaveBeenCalled();
  });

  it("delay 時間到達後執行 callback", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 150));

    act(() => {
      result.current("arg1");
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("arg1");
  });

  it("多次快速呼叫只觸發最後一次", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 150));

    act(() => {
      result.current("first");
      result.current("second");
      result.current("third");
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("third");
  });

  it("每次呼叫會重置 timer", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 150));

    act(() => {
      result.current("first");
    });

    // 經過 100ms（尚未到達 150ms）
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(callback).not.toHaveBeenCalled();

    // 再次呼叫，timer 應重置
    act(() => {
      result.current("second");
    });

    // 再經過 100ms（距離第二次呼叫僅 100ms，不到 150ms）
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(callback).not.toHaveBeenCalled();

    // 再經過 50ms（距離第二次呼叫達到 150ms）
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("second");
  });

  it("使用預設 delay（150ms）", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback));

    act(() => {
      result.current();
    });

    act(() => {
      vi.advanceTimersByTime(149);
    });
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("支援自訂 delay 值", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    act(() => {
      result.current();
    });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("連續兩批呼叫各觸發一次 callback", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 150));

    // 第一批
    act(() => {
      result.current("batch1");
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("batch1");

    // 第二批
    act(() => {
      result.current("batch2");
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith("batch2");
  });
});
