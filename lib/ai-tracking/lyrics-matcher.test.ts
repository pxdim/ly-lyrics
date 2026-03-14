import { describe, it, expect } from "vitest";
import { lcsRatio, matchLyrics, type MatchConfig } from "./lyrics-matcher";

// ============================================
// LCS 演算法測試
// ============================================

describe("lcsRatio", () => {
  it("returns 1.0 for identical strings", () => {
    expect(lcsRatio("天空下起了小雨", "天空下起了小雨")).toBe(1.0);
  });

  it("returns 0.0 for completely different strings", () => {
    expect(lcsRatio("天空下起了小雨", "ABCDEFGH")).toBe(0);
  });

  it("returns partial score for substring match", () => {
    const ratio = lcsRatio("天空下起了小", "天空下起了小雨");
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.0);
  });

  it("handles empty strings", () => {
    expect(lcsRatio("", "test")).toBe(0);
    expect(lcsRatio("test", "")).toBe(0);
    expect(lcsRatio("", "")).toBe(0);
  });

  it("is case-insensitive for English", () => {
    expect(lcsRatio("Hello World", "hello world")).toBe(1.0);
  });
});

// ============================================
// matchLyrics 滑動視窗比對測試
// ============================================

const sampleLyrics = [
  "我走在回家的路上",        // 0
  "天空下起了小雨",          // 1
  "想起了你的笑容",          // 2
  "心裡感到溫暖",            // 3
  "我走在回家的路上",        // 4 (重複副歌)
  "天空下起了小雨",          // 5 (重複副歌)
  "這次不再感到孤單",        // 6
];

const defaultConfig: MatchConfig = {
  confidenceThreshold: 0.6,
  windowBefore: 2,
  windowAfter: 3,
  fullScanThreshold: 0.8,
  forwardBias: 0.1,
};

describe("matchLyrics", () => {
  it("matches exact lyrics line within window", () => {
    const result = matchLyrics("天空下起了小雨", sampleLyrics, 0, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.lineIndex).toBe(1);
    expect(result!.confidence).toBeGreaterThan(0.9);
  });

  it("matches partial STT output", () => {
    const result = matchLyrics("天空下起了小", sampleLyrics, 0, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.lineIndex).toBe(1);
    expect(result!.confidence).toBeGreaterThan(0.7);
  });

  it("returns null when text does not match any line (below threshold)", () => {
    const result = matchLyrics("完全無關的句子", sampleLyrics, 0, defaultConfig);
    expect(result).toBeNull();
  });

  it("prefers forward lines for repeated chorus (forward bias)", () => {
    const result = matchLyrics("我走在回家的路上", sampleLyrics, 3, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.lineIndex).toBe(4);
  });

  it("does not jump backward beyond window", () => {
    const result = matchLyrics("我走在回家的路上", sampleLyrics, 5, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.lineIndex).toBe(4);
  });

  it("full scan when window has no match, with higher threshold", () => {
    const result = matchLyrics("這次不再感到孤單", sampleLyrics, 0, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.lineIndex).toBe(6);
  });

  it("returns null for empty text", () => {
    const result = matchLyrics("", sampleLyrics, 0, defaultConfig);
    expect(result).toBeNull();
  });

  it("returns null for empty lyrics array", () => {
    const result = matchLyrics("test", [], 0, defaultConfig);
    expect(result).toBeNull();
  });

  it("handles currentIndex at end of lyrics", () => {
    const result = matchLyrics("這次不再感到孤單", sampleLyrics, 6, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.lineIndex).toBe(6);
  });

  it("uses LRC timestamps to narrow window when provided", () => {
    const timestamps = [0, 5000, 10000, 15000, 20000, 25000, 30000];
    const result = matchLyrics(
      "天空下起了小雨",
      sampleLyrics,
      0,
      defaultConfig,
      timestamps,
      6000
    );
    expect(result).not.toBeNull();
    expect(result!.lineIndex).toBe(1);
  });

  it("custom threshold: lower threshold allows weaker matches", () => {
    const looseConfig = { ...defaultConfig, confidenceThreshold: 0.3 };
    const result = matchLyrics("天空", sampleLyrics, 0, looseConfig);
    expect(result).not.toBeNull();
  });
});
