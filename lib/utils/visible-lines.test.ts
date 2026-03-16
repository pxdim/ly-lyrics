import { describe, it, expect } from "vitest";
import { calcVisibleLines } from "./visible-lines";

describe("calcVisibleLines", () => {
  it("returns correct range for normal case", () => {
    const result = calcVisibleLines({
      currentIndex: 5,
      totalLines: 20,
      visibleCount: 7,
    });
    expect(result.start).toBeLessThanOrEqual(5);
    expect(result.end).toBeGreaterThan(5);
    expect(result.end - result.start).toBe(7);
  });

  it("clamps to start when currentIndex is near beginning", () => {
    const result = calcVisibleLines({
      currentIndex: 1,
      totalLines: 20,
      visibleCount: 7,
    });
    expect(result.start).toBe(0);
  });

  it("clamps to end when currentIndex is near end", () => {
    const result = calcVisibleLines({
      currentIndex: 18,
      totalLines: 20,
      visibleCount: 7,
    });
    expect(result.end).toBe(20);
  });

  it("handles empty lyrics", () => {
    const result = calcVisibleLines({
      currentIndex: 0,
      totalLines: 0,
      visibleCount: 7,
    });
    expect(result.start).toBe(0);
    expect(result.end).toBe(0);
  });

  it("handles visibleCount larger than totalLines", () => {
    const result = calcVisibleLines({
      currentIndex: 2,
      totalLines: 3,
      visibleCount: 7,
    });
    expect(result.start).toBe(0);
    expect(result.end).toBe(3);
  });
});
