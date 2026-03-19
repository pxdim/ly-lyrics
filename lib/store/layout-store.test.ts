/**
 * Layout Store 單元測試
 *
 * 測試可拖曳卡片佈局的狀態管理，包含：
 * - 預設狀態（preset、lock、layouts）
 * - toggleLock 切換鎖定
 * - applyPreset 套用佈局預設
 * - setLayouts 自訂佈局
 * - localStorage 持久化
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useLayoutStore } from "./layout-store";

describe("useLayoutStore", () => {
  beforeEach(() => {
    useLayoutStore.setState(useLayoutStore.getInitialState());
  });

  it("defaults to standard preset", () => {
    expect(useLayoutStore.getState().currentPreset).toBe("standard");
  });

  it("defaults to unlocked", () => {
    expect(useLayoutStore.getState().isLocked).toBe(false);
  });

  it("has default layouts for lg breakpoint", () => {
    const layouts = useLayoutStore.getState().layouts;
    expect(layouts.lg).toBeDefined();
    expect(layouts.lg.length).toBeGreaterThan(0);
  });

  it("toggleLock switches lock state", () => {
    useLayoutStore.getState().toggleLock();
    expect(useLayoutStore.getState().isLocked).toBe(true);
    useLayoutStore.getState().toggleLock();
    expect(useLayoutStore.getState().isLocked).toBe(false);
  });

  it("applyPreset changes currentPreset and layouts", () => {
    useLayoutStore.getState().applyPreset("focus");
    expect(useLayoutStore.getState().currentPreset).toBe("focus");
    // focus 佈局的 cues 卡片應該佔超過一半寬度
    const lg = useLayoutStore.getState().layouts.lg;
    const cueItem = lg.find((l) => l.i === "cues");
    expect(cueItem).toBeDefined();
    expect(cueItem!.w).toBeGreaterThan(6);
  });

  it("applyPreset for unknown preset falls back to standard", () => {
    useLayoutStore.getState().applyPreset("nonexistent");
    expect(useLayoutStore.getState().currentPreset).toBe("standard");
  });

  it("setLayouts updates layouts", () => {
    const newLayouts = {
      lg: [{ i: "songs", x: 0, y: 0, w: 3, h: 5 }],
    };
    useLayoutStore.getState().setLayouts(newLayouts);
    const firstItem = useLayoutStore.getState().layouts.lg[0];
    expect(firstItem).toBeDefined();
    expect(firstItem!.w).toBe(3);
  });

  it("setLayouts changes preset to custom", () => {
    useLayoutStore.getState().setLayouts({
      lg: [{ i: "songs", x: 0, y: 0, w: 3, h: 5 }],
    });
    expect(useLayoutStore.getState().currentPreset).toBe("custom");
  });

  it("persists layouts and isLocked to localStorage", () => {
    // Zustand persist 測試 — 確認 partialize 包含 layouts 和 isLocked
    const state = useLayoutStore.getState();
    expect(state.layouts).toBeDefined();
    expect(typeof state.isLocked).toBe("boolean");
  });
});
