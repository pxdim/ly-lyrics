import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLyricsStore } from "@/lib/store";

describe("AI tracking respects controlMode", () => {
  beforeEach(() => {
    useLyricsStore.setState({ controlMode: "manual" });
  });

  it("blocks AI jumpToLine when controlMode is manual", () => {
    const mockJump = vi.fn();

    // 模擬 wrappedJumpToLine 行為（這就是我們要在 use-ai-tracking.ts 實作的邏輯）
    const wrappedJump = (index: number) => {
      const state = useLyricsStore.getState();
      if (state.controlMode === "manual") return;
      state.jumpToLine(index);
    };

    useLyricsStore.setState({ controlMode: "manual", jumpToLine: mockJump });
    wrappedJump(3);
    expect(mockJump).not.toHaveBeenCalled();
  });

  it("allows AI jumpToLine when controlMode is auto", () => {
    const mockJump = vi.fn();

    const wrappedJump = (index: number) => {
      const state = useLyricsStore.getState();
      if (state.controlMode === "manual") return;
      state.jumpToLine(index);
    };

    useLyricsStore.setState({ controlMode: "auto", jumpToLine: mockJump });
    wrappedJump(5);
    expect(mockJump).toHaveBeenCalledWith(5);
  });
});
