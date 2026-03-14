/**
 * useKeyboardShortcuts Hook 單元測試
 *
 * 覆蓋範圍：快捷鍵觸發 callback、輸入元素內忽略、
 * enabled 控制、unmount 清理、preventDefault 行為
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

/**
 * 輔助函式：模擬 keydown 事件
 */
function fireKeydown(key: string, target?: EventTarget) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });

  // 若指定 target，需要 defineProperty 覆蓋 readonly target
  if (target) {
    Object.defineProperty(event, "target", { value: target });
  }

  window.dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcuts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("按下已定義的快捷鍵時呼叫對應 callback", () => {
    const handler = vi.fn();
    const shortcuts = { ArrowDown: handler };

    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => {
      fireKeydown("ArrowDown");
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("按下未定義的快捷鍵時不呼叫任何 callback", () => {
    const handler = vi.fn();
    const shortcuts = { ArrowDown: handler };

    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => {
      fireKeydown("Escape");
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("焦點在 INPUT 元素時忽略快捷鍵", () => {
    const handler = vi.fn();
    const shortcuts = { ArrowDown: handler };

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const input = document.createElement("input");
    document.body.appendChild(input);

    act(() => {
      fireKeydown("ArrowDown", input);
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("焦點在 TEXTAREA 元素時忽略快捷鍵", () => {
    const handler = vi.fn();
    const shortcuts = { ArrowDown: handler };

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    act(() => {
      fireKeydown("ArrowDown", textarea);
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it("焦點在 SELECT 元素時忽略快捷鍵", () => {
    const handler = vi.fn();
    const shortcuts = { ArrowDown: handler };

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const select = document.createElement("select");
    document.body.appendChild(select);

    act(() => {
      fireKeydown("ArrowDown", select);
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(select);
  });

  it("焦點在 contentEditable 元素時忽略快捷鍵", () => {
    const handler = vi.fn();
    const shortcuts = { ArrowDown: handler };

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const div = document.createElement("div");
    div.contentEditable = "true";
    document.body.appendChild(div);

    act(() => {
      fireKeydown("ArrowDown", div);
    });

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  it("enabled=false 時不觸發任何 callback", () => {
    const handler = vi.fn();
    const shortcuts = { ArrowDown: handler };

    renderHook(() => useKeyboardShortcuts(shortcuts, false));

    act(() => {
      fireKeydown("ArrowDown");
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("unmount 後移除 listener，不再觸發 callback", () => {
    const handler = vi.fn();
    const shortcuts = { ArrowDown: handler };

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

    unmount();

    act(() => {
      fireKeydown("ArrowDown");
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("觸發快捷鍵時呼叫 preventDefault", () => {
    const handler = vi.fn();
    const shortcuts = { " ": handler };

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const preventDefaultSpy = vi.fn();
    const event = new KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "preventDefault", { value: preventDefaultSpy });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  });

  it("同時定義多組快捷鍵時各自獨立觸發", () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const shortcuts = {
      ArrowUp: handlerA,
      ArrowDown: handlerB,
    };

    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => {
      fireKeydown("ArrowUp");
    });
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).not.toHaveBeenCalled();

    act(() => {
      fireKeydown("ArrowDown");
    });
    expect(handlerB).toHaveBeenCalledTimes(1);
  });

  it("enabled 從 false 切換為 true 後開始監聽", () => {
    const handler = vi.fn();
    const shortcuts = { ArrowDown: handler };

    const { rerender } = renderHook(
      ({ enabled }) => useKeyboardShortcuts(shortcuts, enabled),
      { initialProps: { enabled: false } }
    );

    act(() => {
      fireKeydown("ArrowDown");
    });
    expect(handler).not.toHaveBeenCalled();

    rerender({ enabled: true });

    act(() => {
      fireKeydown("ArrowDown");
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
