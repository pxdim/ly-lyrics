import { describe, it, expect, beforeEach } from "vitest";
import { useLyricsStore } from "@/lib/store";

describe("controlMode", () => {
  beforeEach(() => {
    // 重置到初始狀態
    useLyricsStore.setState({ controlMode: "manual" });
  });

  it("defaults to manual mode", () => {
    useLyricsStore.setState({ controlMode: "manual" });
    expect(useLyricsStore.getState().controlMode).toBe("manual");
  });

  it("setControlMode switches to auto", () => {
    useLyricsStore.getState().setControlMode("auto");
    expect(useLyricsStore.getState().controlMode).toBe("auto");
  });

  it("setControlMode switches back to manual", () => {
    useLyricsStore.getState().setControlMode("auto");
    useLyricsStore.getState().setControlMode("manual");
    expect(useLyricsStore.getState().controlMode).toBe("manual");
  });
});
